import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatListModule } from '@angular/material/list';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { AuthService } from '@core/auth/auth.service';
import { BillingAddress, ShippingAddress, User } from '@core/models/user.model';
import { Order, OrderItem, OrderStatus } from '@core/models/order.model';
import { UserService } from '@core/services/user.service';
import { OrderService } from '@core/services/order.service';
import { WhatsAppService } from '@core/services/whatsapp.service';
import { CartService, Cart } from '@core/services/cart.service';
import { NotificationService } from '@core/services/notification.service';
import { GuaraniPipe } from '@core/pipes/guarani.pipe';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-checkout-page',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatProgressSpinnerModule,
    MatListModule,
    MatCheckboxModule,
    MatIconModule,
    GuaraniPipe,
  ],
  templateUrl: './checkout-page.html',
  styleUrl: './checkout-page.scss',
})
export class CheckoutPage implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private userService = inject(UserService);
  private orderService = inject(OrderService);
  private whatsappService = inject(WhatsAppService);
  private cartService = inject(CartService);
  private notificationService = inject(NotificationService);
  private router = inject(Router);

  private cdr = inject(ChangeDetectorRef);

  user: User | null = null;
  cart$: Observable<Cart>;

  addressForm: FormGroup;
  billingAddressForm: FormGroup;
  sameAsShipping = true;
  isLoading = true;
  isSaving = false;
  isEditingProfile = false;

  constructor() {
    this.cart$ = this.cartService.getCart();
    this.addressForm = this.fb.group({
      displayName: ['', [Validators.required, Validators.minLength(3)]],
      street: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', [Validators.required, Validators.minLength(3)]],
      department: ['', [Validators.required, Validators.minLength(3)]],
      instructions: [''],
    });

    this.billingAddressForm = this.fb.group({
      street: ['', [Validators.required, Validators.minLength(5)]],
      city: ['', [Validators.required, Validators.minLength(3)]],
      department: ['', [Validators.required, Validators.minLength(3)]],
    });
  }

  ngOnInit(): void {
    this.loadInitialData();
  }

  loadInitialData(): void {
    this.isLoading = true;
    this.authService.verifySession().subscribe({
      next: (session) => {
        if (session && session.phone) {
          this.userService.getUserByPhone(session.phone).subscribe({
            next: (user) => {
              if (user) {
                this.user = user;
              } else {
                this.notificationService.showError('No se pudo encontrar el perfil de usuario.');
                this.router.navigate(['/login']);
              }

              this.isLoading = false;
              this.cdr.detectChanges();
            },
            error: (err) => {
              console.error('Error fetching user by phone:', err);
              this.notificationService.showError('Error al cargar los datos del usuario.');
              this.router.navigate(['/']);
              this.isLoading = false;
              this.cdr.detectChanges();
            },
          });
        } else {
          this.notificationService.showError('La sesión no es válida.');
          this.router.navigate(['/login']);
          this.isLoading = false;
          this.cdr.detectChanges();
        }
      },
      error: (err) => {
        console.error('Error verifying session:', err);
        this.notificationService.showError(
          'La sesión ha expirado. Por favor, inicie sesión de nuevo.',
        );
        this.router.navigate(['/login']);
        this.isLoading = false;
        this.cdr.detectChanges();
      },
    });
  }

  toggleBillingAddress(checked: boolean): void {
    this.sameAsShipping = checked;
    if (checked) {
      this.billingAddressForm.disable();
    } else {
      this.billingAddressForm.enable();
    }
  }

  editProfile(): void {
    if (!this.user || !this.user.addresses || this.user.addresses.length === 0) {
      return;
    }

    this.isEditingProfile = true;
    const currentAddress = this.user.addresses[0];

    this.addressForm.patchValue({
      displayName: this.user.displayName,
      street: currentAddress.street,
      city: currentAddress.city,
      department: currentAddress.department,
      instructions: currentAddress.instructions,
    });

    if (this.user.billingAddress) {
      // Comprobar si es diferente (simplificado)
      // En un caso real, compararíamos campo por campo o usaríamos un flag en la BD
      // Aquí asumimos que si existe billingAddress y no es igual a la de envío (lógica de negocio),
      // entonces son diferentes. Pero para simplificar, si hay billingAddress explícita, la mostramos.

      // Una mejor aproximación:
      const isSame =
        this.user.billingAddress.street === currentAddress.street &&
        this.user.billingAddress.city === currentAddress.city;
      // ... comparar otros campos si es necesario

      if (!isSame) {
        this.sameAsShipping = false;
        this.billingAddressForm.enable();
        this.billingAddressForm.patchValue({
          street: this.user.billingAddress.street,
          city: this.user.billingAddress.city,
          department: this.user.billingAddress.department,
        });
      } else {
        this.sameAsShipping = true;
        this.billingAddressForm.disable();
      }
    } else {
      this.sameAsShipping = true;
      this.billingAddressForm.disable();
    }
  }

  cancelEdit(): void {
    this.isEditingProfile = false;
    this.addressForm.reset();
    this.billingAddressForm.reset();
    this.sameAsShipping = true;
    this.billingAddressForm.disable();
  }

  saveProfile(): void {
    if (this.addressForm.invalid || !this.user) {
      this.addressForm.markAllAsTouched();
      return;
    }

    if (!this.sameAsShipping && this.billingAddressForm.invalid) {
      this.billingAddressForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;

    const formValues = this.addressForm.value;
    const billingValues = this.billingAddressForm.value;

    const newShippingAddress: ShippingAddress = {
      alias: 'Principal', // Asignamos un alias por defecto
      street: formValues.street,
      city: formValues.city,
      department: formValues.department,
      instructions: formValues.instructions,
    };

    let newBillingAddress: BillingAddress;

    if (this.sameAsShipping) {
      newBillingAddress = {
        alias: 'Principal',
        street: formValues.street,
        city: formValues.city,
        department: formValues.department,
      };
    } else {
      newBillingAddress = {
        alias: 'Facturación',
        street: billingValues.street,
        city: billingValues.city,
        department: billingValues.department,
      };
    }

    const updatedUser: Partial<User> = {
      displayName: formValues.displayName,
      addresses: [newShippingAddress],
      billingAddress: newBillingAddress,
      profile_status: 'complete',
    };

    this.userService
      .updateMyProfile(updatedUser)
      .then(() => {
        this.notificationService.showSuccess('¡Perfil actualizado con éxito!');
        // Volvemos a cargar los datos para reflejar el estado "complete"
        this.loadInitialData();
        this.isSaving = false;
        this.isEditingProfile = false;
        this.cdr.detectChanges();
      })
      .catch((err) => {
        console.error('Error updating user profile:', err);
        this.notificationService.showError('Hubo un error al guardar tu perfil.');
        this.isSaving = false;
        this.cdr.detectChanges();
      });
  }

  async placeOrder(cart: Cart): Promise<void> {
    if (!this.user || !this.user.addresses || this.user.addresses.length === 0) {
      this.notificationService.showError('Por favor, completa tu información de envío.');
      return;
    }

    this.isLoading = true;

    try {
      const orderItems: OrderItem[] = cart.items.map((item) => ({
        productId: item.product.id,
        productName: item.product.name,
        productSku: item.product.sku,
        quantity: item.quantity,
        price: item.product.price,
        selectedPackaging: item.selectedPackaging || null, // Usar null si es undefined para Firestore
        imageUrl: item.product.imageUrls?.[0] || '', // Usar la primera imagen o string vacío
      }));

      // Usamos una dirección de envío por defecto (la primera)
      const shippingAddress = this.user.addresses[0];

      // Calculamos el costo de envío (por ahora fijo o 0, según lógica de negocio)
      const shippingCost = 0;
      const total = cart.subtotal + shippingCost;

      const newOrder = {
        userId: this.user.uid,
        userDisplayName: this.user.displayName,
        userPhoneNumber: this.user.phoneNumber,
        items: orderItems,
        shippingAddress: shippingAddress,
        status: OrderStatus.Pending,
        subtotal: cart.subtotal,
        shippingCost: shippingCost,
        total: total,
      };

      // 1. Crear el pedido en el backend (valida, asigna orderNumber atómico, persiste y envía comprobante PDF)
      const res = await this.orderService.createOrder(newOrder);
      const officialOrderNumber = res.orderNumber;
      this.notificationService.showSuccess('Pedido creado correctamente');

      // 2. Enviar mensaje de estado inicial por WhatsApp en segundo plano
      this.whatsappService
        .updateOrderStatusByWhatsapp(this.user.phoneNumber, OrderStatus.Pending, newOrder.total)
        .subscribe({
          next: () => {
            console.log('Notificación de estado enviada');
          },
          error: (err) => {
            console.error('Error updating order status:', err);
          },
        });

      // 3. Confirmar al usuario, limpiar carrito y redirigir con el número de orden oficial
      this.notificationService.showSuccess(
        `¡Pedido ${officialOrderNumber} realizado con éxito! Te contactaremos por WhatsApp.`
      );

      this.cartService.clearCart();
      this.router.navigate(['/checkout/success'], { queryParams: { order: officialOrderNumber } });
    } catch (error) {
      console.error('Error placing order:', error);
      this.notificationService.showError(
        'Hubo un error al procesar tu pedido. Inténtalo de nuevo.'
      );
    } finally {
      this.isLoading = false;
      this.cdr.detectChanges();
    }
  }
}
