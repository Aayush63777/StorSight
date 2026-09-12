import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { AuthService } from '../../../core/auth/auth.service';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';

@Component({
  selector: 'ss-reset-password',
  standalone: true,
  imports: [CommonModule, FormsModule, RouterLink, ErrorBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <main class="auth-page">
      <section class="auth-card" aria-labelledby="reset-title">
        <a class="back-link" routerLink="/login">Back to sign in</a>
        <div class="brand-lockup"><span class="brand-mark" aria-hidden="true"><i></i><i></i><i></i></span><strong>StorSight</strong></div>
        @if (!submitted()) {
          <p class="eyebrow">Account recovery</p>
          <h1 id="reset-title">Choose a new password</h1>
          <p class="description">Set a new password for your StorSight account. Use at least 12 characters.</p>
          <ss-error-banner [message]="error()" [dismissible]="true" (dismissed)="error.set(null)"></ss-error-banner>
          <form #form="ngForm" (ngSubmit)="submit()" novalidate>
            <label for="password">New password</label>
            <input id="password" name="password" type="password" class="form-control" [(ngModel)]="password" required minlength="12" autocomplete="new-password" />
            <label for="confirm-password">Confirm password</label>
            <input id="confirm-password" name="confirmPassword" type="password" class="form-control" [(ngModel)]="confirmPassword" required minlength="12" autocomplete="new-password" />
            @if (confirmPassword && password !== confirmPassword) {
              <p class="validation-message">Passwords do not match.</p>
            }
            <button class="btn btn--primary" type="submit" [disabled]="saving() || !form.form.valid || password !== confirmPassword">{{ saving() ? 'Saving...' : 'Reset password' }}</button>
          </form>
        } @else {
          <div class="success-state" role="status">
            <span class="success-icon" aria-hidden="true">&#10003;</span>
            <p class="eyebrow">Password updated</p>
            <h1 id="reset-title">You can sign in now</h1>
            <p class="description">Your password has been reset successfully.</p>
            <a class="btn btn--primary" routerLink="/login">Return to sign in</a>
          </div>
        }
        <p class="footer-note">Need access? Contact your StorSight administrator.</p>
      </section>
    </main>
  `,
  styles: [`
    .auth-page { align-items:center; background:radial-gradient(circle at 18% 20%,rgba(65,184,181,.14),transparent 24rem),linear-gradient(135deg,#0b1118,#111820 55%,#11151b); display:flex; justify-content:center; min-height:100svh; padding:1rem; }
    .auth-card { background:rgba(15,20,28,.9); border:1px solid rgba(139,148,158,.22); border-radius:1rem; box-shadow:0 2rem 6rem rgba(0,0,0,.35); max-width:27rem; padding:2rem; width:100%; }
    .back-link { color:var(--color-text-muted); display:inline-block; font-size:.75rem; margin-bottom:2rem; }
    .brand-lockup { align-items:center; color:var(--color-text); display:flex; font-size:1.1rem; gap:.65rem; margin-bottom:3rem; }
    .brand-mark { align-items:flex-end; display:flex; gap:3px; height:1.5rem; }.brand-mark i { background:var(--color-primary); border-radius:2px; display:block; width:5px; }.brand-mark i:nth-child(1){height:.7rem;opacity:.5}.brand-mark i:nth-child(2){height:1.1rem;opacity:.75}.brand-mark i:nth-child(3){height:1.5rem}
    .eyebrow { color:var(--color-primary); font-size:.6875rem; font-weight:700; letter-spacing:.12em; text-transform:uppercase; }.auth-card h1 { font-size:1.8rem; margin:.55rem 0 .5rem; }.description { color:var(--color-text-muted); font-size:.875rem; line-height:1.6; margin-bottom:1.5rem; }.auth-card ss-error-banner { display:block; margin-bottom:1rem; }.auth-card label { color:var(--color-text-muted); display:block; font-size:.8rem; font-weight:500; margin-bottom:.4rem; }.auth-card .form-control { margin-bottom:1rem; min-height:3rem; }.auth-card .btn { align-items:center; display:flex; justify-content:center; min-height:3rem; text-decoration:none; width:100%; }.validation-message { color:#f6a666; font-size:.75rem; margin:-.5rem 0 1rem; }.footer-note { border-top:1px solid var(--color-border); color:var(--color-text-subtle); font-size:.7rem; margin-top:2rem; padding-top:1rem; text-align:center; }.success-state { text-align:center; }.success-icon { align-items:center; background:rgba(121,217,196,.13); border:1px solid rgba(121,217,196,.4); border-radius:50%; color:#79d9c4; display:flex; font-size:1.4rem; height:3.5rem; justify-content:center; margin:0 auto 1.5rem; width:3.5rem; }.success-state .description { margin-bottom:1.5rem; }
  `],
})
export class ResetPasswordComponent {
  private readonly authService = inject(AuthService);
  private readonly route = inject(ActivatedRoute);
  readonly token = this.route.snapshot.queryParamMap.get('token') ?? '';
  password = '';
  confirmPassword = '';
  saving = signal(false);
  submitted = signal(false);
  error = signal<string | null>(null);

  submit(): void {
    if (!this.token || !this.password || this.password !== this.confirmPassword) {
      this.error.set('The reset link is invalid, or the passwords do not match.');
      return;
    }
    if (this.password.length < 12) {
      this.error.set('Use a password of at least 12 characters.');
      return;
    }

    this.saving.set(true);
    this.error.set(null);
    this.authService.resetPassword(this.token, this.password).subscribe({
      next: () => { this.saving.set(false); this.submitted.set(true); },
      error: (error: HttpErrorResponse) => {
        this.saving.set(false);
        this.error.set(error.status === 0 ? 'Unable to connect to the server.' : 'This reset link is invalid or has expired.');
      },
    });
  }
}
