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
}
