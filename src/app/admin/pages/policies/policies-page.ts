import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AdminCatalogService } from '@core/services/admin-catalog.service';
import { CatalogFailure, CatalogPolicy } from '@core/models/admin-catalog.model';
import { EditorErrors, errorMessage, failureMessage, slugPattern, textControl } from '../../catalog-editor.util';
import { AgentConfigFormComponent } from './agent-config-form.component';

function policyForm(value?: CatalogPolicy): FormGroup {
  const id = textControl(value?.id, true); id.addValidators(Validators.pattern(slugPattern));
  return new FormGroup({ id, title: textControl(value?.title, true), text: textControl(value?.text, true) });
}
@Component({ selector: 'app-policies-page', standalone: true, imports: [ReactiveFormsModule, AgentConfigFormComponent],
  templateUrl: './policies-page.html', styleUrl: '../../_catalog-panel.scss' })
export class PoliciesPage implements OnInit {
  private api = inject(AdminCatalogService); private cdr = inject(ChangeDetectorRef); private destroyRef = inject(DestroyRef);
  policies: CatalogPolicy[] = []; form = policyForm(); existingId?: string; loading = false; saving = false; error = ''; notice = '';
  private errors = new EditorErrors(); message = errorMessage;
  ngOnInit(): void { this.edit(); void this.load(); }
  async load(): Promise<void> {
    this.loading = true;
    try { this.policies = await firstValueFrom(this.api.getPolicies()); }
    catch (error) { this.error = failureMessage(error as CatalogFailure); }
    finally { this.loading = false; this.cdr.markForCheck(); }
  }
  edit(value?: CatalogPolicy): void {
    if (this.saving) return;
    this.existingId = value?.id; this.form = policyForm(value); this.errors = new EditorErrors(); this.error = ''; this.notice = '';
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.errors.clearChanged());
  }
  async save(): Promise<void> {
    if (this.saving) return;
    this.form.markAllAsTouched(); if (this.form.invalid) return;
    this.saving = true; this.error = ''; this.notice = '';
    try {
      const raw = this.form.getRawValue();
      const saved = await firstValueFrom(this.api.savePolicy({ id: raw.id.trim(), title: raw.title.trim(), text: raw.text.trim() }, this.existingId));
      this.policies = [...this.policies.filter(row => row.id !== saved.id), saved];
      this.saving = false; this.edit(saved); this.notice = 'Política guardada.';
    } catch (error) { const failure = error as CatalogFailure; this.error = failureMessage(failure); this.errors.apply(this.form, failure); }
    finally { this.saving = false; this.cdr.markForCheck(); }
  }
}
