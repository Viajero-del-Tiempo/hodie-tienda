import {
  Component,
  AfterViewInit,
  ViewChild,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  OnInit,
  OnDestroy,
  inject,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import {
  PageEvent,
  MatPaginator,
  MatPaginatorModule,
} from '@angular/material/paginator';
import { MatTableDataSource } from '@angular/material/table'; // Usado para el filtro
import { MatSelectChange, MatSelectModule } from '@angular/material/select';
import { MatRadioChange, MatRadioModule } from '@angular/material/radio';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDividerModule } from '@angular/material/divider';
import { MatToolbarModule } from '@angular/material/toolbar';

//-- Components
import { ProductCardComponent } from '../../../shared/components/product-card/product-card-component/product-card-component';

//-- Services
import { ProductService } from '../../../core/services/product.service';

//-- Models
import { Product } from '../../../core/models/product.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-product-list-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatPaginatorModule,
    MatSelectModule,
    MatRadioModule,
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatDividerModule,
    MatToolbarModule,
    ProductCardComponent,
  ],
  templateUrl: './product-list-page.html',
  styleUrls: ['./product-list-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListPage implements OnInit, AfterViewInit, OnDestroy {
  // --- Propiedades de Paginación ---
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  // --- Propiedades de Datos ---
  private allProducts: Product[] = [];
  // DataSource se usa para el filtrado y paginación
  dataSource = new MatTableDataSource<Product>(this.allProducts);
  // Esta es la lista que se renderiza (la página actual)
  paginatedProducts: Product[] = [];

  // --- Propiedades de Filtros ---
  private currentSearchTerm = '';
  private currentSort = 'default';

  //-- Services
  private _productService = inject(ProductService);
  private _cdr = inject(ChangeDetectorRef);

  //-- Subscriptions
  private productsSubscription: Subscription | undefined;

  ngOnInit(): void {
    this.loadProducts();
  }

  ngAfterViewInit() {
    // Conecta el paginador al DataSource
    this.dataSource.paginator = this.paginator;
    // Carga la primera página
    this.updatePaginatedProducts();
    // Forzamos la detección de cambios
    this._cdr.detectChanges();
  }

  /**
   * Se llama cada vez que cambia la página
   */
  onPageChange(event: PageEvent) {
    this.updatePaginatedProducts();
  }

  /**
   * Corta el array de productos filtrados según el paginador
   */
  updatePaginatedProducts() {
    if (this.dataSource.paginator) {
      const startIndex =
        this.dataSource.paginator.pageIndex *
        this.dataSource.paginator.pageSize;
      const endIndex = startIndex + this.dataSource.paginator.pageSize;
      this.paginatedProducts = this.dataSource.filteredData.slice(
        startIndex,
        endIndex
      );
    } else {
      // Fallback si el paginador no está listo
      this.paginatedProducts = this.dataSource.filteredData.slice(0, 12);
    }
  }

  // --- MÉTODOS DE FILTRADO ---

  applyTextFilter(event: Event) {
    this.currentSearchTerm = (event.target as HTMLInputElement).value;
    this.applyAllFilters();
  }

  applySort(event: MatSelectChange) {
    this.currentSort = event.value;
    this.applyAllFilters();
  }

  /**
   * Orquestador central de filtros.
   * Filtra, luego ordena, luego pagina.
   */
  applyAllFilters() {
    let filteredData = this.allProducts;

    // 1. Filtrar por Búsqueda
    if (this.currentSearchTerm) {
      const filterValue = this.currentSearchTerm.trim().toLowerCase();
      filteredData = filteredData.filter((p) =>
        p.name.toLowerCase().includes(filterValue)
      );
    }

    // 2. Ordenar
    switch (this.currentSort) {
      case 'price-asc':
        filteredData.sort((a, b) => a.price - b.price);
        break;
      case 'price-desc':
        filteredData.sort((a, b) => b.price - a.price);
        break;
      case 'name-asc':
        filteredData.sort((a, b) => a.name.localeCompare(b.name));
        break;
    }

    // 3. Actualizar DataSource y paginar
    this.dataSource.data = filteredData;

    // Volver a la primera página si hay filtros
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
    this.updatePaginatedProducts();
  }

  private loadProducts(): void {
    this.productsSubscription = this._productService.getProducts().subscribe({
      next: (products) => {
        this.allProducts = products;
        this.dataSource.data = products;
        this.updatePaginatedProducts();
        this._cdr.markForCheck();
      },
      error: (error) => {
        console.error('Error fetching products:', error);
      },
    });
  }

  ngOnDestroy(): void {
    if (this.productsSubscription) {
      this.productsSubscription.unsubscribe();
    }
  }
}
