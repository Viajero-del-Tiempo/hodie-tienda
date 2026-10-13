import { Component, Input, OnChanges, OnDestroy, inject, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { DatePipe } from '@angular/common';
import { Subscription } from 'rxjs';
import { PaymentReceiptService } from '../../../../../core/services/payment-receipt.service';
import { PaymentReceipt } from '../../../../../core/models/payment-receipt.model';

@Component({ selector: 'app-order-receipts', standalone: true, imports: [DatePipe],
  templateUrl: './order-receipts.component.html', styleUrl: './order-receipts.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush })
export class OrderReceiptsComponent implements OnChanges, OnDestroy {
  @Input({ required: true }) orderId!: string;
  receipts: PaymentReceipt[] = [];
  loading = false;
  error = '';
  downloadingId: string | null = null;
  private api = inject(PaymentReceiptService);
  private cdr = inject(ChangeDetectorRef);
  private subscriptions = new Subscription();
  private listing?: Subscription;
  ngOnChanges() { this.load(); }
  load() {
    this.listing?.unsubscribe(); this.loading = true; this.error = ''; this.receipts = [];
    this.listing = this.api.list(this.orderId).subscribe({
      next: receipts => { this.receipts = receipts; this.loading = false; this.cdr.markForCheck(); },
      error: () => { this.loading = false; this.error = 'No se pudieron cargar los comprobantes.'; this.cdr.markForCheck(); },
    });
    this.subscriptions.add(this.listing);
  }
  download(receipt: PaymentReceipt) {
    if (this.downloadingId) return;
    this.downloadingId = receipt.id; this.error = '';
    this.subscriptions.add(this.api.download(this.orderId, receipt.id).subscribe({
      next: blob => {
        const url = URL.createObjectURL(blob);
        try { const link = document.createElement('a'); link.href = url; link.download = receipt.filename; link.click(); }
        finally { URL.revokeObjectURL(url); this.downloadingId = null; this.cdr.markForCheck(); }
      },
      error: () => { this.downloadingId = null; this.error = 'No se pudo descargar el comprobante. Revisá tu sesión e intentá de nuevo.'; this.cdr.markForCheck(); },
    }));
  }
  ngOnDestroy() { this.subscriptions.unsubscribe(); }
}
