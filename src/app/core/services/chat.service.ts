import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface HandoffChat {
  thread_id: string;
  whatsappChatId: string;
  userPhoneNumber: string;
  motivo: string;
  fecha: string;
  lastCustomerMessage?: string;
}

export interface HandoffChatsResponse {
  success: boolean;
  count: number;
  chats: HandoffChat[];
}

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private http = inject(HttpClient);
  private apiUrl = environment.whatsappApiUrl;

  /**
   * Obtiene la lista de hilos en atención humana desde el backend Express (Admin).
   */
  getHandoffChats(): Observable<HandoffChat[]> {
    return this.http
      .get<HandoffChatsResponse>(`${this.apiUrl}/admin/chats/handoff`)
      .pipe(map((res) => res.chats || []));
  }

  /**
   * Reactiva el bot para un hilo en atención humana.
   */
  resumeBot(threadId: string): Observable<any> {
    return this.http.post<any>(
      `${this.apiUrl}/admin/chats/${encodeURIComponent(threadId)}/resume-bot`,
      {}
    );
  }
}
