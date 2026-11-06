import { CatalogPackagingOption, CatalogProduct, CustomizationConfig, ProductVariant } from './catalog.model';

export type AdminVariant = Omit<ProductVariant, 'available' | 'active'> & { active: boolean };
export interface AdminProduct extends Omit<CatalogProduct, 'variants'> {
  version: string;
  variants: AdminVariant[];
}
export interface ProductInput {
  schemaVersion: 2;
  name: string;
  slug: string;
  description: string;
  categoryId: string;
  active: boolean;
  tags: string[];
  attributes: Record<string, string>;
  optionNames: string[];
  variants: (Omit<AdminVariant, 'id'> & { id?: string })[];
  customization: CustomizationConfig;
  packagingOptions: CatalogPackagingOption[];
}
export interface CatalogPolicy { id: string; title: string; text: string; }
export interface AgentConfig { corporateQuantityThreshold: number; version: string; }
export interface CatalogChange {
  field: string;
  variantId?: string;
  sku?: string;
  previous?: unknown;
  current?: unknown;
}
export interface CatalogFailure {
  status?: number;
  message?: string;
  error?: { error?: string; field?: string; code?: string; changes?: CatalogChange[] };
}

// Whitelist: versiones, totales, SKU derivados y timestamps no son datos editables.
export function productInput(product: AdminProduct): ProductInput {
  return structuredClone({ schemaVersion: 2 as const, name: product.name, slug: product.slug,
    description: product.description, categoryId: product.categoryId, active: product.active,
    tags: product.tags, attributes: product.attributes, optionNames: product.optionNames,
    variants: product.variants.map(({ id, sku, options, price, stock, active, imageUrls }) =>
      ({ id, sku, options, price, stock, active, imageUrls })),
    customization: product.customization,
    packagingOptions: product.packagingOptions.map(({ type, name, price, imageUrl }) =>
      ({ type, name, price, ...(imageUrl?.trim() ? { imageUrl } : {}) })) });
}
