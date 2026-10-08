import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject, ChangeDetectorRef } from '@angular/core';
import { FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, map, of, startWith, switchMap, tap, timer } from 'rxjs';
import { OrderService } from '@core/services/order.service';
import { ShippingOptions } from '@core/models/order.model';
import { clearServerError, CustomerFailure, fieldMessage, serverFieldError } from '@core/models/customer-form.util';

@Component({ selector: 'app-shipping-form', standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule],
  templateUrl: './shipping-form.component.html',
  styles: [':host { display: block; } .fields { display: grid; grid-template-columns: repeat(auto-fit, minmax(230px, 1fr)); gap: 12px; } .wide { grid-column: 1 / -1; } .delivery { padding: 12px; background: #fff5df; border-radius: 8px; }'] })
export class ShippingFormComponent implements OnInit {
  @Input({ required: true }) form!: FormGroup;
  @Output() shippingChange = new EventEmitter<ShippingOptions | null>();
  options: ShippingOptions | null = null;
  loading = false;
  error = '';
  message = fieldMessage;
  private service = inject(OrderService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);
  private documentRequiredValidators = [Validators.required, Validators.pattern(/\S/)];

  ngOnInit(): void {
    Object.values(this.form.controls).forEach(control => {
      control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => clearServerError(control));
    });
    this.form.controls['city'].valueChanges.pipe(startWith(this.form.controls['city'].value),
      map(value => String(value ?? '').trim()), distinctUntilChanged(),
      tap(city => { this.options = null; this.loading = Boolean(city); this.error = ''; this.shippingChange.emit(null); }),
      switchMap(city => city ? timer(250).pipe(switchMap(() => this.service.getShippingOptions(city)), catchError((failure: CustomerFailure) => {
        this.error = failure.error?.error || 'No pudimos consultar el tipo de envío. Intentá nuevamente.';
        serverFieldError(this.form, failure.error?.field, this.error, 'shippingAddress');
        return of(null);
      })) : of(null)), takeUntilDestroyed(this.destroyRef),
    ).subscribe(options => {
      this.options = options; this.loading = false;
      const document = this.form.controls['recipientDocument'];
      if (options?.requiresRecipientDocument) document.addValidators(this.documentRequiredValidators);
      else {
        document.removeValidators(this.documentRequiredValidators);
        if (options) clearServerError(document); // El envío local no utiliza este campo.
      }
      document.updateValueAndValidity({ emitEvent: false });
      this.shippingChange.emit(options); this.cdr.markForCheck();
    });
  }
  retry(): void {
    // Fuerza una consulta nueva incluso si la ciudad no cambió.
    const city = this.form.controls['city']; const value = city.value;
    city.setValue(''); city.setValue(value);
  }
}
