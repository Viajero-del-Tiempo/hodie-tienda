import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { CatalogProduct, ProductVariant } from '../../../core/models/catalog.model';

@Component({
  selector: 'app-variant-selector', standalone: true,
  imports: [CommonModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './variant-selector.component.html', styleUrl: './variant-selector.component.scss',
})
export class VariantSelectorComponent implements OnChanges {
  @Input({ required: true }) product!: CatalogProduct;
  @Output() variantChange = new EventEmitter<ProductVariant | null>();
  selected: Record<string, string> = {};

  ngOnChanges(): void {
    this.selected = {};
    const variants = this.product.variants.filter(v => v.active !== false && v.stock > 0);
    if (variants.length === 1) this.selected = { ...variants[0].options };
    this.emitSelection();
  }

  choices(axis: string, index: number): { value: string; available: boolean }[] {
    const preceding = this.product.optionNames.slice(0, index);
    const variants = this.product.variants.filter(v => v.active !== false
      && preceding.every(key => v.options[key] === this.selected[key]));
    return [...new Set(variants.map(v => v.options[axis]))].map(value => ({
      value, available: variants.some(v => v.options[axis] === value && v.stock > 0),
    }));
  }

  choose(axis: string, value: string, index: number): void {
    if (!this.choices(axis, index).some(choice => choice.value === value && choice.available)) return;
    this.selected = { ...this.selected, [axis]: value };
    for (const later of this.product.optionNames.slice(index + 1)) delete this.selected[later];
    this.emitSelection();
  }

  private emitSelection(): void {
    const variant = this.product.variants.find(v => v.active !== false && v.stock > 0
      && this.product.optionNames.every(axis => v.options[axis] === this.selected[axis]));
    this.variantChange.emit(variant ?? null);
  }
}
