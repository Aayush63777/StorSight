import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../../core/auth/auth.service';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';

@Component({
  selector: 'ss-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ErrorBannerComponent],
  template: `
    <main class="login-page">
      <div class="login-shell">
        <section class="login-intro" aria-labelledby="brand-title">
          <div class="brand-lockup">
            <span class="brand-mark" aria-hidden="true">
              <span></span><span></span><span></span>
            </span>
            <span class="brand-name">StorSight</span>
          </div>

          <div class="intro-copy">
            <p class="eyebrow">Infrastructure operations platform</p>
            <h1 id="brand-title">See the signal.<br /><em>Resolve the incident.</em></h1>
            <p class="intro-copy__description">
              Bring resources, alerts, events, and incident intelligence into one clear operational view.
            </p>
          </div>

          <div class="signal-map" aria-hidden="true">
            <span class="signal-map__line signal-map__line--one"></span>
            <span class="signal-map__line signal-map__line--two"></span>
            <span class="signal-map__node signal-map__node--one"></span>
            <span class="signal-map__node signal-map__node--two"></span>
            <span class="signal-map__node signal-map__node--three"></span>
            <span class="signal-map__node signal-map__node--four"></span>
            <span class="signal-map__label signal-map__label--one">resources</span>
            <span class="signal-map__label signal-map__label--two">events</span>
            <span class="signal-map__label signal-map__label--three">incident</span>
          </div>

          <div class="intro-footer">
            <span class="status-dot" aria-hidden="true"></span>
            <span>Operational intelligence, built for clarity</span>
          </div>
        </section>

        <section class="login-panel" aria-labelledby="sign-in-title">
          <div class="login-panel__header">
            <p class="eyebrow">Secure workspace</p>
            <h2 id="sign-in-title">Welcome back</h2>
            <p>Sign in to continue to your operations console.</p>
          </div>

          <ss-error-banner
            [message]="errorMessage()"
            [dismissible]="true"
            (dismissed)="errorMessage.set(null)">
          </ss-error-banner>

          <form (ngSubmit)="onSubmit()" #loginForm="ngForm" novalidate aria-label="Login form" [attr.aria-busy]="loading()">
            <div class="form-group">
              <label for="username">Username</label>
              <div class="input-shell">
                <svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="8" r="3.5"></circle><path d="M4.5 20c.7-3.1 3.1-5 7.5-5s6.8 1.9 7.5 5"></path></svg>
                <input
                  id="username"
                  name="username"
                  type="text"
                  class="form-control"
                  [(ngModel)]="username"
                  required
                  autocomplete="username"
                  [disabled]="loading()"
                  aria-required="true"
                  [attr.aria-invalid]="usernameInvalid()"
                  aria-describedby="username-error"
                  placeholder="Enter your username" />
              </div>
              @if (usernameInvalid()) {
                <p class="field-error" id="username-error">Enter your username.</p>
              }
            </div>

            <div class="form-group">
              <div class="field-label-row">
                <label for="password">Password</label>
                <span class="field-hint">Protected session</span>
              </div>
              <div class="input-shell">
                <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="5" y="10" width="14" height="10" rx="2"></rect><path d="M8 10V7a4 4 0 0 1 8 0v3"></path></svg>
                <input
                  id="password"
                  name="password"
                  [type]="showPassword() ? 'text' : 'password'"
                  class="form-control"
                  [(ngModel)]="password"
                  required
                  autocomplete="current-password"
                  [disabled]="loading()"
                  aria-required="true"
                  [attr.aria-invalid]="passwordInvalid()"
                  aria-describedby="password-error"
                  placeholder="Enter your password" />
                <button
                  type="button"
                  class="password-field__toggle"
                  [attr.aria-label]="showPassword() ? 'Hide password' : 'Show password'"
                  [attr.aria-pressed]="showPassword()"
                  [disabled]="loading()"
                  (click)="togglePasswordVisibility()">
                  @if (showPassword()) {
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 3l18 18M10.6 10.6a2 2 0 0 0 2.8 2.8M9.9 4.2A10.8 10.8 0 0 1 12 4c5.2 0 8.7 4 10 8a12.5 12.5 0 0 1-2.1 3.8M6.2 6.2C3.8 7.8 2.5 10.2 2 12c1.3 4 4.8 8 10 8 1 0 1.9-.1 2.7-.4"></path></svg>
                  } @else {
                    <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 12s3.5-8 10-8 10 8 10 8-3.5 8-10 8S2 12 2 12Z"></path><circle cx="12" cy="12" r="3"></circle></svg>
                  }
                </button>
              </div>
              @if (passwordInvalid()) {
                <p class="field-error" id="password-error">Enter your password.</p>
              }
            </div>

            <div class="form-options">
              <a class="forgot-link" routerLink="/forgot-password">Forgot password?</a>
              <span class="session-note">Need access? Contact your administrator.</span>
            </div>

            <button
              type="submit"
              class="btn btn--primary login-submit"
              [disabled]="loading() || !username.trim() || !password"
              aria-label="Sign in">
              @if (loading()) {
                <span class="button-spinner" aria-hidden="true"></span>
                Signing in...
              } @else {
                Sign in
                <svg viewBox="0 0 20 20" aria-hidden="true"><path d="M4 10h11M11 5l5 5-5 5"></path></svg>
              }
            </button>
          </form>

          <p class="access-note">Access is provisioned by your StorSight administrator.</p>
          <p class="login-panel__footer">Protected by session-based authentication</p>
        </section>
      </div>
    </main>
  `,
  styles: [`
    .login-page {
      align-items: center;
      background:
        radial-gradient(circle at 8% 12%, rgba(65, 184, 181, 0.16), transparent 25rem),
        radial-gradient(circle at 92% 80%, rgba(246, 166, 102, 0.1), transparent 24rem),
        linear-gradient(135deg, #0b1118 0%, #101820 52%, #11151b 100%);
      display: flex;
      justify-content: center;
      min-height: 100svh;
      overflow: auto;
      padding: clamp(1rem, 4vw, 3rem);
      position: relative;
    }
    .login-page::before {
      background-image: linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
      background-size: 3rem 3rem;
      content: '';
      inset: 0;
      mask-image: linear-gradient(to bottom right, black, transparent 70%);
      pointer-events: none;
      position: absolute;
    }
    .login-shell {
      background: rgba(18, 23, 31, 0.82);
      border: 1px solid rgba(139, 148, 158, 0.22);
      border-radius: 1rem;
      box-shadow: 0 2rem 6rem rgba(0, 0, 0, 0.35), 0 0 0 1px rgba(255,255,255,0.02) inset;
      display: grid;
      grid-template-columns: minmax(0, 1fr) minmax(22rem, 29rem);
      max-width: 70rem;
      min-height: 43rem;
      overflow: hidden;
      position: relative;
      width: 100%;
    }
    .login-intro {
      background:
        linear-gradient(145deg, rgba(24, 57, 69, 0.92), rgba(15, 29, 39, 0.9) 58%, rgba(24, 28, 34, 0.88)),
        linear-gradient(90deg, rgba(246, 166, 102, 0.08), transparent 45%);
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      overflow: hidden;
      padding: clamp(2rem, 5vw, 4rem);
      position: relative;
    }
    .login-intro::after {
      border: 1px solid rgba(88, 166, 255, 0.18);
      border-radius: 50%;
      content: '';
      height: 28rem;
      position: absolute;
      right: -10rem;
      top: -8rem;
      width: 28rem;
    }
    .brand-lockup { align-items: center; display: flex; gap: 0.75rem; position: relative; z-index: 1; }
    .brand-name { color: var(--color-text); font-size: 1.2rem; font-weight: 700; letter-spacing: -0.02em; }
    .brand-mark { align-items: flex-end; display: inline-flex; gap: 3px; height: 1.75rem; }
    .brand-mark span { background: var(--color-primary); border-radius: 2px; display: block; width: 5px; }
    .brand-mark span:nth-child(1) { height: 0.8rem; opacity: 0.5; }
    .brand-mark span:nth-child(2) { height: 1.35rem; opacity: 0.78; }
    .brand-mark span:nth-child(3) { height: 1.75rem; }
    .intro-copy { margin: auto 0; max-width: 32rem; position: relative; z-index: 1; }
    .eyebrow { color: var(--color-primary); font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.12em; text-transform: uppercase; }
    .intro-copy h1 { font-size: clamp(2.4rem, 4.2vw, 4.2rem); letter-spacing: -0.045em; line-height: 1.03; margin: 1rem 0 1.25rem; }
    .intro-copy h1 em { color: #79d9c4; font-style: normal; }
    .intro-copy__description { color: var(--color-text-muted); font-size: 1rem; max-width: 27rem; }
    .signal-map { height: 8rem; margin: 1rem 0 0; position: relative; z-index: 1; }
    .signal-map__line { background: var(--color-primary); height: 1px; opacity: 0.35; position: absolute; transform-origin: left; }
    .signal-map__line--one { left: 13%; top: 52%; transform: rotate(-17deg); width: 39%; }
    .signal-map__line--two { left: 47%; top: 39%; transform: rotate(21deg); width: 38%; }
    .signal-map__node { background: var(--color-bg); border: 2px solid var(--color-primary); border-radius: 50%; box-shadow: 0 0 0 5px rgba(88,166,255,0.08); height: 0.7rem; position: absolute; width: 0.7rem; }
    .signal-map__node--one { left: 10%; top: 49%; }
    .signal-map__node--two { left: 45%; top: 35%; }
    .signal-map__node--three { right: 12%; top: 48%; border-color: #79d9c4; }
    .signal-map__node--four { left: 32%; bottom: 5%; border-color: #79d9c4; }
    .signal-map__label { color: var(--color-text-subtle); font-size: 0.65rem; position: absolute; }
    .signal-map__label--one { left: 6%; top: 68%; }
    .signal-map__label--two { left: 41%; top: 15%; }
    .signal-map__label--three { right: 4%; top: 68%; }
    .intro-footer { align-items: center; color: var(--color-text-subtle); display: flex; font-size: 0.75rem; gap: 0.5rem; position: relative; z-index: 1; }
    .status-dot { background: #79d9c4; border-radius: 50%; box-shadow: 0 0 0 4px rgba(121,217,196,0.1); height: 0.45rem; width: 0.45rem; }
    .login-panel { background: rgba(15, 20, 28, 0.72); display: flex; flex-direction: column; justify-content: center; padding: clamp(2rem, 5vw, 4rem); }
    .login-panel__header { margin-bottom: 2rem; }
    .login-panel__header h2 { font-size: 2rem; letter-spacing: -0.03em; margin: 0.55rem 0 0.4rem; }
    .login-panel__header p:last-child { color: var(--color-text-muted); font-size: 0.875rem; }
    .login-panel ss-error-banner { display: block; margin-bottom: 1.25rem; }
    .form-group { margin-bottom: 1.25rem; }
    .form-group label, .field-label-row { color: var(--color-text-muted); font-size: var(--font-size-sm); font-weight: 500; }
    .field-label-row { align-items: center; display: flex; justify-content: space-between; margin-bottom: var(--space-1); }
    .field-hint { color: var(--color-text-subtle); font-size: 0.6875rem; font-weight: 400; }
    .input-shell { position: relative; }
    .input-shell > svg { fill: none; height: 1.1rem; left: 0.85rem; position: absolute; stroke: var(--color-text-subtle); stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.5; top: 50%; transform: translateY(-50%); width: 1.1rem; z-index: 1; }
    .input-shell .form-control { padding-left: 2.75rem; }
    .form-control { min-height: 3rem; }
    .field-error { color: var(--color-severity-critical-text); font-size: 0.75rem; margin: 0.4rem 0 0; }
    .password-field__toggle { align-items: center; background: transparent; border: 0; color: var(--color-text-muted); cursor: pointer; display: inline-flex; height: 2rem; justify-content: center; padding: 0; position: absolute; right: 0.65rem; top: 50%; transform: translateY(-50%); width: 2rem; z-index: 2; }
    .password-field__toggle:hover:not(:disabled) { color: var(--color-text); }
    .password-field__toggle:disabled { cursor: default; opacity: 0.6; }
    .password-field__toggle svg { fill: none; height: 1.1rem; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; width: 1.1rem; }
    .form-options { align-items: center; display: flex; justify-content: space-between; margin: -0.1rem 0 1.5rem; }
    .session-note { color: var(--color-text-subtle); font-size: 0.75rem; }
    .forgot-link { color: var(--color-primary); font-size: 0.75rem; font-weight: 600; }
    .login-submit { align-items: center; display: flex; gap: 0.65rem; justify-content: center; min-height: 3rem; width: 100%; }
    .login-submit svg { fill: none; height: 1rem; stroke: currentColor; stroke-linecap: round; stroke-linejoin: round; stroke-width: 1.7; width: 1rem; }
    .button-spinner { animation: spin 0.8s linear infinite; border: 2px solid rgba(255,255,255,0.35); border-radius: 50%; border-top-color: currentColor; height: 1rem; width: 1rem; }
    .access-note { color: var(--color-text-muted); font-size: 0.75rem; line-height: 1.5; margin-top: 1.25rem; text-align: center; }
    .login-panel__footer { border-top: 1px solid var(--color-border); color: var(--color-text-subtle); font-size: 0.6875rem; margin-top: 2rem; padding-top: 1rem; text-align: center; }
    @keyframes spin { to { transform: rotate(360deg); } }
    @media (max-width: 800px) {
      .login-shell { grid-template-columns: 1fr; min-height: auto; max-width: 30rem; }
      .login-intro { min-height: 18rem; padding: 2rem; }
      .intro-copy { margin: 3rem 0 1rem; }
      .intro-copy h1 { font-size: clamp(2.25rem, 8vw, 3.5rem); }
      .signal-map { display: none; }
      .login-panel { padding: 2.5rem clamp(2rem, 8vw, 4rem); }
    }
    @media (max-width: 480px) {
      .login-page { align-items: stretch; padding: 0; }
      .login-shell { border: 0; border-radius: 0; min-height: 100svh; }
      .login-intro { min-height: 15rem; padding: 1.5rem; }
      .intro-copy { margin: 2.5rem 0 0; }
      .intro-copy h1 { font-size: 2.25rem; }
      .intro-copy__description { font-size: 0.875rem; }
      .intro-footer { display: none; }
      .login-panel { padding: 2rem 1.5rem 1.5rem; }
    }
    @media (prefers-reduced-motion: reduce) { .button-spinner { animation: none; } }
  `],
})
export class LoginComponent {
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  username = '';
  password = '';
  loading = signal(false);
  errorMessage = signal<string | null>(null);
  showPassword = signal(false);
  submitted = signal(false);

  usernameInvalid(): boolean {
    return this.submitted() && !this.username.trim();
  }

  passwordInvalid(): boolean {
    return this.submitted() && !this.password;
  }

  togglePasswordVisibility(): void {
    this.showPassword.update((visible) => !visible);
  }

  onSubmit(): void {
    this.submitted.set(true);
    const username = this.username.trim();
    if (!username || !this.password) {
      this.errorMessage.set('Enter your username and password to continue.');
      return;
    }

    this.loading.set(true);
    this.errorMessage.set(null);

    this.authService.login(username, this.password).subscribe({
      next: () => {
        this.loading.set(false);
        const returnUrl = this.safeReturnUrl();
        if (returnUrl === '/dashboard') {
          this.router.navigate(['/dashboard']);
        } else {
          this.router.navigateByUrl(returnUrl);
        }
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

  private safeReturnUrl(): string {
    const returnUrl = this.route.snapshot.queryParamMap.get('returnUrl');
    if (returnUrl?.startsWith('/') && !returnUrl.startsWith('//')) {
      return returnUrl;
    }
    return '/dashboard';
  }
}
