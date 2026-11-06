import { CommonModule } from '@angular/common';
import { Component, DestroyRef, OnInit, inject, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router, RouterModule } from '@angular/router';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { firstValueFrom } from 'rxjs';
import { ShippingAddress, User } from '@core/models/user.model';
import { CreateOrderRequest, ShippingOptions } from '@core/models/order.model';
import { billingForm, CustomerFailure, serverFieldError, shippingForm } from '@core/models/customer-form.util';
import { variantLabel } from '@core/models/catalog.util';
import { UserService } from '@core/services/user.service';
import { CreateOrderResponse, OrderService } from '@core/services/order.service';
import { CartService, Cart } from '@core/services/cart.service';
import { NotificationService } from '@core/services/notification.service';
import { GuaraniPipe } from '@core/pipes/guarani.pipe';
import { ShippingFormComponent } from '../../../shared/components/shipping-form/shipping-form.component';
import { BillingFormComponent } from '../../../shared/components/billing-form/billing-form.component';

@Component({ selector: 'app-checkout-page', standalone: true,
  imports: [CommonModule, FormsModule, RouterModule, MatCardModule, MatButtonModule, MatSelectModule, MatFormFieldModule,
    MatProgressSpinnerModule, MatCheckboxModule, GuaraniPipe, ShippingFormComponent, BillingFormComponent],
  templateUrl: './checkout-page.html', styleUrl: './checkout-page.scss' })
export class CheckoutPage implements OnInit {
  private users = inject(UserService);
  private orders = inject(OrderService);
  private cartService = inject(CartService);
  private notifications = inject(NotificationService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private destroyRef = inject(DestroyRef);
  user: User | null = null;
  cart$ = this.cartService.getCart();
  label = variantLabel;
  addressForm = shippingForm();
  billingForm = billingForm();
  selectedAddress = 'new';
  selectedBilling = 'new';
  saveShippingAddress = true;
  saveBillingProfile = false;
  invoiceRequested = false;
  shipping: ShippingOptions | null = null;
  rucReady = false;
  isLoading = true;
  isSaving = false;
  isReviewing = false;
  catalogErrors: string[] = [];
  catalogNotice = '';
  error = '';
  completedOrder: CreateOrderResponse | null = null;

  ngOnInit(): void { this.loadInitialData(); void this.reviewCart(); }
  loadInitialData(): void {
    this.isLoading = true; this.error = '';
    this.users.getMyProfile().pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: user => {
        this.user = user ?? null;
        if (user) {
          this.saveShippingAddress = !user.addresses?.length;
          this.chooseAddress(user.defaultAddressId ?? user.addresses?.[0]?.id ?? 'new');
          this.chooseBilling(user.defaultBillingProfileId ?? user.billingProfiles?.[0]?.id ?? 'new');
        } else this.error = 'No pudimos encontrar tu perfil. Volvé a iniciar sesión.';
        this.isLoading = false; this.cdr.markForCheck();
      }, error: () => { this.error = 'No pudimos cargar tus datos. Intentá nuevamente.'; this.isLoading = false; this.cdr.markForCheck(); },
    });
  }
  chooseAddress(id: string): void {
    this.selectedAddress = id; this.shipping = null;
    this.addressForm = shippingForm(this.user?.addresses?.find(address => address.id === id));
  }
  chooseBilling(id: string): void {
    this.selectedBilling = id; this.rucReady = false;
    this.billingForm = billingForm(this.user?.billingProfiles?.find(profile => profile.id === id));
  }
  async reviewCart(): Promise<void> {
    this.isReviewing = true;
    try {
      const result = await this.cartService.refreshCatalog(); this.catalogErrors = result.errors;
      if (result.changed) this.catalogNotice = 'Actualizamos los precios y datos del carrito. Revisá el resumen antes de confirmar.';
    } catch { this.catalogErrors = ['No se pudo revisar el catálogo. Intentá nuevamente.']; }
    finally { this.isReviewing = false; this.cdr.markForCheck(); }
  }
  async placeOrder(_cart: Cart): Promise<void> {
    if (this.isLoading || this.isReviewing || this.isSaving || this.completedOrder) return;
    this.addressForm.markAllAsTouched();
    if (this.invoiceRequested) this.billingForm.markAllAsTouched();
    if (this.addressForm.invalid || !this.shipping || (this.invoiceRequested && (this.billingForm.invalid || !this.rucReady))) {
      this.error = 'Revisá los campos señalados y las confirmaciones antes de continuar.'; return;
    }
    this.isSaving = true; this.error = '';
    let response: CreateOrderResponse;
    try {
      const review = await this.cartService.refreshCatalog(); this.catalogErrors = review.errors;
      if (!review.valid) return;
      if (review.changed) { this.catalogNotice = 'Actualizamos los precios y datos del carrito. Revisá el resumen y confirmá nuevamente.'; return; }
      const cart = this.cartService.snapshot;
      if (!cart.items.length) return;
      if (!this.shipping || this.addressForm.invalid || (this.invoiceRequested && (!this.rucReady || this.billingForm.invalid))) return;
      // La modalidad del payload corresponde a la ciudad actual, confirmada por
      // el backend. La cédula sigue en el formulario si se cambia de ciudad.
      const enteredAddress: ShippingAddress = this.addressForm.getRawValue();
      const shipping = await firstValueFrom(this.orders.getShippingOptions(enteredAddress.city));
      this.shipping = shipping;
      const { recipientDocument, ...localAddress } = enteredAddress;
      const address: ShippingAddress = shipping.shippingMethod === 'transportadora_contra_entrega'
        ? { ...localAddress, recipientDocument } : localAddress;
      const { alias: _alias, ...fiscal } = this.billingForm.getRawValue();
      const payload: CreateOrderRequest = {
        items: cart.items.map(item => ({ productId: item.productId, variantId: item.variantId, quantity: item.quantity,
          packagingType: item.selectedPackaging?.type ?? null, customization: item.customization,
          customizationPending: item.customizationPending,
          customizationImagePending: item.product.customization.allowed && item.product.customization.allowsImage })),
        shippingAddress: address, billing: this.invoiceRequested ? { invoiceRequested: true, ...fiscal } : { invoiceRequested: false },
        saveShippingAddress: this.saveShippingAddress, saveBillingProfile: this.invoiceRequested && this.saveBillingProfile,
      };
      response = await this.orders.createOrder(payload);
      this.completedOrder = response;
      this.cartService.clearCart();
    } catch (error) {
      const failure = error as CustomerFailure;
      const message = failure.error?.error || 'No pudimos procesar el pedido. Intentá nuevamente.';
      if (!serverFieldError(this.addressForm, failure.error?.field, message, 'shippingAddress')
        && !serverFieldError(this.billingForm, failure.error?.field, message, 'billing')) {
        if (failure.status === 400) this.catalogErrors = [message]; else this.error = message;
      }
      return;
    } finally { this.isSaving = false; this.cdr.markForCheck(); }
    // El pedido ya está guardado; una falla de navegación no habilita otra compra.
    this.notifications.showSuccess('¡Pedido ' + response.orderNumber + ' realizado con éxito!');
    try {
      await this.router.navigate(['/checkout/success'], { queryParams: { order: response.orderNumber },
        state: { orderTotal: response.total, orderId: response.orderId, profileWarning: response.profileWarning } });
    } catch { this.error = 'Tu pedido está guardado. Podés verlo en Mis pedidos.'; }
  }
}
