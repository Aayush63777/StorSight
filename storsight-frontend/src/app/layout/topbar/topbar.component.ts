import { Component, Output, EventEmitter, Input, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

@Component({
  selector: 'ss-topbar',
  standalone: true,
  imports: [CommonModule, RouterLink],
  template: `
    <header class="topbar" role="banner">

      <!-- Left: hamburger + brand -->
      <div class="topbar__left">
        <button
          class="topbar__hamburger"
          [attr.aria-label]="isMobile ? 'Open navigation' : (sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar')"
          (click)="menuToggled.emit()">
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none" aria-hidden="true">
            <rect x="1" y="4"  width="16" height="1.5" rx="0.75" fill="currentColor"/>
            <rect x="1" y="8.25" width="16" height="1.5" rx="0.75" fill="currentColor"/>
            <rect x="1" y="12.5" width="16" height="1.5" rx="0.75" fill="currentColor"/>
          </svg>
        </button>

        <a class="topbar__brand" routerLink="/dashboard" aria-label="StorSight — go to dashboard">
          <span class="topbar__brand-mark" aria-hidden="true">
            <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
              <rect x="1" y="1" width="9" height="9" rx="2" fill="var(--color-primary)" opacity="0.9"/>
              <rect x="12" y="1" width="9" height="9" rx="2" fill="var(--color-primary)" opacity="0.5"/>
              <rect x="1" y="12" width="9" height="9" rx="2" fill="var(--color-primary)" opacity="0.5"/>
              <rect x="12" y="12" width="9" height="9" rx="2" fill="var(--color-primary)" opacity="0.25"/>
            </svg>
          </span>
          <span class="topbar__brand-name">StorSight</span>
        </a>
      </div>

      <!-- Right: user + logout -->
      <div class="topbar__right">
        @if (authService.currentUser$ | async; as user) {
          <div class="topbar__user">

            <div class="topbar__user-detail">
              <div class="topbar__avatar" aria-hidden="true">
                {{ user.username.charAt(0).toUpperCase() }}
              </div>
              <div class="topbar__user-text">
                <span class="topbar__username">{{ user.username }}</span>
                @if (user.role) {
                  <span class="topbar__role-badge">{{ user.role }}</span>
                }
              </div>
            </div>

            <div class="topbar__sep" aria-hidden="true"></div>

            <button
              class="topbar__logout"
              (click)="onLogout()"
              aria-label="Sign out of StorSight">
              <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
                <path d="M5 2H2a1 1 0 0 0-1 1v8a1 1 0 0 0 1 1h3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
                <path d="M9 10l3-3-3-3" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/>
                <line x1="12" y1="7" x2="5" y2="7" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/>
              </svg>
              <span>Sign out</span>
            </button>

          </div>
        }
      </div>

    </header>
  `,
  styles: [`
    .topbar {
      display: flex;
      align-items: center;
      justify-content: space-between;
      padding: 0 var(--space-4) 0 var(--space-3);
      height: 100%;
      background: var(--color-topbar-bg);
      border-bottom: 1px solid var(--color-border);
    }

    :host {
      display: block;
      background: var(--color-topbar-bg);
      border-bottom: 1px solid var(--color-border);
    }

    .topbar__left,
    .topbar__right {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      min-width: 0;
    }

    /* Hamburger */
    .topbar__hamburger {
      display: flex;
      align-items: center;
      justify-content: center;
      width: 34px;
      height: 34px;
      background: none;
      border: none;
      border-radius: var(--radius-md);
      cursor: pointer;
      color: var(--color-text-muted);
      transition: background var(--transition-fast), color var(--transition-fast);
      flex-shrink: 0;
    }
    .topbar__hamburger:hover {
      background: var(--color-surface-2);
      color: var(--color-text);
    }

    /* Brand */
    .topbar__brand {
      display: flex;
      align-items: center;
      gap: 0.5rem;
      text-decoration: none;
      flex-shrink: 0;
    }
    .topbar__brand:hover { text-decoration: none; }
    .topbar__brand-mark { display: flex; align-items: center; flex-shrink: 0; }
    .topbar__brand-name {
      font-size: 1rem;
      font-weight: 700;
      color: var(--color-text);
      letter-spacing: -0.02em;
    }

    /* User area */
    .topbar__user {
      display: flex;
      align-items: center;
      gap: var(--space-3);
    }

    .topbar__user-detail {
      display: flex;
      align-items: center;
      gap: var(--space-2);
    }

    .topbar__avatar {
      width: 30px;
      height: 30px;
      border-radius: var(--radius-full);
      background: linear-gradient(135deg, var(--color-primary-light), rgba(88,166,255,0.3));
      border: 1.5px solid rgba(88, 166, 255, 0.35);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 0.75rem;
      font-weight: 700;
      color: var(--color-primary);
      flex-shrink: 0;
      letter-spacing: 0;
    }

    .topbar__user-text {
      display: flex;
      flex-direction: column;
      gap: 1px;
      min-width: 0;
    }

    .topbar__username {
      font-size: var(--font-size-sm);
      font-weight: 500;
      color: var(--color-text);
      white-space: nowrap;
      line-height: 1.25;
    }

    .topbar__role-badge {
      font-size: 0.6rem;
      font-weight: 700;
      color: var(--color-primary);
      text-transform: uppercase;
      letter-spacing: 0.08em;
      line-height: 1.25;
    }

    .topbar__sep {
      width: 1px;
      height: 22px;
      background: var(--color-border);
      flex-shrink: 0;
    }

    .topbar__logout {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      padding: 0.28rem 0.65rem;
      background: none;
      border: 1px solid var(--color-border);
      border-radius: var(--radius-md);
      cursor: pointer;
      font-size: var(--font-size-xs);
      font-weight: 500;
      color: var(--color-text-muted);
      transition:
        background var(--transition-fast),
        color var(--transition-fast),
        border-color var(--transition-fast);
      white-space: nowrap;
    }
    .topbar__logout:hover {
      background: rgba(248, 81, 73, 0.1);
      color: #ffa198;
      border-color: rgba(248, 81, 73, 0.35);
    }

    /* Mobile: hide text labels */
    @media (max-width: 640px) {
      .topbar__user-text  { display: none; }
      .topbar__sep        { display: none; }
      .topbar__logout span { display: none; }
      .topbar__logout { border: none; padding: 0.35rem; }
      .topbar__logout:hover { background: rgba(248,81,73,0.12); }
    }
  `],
})
export class TopbarComponent {
  readonly authService = inject(AuthService);

  @Input() sidebarCollapsed = false;
  @Input() isMobile         = false;
  @Output() menuToggled     = new EventEmitter<void>();

  onLogout(): void {
    this.authService.logout().subscribe();
  }
}
