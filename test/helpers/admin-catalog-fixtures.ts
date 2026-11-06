import { AdminProduct, CatalogPolicy } from '../../src/app/core/models/admin-catalog.model';
import { Category } from '../../src/app/core/models/catalog.model';
import { productFixture } from './catalog-fixtures';

export function adminProductFixture(): AdminProduct {
  const product = productFixture();
  return { ...product, version: 'test-version', variants: product.variants.map(({ available, ...variant }) => ({ ...variant, active: true })) };
}
export const categoryFixture = (): Category => ({ id: 'test-category', name: 'Categoría Alfa', description: 'Descripción ficticia', active: true, order: 0 });
export const policyFixture = (): CatalogPolicy => ({ id: 'test-tema-libre', title: 'Título ficticio', text: 'Texto ficticio' });
