import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ss-confirm-dialog',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dialog-backdrop" *ngIf="open" (click)="onBackdrop($event)">
      <div class="dialog" role="dialog" [attr.aria-label]="title">
        <h2 class="dialog__title">{{ title }}</h2>
        <p class="dialog__body">{{ message }}</p>
        <div class="dialog__actions">
          <button class="btn btn--ghost" (click)="cancelled.emit()">Cancel</button>
          <button class="btn btn--danger" (click)="confirmed.emit()">{{ confirmLabel }}</button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .dialog-backdrop {
      position: fixed; inset: 0;
      background: rgba(0,0,0,.4);
      display: flex; align-items: center; justify-content: center;
      z-index: 1000;
    }
    .dialog {
      background: var(--color-surface);
      border-radius: var(--radius-lg);
      padding: 1.5rem;
      width: min(90vw, 26rem);
      box-shadow: var(--shadow-lg);
    }
    .dialog__title { margin: 0 0 0.5rem; font-size: 1.125rem; }
    .dialog__body { margin: 0 0 1.25rem; color: var(--color-text-muted); font-size: 0.9rem; }
    .dialog__actions { display: flex; gap: 0.75rem; justify-content: flex-end; }
  `],
})
export class ConfirmDialogComponent {
  @Input() open = false;
  @Input() title = 'Confirm';
  @Input() message = 'Are you sure?';
  @Input() confirmLabel = 'Confirm';
  @Output() confirmed = new EventEmitter<void>();
  @Output() cancelled = new EventEmitter<void>();

  onBackdrop(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('dialog-backdrop')) {
      this.cancelled.emit();
    }
  }
}
