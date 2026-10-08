import { mergeProductDraft } from '../src/app/admin/catalog-merge.util';
import { productInput } from '../src/app/core/models/admin-catalog.model';
import { adminProductFixture } from './helpers/admin-catalog-fixtures';

describe('Revisión del borrador de producto ante cambios concurrentes', () => {
  it('conserva el precio editado y toma el stock actual sin restaurar unidades vendidas', () => {
    const base = adminProductFixture(); const draft = productInput(base); const latest = structuredClone(base);
    draft.variants[0].price = 120; latest.variants[0].stock = 6; latest.version = 'test-next-version';
    const result = mergeProductDraft(base, draft, latest);
    expect(result.conflicts).toEqual([]); expect(result.input.variants[0].price).toBe(120); expect(result.input.variants[0].stock).toBe(6);
    expect(draft.variants[0].stock).toBe(8); expect(base.variants[0].price).toBe(100);
  });
  it('usa IDs aunque cambie el orden, incorpora variantes remotas y conserva filas nuevas sin ID', () => {
    const base = adminProductFixture(); const draft = productInput(base); const latest = structuredClone(base);
    draft.variants[0].active = false; const added = structuredClone(draft.variants[0]); delete added.id; added.sku = 'TEST-NUEVO'; draft.variants.push(added);
    latest.variants.reverse(); latest.variants.push({ ...structuredClone(latest.variants[0]), id: 'test-remote', sku: 'TEST-REMOTO' });
    const { input } = mergeProductDraft(base, draft, latest);
    expect(input.variants.find(row => row.id === 'test-v1')?.active).toBeFalse();
    expect(input.variants.find(row => row.id === 'test-remote')?.sku).toBe('TEST-REMOTO'); expect(input.variants.at(-1)?.id).toBeUndefined();
  });
  it('stock editado en ambas versiones requiere elección expresa; no inventa una suma', () => {
    const base = adminProductFixture(); const draft = productInput(base); const latest = structuredClone(base);
    draft.variants[0].stock = 15; latest.variants[0].stock = 6;
    const conflict = mergeProductDraft(base, draft, latest).conflicts[0];
    expect(conflict.field).toBe('variants[test-v1].stock'); expect(conflict.previous).toBe(8); expect(conflict.current).toBe(6); expect(conflict.draft).toBe(15);
    expect(mergeProductDraft(base, draft, latest, { [conflict.field]: 'current' }).input.variants[0].stock).toBe(6);
    expect(mergeProductDraft(base, draft, latest, { [conflict.field]: 'draft' }).input.variants[0].stock).toBe(15);
  });
  it('una imagen opcional vacía no convierte un empaque intacto en una colisión', () => {
    const base = adminProductFixture(); base.packagingOptions[1].imageUrl = '';
    const draft = productInput(base); const latest = structuredClone(base); latest.packagingOptions[1].price = 10;
    const { input, conflicts } = mergeProductDraft(base, draft, latest);
    expect(conflicts).toEqual([]); expect(input.packagingOptions[1].price).toBe(10);
  });
});
