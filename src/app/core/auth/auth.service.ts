import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { catchError, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private http = inject(HttpClient);
  private whatsappApiUrl = environment.whatsappApiUrl;

  requestWhatsappCode(phone: string): Observable<any> {
    return this.http.post<any>(`${this.whatsappApiUrl}/auth/request`, {
      phone,
    });
  }

  verifyWhatsappCode(phone: string, code: string): Observable<any> {
    return this.http
      .post<any>(`${this.whatsappApiUrl}/auth/verify`, {
        phone,
        code,
      })
      .pipe(
        tap((response) => {
          if (response && response.token) {
            this.saveToken(response.token);
          }
        }),
        catchError((error: HttpErrorResponse) => {
          throw error.error;
        })
      );
  }

  private saveToken(token: string): void {
    localStorage.setItem('auth_token', token);
  }

  getToken(): string | null {
    return localStorage.getItem('auth_token');
  }

  verifySession(): Observable<any> {
    return this.http.post<any>(`${this.whatsappApiUrl}/auth/session`, {}).pipe(
      catchError((error: HttpErrorResponse) => {
        throw error.error;
      })
    );
  }

  logout(): void {
    localStorage.removeItem('auth_token');
  }
}
