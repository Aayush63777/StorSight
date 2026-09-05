import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ss-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="empty-state">
      <div class="empty-state__icon" aria-hidden="true">{{ icon }}</div>
      <p class="empty-state__message">{{ message }}</p>
      <p class="empty-state__sub" *ngIf="subMessage">{{ subMessage }}</p>
    </div>
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 3rem 1rem;
      color: var(--color-text-muted);
      text-align: center;
    }
    .empty-state__icon { font-size: 2.5rem; margin-bottom: 0.75rem; }
    .empty-state__message { font-size: 1rem; font-weight: 500; margin: 0; }
    .empty-state__sub { font-size: 0.875rem; margin: 0.25rem 0 0; }
  `],
})
export class EmptyStateComponent {
  @Input() message = 'No data found.';
  @Input() subMessage: string | undefined;
  @Input() icon = '📭';
}
