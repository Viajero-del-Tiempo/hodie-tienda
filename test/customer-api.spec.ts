import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AuthService } from '../src/app/core/auth/auth.service';
import { tokenInterceptor } from '../src/app/core/auth/token.interceptor';
import { UserService } from '../src/app/core/services/user.service';
import { OrderService } from '../src/app/core/services/order.service';
import { userFixture } from './helpers/customer-fixtures';

describe('Contrato HTTP de clientes', () => {
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(withInterceptors([tokenInterceptor])), provideHttpClientTesting(),
      { provide: AuthService, useValue: { getToken: () => 'test-token' } },
    ] }); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('lista/detalle/PDF usan sesión y rutas propias; solo lecturas sin UID ni teléfono', () => {
    const service = TestBed.inject(OrderService);
    service.getMyOrders('test-cursor').subscribe(page => expect(page.orders.length).toBe(0));
    const list = http.expectOne(req => req.url.endsWith('/users/me/orders'));
    expect(list.request.method).toBe('GET'); expect(list.request.headers.get('Authorization')).toBe('Bearer test-token');
    expect(list.request.params.keys().sort()).toEqual(['cursor', 'limit']); list.flush({ orders: [], nextCursor: null });
    service.getMyOrder('test-order').subscribe(); const detail = http.expectOne(req => req.url.endsWith('/users/me/orders/test-order'));
    expect(detail.request.method).toBe('GET'); detail.flush({ order: { id: 'test-order' } });
    service.getMyOrderPdf('test-order').subscribe(); const pdf = http.expectOne(req => req.url.endsWith('/users/me/orders/test-order/pdf'));
    expect(pdf.request.method).toBe('GET'); expect(pdf.request.responseType).toBe('blob'); pdf.flush(new Blob(['%PDF-test']));
  });
  it('guardar perfil transmite versión y usa la respuesta con IDs nuevos', async () => {
    const service = TestBed.inject(UserService); const user = userFixture();
    const pending = service.updateMyProfile({ version: 'test-version', displayName: 'Nombre nuevo', addresses: [], billingProfiles: [] });
    const request = http.expectOne(req => req.url.endsWith('/users/me')); expect(request.request.method).toBe('PUT');
    expect(request.request.body.version).toBe('test-version'); request.flush({ success: true, user: { ...user, version: 'test-next-version' } });
    expect((await pending).version).toBe('test-next-version');
  });
});
