import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
  name: 'guarani'
})
export class GuaraniPipe implements PipeTransform {

  transform(value: number | undefined): string {
    if (value === undefined) {
      return '';
    }
    const formateador = new Intl.NumberFormat('es-PY', {
              style: 'currency',
              currency: 'PYG',
            });
    return formateador.format(value);
  }

}
