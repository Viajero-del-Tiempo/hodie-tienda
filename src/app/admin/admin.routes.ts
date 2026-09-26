import { Routes } from '@angular/router';
import { AdminLayoutComponent } from './layout/admin-layout/admin-layout-component/admin-layout-component';

// Define las rutas HIJAS que se cargarán dentro del AdminLayout
export const ADMIN_ROUTES: Routes = [
  {
    path: '', // La ruta padre es /admin
    component: AdminLayoutComponent, // El layout con Sidenav
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        title: 'Dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard-component/dashboard-component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'orders',
        title: 'Pedidos',
        loadComponent: () =>
          import('./pages/orders/order-list/order-list-component/order-list-component').then(
            (m) => m.OrderListComponent
          ),
      },
      {
        path: 'orders/:id',
        title: 'Detalle del Pedido',
        loadComponent: () =>
          import('./pages/orders/order-detail/order-detail-component/order-detail-component').then(
            (m) => m.OrderDetailComponent
          ),
      },
      {
        path: 'products',
        title: 'Productos',
        loadComponent: () =>
          import(
            './pages/products/product-list/product-list-component/product-list-component'
          ).then((m) => m.ProductListComponent),
      },
      {
        path: 'products/new',
        title: 'Crear Producto',
        loadComponent: () =>
          import(
            './pages/products/product-form/product-form-component/product-form-component'
          ).then((m) => m.ProductFormComponent),
      },
      {
        path: 'products/edit/:id',
        title: 'Editar Producto',
        loadComponent: () =>
          import(
            './pages/products/product-form/product-form-component/product-form-component'
          ).then((m) => m.ProductFormComponent),
      },
      {
        path: 'users',
        title: 'Clientes',
        loadComponent: () =>
          import('./pages/users/user-list/user-list-component/user-list-component').then(
            (m) => m.UserListComponent
          ),
      },
      {
        path: 'chats',
        title: 'Atención Humana',
        loadComponent: () =>
          import('./pages/chats/handoff-chats-component/handoff-chats-component').then(
            (m) => m.HandoffChatsComponent
          ),
      },
    ],
  },
];
