import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { ActivatedRoute, provideRouter, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { BehaviorSubject, Observable, of, throwError, firstValueFrom } from 'rxjs';
import { convertToParamMap } from '@angular/router';
import { CustomerOrdersPage } from '../src/app/pages/profile/customer-orders-page';
import { CustomerOrderPage } from '../src/app/pages/profile/customer-order-page';
import { OrderService } from '../src/app/core/services/order.service';
import { authGuard } from '../src/app/core/auth/auth.guard';
import { AuthService } from '../src/app/core/auth/auth.service';
import { routes } from '../src/app/app.routes';
import { addressFixture } from './helpers/customer-fixtures';

describe('Mis pedidos: lectura y sesión', () => {
  let service: jasmine.SpyObj<OrderService>;
  const params = new BehaviorSubject(convertToParamMap({ id: 'test-order' }));
  beforeEach(() => {
    service = jasmine.createSpyObj('Orders', ['getMyOrders', 'getMyOrder', 'getMyOrderPdf', 'createOrder', 'updateOrder', 'updateOrderCustomization']);
    TestBed.configureTestingModule({ providers: [provideRouter([]), { provide: OrderService, useValue: service },
      { provide: ActivatedRoute, useValue: { paramMap: params } }, { provide: AuthService, useValue: { verifySession: () => of({ success: false }) } },
    ] }); params.next(convertToParamMap({ id: 'test-order' }));
  });
  it('continúa una página vacía con cursor y conserva números/fechas/total/estado', fakeAsync(() => {
    service.getMyOrders.and.returnValues(of({ orders: [], nextCursor: 'test-cursor' }),
      of({ orders: [{ id: 'test-order', orderNumber: 'test-number', createdAt: '2026-01-01T12:00:00Z', total: 100, status: 'pending' }], nextCursor: null }));
    const fixture = TestBed.createComponent(CustomerOrdersPage); fixture.detectChanges(); flushMicrotasks(); fixture.detectChanges();
    expect(service.getMyOrders.calls.allArgs()).toEqual([[undefined], ['test-cursor']]);
    expect(fixture.nativeElement.textContent).toContain('test-number'); expect(fixture.nativeElement.textContent).toContain('Pendiente');
    expect(fixture.nativeElement.querySelector('a[href="/profile/orders/test-order"]')).not.toBeNull();
  }));
  it('usuario sin pedidos ve estado vacío y enlace al catálogo', fakeAsync(() => {
    service.getMyOrders.and.returnValue(of({ orders: [], nextCursor: null }));
    const fixture = TestBed.createComponent(CustomerOrdersPage); fixture.detectChanges(); flushMicrotasks(); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Todavía no tenés pedidos');
  }));
  it('detalle histórico y nuevo muestran la foto, sin edición de estado o personalización', () => {
    service.getMyOrder.and.returnValue(of({ id: 'test-order', orderNumber: 'test-number', status: 'paid', total: 100, subtotal: 100, shippingCost: 0,
      shippingAddress: addressFixture(), billing: { invoiceRequested: true, legalName: 'Persona Alfa', ruc: '1234567-9' },
      items: [{ productId: 'test-product', variantId: 'test-variant', productName: 'Producto Alfa', productSku: 'test-sku', quantity: 1, price: 100,
        selectedPackaging: null, imageUrl: '', customization: 'Nombre Alfa' }] }));
    const fixture = TestBed.createComponent(CustomerOrderPage); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Nombre Alfa'); expect(fixture.nativeElement.textContent).toContain('1234567-9');
    expect(fixture.nativeElement.querySelectorAll('input, textarea, mat-select').length).toBe(0);
    expect(service.updateOrder).not.toHaveBeenCalled(); expect(service.updateOrderCustomization).not.toHaveBeenCalled();
    service.getMyOrder.and.returnValue(of({ id: 'test-old', orderNumber: 'test-old-number', status: 'pending', total: 10, subtotal: 10, shippingCost: 0,
      shippingAddress: addressFixture(), billing: null, items: [] }));
    params.next(convertToParamMap({ id: 'test-old' })); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Datos de facturación no registrados.');
  });
  it('404 no muestra datos y permite navegar después a otro pedido', () => {
    service.getMyOrder.and.returnValue(throwError(() => ({ status: 404 })));
    const fixture = TestBed.createComponent(CustomerOrderPage); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Este pedido no está disponible');
    service.getMyOrder.and.returnValue(of({ id: 'test-other', orderNumber: 'test-visible', status: 'pending', total: 10, subtotal: 10, shippingCost: 0,
      shippingAddress: addressFixture(), billing: null, items: [] })); params.next(convertToParamMap({ id: 'test-other' })); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('test-visible');
  });
  it('las tres rutas de perfil están protegidas y una sesión inválida deriva al login', async () => {
    const customerRoutes = routes[0].children!.filter(route => route.path?.startsWith('profile'));
    expect(customerRoutes.length).toBe(3); customerRoutes.forEach(route => expect(route.canActivate).toContain(authGuard));
    const navigation = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    const result = TestBed.runInInjectionContext(() => authGuard({} as ActivatedRouteSnapshot, { url: '/profile' } as RouterStateSnapshot));
    expect(await firstValueFrom(result as Observable<boolean>)).toBeFalse(); expect(navigation).toHaveBeenCalledWith(['/login']);
  });
});
