import { ProductSummary, ProductVariant } from './catalog.model';

export function variantLabel(product: Pick<ProductSummary, 'optionNames'>, variant: ProductVariant): string {
  return product.optionNames.map(axis => variant.options[axis]).filter(Boolean).join(' · ');
}

export const textLength = (text: string): number => Array.from(text).length;
