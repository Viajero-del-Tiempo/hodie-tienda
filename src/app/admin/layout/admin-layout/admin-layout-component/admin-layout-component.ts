import {
  Component,
  OnInit,
  OnDestroy,
  ViewChild,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
} from '@angular/core';
import { MatSidenav, MatDrawerMode, MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatListModule } from '@angular/material/list';
import { MatIconModule } from '@angular/material/icon';
import { BreakpointObserver, BreakpointState } from '@angular/cdk/layout';
import { Router, NavigationEnd, RouterModule } from '@angular/router';
import { Subject } from 'rxjs';
import { takeUntil, filter } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatTooltipModule } from '@angular/material/tooltip';

const MOBILE_BREAKPOINT = '(max-width: 1280px)';

@Component({
  selector: 'app-admin-layout', // Asegúrate que este selector coincida con el tuyo
  standalone: true,
  imports: [
    MatToolbarModule,
    MatSidenavModule,
    MatListModule,
    MatIconModule,
    RouterModule,
    MatButtonModule,
    MatTooltipModule,
  ],
  templateUrl: './admin-layout-component.html',
  styleUrls: ['./admin-layout-component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush, // Estrategia OnPush para mejor rendimiento
})
export class AdminLayoutComponent implements OnInit, OnDestroy {
  // Obtenemos la referencia al Sidenav para poder llamarlo (ej. .close(), .toggle())
  @ViewChild(MatSidenav) sidenav!: MatSidenav;

  /** Modo del Sidenav: 'side' para desktop, 'over' para móvil */
  public sidenavMode: MatDrawerMode = 'side';

  /** Estado de apertura del Sidenav (abierto en 'side', cerrado en 'over') */
  public sidenavOpened = true;

  /** Estado de colapso para el modo 'side' (desktop) */
  public isSidebarCollapsed = false;

  /** Indica si estamos en la vista móvil */
  public isMobile = false;

  // Subject para manejar la desuscripción de observables
  private destroy$ = new Subject<void>();

  constructor(
    private breakpointObserver: BreakpointObserver,
    private router: Router,
    private cdr: ChangeDetectorRef // Detector de cambios para OnPush
  ) {}

  ngOnInit(): void {
    // 1. Observador para responsividad (BreakpointObserver)
    this.breakpointObserver
      .observe([MOBILE_BREAKPOINT])
      .pipe(takeUntil(this.destroy$))
      .subscribe((state: BreakpointState) => {
        this.isMobile = state.matches;

        if (this.isMobile) {
          // Si es móvil
          this.sidenavMode = 'over';
          this.sidenavOpened = false;
          this.isSidebarCollapsed = false; // No tiene sentido colapsado en 'over'
        } else {
          // Si es desktop
          this.sidenavMode = 'side';
          this.sidenavOpened = true;
        }

        // Forzamos la detección de cambios ya que estamos en OnPush
        this.cdr.markForCheck();
      });

    // 2. Observador para cerrar el Sidenav en navegación móvil
    this.router.events
      .pipe(
        filter((event) => event instanceof NavigationEnd),
        takeUntil(this.destroy$)
      )
      .subscribe(() => {
        // Si estamos en modo 'over' (móvil), cerramos el menú al navegar
        if (this.sidenavMode === 'over') {
          this.sidenav.close();
        }
      });
  }

  ngOnDestroy(): void {
    // Limpiamos las suscripciones
    this.destroy$.next();
    this.destroy$.complete();
  }

  /**
   * Alterna el estado de colapso del Sidenav (solo en desktop)
   */
  public toggleSidebarCollapse(): void {
    this.isSidebarCollapsed = !this.isSidebarCollapsed;
  }

  /**
   * Alterna la visibilidad del Sidenav (usado principalmente en móvil)
   */
  public toggleSidenav(): void {
    this.sidenav.toggle();
  }
}
