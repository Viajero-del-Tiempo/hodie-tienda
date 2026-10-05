import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CatalogPage, CatalogProduct, CatalogQuery, Category } from '../models/catalog.model';

@Injectable({ providedIn: 'root' })
export class CatalogService {
  private http = inject(HttpClient);
  private url = `${environment.whatsappApiUrl}/catalog`;

  getCategories(): Observable<Category[]> {
    return this.http.get<{ categories: Category[] }>(`${this.url}/categories`).pipe(map(res => res.categories));
  }

  searchProducts(query: CatalogQuery = {}): Observable<CatalogPage> {
    let params = new HttpParams();
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== '') params = params.set(key, String(value));
    }
    return this.http.get<CatalogPage>(`${this.url}/products`, { params });
  }

  getProductBySlug(slug: string): Observable<CatalogProduct> {
    return this.http.get<{ product: CatalogProduct }>(`${this.url}/products/by-slug/${encodeURIComponent(slug)}`)
      .pipe(map(res => res.product));
  }

  getProductById(id: string): Observable<CatalogProduct> {
    return this.http.get<{ product: CatalogProduct }>(`${this.url}/products/${encodeURIComponent(id)}`)
      .pipe(map(res => res.product));
  }
}
