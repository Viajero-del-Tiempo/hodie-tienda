import { Component, DestroyRef, EventEmitter, Input, OnInit, Output, inject, ChangeDetectorRef } from '@angular/core';
import { FormGroup, ReactiveFormsModule } from '@angular/forms';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { catchError, distinctUntilChanged, map, of, startWith, switchMap, tap, timer } from 'rxjs';
import { UserService } from '@core/services/user.service';
import { RucAnalysis } from '@core/models/user.model';
import { clearServerError, CustomerFailure, fieldMessage, serverFieldError } from '@core/models/customer-form.util';

@Component({ selector: 'app-billing-form', standalone: true,
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatCheckboxModule],
  templateUrl: './billing-form.component.html',
  styles: [':host { display: block; } mat-form-field { display: block; } .confirmation { padding: 14px; border: 1px solid #b4771b; border-radius: 8px; margin-bottom: 16px; }'] })
export class BillingFormComponent implements OnInit {
  @Input({ required: true }) form!: FormGroup;
  @Output() validationReady = new EventEmitter<boolean>();
  analysis: RucAnalysis | null = null;
  loading = false;
  error = '';
  message = fieldMessage;
  private service = inject(UserService);
  private destroyRef = inject(DestroyRef);
  private cdr = inject(ChangeDetectorRef);

  ngOnInit(): void {
    Object.entries(this.form.controls).forEach(([name, control]) => {
      control.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
        clearServerError(control);
        if (name === 'confirmedRuc' || name === 'acknowledgeRucMismatch') clearServerError(this.form.controls['ruc']);
      });
    });
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => this.emitReady());
    this.form.controls['ruc'].valueChanges.pipe(startWith(this.form.controls['ruc'].value),
      map(value => String(value ?? '').trim()), distinctUntilChanged(),
      tap(ruc => {
        this.analysis = null; this.error = ''; this.loading = Boolean(ruc);
        this.form.patchValue({ confirmedRuc: '', acknowledgeRucMismatch: false }, { emitEvent: false }); this.emitReady();
      }), switchMap(ruc => ruc && /^\d+(?:-\d)?$/.test(ruc)
        ? timer(250).pipe(switchMap(() => this.service.validateRuc(ruc)), catchError((failure: CustomerFailure) => {
          this.error = failure.error?.error || 'No pudimos validar el RUC. Intentá nuevamente.';
          serverFieldError(this.form, failure.error?.field, this.error); return of(null);
        })) : of(null)), takeUntilDestroyed(this.destroyRef),
    ).subscribe(analysis => { this.analysis = analysis; this.loading = false; this.emitReady(); this.cdr.markForCheck(); });
  }
  private emitReady(): void {
    const state = this.analysis;
    this.validationReady.emit(Boolean(state && state.ruc === String(this.form.controls['ruc'].value).trim()
      && (state.status === 'valid' || (state.status === 'confirmation_required' && this.form.controls['confirmedRuc'].value === state.suggestedRuc)
        || (state.status === 'mismatch' && this.form.controls['acknowledgeRucMismatch'].value === true))));
  }
  confirm(): void {
    if (this.analysis?.status === 'confirmation_required') this.form.controls['confirmedRuc'].setValue(this.analysis.suggestedRuc);
  }
  correct(): void { this.form.controls['ruc'].setValue(''); this.form.controls['ruc'].markAsTouched(); }
  trimRuc(): void {
    const control = this.form.controls['ruc']; const trimmed = String(control.value).trim();
    if (trimmed !== control.value) control.setValue(trimmed);
  }
  retry(): void { const ruc = this.form.controls['ruc']; const value = ruc.value; ruc.setValue(''); ruc.setValue(value); }
}
