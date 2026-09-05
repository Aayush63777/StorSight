import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';

@Component({
  selector: 'ss-not-found',
  standalone: true,
  imports: [RouterLink],
  template: `
    <div class="not-found" role="main">
      <div class="not-found__content">
        <span class="not-found__code" aria-hidden="true">404</span>
        <h1 class="not-found__title">Page not found</h1>
        <p class="not-found__message">
          The page you're looking for doesn't exist or has been moved.
        </p>
        <a class="btn btn--primary" routerLink="/dashboard">
          Return to Dashboard
        </a>
      </div>
    </div>
  `,
  styles: [`
    .not-found {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 60vh;
      text-align: center;
    }
    .not-found__content {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
    }
    .not-found__code {
      font-size: 6rem;
      font-weight: 800;
      color: var(--color-border-dark);
      line-height: 1;
    }
    .not-found__title {
      font-size: 1.5rem;
      font-weight: 600;
      margin: 0;
    }
    .not-found__message {
      color: var(--color-text-muted);
      margin: 0;
      max-width: 24rem;
    }
  `],
})
export class NotFoundComponent {}
