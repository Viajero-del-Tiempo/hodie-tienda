export interface PaymentReceipt {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
  receivedAt: number;
  verification: 'pending_manual';
}
