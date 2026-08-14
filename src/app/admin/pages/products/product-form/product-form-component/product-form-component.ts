import { Component, OnInit, ChangeDetectionStrategy, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';

// --- MÓDULOS DE ANGULAR MATERIAL ---
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatRadioModule } from '@angular/material/radio';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatProgressBarModule } from '@angular/material/progress-bar';

// --- SERVICIOS Y MODELOS ---
import { ProductService } from '../../../../../core/services/product.service';
import { CloudinaryService } from '../../../../../core/services/cloudinary.service';
import { NotificationService } from '../../../../../core/services/notification.service';
import { Product } from '../../../../../core/models/product.model';
import { PACKAGING_OPTIONS, PackagingOption } from '../../../../../core/models/packaging.model';

interface ImageState {
  file: File | null;
  previewUrl: string;
  isNew: boolean;
}

@Component({
  selector: 'app-product-form',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    ReactiveFormsModule,
    // Material
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatRadioModule,
    MatTooltipModule,
    MatProgressBarModule
  ],
  templateUrl: './product-form-component.html',
  styleUrls: ['./product-form-component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ProductFormComponent implements OnInit {

  productForm: FormGroup;
  isEditMode = false;
  currentProductId: string | null = null;
  
  _internalImageState: ImageState[] = [];
  imagePreviewUrls: string[] = [];

  packagingOptions: PackagingOption[] = PACKAGING_OPTIONS;

  loading = false;

  constructor(
    private fb: FormBuilder,
    private route: ActivatedRoute,
    private router: Router,
    private productService: ProductService,
    private cloudinaryService: CloudinaryService,
    private notificationService: NotificationService,
    private cdr: ChangeDetectorRef
  ) {
    // Crear los controles para los precios de empaque dinámicamente
    const packagingPricesControls: { [key: string]: any } = {};
    this.packagingOptions.forEach(option => {
      packagingPricesControls[option.type] = [null, [Validators.min(0)]];
    });

    this.productForm = this.fb.group({
      name: ['', [Validators.required, Validators.minLength(5)]],
      description: [''],
      price: [null, [Validators.required, Validators.min(0)]],
      stock: [null, [Validators.required, Validators.min(0)]],
      sku: ['', [Validators.required, Validators.minLength(4)]],
      packagingPrices: this.fb.group(packagingPricesControls)
    });
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    
    if (id && id !== 'new') {
      this.isEditMode = true;
      this.currentProductId = id;
      this.loadProductData(id);
    }
  }

  async loadProductData(id: string): Promise<void> {
    this.loading = true;
    try {
      const product = await this.productService.getProduct(id);
      if (product) {
        this.productForm.patchValue(product);
        if (product.packagingPrices) {
          this.productForm.get('packagingPrices')?.patchValue(product.packagingPrices);
        }
        this._internalImageState = (product.imageUrls || []).map(url => ({
          file: null,
          previewUrl: url,
          isNew: false
        }));
        this.updateImagePreviewUrls();
      } else {
        this.notificationService.showError('Producto no encontrado.');
        this.router.navigate(['/admin/products']);
      }
    } catch (error) {
      console.error('Error cargando producto:', error);
      this.notificationService.showError('Error al cargar el producto.');
      this.router.navigate(['/admin/products']);
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  private updateImagePreviewUrls(): void {
    this.imagePreviewUrls = this._internalImageState.map(state => state.previewUrl);
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files.length > 0) {
      for (let i = 0; i < input.files.length; i++) {
        const file = input.files[i];
        const reader = new FileReader();
        reader.onload = () => {
          this._internalImageState.push({
            file: file,
            previewUrl: reader.result as string,
            isNew: true
          });
          this.updateImagePreviewUrls();
          this.cdr.detectChanges();
        };
        reader.readAsDataURL(file);
      }
    }
  }

  async onSubmit(): Promise<void> {
    if (this.productForm.invalid) {
      this.productForm.markAllAsTouched();
      this.notificationService.showError('Por favor, completa todos los campos requeridos.');
      return;
    }

    this.loading = true;
    this.cdr.markForCheck();
    let finalImageUrls: string[] = [];

    try {
      const newFilesToUpload = this._internalImageState.filter(state => state.isNew && state.file !== null);
      const existingImageUrls = this._internalImageState.filter(state => !state.isNew).map(state => state.previewUrl);

      if (newFilesToUpload.length > 0) {
        const uploadPromises = newFilesToUpload.map(state =>
          firstValueFrom(this.cloudinaryService.uploadImage(state.file as File))
        );
        const uploadResponses = await Promise.all(uploadPromises);
        const uploadedUrls = uploadResponses.map(response => response.secure_url);
        finalImageUrls.push(...uploadedUrls);
      }

      finalImageUrls.push(...existingImageUrls);

      const formData = this.productForm.value;
      const productData: Omit<Product, 'id' | 'createdAt' | 'updatedAt'> = {
        ...formData,
        imageUrls: finalImageUrls,
        price: Number(formData.price),
        stock: Number(formData.stock),
        packagingPrices: formData.packagingPrices
      };

      if (this.isEditMode && this.currentProductId) {
        await this.productService.updateProduct(this.currentProductId, productData);
        this.notificationService.showSuccess('Producto actualizado correctamente.');
      } else {
        await this.productService.addProduct(productData);
        this.notificationService.showSuccess('Producto creado correctamente.');
      }

      this.goBack();
    } catch (error) {
      console.error('Error al guardar el producto:', error);
      this.notificationService.showError('Error al guardar el producto. Inténtalo de nuevo.');
    } finally {
      this.loading = false;
      this.cdr.markForCheck();
    }
  }

  goBack(): void {
    this.router.navigate(['/admin/products']);
  }

  removeImage(index: number): void {
    if (index >= 0 && index < this._internalImageState.length) {
      this._internalImageState.splice(index, 1);
      this.updateImagePreviewUrls();
    }
  }
}
