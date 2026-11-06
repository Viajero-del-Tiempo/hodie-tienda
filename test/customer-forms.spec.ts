import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { ShippingFormComponent } from '../src/app/shared/components/shipping-form/shipping-form.component';
import { BillingFormComponent } from '../src/app/shared/components/billing-form/billing-form.component';
import { billingForm, serverFieldError, shippingForm } from '../src/app/core/models/customer-form.util';
import { addressFixture, shippingOptions } from './helpers/customer-fixtures';

describe('Formularios de envío y RUC contra el contrato del backend', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations()] });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('consulta la ciudad, cancela respuestas viejas y solo exige cédula para transportadora', fakeAsync(() => {
    const fixture = TestBed.createComponent(ShippingFormComponent); const form = shippingForm(addressFixture());
    fixture.componentRef.setInput('form', form); fixture.detectChanges(); tick(250);
    const old = http.expectOne(req => req.url.endsWith('/orders/shipping-options'));
    form.controls['city'].setValue('Ciudad Beta');
    expect(old.cancelled).toBeTrue(); expect(fixture.componentInstance.options).toBeNull(); tick(250);
    http.expectOne(req => req.params.get('city') === 'Ciudad Beta').flush(shippingOptions(false)); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Envío local gratuito');
    expect(fixture.nativeElement.querySelector('[formControlName="recipientDocument"]')).toBeNull();
    form.controls['recipientDocument'].setValue(''); expect(form.valid).toBeTrue();
    form.controls['city'].setValue('Ciudad Gamma'); tick(250);
    http.expectOne(req => req.params.get('city') === 'Ciudad Gamma').flush(shippingOptions(true)); fixture.detectChanges();
    expect(form.controls['recipientDocument'].hasError('required')).toBeTrue();
    expect(fixture.nativeElement.querySelector('[formControlName="recipientDocument"]')).not.toBeNull();
  }));
  it('número base propone DV, no confirma solo y resetea confirmación al editar', fakeAsync(() => {
    const fixture = TestBed.createComponent(BillingFormComponent); const form = billingForm({ legalName: 'Persona Alfa', ruc: '1234567' });
    let ready = false; fixture.componentInstance.validationReady.subscribe(value => ready = value);
    fixture.componentRef.setInput('form', form); fixture.detectChanges(); tick(250);
    http.expectOne(req => req.url.endsWith('/users/me/ruc/validate')).flush({ ruc: '1234567', suggestedRuc: '1234567-9', expectedDigit: 9, status: 'confirmation_required', requiresConfirmation: true }); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('¿Tu RUC es 1234567-9?'); expect(ready).toBeFalse();
    expect(form.controls['confirmedRuc'].value).toBe(''); fixture.componentInstance.confirm(); expect(ready).toBeTrue();
    form.controls['ruc'].setValue('12345678'); expect(ready).toBeFalse(); expect(form.controls['confirmedRuc'].value).toBe('');
    tick(250); http.expectOne(req => req.body.ruc === '12345678').flush({ ruc: '12345678', suggestedRuc: '12345678-9', status: 'confirmation_required' });
  }));
  it('DV distinto exige aceptación explícita y no reutiliza una respuesta vieja', fakeAsync(() => {
    const fixture = TestBed.createComponent(BillingFormComponent); const form = billingForm({ legalName: 'Persona Alfa', ruc: '1234567-8' });
    let ready = false; fixture.componentInstance.validationReady.subscribe(value => ready = value);
    fixture.componentRef.setInput('form', form); fixture.detectChanges(); tick(250);
    http.expectOne(req => req.body.ruc === '1234567-8').flush({ ruc: '1234567-8', expectedDigit: 9, status: 'mismatch' }); fixture.detectChanges();
    expect(ready).toBeFalse(); expect(fixture.nativeElement.textContent).toContain('Confirmo que quiero continuar');
    form.controls['acknowledgeRucMismatch'].setValue(true); expect(ready).toBeTrue();
    form.controls['ruc'].setValue('12345678-8'); expect(ready).toBeFalse(); tick(250);
    const old = http.expectOne(req => req.body.ruc === '12345678-8');
    form.controls['ruc'].setValue('1234567-9'); expect(old.cancelled).toBeTrue(); tick(250);
    http.expectOne(req => req.body.ruc === '1234567-9').flush({ ruc: '1234567-9', status: 'valid' }); expect(ready).toBeTrue();
  }));
  it('muestra el error del servidor en el control y lo limpia al corregir', fakeAsync(() => {
    const fixture = TestBed.createComponent(ShippingFormComponent); const form = shippingForm(addressFixture());
    fixture.componentRef.setInput('form', form); fixture.detectChanges(); tick(250);
    http.expectOne(req => req.url.endsWith('/orders/shipping-options')).flush(shippingOptions(true));
    serverFieldError(form, 'shippingAddress.street', 'Revisá esta referencia.', 'shippingAddress'); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Revisá esta referencia.');
    form.controls['recipientName'].setValue('Otro destinatario'); expect(form.controls['street'].hasError('server')).toBeTrue();
    form.controls['street'].setValue('Referencia corregida'); expect(form.controls['street'].hasError('server')).toBeFalse();
  }));
  it('conserva el rechazo de cédula al montar el editor y consultar el envío, sin perder las validaciones locales', fakeAsync(() => {
    const fixture = TestBed.createComponent(ShippingFormComponent); const form = shippingForm(addressFixture());
    serverFieldError(form, 'shippingAddress.recipientDocument', 'Revisá este documento.', 'shippingAddress');
    fixture.componentRef.setInput('form', form); fixture.detectChanges(); tick(250);
    http.expectOne(req => req.url.endsWith('/orders/shipping-options')).flush(shippingOptions(true)); fixture.detectChanges();
    expect(form.controls['recipientDocument'].errors?.['server']).toBe('Revisá este documento.');
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[formControlName="recipientDocument"]');
    expect(input.closest('mat-form-field')?.textContent).toContain('Revisá este documento.');
    form.controls['recipientName'].setValue('Otro destinatario');
    expect(form.controls['recipientDocument'].hasError('server')).toBeTrue();
    form.controls['recipientDocument'].setValue(''); fixture.detectChanges();
    expect(form.controls['recipientDocument'].hasError('server')).toBeFalse();
    expect(form.controls['recipientDocument'].hasError('required')).toBeTrue();
    form.controls['recipientDocument'].setValue('1'.repeat(201));
    expect(form.controls['recipientDocument'].hasError('maxlength')).toBeTrue();
    form.controls['recipientDocument'].setValue('7654321'); expect(form.controls['recipientDocument'].valid).toBeTrue();
    serverFieldError(form, 'shippingAddress.recipientDocument', 'Revisá este documento.', 'shippingAddress');
    form.controls['city'].setValue('Ciudad Beta'); tick(250);
    http.expectOne(req => req.params.get('city') === 'Ciudad Beta').flush(shippingOptions(false)); fixture.detectChanges();
    expect(form.controls['recipientDocument'].hasError('server')).toBeFalse();
    expect(form.controls['recipientDocument'].hasError('required')).toBeFalse();
    expect(fixture.nativeElement.querySelector('[formControlName="recipientDocument"]')).toBeNull();
    expect(form.valid).toBeTrue();
  }));
});
