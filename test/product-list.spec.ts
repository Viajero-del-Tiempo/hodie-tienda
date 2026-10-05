import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, Subject } from 'rxjs';
import { ProductListPage } from '../src/app/pages/store/product-list-page/product-list-page';
import { CatalogService } from '../src/app/core/services/catalog.service';
import { CatalogPage } from '../src/app/core/models/catalog.model';
import { productFixture } from './helpers/catalog-fixtures';

describe('Listado de tienda', () => {
  it('muestra una tarjeta, precio desde, categorías del servicio y enlace con slug', fakeAsync(() => {
    const product = productFixture();
    const catalog = jasmine.createSpyObj<CatalogService>('Catalog',['getCategories','searchProducts']);
    catalog.getCategories.and.returnValue(of([{ id: 'test-category', name: 'Categoría Alfa', description: '', active: true, order: 1 }]));
    catalog.searchProducts.and.returnValue(of({ products: [product], total: 1, page: 1, pageSize: 12 }));
    TestBed.configureTestingModule({ providers: [provideRouter([]),provideNoopAnimations(),{ provide: CatalogService,useValue: catalog }] });
    const fixture = TestBed.createComponent(ProductListPage); fixture.detectChanges(); tick(200); fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('app-product-card').length).toBe(1);
    expect(fixture.nativeElement.textContent).toContain('Desde');
    expect(fixture.nativeElement.querySelector('app-product-card a').getAttribute('href')).toBe('/store/producto-alfa');
    expect(fixture.componentInstance.categories[0].name).toBe('Categoría Alfa');
    fixture.componentInstance.categoryId = 'test-category'; fixture.componentInstance.query = 'alfa'; fixture.componentInstance.applyFilters();
    tick(200);
    expect(catalog.searchProducts).toHaveBeenCalledWith({ query: 'alfa', categoryId: 'test-category', sort: 'relevance', page: 1, pageSize: 12 });
  }));
  it('cancela consultas anteriores y conserva los resultados de la búsqueda más reciente', fakeAsync(() => {
    const catalog = jasmine.createSpyObj<CatalogService>('Catalog',['getCategories','searchProducts']);
    const first = new Subject<CatalogPage>(); const latest = new Subject<CatalogPage>();
    catalog.getCategories.and.returnValue(of([])); catalog.searchProducts.and.returnValues(first,latest);
    TestBed.configureTestingModule({ providers: [provideRouter([]),provideNoopAnimations(),{ provide: CatalogService,useValue: catalog }] });
    const fixture = TestBed.createComponent(ProductListPage); fixture.detectChanges(); tick(200);
    fixture.componentInstance.query = 'nueva'; fixture.componentInstance.applyFilters(); tick(200);
    latest.next({ products: [productFixture()], total: 1, page: 1, pageSize: 12 });
    first.next({ products: [], total: 0, page: 1, pageSize: 12 });
    expect(fixture.componentInstance.products.length).toBe(1);
  }));
});
