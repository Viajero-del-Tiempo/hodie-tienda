import { Component, ChangeDetectionStrategy, inject } from '@angular/core';
import { CommonModule, Location } from '@angular/common';
import { RouterModule } from '@angular/router';
import { Observable, take } from 'rxjs';

// --- SERVICIOS Y MODELOS ---
import { Cart, CartItem, CartService } from '@core/services/cart.service';

// --- MÓDULOS DE ANGULAR MATERIAL ---
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDividerModule } from '@angular/material/divider';
import { GuaraniPipe } from '@core/pipes/guarani.pipe';
import { QuantityInputComponent } from '../../../shared/components/quantity-input/quantity-input-component/quantity-input-component';
import { MatTooltipModule } from '@angular/material/tooltip';

// --- COMPONENTE ---
@Component({
  selector: 'app-cart-page',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    // Material
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatDividerModule,
    MatTooltipModule,
    // App
    GuaraniPipe,
    QuantityInputComponent,
  ],
  templateUrl:'./cart-page.html',
  styleUrls: ['./cart-page.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CartPage {

  cartService = inject(CartService);
  location = inject(Location);

  cart$: Observable<Cart> = this.cartService.getCart();


  /**
   * Actualiza la cantidad de un artículo en el carrito.
   * @param {CartItem} item - El artículo del carrito.
   * @param {number} newQuantity - La nueva cantidad.
   */
  onQuantityChange(item: CartItem, newQuantity: number): void {
    this.cartService.updateItemQuantity(item.itemId, newQuantity);
  }

  /**
   * Elimina un artículo del carrito.
   * @param {string} itemId - El ID del artículo a eliminar.
   */
  removeItem(itemId: string): void {
    this.cartService.removeFromCart(itemId);
  }

  /**
   * Vacía todo el carrito.
   */
  clearCart(): void {
    this.cartService.clearCart();
  }

  /**
   * Navega a la página anterior.
   */
  goBack(): void {
    this.location.back();
  }

}
