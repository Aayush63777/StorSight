import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ss-page-header',
  standalone: true,
  imports: [CommonModule],
  template: `
    <header class="page-header">
      <div class="page-header__text">
        <h1 class="page-header__title">{{ title }}</h1>
        <p class="page-header__subtitle" *ngIf="subtitle">{{ subtitle }}</p>
      </div>
      <div class="page-header__actions">
        <ng-content></ng-content>
      </div>
    </header>
  `,
  styles: [`
    .page-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      gap: 1rem;
      margin-bottom: 1.5rem;
      flex-wrap: wrap;
    }
    .page-header__title { margin: 0; font-size: 1.5rem; font-weight: 600; }
    .page-header__subtitle { margin: 0.25rem 0 0; color: var(--color-text-muted); font-size: 0.875rem; }
    .page-header__actions { display: flex; gap: 0.5rem; align-items: center; }
  `],
})
export class PageHeaderComponent {
  @Input() title = '';
  @Input() subtitle: string | undefined;
}
