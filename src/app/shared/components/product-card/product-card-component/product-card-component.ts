import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

//-- Material
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

//-- Models
import { Product } from '../../../../core/models/product.model';
import { GuaraniPipe } from "../../../../core/pipes/guarani.pipe";

@Component({
  selector: 'app-product-card',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    GuaraniPipe
],
  templateUrl: './product-card-component.html',
  styleUrl: './product-card-component.scss',
})
export class ProductCardComponent {
  @Input() product!: Product;
  @Input() showAddToCartButton: boolean = false;
}
