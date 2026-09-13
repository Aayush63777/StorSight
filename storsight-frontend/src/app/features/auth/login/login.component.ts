import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../../core/auth/auth.service';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';

@Component({
  selector: 'ss-login',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ErrorBannerComponent],
  template: `
    <div class="login-page" role="main">
      <div class="login-frame">
        <section class="login-story" aria-labelledby="story-title">
          <div class="brand-lockup">
            <span class="brand-mark" aria-hidden="true">
              <i></i><i></i><i></i>
            </span>
            <span>StorSight</span>
          </div>

          <div class="story-copy">
            <p class="eyebrow">Infrastructure operations platform</p>
            <h1 id="story-title">See the signal.<br /><strong>Resolve the incident.</strong></h1>
            <p class="story-description">
              Bring resources, alerts, events, and incident intelligence into one clear operational view.
            </p>
          </div>

          <div class="signal-map" aria-hidden="true">
            <span class="signal-node signal-node--one"><b></b><em>resources</em></span>
            <span class="signal-node signal-node--two"><b></b><em>events</em></span>
            <span class="signal-node signal-node--three"><b></b><em>incidents</em></span>
            <span class="signal-line signal-line--one"></span>
            <span class="signal-line signal-line--two"></span>
          </div>

          <p class="story-footnote"><span aria-hidden="true">●</span> Operational intelligence, built for clarity</p>
        </section>

        <section class="login-panel" aria-labelledby="login-title">
          <div class="login-panel__header">
            <p class="eyebrow">Secure workspace</p>
            <h2 id="login-title">Welcome back</h2>
            <p>Sign in to continue to your operations console.</p>
          </div>

          <ss-error-banner
            [message]="errorMessage()"
            [dismissible]="true"
            (dismissed)="errorMessage.set(null)">
          </ss-error-banner>

          <form (ngSubmit)="onSubmit()" #loginForm="ngForm" novalidate aria-label="Login form">
            <div class="form-group">
              <label for="username">Username</label>
              <div class="input-wrap">
                <span class="input-icon" aria-hidden="true">⌾</span>
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
            </div>

            <div class="form-group">
              <div class="field-heading">
                <label for="password">Password</label>
                <span>Protected session</span>
              </div>
              <div class="password-field input-wrap">
                <span class="input-icon" aria-hidden="true">▢</span>
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
                  @if (showPassword()) { <span aria-hidden="true">◉</span> } @else { <span aria-hidden="true">◌</span> }
                </button>
              </div>
            </div>

            <a class="forgot-link" routerLink="/forgot-password">Forgot password?</a>

            <button
              type="submit"
              class="sign-in-button"
              [disabled]="loading() || !username || !password"
              aria-label="Sign in">
              @if (loading()) { Signing in... } @else { Sign in <span aria-hidden="true">&#8594;</span> }
            </button>
          </form>

          <p class="access-note">Need access? Contact your administrator.</p>
          <p class="login-panel__footer">Access is provisioned by your StorSight administrator.</p>
          <p class="login-panel__security"><span aria-hidden="true">●</span> Protected by session-based authentication</p>
        </section>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      padding: clamp(1rem, 4vw, 3rem);
      background:
        radial-gradient(circle at 15% 15%, rgba(52, 211, 153, .08), transparent 25rem),
        radial-gradient(circle at 90% 80%, rgba(59, 130, 246, .08), transparent 28rem),
        var(--color-bg);
    }

    .login-frame {
      width: 100%;
      max-width: 1040px;
      min-height: 620px;
      display: grid;
      grid-template-columns: .92fr 1.08fr;
      overflow: hidden;
      border: 1px solid rgba(148, 163, 184, .16);
      border-radius: 18px;
      background: rgba(15, 23, 42, .82);
      box-shadow: 0 30px 80px rgba(0, 0, 0, .34);
    }

    .login-story {
      position: relative;
      display: flex;
      flex-direction: column;
      padding: clamp(2rem, 5vw, 4rem);
      overflow: hidden;
      background:
        linear-gradient(145deg, rgba(17, 72, 91, .82), rgba(7, 34, 47, .92)),
        var(--color-surface-2);

      &::before, &::after {
        content: '';
        position: absolute;
        border: 1px solid rgba(75, 184, 221, .18);
        border-radius: 50%;
        pointer-events: none;
      }
      &::before { width: 420px; height: 420px; top: -185px; right: -165px; }
      &::after { width: 330px; height: 330px; top: -138px; right: -120px; }
    }

    .brand-lockup {
      position: relative;
      z-index: 1;
      display: flex;
      align-items: center;
      gap: .7rem;
      color: #f1f5f9;
      font-size: 1.25rem;
      font-weight: 700;
      letter-spacing: -.02em;
    }
    .brand-mark { display: inline-flex; align-items: end; gap: 3px; height: 1.35rem; }
    .brand-mark i { display: block; width: 4px; border-radius: 4px; background: #54a9ff; }
    .brand-mark i:nth-child(1) { height: .65rem; }
    .brand-mark i:nth-child(2) { height: 1rem; }
    .brand-mark i:nth-child(3) { height: 1.35rem; }

    .story-copy { position: relative; z-index: 1; margin-top: auto; margin-bottom: 3rem; max-width: 26rem; }
    .eyebrow { color: #55adff; font-size: .72rem; font-weight: 700; letter-spacing: .16em; text-transform: uppercase; }
    .story-copy h1 { margin-top: 1.3rem; font-size: clamp(2.3rem, 4vw, 3.65rem); letter-spacing: -.05em; line-height: 1.02; }
    .story-copy h1 strong { color: #72e0c5; font-weight: 600; }
    .story-description { margin-top: 1.5rem; max-width: 23rem; color: #a9bac7; font-size: 1rem; line-height: 1.7; }

    .signal-map { position: relative; z-index: 1; height: 100px; margin: 0 0 1.4rem; }
    .signal-line { position: absolute; height: 1px; transform-origin: left; background: rgba(79, 155, 205, .5); }
    .signal-line--one { width: 135px; left: 35px; top: 55px; transform: rotate(-18deg); }
    .signal-line--two { width: 150px; left: 145px; top: 40px; transform: rotate(23deg); }
    .signal-node { position: absolute; color: #708695; font-size: .65rem; }
    .signal-node b { display: block; width: 10px; height: 10px; margin-bottom: .45rem; border: 2px solid #4ca9f7; border-radius: 50%; box-shadow: 0 0 0 5px rgba(76, 169, 247, .09); }
    .signal-node em { font-style: normal; }
    .signal-node--one { left: 0; top: 54px; }
    .signal-node--two { left: 112px; top: 20px; }
    .signal-node--three { left: 245px; top: 58px; }
    .signal-node--three b { border-color: #71d9c0; }
    .story-footnote { position: relative; z-index: 1; color: #8299a8; font-size: .76rem; }
    .story-footnote span { color: #71d9c0; margin-right: .4rem; }

    .login-panel { display: flex; flex-direction: column; justify-content: center; padding: clamp(2rem, 6vw, 5.5rem); background: rgba(9, 14, 24, .76); }
    .login-panel__header h2 { margin-top: 1.15rem; font-size: clamp(2rem, 4vw, 2.8rem); letter-spacing: -.045em; }
    .login-panel__header > p:last-child { margin-top: .35rem; color: var(--color-text-muted); }
    .login-panel ss-error-banner { display: block; margin-top: 1.6rem; }
    form { margin-top: 1.6rem; }
    .form-group { margin-bottom: 1.2rem; }
    .form-group label, .field-heading span { color: var(--color-text-muted); font-size: .78rem; }
    .field-heading { display: flex; justify-content: space-between; align-items: center; margin-bottom: .45rem; }
    .input-wrap { position: relative; }
    .input-icon { position: absolute; left: .85rem; top: 50%; z-index: 1; color: #738297; transform: translateY(-50%); }
    .form-control { min-height: 3rem; padding: .75rem .9rem .75rem 2.5rem; border-color: rgba(148, 163, 184, .2); border-radius: 7px; background: #182235; }
    .password-field .form-control { padding-right: 2.75rem; }
    .password-field__toggle { position: absolute; top: 50%; right: .75rem; z-index: 1; border: 0; background: transparent; color: #8996a8; cursor: pointer; transform: translateY(-50%); }
    .password-field__toggle:hover { color: #dbeafe; }
    .forgot-link { display: inline-block; margin: -.25rem 0 1.5rem; color: #54a9ff; font-size: .78rem; }
    .sign-in-button { width: 100%; min-height: 3rem; border: 1px solid #4389d4; border-radius: 6px; color: #dbeafe; background: #205187; cursor: pointer; font-weight: 600; transition: background .2s, transform .2s; }
    .sign-in-button:hover:not(:disabled) { background: #28639e; transform: translateY(-1px); }
    .sign-in-button:disabled { cursor: not-allowed; opacity: .6; }
    .sign-in-button span { margin-left: .45rem; font-size: 1.1rem; }
    .access-note { margin-top: .9rem; color: var(--color-text-muted); font-size: .75rem; text-align: right; }
    .login-panel__footer { margin-top: 2rem; padding-top: 1.5rem; border-top: 1px solid rgba(148, 163, 184, .16); color: #8d9aaa; font-size: .78rem; text-align: center; }
    .login-panel__security { margin-top: 1.3rem; color: #6f7d8d; font-size: .7rem; text-align: center; }
    .login-panel__security span { color: #5cbdac; margin-right: .35rem; }

    @media (max-width: 760px) {
      .login-page { padding: 0; }
      .login-frame { min-height: 100vh; grid-template-columns: 1fr; border: 0; border-radius: 0; }
      .login-story { min-height: 270px; padding: 2rem; }
      .story-copy { margin: 3rem 0 0; }
      .story-copy h1 { font-size: 2.35rem; }
      .story-description, .signal-map, .story-footnote { display: none; }
      .login-panel { padding: 2rem; }
    }
    @media (max-width: 420px) {
      .login-story { min-height: 235px; }
      .story-copy { margin-top: 2.5rem; }
      .login-panel { padding: 1.5rem; }
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
