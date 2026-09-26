import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MAT_DIALOG_DATA, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

export interface ResumeBotDialogData {
  customerLabel: string;
  motivo?: string;
  threadId: string;
}

@Component({
  selector: 'app-resume-bot-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <div class="resume-dialog">
      <div class="dialog-header">
        <div class="header-icon-box">
          <mat-icon class="header-icon">smart_toy</mat-icon>
        </div>
        <div class="header-text">
          <h2 mat-dialog-title class="dialog-title">Reanudar Asistente Virtual</h2>
          <span class="dialog-subtitle">Atención automatizada</span>
        </div>
      </div>

      <mat-dialog-content class="dialog-body">
        <p class="confirmation-text">
          ¿Deseas reactivar el bot para el cliente
          <strong>{{ data.customerLabel }}</strong>?
        </p>

        <div class="info-card">
          <div class="info-item">
            <mat-icon class="info-icon">check_circle_outline</mat-icon>
            <span>El asistente virtual volverá a responder automáticamente sus próximos mensajes.</span>
          </div>
          @if (data.motivo) {
            <div class="info-item reason-item">
              <mat-icon class="info-icon reason-icon">report_problem</mat-icon>
              <span><strong>Motivo previo:</strong> {{ data.motivo }}</span>
            </div>
          }
        </div>
      </mat-dialog-content>

      <mat-dialog-actions align="end" class="dialog-actions">
        <button mat-button [mat-dialog-close]="false" class="cancel-btn">
          Cancelar
        </button>
        <button mat-flat-button color="primary" [mat-dialog-close]="true" class="confirm-btn">
          <mat-icon>play_arrow</mat-icon>
          Reanudar Asistente
        </button>
      </mat-dialog-actions>
    </div>
  `,
  styles: [`
    .resume-dialog {
      padding: 0.5rem 0.25rem;
    }
    .dialog-header {
      display: flex;
      align-items: center;
      gap: 1rem;
      margin-bottom: 0.5rem;
    }
    .header-icon-box {
      width: 48px;
      height: 48px;
      border-radius: 12px;
      background-color: #fef3c7;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
    }
    .header-icon {
      color: #d97706;
      font-size: 28px;
      width: 28px;
      height: 28px;
    }
    .header-text {
      display: flex;
      flex-direction: column;
    }
    .dialog-title {
      margin: 0 !important;
      padding: 0 !important;
      font-size: 1.25rem !important;
      font-weight: 600 !important;
      color: #1e293b;
      line-height: 1.3 !important;
    }
    .dialog-subtitle {
      font-size: 0.85rem;
      color: #64748b;
    }
    .dialog-body {
      padding: 1rem 0 !important;
      margin: 0;
    }
    .confirmation-text {
      font-size: 1rem;
      color: #334155;
      margin: 0 0 1rem 0;
      line-height: 1.5;
      strong {
        color: #0f172a;
      }
    }
    .info-card {
      background-color: #f8fafc;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 0.875rem;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
    }
    .info-item {
      display: flex;
      align-items: flex-start;
      gap: 0.5rem;
      font-size: 0.875rem;
      color: #475569;
      line-height: 1.4;
    }
    .info-icon {
      font-size: 18px;
      width: 18px;
      height: 18px;
      color: #10b981;
      margin-top: 1px;
      flex-shrink: 0;
    }
    .reason-item {
      color: #991b1b;
    }
    .reason-icon {
      color: #dc2626;
    }
    .dialog-actions {
      padding: 0.75rem 0 0 0 !important;
      margin: 0 !important;
      gap: 0.5rem;
    }
    .confirm-btn {
      border-radius: 8px;
      font-weight: 500;
    }
    .cancel-btn {
      border-radius: 8px;
      color: #64748b;
    }
  `],
})
export class ResumeBotDialogComponent {
  constructor(
    public dialogRef: MatDialogRef<ResumeBotDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: ResumeBotDialogData
  ) {}
}
