import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { firstValueFrom } from 'rxjs';
import { OrderService } from '@core/services/order.service';
import { CustomerOrderSummary } from '@core/models/order.model';
import { StatusLabelPipe } from '@core/pipes/status-label.pipe';
import { GuaraniPipe } from '@core/pipes/guarani.pipe';

@Component({ selector: 'app-customer-orders-page', standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, GuaraniPipe, StatusLabelPipe],
  template: `<div class="orders"><h1>Mis pedidos</h1><a matButton routerLink="/profile">Mi perfil</a>
    @if (error) { <p role="alert">{{ error }}</p><button matButton (click)="load()">Reintentar</button> }
    @for (order of orders; track order.id) {
      <article><h2><a [routerLink]="['/profile/orders', order.id]">Pedido {{ order.orderNumber }}</a></h2>
        <p>{{ order.createdAt | date:'dd/MM/yyyy HH:mm' }} — {{ order.status | statusLabel }}</p><p>{{ order.total | guarani }}</p>
      </article>
    }
    @if (loading) { <p role="status">Cargando pedidos…</p> }
    @else if (loaded && !orders.length && !nextCursor && !error) { <p>Todavía no tenés pedidos para mostrar.</p><a matButton routerLink="/store">Ir al catálogo</a> }
    @if (nextCursor && !loading) { <button matButton (click)="load()">Ver más pedidos</button> }
  </div>`,
  styles: ['.orders { max-width: 850px; padding: 24px 16px 48px; margin: auto; } article { padding: 12px 0; border-bottom: 1px solid #ddd; }'] })
export class CustomerOrdersPage implements OnInit {
  private service = inject(OrderService);
  private cdr = inject(ChangeDetectorRef);
  orders: CustomerOrderSummary[] = [];
  nextCursor: string | null = null;
  loading = false;
  loaded = false;
  error = '';
  ngOnInit(): void { void this.load(); }
  async load(): Promise<void> {
    if (this.loading || (this.loaded && !this.nextCursor && !this.error)) return;
    this.loading = true; this.error = '';
    try {
      // La API puede devolver páginas vacías por históricos ocultos. Continuamos
      // por el cursor sin perder la paginación ni consultar pedidos ajenos.
      let cursor = this.nextCursor;
      let emptyPages = 0;
      do {
        const page = await firstValueFrom(this.service.getMyOrders(cursor ?? undefined));
        const known = new Set(this.orders.map(order => order.id));
        this.orders.push(...page.orders.filter(order => !known.has(order.id)));
        this.nextCursor = page.nextCursor; this.loaded = true;
        if (page.orders.length || !page.nextCursor) break;
        cursor = page.nextCursor;
      } while (++emptyPages < 5);
    } catch { this.error = 'No pudimos cargar tus pedidos. Intentá nuevamente.'; }
    finally { this.loading = false; this.cdr.markForCheck(); }
  }
}
