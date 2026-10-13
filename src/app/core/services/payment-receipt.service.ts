import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PaymentReceipt } from '../models/payment-receipt.model';

@Injectable({ providedIn: 'root' })
export class PaymentReceiptService {
  private http = inject(HttpClient);
  private url(orderId: string) { return `${environment.whatsappApiUrl}/admin/orders/${encodeURIComponent(orderId)}/receipts`; }
  list(orderId: string) { return this.http.get<{ receipts: PaymentReceipt[] }>(this.url(orderId)).pipe(map(value => value.receipts)); }
  download(orderId: string, id: string) {
    return this.http.get(`${this.url(orderId)}/${encodeURIComponent(id)}/download`, { responseType: 'blob' });
  }
}
