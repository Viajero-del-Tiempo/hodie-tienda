import { AbstractControl, FormArray, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { CatalogFailure } from '@core/models/admin-catalog.model';
import { clearServerError, serverValueSnapshot, setServerControlError } from '@core/models/customer-form.util';

export const slugSuggestion = (value: string): string => value.normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  .toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
export const slugPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
// El modelo cuenta caracteres Unicode después de trim/NFC, no unidades UTF-16.
export const textLength = (min = 0, max = Infinity): ValidatorFn => control => {
  const length = [...String(control.value ?? '').trim().normalize('NFC')].length;
  if (length < min) return { minlength: { requiredLength: min, actualLength: length } };
  if (length > max) return { maxlength: { requiredLength: max, actualLength: length } };
  return null;
};
export const textControl = (value = '', required = false, max?: number) => new FormControl(value, { nonNullable: true,
  validators: [...(required ? [Validators.required, Validators.pattern(/\S/)] : []), ...(max ? [textLength(0, max)] : [])] });
export const integerControl = (value: number | null, min = 0, max = Number.MAX_SAFE_INTEGER) => new FormControl(value,
  [Validators.required, Validators.min(min), Validators.max(max), control => Number.isSafeInteger(control.value) ? null : { integer: true }]);
const controlKeys = new WeakMap<object, number>();
let nextControlKey = 0;
export function controlKey(control: object): number {
  let key = controlKeys.get(control);
  if (key === undefined) { key = ++nextControlKey; controlKeys.set(control, key); }
  return key;
}
export function errorMessage(control: AbstractControl | null): string {
  if (!control?.touched) return '';
  const errors = control.errors;
  if (errors?.['server']) return errors['server'];
  if (errors?.['required'] || errors?.['pattern']) return 'Completá este campo con un valor válido.';
  if (errors?.['minlength']) return `El mínimo es de ${errors['minlength'].requiredLength} caracteres.`;
  if (errors?.['maxlength']) return `El máximo es de ${errors['maxlength'].requiredLength} caracteres.`;
  if (errors?.['min']) return `El mínimo es ${errors['min'].min}.`;
  if (errors?.['max']) return `El máximo es ${errors['max'].max}.`;
  if (errors?.['integer']) return 'Ingresá un número entero.';
  if (errors?.['duplicate']) return 'No se admiten valores repetidos.';
  return '';
}
export const failureMessage = (failure: CatalogFailure): string => failure.error?.error || failure.message || 'No pudimos guardar los cambios. Tu borrador se conserva.';
export function catalogFieldLabel(field: string): string {
  const labels: Record<string, string> = { name: 'Nombre', slug: 'Slug', description: 'Descripción', categoryId: 'Categoría',
    tags: 'Etiquetas', attributes: 'Atributos', optionNames: 'Ejes de opciones', active: 'Estado', variants: 'Variantes',
    customization: 'Personalización', packagingOptions: 'Empaques', sku: 'SKU', price: 'Precio', stock: 'Stock', options: 'Opciones', imageUrls: 'Imágenes' };
  const variant = /^variants\[.+\]\.(.+)$/.exec(field);
  return labels[variant?.[1] ?? field] ?? field;
}
export function fieldControl(form: FormGroup, field: string): AbstractControl | null {
  const option = /^variants\[(\d+)\]\.options\.(.+)$/.exec(field);
  if (option) return form.get(['variants', option[1], 'options', option[2]]);
  if (field.startsWith('attributes.')) {
    const rows = form.get('attributes') as FormArray<FormGroup> | null;
    const key = field.slice('attributes.'.length);
    return rows?.controls.find(row => row.get('key')?.value === key)?.get('value') ?? (key === 'key' ? rows?.at(0)?.get('key') ?? null : null);
  }
  return form.get(field.replace(/\[(\d+)\]/g, '.$1'));
}
export class EditorErrors {
  private rejected = new Map<AbstractControl, unknown>();
  apply(form: FormGroup, failure: CatalogFailure): boolean {
    const control = failure.error?.field ? fieldControl(form, failure.error.field) : null;
    if (!control) return false;
    setServerControlError(control, failureMessage(failure)); this.rejected.set(control, serverValueSnapshot(control.value)); return true;
  }
  clearChanged(): void {
    for (const [control, value] of this.rejected) {
      if (!Object.is(serverValueSnapshot(control.value), value)) { clearServerError(control); this.rejected.delete(control); }
    }
  }
}
