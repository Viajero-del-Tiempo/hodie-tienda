import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
} from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';

// --- MÓDULOS DE ANGULAR MATERIAL ---
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatRadioModule } from '@angular/material/radio';
import { MatCardModule } from '@angular/material/card';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { AddToCartDialogComponent } from '../../../shared/components/add-to-cart-dialog/add-to-cart-dialog.component';

// --- PIPES, SERVICIOS Y MODELOS ---
import { GuaraniPipe } from '../../../core/pipes/guarani.pipe';
import { ProductService } from '../../../core/services/product.service';
import { CartService } from '@core/services/cart.service';
import { Product } from '../../../core/models/product.model';
import { PackagingOption, PACKAGING_OPTIONS } from '../../../core/models/packaging.model';
import { QuantityInputComponent } from '../../../shared/components/quantity-input/quantity-input-component/quantity-input-component';

@Component({
  selector: 'app-product-detail-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    FormsModule,
    // Material
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatRadioModule,
    MatCardModule,
    MatProgressSpinnerModule,
    MatDialogModule,
    // Pipes
    GuaraniPipe,
    // Components
    QuantityInputComponent,
  ],
  templateUrl: './product-detail-page.html',
  styleUrls: ['./product-detail-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailPage implements OnInit {
  // --- Propiedades del Componente ---
  product: Product | null = null;
  isLoading = true;
  selectedImageUrl: string | null = null;
  quantity = 1;
  maxAvailableQuantity = 100; // Default max

  // Opciones de empaque
  packagingOptions: PackagingOption[] = PACKAGING_OPTIONS.map(opt => ({ ...opt }));
  selectedPackaging: PackagingOption | null = null;

  // Precio total
  totalPrice = 0;

  // --- Inyección de Dependencias ---
  private route = inject(ActivatedRoute);
  private productService = inject(ProductService);
  private cartService = inject(CartService);
  private cdr = inject(ChangeDetectorRef);
  private location = inject(Location);
  private dialog = inject(MatDialog);

  ngOnInit(): void {
    const productId = this.route.snapshot.paramMap.get('id');
    if (productId) {
      this.loadProduct(productId);
    } else {
      this.isLoading = false;
    }
  }

  loadProduct(id: string): void {
    this.isLoading = true;
    this.productService.getProductById(id).subscribe({
      next: (product) => {
        this.product = product;

        // Calcular stock disponible considerando lo que ya está en el carrito
        const inCart = this.cartService.getProductQuantityInCart(product.id);
        this.maxAvailableQuantity = Math.max(0, product.stock - inCart);

        this.updateTotalPrice();
        if (product.imageUrls && product.imageUrls.length > 0) {
          this.selectedImageUrl = product.imageUrls[0];
          this.packagingOptions[0].imageUrl =
            product.imageUrls[1] || this.packagingOptions[0].imageUrl;
          this.packagingOptions[1].imageUrl =
            product.imageUrls[2] || this.packagingOptions[1].imageUrl;
          this.packagingOptions[2].imageUrl =
            product.imageUrls[3] || this.packagingOptions[2].imageUrl;
          this.packagingOptions[0].price = product.packagingPrices?.caja || 0;
          this.packagingOptions[1].price = product.packagingPrices?.bolsa || 0;
          this.packagingOptions[2].price = product.packagingPrices?.envoltorio || 0;
        }
        this.isLoading = false;
        this.cdr.markForCheck();
      },
      error: (err) => {
        console.error('Error al cargar el producto:', err);
        this.isLoading = false;
        this.cdr.markForCheck();
      },
    });
  }

  changeMainImage(imageUrl: string): void {
    this.selectedImageUrl = imageUrl;
  }

  onPackagingChange(): void {
    this.updateTotalPrice();
  }

  onQuantityChange(newQuantity: number): void {
    this.quantity = newQuantity;
    this.updateTotalPrice();
  }

  updateTotalPrice(): void {
    if (this.product) {
      const packagingPrice = this.selectedPackaging ? this.selectedPackaging.price : 0;
      this.totalPrice = (this.product.price + packagingPrice) * this.quantity;
    }
  }

  onRadioChange(e: any): void {
    this.selectedImageUrl = e.value?.imageUrl ? e.value?.imageUrl : this.selectedImageUrl;
    this.updateTotalPrice();
  }

  public router = inject(Router);

  addToCart(): void {
    if (this.product) {
      const unitPrice = this.product.price + (this.selectedPackaging?.price || 0);
      const result = this.cartService.addToCart(
        this.product,
        this.quantity,
        unitPrice,
        this.selectedPackaging || undefined
      );

      if (result) {
        const dialogRef = this.dialog.open(AddToCartDialogComponent);
        dialogRef.afterClosed().subscribe((result) => {
          if (result === 'view_cart') {
            this.router.navigate(['/cart']);
          } else {
            this.router.navigate(['/store']);
          }
        });
      }
    }
  }

  goBack(): void {
    this.location.back();
  }
}
