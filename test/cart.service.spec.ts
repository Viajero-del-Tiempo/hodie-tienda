import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { CartService, CART_STORAGE } from '../src/app/core/services/cart.service';
import { CatalogService } from '../src/app/core/services/catalog.service';
import { NotificationService } from '../src/app/core/services/notification.service';
import { MemoryStorage, productFixture } from './helpers/catalog-fixtures';

describe('Carrito con variantes y textos por línea', () => {
  let cart: CartService;
  let storage: MemoryStorage;
  let product = productFixture();
  let catalog: jasmine.SpyObj<CatalogService>;
  function configure(saved?: string): void {
    storage = new MemoryStorage(); if (saved) storage.setItem('hodie_cart',saved);
    catalog = jasmine.createSpyObj<CatalogService>('CatalogService',['getProductById']);
    catalog.getProductById.and.returnValue(of(product));
    TestBed.configureTestingModule({ providers: [
      { provide: CART_STORAGE, useValue: storage }, { provide: CatalogService, useValue: catalog },
      { provide: NotificationService, useValue: jasmine.createSpyObj('Notifications',['showError','showSuccess']) },
    ] });
    cart = TestBed.inject(CartService);
  }
  beforeEach(() => { product = productFixture(); });
  it('separa textos distintos y suma el mismo texto, después de quitar espacios extremos', () => {
    configure();
    expect(cart.addToCart(product,product.variants[0],1,null,'Nombre Uno')).toBeTrue();
    cart.addToCart(product,product.variants[0],2,null,'Nombre Dos');
    cart.addToCart(product,product.variants[0],2,null,' Nombre Uno ');
    expect(cart.snapshot.items.length).toBe(2);
    expect(cart.snapshot.items[0].quantity).toBe(3);
    expect(cart.snapshot.items[1].customization).toBe('Nombre Dos');
    expect(cart.snapshot.subtotal).toBe(500);
  });
  it('mantiene separadas variantes y empaques libres, incluido uno gratuito', () => {
    configure();
    cart.addToCart(product,product.variants[0],1,null,'A');
    cart.addToCart(product,product.variants[0],1,product.packagingOptions[1],'A');
    cart.addToCart(product,product.variants[2],1,product.packagingOptions[0],'A');
    expect(cart.snapshot.items.length).toBe(3);
    expect(cart.snapshot.items[1].selectedPackaging?.name).toBe('Empaque Beta');
    expect(cart.snapshot.items[2].unitPrice).toBe(205);
  });
  it('editar texto fusiona líneas coincidentes y quitarlo crea personalización pendiente', () => {
    configure();
    cart.addToCart(product,product.variants[0],2,null,'Uno');
    cart.addToCart(product,product.variants[0],3,null,'Dos');
    expect(cart.updateCustomization(cart.snapshot.items[0].itemId,'Dos')).toBeTrue();
    expect(cart.snapshot.items.length).toBe(1);
    expect(cart.snapshot.items[0].quantity).toBe(5);
    expect(cart.updateCustomization(cart.snapshot.items[0].itemId,'')).toBeTrue();
    expect(cart.snapshot.items[0].customizationPending).toBeTrue();
    expect(cart.snapshot.items[0].customization).toBe('');
  });
  it('rechaza texto demasiado largo, texto no permitido y stock agregado entre líneas', () => {
    configure();
    expect(cart.addToCart(product,product.variants[0],1,null,'x'.repeat(21))).toBeFalse();
    cart.addToCart(product,product.variants[0],5,null,'Uno');
    expect(cart.addToCart(product,product.variants[0],4,product.packagingOptions[0],'Dos')).toBeFalse();
    cart.addToCart(product,product.variants[0],2,product.packagingOptions[0],'Dos');
    expect(cart.updateItemQuantity(cart.snapshot.items[1].itemId,4)).toBeFalse();
    expect(cart.snapshot.totalItems).toBe(7);
    const plain = { ...product, customization: { ...product.customization, allowed: false } };
    expect(cart.addToCart(plain,plain.variants[2],1,null,'Texto')).toBeFalse();
    expect(cart.addToCart(product,product.variants[1],1)).toBeFalse();
  });
  it('rechaza cantidades no enteras, fuera del límite y fusiones de más de 100', () => {
    configure();
    for (const quantity of [0,-1,1.5,101]) expect(cart.addToCart(product,product.variants[0],quantity)).toBeFalse();
    product.variants[0].stock = 200;
    cart.addToCart(product,product.variants[0],100,null,'Uno');
    cart.addToCart(product,product.variants[0],1,null,'Dos');
    expect(cart.updateCustomization(cart.snapshot.items[1].itemId,'Uno')).toBeFalse();
    expect(cart.snapshot.items.length).toBe(2);
  });
  it('cuenta caracteres Unicode como el servidor y no inventa pendiente en productos sin texto', () => {
    configure();
    product.customization.maxChars = 1;
    expect(cart.addToCart(product,product.variants[0],1,null,'😀')).toBeTrue();
    expect(cart.addToCart(product,product.variants[0],1,null,'😀😀')).toBeFalse();
    product.customization.allowed = false;
    cart.addToCart(product,product.variants[2],1);
    expect(cart.snapshot.items[1].customizationPending).toBeFalse();
  });
  it('recupera el formato nuevo recalculando los totales y la identidad', () => {
    const saved = { schemaVersion: 2, subtotal: -1, items: [{ productId: product.id, variantId: product.variants[0].id,
      product, quantity: 2, customization: 'Uno', selectedPackaging: product.packagingOptions[0], itemId: 'manipulado', unitPrice: 0 }] };
    configure(JSON.stringify(saved));
    expect(cart.snapshot.subtotal).toBe(250);
    expect(cart.snapshot.items[0].itemId).not.toBe('manipulado');
    expect(cart.storageNotice).toBeNull();
  });
  for (const saved of ['{','{"items":[{"productId":"test-product"}]}','{"schemaVersion":2,"items":[{"productId":"test-product"}]}']) {
    it('descarta formatos anteriores o dañados con aviso y sin migrar', () => {
      configure(saved);
      expect(cart.snapshot.items.length).toBe(0);
      expect(storage.getItem('hodie_cart')).toBeNull();
      expect(cart.storageNotice).toBeTruthy();
      cart.dismissStorageNotice(); expect(cart.storageNotice).toBeNull();
    });
  }
  it('actualiza precios desde catálogo y conserva el carrito ante stock insuficiente o un 404', async () => {
    configure(); cart.addToCart(product,product.variants[0],2,null,'Uno');
    const fresh = structuredClone(product); fresh.variants[0].price = 200;
    catalog.getProductById.and.returnValue(of(fresh));
    const result = await cart.refreshCatalog();
    expect(result.valid).toBeTrue(); expect(result.changed).toBeTrue(); expect(cart.snapshot.subtotal).toBe(400);
    fresh.variants[0].stock = 1;
    expect((await cart.refreshCatalog()).valid).toBeFalse();
    expect(cart.snapshot.items[0].quantity).toBe(2);
    catalog.getProductById.and.returnValue(throwError(() => ({ status: 404 })));
    expect((await cart.refreshCatalog()).valid).toBeFalse();
    expect(cart.snapshot.items[0].customization).toBe('Uno');
  });
});
