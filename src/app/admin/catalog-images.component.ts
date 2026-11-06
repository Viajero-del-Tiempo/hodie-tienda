import { ChangeDetectorRef, Component, EventEmitter, Input, OnDestroy, Output, inject } from '@angular/core';
import { AbstractControl, FormArray, FormControl, ReactiveFormsModule } from '@angular/forms';
import { firstValueFrom } from 'rxjs';
import { AdminCatalogService } from '@core/services/admin-catalog.service';
import { controlKey, errorMessage, failureMessage, textControl } from './catalog-editor.util';
import { CatalogFailure } from '@core/models/admin-catalog.model';

@Component({
  selector: 'app-catalog-images', standalone: true, imports: [ReactiveFormsModule],
  template: `
    <div class="images">
      @if (array) {
        @for (url of array.controls; track key(url); let i = $index) {
          <div class="image-row"><img [src]="url.value" alt="Imagen de la variante" />
            <label>URL de imagen <input [formControl]="url" /></label>
            <button type="button" (click)="remove(i)">Quitar imagen</button>
            @if (message(url)) { <small role="alert">{{ message(url) }}</small> }
          </div>
        }
      } @else {
        @if (single.value) { <img [src]="single.value" alt="Imagen del empaque" /> }
        <label>URL de imagen <input [formControl]="single" /></label>
        @if (single.value) { <button type="button" (click)="single.setValue(''); single.markAsDirty()">Quitar imagen</button> }
      }
      <label>Subir {{ array ? 'imágenes' : 'imagen' }} (JPG, PNG o WEBP, hasta 10 MB)
        <input type="file" accept="image/jpeg,image/png,image/webp" [multiple]="!!array" [disabled]="uploading || pending.length > 0" (change)="select($event)" />
      </label>
      @if (uploading) { <p role="status">Subiendo imagen…</p> }
      @if (error) { <p role="alert">{{ error }}</p> }
      @if (pending.length && !uploading) {
        <p>Archivos pendientes: @for (file of pending; track key(file)) { <span>{{ file.name }} </span> }</p>
        <button type="button" (click)="upload()">Reintentar subida</button>
        <button type="button" (click)="cancelPending()">Quitar archivos pendientes</button>
      }
      @if (message(control)) { <small role="alert">{{ message(control) }}</small> }
    </div>`,
  styles: [`:host{display:block} .images{display:grid;gap:.5rem} label{display:grid;gap:.25rem}
    img{width:72px;height:72px;object-fit:contain} .image-row{display:flex;gap:.5rem;flex-wrap:wrap;align-items:center}
    small,[role=alert]{color:#a01818} input{max-width:100%;box-sizing:border-box}`],
})
export class CatalogImagesComponent implements OnDestroy {
  @Input({ required: true }) control!: AbstractControl;
  @Output() pendingChange = new EventEmitter<boolean>();
  private api = inject(AdminCatalogService);
  private cdr = inject(ChangeDetectorRef);
  private destroyed = false;
  pending: File[] = []; uploading = false; error = '';
  key = controlKey; message = errorMessage;
  get array(): FormArray<FormControl<string>> | null { return this.control instanceof FormArray ? this.control : null; }
  get single(): FormControl<string> { return this.control as FormControl<string>; }
  remove(index: number): void { this.array?.removeAt(index); this.control.markAsDirty(); }
  select(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.pending = Array.from(input.files ?? []); input.value = '';
    if (this.pending.length) { this.pendingChange.emit(true); void this.upload(); }
  }
  async upload(): Promise<void> {
    if (this.uploading || !this.pending.length) return;
    this.uploading = true; this.error = '';
    try {
      while (this.pending.length) {
        const url = await firstValueFrom(this.api.uploadImage(this.pending[0]));
        if (this.destroyed) return;
        if (this.array) this.array.push(textControl(url, true));
        else this.single.setValue(url);
        this.control.markAsDirty(); this.pending.shift();
      }
    } catch (error) { if (!this.destroyed) this.error = failureMessage(error as CatalogFailure); }
    finally {
      if (!this.destroyed) { this.uploading = false; this.pendingChange.emit(this.pending.length > 0); this.cdr.markForCheck(); }
    }
  }
  cancelPending(): void { this.pending = []; this.error = ''; this.pendingChange.emit(false); }
  ngOnDestroy(): void { this.destroyed = true; this.pendingChange.emit(false); }
}
