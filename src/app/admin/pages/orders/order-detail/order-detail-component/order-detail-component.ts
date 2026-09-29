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
import { MatInputModule } from '@angular/material/input';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { GuaraniPipe } from '../../../../../core/pipes/guarani.pipe';
import { OrderService } from '@core/services/order.service';
import { Order, OrderStatus } from '@core/models/order.model';
import { NotificationService } from '@core/services/notification.service';
import { StatusLabelPipe } from '../../../../../core/pipes/status-label.pipe';

@Component({
  selector: 'app-order-detail',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    // Material
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatDividerModule,
    MatFormFieldModule,
    MatInputModule,
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

  editingItemIndex: number | null = null;
  customizationEditText: string = '';
  isSavingCustomization = false;

  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private orderService = inject(OrderService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);
  private orderSubscription: Subscription | undefined;
  private custSubscription: Subscription | undefined;

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

    this.orderSubscription = this.orderService
      .updateOrder(this.orderId, { status: this.selectedStatus })
      .subscribe({
        next: (res) => {
          this.notificationService.showSuccess(
            res.message || 'Estado del pedido actualizado correctamente'
          );
          if (this.order) {
            this.order.status = this.selectedStatus;
            this.cdr.markForCheck();
          }
        },
        error: (err) => {
          console.error('Error updating status:', err);
          const errorMsg =
            err.error?.error || 'Error al actualizar el estado del pedido';
          this.notificationService.showError(errorMsg);
          // Revertir el selector al estado actual del pedido
          if (this.order) {
            this.selectedStatus = this.order.status;
            this.cdr.markForCheck();
          }
        },
      });
  }

  startEditCustomization(index: number, currentText: string): void {
    this.editingItemIndex = index;
    this.customizationEditText = currentText || '';
    this.cdr.markForCheck();
  }

  cancelEditCustomization(): void {
    this.editingItemIndex = null;
    this.customizationEditText = '';
    this.cdr.markForCheck();
  }

  saveCustomization(index: number): void {
    if (!this.orderId || !this.order) return;
    this.isSavingCustomization = true;
    this.cdr.markForCheck();

    this.custSubscription = this.orderService
      .updateOrderCustomization(this.orderId, index, this.customizationEditText)
      .subscribe({
        next: (res) => {
          this.isSavingCustomization = false;
          this.notificationService.showSuccess(
            res.message || 'Personalización guardada exitosamente'
          );
          const currentOrder = this.order;
          if (res.order && currentOrder) {
            this.order = {
              ...currentOrder,
              ...res.order,
              createdAt: currentOrder.createdAt,
              updatedAt: currentOrder.updatedAt,
            };
          } else if (currentOrder && currentOrder.items[index]) {
            currentOrder.items[index].customization = this.customizationEditText.trim();
            currentOrder.items[index].customizationPending = false;
            currentOrder.customizationPending = currentOrder.items.some(
              (it) => it.customizationPending === true
            );
            this.order = { ...currentOrder };
          }
          this.editingItemIndex = null;
          this.customizationEditText = '';
          this.cdr.markForCheck();
        },
        error: (err) => {
          this.isSavingCustomization = false;
          console.error('Error saving customization:', err);
          const errorMsg =
            err.error?.error || 'Error al guardar la personalización';
          this.notificationService.showError(errorMsg);
          this.cdr.markForCheck();
        },
      });
  }

  ngOnDestroy(): void {
    if (this.orderSubscription) {
      this.orderSubscription.unsubscribe();
    }
    if (this.custSubscription) {
      this.custSubscription.unsubscribe();
    }
  }
}
