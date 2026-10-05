import { Component, Input, Output, EventEmitter, OnChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-quantity-input', standalone: true,
  imports: [FormsModule, MatButtonModule, MatIconModule, MatInputModule],
  templateUrl: './quantity-input-component.html', styleUrls: ['./quantity-input-component.scss'],
})
export class QuantityInputComponent implements OnChanges {
  @Input() initialQuantity = 1;
  @Input() maxQuantity = 100;
  @Output() quantityChange = new EventEmitter<number>();
  quantity = 1;
  ngOnChanges(): void { this.quantity = this.clamp(this.initialQuantity); }
  private clamp(value: number): number {
    if (this.maxQuantity < 1) return 0;
    return Math.min(this.maxQuantity, Math.max(1, Number.isSafeInteger(value) ? value : 1));
  }
  increment(): void { if (this.quantity < this.maxQuantity) this.set(this.quantity + 1); }
  decrement(): void { if (this.quantity > 1) this.set(this.quantity - 1); }
  onQuantityInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.set(this.clamp(Number(input.value))); input.value = String(this.quantity);
  }
  private set(quantity: number): void { this.quantity = quantity; this.quantityChange.emit(quantity); }
}
