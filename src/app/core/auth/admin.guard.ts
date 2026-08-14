import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { UserService } from '../services/user.service';
import { AuthService } from './auth.service';
import { UserRole } from '../models/user.model';

export const adminGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const userService = inject(UserService);
  const router = inject(Router);

  return authService.verifySession().pipe(
    switchMap((sessionResponse) => {
      if (sessionResponse && sessionResponse.phone) {
        // La sesión es válida, ahora busca el usuario por teléfono
        return userService.getUserByPhone(sessionResponse.phone);
      } else {
        // La sesión no es válida o no contiene el teléfono
        router.navigate(['/login']);
        return of(null); // Emite null para que el siguiente `map` lo maneje
      }
    }),
    map((user) => {
      // Verifica si el usuario existe y tiene el rol de administrador
      if (user && user.role === UserRole.Admin) {
        return true; // El usuario es administrador
      } else {
        // Si no es admin, redirige a la página principal
        router.navigate(['/']);
        return false;
      }
    }),
    catchError(() => {
      // Si hay cualquier error en la cadena de observables, redirige
      router.navigate(['/']);
      return of(false);
    })
  );
};
