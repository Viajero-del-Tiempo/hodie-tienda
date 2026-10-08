import { AbstractControl, FormArray, FormControl, FormGroup, Validators } from '@angular/forms';
import { ProductInput } from '@core/models/admin-catalog.model';
import { CatalogPackagingOption } from '@core/models/catalog.model';
import { integerControl, slugPattern, textControl, textLength } from './catalog-editor.util';

export const groupArray = (form: FormGroup, name: string) => form.get(name) as FormArray<FormGroup>;
export const stringArray = (form: FormGroup, name: string) => form.get(name) as FormArray<FormControl<string>>;
export const inputControl = (control: AbstractControl | null) => control as FormControl;
export function variantForm(axes: string[], value?: ProductInput['variants'][number]): FormGroup {
  return new FormGroup({ id: textControl(value?.id), sku: textControl(value?.sku, true),
    options: new FormGroup(Object.fromEntries(axes.map(axis => [axis, textControl(value?.options[axis], true)]))),
    price: integerControl(value?.price ?? null, 1), stock: integerControl(value?.stock ?? 0),
    active: new FormControl(value?.active ?? true, { nonNullable: true }),
    imageUrls: new FormArray((value?.imageUrls ?? []).map(url => textControl(url, true))) });
}
export function packagingForm(value?: CatalogPackagingOption): FormGroup {
  return new FormGroup({ type: textControl(value?.type, true), name: textControl(value?.name, true),
    price: integerControl(value?.price ?? null), imageUrl: textControl(value?.imageUrl) });
}
export function productForm(value?: ProductInput): FormGroup {
  const slug = textControl(value?.slug, true); slug.addValidators(Validators.pattern(slugPattern));
  const name = textControl(value?.name, true, 80); name.addValidators(textLength(2));
  return new FormGroup({ name, slug, description: textControl(value?.description), categoryId: textControl(value?.categoryId, true),
    active: new FormControl(value?.active ?? true, { nonNullable: true }),
    tags: new FormArray((value?.tags ?? []).map(tag => tagForm(tag))),
    attributes: new FormArray(Object.entries(value?.attributes ?? {}).map(([key, val]) => attributeForm(key, val))),
    optionNames: new FormArray((value?.optionNames ?? []).map(axis => textControl(axis, true))),
    variants: new FormArray((value?.variants ?? []).map(variant => variantForm(value?.optionNames ?? [], variant)),
      [Validators.required, Validators.minLength(1)]),
    customization: new FormGroup({
      allowed: new FormControl(value?.customization.allowed ?? false, { nonNullable: true }),
      allowsText: new FormControl(value?.customization.allowsText ?? false, { nonNullable: true }),
      allowsImage: new FormControl(value?.customization.allowsImage ?? false, { nonNullable: true }),
      maxChars: new FormControl<number | null>(value?.customization.maxChars ?? null), notes: textControl(value?.customization.notes),
    }),
    packagingOptions: new FormArray((value?.packagingOptions ?? []).map(packagingForm)),
  });
}
export function tagForm(value = ''): FormControl<string> {
  const control = textControl(value, true, 30); control.addValidators(textLength(2)); return control;
}
export const attributeForm = (key = '', value = '') => new FormGroup({ key: textControl(key, true), value: textControl(value, true) });
export function productFormInput(form: FormGroup): ProductInput {
  const data = form.getRawValue();
  return { schemaVersion: 2, name: data.name.trim(), slug: data.slug.trim(), description: data.description.trim(),
    categoryId: data.categoryId, active: data.active, tags: data.tags.map((tag: string) => tag.trim()),
    attributes: Object.fromEntries(data.attributes.map((row: { key: string; value: string }) => [row.key.trim(), row.value.trim()])),
    optionNames: data.optionNames.map((axis: string) => axis.trim().normalize('NFC')),
    variants: data.variants.map((row: ProductInput['variants'][number]) => ({ ...(row.id ? { id: row.id } : {}),
      sku: row.sku.trim(), options: Object.fromEntries(Object.entries(row.options).map(([key, value]) => [key, value.trim()])),
      price: row.price, stock: row.stock, active: row.active, imageUrls: row.imageUrls.map(url => url.trim()) })),
    customization: { allowed: data.customization.allowed, allowsText: data.customization.allowsText,
      allowsImage: data.customization.allowsImage, notes: data.customization.notes.trim(),
      ...(data.customization.allowsText ? { maxChars: data.customization.maxChars } : {}) },
    packagingOptions: data.packagingOptions.map((row: CatalogPackagingOption) => ({ type: row.type.trim(), name: row.name.trim(),
      price: row.price, ...(row.imageUrl?.trim() ? { imageUrl: row.imageUrl.trim() } : {}) })),
  };
}
