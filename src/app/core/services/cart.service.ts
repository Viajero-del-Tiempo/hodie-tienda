import { inject, Injectable, InjectionToken } from '@angular/core';
import { BehaviorSubject, firstValueFrom, Observable } from 'rxjs';
import { CatalogPackagingOption, CatalogProduct, ProductVariant } from '../models/catalog.model';
import { Cart, CartItem } from '../models/cart.model';
import { textLength } from '../models/catalog.util';
import { CatalogService } from './catalog.service';
import { NotificationService } from './notification.service';
export type { Cart, CartItem } from '../models/cart.model';

export const CART_STORAGE = new InjectionToken<Storage | null>('CART_STORAGE', {
  providedIn: 'root', factory: () => { try { return globalThis.localStorage; } catch { return null; } },
});
interface CartReview { valid: boolean; changed: boolean; errors: string[]; }

const emptyCart = (): Cart => ({ schemaVersion: 2, items: [], totalItems: 0, subtotal: 0 });
const lineId = (productId: string, variantId: string, packagingType: string | null, customization: string): string =>
  JSON.stringify([productId, variantId, packagingType, customization]);

@Injectable({ providedIn: 'root' })
export class CartService {
  private storage = inject(CART_STORAGE);
  private notifications = inject(NotificationService);
  private catalog = inject(CatalogService);
  private readonly storageKey = 'hodie_cart';
  private state = new BehaviorSubject<Cart>(emptyCart());
  storageNotice: string | null = null;
  private pendingReview: Promise<CartReview> | null = null;

  constructor() { this.state.next(this.load()); }
  getCart(): Observable<Cart> { return this.state.asObservable(); }
  get snapshot(): Cart { return this.state.value; }
  dismissStorageNotice(): void { this.storageNotice = null; }

  getVariantQuantityInCart(productId: string, variantId: string, excludingItemId?: string): number {
    return this.snapshot.items.filter(item => item.productId === productId && item.variantId === variantId
      && item.itemId !== excludingItemId).reduce((sum, item) => sum + item.quantity, 0);
  }
  remainingQuantity(productId: string, variantId: string, stock: number, excludingItemId?: string): number {
    return Math.max(0, stock - this.getVariantQuantityInCart(productId, variantId, excludingItemId));
  }

  private makeItem(product: CatalogProduct, variantId: string, quantity: number,
    packagingType: string | null, customization: string): CartItem {
    const variant = product.variants.find(v => v.id === variantId && v.active !== false);
    if (product.schemaVersion !== 2 || !product.active || !variant) throw new Error('Este producto ya no está disponible.');
    if (!Number.isSafeInteger(quantity) || quantity < 1 || quantity > 100) throw new Error('La cantidad debe ser un entero de 1 a 100.');
    if (!Number.isSafeInteger(variant.price) || variant.price <= 0 || !Number.isSafeInteger(variant.stock) || variant.stock < 0) throw new Error('Los datos de esta variante no son válidos.');
    const packaging = packagingType === null ? null : product.packagingOptions.find(option => option.type === packagingType);
    if (packagingType !== null && !packaging) throw new Error('El empaque elegido ya no está disponible.');
    if (packaging && (!Number.isSafeInteger(packaging.price) || packaging.price < 0)) throw new Error('El precio del empaque no es válido.');
    const text = customization.trim();
    const config = product.customization;
    if (text && (!config.allowed || !config.allowsText)) throw new Error('Este producto no admite texto personalizado.');
    if (text && textLength(text) > (config.maxChars ?? 0)) throw new Error(`El texto admite hasta ${config.maxChars} caracteres.`);
    const selectedPackaging: CatalogPackagingOption | null = packaging ? { ...packaging } : null;
    return {
      itemId: lineId(product.id, variant.id, packagingType, text), productId: product.id, variantId: variant.id,
      product, variant, quantity, selectedPackaging, customization: text,
      customizationPending: config.allowed && config.allowsText && !text,
      unitPrice: variant.price + (selectedPackaging?.price ?? 0),
    };
  }

  private merge(items: CartItem[], candidate: CartItem): CartItem[] {
    const existing = items.find(item => item.itemId === candidate.itemId);
    const merged = { ...candidate, quantity: candidate.quantity + (existing?.quantity ?? 0) };
    if (merged.quantity > 100) throw new Error('Una línea admite hasta 100 unidades.');
    const total = items.filter(item => item.itemId !== candidate.itemId && item.productId === candidate.productId
      && item.variantId === candidate.variantId).reduce((sum, item) => sum + item.quantity, merged.quantity);
    if (total > candidate.variant.stock) throw new Error(`Stock insuficiente. Disponibles: ${candidate.variant.stock} unidades; solicitadas: ${total}.`);
    return existing ? items.map(item => item.itemId === candidate.itemId ? merged : item) : [...items, merged];
  }

