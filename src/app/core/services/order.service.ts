import { inject, Injectable } from '@angular/core';
import {
  Firestore,
  collection,
  doc,
  getDoc,
  updateDoc,
  deleteDoc,
  getDocs,
  CollectionReference,
  Timestamp,
  setDoc,
} from '@angular/fire/firestore';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';
import { Order } from '../models/order.model';

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private firestore = inject(Firestore);
  private ordersCollectionRef = collection(
    this.firestore,
    'orders'
  ) as CollectionReference<Order>;

  /**
   * Obtiene todos los pedidos de Firestore.
   */
  getOrders(): Observable<Order[]> {
    return from(getDocs(this.ordersCollectionRef)).pipe(
      map((snapshot) => {
        return snapshot.docs.map((doc) => {
          return { ...(doc.data() as Order), id: doc.id };
        });
      }),
    );
  }

  /**
   * Obtiene un pedido por su ID y retorna un Observable.
   */
  getOrder(id: string): Observable<Order | undefined> {
    const orderDocRef = doc(this.firestore, `orders/${id}`);
    return from(getDoc(orderDocRef)).pipe(
      map((docSnap) => {
        if (docSnap.exists()) {
          return { ...(docSnap.data() as Order), id: docSnap.id };
        } else {
          return undefined;
        }
      }),
    );
  }

  /**
   * Crea un nuevo pedido en Firestore.
   */
  async createOrder(order: Omit<Order, 'id' | 'createdAt' | 'updatedAt'>): Promise<Order> {
    const newId = doc(this.ordersCollectionRef).id;
    const orderDocRef = doc(this.firestore, `orders/${newId}`);

    const newOrder: Order = {
      ...order,
      id: newId,
      createdAt: Timestamp.fromDate(new Date()),
      updatedAt: Timestamp.fromDate(new Date()),
    };

    await setDoc(orderDocRef, newOrder);
    return newOrder;
  }

  /**
   * Actualiza un pedido en Firestore.
   */
  async updateOrder(
    id: string,
    order: Partial<Omit<Order, 'id' | 'createdAt'>>
  ): Promise<void> {
    const orderDocRef = doc(this.firestore, `orders/${id}`);
    const updatedOrder = {
      ...order,
      updatedAt: Timestamp.fromDate(new Date()),
    };
    await updateDoc(orderDocRef, updatedOrder);
  }

  /**
   * Elimina un pedido de Firestore.
   */
  async deleteOrder(id: string): Promise<void> {
    const orderDocRef = doc(this.firestore, `orders/${id}`);
    await deleteDoc(orderDocRef);
  }
}
