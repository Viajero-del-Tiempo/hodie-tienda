import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AdminCatalogService } from '@core/services/admin-catalog.service';
import { Category } from '@core/models/catalog.model';
import { CatalogFailure } from '@core/models/admin-catalog.model';
import { EditorErrors, errorMessage, failureMessage, integerControl, slugPattern, slugSuggestion, textControl } from '../../catalog-editor.util';

function categoryForm(value?: Category): FormGroup {
  const id = textControl(value?.id, true); id.addValidators(Validators.pattern(slugPattern));
  return new FormGroup({ id, name: textControl(value?.name, true), description: textControl(value?.description),
    order: integerControl(value?.order ?? 0), active: new FormControl(value?.active ?? true, { nonNullable: true }) });
}
@Component({ selector: 'app-categories-page', standalone: true, imports: [ReactiveFormsModule],
  templateUrl: './categories-page.html', styleUrl: '../../_catalog-panel.scss' })
export class CategoriesPage implements OnInit {
  private api = inject(AdminCatalogService); private cdr = inject(ChangeDetectorRef); private destroyRef = inject(DestroyRef);
  categories: Category[] = []; form = categoryForm(); existingId?: string; loading = false; saving = false; error = ''; notice = '';
  private errors = new EditorErrors(); message = errorMessage;
  ngOnInit(): void { this.edit(); void this.load(); }
  async load(): Promise<void> {
    this.loading = true;
    try { this.categories = await firstValueFrom(this.api.getCategories()); this.sort(); }
    catch (error) { this.error = failureMessage(error as CatalogFailure); }
    finally { this.loading = false; this.cdr.markForCheck(); }
  }
  edit(value?: Category): void {
    if (this.saving) return;
    this.existingId = value?.id; const form = this.form = categoryForm(value); this.errors = new EditorErrors(); this.error = ''; this.notice = '';
    form.get('name')!.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(name => {
      if (this.form === form && !this.existingId && !form.get('id')!.dirty) form.get('id')!.setValue(slugSuggestion(name), { emitEvent: false });
    });
    form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.errors.clearChanged());
  }
  private sort(): void { this.categories.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name)); }
  async save(): Promise<void> {
    if (this.saving) return;
    this.form.markAllAsTouched(); if (this.form.invalid) return;
    this.saving = true; this.error = ''; this.notice = '';
    try {
      const raw = this.form.getRawValue();
      const saved = await firstValueFrom(this.api.saveCategory({ ...raw, id: raw.id.trim(), name: raw.name.trim(), description: raw.description.trim() }, this.existingId));
      this.categories = [...this.categories.filter(row => row.id !== saved.id), saved]; this.sort();
      this.saving = false; this.edit(saved); this.notice = 'Categoría guardada.';
    } catch (error) { const failure = error as CatalogFailure; this.error = failureMessage(failure); this.errors.apply(this.form, failure); }
    finally { this.saving = false; this.cdr.markForCheck(); }
  }
}
