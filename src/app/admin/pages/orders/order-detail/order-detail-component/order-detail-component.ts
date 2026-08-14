import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  inject,
  ChangeDetectorRef,
  OnDestroy,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';

// --- MÓDULOS DE ANGULAR MATERIAL ---
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GuaraniPipe } from '../../../../../core/pipes/guarani.pipe';
import { ProductService } from '@core/services/product.service';
import { OrderService } from '@core/services/order.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { Order, OrderStatus } from '@core/models/order.model';
import { NotificationService } from '@core/services/notification.service';
import { StatusLabelPipe } from '../../../../../core/pipes/status-label.pipe';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    // Material
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatDividerModule,
    MatFormFieldModule,
    MatSelectModule,
    MatTooltipModule,
    GuaraniPipe,
    StatusLabelPipe,
  ],
  templateUrl: './order-detail-component.html',
  styleUrls: ['./order-detail-component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderDetailComponent implements OnInit, OnDestroy {
  orderId: string | null = null;
  order: Order | null = null;
  orderStatuses = Object.values(OrderStatus);
  selectedStatus: OrderStatus = OrderStatus.Pending;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private productService = inject(ProductService);
  private orderService = inject(OrderService);
  private whatsappService = inject(WhatsAppService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private orderSubscription: Subscription | undefined;
  private whatsappSubscription: Subscription | undefined;

  ngOnInit(): void {
    this.orderId = this.route.snapshot.paramMap.get('id');
    if (this.orderId) {
      this.loadOrder(this.orderId);
    }
  }

  loadOrder(id: string): void {
    this.orderSubscription = this.orderService.getOrder(id).subscribe({
      next: (order) => {
        if (order) {
          this.order = order;
          this.selectedStatus = order.status;
          this.cdr.markForCheck();
        } else {
          this.notificationService.showError('Pedido no encontrado');
          this.goBack();
        }
      },
      error: (err) => {
        console.error('Error loading order:', err);
        this.notificationService.showError('Error al cargar el pedido');
        this.goBack();
      },
    });
  }

  goBack(): void {
    this.router.navigate(['/admin/orders']);
  }

  updateStatus(): void {
    if (!this.order || !this.orderId) return;

    // Verificar si el estado cambia a "Pagado" y no estaba ya pagado
    // Asumimos que 'paid' es el valor para OrderStatus.Paid, ajusta según tu enum
    const isPaying =
      this.selectedStatus === OrderStatus.Paid && this.order.status !== OrderStatus.Paid;

    const updatePromise = async () => {
      if (isPaying) {
        try {
          await this.productService.deductStockForOrder(this.order!);
          this.notificationService.showSuccess('Stock descontado correctamente');
        } catch (error) {
          this.notificationService.showError(
            'Error al descontar stock. No se actualizó el estado.'
          );
          throw error; // Detener la actualización del estado si falla el stock
        }
      }

      await this.orderService.updateOrder(this.orderId!, { status: this.selectedStatus });
    };

    updatePromise()
      .then(() => {
        this.notificationService.showSuccess('Estado actualizado correctamente');

        // Actualizar el objeto local para reflejar el cambio
        if (this.order) {
          this.order.status = this.selectedStatus;
          this.cdr.markForCheck();
        }

        // Actualizar estado por WhatsApp
        if (this.order?.userPhoneNumber) {
          this.whatsappSubscription = this.whatsappService
            .updateOrderStatusByWhatsapp(
              this.order.userPhoneNumber,
              this.selectedStatus,
              this.order.total
            )
            .subscribe({
              next: () => console.log('WhatsApp status updated'),
              error: (err) => console.error('Error updating WhatsApp status', err),
            });
        }
      })
      .catch((err) => {
        console.error('Error updating status:', err);
        // El error específico de stock ya mostró una notificación
        if (!isPaying) {
          this.notificationService.showError('Error al actualizar el estado');
        }
      });
  }

  ngOnDestroy(): void {
    if (this.orderSubscription) {
      this.orderSubscription.unsubscribe();
    }
    if (this.whatsappSubscription) {
      this.whatsappSubscription.unsubscribe();
    }
  }
}
