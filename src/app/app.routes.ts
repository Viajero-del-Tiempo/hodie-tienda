import { Routes } from '@angular/router';
import { MainLayoutComponent } from './shared/layout/main-layout/main-layout-component/main-layout-component';
import { authGuard } from './core/auth/auth.guard';
import { adminGuard } from './core/auth/admin.guard'; // ⭐️ Importa el nuevo Guard

export const routes: Routes = [
  // Rutas públicas (tienda)
  {
    path: '',
    component: MainLayoutComponent, // Layout con navbar/footer público
    children: [
      {
        path: '',
        title: 'HoDie',
        loadComponent: () => import('./pages/home/home-page/home-page').then((m) => m.HomePage),
      },
      {
        path: 'services',
        title: 'Servicios',
        loadComponent: () => import('./pages/services/services-page/services-page').then((m) => m.ServicesPage),
      },
      {
        path: 'store',
        title: 'Tienda',
        loadComponent: () =>
          import('./pages/store/product-list-page/product-list-page').then(
            (m) => m.ProductListPage
          ),
      },
      {
        path: 'store/:id',
        title: 'Producto',
        loadComponent: () =>
          import('./pages/store/product-detail-page/product-detail-page').then(
            (m) => m.ProductDetailPage
          ),
      },
      {
        path: 'cart',
        title: 'Carrito',
        loadComponent: () => import('./pages/cart/cart-page/cart-page').then((m) => m.CartPage),
      },
      {
        path: 'checkout',
        title: 'Finalizar Compra',
        loadComponent: () =>
          import('./pages/checkout/checkout-page/checkout-page').then((m) => m.CheckoutPage),
        canActivate: [authGuard], // Protegido por LOGIN
      },
      {
        path: 'checkout/success',
        title: '¡Gracias por su compra!',
        loadComponent: () =>
          import('./pages/checkout/thankyou-page/thankyou-page').then((m) => m.ThankYouPage),
        canActivate: [authGuard],
      },
    ],
  },

  // Rutas de Autenticación (públicas, sin layout)

  {
    path: 'login',
    title: 'Iniciar Sesión',
    loadComponent: () =>
      import('./pages/auth/login/login-page/login-page').then((m) => m.LoginPage),
  },

  // ⭐️ RUTA DE ADMINISTRACIÓN (Lazy Loading)

  {
    path: 'admin',
    loadChildren: () => import('./admin/admin.routes').then((m) => m.ADMIN_ROUTES),
    canActivate: [authGuard, adminGuard], // Protegido por LOGIN y ADMIN
  },

  // Rutas de error
  {
    path: '404',
    loadComponent: () =>
      import('./pages/not-found/not-found-page/not-found-page').then((m) => m.NotFoundPage),
  },
  { path: '**', redirectTo: '404' },
];
