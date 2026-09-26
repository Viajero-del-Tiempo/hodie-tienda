import {
  Component,
  ViewChild,
  AfterViewInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  inject,
  OnDestroy,
} from '@angular/core';
import { Subscription } from 'rxjs';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// --- MÓDULOS DE ANGULAR MATERIAL ---
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { GuaraniPipe } from '../../../../../core/pipes/guarani.pipe';
import { OrderService } from '@core/services/order.service';
import { Order } from '@core/models/order.model';
import { StatusLabelPipe } from "../../../../../core/pipes/status-label.pipe";

@Component({
  selector: 'app-order-list',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    // Material
    MatTableModule,
    MatPaginatorModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatTooltipModule,
    GuaraniPipe,
    StatusLabelPipe
],
  templateUrl: './order-list-component.html',
  styleUrls: ['./order-list-component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class OrderListComponent implements OnInit, AfterViewInit, OnDestroy {
  // Columnas que se mostrarán en la tabla
  displayedColumns: string[] = ['orderNumber', 'customer', 'date', 'total', 'status', 'actions'];

  // DataSource que conecta la tabla con los datos
  dataSource: MatTableDataSource<Order>;

  // Referencias a los componentes de Paginación y Ordenamiento
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  @ViewChild(MatSort) sort!: MatSort;

  private orderService = inject(OrderService);
  private cdr = inject(ChangeDetectorRef);
  private ordersSubscription: Subscription | undefined;

  constructor() {
    // Inicializa el DataSource vacío
    this.dataSource = new MatTableDataSource<Order>([]);
  }

  ngOnInit(): void {
    this.loadOrders();
  }

  ngAfterViewInit() {
    // Conecta el paginador y el ordenamiento al DataSource
    this.dataSource.paginator = this.paginator;
    this.dataSource.sort = this.sort;
  }

  loadOrders(): void {
    this.ordersSubscription = this.orderService.getOrders().subscribe({
      next: (orders) => {
        this.dataSource.data = orders;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error loading orders:', err);
        this.cdr.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    if (this.ordersSubscription) {
      this.ordersSubscription.unsubscribe();
    }
  }

  /**
   * Aplica el filtro de búsqueda a la tabla.
   * @param event El evento del input (keyup)
   */
  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    // Si hay un filtro, vuelve a la primera página
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }
}
