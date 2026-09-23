import {
  Component,
  ViewChild,
  ChangeDetectionStrategy,
  OnInit,
  OnDestroy,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatDialog } from '@angular/material/dialog';

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
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner'; // Para el spinner de carga
import { GuaraniPipe } from '../../../../../core/pipes/guarani.pipe';

// --- SERVICIOS Y MODELOS ---
import { ProductService } from '../../../../../core/services/product.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { Product } from '../../../../../core/models/product.model'; // Importar el modelo real
import { Subscription } from 'rxjs';
import { ProductDetailDialogComponent } from '../product-detail-dialog/product-detail-dialog.component';

@Component({
  selector: 'app-product-list',
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
    MatProgressSpinnerModule, // Añadir el módulo de spinner
    GuaraniPipe,
  ],
  templateUrl: './product-list-component.html',
  styleUrls: ['./product-list-component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListComponent implements OnInit, OnDestroy {
  // Columnas a mostrar (incluye estado activo/desactivado)
  displayedColumns: string[] = ['image', 'name', 'price', 'stock', 'status', 'actions'];
  dataSource: MatTableDataSource<Product> = new MatTableDataSource<Product>();
  isLoading = false;
  private productsSubscription: Subscription | undefined;

  @ViewChild(MatPaginator) set paginator(paginator: MatPaginator) {
    if (paginator) {
      this.dataSource.paginator = paginator;
    }
  }

  @ViewChild(MatSort) set sort(sort: MatSort) {
    if (sort) {
      this.dataSource.sort = sort;
    }
  }

  constructor(
    private productService: ProductService, // Inyectar ProductService
    private notificationService: NotificationService, // Inyectar NotificationService
    private cdr: ChangeDetectorRef, // Inyectar ChangeDetectorRef
    private dialog: MatDialog
  ) {}

  ngOnInit() {
    this.loadProducts();
  }

  /**
   * Carga la lista completa de productos (activos e inactivos) desde la API de Express.
   */
  loadProducts(): void {
    this.isLoading = true;

    this.productsSubscription = this.productService.getAdminProducts().subscribe({
      next: (products) => {
        this.dataSource.data = products;
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error al cargar productos:', err);
        this.notificationService.showError('Error al cargar los productos.');
        this.isLoading = false;
        this.cdr.detectChanges();
      }
    });
  }

  applyFilter(event: Event) {
    const filterValue = (event.target as HTMLInputElement).value;
    this.dataSource.filter = filterValue.trim().toLowerCase();

    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  viewProductDetails(product: Product) {
    this.dialog.open(ProductDetailDialogComponent, {
      width: '600px',
      data: { product: product }
    });
  }

  /**
   * Desactiva un producto (soft-delete) a través del backend Express.
   */
  deleteProduct(id: string) {
    if (confirm('¿Estás seguro de que quieres desactivar este producto del catálogo?')) {
      this.productService
        .deleteProduct(id)
        .then(() => {
          this.notificationService.showSuccess('Producto desactivado correctamente.');
          this.loadProducts();
        })
        .catch((error) => {
          console.error('Error al desactivar producto:', error);
          this.notificationService.showError('Error al desactivar el producto.');
        });
    }
  }

  /**
   * Reactiva un producto previamente desactivado.
   */
  reactivateProduct(id: string) {
    this.productService
      .reactivateProduct(id)
      .then(() => {
        this.notificationService.showSuccess('Producto reactivado correctamente en el catálogo.');
        this.loadProducts();
      })
      .catch((error) => {
        console.error('Error al reactivar producto:', error);
        this.notificationService.showError('Error al reactivar el producto.');
      });
  }

  ngOnDestroy() {
    if (this.productsSubscription) {
      this.productsSubscription.unsubscribe();
    }
  }
}
