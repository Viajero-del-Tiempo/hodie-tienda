import { HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { AuthService } from './auth.service';

export const tokenInterceptor: HttpInterceptorFn = (req, next) => {
  const authService = inject(AuthService);
  const token = authService.getToken();

  // --- URLs que NO deben llevar Authorization ---
  const excludedUrls = ['https://api.cloudinary.com', 'https://res.cloudinary.com'];

  const isExcluded = excludedUrls.some((url) => req.url.startsWith(url));

  if (isExcluded) {
    // No tocar el request
    return next(req);
  }

  if (token) {
    const cloned = req.clone({
      headers: req.headers.set('Authorization', `Bearer ${token}`),
    });
    return next(cloned);
  }

  return next(req);
};
