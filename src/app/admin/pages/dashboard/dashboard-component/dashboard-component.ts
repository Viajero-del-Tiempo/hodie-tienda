import {
  Component,
  ChangeDetectionStrategy,
  AfterViewInit,
  OnDestroy,
  OnInit,
  inject,
  ChangeDetectorRef,
  ViewChild,
  ElementRef,
} from '@angular/core';
import { CommonModule } from '@angular/common'; // Necesario para pipes
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout'; // Importar BreakpointObserver
import { Subscription } from 'rxjs';

// --- MÓDULOS DE ANGULAR MATERIAL ---
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatDividerModule } from '@angular/material/divider';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

// Importamos la librería y sus tipos desde NPM
import ApexCharts, { ApexOptions } from 'apexcharts';
import { GuaraniPipe } from '../../../../core/pipes/guarani.pipe';
import { OrderService } from '@core/services/order.service';
import { UserService } from '@core/services/user.service';
import { Order, OrderStatus } from '@core/models/order.model';
import { User } from '@core/models/user.model';
import { StatusLabelPipe } from '@core/pipes/status-label.pipe';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    CommonModule, // Necesario para los pipes 'currency' y 'lowercase'
    MatCardModule,
    MatIconModule,
    MatListModule,
    MatDividerModule,
    MatProgressSpinnerModule,
    GuaraniPipe,
    StatusLabelPipe,
  ],
  templateUrl: './dashboard-component.html',
  styleUrls: ['./dashboard-component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DashboardComponent implements AfterViewInit, OnDestroy, OnInit {
  @ViewChild('salesChartContainer') salesChartContainer!: ElementRef;
  @ViewChild('statusChartContainer') statusChartContainer!: ElementRef;

  // Instancias de los gráficos (para destruirlos luego)
  private salesChart: ApexCharts | null = null;
  private statusChart: ApexCharts | null = null;
  private breakpointSubscription: Subscription | null = null;
  private ordersSubscription: Subscription | null = null;
  private usersSubscription: Subscription | null = null;

  // --- 1. Datos de KPIs ---
  totalSales = 0;
  totalOrders = 0;
  newCustomers = 0;
  pendingOrders = 0;

  // --- 2. Datos para Lista de Pedidos Recientes (Hoy) ---
  recentOrders: Order[] = [];

  // Almacenar pedidos cargados para re-renderizar gráficos
  private loadedOrders: Order[] = [];

  private orderService = inject(OrderService);
  private userService = inject(UserService);
  private cdr = inject(ChangeDetectorRef);
  private breakpointObserver = inject(BreakpointObserver);
  now: Date = new Date();

  constructor() {}

  ngOnInit(): void {
    this.loadDashboardData();

    // Suscribirse a cambios de tamaño de pantalla
    this.breakpointSubscription = this.breakpointObserver
      .observe([Breakpoints.Handset, Breakpoints.Tablet]) // Celulares y Tablets en portrait
      .subscribe(() => {
        if (this.loadedOrders.length > 0) {
          this.renderSalesChart(this.loadedOrders);
        }
      });
  }

  ngAfterViewInit(): void {
    // Los gráficos se renderizarán después de cargar los datos
  }

  ngOnDestroy(): void {
    if (this.salesChart) {
      this.salesChart.destroy();
    }
    if (this.statusChart) {
      this.statusChart.destroy();
    }
    if (this.breakpointSubscription) {
      this.breakpointSubscription.unsubscribe();
    }
    if (this.ordersSubscription) {
      this.ordersSubscription.unsubscribe();
    }
    if (this.usersSubscription) {
      this.usersSubscription.unsubscribe();
    }
  }

  loadDashboardData(): void {
    // Cargar Pedidos
    this.ordersSubscription = this.orderService.getOrders().subscribe({
      next: (orders) => {
        this.loadedOrders = orders;
        this.calculateOrderKPIs(orders);
        this.renderSalesChart(orders);
        this.renderStatusChart(orders);
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Error loading orders', err),
    });

    // Cargar Usuarios
    this.usersSubscription = this.userService.getUsers().subscribe({
      next: (users) => {
        this.calculateUserKPIs(users);
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Error loading users', err),
    });
  }

  private calculateOrderKPIs(orders: Order[]): void {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    // Filtrar pedidos del mes actual
    const currentMonthOrders = orders.filter((o) => {
      const date = o.createdAt.toDate();
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    });

    this.totalOrders = currentMonthOrders.length;
    this.totalSales = currentMonthOrders.reduce((sum, o) => sum + o.total, 0);
    this.pendingOrders = orders.filter((o) => o.status === OrderStatus.Pending).length;

    // Pedidos de Hoy
    this.recentOrders = orders
      .filter((o) => {
        const date = o.createdAt.toDate();
        return (
          date.getDate() === now.getDate() &&
          date.getMonth() === currentMonth &&
          date.getFullYear() === currentYear
        );
      })
      .sort((a, b) => b.createdAt.toMillis() - a.createdAt.toMillis());
  }

  private calculateUserKPIs(users: User[]): void {
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();

    this.newCustomers = users.filter((u) => {
      const date = u.createdAt.toDate();
      return date.getMonth() === currentMonth && date.getFullYear() === currentYear;
    }).length;
  }

  /**
   * Renderiza el gráfico de líneas (Ventas del Mes)
   * Adaptable: Últimos 7 días en móvil, Mes completo en escritorio.
   */
  private renderSalesChart(orders: Order[]): void {
    const isMobile = this.breakpointObserver.isMatched([Breakpoints.Handset, Breakpoints.Tablet]);
    const now = new Date();
    let categories: string[] = [];
    let data: number[] = [];
    let chartTitle = '';

    if (isMobile) {
      // Últimos 7 días
      chartTitle = 'Ventas (Últimos 7 días)';
      data = new Array(7).fill(0);

      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(now.getDate() - i);
        categories.push(d.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' }));
      }

      // Filtrar y sumar pedidos de los últimos 7 días
      orders.forEach((o) => {
        const date = o.createdAt.toDate();
        // Buscar el índice en categories
        const dateStr = date.toLocaleDateString('es-ES', { day: '2-digit', month: '2-digit' });
        const index = categories.indexOf(dateStr);
        if (index !== -1) {
          data[index] += o.total;
        }
      });
    } else {
      // Mes completo actual
      chartTitle = `Ventas de ${now.toLocaleDateString('es-ES', { month: 'long' })}`;
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      data = new Array(daysInMonth).fill(0);

      for (let i = 1; i <= daysInMonth; i++) {
        categories.push(i.toString());
      }

      orders.forEach((o) => {
        const date = o.createdAt.toDate();
        if (date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear()) {
          const day = date.getDate();
          data[day - 1] += o.total;
        }
      });
    }

    const options: ApexOptions = {
      series: [{ name: 'Ventas', data: data }],
      chart: {
        type: 'area',
        height: 320,
        width: '100%',
        zoom: { enabled: false },
        toolbar: { show: false },
      },
      stroke: { curve: 'smooth', width: 3 },
      xaxis: { categories: categories, labels: { style: { fontFamily: 'Poppins, sans-serif' } } },
      yaxis: {
        labels: {
          formatter: (value: number) => {
            return new Intl.NumberFormat('es-PY', {
              style: 'currency',
              currency: 'PYG',
              maximumFractionDigits: 0,
            }).format(value);
          },
          style: { fontFamily: 'Poppins, sans-serif' },
        },
      },
      tooltip: {
        y: {
          formatter: (value: number) => {
            return new Intl.NumberFormat('es-PY', { style: 'currency', currency: 'PYG' }).format(
              value
            );
          },
        },
      },
      fill: {
        type: 'gradient',
        gradient: { shadeIntensity: 1, opacityFrom: 0.7, opacityTo: 0.1, stops: [0, 90, 100] },
      },
      dataLabels: { enabled: false },
      grid: { strokeDashArray: 4 },
      title: {
        text: chartTitle,
        align: 'left',
      },
    };

    if (this.salesChart) {
      this.salesChart.updateOptions(options);
    } else {
      const container = this.salesChartContainer?.nativeElement;
      if (container) {
        this.salesChart = new ApexCharts(container, options);
        this.salesChart.render();
      }
    }
  }

  /**
   * Renderiza el gráfico de dona (Estado de Pedidos Mes Actual)
   */
  private renderStatusChart(orders: Order[]): void {
    const now = new Date();
    // Filtrar solo pedidos del mes actual para el gráfico de estado
    const monthOrders = orders.filter((o) => {
      const date = o.createdAt.toDate();
      return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
    });

    const statusCounts = {
      [OrderStatus.Pending]: 0,
      [OrderStatus.Paid]: 0,
      [OrderStatus.Preparing]: 0, // Ajusta si tu enum tiene otros valores
      [OrderStatus.Shipped]: 0,
      [OrderStatus.Delivered]: 0,
      [OrderStatus.Cancelled]: 0,
    };

    monthOrders.forEach((o) => {
      if (statusCounts[o.status] !== undefined) {
        statusCounts[o.status]++;
      }
    });

    const series = Object.values(statusCounts);
    const labels = ['Pendiente', 'Pagado', 'Preparando', 'Enviado', 'Entregado', 'Cancelado'];
    const colors = ['#FFC107', '#22C55E', '#3B82F6', '#6366F1', '#15803D', '#EF4444']; // Colores de tu status-label

    const options: ApexOptions = {
      series: series,
      chart: { type: 'donut', height: 320, width: '100%' },
      labels: labels,
      colors: colors,
      legend: { position: 'bottom' },
      responsive: [
        { breakpoint: 600, options: { chart: { width: '100%' }, legend: { position: 'bottom' } } },
      ],
      title: {
        text: `Estados (${now.toLocaleDateString('es-ES', { month: 'long' })})`,
        align: 'left',
      },
    };

    if (this.statusChart) {
      this.statusChart.updateOptions(options);
    } else {
      const container = this.statusChartContainer?.nativeElement;
      if (container) {
        this.statusChart = new ApexCharts(container, options);
        this.statusChart.render();
      }
    }
  }
}
