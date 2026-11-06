import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormControl, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { UserService } from '@core/services/user.service';
import { BillingProfile, ProfileUpdate, ShippingAddress, User } from '@core/models/user.model';
import { ShippingOptions } from '@core/models/order.model';
import { billingForm, clearServerError, CustomerFailure, CustomerForm, fieldMessage, serverFieldError, shippingForm } from '@core/models/customer-form.util';
import { ShippingFormComponent } from '../../shared/components/shipping-form/shipping-form.component';
import { BillingFormComponent } from '../../shared/components/billing-form/billing-form.component';

@Component({ selector: 'app-profile-page', standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterModule, MatCardModule, MatButtonModule, MatFormFieldModule, MatInputModule, ShippingFormComponent, BillingFormComponent],
  templateUrl: './profile-page.html', styleUrl: './profile-page.scss' })
export class ProfilePage implements OnInit {
  private users = inject(UserService);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  user: User | null = null;
  draft: ProfileUpdate | null = null;
  latest: User | null = null;
  nameForm = new FormGroup({ displayName: new FormControl('', { nonNullable: true,
    validators: [Validators.required, Validators.pattern(/\S/), Validators.maxLength(200)] }) });
  addressEditor: CustomerForm | null = null;
  billingEditor: CustomerForm | null = null;
  addressIndex: number | null = null;
  billingIndex: number | null = null;
  shipping: ShippingOptions | null = null;
  rucReady = false;
  loading = true;
  saving = false;
  error = '';
  notice = '';
  conflict = '';
  rowErrors: Record<string, string> = {};
  message = fieldMessage;

