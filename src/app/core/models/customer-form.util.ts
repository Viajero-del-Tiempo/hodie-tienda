import { AbstractControl, FormControl, FormGroup, ValidatorFn, Validators } from '@angular/forms';
import { BillingProfile, ShippingAddress } from './user.model';

const serverValidators = new WeakMap<AbstractControl, ValidatorFn>();
let nextEditorId = 0;

// Identidad local del editor: no forma parte de los datos enviados al servidor.
export class CustomerForm extends FormGroup {
  readonly editorId = ++nextEditorId;
}

const text = (value = '', required = false) => new FormControl(value, {
  nonNullable: true, validators: [Validators.maxLength(200), ...(required ? [Validators.required, Validators.pattern(/\S/)] : [])],
});
export function shippingForm(address?: ShippingAddress): CustomerForm {
  return new CustomerForm({ alias: text(address?.alias), recipientName: text(address?.recipientName, true),
    city: text(address?.city, true), department: text(address?.department, true), street: text(address?.street, true),
    recipientDocument: text(address?.recipientDocument), postalCode: text(address?.postalCode), instructions: text(address?.instructions) });
}
export function billingForm(profile?: BillingProfile): CustomerForm {
  return new CustomerForm({ alias: text(profile?.alias), legalName: text(profile?.legalName, true),
    ruc: new FormControl(profile?.ruc ?? '', { nonNullable: true,
      validators: [Validators.required, Validators.maxLength(200), Validators.pattern(/^\d+(?:-\d)?$/)] }),
    confirmedRuc: text(), acknowledgeRucMismatch: new FormControl(false, { nonNullable: true }) });
}
export function clearServerError(control: AbstractControl): void {
  const validator = serverValidators.get(control);
  if (!validator) return;
  control.removeValidators(validator);
  serverValidators.delete(control);
  control.updateValueAndValidity({ emitEvent: false });
}
export function serverFieldError(form: FormGroup, field: string | undefined, message: string, prefix = ''): boolean {
  const path = prefix ? field?.startsWith(prefix + '.') ? field.slice(prefix.length + 1) : undefined : field;
  const control = path ? form.get(path) : null;
  if (!control) return false;
  setServerControlError(control, message);
  return true;
}
// Los grupos/arreglos regeneran su objeto value al montar los controles.
// La identidad de ese objeto no representa un cambio en los datos del campo.
export function serverValueSnapshot(value: unknown): unknown {
  return value !== null && typeof value === 'object' ? JSON.stringify(value) : value;
}
export function setServerControlError(control: AbstractControl, message: string): void {
  const previous = serverValidators.get(control);
  if (previous) control.removeValidators(previous);
  // Angular recalcula la validez al montar el editor y reemplaza los errores de
  // setErrors(). El rechazo se conserva mientras el campo tenga el mismo valor.
  const rejectedValue = serverValueSnapshot(control.value);
  const validator: ValidatorFn = current => Object.is(serverValueSnapshot(current.value), rejectedValue) ? { server: message } : null;
  serverValidators.set(control, validator);
  control.addValidators(validator);
  control.updateValueAndValidity({ emitEvent: false });
  control.markAsTouched();
}
export function fieldMessage(form: FormGroup, name: string): string {
  const control = form.get(name);
  if (!control?.touched) return '';
  if (control.errors?.['server']) return control.errors['server'];
  if (control.hasError('required') || control.hasError('pattern')) return 'Completá este campo con un valor válido.';
  if (control.hasError('maxlength')) return 'El máximo es de 200 caracteres.';
  return '';
}

export interface CustomerFailure {
  status?: number;
  error?: { error?: string; field?: string; code?: string; suggestedRuc?: string; changes?: { field: string }[] };
}
