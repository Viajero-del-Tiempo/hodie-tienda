import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { switchMap, firstValueFrom, catchError, of } from 'rxjs';
import { OrderService } from '@core/services/order.service';
import { CustomerOrder } from '@core/models/order.model';
import { GuaraniPipe } from '@core/pipes/guarani.pipe';
import { StatusLabelPipe } from '@core/pipes/status-label.pipe';

@Component({ selector: 'app-customer-order-page', standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, GuaraniPipe, StatusLabelPipe],
  templateUrl: './customer-order-page.html',
  styles: ['.order { max-width: 850px; padding: 24px 16px 48px; margin: auto; } section, article { padding: 16px 0; border-bottom: 1px solid #ddd; overflow-wrap: anywhere; } img { max-width: 120px; }'] })
export class CustomerOrderPage implements OnInit {
  private service = inject(OrderService);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  order: CustomerOrder | null = null;
  loading = true;
  error = '';
  pdfError = '';
  downloading = false;
  ngOnInit(): void {
    this.route.paramMap.pipe(switchMap(params => {
      this.order = null; this.error = ''; this.loading = true;
      return this.service.getMyOrder(params.get('id') ?? '').pipe(catchError(failure => {
        this.error = failure.status === 404 ? 'Este pedido no está disponible.' : 'No pudimos cargar el pedido.';
        return of(null);
      }));
    }), takeUntilDestroyed(this.destroyRef)).subscribe({
      next: order => { this.order = order; this.loading = false; this.cdr.markForCheck(); },
      error: failure => { this.loading = false; this.error = failure.status === 404 ? 'Este pedido no está disponible.' : 'No pudimos cargar el pedido.'; this.cdr.markForCheck(); },
    });
  }
  async downloadPdf(): Promise<void> {
    if (!this.order || this.downloading) return;
    const order = this.order;
    this.downloading = true; this.pdfError = '';
    try {
      const blob = await firstValueFrom(this.service.getMyOrderPdf(order.id));
      const url = URL.createObjectURL(blob);
      try {
        const link = document.createElement('a'); link.href = url; link.download = 'pedido-' + order.orderNumber + '.pdf'; link.click();
      } finally { setTimeout(() => URL.revokeObjectURL(url), 1000); }
    } catch { this.pdfError = 'No pudimos descargar el resumen. Intentá nuevamente.'; }
    finally { this.downloading = false; this.cdr.markForCheck(); }
  }
}
