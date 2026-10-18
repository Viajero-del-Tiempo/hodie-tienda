import { TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { of } from 'rxjs';
import { ProductDetailPage } from '../src/app/pages/store/product-detail-page/product-detail-page';
import { PackagingSelectorComponent } from '../src/app/shared/components/packaging-selector/packaging-selector.component';
import { CatalogService } from '../src/app/core/services/catalog.service';
import { CartService } from '../src/app/core/services/cart.service';
import { productFixture } from './helpers/catalog-fixtures';

describe('Fotos propias de empaque en el detalle web', () => {
  let product = productFixture();
  let catalog: jasmine.SpyObj<CatalogService>;
  beforeEach(() => {
    product = productFixture(); catalog = jasmine.createSpyObj<CatalogService>('Catalog', ['getProductBySlug']);
    catalog.getProductBySlug.and.returnValue(of(product));
    TestBed.configureTestingModule({ imports: [ProductDetailPage], providers: [provideNoopAnimations(),
      provideRouter([{ path: 'store/:slug', component: ProductDetailPage }]), { provide: CatalogService, useValue: catalog },
      { provide: CartService, useValue: { getCart: () => of({ items: [] }), remainingQuantity: (_p: string, _v: string, stock: number) => stock } },
    ] });
  });
  it('elegir empaque mediante el selector cambia la principal y el precio; quitarlo restaura la foto del producto', async () => {
    const harness = await RouterTestingHarness.create(); const page = await harness.navigateByUrl('/store/producto-alfa', ProductDetailPage);
    page.onVariantChange(product.variants[0]); harness.detectChanges();
    const selector = harness.routeDebugElement!.query(By.directive(PackagingSelectorComponent)).componentInstance as PackagingSelectorComponent;
    selector.choose(product.packagingOptions[0].type); harness.detectChanges();
    expect(page.selectedImageUrl).toBe(product.packagingOptions[0].imageUrl!); expect(page.unitPrice).toBe(125);
    const photo = harness.routeNativeElement!.querySelector('.variant-main-image')!;
    expect(photo.getAttribute('src')).toBe(product.packagingOptions[0].imageUrl!);
    expect(photo.getAttribute('alt')).toContain(product.packagingOptions[0].name);
    selector.choose(null); harness.detectChanges();
    expect(page.selectedImageUrl).toBe(product.variants[0].imageUrls[0]); expect(page.unitPrice).toBe(100);
    expect(harness.routeNativeElement!.querySelector('.variant-main-image')!.getAttribute('alt')).toBe(product.name);
  });
  it('al cambiar de variante conserva la foto del empaque; una opción sin foto muestra la variante actual', async () => {
    const harness = await RouterTestingHarness.create(); const page = await harness.navigateByUrl('/store/producto-alfa', ProductDetailPage);
    page.onVariantChange(product.variants[0]); page.selectedPackaging = product.packagingOptions[0];
    page.onVariantChange(product.variants[2]); harness.detectChanges();
    expect(page.selectedImageUrl).toBe(product.packagingOptions[0].imageUrl!); expect(page.unitPrice).toBe(205);
    expect(page.selectedVariant!.stock).toBe(5);
    page.selectedPackaging = product.packagingOptions[1]; harness.detectChanges();
    expect(page.selectedImageUrl).toBe(product.variants[2].imageUrls[0]); expect(page.unitPrice).toBe(180);
    page.selectedPackaging = null; expect(page.selectedImageUrl).toBe(product.variants[2].imageUrls[0]);
  });
  it('reemplazar la foto desde catálogo se refleja sin convenciones; navegar a otro producto no conserva el empaque anterior', async () => {
    const harness = await RouterTestingHarness.create(); const page = await harness.navigateByUrl('/store/producto-alfa', ProductDetailPage);
    product.packagingOptions[0].imageUrl = 'https://example.test/foto-libre.png'; page.selectedPackaging = product.packagingOptions[0]; harness.detectChanges();
    expect(page.selectedImageUrl).toBe('https://example.test/foto-libre.png');
    const other = productFixture(); other.id = 'test-other'; other.slug = 'producto-beta'; catalog.getProductBySlug.and.returnValue(of(other));
    const next = await harness.navigateByUrl('/store/producto-beta', ProductDetailPage); harness.detectChanges();
    expect(next.selectedPackaging).toBeNull(); expect(next.selectedImageUrl).toBe(other.variants[0].imageUrls[0]);
  });
});
