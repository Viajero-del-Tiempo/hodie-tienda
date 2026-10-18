import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AdminCatalogService } from '../src/app/core/services/admin-catalog.service';
import { environment } from '../src/environments/environment';
import { productInput } from '../src/app/core/models/admin-catalog.model';
import { adminProductFixture, categoryFixture, policyFixture } from './helpers/admin-catalog-fixtures';

describe('API del catálogo admin', () => {
  let service: AdminCatalogService; let http: HttpTestingController;
  const url = environment.whatsappApiUrl + '/admin';
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(), provideHttpClientTesting()] });
    service = TestBed.inject(AdminCatalogService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('lee el catálogo admin completo y guarda solo campos editables y la versión', () => {
    const product = adminProductFixture(); product.active = false; product.variants[0].active = false;
    service.getProducts().subscribe(rows => expect(rows).toEqual([product]));
    http.expectOne(url + '/products').flush({ products: [product] });
    service.getProduct(product.id).subscribe(row => expect(row.version).toBe('test-version'));
    http.expectOne(url + '/products/' + product.id).flush({ product });
    service.updateProduct(product.id, productInput(product), product.version).subscribe();
    const req = http.expectOne(url + '/products/' + product.id);
    expect(req.request.method).toBe('PUT'); expect(req.request.body.version).toBe(product.version);
    expect(req.request.body.variants[0].id).toBe('test-v1');
    for (const field of ['id', 'priceFrom', 'skus', 'createdAt', 'updatedAt']) expect(Object.keys(req.request.body)).not.toContain(field);
    expect(Object.keys(req.request.body.variants[0])).not.toContain('available'); req.flush({ product });
  });
  it('crear omite IDs de variantes nuevas, desactivar y reactivar envían la versión', () => {
    const product = adminProductFixture(); const input = productInput(product); delete input.variants[0].id;
    service.createProduct(input).subscribe(); const create = http.expectOne(url + '/products');
    expect(create.request.method).toBe('POST'); expect(create.request.body.variants[0].id).toBeUndefined(); create.flush({ product });
    service.setProductActive(product, false).subscribe(); const remove = http.expectOne(url + '/products/' + product.id);
    expect(remove.request.method).toBe('DELETE'); expect(remove.request.body).toEqual({ version: product.version }); remove.flush({ product });
    service.setProductActive(product, true).subscribe(); const activate = http.expectOne(url + '/products/' + product.id + '/reactivate');
    expect(activate.request.method).toBe('PATCH'); expect(activate.request.body).toEqual({ version: product.version }); activate.flush({ product });
  });
  it('categorías y políticas conservan el ID y admiten temas libres', () => {
    const category = categoryFixture(); const policy = policyFixture();
    service.getCategories().subscribe(rows => expect(rows).toEqual([category])); http.expectOne(url + '/categories').flush({ categories: [category] });
    service.saveCategory(category).subscribe(); const create = http.expectOne(url + '/categories'); expect(create.request.method).toBe('POST'); create.flush({ category });
    service.saveCategory(category, category.id).subscribe(); const update = http.expectOne(url + '/categories/' + category.id); expect(update.request.method).toBe('PUT'); update.flush({ category });
    service.getPolicies().subscribe(rows => expect(rows).toEqual([policy])); http.expectOne(url + '/policies').flush({ policies: [policy] });
    service.savePolicy(policy).subscribe(); const createPolicy = http.expectOne(url + '/policies'); expect(createPolicy.request.body.id).toBe(policy.id); createPolicy.flush({ policy });
    service.savePolicy(policy, policy.id).subscribe(); const updatePolicy = http.expectOne(url + '/policies/' + policy.id); expect(updatePolicy.request.method).toBe('PUT'); updatePolicy.flush({ policy });
  });
  it('configuración del agente usa un endpoint propio y manda solamente umbral y versión', () => {
    const config = { corporateQuantityThreshold: 12, version: '3' };
    service.getAgentConfig().subscribe(value => expect(value).toEqual(config));
    http.expectOne(url + '/agent-config').flush({ config });
    service.saveAgentConfig(15, '3').subscribe(); const request = http.expectOne(url + '/agent-config');
    expect(request.request.method).toBe('PUT'); expect(request.request.body).toEqual({ corporateQuantityThreshold: 15, version: '3' });
    request.flush({ config: { corporateQuantityThreshold: 15, version: '4' } });
  });
  it('sube base64 y MIME únicamente a /admin/images, sin presets ni secretos', fakeAsync(() => {
    spyOn(FileReader.prototype, 'readAsDataURL').and.callFake(function(this: FileReader) {
      Object.defineProperty(this, 'result', { value: 'data:image/png;base64,aW1hZ2Vu' });
      this.dispatchEvent(new ProgressEvent('load'));
    });
    service.uploadImage(new File(['imagen ficticia'], 'test.png', { type: 'image/png' })).subscribe(value => expect(value).toBe('/local/image.png'));
    tick(); const req = http.expectOne(url + '/images'); expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual({ base64: 'aW1hZ2Vu', mimetype: 'image/png' }); req.flush({ imageUrl: '/local/image.png' });
  }));
  it('rechaza archivos no admitidos antes de enviarlos y conserva el rechazo del backend', fakeAsync(() => {
    const errors: string[] = [];
    service.uploadImage(new File(['test'], 'test.txt', { type: 'text/plain' })).subscribe({ error: error => errors.push(error.message) });
    tick(); expect(errors.length).toBe(1); http.expectNone(url + '/images');
    const oversized = new File(['test'], 'grande.png', { type: 'image/png' }); Object.defineProperty(oversized, 'size', { value: 11 * 1024 * 1024 });
    service.uploadImage(oversized).subscribe({ error: error => errors.push(error.message) }); tick();
    expect(errors.length).toBe(2); http.expectNone(url + '/images');
    service.updateProduct('test-product', productInput(adminProductFixture()), 'test-version').subscribe({ error: error => {
      expect(error.status).toBe(409); expect(error.error.field).toBe('version');
    } });
    http.expectOne(url + '/products/test-product').flush({ field: 'version', code: 'CATALOG_VERSION_CONFLICT' }, { status: 409, statusText: 'Conflict' });
  }));
});
