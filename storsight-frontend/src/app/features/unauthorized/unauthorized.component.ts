import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ss-unauthorized',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="unauthorized" role="main">
      <div class="unauthorized__content">
        <span class="unauthorized__code" aria-hidden="true">403</span>
        <h1 class="unauthorized__title">Access denied</h1>
        <p class="unauthorized__message">
          You don't have permission to view this page.
        </p>
        <a class="btn btn--primary" routerLink="/dashboard">
          Return to Dashboard
        </a>
      </div>
    </div>
  `,
  styles: [`
    .unauthorized {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      text-align: center;
    }
    .unauthorized__content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .unauthorized__code {
      font-size: 6rem;
      font-weight: 800;
      color: var(--color-severity-medium);
      line-height: 1;
    }
    .unauthorized__title {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }
    .unauthorized__message {
      color: var(--color-text-muted);
      margin: 0;
      max-width: 24rem;
    }
  `],
})
export class UnauthorizedComponent {}