  addToCart(product: CatalogProduct, variant: ProductVariant, quantity: number,
    packaging: CatalogPackagingOption | null = null, customization = ''): boolean {
    return this.change(() => this.merge(this.snapshot.items,
      this.makeItem(product, variant.id, quantity, packaging?.type ?? null, customization)));
  }
  updateItemQuantity(itemId: string, quantity: number): boolean {
    if (quantity === 0) { this.removeFromCart(itemId); return true; }
    return this.change(() => {
      const item = this.requireItem(itemId);
      return this.merge(this.snapshot.items.filter(line => line.itemId !== itemId),
        this.makeItem(item.product, item.variantId, quantity, item.selectedPackaging?.type ?? null, item.customization));
    });
  }
  updateCustomization(itemId: string, text: string): boolean {
    return this.change(() => {
      const item = this.requireItem(itemId);
      return this.merge(this.snapshot.items.filter(line => line.itemId !== itemId),
        this.makeItem(item.product, item.variantId, item.quantity, item.selectedPackaging?.type ?? null, text));
    });
  }
  private requireItem(itemId: string): CartItem {
    const item = this.snapshot.items.find(line => line.itemId === itemId);
    if (!item) throw new Error('La línea ya no está en el carrito.');
    return item;
  }
  removeFromCart(itemId: string): void { this.save(this.snapshot.items.filter(item => item.itemId !== itemId)); }
  clearCart(): void { this.save([]); }
  private change(operation: () => CartItem[]): boolean {
    try { this.save(operation()); return true; }
    catch (error) { this.notifications.showError(error instanceof Error ? error.message : 'No se pudo actualizar el carrito.'); return false; }
  }

  // El catálogo público tiene caché: esta revisión es informativa. El POST vuelve
  // a comprobar stock fresco y precios en el servidor, sin reservar unidades.
  refreshCatalog(): Promise<CartReview> {
    this.pendingReview ??= this.performReview().finally(() => { this.pendingReview = null; });
    return this.pendingReview;
  }

  private async performReview(): Promise<CartReview> {
    const before = this.snapshot;
    const ids = [...new Set(before.items.map(item => item.productId))];
    const products = new Map<string, CatalogProduct | null>();
    const errors: string[] = [];
    await Promise.all(ids.map(async id => {
      try { products.set(id, await firstValueFrom(this.catalog.getProductById(id))); }
      catch (error) {
        if ((error as { status?: number }).status !== 404) throw error;
        products.set(id, null);
      }
    }));
    let next: CartItem[] = [];
    for (const item of before.items) {
      try {
        const product = products.get(item.productId);
        if (!product) throw new Error(`${item.product.name}: este producto ya no está disponible.`);
        next = this.merge(next, this.makeItem(product, item.variantId, item.quantity, item.selectedPackaging?.type ?? null, item.customization));
      } catch (error) { errors.push(error instanceof Error ? error.message : 'Una línea ya no está disponible.'); }
    }
    // No borrar ni reducir líneas automáticamente. El cliente corrige el carrito.
    if (errors.length) return { valid: false, changed: false, errors };
    if (this.snapshot !== before) return { valid: false, changed: false, errors: ['El carrito cambió durante la revisión. Revisalo nuevamente.'] };
    const changed = JSON.stringify(before.items) !== JSON.stringify(next);
    this.save(next);
    return { valid: true, changed, errors };
  }

  private load(): Cart {
    let raw: string | null = null;
    try {
      raw = this.storage?.getItem(this.storageKey) ?? null;
      if (!raw) return emptyCart();
      const saved = JSON.parse(raw);
      if (saved?.schemaVersion !== 2 || !Array.isArray(saved.items)) throw new Error('Formato anterior');
      let items: CartItem[] = [];
      for (const line of saved.items) {
        if (!line || typeof line.productId !== 'string' || !line.productId || typeof line.variantId !== 'string' || !line.variantId
          || line.product?.id !== line.productId || typeof line.customization !== 'string') throw new Error('Línea inválida');
        items = this.merge(items, this.makeItem(line.product, line.variantId, line.quantity, line.selectedPackaging?.type ?? null, line.customization));
      }
      return this.total(items);
    } catch {
      if (raw) {
        this.storageNotice = 'Actualizamos el catálogo y vaciamos tu carrito guardado. Volvé a elegir tus productos.';
        try { this.storage?.removeItem(this.storageKey); } catch { /* El carrito en memoria queda vacío. */ }
      }
      return emptyCart();
    }
  }
  private total(items: CartItem[]): Cart {
    return { schemaVersion: 2, items, totalItems: items.reduce((sum, item) => sum + item.quantity, 0),
      subtotal: items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0) };
  }
  private save(items: CartItem[]): void {
    const cart = this.total(items);
    this.state.next(cart);
    try { this.storage?.setItem(this.storageKey, JSON.stringify(cart)); }
    catch { /* La falta de almacenamiento no impide usar el carrito en esta sesión. */ }
  }
}
