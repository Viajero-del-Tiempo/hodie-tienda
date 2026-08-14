import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { Order } from '../models/order.model';

@Injectable({
  providedIn: 'root',
})
export class WhatsAppService {
  private http = inject(HttpClient);
  private whatsappApiUrl = environment.whatsappApiUrl;

  /**
   * Envía la información de un pedido por WhatsApp.
   */
  sendOrderByWhatsapp(order: Order): Observable<any> {
    return this.http.post<any>(`${this.whatsappApiUrl}/orders/order/send`, {
      ...order,
    });
  }

  /**
   * Actualiza el estado de un pedido y notifica por WhatsApp.
   */
  updateOrderStatusByWhatsapp(
    phone: string,
    status: string,
    amount: number | null,
  ): Observable<any> {
    return this.http.post<any>(`${this.whatsappApiUrl}/orders/order/status`, {
      phone,
      status,
      amount,
    });
  }
}