  ngOnInit(): void {
    this.nameForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearServerError(this.nameForm.controls.displayName));
    void this.load();
  }
  async load(): Promise<void> {
    this.loading = true; this.error = '';
    try {
      const user = await firstValueFrom(this.users.getMyProfile());
      if (!user) throw new Error('Perfil no encontrado');
      this.adopt(user);
    } catch { this.error = 'No pudimos cargar tu perfil. Intentá nuevamente.'; }
    finally { this.loading = false; this.cdr.markForCheck(); }
  }
  private adopt(user: User): void {
    this.user = user;
    this.draft = { version: user.version ?? '', displayName: user.displayName,
      addresses: structuredClone(user.addresses ?? []), billingProfiles: structuredClone(user.billingProfiles ?? []),
      defaultAddressId: user.defaultAddressId ?? null, defaultBillingProfileId: user.defaultBillingProfileId ?? null };
    this.nameForm.setValue({ displayName: user.displayName });
    this.addressEditor = null; this.billingEditor = null; this.conflict = ''; this.latest = null; this.rowErrors = {};
  }
  editAddress(index: number | null = null): void {
    this.addressIndex = index; this.shipping = null;
    this.addressEditor = shippingForm(index === null ? undefined : this.draft?.addresses[index]);
    if (index !== null) this.restoreFieldErrors(this.addressEditor, 'addresses', index);
  }
  applyAddress(): void {
    const form = this.addressEditor;
    if (!form || !this.draft || !this.shipping) return;
    form.markAllAsTouched(); if (form.invalid) return;
    const row: ShippingAddress = form.getRawValue();
    if (!this.shipping.requiresRecipientDocument) delete row.recipientDocument;
    if (this.addressIndex === null) this.draft.addresses.push(row);
    else this.draft.addresses[this.addressIndex] = { ...row, id: this.draft.addresses[this.addressIndex].id };
    if (this.draft.addresses.length === 1 && !row.id && !this.draft.defaultAddressId) this.draft.defaultAddressId = undefined;
    this.addressEditor = null; this.rowErrors = {}; this.notice = 'Dirección incorporada al borrador. Guardá los cambios para conservarla.';
  }
  removeAddress(index: number): void {
    if (!this.draft) return;
    const removed = this.draft.addresses.splice(index, 1)[0];
    if (removed.id === this.draft.defaultAddressId) this.draft.defaultAddressId = this.draft.addresses[0]?.id;
    if (!this.draft.addresses.length) this.draft.defaultAddressId = null;
    this.addressEditor = null; this.rowErrors = {};
  }
  editBilling(index: number | null = null): void {
    this.billingIndex = index; this.rucReady = false;
    this.billingEditor = billingForm(index === null ? undefined : this.draft?.billingProfiles[index]);
    if (index !== null) this.restoreFieldErrors(this.billingEditor, 'billingProfiles', index);
  }
  applyBilling(): void {
    const form = this.billingEditor;
    if (!form || !this.draft || !this.rucReady) return;
    form.markAllAsTouched(); if (form.invalid) return;
    const row: BillingProfile = form.getRawValue();
    if (this.billingIndex === null) this.draft.billingProfiles.push(row);
    else this.draft.billingProfiles[this.billingIndex] = { ...row, id: this.draft.billingProfiles[this.billingIndex].id };
    if (this.draft.billingProfiles.length === 1 && !row.id && !this.draft.defaultBillingProfileId) this.draft.defaultBillingProfileId = undefined;
    this.billingEditor = null; this.rowErrors = {}; this.notice = 'Datos incorporados al borrador. Guardá los cambios para conservarlos.';
  }
  removeBilling(index: number): void {
    if (!this.draft) return;
    const removed = this.draft.billingProfiles.splice(index, 1)[0];
    if (removed.id === this.draft.defaultBillingProfileId) this.draft.defaultBillingProfileId = this.draft.billingProfiles[0]?.id;
    if (!this.draft.billingProfiles.length) this.draft.defaultBillingProfileId = null;
    this.billingEditor = null; this.rowErrors = {};
  }
  rowError(list: string, index: number): string {
    return Object.entries(this.rowErrors).filter(([field]) => field.startsWith(list + '[' + index + ']')).map(([, message]) => message).join(' ');
  }
  private restoreFieldErrors(form: FormGroup, list: string, index: number): void {
    for (const [field, message] of Object.entries(this.rowErrors)) serverFieldError(form, field, message, list + '[' + index + ']');
  }
  async save(): Promise<void> {
    if (!this.draft || this.saving || this.conflict) return;
    this.nameForm.markAllAsTouched(); if (this.nameForm.invalid) return;
    if (this.addressEditor || this.billingEditor) { this.error = 'Aplicá o cancelá la edición abierta antes de guardar.'; return; }
    this.saving = true; this.error = ''; this.notice = ''; this.rowErrors = {};
    this.draft.displayName = this.nameForm.controls.displayName.value;
    try {
      const user = await this.users.updateMyProfile(structuredClone(this.draft)); this.adopt(user);
      this.notice = 'Tu perfil está guardado.';
    } catch (error) {
      const failure = error as CustomerFailure; const body = failure.error;
      const message = body?.error || 'No pudimos guardar tu perfil. Tu borrador se conserva.';
      if (failure.status === 409) this.conflict = message;
      else if (!serverFieldError(this.nameForm, body?.field, message)) {
        if (body?.field?.startsWith('addresses[') || body?.field?.startsWith('billingProfiles[')) this.rowErrors[body.field] = message;
        else this.error = message;
      }
    } finally { this.saving = false; this.cdr.markForCheck(); }
  }
  async inspectConflict(): Promise<void> {
    if (this.saving) return;
    this.saving = true;
    try { this.latest = await firstValueFrom(this.users.getMyProfile()) ?? null; }
    catch { this.error = 'No pudimos consultar la versión actual. Tu borrador se conserva.'; }
    finally { this.saving = false; this.cdr.markForCheck(); }
  }
  keepDraft(): void {
    if (!this.draft || !this.latest?.version) return;
    this.draft.version = this.latest.version; this.conflict = ''; this.latest = null;
    this.notice = 'Tu borrador se conserva. Revisalo antes de guardar: reemplazará las listas actuales.';
  }
  discardDraft(): void { if (this.latest) this.adopt(this.latest); }
}
