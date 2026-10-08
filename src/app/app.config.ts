import {
  ApplicationConfig,
  provideBrowserGlobalErrorListeners,
  provideZoneChangeDetection,
  importProvidersFrom,
} from '@angular/core';
import { provideRouter, withInMemoryScrolling } from '@angular/router';
import { provideHttpClient, withInterceptors } from '@angular/common/http';
import { MatSnackBarModule } from '@angular/material/snack-bar';

import { routes } from './app.routes';
import { MatPaginatorIntl } from '@angular/material/paginator';
import { customMatPaginatorIntl } from './shared/config/LibraryConfig';

import { provideFirebaseApp, initializeApp } from '@angular/fire/app';
import { provideFirestore, getFirestore, connectFirestoreEmulator } from '@angular/fire/firestore';
import { environment } from '../environments/environment';
import { getEmulatorConfig } from './core/config/emulator.util';
import { tokenInterceptor } from '@core/auth/token.interceptor';

// Validar el modo local antes de inicializar proveedores o hacer solicitudes.
const emulator = getEmulatorConfig(environment);

export const appConfig: ApplicationConfig = {
  providers: [
    provideHttpClient(withInterceptors([tokenInterceptor])),
    provideBrowserGlobalErrorListeners(),
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withInMemoryScrolling({
      anchorScrolling: 'enabled',
      scrollPositionRestoration: 'enabled'
    })),
    importProvidersFrom(MatSnackBarModule),
    { provide: MatPaginatorIntl, useValue: customMatPaginatorIntl() },
    provideFirebaseApp(() => initializeApp(environment.firebase)),
    provideFirestore(() => {
      const firestore = getFirestore();
      if (emulator) connectFirestoreEmulator(firestore, emulator.host, emulator.port);
      return firestore;
    }),
  ],
};
