import { Component, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { BehaviorSubject, catchError, debounceTime, EMPTY, switchMap, tap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CatalogService } from '../../../core/services/catalog.service';
import { CatalogQuery, CatalogSort, Category, ProductSummary } from '../../../core/models/catalog.model';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card-component/product-card-component';

@Component({
  selector: 'app-product-list-page', standalone: true,
  imports: [CommonModule, FormsModule, MatPaginatorModule, MatSelectModule, MatFormFieldModule,
    MatInputModule, MatProgressSpinnerModule, ProductCardComponent],
  templateUrl: './product-list-page.html', styleUrls: ['./product-list-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductListPage implements OnInit {
  private catalog = inject(CatalogService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private requests = new BehaviorSubject<CatalogQuery>({ page: 1, pageSize: 12, sort: 'relevance' });
  products: ProductSummary[] = [];
  categories: Category[] = [];
  query = '';
  categoryId = '';
  sort: CatalogSort = 'relevance';
  pageIndex = 0;
  pageSize = 12;
  total = 0;
  isLoading = true;
  error = '';
  categoryError = '';

  ngOnInit(): void {
    this.catalog.getCategories().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: categories => { this.categories = categories; this.cdr.markForCheck(); },
      error: () => { this.categoryError = 'No se pudieron cargar las categorías.'; this.cdr.markForCheck(); },
    });
    this.requests.pipe(
      debounceTime(200),
      tap(() => { this.isLoading = true; this.error = ''; this.cdr.markForCheck(); }),
      switchMap(request => this.catalog.searchProducts(request).pipe(catchError(() => {
        this.isLoading = false; this.error = 'No se pudo cargar el catálogo. Intentá nuevamente.';
        this.cdr.markForCheck(); return EMPTY;
      }))), takeUntilDestroyed(this.destroyRef),
    ).subscribe(result => {
      this.products = result.products; this.total = result.total;
      this.isLoading = false; this.cdr.markForCheck();
    });
  }
  applyFilters(): void { this.pageIndex = 0; this.load(); }
  onPageChange(event: PageEvent): void { this.pageIndex = event.pageIndex; this.pageSize = event.pageSize; this.load(); }
  load(): void {
    this.requests.next({ query: this.query, categoryId: this.categoryId || undefined,
      sort: this.sort, page: this.pageIndex + 1, pageSize: this.pageSize });
  }
}
