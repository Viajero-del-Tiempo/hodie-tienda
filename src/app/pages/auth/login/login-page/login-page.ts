import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { UserService } from '@core/services/user.service';
import { NotificationService } from '@core/services/notification.service';
import { lastValueFrom } from 'rxjs';

@Component({
  selector: 'app-login-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './login-page.html',
  styleUrl: './login-page.scss',
})
export class LoginPage {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  loginForm: FormGroup;
  codeSent = false;
  isLoading = false;
  errorMessage: string | null = null;

  constructor() {
    this.loginForm = this.fb.group({
      phone: ['', [Validators.required, Validators.pattern('^09[0-9]{8}$')]],
      code: ['', [Validators.required, Validators.minLength(4)]],
    });
  }

  private formatPhoneNumber(localPhone: string): string {
    if (localPhone.startsWith('0')) {
      return `595${localPhone.substring(1)}`;
    }
    // If it's already in international format or another format,
    // we can add more logic here, but for now, we assume it's local.
    return localPhone;
  }

  requestWhatsappCode() {
    if (this.loginForm.get('phone')?.invalid) {
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;
    const localPhone = this.loginForm.get('phone')?.value;
    const formattedPhone = this.formatPhoneNumber(localPhone);

    this.authService.requestWhatsappCode(formattedPhone).subscribe({
      next: () => {
        this.codeSent = true;
        this.isLoading = false;
      },
      error: (err) => {
        this.errorMessage = err.error?.message || 'Ocurrió un error al solicitar el código.';
        console.error(err);
        this.isLoading = false;
      },
    });
  }

  async verifyWhatsappCode() {
    if (this.loginForm.invalid) {
      return;
    }
    this.isLoading = true;
    this.errorMessage = null;
    const { phone, code } = this.loginForm.value;
    const formattedPhone = this.formatPhoneNumber(phone);

    try {
      // 1. Verificar el código de WhatsApp (el backend valida OTP y asegura el registro del usuario con Admin SDK)
      await lastValueFrom(this.authService.verifyWhatsappCode(formattedPhone, code));

      // 2. Obtener perfil autenticado para saludo personalizado
      const user = await lastValueFrom(this.userService.getUserByPhone(formattedPhone));

      if (user?.displayName) {
        this.notificationService.showSuccess(`¡Bienvenido de nuevo, ${user.displayName}!`);
      } else {
        this.notificationService.showSuccess('Sesión iniciada correctamente.');
      }

      // 3. Navegar a /cart
      this.router.navigate(['/cart']);
    } catch (err: any) {
      console.error('Error durante la verificación/creación de login:', err);
      this.errorMessage = err?.error || err?.message || 'Código de verificación incorrecto o expirado.';
    } finally {
      this.isLoading = false;
    }
  }

  verifySession() {
    this.authService.verifySession().subscribe({
      next: (res) => {
        console.log(res.phone);
      },
      error: (err) => {
        console.log(err);
        this.errorMessage = 'Sesión expirada o no válida.';
        console.error(err.error);
      },
    });
  }
}
