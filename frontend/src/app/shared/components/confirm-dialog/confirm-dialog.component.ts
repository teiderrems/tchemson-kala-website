import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

import { ScrollRevealDirective } from '../../directives/scroll-reveal.directive';

@Component({
  selector: 'app-confirm-dialog',
  standalone: true,
  imports: [CommonModule, ScrollRevealDirective],
  templateUrl: './confirm-dialog.component.html',
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Confirmer l action';
  @Input() message = 'Voulez-vous continuer ?';
  @Input() cancelText = 'Annuler';
  @Input() confirmText = 'Confirmer';
  @Input() destructive = true;

  @Output() cancelled = new EventEmitter<void>();
  @Output() confirmed = new EventEmitter<void>();
}
