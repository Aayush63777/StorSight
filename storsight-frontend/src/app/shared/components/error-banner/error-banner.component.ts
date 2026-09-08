import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ss-error-banner',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="error-banner" role="alert" *ngIf="message">
      <span class="error-banner__icon" aria-hidden="true">⚠</span>
      <span class="error-banner__text">{{ message }}</span>
      <button
        *ngIf="dismissible"
        class="error-banner__dismiss"
        aria-label="Dismiss error"
        (click)="dismissed.emit()">
        ✕
      </button>
    </div>
  `,
  styles: [`
    .error-banner {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      padding: 0.75rem 1rem;
      background: var(--color-severity-critical-bg, #fee2e2);
      border: 1px solid var(--color-severity-critical, #ef4444);
      border-radius: var(--radius-md);
      color: var(--color-severity-critical-text, #ffa198);
      font-size: 0.875rem;
    }
    .error-banner__text { flex: 1; }
    .error-banner__dismiss {
      background: none;
      border: none;
      cursor: pointer;
      color: inherit;
      font-size: 1rem;
      line-height: 1;
      padding: 0;
    }
    .error-banner__dismiss:focus-visible {
      border-radius: var(--radius-sm);
      outline: 2px solid currentColor;
      outline-offset: 2px;
    }
  `],
})
export class ErrorBannerComponent {
  @Input() message: string | null | undefined;
  @Input() dismissible = false;
  @Output() dismissed = new EventEmitter<void>();
}
