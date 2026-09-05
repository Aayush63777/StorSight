import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../../core/auth/auth.service';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';

@Component({
  selector: 'ss-login',
  standalone: true,
  imports: [CommonModule, FormsModule, ErrorBannerComponent],
  template: `
    <div class="login-page" role="main">
      <div class="login-card card">
        <div class="login-card__header">
          <h1 class="login-card__title">StorSight</h1>
          <p class="login-card__subtitle">Infrastructure Operational Intelligence</p>
        </div>

        <ss-error-banner
          [message]="errorMessage()"
          [dismissible]="true"
          (dismissed)="errorMessage.set(null)">
        </ss-error-banner>

        <form (ngSubmit)="onSubmit()" #loginForm="ngForm" novalidate aria-label="Login form">
          <div class="form-group">
            <label for="username">Username</label>
            <input
              id="username"
              name="username"
              type="text"
              class="form-control"
              [(ngModel)]="username"
              required
              autocomplete="username"
              [disabled]="loading()"
              aria-required="true" />
          </div>

          <div class="form-group">
            <label for="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              class="form-control"
              [(ngModel)]="password"
              required
              autocomplete="current-password"
              [disabled]="loading()"
              aria-required="true" />
          </div>

          <button
            type="submit"
            class="btn btn--primary"
            style="width: 100%"
            [disabled]="loading() || !username || !password"
            aria-label="Sign in">
            @if (loading()) {
              Signing in…
            } @else {
              Sign in
            }
          </button>
        </form>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: var(--color-surface-alt);
      padding: 1rem;
    }
    .login-card {
      width: 100%;
      max-width: 22rem;
      padding: 2rem;

      &__header { text-align: center; margin-bottom: 1.5rem; }
      &__title { font-size: 1.75rem; font-weight: 700; color: var(--color-primary); }
      &__subtitle { color: var(--color-text-muted); font-size: 0.875rem; margin-top: 0.25rem; }
    }
  `],
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);

  username = '';
  password = '';
  loading = signal(false);
  errorMessage = signal<string | null>(null);

  onSubmit(): void {
    if (!this.username || !this.password) return;

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(this.username, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err: HttpErrorResponse) => {
        this.loading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Invalid username or password.');
        } else if (err.status === 0) {
          this.errorMessage.set('Cannot connect to server. Please try again.');
        } else {
          this.errorMessage.set('Login failed. Please try again.');
        }
      },
    });
  }
}
