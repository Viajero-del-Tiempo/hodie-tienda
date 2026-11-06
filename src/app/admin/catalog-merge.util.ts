import { AdminProduct, ProductInput, productInput } from '@core/models/admin-catalog.model';

export interface MergeConflict { field: string; previous: unknown; current: unknown; draft: unknown; label: string; }
export type MergeChoices = Record<string, 'current' | 'draft'>;
const canonical = (value: unknown): unknown => Array.isArray(value) ? value.map(canonical)
  : value && typeof value === 'object' ? Object.fromEntries(Object.entries(value).sort(([a], [b]) => a.localeCompare(b)).map(([key, item]) => [key, canonical(item)])) : value;
const same = (a: unknown, b: unknown) => JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));

export function mergeProductDraft(base: AdminProduct, draft: ProductInput, latest: AdminProduct, choices: MergeChoices = {}): {
  input: ProductInput; conflicts: MergeConflict[];
} {
  const previous = productInput(base); const current = productInput(latest); const conflicts: MergeConflict[] = [];
  const pick = <T>(field: string, old: T, local: T, remote: T, label = field): T => {
    if (same(local, old)) return structuredClone(remote);
    if (same(remote, old) || same(local, remote)) return structuredClone(local);
    conflicts.push({ field, previous: old, current: remote, draft: local, label });
    return structuredClone(choices[field] === 'current' ? remote : local);
  };
  const input: ProductInput = { ...current,
    name: pick('name', previous.name, draft.name, current.name, 'Nombre'),
    slug: pick('slug', previous.slug, draft.slug, current.slug, 'Slug'),
    description: pick('description', previous.description, draft.description, current.description, 'Descripción'),
    categoryId: pick('categoryId', previous.categoryId, draft.categoryId, current.categoryId, 'Categoría'),
    active: pick('active', previous.active, draft.active, current.active, 'Estado'),
    tags: pick('tags', previous.tags, draft.tags, current.tags, 'Etiquetas'),
    attributes: pick('attributes', previous.attributes, draft.attributes, current.attributes, 'Atributos'),
    optionNames: pick('optionNames', previous.optionNames, draft.optionNames, current.optionNames, 'Ejes de opciones'),
    customization: pick('customization', previous.customization, draft.customization, current.customization, 'Personalización'),
    packagingOptions: pick('packagingOptions', previous.packagingOptions, draft.packagingOptions, current.packagingOptions, 'Empaques'),
    variants: current.variants.map(remote => {
      const old = previous.variants.find(row => row.id === remote.id); const local = draft.variants.find(row => row.id === remote.id);
      if (!old || !local) return structuredClone(remote);
      const path = 'variants[' + remote.id + ']'; const label = 'Variante SKU ' + remote.sku;
      return { id: remote.id,
        sku: pick(path + '.sku', old.sku, local.sku, remote.sku, label + ': SKU'),
        options: pick(path + '.options', old.options, local.options, remote.options, label + ': opciones'),
        price: pick(path + '.price', old.price, local.price, remote.price, label + ': precio'),
        stock: pick(path + '.stock', old.stock, local.stock, remote.stock, label + ': stock'),
        active: pick(path + '.active', old.active, local.active, remote.active, label + ': estado'),
        imageUrls: pick(path + '.imageUrls', old.imageUrls, local.imageUrls, remote.imageUrls, label + ': imágenes') };
    }).concat(structuredClone(draft.variants.filter(row => !row.id))),
  };
  return { input, conflicts };
}
