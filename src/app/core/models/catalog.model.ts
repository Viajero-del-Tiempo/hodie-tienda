export interface Category {
  id: string;
  name: string;
  description: string;
  active: boolean;
  order: number;
}

export interface ProductVariant {
  id: string;
  sku: string;
  options: Record<string, string>;
  price: number;
  stock: number;
  active?: boolean;
  available: boolean;
  imageUrls: string[];
}

export interface CatalogPackagingOption {
  type: string;
  name: string;
  price: number;
  imageUrl?: string; // Este producto con este empaque; ausente/vacía si no tiene foto.
}

export interface CustomizationConfig {
  allowed: boolean;
  allowsText: boolean;
  maxChars?: number;
  allowsImage: boolean;
  notes: string;
}

export interface ProductSummary {
  id: string;
  slug: string;
  name: string;
  optionNames: string[];
  priceFrom: number | null;
  variants: ProductVariant[];
  customization: CustomizationConfig;
  category?: Pick<Category, 'id' | 'name'>;
  matchedTerms?: string[];
}

export interface CatalogProduct extends ProductSummary {
  schemaVersion: 2;
  active: boolean;
  description: string;
  categoryId: string;
  tags: string[];
  attributes: Record<string, string>;
  packagingOptions: CatalogPackagingOption[];
}

export type CatalogSort = 'relevance' | 'price-asc' | 'price-desc' | 'name-asc';
export interface CatalogQuery {
  query?: string;
  categoryId?: string;
  sort?: CatalogSort;
  page?: number;
  pageSize?: number;
}
export interface CatalogPage {
  products: ProductSummary[];
  total: number;
  page: number;
  pageSize: number;
}
