import { Component, Inject, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Subscription } from 'rxjs';

// Material Imports
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatCheckboxModule } from '@angular/material/checkbox';

// Model
import { User, UserRole } from '@core/models/user.model';

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    MatIconModule,
    MatDialogModule,
    MatExpansionModule,
    MatCheckboxModule,
  ],
  template: `
    <h2 mat-dialog-title>{{ data.user ? 'Editar Usuario' : 'Crear Nuevo Usuario' }}</h2>
    <mat-dialog-content class="mat-typography">
      <form [formGroup]="userForm">
        <mat-form-field appearance="outline">
          <mat-label>Nombre y Apellido</mat-label>
          <input matInput formControlName="displayName" required>
          @if (userForm.get('displayName')?.hasError('required')) {
            <mat-error>
              El nombre es requerido
            </mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Número de Teléfono (WhatsApp)</mat-label>
          <input matInput formControlName="phoneNumber" required>
          @if (userForm.get('phoneNumber')?.hasError('required')) {
            <mat-error>
              El número de teléfono es requerido
            </mat-error>
          }
        </mat-form-field>

        <mat-form-field appearance="outline">
          <mat-label>Rol</mat-label>
          <mat-select formControlName="role" required>
            @for (role of userRoles; track role) {
              <mat-option [value]="role">
                {{ role | titlecase }}
              </mat-option>
            }
          </mat-select>
          @if (userForm.get('role')?.hasError('required')) {
            <mat-error>
              El rol es requerido
            </mat-error>
          }
        </mat-form-field>

        <mat-accordion>
          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>
                Dirección de Envío
              </mat-panel-title>
            </mat-expansion-panel-header>
            <div formGroupName="shippingAddress">
              <mat-form-field appearance="outline">
                <mat-label>Casa u Oficina</mat-label>
                <input matInput formControlName="alias">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Dirección</mat-label>
                <input matInput formControlName="street">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Ciudad</mat-label>
                <input matInput formControlName="city">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Departamento</mat-label>
                <input matInput formControlName="department">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Código Postal</mat-label>
                <input matInput formControlName="postalCode">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Instrucciones</mat-label>
                <textarea matInput formControlName="instructions"></textarea>
              </mat-form-field>
            </div>
          </mat-expansion-panel>

          <mat-checkbox formControlName="sameAsShipping" class="same-as-shipping-checkbox">
            La dirección de facturación es la misma que la de envío
          </mat-checkbox>

          <mat-expansion-panel>
            <mat-expansion-panel-header>
              <mat-panel-title>
                Dirección de Facturación
              </mat-panel-title>
            </mat-expansion-panel-header>
            <div formGroupName="billingAddress">
              <mat-form-field appearance="outline">
                <mat-label>Casa u Oficina</mat-label>
                <input matInput formControlName="alias">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Dirección</mat-label>
                <input matInput formControlName="street">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Ciudad</mat-label>
                <input matInput formControlName="city">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Departamento</mat-label>
                <input matInput formControlName="department">
              </mat-form-field>
              <mat-form-field appearance="outline">
                <mat-label>Código Postal</mat-label>
                <input matInput formControlName="postalCode">
              </mat-form-field>
            </div>
          </mat-expansion-panel>
        </mat-accordion>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button (click)="onCancel()">Cancelar</button>
      <button mat-raised-button color="primary" (click)="onSave()" [disabled]="userForm.invalid">
        {{ data.user ? 'Guardar Cambios' : 'Crear Usuario' }}
      </button>
    </mat-dialog-actions>
  `,
  styles: [`
    form {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding: 16px 0;
    }
    div[formGroupName] {
      display: flex;
      flex-direction: column;
      gap: 16px;
      padding-top: 16px;
    }
    .same-as-shipping-checkbox {
      margin: 16px 0;
    }
  `]
})
export class UserFormDialogComponent implements OnInit, OnDestroy {
  userForm: FormGroup;
  userRoles = Object.values(UserRole);
  private subscriptions = new Subscription();

  constructor(
    public dialogRef: MatDialogRef<UserFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user: User | null },
    private fb: FormBuilder
  ) {
    this.userForm = this.fb.group({
      displayName: ['', Validators.required],
      phoneNumber: ['', Validators.required],
      role: [UserRole.Customer, Validators.required],
      sameAsShipping: [false],
      shippingAddress: this.fb.group({
        alias: [''],
        street: [''],
        city: [''],
        department: [''],
        postalCode: [''],
        instructions: [''],
      }),
      billingAddress: this.fb.group({
        alias: [''],
        street: [''],
        city: [''],
        department: [''],
        postalCode: [''],
      }),
    });
  }

  ngOnInit(): void {
    if (this.data.user) {
      const userData: any = { ...this.data.user };
      if (userData.addresses && userData.addresses.length > 0) {
        userData.shippingAddress = userData.addresses[0];
      }
      this.userForm.patchValue(userData);

      if (this.areAddressesEqual()) {
        this.userForm.get('sameAsShipping')?.setValue(true);
      }
    }
    this.setupAddressSync();
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
  }

  setupAddressSync(): void {
    const sameAsShippingCtrl = this.userForm.get('sameAsShipping');
    const shippingAddressCtrl = this.userForm.get('shippingAddress');
    const billingAddressCtrl = this.userForm.get('billingAddress');

    if (sameAsShippingCtrl && shippingAddressCtrl && billingAddressCtrl) {
      const sub1 = sameAsShippingCtrl.valueChanges.subscribe(isSame => {
        if (isSame) {
          billingAddressCtrl.patchValue(shippingAddressCtrl.value);
          billingAddressCtrl.disable();
        } else {
          billingAddressCtrl.reset();
          billingAddressCtrl.enable();
        }
      });

      const sub2 = shippingAddressCtrl.valueChanges.subscribe(value => {
        if (sameAsShippingCtrl.value) {
          billingAddressCtrl.patchValue(value);
        }
      });

      this.subscriptions.add(sub1);
      this.subscriptions.add(sub2);
    }
  }

  areAddressesEqual(): boolean {
    const shipping = this.userForm.get('shippingAddress')?.value;
    const billing = this.userForm.get('billingAddress')?.value;
    if (!shipping || !billing) {
      return false;
    }
    return shipping.alias === billing.alias &&
           shipping.street === billing.street &&
           shipping.city === billing.city &&
           shipping.department === billing.department &&
           shipping.postalCode === billing.postalCode;
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  onSave(): void {
    if (this.userForm.valid) {
      this.dialogRef.close(this.userForm.getRawValue());
    }
  }
}