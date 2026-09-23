import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, firstValueFrom } from 'rxjs';
import { Order } from '../models/order.model';
import { environment } from '../../../environments/environment';

export interface AdminOrdersResponse {
  success: boolean;
  orders: Order[];
}

export interface AdminOrderResponse {
  success: boolean;
  order: Order;
}

export interface CreateOrderResponse {
  success: boolean;
  message: string;
  orderNumber: string;
  orderId: string;
}

@Injectable({
  providedIn: 'root',
})
export class OrderService {
  private http = inject(HttpClient);
  private apiUrl = environment.whatsappApiUrl;

  private parseTimestamp(ts: any): any {
    if (!ts) return null;
    if (typeof ts.toDate === 'function') return ts;
    if (ts._seconds !== undefined) {
      const date = new Date(ts._seconds * 1000 + (ts._nanoseconds || 0) / 1000000);
      return {
        ...ts,
        toDate: () => date,
      };
    }
    if (typeof ts === 'string' || ts instanceof Date) {
      const date = new Date(ts);
      return {
        toDate: () => date,
      };
    }
    return ts;
  }

  /**
   * Obtiene todos los pedidos desde el backend Express (Admin).
   */
  getOrders(): Observable<Order[]> {
    return this.http
      .get<AdminOrdersResponse>(`${this.apiUrl}/admin/orders`)
      .pipe(
        map((res) =>
          (res.orders || []).map((o) => ({
            ...o,
            createdAt: this.parseTimestamp(o.createdAt),
            updatedAt: this.parseTimestamp(o.updatedAt),
          }))
        )
      );
  }

  /**
   * Obtiene un pedido por su ID desde el backend Express (Admin).
   */
  getOrder(id: string): Observable<Order | undefined> {
    return this.http
      .get<AdminOrderResponse>(`${this.apiUrl}/admin/orders/${id}`)
      .pipe(
        map((res) =>
          res.order
            ? {
                ...res.order,
                createdAt: this.parseTimestamp(res.order.createdAt),
                updatedAt: this.parseTimestamp(res.order.updatedAt),
              }
            : undefined
        )
      );
  }

  /**
   * Crea un nuevo pedido a través del backend Express.
   * El backend se encarga de:
   * - Validar datos del pedido
   * - Asignar orderNumber atómico y secuencial
   * - Persistir en Firestore mediante Admin SDK
   * - Generar comprobante PDFKit y enviarlo por WhatsApp
   */
  async createOrder(order: any): Promise<CreateOrderResponse> {
    return await firstValueFrom(
      this.http.post<CreateOrderResponse>(`${this.apiUrl}/orders/order/send`, order)
    );
  }

  /**
   * Actualiza el estado de un pedido en el backend Express (Admin).
   * El backend se encarga de:
   * - Validar transiciones permitidas (bloquea reactivación desde 'cancelled')
   * - Descontar stock atómicamente si pasa a 'paid'
   * - Restituir stock atómicamente si se revierte o cancela
   * - Notificar al cliente por WhatsApp
   */
  updateOrder(id: string, update: { status: string }): Observable<any> {
    return this.http.patch<any>(`${this.apiUrl}/admin/orders/${id}`, update);
  }
}
