import { ChangeDetectorRef, Component, DestroyRef, OnInit, inject } from '@angular/core';
import { JsonPipe } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AbstractControl, FormArray, FormControl, FormGroup, ReactiveFormsModule } from '@angular/forms';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { AdminCatalogService } from '@core/services/admin-catalog.service';
import { AdminProduct, CatalogChange, CatalogFailure, productInput } from '@core/models/admin-catalog.model';
import { Category } from '@core/models/catalog.model';
import { clearServerError } from '@core/models/customer-form.util';
import { CatalogImagesComponent } from '../../catalog-images.component';
import { catalogFieldLabel, controlKey, EditorErrors, errorMessage, failureMessage, integerControl, slugSuggestion, textControl } from '../../catalog-editor.util';
import { MergeChoices, MergeConflict, mergeProductDraft } from '../../catalog-merge.util';
import { attributeForm, groupArray, inputControl, packagingForm, productForm, productFormInput, stringArray, tagForm, variantForm } from '../../product-editor-form.util';

@Component({
  selector: 'app-product-editor', standalone: true, imports: [ReactiveFormsModule, RouterLink, JsonPipe, CatalogImagesComponent],
  templateUrl: './product-editor.component.html', styleUrl: '../../_catalog-panel.scss',
})
export class ProductEditorComponent implements OnInit {
  private api = inject(AdminCatalogService); private route = inject(ActivatedRoute); private router = inject(Router);
  private cdr = inject(ChangeDetectorRef); private destroyRef = inject(DestroyRef);
  productForm = productForm(); categories: Category[] = [];
  baseline?: AdminProduct; latest?: AdminProduct;
  currentProductId: string | null = null; loading = false; saving = false; error = ''; notice = '';
  conflict = false; changes: CatalogChange[] = []; collisions: MergeConflict[] = []; choices: MergeChoices = {};
  private errors = new EditorErrors(); private savedIds = new Set<string>(); private axisKeys = new Map<AbstractControl, string>();
  private uploads = new Set<AbstractControl>();
  private maxCharsValidator = integerControl(null, 1, 500).validator!;
  key = controlKey; message = errorMessage;
  changeLabel = catalogFieldLabel;
  get isEditMode(): boolean { return !!this.currentProductId; }
  get variants(): FormArray<FormGroup> { return groupArray(this.productForm, 'variants'); }
  get packages(): FormArray<FormGroup> { return groupArray(this.productForm, 'packagingOptions'); }
  get attributes(): FormArray<FormGroup> { return groupArray(this.productForm, 'attributes'); }
  get tags(): FormArray<FormControl<string>> { return stringArray(this.productForm, 'tags'); }
  get axes(): FormArray<FormControl<string>> { return stringArray(this.productForm, 'optionNames'); }
  get customization(): FormGroup { return this.productForm.get('customization') as FormGroup; }
  get imagesPending(): boolean { return this.uploads.size > 0; }
  get canMerge(): boolean { return this.collisions.every(item => !!this.choices[item.field]); }
  ngOnInit(): void { void this.load(); }
  async load(): Promise<void> {
    this.loading = true; this.error = ''; this.currentProductId = this.route.snapshot.paramMap.get('id');
    try {
      const [categories, product] = await Promise.all([firstValueFrom(this.api.getCategories()),
        this.currentProductId ? firstValueFrom(this.api.getProduct(this.currentProductId)) : Promise.resolve(undefined)]);
      this.categories = categories;
      if (product) this.adopt(product); else this.install(productForm());
    } catch (error) { this.error = failureMessage(error as CatalogFailure); }
    finally { this.loading = false; this.cdr.markForCheck(); }
  }
  private install(form: FormGroup): void {
    this.productForm = form; this.errors = new EditorErrors(); this.axisKeys.clear(); this.uploads.clear();
    this.axes.controls.forEach(axis => this.axisKeys.set(axis, axis.value.trim().normalize('NFC')));
    const name = form.get('name')!; const slug = form.get('slug')!;
    // Sugerir solo al crear y hasta que el administrador edite el slug.
    name.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(value => {
      if (this.productForm === form && !this.isEditMode && !slug.dirty) slug.setValue(slugSuggestion(value), { emitEvent: false });
    });
    form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.productForm === form) {
        this.errors.clearChanged(); this.updateCustomization();
        if (this.latest) this.previewMerge();
      }
    });
    this.updateCustomization();
  }
  private adopt(product: AdminProduct): void {
    this.currentProductId = product.id; this.baseline = structuredClone(product);
    this.savedIds = new Set(product.variants.map(row => row.id));
    this.latest = undefined; this.install(productForm(productInput(product))); this.conflict = false;
    this.collisions = []; this.choices = {}; this.changes = [];
  }
  private updateCustomization(): void {
    const max = this.customization.get('maxChars')!;
    max.removeValidators(this.maxCharsValidator);
    if (this.customization.get('allowsText')!.value) max.addValidators(this.maxCharsValidator);
    else clearServerError(max);
    max.updateValueAndValidity({ emitEvent: false });
  }
  addTag(): void { if (this.tags.length < 20) this.tags.push(tagForm()); }
  addAttribute(): void { this.attributes.push(attributeForm()); }
  addAxis(): void { const axis = textControl('', true); this.axes.push(axis); this.axisKeys.set(axis, ''); }
  removeAxis(index: number): void { this.axes.removeAt(index); this.syncOptions(); }
  syncOptions(): boolean {
    const names = this.axes.controls.map(axis => axis.value.trim().normalize('NFC'));
    this.axes.controls.forEach((axis, index) => {
      axis.updateValueAndValidity({ emitEvent: false });
      if (names.indexOf(names[index]) !== index) { axis.setErrors({ ...axis.errors, duplicate: true }); axis.markAsTouched(); }
    });
    if (this.axes.invalid) return false;
    for (const row of this.variants.controls) {
      const options = row.get('options') as FormGroup;
      const values = new Map<string, string>(this.axes.controls.map((axis, index): [string, string] => [names[index], options.get([this.axisKeys.get(axis) ?? ''])?.value ?? '']));
      const unchanged = Object.keys(options.controls).length === names.length && this.axes.controls.every((axis, index) => this.axisKeys.get(axis) === names[index]);
      if (!unchanged) row.setControl('options', new FormGroup(Object.fromEntries(names.map(name => [name, textControl(values.get(name), true)]))));
    }
    this.axes.controls.forEach((axis, index) => this.axisKeys.set(axis, names[index]));
    return true;
  }
  optionControl(row: FormGroup, axis: FormControl<string>): FormControl {
    return inputControl(row.get(['options', this.axisKeys.get(axis) ?? axis.value.trim()]));
  }
  syncedAxis(axis: FormControl<string>): boolean { return !!this.axisKeys.get(axis); }
  addVariant(): void { if (this.syncOptions()) this.variants.push(variantForm(this.axes.controls.map(axis => axis.value.trim().normalize('NFC')))); }
  isSaved(row: FormGroup): boolean { return this.savedIds.has(row.get('id')!.value); }
  removeVariant(index: number): void { if (!this.isSaved(this.variants.at(index))) this.variants.removeAt(index); }
  addPackage(): void { this.packages.push(packagingForm()); }
  pending(control: AbstractControl, value: boolean): void { value ? this.uploads.add(control) : this.uploads.delete(control); }
  private validateRows(): void {
    const keys = this.attributes.controls.map(row => row.get('key')!.value.trim());
    this.attributes.controls.forEach((row, index) => {
      const key = row.get('key')!; key.updateValueAndValidity({ emitEvent: false });
      if (keys.indexOf(keys[index]) !== index) key.setErrors({ ...key.errors, duplicate: true });
    });
  }
  async onSubmit(): Promise<void> {
    if (this.saving || this.loading || this.imagesPending || this.conflict) return;
    this.notice = ''; this.error = ''; const synced = this.syncOptions(); this.validateRows(); this.productForm.markAllAsTouched();
    if (!synced || this.productForm.invalid || !this.variants.length) { this.error = 'Revisá los campos indicados y agregá al menos una variante.'; return; }
    this.saving = true;
    try {
      const input = productFormInput(this.productForm);
      const saved = await firstValueFrom(this.baseline
        ? this.api.updateProduct(this.baseline.id, input, this.baseline.version) : this.api.createProduct(input));
      const creating = !this.baseline; this.adopt(saved); this.notice = 'Producto guardado.';
      if (creating) void this.router.navigate(['/admin/products/edit', saved.id], { replaceUrl: true });
    } catch (error) {
      const failure = error as CatalogFailure; this.error = failureMessage(failure); this.errors.apply(this.productForm, failure);
      if (failure.status === 409 && failure.error?.code === 'CATALOG_VERSION_CONFLICT') {
        this.conflict = true; this.changes = failure.error.changes ?? []; this.latest = undefined;
        this.error += ' Tu borrador se conserva. Consultá los datos actuales antes de volver a guardar.';
      }
    } finally { this.saving = false; this.cdr.markForCheck(); }
  }
  async inspectConflict(): Promise<void> {
    if (!this.baseline || this.loading || this.imagesPending) return;
    this.loading = true;
    try { this.latest = await firstValueFrom(this.api.getProduct(this.baseline.id)); this.choices = {}; this.previewMerge(); }
    catch (error) { this.error = failureMessage(error as CatalogFailure); }
    finally { this.loading = false; this.cdr.markForCheck(); }
  }
  private previewMerge(): void {
    if (this.latest && this.baseline) this.collisions = mergeProductDraft(this.baseline, productFormInput(this.productForm), this.latest).conflicts;
  }
  resolve(field: string, choice: 'current' | 'draft'): void { this.choices[field] = choice; }
  applyMerge(): void {
    if (!this.latest || !this.baseline || !this.canMerge || this.imagesPending || !this.syncOptions()) return;
    this.previewMerge(); if (!this.canMerge) return;
    const { input } = mergeProductDraft(this.baseline, productFormInput(this.productForm), this.latest, this.choices);
    const latest = this.latest; this.adopt(latest); this.install(productForm(input)); this.productForm.markAsDirty();
    this.error = ''; this.notice = 'Borrador actualizado: se incorporaron los cambios actuales que no habías editado. Revisalo antes de guardar.';
  }
  discardDraft(): void {
    if (!this.latest || this.imagesPending) return;
    this.adopt(this.latest); this.error = ''; this.notice = 'Se cargó la versión actual y se descartó el borrador.';
  }
}
