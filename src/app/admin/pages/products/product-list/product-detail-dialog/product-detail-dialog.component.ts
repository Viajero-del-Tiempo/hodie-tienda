import { Component, Inject } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe, CurrencyPipe } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDialogModule } from '@angular/material/dialog';
import { MatChipsModule } from '@angular/material/chips';

// Model
import { Product } from '@core/models/product.model';
import { GuaraniPipe } from '@core/pipes/guarani.pipe';

@Component({
  selector: 'app-product-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatListModule,
    MatDialogModule,
    MatChipsModule,
    DatePipe,
    GuaraniPipe,
  ],
  templateUrl: './product-detail-dialog.component.html',
  styleUrls: ['./product-detail-dialog.component.scss'],
})
export class ProductDetailDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ProductDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { product: Product }
  ) {}

  get product(): Product {
    return this.data.product;
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
