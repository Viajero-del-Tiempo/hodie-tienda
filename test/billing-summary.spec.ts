import { TestBed } from '@angular/core/testing';
import { Clipboard } from '@angular/cdk/clipboard';
import { BillingSummaryComponent } from '../src/app/shared/components/billing-summary/billing-summary.component';
import { NotificationService } from '../src/app/core/services/notification.service';

describe('Facturación del pedido para el administrador', () => {
  it('muestra solicitud, datos copiables, discrepancia y distingue históricos de consumidor final', () => {
    const copy = jasmine.createSpy('copy').and.returnValue(true);
    TestBed.configureTestingModule({ providers: [{ provide: Clipboard, useValue: { copy } },
      { provide: NotificationService, useValue: jasmine.createSpyObj('Notice', ['showSuccess', 'showError']) }] });
    const fixture = TestBed.createComponent(BillingSummaryComponent);
    fixture.componentRef.setInput('allowCopy', true);
    fixture.componentRef.setInput('billing', { invoiceRequested: true, legalName: 'Persona Alfa', ruc: '1234567-8', rucValidation: { status: 'mismatch_confirmed', expectedDigit: 9 } });
    fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Solicita factura con RUC');
    expect(fixture.nativeElement.textContent).toContain('no coincide');
    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('button')); buttons[0].click(); buttons[1].click();
    expect(copy.calls.allArgs()).toEqual([['Persona Alfa'], ['1234567-8']]);
    fixture.componentRef.setInput('billing', null); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Datos de facturación no registrados');
    fixture.componentRef.setInput('billing', { invoiceRequested: false }); fixture.detectChanges(); expect(fixture.nativeElement.textContent).toContain('Consumidor final');
  });
});
