import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { CartItem, CartService } from '@core/services/cart.service';
import { GuaraniPipe } from '@core/pipes/guarani.pipe';
import { textLength, variantLabel } from '@core/models/catalog.util';
import { QuantityInputComponent } from '../../../shared/components/quantity-input/quantity-input-component/quantity-input-component';

@Component({
  selector: 'app-cart-page', standalone: true,
  imports: [CommonModule, RouterModule, FormsModule, MatButtonModule, MatFormFieldModule, MatInputModule, GuaraniPipe, QuantityInputComponent],
  templateUrl: './cart-page.html', styleUrls: ['./cart-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPage implements OnInit {
  cartService = inject(CartService);
  private cdr = inject(ChangeDetectorRef);
  cart$ = this.cartService.getCart();
  label = variantLabel;
  length = textLength;
  editing: Record<string,string> = {};
  errors: string[] = [];
  isReviewing = false;
  notice = '';

  ngOnInit(): void { void this.review(); }
  async review(): Promise<void> {
    if (this.isReviewing) return;
    this.isReviewing = true;
    try {
      const result = await this.cartService.refreshCatalog();
      this.errors = result.errors;
      if (result.changed) this.notice = 'Actualizamos los datos y precios del carrito. Revisá el resumen.';
    } catch { this.errors = ['No se pudo revisar el catálogo. Intentá nuevamente.']; }
    finally { this.isReviewing = false; this.cdr.markForCheck(); }
  }
  maxQuantity(item: CartItem): number {
    return Math.min(100,this.cartService.remainingQuantity(item.productId,item.variantId,item.variant.stock,item.itemId));
  }
  updateQuantity(item: CartItem, quantity: number): void {
    if (this.cartService.updateItemQuantity(item.itemId,quantity)) void this.review();
  }
  editText(item: CartItem): void { this.editing[item.itemId] = item.customization; }
  saveText(item: CartItem): void {
    if (this.cartService.updateCustomization(item.itemId,this.editing[item.itemId])) {
      delete this.editing[item.itemId]; void this.review();
    }
  }
  removeText(item: CartItem): void {
    if (this.cartService.updateCustomization(item.itemId,'')) { delete this.editing[item.itemId]; void this.review(); }
  }
  remove(item: CartItem): void { this.cartService.removeFromCart(item.itemId); delete this.editing[item.itemId]; void this.review(); }
}
