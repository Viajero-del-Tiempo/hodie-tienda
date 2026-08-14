import { Component, Inject } from '@angular/core';
import { CommonModule, DatePipe, TitleCasePipe } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';

// Material Imports
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatListModule } from '@angular/material/list';
import { MatDialogModule } from '@angular/material/dialog'; // Import MatDialogModule

// Model
import { User, ShippingAddress, BillingAddress } from '@core/models/user.model';

@Component({
  selector: 'app-user-detail-dialog',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatCardModule,
    MatListModule,
    MatDialogModule, // Add MatDialogModule to imports
    DatePipe,
    TitleCasePipe,
  ],
  template: `
    <h2 mat-dialog-title>Detalles del Usuario</h2>
    <mat-dialog-content class="mat-typography">
      @if (user) {
      <mat-card class="mat-card" appearance="outlined">
        <mat-card-header>
          <mat-card-title>{{ user.displayName }}</mat-card-title>
          <mat-card-subtitle>{{ user.role | titlecase }}</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <mat-list dense>
            <mat-list-item>
              <mat-icon matListItemIcon>phone</mat-icon>
              <div matListItemTitle>Teléfono:</div>
              <div matListItemLine>{{ user.phoneNumber }}</div>
            </mat-list-item>
            <mat-list-item>
              <mat-icon matListItemIcon>verified</mat-icon>
              <div matListItemTitle>WhatsApp Verificado:</div>
              <div matListItemLine>{{ user.whatsapp_verified ? 'Sí' : 'No' }}</div>
            </mat-list-item>
            <mat-list-item>
              <mat-icon matListItemIcon>person_outline</mat-icon>
              <div matListItemTitle>Estado del Perfil:</div>
              <div matListItemLine>
                {{ user.profile_status === 'complete' ? ('completo' | titlecase) : ('incompleto' | titlecase) }}
              </div>
            </mat-list-item>
            <mat-list-item>
              <mat-icon matListItemIcon>event</mat-icon>
              <div matListItemTitle>Fecha de Registro:</div>
              <div matListItemLine>{{ user.createdAt.toDate() | date : 'medium' }}</div>
            </mat-list-item>
          </mat-list>

          <mat-divider></mat-divider>

          <h3 class="section-title">Direcciones de Envío</h3>
          @if (user.addresses && user.addresses.length > 0) {
          <mat-list dense>
            @for (address of user.addresses; track address.alias) {
            <mat-list-item>
              <mat-icon matListItemIcon>location_on</mat-icon>
              <div matListItemTitle>Dirección {{ $index + 1 }} ({{ address.alias }}):</div>
              <div matListItemLine>
                {{ address.street }}, {{ address.city }}, {{ address.department }}
              </div>
              @if (address.postalCode) {
              <div matListItemLine>C.P.: {{ address.postalCode }}</div>
              } @if (address.instructions) {
              <div matListItemLine>Instrucciones: {{ address.instructions }}</div>
              }
            </mat-list-item>
            }
          </mat-list>
          } @else {
          <p class="no-data">No hay direcciones de envío registradas.</p>
          }

          <mat-divider></mat-divider>

          <h3 class="section-title">Dirección de Facturación</h3>
          @if (user.billingAddress) {
          <mat-list dense>
            <mat-list-item>
              <mat-icon matListItemIcon>receipt</mat-icon>
              <div matListItemTitle>Dirección ({{ user.billingAddress.alias }}):</div>
              <div matListItemLine>
                {{ user.billingAddress.street }}, {{ user.billingAddress.city }},
                {{ user.billingAddress.department }}
              </div>
              @if (user.billingAddress.postalCode) {
              <div matListItemLine>C.P.: {{ user.billingAddress.postalCode }}</div>
              }
            </mat-list-item>
          </mat-list>
          } @else {
          <p class="no-data">No hay dirección de facturación registrada.</p>
          }
        </mat-card-content>
      </mat-card>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button matButton="elevated" (click)="onClose()">Cerrar</button>
    </mat-dialog-actions>
  `,
  styles: [
    `
      @use '@angular/material' as mat;
      :host {
        display: block;
        background-color: #f5f5f5;
      }
      .mat-typography {
        padding: 20px;
      }
      .mat-card {
        margin-bottom: 20px;
        padding: 1rem; // Espaciado interno
        @include mat.card-overrides(
          (
            outlined-outline-color: #f59e0b,
            outlined-container-color: #ffffff,
          )
        );
      }
      .section-title {
        margin-top: 20px;
        margin-bottom: 10px;
        font-weight: 500;
      }
      .no-data {
        font-style: italic;
        color: #757575;
        margin-left: 16px;
      }
      mat-list-item {
        margin-bottom: 8px;
      }
      mat-list-item .mat-icon {
        margin-right: 16px;
        color: #7d5725; /* Example icon color */
      }
    `,
  ],
})
export class UserDetailDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<UserDetailDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user: User }
  ) {}

  get user(): User {
    return this.data.user;
  }

  onClose(): void {
    this.dialogRef.close();
  }
}
