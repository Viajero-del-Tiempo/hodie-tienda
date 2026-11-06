import { TestBed, fakeAsync, flushMicrotasks } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { AgentConfigFormComponent } from '../src/app/admin/pages/policies/agent-config-form.component';
import { AdminCatalogService } from '../src/app/core/services/admin-catalog.service';

describe('Configuración propia del agente', () => {
  let api: jasmine.SpyObj<AdminCatalogService>;
  beforeEach(() => {
    api = jasmine.createSpyObj('AdminCatalog', ['getAgentConfig', 'saveAgentConfig']);
    api.getAgentConfig.and.returnValue(of({ corporateQuantityThreshold: 12, version: '1' }));
    api.saveAgentConfig.and.returnValue(of({ corporateQuantityThreshold: 15, version: '2' }));
    TestBed.configureTestingModule({ imports: [AgentConfigFormComponent], providers: [{ provide: AdminCatalogService, useValue: api }] });
  });
  it('carga el valor vigente sin default comercial y guarda desde su formulario', fakeAsync(() => {
    const f = TestBed.createComponent(AgentConfigFormComponent); f.detectChanges(); flushMicrotasks(); f.detectChanges();
    const page = f.componentInstance; expect(page.form.getRawValue().corporateQuantityThreshold).toBe(12);
    page.form.controls.corporateQuantityThreshold.setValue(15); void page.save(); flushMicrotasks();
    expect(api.saveAgentConfig).toHaveBeenCalledWith(15, '1'); expect(page.version).toBe('2');
    expect(f.nativeElement.querySelector('input').min).toBe('1');
  }));
  it('sin configuración queda vacío; cero, negativos y fracciones señalan el campo y no se envían', fakeAsync(() => {
    api.getAgentConfig.and.returnValue(of(null));
    const f = TestBed.createComponent(AgentConfigFormComponent); f.detectChanges(); flushMicrotasks();
    const page = f.componentInstance; expect(page.form.getRawValue().corporateQuantityThreshold).toBeNull();
    for (const value of [null, 0, -1, 1.5]) {
      page.form.controls.corporateQuantityThreshold.setValue(value); void page.save(); flushMicrotasks(); f.detectChanges();
      expect(api.saveAgentConfig).not.toHaveBeenCalled(); expect(f.nativeElement.querySelector('#agent-threshold-error').textContent.trim()).not.toBe('');
    }
    page.form.controls.corporateQuantityThreshold.setValue(9); void page.save(); flushMicrotasks();
    expect(api.saveAgentConfig).toHaveBeenCalledWith(9, null);
  }));
  it('400 junto al campo conserva borrador y se limpia al cambiar el valor', fakeAsync(() => {
    const f = TestBed.createComponent(AgentConfigFormComponent); f.detectChanges(); flushMicrotasks();
    const page = f.componentInstance; page.form.controls.corporateQuantityThreshold.setValue(15);
    api.saveAgentConfig.and.returnValue(throwError(() => ({ status: 400, error: { field: 'corporateQuantityThreshold', error: 'Revisá este umbral.' } })));
    void page.save(); flushMicrotasks(); f.detectChanges();
    expect(page.form.getRawValue().corporateQuantityThreshold).toBe(15);
    expect(f.nativeElement.querySelector('#agent-threshold-error').textContent).toContain('Revisá este umbral.');
    page.form.controls.corporateQuantityThreshold.setValue(16); expect(page.form.controls.corporateQuantityThreshold.hasError('server')).toBeFalse();
  }));
  it('409 explica el cambio, impide reintentar a ciegas y recarga sin perder el borrador', fakeAsync(() => {
    const f = TestBed.createComponent(AgentConfigFormComponent); f.detectChanges(); flushMicrotasks();
    const page = f.componentInstance; page.form.controls.corporateQuantityThreshold.setValue(15);
    api.saveAgentConfig.and.returnValue(throwError(() => ({ status: 409, error: { field: 'corporateQuantityThreshold', error: 'El umbral cambió a 20.' } })));
    void page.save(); flushMicrotasks(); f.detectChanges(); expect(page.conflict).toBeTrue();
    expect(f.nativeElement.textContent).toContain('El umbral cambió a 20.');
    void page.save(); flushMicrotasks(); expect(api.saveAgentConfig).toHaveBeenCalledTimes(1);
    api.getAgentConfig.and.returnValue(of({ corporateQuantityThreshold: 20, version: '2' }));
    void page.load(true); flushMicrotasks(); f.detectChanges();
    expect(page.form.getRawValue().corporateQuantityThreshold).toBe(15); expect(page.version).toBe('2');
    expect(page.form.valid).toBeTrue();
    expect(f.nativeElement.textContent).toContain('El umbral vigente es 20');
    page.form.controls.corporateQuantityThreshold.setValue(16);
    api.saveAgentConfig.and.returnValue(of({ corporateQuantityThreshold: 16, version: '3' }));
    void page.save(); flushMicrotasks(); expect(api.saveAgentConfig).toHaveBeenCalledWith(16, '2');
  }));
});
