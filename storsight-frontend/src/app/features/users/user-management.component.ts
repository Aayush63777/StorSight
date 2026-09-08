import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { HttpErrorResponse } from '@angular/common/http';

import { CreateUserPayload, ManagedUser, Role } from '../../core/models';
import { UserManagementService } from '../../core/services/user-management.service';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';

@Component({
  selector: 'ss-user-management',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, ErrorBannerComponent, LoadingSpinnerComponent, PageHeaderComponent],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <ss-page-header
      title="User management"
      subtitle="Create and manage access for your StorSight team.">
    </ss-page-header>

    <div class="user-management">
      <section class="panel create-panel" aria-labelledby="create-user-title">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Administrator tools</p>
            <h2 id="create-user-title">Add a team member</h2>
          </div>
          <span class="secure-note">Passwords are securely hashed</span>
        </div>

        <ss-error-banner [message]="formError()" [dismissible]="true" (dismissed)="formError.set(null)"></ss-error-banner>

        <form [formGroup]="form" (ngSubmit)="createUser()" novalidate>
          <div class="form-grid">
            <div class="form-field">
              <label for="username">Username</label>
              <input id="username" class="form-control" formControlName="username" autocomplete="off" placeholder="e.g. engineer02" />
              @if (fieldError('username')) { <p class="field-error">{{ fieldError('username') }}</p> }
            </div>
            <div class="form-field">
              <label for="email">Work email</label>
              <input id="email" class="form-control" type="email" formControlName="email" autocomplete="email" placeholder="name@company.com" />
              @if (fieldError('email')) { <p class="field-error">{{ fieldError('email') }}</p> }
            </div>
            <div class="form-field">
              <label for="password">Temporary password</label>
              <input id="password" class="form-control" type="password" formControlName="password" autocomplete="new-password" placeholder="At least 8 characters" />
              @if (fieldError('password')) { <p class="field-error">{{ fieldError('password') }}</p> }
            </div>
            <div class="form-field">
              <label for="role">Role</label>
              <select id="role" class="form-control" formControlName="role_id">
                <option [ngValue]="null">Select a role</option>
                @for (role of roles(); track role.id) { <option [ngValue]="role.id">{{ role.name }}</option> }
              </select>
              @if (fieldError('role_id')) { <p class="field-error">{{ fieldError('role_id') }}</p> }
            </div>
          </div>
          <label class="checkbox-field">
            <input type="checkbox" formControlName="is_active" />
            <span>Allow sign in immediately</span>
          </label>
          <button class="btn btn--primary" type="submit" [disabled]="saving()">
            {{ saving() ? 'Creating user...' : 'Create user' }}
          </button>
        </form>
      </section>

      <section class="panel" aria-labelledby="users-title">
        <div class="panel-heading">
          <div>
            <p class="eyebrow">Access directory</p>
            <h2 id="users-title">Team members</h2>
          </div>
          <button class="btn btn--secondary" type="button" (click)="loadUsers()" [disabled]="loading()">Refresh</button>
        </div>
        @if (loading()) {
          <ss-loading-spinner></ss-loading-spinner>
        } @else if (loadError()) {
          <ss-error-banner [message]="loadError()"></ss-error-banner>
        } @else if (!users().length) {
          <p class="empty-state">No users found.</p>
        } @else {
          <div class="table-wrap">
            <table>
              <thead><tr><th>User</th><th>Email</th><th>Role</th><th>Status</th></tr></thead>
              <tbody>
                @for (user of users(); track user.id) {
                  <tr>
                    <td><strong>{{ user.username }}</strong></td>
                    <td>{{ user.email }}</td>
                    <td><span class="role-pill">{{ user.role || 'Unassigned' }}</span></td>
                    <td><span class="status" [class.status--inactive]="!user.is_active">{{ user.is_active ? 'Active' : 'Inactive' }}</span></td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        }
      </section>
    </div>
  `,
  styles: [`
    .user-management { display:grid; gap:var(--space-6); max-width:1100px; }
    .panel { background:var(--color-surface); border:1px solid var(--color-border); border-radius:var(--radius-lg); padding:var(--space-6); }
    .panel-heading { align-items:flex-start; display:flex; justify-content:space-between; gap:var(--space-4); margin-bottom:var(--space-5); }
    .eyebrow { color:var(--color-primary); font-size:var(--font-size-xs); font-weight:700; letter-spacing:.1em; margin:0 0 var(--space-2); text-transform:uppercase; }
    h2 { font-size:1.25rem; margin:0; }
    .secure-note { color:var(--color-text-subtle); font-size:var(--font-size-xs); }
    ss-error-banner { display:block; margin-bottom:var(--space-4); }
    .form-grid { display:grid; gap:var(--space-4); grid-template-columns:repeat(2,minmax(0,1fr)); }
    .form-field { min-width:0; }
    label { color:var(--color-text-muted); display:block; font-size:var(--font-size-sm); font-weight:500; margin-bottom:var(--space-2); }
    .field-error { color:var(--color-severity-critical-text); font-size:var(--font-size-xs); margin:var(--space-1) 0 0; }
    .checkbox-field { align-items:center; display:flex; gap:var(--space-2); margin:var(--space-5) 0; }
    .checkbox-field input { accent-color:var(--color-primary); height:1rem; margin:0; width:1rem; }
    .checkbox-field span { color:var(--color-text); font-size:var(--font-size-sm); }
    .btn { border:0; cursor:pointer; min-height:2.75rem; padding:0 var(--space-5); }
    .btn:disabled { cursor:not-allowed; opacity:.6; }
    .btn--primary { background:var(--color-primary); color:var(--color-text-inverse); }
    .btn--secondary { background:var(--color-surface-2); border:1px solid var(--color-border); color:var(--color-text); }
    .table-wrap { overflow-x:auto; }
    table { border-collapse:collapse; min-width:620px; width:100%; }
    th, td { border-bottom:1px solid var(--color-border); padding:var(--space-3) var(--space-2); text-align:left; }
    th { color:var(--color-text-subtle); font-size:var(--font-size-xs); font-weight:600; text-transform:uppercase; }
    td { color:var(--color-text-muted); font-size:var(--font-size-sm); }
    td strong { color:var(--color-text); }
    .role-pill, .status { background:var(--color-primary-light); border-radius:var(--radius-full); color:var(--color-primary); display:inline-block; font-size:var(--font-size-xs); padding:.2rem .55rem; }
    .status { background:var(--color-severity-low-bg); color:var(--color-severity-low-text); }
    .status--inactive { background:var(--color-severity-unknown-bg); color:var(--color-severity-unknown-text); }
    .empty-state { color:var(--color-text-muted); margin:0; }
    @media (max-width:700px) { .form-grid { grid-template-columns:1fr; } .panel-heading { flex-direction:column; } }
  `],
})
export class UserManagementComponent implements OnInit {
  private readonly service = inject(UserManagementService);
  private readonly fb = inject(FormBuilder);

  users = signal<ManagedUser[]>([]);
  roles = signal<Role[]>([]);
  loading = signal(true);
  saving = signal(false);
  loadError = signal<string | null>(null);
  formError = signal<string | null>(null);

  form = this.fb.nonNullable.group({
    username: ['', [Validators.required, Validators.maxLength(100)]],
    email: ['', [Validators.required, Validators.email, Validators.maxLength(255)]],
    password: ['', [Validators.required, Validators.minLength(8)]],
    role_id: [null as number | null, [Validators.required]],
    is_active: [true],
  });

  ngOnInit(): void {
    this.loadUsers();
    this.service.listRoles().subscribe({
      next: (roles) => this.roles.set(roles),
      error: () => this.formError.set('Unable to load roles. Please refresh and try again.'),
    });
  }

  loadUsers(): void {
    this.loading.set(true);
    this.loadError.set(null);
    this.service.list().subscribe({
      next: (users) => { this.users.set(users); this.loading.set(false); },
      error: (error: HttpErrorResponse) => { this.loading.set(false); this.loadError.set(error.status === 403 ? 'Only administrators can manage users.' : 'Unable to load users.'); },
    });
  }

  createUser(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;
    this.saving.set(true);
    this.formError.set(null);
    const value = this.form.getRawValue();
    const payload: CreateUserPayload = {
      username: value.username.trim(),
      email: value.email.trim().toLowerCase(),
      password: value.password,
      role_id: value.role_id!,
      is_active: value.is_active,
    };
    this.service.create(payload).subscribe({
      next: (user) => { this.users.update((users) => [...users, user]); this.form.reset({ username: '', email: '', password: '', role_id: null, is_active: true }); this.saving.set(false); },
      error: (error: HttpErrorResponse) => { this.saving.set(false); this.formError.set(error.status === 400 && error.error?.error ? error.error.error : error.status === 0 ? 'Cannot connect to server.' : 'Unable to create user.'); },
    });
  }

  fieldError(name: string): string | null {
    const control = this.form.get(name);
    if (!control?.touched || control.valid) return null;
    if (control.errors?.['required']) return 'This field is required.';
    if (control.errors?.['email']) return 'Enter a valid email address.';
    if (control.errors?.['minlength']) return 'Use at least 8 characters.';
    if (control.errors?.['maxlength']) return 'This value is too long.';
    return 'Invalid value.';
  }
}
