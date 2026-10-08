import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { CategoriesPage } from '../src/app/admin/pages/categories/categories-page';
import { PoliciesPage } from '../src/app/admin/pages/policies/policies-page';
import { ProductListComponent } from '../src/app/admin/pages/products/product-list.component';
import { AdminCatalogService } from '../src/app/core/services/admin-catalog.service';
import { adminProductFixture, categoryFixture, policyFixture } from './helpers/admin-catalog-fixtures';

describe('Listados y editores del catálogo admin', () => {
  let api: jasmine.SpyObj<AdminCatalogService>;
  beforeEach(() => {
    api = jasmine.createSpyObj('AdminCatalog', ['getProducts', 'getProduct', 'setProductActive', 'getCategories', 'saveCategory', 'getPolicies', 'savePolicy']);
    api.getProducts.and.returnValue(of([adminProductFixture()])); api.getProduct.and.returnValue(of(adminProductFixture()));
    api.getCategories.and.returnValue(of([categoryFixture()])); api.getPolicies.and.returnValue(of([policyFixture()]));
    api.saveCategory.and.returnValue(of(categoryFixture())); api.savePolicy.and.returnValue(of(policyFixture()));
    TestBed.configureTestingModule({ imports: [CategoriesPage, PoliciesPage, ProductListComponent], providers: [provideRouter([]), { provide: AdminCatalogService, useValue: api }] });
  });
  it('lista categoría, precio desde, total de variantes y estado; activa y desactiva con la versión actual', fakeAsync(() => {
    const fixture = TestBed.createComponent(ProductListComponent); fixture.detectChanges(); flushMicrotasks(); fixture.detectChanges(); const page = fixture.componentInstance;
    const text = fixture.nativeElement.textContent;
    expect(text).toContain('Categoría Alfa'); expect(text).toContain('Precio desde'); expect(text).toContain('3'); expect(text).toContain('Activo');
    expect(fixture.nativeElement.querySelector('tbody tr td:nth-child(3)').textContent).toContain('100');
    expect(fixture.nativeElement.querySelector('tbody tr td:nth-child(4)').textContent.trim()).toBe('3');
    const inactive = adminProductFixture(); inactive.active = false; inactive.version = 'test-next-version'; api.setProductActive.and.returnValue(of(inactive));
    void page.toggle(page.products[0]); flushMicrotasks(); fixture.detectChanges();
    expect(api.setProductActive.calls.mostRecent().args[1]).toBeFalse(); expect(page.products[0].active).toBeFalse();
    api.setProductActive.and.returnValue(of(adminProductFixture())); void page.toggle(page.products[0]); flushMicrotasks();
    expect(api.setProductActive.calls.mostRecent().args[0].version).toBe('test-next-version'); expect(api.setProductActive.calls.mostRecent().args[1]).toBeTrue();
  }));
  it('no cambia el estado de la fila ante 409, informa el cambio y exige consultar antes de reintentar', fakeAsync(() => {
    const fixture = TestBed.createComponent(ProductListComponent); fixture.detectChanges(); flushMicrotasks(); const page = fixture.componentInstance;
    api.setProductActive.and.returnValue(throwError(() => ({ status: 409, error: { field: 'version', error: 'El stock cambió de 8 a 6.' } })));
    void page.toggle(page.products[0]); flushMicrotasks(); fixture.detectChanges();
    expect(page.products[0].active).toBeTrue(); expect(page.products[0].version).toBe('test-version');
    expect(fixture.nativeElement.textContent).toContain('El stock cambió de 8 a 6.');
    void page.toggle(page.products[0]); flushMicrotasks(); expect(api.setProductActive).toHaveBeenCalledTimes(1);
    const latest = adminProductFixture(); latest.version = 'test-next-version'; api.getProduct.and.returnValue(of(latest));
    void page.refresh(page.products[0]); flushMicrotasks(); expect(page.products[0].version).toBe('test-next-version'); expect(api.setProductActive).toHaveBeenCalledTimes(1);
  }));
  it('filtra productos por categoría, estado, nombre y SKU sin quitar las variantes inactivas del contador', fakeAsync(() => {
    const fixture = TestBed.createComponent(ProductListComponent); fixture.detectChanges(); flushMicrotasks(); const page = fixture.componentInstance;
    page.query = 'test-b'; expect(page.filtered.length).toBe(1); page.state = 'inactive'; expect(page.filtered.length).toBe(0);
    page.state = ''; page.categoryId = 'otra-categoria'; expect(page.filtered.length).toBe(0);
    page.categoryId = 'test-category'; page.query = 'producto'; expect(page.filtered[0].variants.length).toBe(3);
  }));
  it('crea categorías, sugiere ID y conserva ID al editar nombre, orden y activación', fakeAsync(() => {
    const fixture = TestBed.createComponent(CategoriesPage); fixture.detectChanges(); flushMicrotasks(); const page = fixture.componentInstance;
    page.form.get('name')!.setValue('Categoría Beta'); expect(page.form.get('id')!.value).toBe('categoria-beta');
    api.saveCategory.and.returnValue(of({ ...categoryFixture(), id: 'categoria-beta', name: 'Categoría Beta' }));
    void page.save(); flushMicrotasks(); expect(api.saveCategory.calls.mostRecent().args[1]).toBeUndefined();
    fixture.detectChanges(); expect(fixture.nativeElement.querySelector('[formControlName="id"]').readOnly).toBeTrue(); page.form.patchValue({ name: 'Categoría Gamma', order: 3, active: false });
    void page.save(); flushMicrotasks(); const [payload, existingId] = api.saveCategory.calls.mostRecent().args;
    expect(existingId).toBe('categoria-beta'); expect(payload.id).toBe('categoria-beta'); expect(payload.name).toBe('Categoría Gamma');
    expect(payload.order).toBe(3); expect(payload.active).toBeFalse();
  }));
  it('rechazo de categoría con productos activos queda junto al checkbox, conservando nombre y orden', fakeAsync(() => {
    const fixture = TestBed.createComponent(CategoriesPage); fixture.detectChanges(); flushMicrotasks(); const page = fixture.componentInstance;
    page.edit(categoryFixture()); page.form.patchValue({ name: 'Borrador Alfa', order: 5, active: false });
    api.saveCategory.and.returnValue(throwError(() => ({ status: 409, error: { field: 'active', error: 'Hay productos activos en esta categoría.' } })));
    void page.save(); flushMicrotasks(); fixture.detectChanges();
    expect(page.form.getRawValue().name).toBe('Borrador Alfa'); expect(page.form.getRawValue().order).toBe(5);
    expect(page.form.get('active')!.errors?.['server']).toBe('Hay productos activos en esta categoría.');
    const checkbox: HTMLInputElement = fixture.nativeElement.querySelector('[formControlName="active"]');
    expect(checkbox.closest('label')!.nextElementSibling!.textContent).toContain('Hay productos activos');
    checkbox.click(); fixture.detectChanges(); expect(page.form.get('active')!.hasError('server')).toBeFalse();
  }));
  it('ordena categorías por orden y permite políticas de tema libre, con ID estable y errores por campo', fakeAsync(() => {
    api.getCategories.and.returnValue(of([{ ...categoryFixture(), id: 'test-ultima', order: 8 }, { ...categoryFixture(), order: 1 }]));
    const categories = TestBed.createComponent(CategoriesPage); categories.detectChanges(); flushMicrotasks();
    expect(categories.componentInstance.categories.map(row => row.order)).toEqual([1, 8]);
    const fixture = TestBed.createComponent(PoliciesPage); fixture.detectChanges(); flushMicrotasks(); const page = fixture.componentInstance;
    page.form.patchValue({ id: 'tema-elegido', title: 'Título Alfa', text: 'Texto Alfa' }); api.savePolicy.and.returnValue(of({ id: 'tema-elegido', title: 'Título Alfa', text: 'Texto Alfa' }));
    void page.save(); flushMicrotasks(); expect(api.savePolicy.calls.mostRecent().args[1]).toBeUndefined(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[formControlName="id"]').readOnly).toBeTrue(); page.form.get('title')!.setValue('Título Beta'); page.form.get('text')!.setValue('Borrador de texto');
    api.savePolicy.and.returnValue(throwError(() => ({ status: 400, error: { field: 'text', error: 'Texto rechazado.' } })));
    void page.save(); flushMicrotasks(); fixture.detectChanges();
    expect(api.savePolicy.calls.mostRecent().args[1]).toBe('tema-elegido'); expect(page.form.get('text')!.value).toBe('Borrador de texto');
    expect(page.form.get('text')!.errors?.['server']).toBe('Texto rechazado.'); expect(fixture.nativeElement.textContent).toContain('Texto rechazado.');
  }));
});
