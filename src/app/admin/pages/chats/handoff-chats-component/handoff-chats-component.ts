import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatTableModule } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ChatService, HandoffChat } from '@core/services/chat.service';
import { NotificationService } from '@core/services/notification.service';

@Component({
  selector: 'app-handoff-chats',
  standalone: true,
  imports: [
    CommonModule,
    MatCardModule,
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './handoff-chats-component.html',
  styleUrl: './handoff-chats-component.scss',
})
export class HandoffChatsComponent implements OnInit {
  private chatService = inject(ChatService);
  private notificationService = inject(NotificationService);
  private cdr = inject(ChangeDetectorRef);

  displayedColumns: string[] = ['customer', 'motivo', 'fecha', 'lastMessage', 'actions'];
  chats: HandoffChat[] = [];
  isLoading = true;
  resumingThreadId: string | null = null;

  ngOnInit(): void {
    this.loadChats();
  }

  loadChats(): void {
    this.isLoading = true;
    this.chatService.getHandoffChats().subscribe({
      next: (data) => {
        this.chats = data || [];
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Error cargando conversaciones en handoff:', err);
        this.notificationService.showError('No se pudieron cargar las conversaciones en atención humana.');
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  confirmResumeBot(chat: HandoffChat): void {
    const customerLabel = chat.userPhoneNumber
      ? `+${chat.userPhoneNumber}`
      : chat.whatsappChatId || chat.thread_id;

    const confirmed = confirm(
      `¿Estás seguro de que deseas reanudar el Asistente Virtual para ${customerLabel}?\n\nEl bot volverá a responder automáticamente sus próximos mensajes.`
    );

    if (!confirmed) return;

    this.resumingThreadId = chat.thread_id;
    this.cdr.detectChanges();

    this.chatService.resumeBot(chat.thread_id).subscribe({
      next: () => {
        this.notificationService.showSuccess(
          `Asistente virtual reanudado con éxito para ${customerLabel}.`
        );
        this.resumingThreadId = null;
        this.loadChats();
      },
      error: (err) => {
        console.error('Error reactivando bot:', err);
        const errorMsg =
          err.error?.error || 'Hubo un error al reanudar el asistente virtual.';
        this.notificationService.showError(errorMsg);
        this.resumingThreadId = null;
        this.cdr.detectChanges();
      },
    });
  }
}
