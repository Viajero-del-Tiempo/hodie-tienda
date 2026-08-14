import { Component, ChangeDetectionStrategy, Input, Output, EventEmitter, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// --- MÓDULOS DE ANGULAR MATERIAL ---
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatBadgeModule } from '@angular/material/badge';
import { MatTooltipModule } from '@angular/material/tooltip';
import { CartService } from '@core/services/cart.service';

@Component({
  selector: 'app-toolbar',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    // Material
    MatToolbarModule,
    MatIconModule,
    MatButtonModule,
    MatBadgeModule,
    MatTooltipModule,
  ],
  templateUrl: './toolbar-component.html',
  styleUrls: ['./toolbar-component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ToolbarComponent implements OnInit {

  cartService = inject(CartService);
  cdr = inject(ChangeDetectorRef);
  cartCount = 0;

  
  // --- Propiedades del Componente --- //


  links = [
    { label: 'Inicio', path: '/' },
    { label: 'Tienda', path: '/store' },
    { label: 'Servicios', path: '/services'}
  ];

  /**
   * Recibe el estado 'isMobile' desde el MainLayoutComponent.
   */
  @Input() isMobile: boolean = false;

  /**
   * Emite un evento (vacío) cuando se hace clic en el
   * botón de menú, para que el MainLayoutComponent lo escuche.
   */
  @Output() toggleSidenav = new EventEmitter<void>();


  ngOnInit(): void {
    this.cartService.getCart().subscribe((cart) => {
      this.cartCount = cart.items.length;
      this.cdr.markForCheck();
    });
  }
}
