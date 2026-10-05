import { CatalogProduct } from '../../src/app/core/models/catalog.model';

// Datos ficticios de tests: no se leen SPEC ni el catálogo real.
export function productFixture(): CatalogProduct {
  return {
    id: 'test-product', slug: 'producto-alfa', schemaVersion: 2, name: 'Producto Alfa', active: true,
    categoryId: 'test-category', description: 'Descripción ficticia', tags: [], attributes: { material: 'Material Alfa' },
    optionNames: ['eje-a', 'eje-b'], priceFrom: 100,
    variants: [
      { id: 'test-v1', sku: 'TEST-A', options: { 'eje-a': 'Valor Uno', 'eje-b': 'Formato Uno' }, price: 100, stock: 8, active: true, available: true, imageUrls: ['data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%221%22 height=%221%22/%3E'] },
      { id: 'test-v2', sku: 'TEST-B', options: { 'eje-a': 'Valor Uno', 'eje-b': 'Formato Dos' }, price: 140, stock: 0, active: true, available: false, imageUrls: ['data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%222%22 height=%221%22/%3E'] },
      { id: 'test-v3', sku: 'TEST-C', options: { 'eje-a': 'Valor Dos', 'eje-b': 'Formato Dos' }, price: 180, stock: 5, active: true, available: true, imageUrls: ['data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%223%22 height=%221%22/%3E'] },
    ],
    packagingOptions: [
      { type: 'tipo/libre', name: 'Empaque Alfa', price: 25, imageUrl: 'data:image/svg+xml,%3Csvg xmlns=%22http://www.w3.org/2000/svg%22 width=%224%22 height=%221%22/%3E' },
      { type: 'gratuito', name: 'Empaque Beta', price: 0 },
    ],
    customization: { allowed: true, allowsText: true, maxChars: 20, allowsImage: false, notes: 'Nota ficticia' },
  };
}

export class MemoryStorage implements Storage {
  private data = new Map<string,string>();
  get length(): number { return this.data.size; }
  clear(): void { this.data.clear(); }
  getItem(key: string): string | null { return this.data.get(key) ?? null; }
  key(index: number): string | null { return [...this.data.keys()][index] ?? null; }
  removeItem(key: string): void { this.data.delete(key); }
  setItem(key: string,value: string): void { this.data.set(key,value); }
}
