import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef, DestroyRef, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { catchError, of, switchMap } from 'rxjs';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { GuaraniPipe } from '../../../core/pipes/guarani.pipe';
import { CatalogService } from '../../../core/services/catalog.service';
import { CartService } from '../../../core/services/cart.service';
import { CatalogProduct, CatalogPackagingOption, ProductVariant } from '../../../core/models/catalog.model';
import { textLength, variantLabel } from '../../../core/models/catalog.util';
import { VariantSelectorComponent } from '../../../shared/components/variant-selector/variant-selector.component';
import { PackagingSelectorComponent } from '../../../shared/components/packaging-selector/packaging-selector.component';
import { QuantityInputComponent } from '../../../shared/components/quantity-input/quantity-input-component/quantity-input-component';
import { AddToCartDialogComponent } from '../../../shared/components/add-to-cart-dialog/add-to-cart-dialog.component';

@Component({
  selector: 'app-product-detail-page', standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule,
    MatProgressSpinnerModule, MatDialogModule, GuaraniPipe, VariantSelectorComponent, PackagingSelectorComponent, QuantityInputComponent],
  templateUrl: './product-detail-page.html', styleUrls: ['./product-detail-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ProductDetailPage implements OnInit {
  product: CatalogProduct | null = null;
  selectedVariant: ProductVariant | null = null;
  selectedPackaging: CatalogPackagingOption | null = null;
  selectedImageUrl = '';
  quantity = 1;
  maxAvailableQuantity = 0;
  customization = '';
  isLoading = true;
  error = '';
  label = variantLabel;
  length = textLength;
  private route = inject(ActivatedRoute);
  private catalog = inject(CatalogService);
  private cart = inject(CartService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  private dialog = inject(MatDialog);
  private router = inject(Router);

  get allowsText(): boolean { return !!this.product?.customization.allowed && !!this.product.customization.allowsText; }
  get textInvalid(): boolean { return this.allowsText && textLength(this.customization.trim()) > (this.product?.customization.maxChars ?? 0); }
  get hasStock(): boolean { return this.product?.variants.some(v => v.stock > 0) ?? false; }
  get unitPrice(): number { return (this.selectedVariant?.price ?? 0) + (this.selectedPackaging?.price ?? 0); }
  get canAdd(): boolean { return !!this.selectedVariant && this.quantity >= 1 && this.quantity <= this.maxAvailableQuantity && !this.textInvalid; }

  ngOnInit(): void {
    this.cart.getCart().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => { this.updateLimit(); this.cdr.markForCheck(); });
    this.route.paramMap.pipe(switchMap(params => {
      this.isLoading = true; this.error = ''; this.product = null; this.selectedVariant = null;
      this.selectedPackaging = null; this.customization = ''; this.quantity = 1;
      return this.catalog.getProductBySlug(params.get('slug') || '').pipe(catchError(error => {
        if (error.status !== 404) this.error = 'No se pudo cargar el producto. Intentá nuevamente.';
        return of(null);
      }));
    }), takeUntilDestroyed(this.destroyRef)).subscribe(product => {
      this.product = product;
      this.selectedImageUrl = product?.variants.find(v => v.imageUrls.length)?.imageUrls[0] || '';
      const available = product?.variants.filter(v => v.stock > 0) ?? [];
      if (available.length === 1) this.onVariantChange(available[0]);
      this.isLoading = false; this.cdr.markForCheck();
    });
  }
  onVariantChange(variant: ProductVariant | null): void {
    if (variant?.id !== this.selectedVariant?.id) this.quantity = 1;
    this.selectedVariant = variant;
    this.selectedImageUrl = variant?.imageUrls[0] || this.product?.variants.find(v => v.imageUrls.length)?.imageUrls[0] || '';
    this.updateLimit();
  }
  private updateLimit(): void {
    this.maxAvailableQuantity = this.product && this.selectedVariant
      ? Math.min(100, this.cart.remainingQuantity(this.product.id, this.selectedVariant.id, this.selectedVariant.stock)) : 0;
    if (this.maxAvailableQuantity > 0) this.quantity = Math.min(Math.max(1, this.quantity), this.maxAvailableQuantity);
  }
  addToCart(): void {
    if (!this.product || !this.selectedVariant || !this.canAdd) return;
    if (this.cart.addToCart(this.product, this.selectedVariant, this.quantity, this.selectedPackaging, this.customization)) {
      this.dialog.open(AddToCartDialogComponent).afterClosed().pipe(takeUntilDestroyed(this.destroyRef)).subscribe(result => {
        if (result === 'view_cart') this.router.navigate(['/cart']);
        else this.router.navigate(['/store']);
      });
    }
  }
}
