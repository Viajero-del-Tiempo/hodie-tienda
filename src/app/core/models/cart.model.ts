import { CatalogPackagingOption, CatalogProduct, ProductVariant } from './catalog.model';

export interface CartItem {
  itemId: string;
  productId: string;
  variantId: string;
  product: CatalogProduct;
  variant: ProductVariant;
  quantity: number;
  selectedPackaging: CatalogPackagingOption | null;
  customization: string;
  customizationPending: boolean;
  unitPrice: number;
}

export interface Cart {
  schemaVersion: 2;
  items: CartItem[];
  totalItems: number;
  subtotal: number;
}
