import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AdminCatalogService } from '@core/services/admin-catalog.service';
import { CatalogFailure } from '@core/models/admin-catalog.model';
import { EditorErrors, errorMessage, failureMessage, integerControl } from '../../catalog-editor.util';
import { clearServerError } from '@core/models/customer-form.util';

@Component({ selector: 'app-agent-config-form', standalone: true, imports: [ReactiveFormsModule],
  templateUrl: './agent-config-form.component.html', styleUrl: '../../_catalog-panel.scss' })
export class AgentConfigFormComponent implements OnInit {
  private api = inject(AdminCatalogService); private cdr = inject(ChangeDetectorRef); private destroyRef = inject(DestroyRef);
  form = new FormGroup({ corporateQuantityThreshold: integerControl(null, 1) });
  version: string | null = null; loading = false; saving = false; ready = false; conflict = false;
  error = ''; notice = ''; private errors = new EditorErrors(); message = errorMessage;
  ngOnInit(): void {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.errors.clearChanged());
    void this.load();
  }
  async load(keepDraft = false): Promise<void> {
    if (this.loading || this.saving) return;
    this.loading = true; this.error = ''; this.notice = '';
    try {
      const config = await firstValueFrom(this.api.getAgentConfig());
      this.version = config?.version ?? null; this.ready = true; this.conflict = false;
      clearServerError(this.form.controls.corporateQuantityThreshold); this.errors = new EditorErrors();
      if (!keepDraft) this.form.reset({ corporateQuantityThreshold: config?.corporateQuantityThreshold ?? null });
      else this.notice = config ? `El umbral vigente es ${config.corporateQuantityThreshold}. Tu borrador se conserva; revisalo antes de guardar.`
        : 'No hay configuración guardada. Tu borrador se conserva; revisalo antes de guardar.';
    } catch (error) { this.error = failureMessage(error as CatalogFailure); }
    finally { this.loading = false; this.cdr.markForCheck(); }
  }
  async save(): Promise<void> {
    if (!this.ready || this.loading || this.saving || this.conflict) return;
    this.form.markAllAsTouched(); if (this.form.invalid) return;
    this.saving = true; this.error = ''; this.notice = '';
    try {
      const saved = await firstValueFrom(this.api.saveAgentConfig(this.form.getRawValue().corporateQuantityThreshold!, this.version));
      this.version = saved.version; this.notice = 'Configuración del agente guardada.';
    } catch (error) {
      const failure = error as CatalogFailure; this.error = failureMessage(failure); this.errors.apply(this.form, failure);
      this.conflict = failure.status === 409;
    } finally { this.saving = false; this.cdr.markForCheck(); }
  }
}
