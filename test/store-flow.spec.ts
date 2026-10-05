import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { MatDialog } from '@angular/material/dialog';
import { of, throwError } from 'rxjs';
import { ProductDetailPage } from '../src/app/pages/store/product-detail-page/product-detail-page';
import { CartPage } from '../src/app/pages/cart/cart-page/cart-page';
import { CheckoutPage } from '../src/app/pages/checkout/checkout-page/checkout-page';
import { ThankYouPage } from '../src/app/pages/checkout/thankyou-page/thankyou-page';
import { CatalogService } from '../src/app/core/services/catalog.service';
import { CartService, CART_STORAGE } from '../src/app/core/services/cart.service';
import { NotificationService } from '../src/app/core/services/notification.service';
import { AuthService } from '../src/app/core/auth/auth.service';
import { UserService } from '../src/app/core/services/user.service';
import { MemoryStorage, productFixture } from './helpers/catalog-fixtures';

describe('Tienda: detalle, carrito y confirmación', () => {
  let catalog: jasmine.SpyObj<CatalogService>;
  let notifications: jasmine.SpyObj<NotificationService>;
  let product = productFixture();
  let http: HttpTestingController;
  beforeEach(() => {
    product = productFixture();
    catalog = jasmine.createSpyObj<CatalogService>('Catalog',['getProductBySlug','getProductById']);
    catalog.getProductBySlug.and.returnValue(of(product)); catalog.getProductById.and.returnValue(of(product));
    notifications = jasmine.createSpyObj<NotificationService>('Notifications',['showError','showSuccess']);
    TestBed.configureTestingModule({ providers: [
      provideHttpClient(), provideHttpClientTesting(), provideNoopAnimations(),
      provideRouter([
        { path: 'store/:slug', component: ProductDetailPage },
        { path: 'cart', component: CartPage }, { path: 'checkout', component: CheckoutPage },
        { path: 'checkout/success', component: ThankYouPage },
      ]),
      { provide: CatalogService, useValue: catalog }, { provide: CART_STORAGE, useValue: new MemoryStorage() },
      { provide: NotificationService, useValue: notifications },
      { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(undefined) }) } },
      { provide: AuthService, useValue: { verifySession: () => of({ phone: 'test-phone' }) } },
      { provide: UserService, useValue: { getUserByPhone: () => of({
        uid: 'test-user', displayName: 'Cliente Alfa', phoneNumber: 'test-phone', profile_status: 'complete',
        addresses: [{ alias: 'Principal', street: 'Dirección ficticia', city: 'Ciudad Alfa', department: 'Departamento Alfa' }],
      }) } },
    ] });
    TestBed.overrideComponent(ProductDetailPage, { add: { providers: [
      { provide: MatDialog, useValue: { open: () => ({ afterClosed: () => of(undefined) }) } },
    ] } });
    http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());

  it('elige variante/precio/imágenes, agrega dos textos, edita carrito y confirma con ambos IDs', async () => {
    const harness = await RouterTestingHarness.create();
    const detail = await harness.navigateByUrl('/store/producto-alfa',ProductDetailPage);
    expect(catalog.getProductBySlug).toHaveBeenCalledWith('producto-alfa');
    detail.onVariantChange(product.variants[2]); harness.detectChanges();
    expect(detail.unitPrice).toBe(180);
    expect(detail.selectedImageUrl).toBe(product.variants[2].imageUrls[0]);
    detail.onVariantChange(product.variants[0]);
    detail.selectedPackaging = product.packagingOptions[0];
    detail.customization = 'Nombre Uno'; detail.quantity = 2;
    const router = TestBed.inject(Router);
    // Mantener el detalle abierto para agregar la segunda línea desde la misma página.
    const navigation = spyOn(router,'navigate').and.resolveTo(true);
    detail.addToCart(); detail.customization = 'Nombre Dos'; detail.quantity = 1; detail.addToCart();
    navigation.and.callThrough();
    const cart = TestBed.inject(CartService);
    expect(cart.snapshot.items.length).toBe(2);
    const cartPage = await harness.navigateByUrl('/cart',CartPage);
    await cart.refreshCatalog(); await cartPage.review(); harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Nombre Uno');
    expect(harness.routeNativeElement?.textContent).toContain('Nombre Dos');
    const second = cart.snapshot.items[1]; cartPage.editText(second);
    cartPage.editing[second.itemId] = 'Nombre Tres'; cartPage.saveText(second);
    await Promise.resolve();
    expect(cart.snapshot.items[1].customization).toBe('Nombre Tres');

    const checkout = await harness.navigateByUrl('/checkout',CheckoutPage);
    await checkout.reviewCart(); harness.detectChanges();
    expect(harness.routeNativeElement?.textContent).toContain('Nombre Tres');
    expect(harness.routeNativeElement?.querySelectorAll('textarea').length).toBe(0);
    const pending = checkout.placeOrder(cart.snapshot);
    await cart.refreshCatalog();
    const request = http.expectOne(req => req.url.endsWith('/orders/order/send'));
    const payload = request.request.body;
    expect(payload.items).toEqual([
      { productId: product.id, variantId: 'test-v1', quantity: 2, packagingType: 'tipo/libre', customization: 'Nombre Uno', customizationPending: false, customizationImagePending: false },
      { productId: product.id, variantId: 'test-v1', quantity: 1, packagingType: 'tipo/libre', customization: 'Nombre Tres', customizationPending: false, customizationImagePending: false },
    ]);
    expect(payload.items[0].price).toBeUndefined(); expect(payload.total).toBeUndefined(); expect(payload.userId).toBeUndefined();
    expect(payload.shippingAddress.city).toBe('Ciudad Alfa');
    request.flush({ success: true, orderId: 'test-order', orderNumber: 'test-number', total: 375, pdfDelivered: true });
    await pending;
    expect(cart.snapshot.items.length).toBe(0);
    expect(router.url).toContain('/checkout/success');
    expect(notifications.showSuccess).toHaveBeenCalled();
  });

  it('un 400 de stock conserva líneas y textos, sin navegar ni mostrar éxito', async () => {
    const cart = TestBed.inject(CartService); cart.addToCart(product,product.variants[0],2,null,'Nombre Uno');
    const harness = await RouterTestingHarness.create();
    const checkout = await harness.navigateByUrl('/checkout',CheckoutPage);
    await checkout.reviewCart();
    const navigation = spyOn(TestBed.inject(Router),'navigate').and.resolveTo(true);
    const pending = checkout.placeOrder(cart.snapshot);
    await cart.refreshCatalog();
    http.expectOne(req => req.url.endsWith('/orders/order/send')).flush({ field: 'quantity', error: 'Disponibles: 1 unidades.' }, { status: 400, statusText: 'Bad Request' });
    await pending;
    expect(cart.snapshot.items[0].quantity).toBe(2);
    expect(cart.snapshot.items[0].customization).toBe('Nombre Uno');
    expect(checkout.catalogErrors.length).toBe(1);
    expect(notifications.showSuccess).not.toHaveBeenCalled(); expect(navigation).not.toHaveBeenCalled();
  });

  it('actualizar el precio antes de confirmar exige revisar y confirmar otra vez', async () => {
    const cart = TestBed.inject(CartService); cart.addToCart(product,product.variants[0],1,null,'');
    const harness = await RouterTestingHarness.create();
    const checkout = await harness.navigateByUrl('/checkout',CheckoutPage); await checkout.reviewCart();
    const fresh = structuredClone(product); fresh.variants[0].price = 300;
    catalog.getProductById.and.returnValue(of(fresh));
    await checkout.placeOrder(cart.snapshot);
    http.expectNone(req => req.url.endsWith('/orders/order/send'));
    expect(cart.snapshot.subtotal).toBe(300); expect(checkout.catalogNotice).toBeTruthy();
    expect(cart.snapshot.items[0].customizationPending).toBeTrue();
  });

  it('el enlace inexistente o inactivo muestra el aviso y el acceso al catálogo', async () => {
    catalog.getProductBySlug.and.returnValue(throwError(() => ({ status: 404 })));
    const harness = await RouterTestingHarness.create();
    await harness.navigateByUrl('/store/enlace-viejo',ProductDetailPage);
    expect(harness.routeNativeElement?.textContent).toContain('Este producto ya no está disponible');
    expect(harness.routeNativeElement?.querySelector('a')?.getAttribute('href')).toBe('/store');
  });

  it('oculta el texto para productos que no lo admiten y bloquea compra agotada', async () => {
    product.customization.allowed = false;
    product.variants.forEach(variant => { variant.stock = 0; });
    const harness = await RouterTestingHarness.create();
    const detail = await harness.navigateByUrl('/store/producto-alfa',ProductDetailPage);
    expect(harness.routeNativeElement?.querySelector('textarea')).toBeNull();
    expect(detail.canAdd).toBeFalse();
    detail.addToCart(); expect(TestBed.inject(CartService).snapshot.items.length).toBe(0);
  });
});
