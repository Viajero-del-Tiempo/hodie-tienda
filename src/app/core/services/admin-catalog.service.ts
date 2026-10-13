import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { from, map, Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AdminProduct, CatalogPolicy, ProductInput, AgentConfig } from '../models/admin-catalog.model';
import { Category } from '../models/catalog.model';

function readImage(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    if (!['image/jpeg', 'image/jpg', 'image/png', 'image/webp'].includes(file.type.toLowerCase())) {
      reject(new Error('Formatos admitidos: JPG, PNG y WEBP.')); return;
    }
    if (file.size > 10 * 1024 * 1024) { reject(new Error('La imagen supera el máximo de 10 MB.')); return; }
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('No pudimos leer la imagen. Intentá nuevamente.'));
    reader.onload = () => resolve(String(reader.result).split(',')[1]);
    reader.readAsDataURL(file);
  });
}

@Injectable({ providedIn: 'root' })
export class AdminCatalogService {
  private http = inject(HttpClient);
  private url = `${environment.whatsappApiUrl}/admin`;
  private path(collection: string, id: string): string { return `${this.url}/${collection}/${encodeURIComponent(id)}`; }
  getProducts(): Observable<AdminProduct[]> {
    return this.http.get<{ products: AdminProduct[] }>(`${this.url}/products`).pipe(map(res => res.products));
  }
  getProduct(id: string): Observable<AdminProduct> {
    return this.http.get<{ product: AdminProduct }>(this.path('products', id)).pipe(map(res => res.product));
  }
  createProduct(input: ProductInput): Observable<AdminProduct> {
    return this.http.post<{ product: AdminProduct }>(`${this.url}/products`, input).pipe(map(res => res.product));
  }
  updateProduct(id: string, input: ProductInput, version: string): Observable<AdminProduct> {
    return this.http.put<{ product: AdminProduct }>(this.path('products', id), { ...input, version }).pipe(map(res => res.product));
  }
  setProductActive(product: AdminProduct, active: boolean): Observable<AdminProduct> {
    const body = { version: product.version };
    const request = active
      ? this.http.patch<{ product: AdminProduct }>(this.path('products', product.id) + '/reactivate', body)
      : this.http.delete<{ product: AdminProduct }>(this.path('products', product.id), { body });
    return request.pipe(map(res => res.product));
  }
  getCategories(): Observable<Category[]> {
    return this.http.get<{ categories: Category[] }>(`${this.url}/categories`).pipe(map(res => res.categories));
  }
  saveCategory(input: Category, existingId?: string): Observable<Category> {
    const request = existingId
      ? this.http.put<{ category: Category }>(this.path('categories', existingId), input)
      : this.http.post<{ category: Category }>(`${this.url}/categories`, input);
    return request.pipe(map(res => res.category));
  }
  getPolicies(): Observable<CatalogPolicy[]> {
    return this.http.get<{ policies: CatalogPolicy[] }>(`${this.url}/policies`).pipe(map(res => res.policies));
  }
  getAgentConfig(): Observable<AgentConfig | null> {
    return this.http.get<{ config: AgentConfig | null }>(`${this.url}/agent-config`).pipe(map(res => res.config));
  }
  saveAgentConfig(corporateQuantityThreshold: number, version: string | null): Observable<AgentConfig> {
    return this.http.put<{ config: AgentConfig }>(`${this.url}/agent-config`, { corporateQuantityThreshold, version }).pipe(map(res => res.config));
  }
  savePolicy(input: CatalogPolicy, existingId?: string): Observable<CatalogPolicy> {
    const request = existingId
      ? this.http.put<{ policy: CatalogPolicy }>(this.path('policies', existingId), input)
      : this.http.post<{ policy: CatalogPolicy }>(`${this.url}/policies`, input);
    return request.pipe(map(res => res.policy));
  }
  uploadImage(file: File): Observable<string> {
    // La misma API autentica la subida y elige firma Cloudinary o archivo local.
    return from(readImage(file)).pipe(switchMap(base64 => this.http.post<{ imageUrl: string }>(`${this.url}/images`,
      { base64, mimetype: file.type })), map(res => res.imageUrl));
  }
}
