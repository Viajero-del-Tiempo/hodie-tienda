import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { ActivatedRoute, convertToParamMap, provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { ProductEditorComponent } from '../src/app/admin/pages/products/product-editor.component';
import { CatalogImagesComponent } from '../src/app/admin/catalog-images.component';
import { AdminCatalogService } from '../src/app/core/services/admin-catalog.service';
import { adminProductFixture, categoryFixture } from './helpers/admin-catalog-fixtures';

describe('Editor administrativo de productos', () => {
  let api: jasmine.SpyObj<AdminCatalogService>; let id: string | null;
  beforeEach(() => {
    id = 'test-product';
    api = jasmine.createSpyObj('AdminCatalog', ['getCategories', 'getProduct', 'createProduct', 'updateProduct', 'uploadImage']);
    api.getCategories.and.returnValue(of([categoryFixture()])); api.getProduct.and.returnValue(of(adminProductFixture()));
    api.updateProduct.and.returnValue(of(adminProductFixture())); api.createProduct.and.returnValue(of(adminProductFixture()));
    TestBed.configureTestingModule({ imports: [ProductEditorComponent, CatalogImagesComponent], providers: [provideRouter([]),
      { provide: AdminCatalogService, useValue: api },
      { provide: ActivatedRoute, useValue: { snapshot: { get paramMap() { return convertToParamMap(id ? { id } : {}); } } } },
    ] });
  });
  function start() { const fixture = TestBed.createComponent(ProductEditorComponent); fixture.detectChanges(); flushMicrotasks(); fixture.detectChanges(); return fixture; }
  it('edita el modelo completo, conserva IDs y nunca cambia el slug al cambiar nombre', fakeAsync(() => {
    const fixture = start(); const page = fixture.componentInstance;
    page.productForm.get('name')!.setValue('Producto Beta'); expect(page.productForm.get('slug')!.value).toBe('producto-alfa');
    page.variants.at(0).get('active')!.setValue(false); page.variants.at(0).get('price')!.setValue(123);
    page.attributes.at(0).get('value')!.setValue('Material Beta'); page.addTag(); page.tags.at(0).setValue('Etiqueta Alfa');
    page.packages.at(0).get('name')!.setValue('Empaque Gamma'); page.packages.at(0).get('price')!.setValue(35);
    page.customization.get('notes')!.setValue('Nota editada');
    void page.onSubmit(); flushMicrotasks();
    const [productId, input, version] = api.updateProduct.calls.mostRecent().args;
    expect(productId).toBe('test-product'); expect(version).toBe('test-version'); expect(input.schemaVersion).toBe(2);
    expect(input.variants[0].id).toBe('test-v1'); expect(input.variants[0].active).toBeFalse(); expect(input.variants[0].price).toBe(123);
    expect(input.attributes['material']).toBe('Material Beta'); expect(input.tags).toEqual(['Etiqueta Alfa']);
    expect(input.packagingOptions[0].name).toBe('Empaque Gamma'); expect(input.packagingOptions[0].price).toBe(35);
    expect(input.customization.notes).toBe('Nota editada'); expect(api.createProduct).not.toHaveBeenCalled();
  }));
  it('sugiere slug al crear hasta que se edite manualmente; variantes nuevas van sin ID', fakeAsync(() => {
    id = null; const fixture = start(); const page = fixture.componentInstance;
    page.productForm.get('name')!.setValue('Próducto Álfa'); expect(page.productForm.get('slug')!.value).toBe('producto-alfa');
    page.productForm.get('slug')!.setValue('enlace-elegido'); page.productForm.get('slug')!.markAsDirty();
    page.productForm.get('name')!.setValue('Producto Gamma'); expect(page.productForm.get('slug')!.value).toBe('enlace-elegido');
    page.productForm.get('categoryId')!.setValue('test-category'); page.addVariant(); page.variants.at(0).patchValue({ sku: 'TEST-NUEVO', price: 100, stock: 0 });
    // No navegación de prueba: la creación se rechaza para inspeccionar el payload y el borrador.
    api.createProduct.and.returnValue(throwError(() => ({ status: 400, error: { field: 'slug', error: 'Slug ocupado.' } })));
    void page.onSubmit(); flushMicrotasks(); fixture.detectChanges();
    const payload = api.createProduct.calls.mostRecent().args[0]; expect(payload.variants[0].id).toBeUndefined();
    expect(page.productForm.get('slug')!.value).toBe('enlace-elegido'); expect(page.productForm.get('slug')!.errors?.['server']).toBe('Slug ocupado.');
  }));
  it('no ofrece ni permite borrar variantes guardadas; quitar una fila nueva no altera sus IDs', fakeAsync(() => {
    const fixture = start(); const page = fixture.componentInstance;
    expect(fixture.nativeElement.querySelector('[data-variant-index="0"]').textContent).not.toContain('Quitar fila nueva');
    page.removeVariant(0); expect(page.variants.length).toBe(3); page.addVariant(); fixture.detectChanges();
    expect(page.variants.length).toBe(4); expect(fixture.nativeElement.querySelector('[data-variant-index="3"]').textContent).toContain('Quitar fila nueva');
    page.removeVariant(3); expect(page.variants.length).toBe(3); expect(page.variants.at(0).get('id')!.value).toBe('test-v1');
  }));
  it('tras crear adopta el ID y versión del servidor, y la fila deja de poder quitarse', fakeAsync(() => {
    id = null; const fixture = start(); const page = fixture.componentInstance;
    page.productForm.patchValue({ name: 'Producto Alfa', categoryId: 'test-category' });
    page.addVariant(); page.variants.at(0).patchValue({ sku: 'TEST-A', price: 100, stock: 8 });
    const saved = adminProductFixture(); saved.variants = [saved.variants[0]]; saved.variants[0].options = {}; saved.optionNames = [];
    api.createProduct.and.returnValue(of(saved)); const navigation = spyOn(TestBed.inject(Router), 'navigate').and.resolveTo(true);
    void page.onSubmit(); flushMicrotasks(); fixture.detectChanges();
    expect(api.createProduct.calls.mostRecent().args[0].variants[0].id).toBeUndefined();
    expect(page.variants.at(0).get('id')!.value).toBe('test-v1'); expect(page.baseline?.version).toBe('test-version');
    page.removeVariant(0); expect(page.variants.length).toBe(1); expect(page.isSaved(page.variants.at(0))).toBeTrue();
    expect(navigation).toHaveBeenCalledWith(['/admin/products/edit', 'test-product'], { replaceUrl: true });
  }));
  it('renombra ejes conservando valores y muestra combinaciones inválidas junto a las opciones', fakeAsync(() => {
    const fixture = start(); const page = fixture.componentInstance;
    page.axes.at(0).setValue('eje-nuevo'); expect(page.syncOptions()).toBeTrue();
    expect(page.variants.at(0).get(['options', 'eje-nuevo'])!.value).toBe('Valor Uno');
    expect(page.variants.at(0).get(['options', 'eje-a'])).toBeNull();
    api.updateProduct.and.returnValue(throwError(() => ({ status: 400, error: { field: 'variants[1].options', error: 'Combinación repetida.' } })));
    void page.onSubmit(); flushMicrotasks(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-variant-index="1"] td').textContent).toContain('Combinación repetida.');
    page.productForm.get('description')!.setValue('Descripción editada'); fixture.detectChanges();
    expect(page.variants.at(1).get('options')!.errors?.['server']).toBe('Combinación repetida.');
    page.variants.at(1).get(['options', 'eje-nuevo'])!.setValue('Otra opción'); fixture.detectChanges();
    expect(page.variants.at(1).get('options')!.hasError('server')).toBeFalse();
  }));
  it('marca variants[2].sku y packagingOptions[1].price; corregir el campo elimina solo ese error', fakeAsync(() => {
    const fixture = start(); const page = fixture.componentInstance;
    api.updateProduct.and.returnValue(throwError(() => ({ status: 400, error: { field: 'variants[2].sku', error: 'SKU ocupado.' } })));
    void page.onSubmit(); flushMicrotasks(); fixture.detectChanges();
    const input: HTMLInputElement = fixture.nativeElement.querySelector('[data-variant-index="2"] [formControlName="sku"]');
    expect(input.closest('td')!.textContent).toContain('SKU ocupado.');
    input.value = 'TEST-CORREGIDO'; input.dispatchEvent(new Event('input')); fixture.detectChanges();
    expect(page.variants.at(2).get('sku')!.hasError('server')).toBeFalse();
    api.updateProduct.and.returnValue(throwError(() => ({ status: 400, error: { field: 'packagingOptions[1].price', error: 'Precio rechazado.' } })));
    void page.onSubmit(); flushMicrotasks(); fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('[data-packaging-index="1"]').textContent).toContain('Precio rechazado.');
    expect(page.packages.at(1).get('price')!.errors?.['server']).toBe('Precio rechazado.');
  }));
  it('mantiene rechazos de personalización al editar otros campos', fakeAsync(() => {
    const fixture = start(); const page = fixture.componentInstance;
    api.updateProduct.and.returnValue(throwError(() => ({ status: 400, error: { field: 'customization.maxChars', error: 'Límite rechazado.' } })));
    void page.onSubmit(); flushMicrotasks(); fixture.detectChanges(); page.productForm.get('description')!.setValue('Nueva descripción');
    fixture.detectChanges(); expect(page.customization.get('maxChars')!.errors?.['server']).toBe('Límite rechazado.');
    page.customization.get('maxChars')!.setValue(25); expect(page.customization.get('maxChars')!.hasError('server')).toBeFalse();
  }));
  it('409 describe el stock, conserva el borrador y consultar la versión actual no lo reemplaza', fakeAsync(() => {
    const fixture = start(); const page = fixture.componentInstance; page.variants.at(0).get('price')!.setValue(120);
    api.updateProduct.and.returnValue(throwError(() => ({ status: 409, error: { field: 'version', code: 'CATALOG_VERSION_CONFLICT', error: 'El stock cambió de 8 a 6.',
      changes: [{ field: 'variants[0].stock', sku: 'TEST-A', previous: 8, current: 6 }] } })));
    void page.onSubmit(); flushMicrotasks(); fixture.detectChanges(); const draft = structuredClone(page.productForm.getRawValue());
    expect(fixture.nativeElement.textContent).toContain('El stock cambió de 8 a 6.'); expect(page.baseline?.version).toBe('test-version');
    const latest = adminProductFixture(); latest.variants[0].stock = 6; latest.version = 'test-next-version'; api.getProduct.and.returnValue(of(latest));
    void page.inspectConflict(); flushMicrotasks(); fixture.detectChanges(); expect(page.productForm.getRawValue()).toEqual(draft);
    expect(api.updateProduct).toHaveBeenCalledTimes(1); page.applyMerge(); fixture.detectChanges();
    expect(page.variants.at(0).get('stock')!.value).toBe(6); expect(page.variants.at(0).get('price')!.value).toBe(120);
    expect(page.baseline?.version).toBe('test-next-version'); expect(page.conflict).toBeFalse(); expect(api.updateProduct).toHaveBeenCalledTimes(1);
  }));
  it('no permite aplicar la revisión si ambas versiones cambiaron el stock hasta elegir', fakeAsync(() => {
    const fixture = start(); const page = fixture.componentInstance; page.variants.at(0).get('stock')!.setValue(15);
    api.updateProduct.and.returnValue(throwError(() => ({ status: 409, error: { field: 'version', code: 'CATALOG_VERSION_CONFLICT', error: 'Cambió stock.' } })));
    void page.onSubmit(); flushMicrotasks(); const latest = adminProductFixture(); latest.variants[0].stock = 6; latest.version = 'test-next-version';
    api.getProduct.and.returnValue(of(latest)); void page.inspectConflict(); flushMicrotasks(); fixture.detectChanges();
    expect(page.canMerge).toBeFalse(); page.applyMerge(); expect(page.baseline?.version).toBe('test-version');
    const radio: HTMLInputElement = fixture.nativeElement.querySelector('input[type="radio"]'); radio.click(); fixture.detectChanges();
    expect(page.canMerge).toBeTrue(); page.applyMerge(); expect(page.variants.at(0).get('stock')!.value).toBe(6);
  }));
  it('no guarda con subidas pendientes ni con precio fraccionario o negativo', fakeAsync(() => {
    const fixture = start(); const page = fixture.componentInstance; const images = page.variants.at(0).get('imageUrls')!;
    page.pending(images, true); void page.onSubmit(); flushMicrotasks(); expect(api.updateProduct).not.toHaveBeenCalled();
    page.pending(images, false); page.variants.at(0).get('price')!.setValue(1.5); void page.onSubmit(); flushMicrotasks();
    expect(api.updateProduct).not.toHaveBeenCalled(); expect(page.variants.at(0).get('price')!.hasError('integer')).toBeTrue();
    page.variants.at(0).get('price')!.setValue(-1); void page.onSubmit(); flushMicrotasks(); expect(api.updateProduct).not.toHaveBeenCalled();
  }));
  it('sube la foto del empaque por el servicio firmado, bloquea guardado mientras sube y envía la URL del servidor', fakeAsync(() => {
    const fixture = start(); const page = fixture.componentInstance;
    const cell = fixture.nativeElement.querySelector('[data-packaging-index="0"]');
    const fileInput = cell.querySelector('input[type="file"]') as HTMLInputElement;
    api.uploadImage.and.returnValue(of('https://example.test/producto-con-empaque.png'));
    Object.defineProperty(fileInput, 'files', { value: [new File(['imagen de prueba'], 'test.png', { type: 'image/png' })], configurable: true });
    fileInput.dispatchEvent(new Event('change'));
    expect(page.imagesPending).toBeTrue(); void page.onSubmit(); expect(api.updateProduct).not.toHaveBeenCalled();
    flushMicrotasks(); fixture.detectChanges();
    expect(api.uploadImage).toHaveBeenCalledTimes(1); expect(page.imagesPending).toBeFalse();
    expect(page.packages.at(0).get('imageUrl')!.value).toBe('https://example.test/producto-con-empaque.png');
    expect(cell.querySelector('img').getAttribute('src')).toBe('https://example.test/producto-con-empaque.png');
    void page.onSubmit(); flushMicrotasks();
    expect(api.updateProduct.calls.mostRecent().args[1].packagingOptions[0].imageUrl).toBe('https://example.test/producto-con-empaque.png');
  }));
  it('rechaza URL de empaque inválida y muestra error del servidor en imageUrl sin perder el borrador', fakeAsync(() => {
    const fixture = start(); const page = fixture.componentInstance; const image = page.packages.at(1).get('imageUrl')!;
    image.setValue('javascript:alert(1)'); void page.onSubmit(); flushMicrotasks(); fixture.detectChanges();
    expect(api.updateProduct).not.toHaveBeenCalled(); expect(image.hasError('imageUrl')).toBeTrue();
    expect(fixture.nativeElement.querySelector('[data-packaging-index="1"]').textContent).toContain('URL HTTP/HTTPS');
    image.setValue('https://example.test/nueva.png'); page.packages.at(1).get('name')!.setValue('Empaque editado');
    const before = structuredClone(page.productForm.getRawValue());
    api.updateProduct.and.returnValue(throwError(() => ({ status: 400, error: { field: 'packagingOptions[1].imageUrl', error: 'Imagen rechazada.' } })));
    void page.onSubmit(); flushMicrotasks(); fixture.detectChanges();
    expect(image.errors?.['server']).toBe('Imagen rechazada.'); expect(page.productForm.getRawValue()).toEqual(before);
    expect(fixture.nativeElement.querySelector('[data-packaging-index="1"]').textContent).toContain('Imagen rechazada.');
    image.setValue('https://example.test/corregida.png'); expect(image.errors?.['server']).toBeUndefined(); expect(image.valid).toBeTrue();
  }));
  it('conflicto 409 conserva la foto editada y permite quitarla del borrador', fakeAsync(() => {
    const fixture = start(); const page = fixture.componentInstance; const image = page.packages.at(0).get('imageUrl')!;
    image.setValue('https://example.test/edited.png');
    api.updateProduct.and.returnValue(throwError(() => ({ status: 409, error: { field: 'version', code: 'CATALOG_VERSION_CONFLICT', error: 'Cambió el stock.' } })));
    void page.onSubmit(); flushMicrotasks(); fixture.detectChanges();
    expect(image.value).toBe('https://example.test/edited.png'); expect(page.conflict).toBeTrue();
    const cell = fixture.nativeElement.querySelector('[data-packaging-index="0"]');
    const remove = (Array.from(cell.querySelectorAll('button')) as HTMLButtonElement[]).find(button => button.textContent!.includes('Quitar imagen'))!;
    remove.click(); fixture.detectChanges(); expect(image.value).toBe(''); expect(image.dirty).toBeTrue();
    expect(page.packages.at(0).get('name')!.value).toBe('Empaque Alfa');
  }));
  it('valida longitudes Unicode como el modelo y normaliza ejes con tildes compuestas', fakeAsync(() => {
    const fixture = start(); const page = fixture.componentInstance; const name = page.productForm.get('name')!;
    name.setValue('😀'.repeat(80)); expect(name.valid).toBeTrue(); name.setValue('😀'.repeat(81)); expect(name.hasError('maxlength')).toBeTrue();
    name.setValue('😀'); expect(name.hasError('minlength')).toBeTrue();
    page.axes.at(0).setValue('eje-a\u0301'); expect(page.syncOptions()).toBeTrue();
    expect(page.variants.at(0).get(['options', 'eje-á'])!.value).toBe('Valor Uno');
  }));
});
