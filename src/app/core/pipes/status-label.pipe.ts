import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'statusLabel',
  standalone: true,
})
export class StatusLabelPipe implements PipeTransform {

  private readonly labels: Record<string, string> = {
    'pending': 'Pendiente',
    'paid': 'Pagado',
    'preparing': 'Preparando',
    'shipped': 'Enviado',
    'delivered': 'Entregado',
    'cancelled': 'Cancelado'
  };

  transform(value: string): string {
    return this.labels[value] ?? 'Estado no válido';
  }
}
