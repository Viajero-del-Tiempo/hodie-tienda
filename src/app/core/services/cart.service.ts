import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { Product } from '@core/models/product.model';
import { NotificationService } from './notification.service';
import { PackagingOption } from '@core/models/packaging.model';

/**
 * @interface CartItem
 * Representa un artículo en el carrito de compras.
 */
export interface CartItem {
  itemId: string; // ID compuesto: `productId-packagingType`
  product: Product;
  quantity: number;
  selectedPackaging?: PackagingOption;
  unitPrice: number; // Precio final (producto + empaque)
}

/**
 * @interface Cart
 * Representa el estado del carrito de compras.
 */
export interface Cart {
  items: CartItem[];
  totalItems: number;
  subtotal: number;
}

@Injectable({
  providedIn: 'root',
})
export class CartService {
  private readonly CART_STORAGE_KEY = 'hodie_cart';
  private cart$: BehaviorSubject<Cart>;

  constructor(private notificationService: NotificationService) {
    const initialState = this.loadCartFromStorage();
    this.cart$ = new BehaviorSubject<Cart>(initialState);
  }

  getCart(): Observable<Cart> {
    return this.cart$.asObservable();
  }

  /**
   * Obtiene la cantidad total de un producto específico en el carrito.
   * @param productId ID del producto
   */
  getProductQuantityInCart(productId: string): number {
    const currentCart = this.cart$.getValue();
    return currentCart.items
      .filter((item) => item.product.id === productId)
      .reduce((sum, item) => sum + item.quantity, 0);
  }

  /**
   * Añade un producto al carrito.
   * @param product El producto a añadir.
   * @param quantity La cantidad.
   * @param unitPrice El precio final por unidad (incluyendo empaque).
   * @param selectedPackaging El empaque seleccionado (opcional).
   */
  addToCart(
    product: Product,
    quantity: number,
    unitPrice: number,
    selectedPackaging?: PackagingOption
  ): boolean {
    const currentCart = this.cart$.getValue();
    // Clonamos el array de items para no mutar el estado actual directamente
    const items = [...currentCart.items];
    const itemId = this.generateItemId(product.id, selectedPackaging?.type);
    const existingItemIndex = items.findIndex((item) => item.itemId === itemId);

    if (quantity <= 0) return false;

    // Calcular la cantidad total de este producto que YA está en el carrito (sumando todas las variantes)
    const currentTotalQuantityInCart = items
      .filter((item) => item.product.id === product.id)
      .reduce((sum, item) => sum + item.quantity, 0);

    const newTotalQuantity = currentTotalQuantityInCart + quantity;

    if (newTotalQuantity > product.stock) {
      this.notificationService.showError(
        `No puedes agregar ${quantity} unidades. Stock total: ${product.stock}. Ya tienes ${currentTotalQuantityInCart} en el carrito.`
      );
      return false;
    }

    if (existingItemIndex > -1) {
      // El artículo ya existe, actualiza la cantidad
      const existingItem = items[existingItemIndex];
      const newQuantityForThisItem = existingItem.quantity + quantity;

      // Actualizamos el item en el nuevo array
      items[existingItemIndex] = { ...existingItem, quantity: newQuantityForThisItem };
    } else {
      // El artículo no está en el carrito, añádelo
      const newItem: CartItem = {
        itemId,
        product,
        quantity,
        unitPrice,
        // Clonamos el objeto selectedPackaging para evitar referencias compartidas
        selectedPackaging: selectedPackaging ? { ...selectedPackaging } : undefined,
      };
      items.push(newItem);
    }

    // Actualizamos el estado con el nuevo array de items
    this.updateCartState({ ...currentCart, items });
    return true;
  }

  /**
   * Actualiza la cantidad de un artículo en el carrito.
   * @param itemId El ID del artículo a actualizar.
   * @param quantity La nueva cantidad.
   */
  updateItemQuantity(itemId: string, quantity: number): void {
    const currentCart = this.cart$.getValue();
    const itemIndex = currentCart.items.findIndex((item) => item.itemId === itemId);

    if (itemIndex > -1) {
      if (quantity > 0) {
        const item = currentCart.items[itemIndex];
        if (quantity > item.product.stock) {
          this.notificationService.showError(`Stock insuficiente para ${item.product.name}.`);
          return;
        }
        currentCart.items[itemIndex] = { ...item, quantity };
      } else {
        currentCart.items.splice(itemIndex, 1);
      }
      this.updateCartState(currentCart);
    }
  }

  /**
   * Elimina un artículo del carrito.
   * @param itemId El ID del artículo a eliminar.
   */
  removeFromCart(itemId: string): void {
    const currentCart = this.cart$.getValue();
    const itemIndex = currentCart.items.findIndex((item) => item.itemId === itemId);

    if (itemIndex > -1) {
      const itemName = currentCart.items[itemIndex].product.name;
      currentCart.items.splice(itemIndex, 1);
      this.updateCartState(currentCart);
      this.notificationService.showSuccess(`${itemName} ha sido eliminado del carrito.`);
    }
  }

  clearCart(): void {
    const newCart: Cart = { items: [], totalItems: 0, subtotal: 0 };
    this.cart$.next(newCart);
    this.saveCartToStorage(newCart);
    this.notificationService.showSuccess('El carrito se ha vaciado.');
  }

  private generateItemId(productId: string, packagingType?: string): string {
    return packagingType ? `${productId}_${packagingType}` : productId;
  }

  private loadCartFromStorage(): Cart {
    const storedCart = localStorage.getItem(this.CART_STORAGE_KEY);
    return storedCart ? JSON.parse(storedCart) : { items: [], totalItems: 0, subtotal: 0 };
  }

  private saveCartToStorage(cart: Cart): void {
    localStorage.setItem(this.CART_STORAGE_KEY, JSON.stringify(cart));
  }

  private updateCartState(cart: Cart): void {
    const totalItems = cart.items.reduce((sum, item) => sum + item.quantity, 0);
    const subtotal = cart.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const updatedCart: Cart = { ...cart, totalItems, subtotal };

    this.cart$.next(updatedCart);
    this.saveCartToStorage(updatedCart);
  }
}
