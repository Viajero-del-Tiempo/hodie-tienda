import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogService } from '../src/app/core/services/catalog.service';
import { productFixture } from './helpers/catalog-fixtures';

describe('CatalogService', () => {
  let service: CatalogService;
  let http: HttpTestingController;
  beforeEach(() => {
    TestBed.configureTestingModule({ providers: [provideHttpClient(),provideHttpClientTesting()] });
    service = TestBed.inject(CatalogService); http = TestBed.inject(HttpTestingController);
  });
  afterEach(() => http.verify());
  it('envía búsqueda, categoría, orden y paginación al servicio central', () => {
    service.searchProducts({ query: 'alfa para alguien', categoryId: 'test-category', page: 2, pageSize: 12, sort: 'price-asc' }).subscribe(page => expect(page.total).toBe(14));
    const request = http.expectOne(req => req.url.endsWith('/catalog/products'));
    expect(request.request.method).toBe('GET');
    expect(request.request.params.get('query')).toBe('alfa para alguien');
    expect(request.request.params.get('categoryId')).toBe('test-category');
    expect(request.request.params.get('page')).toBe('2');
    expect(request.request.params.get('sort')).toBe('price-asc');
    request.flush({ products: [], total: 14, page: 2, pageSize: 12 });
  });
  it('obtiene categorías y detalle por slug sin consultar Firebase', () => {
    service.getCategories().subscribe(categories => expect(categories[0].name).toBe('Categoría Alfa'));
    http.expectOne(req => req.url.endsWith('/catalog/categories')).flush({ categories: [{ id: 'test-category', name: 'Categoría Alfa' }] });
    service.getProductBySlug('producto-alfa').subscribe(product => expect(product.id).toBe('test-product'));
    http.expectOne(req => req.url.endsWith('/catalog/products/by-slug/producto-alfa')).flush({ product: productFixture() });
  });
  it('propaga el 404 para que el detalle muestre el aviso de enlace viejo', () => {
    service.getProductBySlug('enlace-anterior').subscribe({ error: error => expect(error.status).toBe(404) });
    http.expectOne(req => req.url.endsWith('/by-slug/enlace-anterior')).flush({}, { status: 404, statusText: 'Not Found' });
  });
});
