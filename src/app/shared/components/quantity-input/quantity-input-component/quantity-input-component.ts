import { Component, Input, Output, EventEmitter, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';

@Component({
  selector: 'app-quantity-input',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
  ],
  templateUrl: './quantity-input-component.html',
  styleUrls: ['./quantity-input-component.scss'],
})
export class QuantityInputComponent implements OnInit {
  @Input() initialQuantity = 1;
  @Input() maxQuantity = 100;
  @Output() quantityChange = new EventEmitter<number>();

  quantity: number = 0;

  ngOnInit(): void {
    this.quantity = this.initialQuantity;
  }

  increment(): void {
    if (this.quantity < this.maxQuantity) {
      this.quantity++;
      this.emitQuantity();
    }
  }

  decrement(): void {
    if (this.quantity > 1) {
      this.quantity--;
      this.emitQuantity();
    }
  }

  onQuantityInputChange(event: Event): void {
    const inputElement = event.target as HTMLInputElement;
    let value = parseInt(inputElement.value, 10);

    if (isNaN(value) || value < 1) {
      value = 1;
    } else if (value > this.maxQuantity) {
      value = this.maxQuantity;
    }

    this.quantity = value;
    inputElement.value = this.quantity.toString();
    this.emitQuantity();
  }

  private emitQuantity(): void {
    this.quantityChange.emit(this.quantity);
  }
}
