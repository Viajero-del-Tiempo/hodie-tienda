import { ChangeDetectorRef, Component, OnInit, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { firstValueFrom } from 'rxjs';
import { AdminCatalogService } from '@core/services/admin-catalog.service';
import { AdminProduct, CatalogFailure } from '@core/models/admin-catalog.model';
import { Category } from '@core/models/catalog.model';
import { GuaraniPipe } from '@core/pipes/guarani.pipe';
import { failureMessage } from '../../catalog-editor.util';

@Component({ selector: 'app-product-list', standalone: true, imports: [RouterLink, GuaraniPipe],
  templateUrl: './product-list.component.html', styleUrl: '../../_catalog-panel.scss' })
export class ProductListComponent implements OnInit {
  private api = inject(AdminCatalogService); private cdr = inject(ChangeDetectorRef);
  products: AdminProduct[] = []; categories: Category[] = []; loading = false; error = ''; query = ''; categoryId = ''; state = '';
  busy = new Set<string>(); rowErrors: Record<string, string> = {};
  get filtered(): AdminProduct[] {
    const query = this.query.trim().toLocaleLowerCase();
    return this.products.filter(product => (!this.categoryId || product.categoryId === this.categoryId)
      && (!this.state || product.active === (this.state === 'active'))
      && (!query || [product.name, product.slug, ...product.variants.map(row => row.sku)].some(value => value.toLocaleLowerCase().includes(query))));
  }
  category(product: AdminProduct): string { return this.categories.find(row => row.id === product.categoryId)?.name ?? product.categoryId; }
  ngOnInit(): void { void this.load(); }
  async load(): Promise<void> {
    this.loading = true; this.error = '';
    try { [this.products, this.categories] = await Promise.all([firstValueFrom(this.api.getProducts()), firstValueFrom(this.api.getCategories())]); }
    catch (error) { this.error = failureMessage(error as CatalogFailure); }
    finally { this.loading = false; this.cdr.markForCheck(); }
  }
  filter(event: Event, field: 'query' | 'categoryId' | 'state'): void { this[field] = (event.target as HTMLInputElement).value; }
  async toggle(product: AdminProduct): Promise<void> {
    if (this.busy.has(product.id) || this.rowErrors[product.id]) return;
    this.busy.add(product.id); delete this.rowErrors[product.id];
    try {
      const saved = await firstValueFrom(this.api.setProductActive(product, !product.active));
      this.products = this.products.map(row => row.id === saved.id ? saved : row);
    } catch (error) { this.rowErrors[product.id] = failureMessage(error as CatalogFailure); }
    finally { this.busy.delete(product.id); this.cdr.markForCheck(); }
  }
  async refresh(product: AdminProduct): Promise<void> {
    if (this.busy.has(product.id)) return;
    this.busy.add(product.id);
    try {
      const latest = await firstValueFrom(this.api.getProduct(product.id));
      this.products = this.products.map(row => row.id === latest.id ? latest : row); delete this.rowErrors[product.id];
    } catch (error) { this.rowErrors[product.id] = failureMessage(error as CatalogFailure); }
    finally { this.busy.delete(product.id); this.cdr.markForCheck(); }
  }
}
