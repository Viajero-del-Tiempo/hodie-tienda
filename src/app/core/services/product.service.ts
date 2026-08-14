import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  CollectionReference,
  Timestamp,
  runTransaction,
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Product } from '../models/product.model';
import { Order } from '../models/order.model';

@Injectable({
  providedIn: 'root',
})
export class ProductService {
  private firestore = inject(Firestore);
  private productsCollectionRef = collection(
    this.firestore,
    'products'
  ) as CollectionReference<Product>;

  /**
   * Obtiene todos los productos de Firestore.
   */
  getProducts(): Observable<Product[]> {
    return from(getDocs(this.productsCollectionRef)).pipe(
      map((snapshot) => {
        return snapshot.docs.map((doc) => {
          return { ...(doc.data() as Product), id: doc.id };
        });
      }),
    );
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
   * Obtiene un producto por su ID.
   */
  async getProduct(id: string): Promise<Product | undefined> {
    const productDocRef = doc(this.firestore, `products/${id}`);
    const docSnap = await getDoc(productDocRef);
    if (docSnap.exists()) {
      return { ...(docSnap.data() as Product), id: docSnap.id };
    }
    return undefined;
  }

  /**
   * Agrega un nuevo producto a Firestore.
   */
  async addProduct(product: Omit<Product, 'id' | 'createdAt' | 'updatedAt'>): Promise<void> {
    const newProduct: Omit<Product, 'id'> = {
      ...product,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    };
    await addDoc(this.productsCollectionRef, newProduct);
  }

  /**
   * Actualiza un producto existente en Firestore.
   */
  async updateProduct(
    id: string,
    product: Partial<Omit<Product, 'id' | 'createdAt'>>,
  ): Promise<void> {
    const productDocRef = doc(this.firestore, `products/${id}`);
    const updatedProduct: Partial<Omit<Product, 'id'>> = {
      ...product,
      updatedAt: Timestamp.fromDate(new Date()),
    };
    await updateDoc(productDocRef, updatedProduct);
  }

  /**
   * Elimina un producto de Firestore por su ID.
   */
  async deleteProduct(id: string): Promise<void> {
    const productDocRef = doc(this.firestore, `products/${id}`);
    await deleteDoc(productDocRef);
  }

  /**
   * Descuenta el stock de los productos de un pedido.
   * Utiliza una transacción para asegurar la atomicidad.
   */
  async deductStockForOrder(order: Order): Promise<void> {
    try {
      await runTransaction(this.firestore, async (transaction) => {
        const quantityByProduct = new Map<string, number>();

        for (const item of order.items) {
          const currentQty = quantityByProduct.get(item.productId) || 0;
          quantityByProduct.set(item.productId, currentQty + Number(item.quantity));
        }

        const productReads = [];
        for (const [productId, totalQty] of quantityByProduct.entries()) {
          const productRef = doc(this.firestore, `products/${productId}`);
          productReads.push({
            productId,
            totalQty,
            ref: productRef,
            snapshotPromise: transaction.get(productRef),
          });
        }

        const results = await Promise.all(
          productReads.map(async (p) => ({
            ...p,
            snapshot: await p.snapshotPromise,
          })),
        );

        for (const res of results) {
          if (!res.snapshot.exists()) {
            throw new Error(`Producto con ID: ${res.productId} no encontrado.`);
          }

          const data = res.snapshot.data();
          const currentStock = Number(data['stock'] || 0);
          const quantityToDeduct = res.totalQty;
          const newStock = currentStock - quantityToDeduct;

          if (newStock < 0) {
            const productName = data['name'] || res.productId;
            throw new Error(
              `Stock insuficiente para ${productName}. Stock actual: ${currentStock}, Solicitado: ${quantityToDeduct}`,
            );
          }

          transaction.update(res.ref, { stock: newStock });
        }
      });
      console.log('Stock descontado correctamente para el pedido', order.id);
    } catch (error) {
      console.error('Error al descontar stock:', error);
      throw error;
    }
  }
}
