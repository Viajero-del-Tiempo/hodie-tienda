import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { VariantSelectorComponent } from '../src/app/shared/components/variant-selector/variant-selector.component';
import { PackagingSelectorComponent } from '../src/app/shared/components/packaging-selector/packaging-selector.component';
import { productFixture } from './helpers/catalog-fixtures';

describe('Selectores del catálogo', () => {
  beforeEach(() => TestBed.configureTestingModule({ providers: [provideNoopAnimations()] }));
  it('resuelve ejes dinámicos, deshabilita agotados y permite cambiar a otra combinación', () => {
    const fixture = TestBed.createComponent(VariantSelectorComponent);
    const product = productFixture();
    const selected = jasmine.createSpy('selected');
    fixture.componentInstance.variantChange.subscribe(selected);
    fixture.componentRef.setInput('product',product); fixture.detectChanges();
    const component = fixture.componentInstance;
    expect(fixture.nativeElement.querySelectorAll('mat-select').length).toBe(2);
    component.choose('eje-a','Valor Uno',0);
    expect(component.choices('eje-b',1)).toEqual([
      { value: 'Formato Uno', available: true }, { value: 'Formato Dos', available: false },
    ]);
    component.choose('eje-b','Formato Dos',1);
    expect(selected.calls.mostRecent().args[0]).toBeNull();
    component.choose('eje-b','Formato Uno',1);
    expect(selected.calls.mostRecent().args[0].id).toBe('test-v1');
    component.choose('eje-a','Valor Dos',0);
    expect(component.selected['eje-b']).toBeUndefined();
    component.choose('eje-b','Formato Dos',1);
    expect(selected.calls.mostRecent().args[0].id).toBe('test-v3');
  });
  it('una única variante disponible se selecciona; las agotadas no', () => {
    const fixture = TestBed.createComponent(VariantSelectorComponent);
    const product = productFixture(); product.variants = [product.variants[0]];
    const selected = jasmine.createSpy('selected'); fixture.componentInstance.variantChange.subscribe(selected);
    fixture.componentRef.setInput('product',product); fixture.detectChanges();
    expect(selected.calls.mostRecent().args[0].id).toBe('test-v1');
    fixture.componentRef.setInput('product',{ ...product, variants: [{ ...product.variants[0], stock: 0 }] }); fixture.detectChanges();
    expect(selected.calls.mostRecent().args[0]).toBeNull();
  });
  it('muestra nombres/precios reales y mantiene el empaque gratuito separado del estándar', () => {
    const fixture = TestBed.createComponent(PackagingSelectorComponent);
    const options = productFixture().packagingOptions;
    fixture.componentRef.setInput('options',options); fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Empaque Alfa');
    expect(fixture.nativeElement.textContent).toContain('Empaque Beta');
    expect(fixture.nativeElement.querySelectorAll('mat-radio-button').length).toBe(3);
    const selection = jasmine.createSpy('selection'); fixture.componentInstance.selectedChange.subscribe(selection);
    fixture.componentInstance.choose('tipo/libre'); expect(selection).toHaveBeenCalledWith(options[0]);
    fixture.componentInstance.choose('gratuito'); expect(selection).toHaveBeenCalledWith(options[1]);
    fixture.componentInstance.choose(null); expect(selection).toHaveBeenCalledWith(null);
  });
});
