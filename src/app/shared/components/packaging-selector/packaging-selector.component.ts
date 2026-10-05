import { Component, EventEmitter, Input, Output } from '@angular/core';
import { MatRadioModule } from '@angular/material/radio';
import { CatalogPackagingOption } from '../../../core/models/catalog.model';
import { GuaraniPipe } from '../../../core/pipes/guarani.pipe';

@Component({
  selector: 'app-packaging-selector', standalone: true, imports: [MatRadioModule, GuaraniPipe],
  templateUrl: './packaging-selector.component.html', styleUrl: './packaging-selector.component.scss',
})
export class PackagingSelectorComponent {
  @Input() options: CatalogPackagingOption[] = [];
  @Input() selected: CatalogPackagingOption | null = null;
  @Output() selectedChange = new EventEmitter<CatalogPackagingOption | null>();

  choose(type: string | null): void {
    this.selectedChange.emit(type === null ? null : this.options.find(option => option.type === type) ?? null);
  }
}
