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
            <div class="password-field">
              <input
                id="password"
                name="password"
                [type]="showPassword() ? 'text' : 'password'"
                class="form-control"
                [(ngModel)]="password"
                required
                autocomplete="current-password"
                [disabled]="loading()"
                aria-required="true" />
              <button
                type="button"
                class="password-field__toggle"
                [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                [attr.aria-pressed]="showPassword()"
                [disabled]="loading()"
                (click)="togglePasswordVisibility()">
                @if (showPassword()) {
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c5.2 0 8.7 4 10 8a12.5 12.5 0 0 1-2.1 3.8M6.2 6.2C3.8 7.8 2.5 10.2 2 12c1.3 4 4.8 8 10 8 1 0 1.9-.1 2.7-.4" />
                  </svg>
                } @else {
                  <svg viewBox="0 0 24 24" aria-hidden="true">
                    <path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8S2 12 2 12Z" />
                    <circle cx="12" cy="12" r="3" />
                  </svg>
                }
              </button>
            </div>
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
    .password-field {
      position: relative;

      .form-control { padding-right: 2.75rem; }

      &__toggle {
        position: absolute;
        top: 50%;
        right: 0.75rem;
        display: inline-flex;
        align-items: center;
        justify-content: center;
        width: 1.5rem;
        height: 1.5rem;
        padding: 0;
        border: 0;
        background: transparent;
        color: var(--color-text-muted);
        cursor: pointer;
        transform: translateY(-50%);

        &:hover:not(:disabled), &:focus-visible {
          color: var(--color-text);
        }

        &:disabled { cursor: default; opacity: 0.6; }

        svg {
          width: 1.125rem;
          height: 1.125rem;
          fill: none;
          stroke: currentColor;
          stroke-linecap: round;
          stroke-linejoin: round;
          stroke-width: 1.7;
        }
      }
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
  showPassword = signal(false);

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

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
