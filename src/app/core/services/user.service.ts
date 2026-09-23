import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, firstValueFrom, of, catchError } from 'rxjs';
import { User } from '../models/user.model';
import { environment } from '../../../environments/environment';

export interface AdminUsersResponse {
  success: boolean;
  users: User[];
}

export interface MyProfileResponse {
  success: boolean;
  user: User;
}

@Injectable({
  providedIn: 'root',
})
export class UserService {
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
   * Obtiene el perfil del usuario autenticado (Cliente).
   * Utiliza el token JWT adjuntado automáticamente por tokenInterceptor.
   */
  getMyProfile(): Observable<User | undefined> {
    return this.http
      .get<MyProfileResponse>(`${this.apiUrl}/users/me`)
      .pipe(
        map((res) =>
          res.user
            ? {
                ...res.user,
                createdAt: this.parseTimestamp(res.user.createdAt),
              }
            : undefined
        ),
        catchError((err) => {
          if (err.status === 404) {
            return of(undefined);
          }
          throw err;
        })
      );
  }

  /**
   * Actualiza el perfil del usuario autenticado desde el checkout (nombre, direcciones).
   */
  async updateMyProfile(profileData: Partial<User>): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiUrl}/users/me`, profileData));
  }

  /**
   * Compatibilidad: Obtiene el perfil del usuario autenticado vía JWT.
   * Reemplaza la consulta directa getDocs(users) de Firestore.
   */
  getUserByPhone(_phone?: string): Observable<User | undefined> {
    return this.getMyProfile();
  }

  /**
   * Obtiene la lista completa de usuarios para el panel de administración (Admin).
   */
  getUsers(): Observable<User[]> {
    return this.http
      .get<AdminUsersResponse>(`${this.apiUrl}/admin/users`)
      .pipe(
        map((res) =>
          (res.users || []).map((u) => ({
            ...u,
            createdAt: this.parseTimestamp(u.createdAt),
          }))
        )
      );
  }

  /**
   * Obtiene un usuario específico por su ID.
   */
  async getUser(id: string): Promise<User | undefined> {
    const users = await firstValueFrom(this.getUsers());
    return users.find((u) => u.uid === id);
  }

  /**
   * Agrega un nuevo usuario a través de la API del panel de administración (Admin).
   */
  async addUser(user: Partial<User>): Promise<void> {
    await firstValueFrom(this.http.post(`${this.apiUrl}/admin/users`, user));
  }

  /**
   * Actualiza los datos de un usuario desde el panel de administración (Admin).
   */
  async updateUser(id: string, user: Partial<User>): Promise<void> {
    await firstValueFrom(this.http.put(`${this.apiUrl}/admin/users/${id}`, user));
  }

  /**
   * Actualiza el rol de un usuario (admin / customer) con protección de último admin.
   */
  async updateUserRole(id: string, role: string): Promise<void> {
    await firstValueFrom(this.http.patch(`${this.apiUrl}/admin/users/${id}/role`, { role }));
  }

  /**
   * Desactiva un usuario (soft-delete) con protección de último admin.
   */
  async deleteUser(id: string): Promise<void> {
    await firstValueFrom(this.http.delete(`${this.apiUrl}/admin/users/${id}`));
  }
}
