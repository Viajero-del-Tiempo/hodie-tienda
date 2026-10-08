import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { FormArray, FormControl } from '@angular/forms';
import { of, Subject, throwError } from 'rxjs';
import { CatalogImagesComponent } from '../src/app/admin/catalog-images.component';
import { AdminCatalogService } from '../src/app/core/services/admin-catalog.service';

describe('Imágenes del catálogo: servidor firmado o local', () => {
  let api: jasmine.SpyObj<AdminCatalogService>;
  beforeEach(() => {
    api = jasmine.createSpyObj('AdminCatalog', ['uploadImage']);
    TestBed.configureTestingModule({ imports: [CatalogImagesComponent], providers: [{ provide: AdminCatalogService, useValue: api }] });
  });
  function start(control: FormArray<FormControl<string>> | FormControl<string>) {
    const fixture = TestBed.createComponent(CatalogImagesComponent); fixture.componentRef.setInput('control', control); fixture.detectChanges(); return fixture;
  }
  function select(fixture: ReturnType<typeof start>, files: File[]) {
    const input: HTMLInputElement = fixture.nativeElement.querySelector('input[type="file"]');
    Object.defineProperty(input, 'files', { value: files, configurable: true }); input.dispatchEvent(new Event('change'));
  }
  it('muestra la URL local devuelta por backend y permite quitar la imagen del borrador', fakeAsync(() => {
    const control = new FormArray<FormControl<string>>([]); const fixture = start(control); api.uploadImage.and.returnValue(of('http://localhost:3000/local/test.png'));
    select(fixture, [new File(['test'], 'test.png', { type: 'image/png' })]); flushMicrotasks(); fixture.detectChanges();
    expect(api.uploadImage).toHaveBeenCalledTimes(1); expect(control.value).toEqual(['http://localhost:3000/local/test.png']);
    expect(fixture.nativeElement.querySelector('img').getAttribute('src')).toBe(control.value[0]);
    fixture.componentInstance.remove(0); expect(control.value).toEqual([]); expect(control.dirty).toBeTrue();
  }));
  it('retiene un archivo rechazado, bloquea el guardado y permite reintentar sin duplicar imágenes ya subidas', fakeAsync(() => {
    const control = new FormArray<FormControl<string>>([]); const fixture = start(control); const page = fixture.componentInstance;
    const pending = spyOn(page.pendingChange, 'emit'); const first = new File(['a'], 'a.png', { type: 'image/png' }); const second = new File(['b'], 'b.png', { type: 'image/png' });
    api.uploadImage.and.returnValues(of('/local/a.png'), throwError(() => ({ status: 400, error: { field: 'base64', error: 'Imagen rechazada.' } })), of('/local/b.png'));
    select(fixture, [first, second]); flushMicrotasks(); fixture.detectChanges();
    expect(control.value).toEqual(['/local/a.png']); expect(page.pending).toEqual([second]); expect(page.error).toBe('Imagen rechazada.'); expect(pending.calls.mostRecent().args[0]).toBeTrue();
    void page.upload(); flushMicrotasks(); expect(control.value).toEqual(['/local/a.png', '/local/b.png']); expect(page.pending).toEqual([]); expect(pending.calls.mostRecent().args[0]).toBeFalse();
  }));
  it('reemplaza la imagen del empaque y mantiene pendiente durante la respuesta asíncrona', fakeAsync(() => {
    const control = new FormControl('/local/previa.png', { nonNullable: true }); const fixture = start(control); const response = new Subject<string>(); api.uploadImage.and.returnValue(response);
    const pending = spyOn(fixture.componentInstance.pendingChange, 'emit'); select(fixture, [new File(['a'], 'a.png', { type: 'image/png' })]);
    expect(fixture.componentInstance.uploading).toBeTrue(); expect(control.value).toBe('/local/previa.png'); expect(pending.calls.mostRecent().args[0]).toBeTrue();
    response.next('/local/nueva.png'); response.complete(); flushMicrotasks(); fixture.detectChanges(); expect(control.value).toBe('/local/nueva.png'); expect(pending.calls.mostRecent().args[0]).toBeFalse();
  }));
});
