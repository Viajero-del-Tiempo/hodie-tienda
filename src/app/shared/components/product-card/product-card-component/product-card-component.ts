import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { ProductSummary } from '../../../../core/models/catalog.model';
import { variantLabel } from '../../../../core/models/catalog.util';
import { GuaraniPipe } from '../../../../core/pipes/guarani.pipe';

@Component({
  selector: 'app-product-card', standalone: true,
  imports: [RouterModule, MatCardModule, MatButtonModule, GuaraniPipe],
  templateUrl: './product-card-component.html', styleUrl: './product-card-component.scss',
})
export class ProductCardComponent {
  @Input({ required: true }) product!: ProductSummary;
  get image(): string { return this.product.variants.find(v => v.imageUrls?.length)?.imageUrls[0] || ''; }
  get available(): boolean { return this.product.variants.some(v => v.stock > 0); }
  label = variantLabel;
}
