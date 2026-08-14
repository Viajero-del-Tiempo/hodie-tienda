import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { catchError, map, of } from 'rxjs';
import { AuthService } from './auth.service';

export const authGuard: CanActivateFn = (route, state) => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.verifySession().pipe(
    map((response) => {
      if (response && response.success) {
        return true; // El usuario está autenticado
      }
      // Si la respuesta no es la esperada, redirige a login
      router.navigate(['/login']);
      return false;
    }),
    catchError(() => {
      // Si hay un error en la verificación (ej. 401 Unauthorized), redirige a login
      router.navigate(['/login']);
      return of(false); // Devuelve un observable de `false`
    })
  );
};
