import { Component, Input } from '@angular/core';

@Component({
  selector: 'ss-loading-spinner',
  standalone: true,
  template: `
    <div class="spinner-wrapper" role="status" aria-live="polite">
      <div class="spinner" [class.spinner--sm]="size === 'sm'"></div>
      <span class="spinner__label">{{ label }}</span>
    </div>
  `,
  styles: [`
    .spinner-wrapper {
      display: flex;
      flex-direction: column;
      align-items: center;
      padding: 2rem;
      gap: 0.75rem;
    }
    .spinner {
      width: 2rem;
      height: 2rem;
      border: 3px solid var(--color-border);
      border-top-color: var(--color-primary);
      border-radius: 50%;
      animation: spin 0.7s linear infinite;
    }
    .spinner--sm { width: 1.25rem; height: 1.25rem; border-width: 2px; }
    .spinner__label { font-size: 0.875rem; color: var(--color-text-muted); }
    @keyframes spin { to { transform: rotate(360deg); } }
  `],
})
export class LoadingSpinnerComponent {
  @Input() label = 'Loading…';
  @Input() size: 'default' | 'sm' = 'default';
}
