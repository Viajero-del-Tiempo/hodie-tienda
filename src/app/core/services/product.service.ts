import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  getDocs,
  CollectionReference,
} from '@angular/fire/firestore';
import { Observable, from, firstValueFrom } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { environment } from '../../../environments/environment';

export interface AdminProductsResponse {
  success: boolean;
  products: Product[];
}

export interface AdminProductResponse {
  success: boolean;
  product: Product;
}

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private firestore = inject(Firestore);
  private http = inject(HttpClient);
  private apiUrl = environment.whatsappApiUrl;

  private productsCollectionRef = collection(
    this.firestore,
    'products'
  ) as CollectionReference<Product>;

  /**
   * Obtiene todos los productos ACTIVOS de Firestore para la tienda pública.
   * Filtra productos que hayan sido desactivados (soft-deleted).
   */
  getProducts(): Observable<Product[]> {
    return from(getDocs(this.productsCollectionRef)).pipe(
      map((snapshot) => {
        return snapshot.docs
          .map((doc) => ({ ...(doc.data() as Product), id: doc.id }))
          .filter((product) => product.active !== false);
      }),
    );
  }

  /**
   * Obtiene la lista completa de productos para el panel de administración
   * (incluyendo productos activos y desactivados).
   */
  getAdminProducts(): Observable<Product[]> {
    return this.http
      .get<AdminProductsResponse>(`${this.apiUrl}/admin/products`)
      .pipe(map((res) => res.products || []));
  }

  /**
   * Obtiene un producto por su ID y retorna un Observable.
   */
  getProductById(id: string): Observable<Product> {
    const productDocRef = doc(this.firestore, `products/${id}`);
    return from(getDoc(productDocRef)).pipe(
      map((docSnap) => {
        if (docSnap.exists()) {
          return { ...(docSnap.data() as Product), id: docSnap.id };
        } else {
          throw new Error(`Producto con id ${id} no encontrado.`);
        }
      }),
    );
  }

  /**
   * Obtiene un producto por su ID desde el backend (Admin).
   */
  async getProduct(id: string): Promise<Product | undefined> {
    try {
      const res = await firstValueFrom(
        this.http.get<AdminProductResponse>(`${this.apiUrl}/admin/products/${id}`)
      );
      return res.product;
    } catch {
      // Fallback a Firestore directo si la API da 404
      const productDocRef = doc(this.firestore, `products/${id}`);
      const docSnap = await getDoc(productDocRef);
      if (docSnap.exists()) {
        return { ...(docSnap.data() as Product), id: docSnap.id };
      }
      return undefined;
    }
  }

  /**
   * Agrega un nuevo producto a través de la API de Node.js (Admin SDK).
   * Valida en el backend tipos, stock y las claves válidas de packagingPrices.
   */
  async addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiUrl}/admin/products`, product));
  }

  /**
   * Actualiza un producto existente a través de la API de Node.js.
   */
  async updateProduct(
    id: string,
    product: Partial<Omit<Product, 'id' | 'createdAt'>>,
  ): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiUrl}/admin/products/${id}`, product));
  }

  /**
   * Desactiva un producto (soft-delete) a través de la API de Node.js.
   * Si se requiere borrado físico definitivo, enviar force: true.
   */
  async deleteProduct(id: string, force = false): Promise<void> {
    const url = force
      ? `${this.apiUrl}/admin/products/${id}?force=true`
      : `${this.apiUrl}/admin/products/${id}`;
    await firstValueFrom(this.http.delete(url));
  }

  /**
   * Reactiva un producto previamente desactivado en el catálogo.
   */
  async reactivateProduct(id: string): Promise<void> {
    await firstValueFrom(this.http.patch(`${this.apiUrl}/admin/products/${id}/reactivate`, {}));
  }
}
