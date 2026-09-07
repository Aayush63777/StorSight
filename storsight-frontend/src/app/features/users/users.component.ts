import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { Role, UserRecord } from '../../core/models';
import { UserService } from '../../core/services/user.service';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';

@Component({
  selector: 'ss-users',
  standalone: true,
  imports: [CommonModule, FormsModule, ErrorBannerComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <section class="users-page" aria-labelledby="users-title">
      <header class="page-heading">
        <div>
          <p class="eyebrow">Access control</p>
          <h1 id="users-title">Users</h1>
          <p class="page-heading__description">Provision and manage authorized StorSight accounts.</p>
        </div>
        <span class="status-note">Admin only</span>
      </header>

      <ss-error-banner
        [message]="error()"
        [dismissible]="true"
        (dismissed)="error.set(null)">
      </ss-error-banner>

      @if (success()) {
        <div class="success-banner" role="status">{{ success() }}</div>
      }

      <div class="users-layout">
        <section class="panel" aria-labelledby="provision-title">
          <div class="panel__header">
            <div>
              <p class="eyebrow">Controlled access</p>
              <h2 id="provision-title">Provision account</h2>
            </div>
          </div>

          <form #userForm="ngForm" (ngSubmit)="createUser()" novalidate>
            <div class="form-group">
              <label for="username">Username</label>
              <input id="username" name="username" class="form-control" [(ngModel)]="username" required autocomplete="off" />
            </div>
            <div class="form-group">
              <label for="email">Work email</label>
              <input id="email" name="email" type="email" class="form-control" [(ngModel)]="email" required autocomplete="email" />
            </div>
            <div class="form-group">
              <label for="role">Role</label>
              <select id="role" name="role" class="form-control" [(ngModel)]="roleId" required>
                <option [ngValue]="null" disabled>Select a role</option>
                @for (role of roles(); track role.id) {
                  <option [ngValue]="role.id">{{ role.name }}</option>
                }
              </select>
            </div>
            <div class="form-group">
              <label for="password">Temporary password</label>
              <input id="password" name="password" type="password" class="form-control" [(ngModel)]="password" minlength="12" required autocomplete="new-password" />
              <span class="field-help">Use at least 12 characters. Share credentials through a secure channel.</span>
            </div>
            <button class="btn btn--primary" type="submit" [disabled]="saving() || !userForm.form.valid || roleId === null">
              {{ saving() ? 'Creating account...' : 'Create account' }}
            </button>
          </form>
        </section>

        <section class="panel" aria-labelledby="directory-title">
          <div class="panel__header">
            <div>
              <p class="eyebrow">Directory</p>
              <h2 id="directory-title">Authorized users</h2>
            </div>
            <span class="count">{{ users().length }}</span>
          </div>

          @if (loading()) {
            <p class="state">Loading directory...</p>
          } @else if (users().length === 0) {
            <p class="state">No users found.</p>
          } @else {
            <div class="table-wrap">
              <table>
                <caption class="sr-only">StorSight user directory</caption>
                <thead><tr><th>Username</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
                <tbody>
                  @for (user of users(); track user.id) {
                    <tr>
                      <td><strong>{{ user.username }}</strong></td>
                      <td>{{ user.email }}</td>
                      <td><span class="role-badge">{{ roleName(user.role_id) }}</span></td>
                      <td><span class="user-status" [class.user-status--inactive]="!user.is_active">{{ user.is_active ? 'Active' : 'Inactive' }}</span></td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          }
        </section>
      </div>
    </section>
  `,
  styles: [`
    .users-page { max-width: 84rem; margin: 0 auto; }
    .page-heading { display: flex; align-items: flex-start; justify-content: space-between; gap: 1rem; margin-bottom: 1.5rem; }
    .page-heading h1 { font-size: 1.75rem; }
    .page-heading__description { color: var(--color-text-muted); margin-top: 0.25rem; }
    .eyebrow { color: var(--color-primary); font-size: 0.6875rem; font-weight: 700; letter-spacing: 0.08em; text-transform: uppercase; }
    .status-note, .count, .role-badge { border: 1px solid var(--color-border); border-radius: var(--radius-full); color: var(--color-text-muted); font-size: var(--font-size-xs); padding: 0.25rem 0.625rem; white-space: nowrap; }
    .success-banner { background: rgba(63, 185, 80, 0.12); border: 1px solid rgba(63, 185, 80, 0.45); border-radius: var(--radius-md); color: #7ee787; margin-bottom: 1rem; padding: 0.75rem 1rem; }
    .users-layout { display: grid; grid-template-columns: minmax(18rem, 24rem) minmax(0, 1fr); gap: 1rem; }
    .panel { background: var(--color-surface); border: 1px solid var(--color-border); border-radius: var(--radius-md); padding: 1.25rem; }
    .panel__header { align-items: flex-start; display: flex; justify-content: space-between; margin-bottom: 1.25rem; }
    .panel h2 { font-size: 1.05rem; margin-top: 0.2rem; }
    .field-help { color: var(--color-text-subtle); font-size: var(--font-size-xs); }
    .btn { width: 100%; }
    .state { color: var(--color-text-muted); padding: 2rem 0; text-align: center; }
    .table-wrap { overflow-x: auto; }
    table { border-collapse: collapse; min-width: 38rem; width: 100%; }
    th, td { border-bottom: 1px solid var(--color-border); padding: 0.75rem 0.5rem; text-align: left; }
    th { color: var(--color-text-muted); font-size: var(--font-size-xs); font-weight: 600; text-transform: uppercase; }
    td { color: var(--color-text-muted); font-size: var(--font-size-sm); }
    td strong { color: var(--color-text); }
    .user-status { color: #7ee787; font-size: var(--font-size-xs); }
    .user-status--inactive { color: var(--color-severity-critical-text); }
    @media (max-width: 900px) { .users-layout { grid-template-columns: 1fr; } }
    @media (max-width: 560px) { .page-heading { flex-direction: column; } }
  `],
})
export class UsersComponent implements OnInit {
  private readonly userService = inject(UserService);
  private readonly cdr = inject(ChangeDetectorRef);

  users = signal<UserRecord[]>([]);
  roles = signal<Role[]>([]);
  loading = signal(true);
  saving = signal(false);
  error = signal<string | null>(null);
  success = signal<string | null>(null);

  username = '';
  email = '';
  password = '';
  roleId: number | null = null;

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);
    this.userService.list().subscribe({
      next: users => { this.users.set(users); this.loading.set(false); this.cdr.markForCheck(); },
      error: err => { this.handleError(err, 'Unable to load the user directory.'); this.loading.set(false); },
    });
    this.userService.listRoles().subscribe({
      next: roles => { this.roles.set(roles); this.cdr.markForCheck(); },
      error: err => this.handleError(err, 'Unable to load available roles.'),
    });
  }

  createUser(): void {
    if (!this.username.trim() || !this.email.trim() || !this.password || this.roleId === null) return;
    this.saving.set(true);
    this.error.set(null);
    this.success.set(null);
    this.userService.create({ username: this.username.trim(), email: this.email.trim(), password: this.password, role_id: this.roleId }).subscribe({
      next: user => {
        this.users.update(users => [...users, user]);
        this.success.set(`Account for ${user.username} created successfully.`);
        this.username = '';
        this.email = '';
        this.password = '';
        this.roleId = null;
        this.saving.set(false);
        this.cdr.markForCheck();
      },
      error: err => { this.handleError(err, 'Unable to create the account.'); this.saving.set(false); },
    });
  }

  roleName(roleId: number): string {
    return this.roles().find(role => role.id === roleId)?.name ?? 'Unknown';
  }

  private handleError(error: HttpErrorResponse, fallback: string): void {
    this.error.set(error.status === 403 ? 'Administrator access is required.' : error.error?.error || fallback);
    this.cdr.markForCheck();
  }
}
