import { TestBed, fakeAsync, flushMicrotasks, tick } from '@angular/core/testing';
import { Validators } from '@angular/forms';
import { By } from '@angular/platform-browser';
import { provideRouter, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';
import { CheckoutPage } from '../src/app/pages/checkout/checkout-page/checkout-page';
import { UserService } from '../src/app/core/services/user.service';
import { OrderService } from '../src/app/core/services/order.service';
import { CatalogService } from '../src/app/core/services/catalog.service';
import { CartService, CART_STORAGE } from '../src/app/core/services/cart.service';
import { NotificationService } from '../src/app/core/services/notification.service';
import { ShippingFormComponent } from '../src/app/shared/components/shipping-form/shipping-form.component';
import { MemoryStorage, productFixture } from './helpers/catalog-fixtures';
import { userFixture, shippingOptions, addressFixture } from './helpers/customer-fixtures';

describe('Checkout con direcciones y facturación por pedido', () => {
  let users: jasmine.SpyObj<UserService>; let orders: jasmine.SpyObj<OrderService>;
  const product = productFixture();
  beforeEach(() => {
    users = jasmine.createSpyObj('Users', ['getMyProfile', 'validateRuc']); users.getMyProfile.and.returnValue(of(userFixture()));
    orders = jasmine.createSpyObj('Orders', ['getShippingOptions', 'createOrder']); orders.getShippingOptions.and.returnValue(of(shippingOptions()));
    orders.createOrder.and.resolveTo({ success: true, orderNumber: 'test-number', orderId: 'test-order', total: 100, message: '', pdfDelivered: true, shippingMethod: 'transportadora_contra_entrega' });
    TestBed.configureTestingModule({ imports: [CheckoutPage], providers: [provideRouter([]), provideNoopAnimations(),
      { provide: UserService, useValue: users }, { provide: OrderService, useValue: orders },
      { provide: CatalogService, useValue: { getProductById: () => of(product) } },
      { provide: CART_STORAGE, useValue: new MemoryStorage() },
      { provide: NotificationService, useValue: jasmine.createSpyObj('Notice', ['showSuccess', 'showError']) },
    ] });
    spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    TestBed.inject(CartService).addToCart(product, product.variants[0], 1, null, 'Texto Alfa');
  });
  function start() {
    const fixture = TestBed.createComponent(CheckoutPage); fixture.detectChanges(); flushMicrotasks(); fixture.detectChanges(); tick(250); fixture.detectChanges();
    const shipping = fixture.debugElement.query(By.directive(ShippingFormComponent));
    expect(shipping.injector.get(OrderService)).toBe(orders);
    expect((shipping.componentInstance as ShippingFormComponent).form).toBe(fixture.componentInstance.addressForm);
    return fixture;
  }
  it('sin direcciones abre el formulario aun con perfil complete y guarda por defecto', fakeAsync(() => {
    users.getMyProfile.and.returnValue(of(userFixture(false))); const fixture = start(); const page = fixture.componentInstance;
    expect(fixture.nativeElement.querySelector('[formControlName="recipientName"]')).not.toBeNull(); expect(page.saveShippingAddress).toBeTrue();
    page.addressForm.patchValue(addressFixture()); tick(250); fixture.detectChanges();
    void page.placeOrder(TestBed.inject(CartService).snapshot); flushMicrotasks();
    const body = orders.createOrder.calls.mostRecent().args[0];
    expect(body.saveShippingAddress).toBeTrue(); expect(body.billing).toEqual({ invoiceRequested: false });
    expect(body.items[0].variantId).toBe(product.variants[0].id); expect(body.items[0].customization).toBe('Texto Alfa');
  }));
  it('usa predeterminada, permite otra o nueva y no guarda por defecto', fakeAsync(() => {
    const fixture = start(); const page = fixture.componentInstance;
    expect(fixture.nativeElement.textContent).toContain('Valor Uno · Formato Uno');
    expect(page.selectedAddress).toBe('test-second'); expect(page.addressForm.value.street).toBe('Otra referencia'); expect(page.saveShippingAddress).toBeFalse();
    page.chooseAddress('test-address'); fixture.detectChanges(); tick(250); expect(page.addressForm.value.street).toBe('Referencia ficticia');
    page.chooseAddress('new'); fixture.detectChanges(); tick(250); expect(page.addressForm.value.recipientName).toBe(''); expect(page.saveShippingAddress).toBeFalse();
  }));
  it('envía solo consumidor final y omite cédula para envío local', fakeAsync(() => {
    orders.getShippingOptions.and.returnValue(of(shippingOptions(false))); const fixture = start(); const page = fixture.componentInstance;
    page.billingForm.patchValue({ legalName: 'Descartar', ruc: 'dato a descartar' });
    void page.placeOrder(TestBed.inject(CartService).snapshot); flushMicrotasks();
    const body = orders.createOrder.calls.mostRecent().args[0];
    expect(body.shippingAddress.recipientDocument).toBeUndefined(); expect(body.billing).toEqual({ invoiceRequested: false });
    expect(Object.keys(body.shippingAddress)).not.toContain('recipientDocument');
    expect(page.addressForm.controls['recipientDocument'].value).toBe('1234567');
    expect(orders.getShippingOptions).toHaveBeenCalledWith(page.addressForm.controls['city'].value);
  }));
  it('conserva la cédula al cambiar transportadora/local/transportadora y solo la envía para transportadora', fakeAsync(() => {
    orders.getShippingOptions.and.callFake(city => of({ ...shippingOptions(city !== 'Ciudad Beta'), city }));
    orders.createOrder.and.rejectWith({ status: 400, error: { field: 'quantity', error: 'Stock insuficiente.' } });
    const fixture = start(); const page = fixture.componentInstance;
    const shipping = fixture.debugElement.query(By.directive(ShippingFormComponent)).componentInstance as ShippingFormComponent;
    page.addressForm.controls['recipientDocument'].setValue('7654321');
    page.addressForm.controls['city'].setValue('Ciudad Beta'); tick(250); fixture.detectChanges();
    expect(orders.getShippingOptions).toHaveBeenCalledWith('Ciudad Beta');
    expect(shipping.options?.requiresRecipientDocument).toBeFalse();
    expect(page.addressForm.controls['recipientDocument'].hasValidator(Validators.required)).toBeFalse();
    expect(fixture.nativeElement.querySelector('[formControlName="recipientDocument"]')).toBeNull();
    page.addressForm.controls['recipientDocument'].setValue('');
    expect(page.addressForm.controls['recipientDocument'].valid).toBeTrue();
    page.addressForm.controls['recipientDocument'].setValue('7654321');
    void page.placeOrder(TestBed.inject(CartService).snapshot); flushMicrotasks();
    const local = orders.createOrder.calls.mostRecent().args[0];
    expect(local.shippingAddress.city).toBe('Ciudad Beta');
    expect(Object.keys(local.shippingAddress)).not.toContain('recipientDocument');
    expect(page.addressForm.controls['recipientDocument'].value).toBe('7654321');
    page.addressForm.controls['city'].setValue('Ciudad Gamma'); tick(250); fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[formControlName="recipientDocument"]');
    expect(input.value).toBe('7654321');
    expect(page.addressForm.controls['recipientDocument'].hasValidator(Validators.required)).toBeTrue();
    void page.placeOrder(TestBed.inject(CartService).snapshot); flushMicrotasks();
    const carrier = orders.createOrder.calls.mostRecent().args[0];
    expect(carrier.shippingAddress.city).toBe('Ciudad Gamma'); expect(carrier.shippingAddress.recipientDocument).toBe('7654321');
    expect(orders.createOrder).toHaveBeenCalledTimes(2);
  }));
  it('no confirma factura hasta aceptar propuesta de RUC y envía la confirmación', fakeAsync(() => {
    users.validateRuc.and.returnValue(of({ ruc: '1234567', suggestedRuc: '1234567-9', expectedDigit: 9, status: 'confirmation_required', requiresConfirmation: true }));
    const fixture = start(); const page = fixture.componentInstance; page.invoiceRequested = true;
    page.billingForm.patchValue({ legalName: 'Persona Alfa', ruc: '1234567' }); fixture.detectChanges(); tick(250); fixture.detectChanges();
    void page.placeOrder(TestBed.inject(CartService).snapshot); flushMicrotasks(); expect(orders.createOrder).not.toHaveBeenCalled();
    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button'));
    buttons.find(button => button.textContent?.includes('Sí, confirmo'))!.click(); fixture.detectChanges();
    void page.placeOrder(TestBed.inject(CartService).snapshot); flushMicrotasks();
    expect(orders.createOrder.calls.mostRecent().args[0].billing?.confirmedRuc).toBe('1234567-9');
  }));
  it('un error del servidor queda junto al campo y conserva carrito y valores', fakeAsync(() => {
    orders.createOrder.and.rejectWith({ status: 400, error: { field: 'shippingAddress.street', error: 'Revisá la referencia.' } });
    const fixture = start(); const page = fixture.componentInstance;
    void page.placeOrder(TestBed.inject(CartService).snapshot); flushMicrotasks(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Revisá la referencia.');
    expect(page.addressForm.value.street).toBe('Otra referencia'); expect(TestBed.inject(CartService).snapshot.items.length).toBe(1);
    expect(TestBed.inject(Router).navigate).not.toHaveBeenCalled();
  }));
  it('DV distinto permite continuar solo con aceptación explícita y mantiene errores fiscales junto al campo', fakeAsync(() => {
    users.validateRuc.and.returnValue(of({ ruc: '1234567-8', suggestedRuc: '1234567-9', expectedDigit: 9, status: 'mismatch', requiresConfirmation: true }));
    const fixture = start(); const page = fixture.componentInstance; page.invoiceRequested = true;
    page.billingForm.patchValue({ legalName: 'Persona Alfa', ruc: '1234567-8' }); fixture.detectChanges(); tick(250);
    void page.placeOrder(TestBed.inject(CartService).snapshot); flushMicrotasks(); expect(orders.createOrder).not.toHaveBeenCalled();
    page.billingForm.controls['acknowledgeRucMismatch'].setValue(true);
    orders.createOrder.and.rejectWith({ status: 400, error: { field: 'billing.legalName', error: 'Revisá la razón social.' } });
    void page.placeOrder(TestBed.inject(CartService).snapshot); flushMicrotasks(); fixture.detectChanges();
    expect(orders.createOrder.calls.mostRecent().args[0].billing?.acknowledgeRucMismatch).toBeTrue();
    expect(fixture.nativeElement.textContent).toContain('Revisá la razón social.');
    expect(page.billingForm.value.ruc).toBe('1234567-8'); expect(TestBed.inject(CartService).snapshot.items.length).toBe(1);
  }));
  it('falla de guardado opcional o navegación conserva compra exitosa y bloquea duplicados', fakeAsync(() => {
    orders.createOrder.and.resolveTo({ success: true, orderNumber: 'test-number', orderId: 'test-order', total: 100, message: '', pdfDelivered: false,
      shippingMethod: 'transportadora_contra_entrega', profileSaved: false, profileWarning: 'No pudimos guardar tu dirección.' });
    (TestBed.inject(Router).navigate as jasmine.Spy).and.rejectWith(new Error('Navegación simulada'));
    const fixture = start(); const page = fixture.componentInstance;
    void page.placeOrder(TestBed.inject(CartService).snapshot); flushMicrotasks(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('No pudimos guardar tu dirección.'); expect(page.completedOrder?.orderId).toBe('test-order');
    void page.placeOrder(TestBed.inject(CartService).snapshot); flushMicrotasks(); expect(orders.createOrder).toHaveBeenCalledTimes(1);
  }));
});
