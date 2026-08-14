import { Component, ChangeDetectionStrategy, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { BreakpointObserver, Breakpoints } from '@angular/cdk/layout';
import { Observable, Subscription } from 'rxjs';
import { map, filter } from 'rxjs/operators';

// --- COMPONENTES HIJOS ---
import { ToolbarComponent } from '../../../../shared/layout/toolbar/toolbar-component/toolbar-component';
import { FooterComponent } from '../../../../shared/layout/footer/footer-component/footer-component';

// --- MÓDULOS DE ANGULAR MATERIAL ---
import { MatSidenav, MatSidenavModule } from '@angular/material/sidenav';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatListModule } from '@angular/material/list';
import { MatTooltipModule } from "@angular/material/tooltip";

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    // Componentes hijos
    ToolbarComponent,
    FooterComponent,
    // Material
    MatSidenavModule,
    MatIconModule,
    MatButtonModule,
    MatListModule,
    MatTooltipModule
],
  templateUrl: './main-layout-component.html',
  styleUrls: ['./main-layout-component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class MainLayoutComponent implements AfterViewInit, OnDestroy {

  @ViewChild('sidenav') sidenav!: MatSidenav;

  private routerSubscription: Subscription | null = null;
  isMobile$!: Observable<boolean>; // Detecta si estamos en modo móvil
 
  constructor(
    private breakpointObserver: BreakpointObserver,
    private router: Router
  ) {
     // Observable para detectar si estamos en modo móvil
    this.isMobile$ = this.breakpointObserver
    .observe(Breakpoints.Handset)
    .pipe(
      map(result => result.matches)
    );

  }

  ngAfterViewInit(): void {
    // Suscripción para cerrar el sidenav (en móvil)
    // cada vez que se completa una navegación.
    this.routerSubscription = this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.isMobile$.subscribe(isMobile => {
        if (isMobile && this.sidenav) {
          this.sidenav.close();
        }
      });
    });
  }

  ngOnDestroy(): void {
    // Limpiamos la suscripción
    if (this.routerSubscription) {
      this.routerSubscription.unsubscribe();
    }
  }

  /**
   * NOTA: 
   * La función 'toggleSidenav' ya no es necesaria aquí.
   * Conectamos el (click) del toolbar directamente al 
   * método .toggle() del sidenav en el HTML:
   * (toggleSidenav)="sidenav.toggle()"
   */
}
