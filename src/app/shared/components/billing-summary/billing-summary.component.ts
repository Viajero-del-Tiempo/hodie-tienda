import { Component, Input, inject } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatButtonModule } from '@angular/material/button';
import { BillingSnapshot } from '@core/models/user.model';
import { NotificationService } from '@core/services/notification.service';

@Component({ selector: 'app-billing-summary', standalone: true, imports: [MatButtonModule],
  template: `<h2>Facturación</h2>
    @if (billing?.invoiceRequested) {
      <p><strong>Solicita factura con RUC</strong></p>
      <p>Razón social: {{ billing?.legalName }} @if (allowCopy) { <button matButton (click)="copy(billing?.legalName)">Copiar razón social</button> }</p>
      <p>RUC: {{ billing?.ruc }} @if (allowCopy) { <button matButton (click)="copy(billing?.ruc)">Copiar RUC</button> }</p>
      @if (billing?.rucValidation?.status === 'mismatch_confirmed') { <p>El cliente aceptó este RUC aunque su dígito verificador no coincide.</p> }
    } @else if (billing) { <p>Consumidor final.</p> } @else { <p>Datos de facturación no registrados.</p> }` })
export class BillingSummaryComponent {
  @Input() billing: BillingSnapshot | null | undefined;
  @Input() allowCopy = false;
  private clipboard = inject(Clipboard);
  private notifications = inject(NotificationService);
  copy(value?: string): void {
    if (!value) return;
    if (this.clipboard.copy(value)) this.notifications.showSuccess('Copiado.');
    else this.notifications.showError('No se pudo copiar. Seleccioná el dato para copiarlo.');
  }
}
