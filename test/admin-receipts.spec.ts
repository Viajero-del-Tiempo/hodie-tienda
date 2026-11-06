import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { of, throwError } from 'rxjs';
import { ActivatedRoute, convertToParamMap, Router } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { AuthService } from '../src/app/core/auth/auth.service';
import { tokenInterceptor } from '../src/app/core/auth/token.interceptor';
import { PaymentReceiptService } from '../src/app/core/services/payment-receipt.service';
import { OrderReceiptsComponent } from '../src/app/admin/pages/orders/order-detail/receipts/order-receipts.component';
import { OrderDetailComponent } from '../src/app/admin/pages/orders/order-detail/order-detail-component/order-detail-component';
import { PaymentReceipt } from '../src/app/core/models/payment-receipt.model';
import { Order, OrderStatus } from '../src/app/core/models/order.model';
import { OrderService } from '../src/app/core/services/order.service';
import { NotificationService } from '../src/app/core/services/notification.service';

const receipt: PaymentReceipt = { id: 'test-receipt', filename: 'comprobante-ficticio.pdf', mimeType: 'application/pdf',
  size: 100, receivedAt: Date.parse('2026-01-01'), verification: 'pending_manual' };
describe('API protegida de comprobantes', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([tokenInterceptor])), provideHttpClientTesting(),
    { provide: AuthService, useValue: { getToken: () => 'test-token' } }] }));
  afterEach(() => TestBed.inject(HttpTestingController).verify());
  it('lista y descarga usan backend y token; descarga Blob, sin firmas ni URLs del proveedor', () => {
    const api = TestBed.inject(PaymentReceiptService), http = TestBed.inject(HttpTestingController);
    api.list('test-order').subscribe(values => expect(values).toEqual([receipt]));
    const list = http.expectOne(req => req.url.endsWith('/admin/orders/test-order/receipts'));
    expect(list.request.method).toBe('GET'); expect(list.request.headers.get('Authorization')).toBe('Bearer test-token'); list.flush({ receipts: [receipt] });
    api.download('test-order', receipt.id).subscribe();
    const download = http.expectOne(req => req.url.endsWith('/admin/orders/test-order/receipts/test-receipt/download'));
    expect(download.request.responseType).toBe('blob'); expect(download.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(download.request.url).not.toContain('cloudinary'); download.flush(new Blob(['%PDF-test'], { type: 'application/pdf' }));
  });
});
describe('Comprobantes de un pedido: solo lectura y descarga autenticada', () => {
  let api: jasmine.SpyObj<PaymentReceiptService>;
  beforeEach(() => {
    api = jasmine.createSpyObj('Receipts', ['list', 'download']); api.list.and.returnValue(of([receipt]));
    api.download.and.returnValue(of(new Blob(['%PDF-test'], { type: 'application/pdf' })));
    TestBed.configureTestingModule({ providers: [{ provide: PaymentReceiptService, useValue: api }] });
  });
  const start = () => { const f = TestBed.createComponent(OrderReceiptsComponent); f.componentRef.setInput('orderId', 'test-order'); f.detectChanges(); return f; };
  it('muestra nombre/fecha y revisión manual, sin URL pública ni botón para confirmar pago', () => {
    const f = start(); expect(api.list).toHaveBeenCalledWith('test-order');
    expect(f.nativeElement.textContent).toContain(receipt.filename);
    expect(f.nativeElement.textContent).toContain('no confirma el pago');
    expect(f.nativeElement.querySelector('a[href]')).toBeNull();
    expect(f.nativeElement.querySelectorAll('button').length).toBe(1);
    api.list.and.returnValue(of([])); f.componentInstance.load(); f.detectChanges();
    expect(f.nativeElement.textContent).toContain('No hay comprobantes asociados');
  });
  it('descarga Blob y libera URL temporal; 403 conserva la lista y muestra el error', () => {
    const create = spyOn(URL, 'createObjectURL').and.returnValue('blob:private-fixture');
    const revoke = spyOn(URL, 'revokeObjectURL'); const click = spyOn(HTMLAnchorElement.prototype, 'click');
    const f = start(); f.nativeElement.querySelector('button').click();
    expect(api.download).toHaveBeenCalledWith('test-order', receipt.id); expect(click).toHaveBeenCalled();
    expect(create).toHaveBeenCalled(); expect(revoke).toHaveBeenCalledWith('blob:private-fixture');
    api.download.and.returnValue(throwError(() => ({ status: 403 }))); f.componentInstance.download(receipt); f.detectChanges();
    expect(f.componentInstance.receipts).toEqual([receipt]); expect(f.nativeElement.querySelector('[role=alert]').textContent).toContain('Revisá tu sesión');
    expect(create).toHaveBeenCalledTimes(1);
  });
  it('un error de lista se muestra y permite recargar; cambio de pedido lee solo ese ID', () => {
    api.list.and.returnValue(throwError(() => ({ status: 401 }))); const f = start();
    expect(f.nativeElement.querySelector('[role=alert]').textContent).toContain('No se pudieron cargar');
    api.list.and.returnValue(of([receipt])); f.componentRef.setInput('orderId', 'test-second'); f.detectChanges();
    expect(api.list).toHaveBeenCalledWith('test-second'); expect(f.componentInstance.error).toBe('');
  });
});
describe('Detalle admin conserva la confirmación manual del pago', () => {
  it('ver o descargar comprobantes no cambia estado; el botón existente actualiza el pedido', () => {
    const order = { id: 'test-order', orderNumber: 'test-number', status: OrderStatus.Pending, items: [],
      shippingAddress: { recipientName: 'Persona Alfa', street: 'Referencia', city: 'Ciudad Alfa', department: 'Zona Alfa' },
      subtotal: 100, total: 100, shippingCost: 0, userDisplayName: 'Persona Alfa', userPhoneNumber: 'test-phone' } as Order;
    const orders = jasmine.createSpyObj<OrderService>('Orders', ['getOrder', 'updateOrder']);
    orders.getOrder.and.returnValue(of(order)); orders.updateOrder.and.returnValue(of({ success: true }));
    const receipts = jasmine.createSpyObj<PaymentReceiptService>('Receipts', ['list', 'download']); receipts.list.and.returnValue(of([receipt]));
    TestBed.configureTestingModule({ providers: [provideNoopAnimations(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: convertToParamMap({ id: order.id }) } } },
      { provide: Router, useValue: { navigate: jasmine.createSpy('navigate') } },
      { provide: OrderService, useValue: orders }, { provide: PaymentReceiptService, useValue: receipts },
      { provide: NotificationService, useValue: jasmine.createSpyObj('Notifications', ['showError', 'showSuccess']) },
    ] });
    const f = TestBed.createComponent(OrderDetailComponent); f.detectChanges();
    expect(f.nativeElement.querySelector('app-order-receipts')).not.toBeNull();
    expect(orders.updateOrder).not.toHaveBeenCalled(); expect(f.componentInstance.order?.status).toBe(OrderStatus.Pending);
    f.componentInstance.selectedStatus = OrderStatus.Paid; f.componentInstance.updateStatus();
    expect(orders.updateOrder).toHaveBeenCalledWith(order.id, { status: OrderStatus.Paid });
  });
});
