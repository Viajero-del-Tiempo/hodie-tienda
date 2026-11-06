import {
  Component,
  ChangeDetectionStrategy,
  CUSTOM_ELEMENTS_SCHEMA,
  OnInit,
  inject,
  ChangeDetectorRef,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

// --- MÓDULOS DE ANGULAR MATERIAL ---
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { ProductCardComponent } from '../../../shared/components/product-card/product-card-component/product-card-component';
import { CatalogService } from '../../../core/services/catalog.service';
import { ProductSummary } from '../../../core/models/catalog.model';

// Importar función para registrar elementos personalizados de Swiper
import { register } from 'swiper/element/bundle';

@Component({
  selector: 'app-home-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    // Material
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    ProductCardComponent, // Componente importado
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA], // Necesario para Web Components de Swiper
  templateUrl: './home-page.html',
  styleUrls: ['./home-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class HomePage implements OnInit {
  // Datos para "Los Más Populares"
  featuredProducts: ProductSummary[] = [];


  // Datos para Propuestas de Valor
  valueProps = [
    {
      icon: 'card_giftcard',
      title: 'Personalizado',
      description: 'Cada detalle cuenta. Adaptamos cada regalo a tu gusto.',
    },
    {
      icon: 'local_shipping',
      title: 'Envío Rápido',
      description: 'Recibe tu pedido en tiempo récord en todo el país.',
    },
    {
      icon: 'verified',
      title: 'Calidad Garantizada',
      description: 'Solo usamos los mejores materiales para nuestros productos.',
    },
  ];

  private productService = inject(CatalogService);
  private cdr = inject(ChangeDetectorRef);

  constructor() {
    // Registrar Swiper (hace que <swiper-container> funcione)
    register();
  }

  ngOnInit(): void {
    this.fetchFeaturedProducts();
  }

  private fetchFeaturedProducts() {
    this.productService.searchProducts({ pageSize: 10 }).subscribe({
      next: ({ products }) => {
        // Tomamos los primeros 10 como "destacados" por ahora
        this.featuredProducts = products.slice(0, 10);
        this.cdr.markForCheck();
      },
      error: (err) => console.error('Error loading featured products', err),
    });
  }
}
