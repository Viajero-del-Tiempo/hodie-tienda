import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { GuaraniPipe } from '@core/pipes/guarani.pipe';

@Component({
  selector: 'app-thank-you-page',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule, GuaraniPipe],
  templateUrl: './thankyou-page.html',
  styleUrls: ['./thankyou-page.scss'],
})
export class ThankYouPage implements OnInit {
  orderNumber: string | null = null;
  orderTotal: number | null = null;
  orderId: string | null = null;
  profileWarning = '';
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.orderNumber = this.route.snapshot.queryParamMap.get('order');
    const total = globalThis.history.state?.orderTotal;
    this.orderTotal = Number.isSafeInteger(total) && total >= 0 ? total : null;
    this.orderId = typeof globalThis.history.state?.orderId === 'string' ? globalThis.history.state.orderId : null;
    this.profileWarning = globalThis.history.state?.profileWarning ?? '';
  }
}
