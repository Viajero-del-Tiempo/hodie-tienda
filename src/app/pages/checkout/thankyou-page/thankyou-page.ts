import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { RouterModule } from '@angular/router';
import { ActivatedRoute } from '@angular/router';

@Component({
  selector: 'app-thank-you-page',
  standalone: true,
  imports: [CommonModule, RouterModule, MatIconModule, MatButtonModule],
  templateUrl: './thankyou-page.html',
  styleUrls: ['./thankyou-page.scss'],
})
export class ThankYouPage implements OnInit {
  orderNumber: string | null = null;
  private route = inject(ActivatedRoute);

  ngOnInit(): void {
    this.orderNumber = this.route.snapshot.queryParamMap.get('order');
  }
}
