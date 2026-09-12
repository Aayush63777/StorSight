import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';

import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  route: string;
  icon: NavIcon;
  section: 'Overview' | 'Monitoring' | 'Administration';
  adminOnly?: boolean;
}

type NavIcon =
  | 'dashboard'
  | 'storage'
  | 'metrics'
  | 'events'
  | 'alerts'
  | 'incidents'
  | 'audit-logs'
  | 'users';

@Component({
  selector: 'ss-sidebar',
  standalone: true,
  imports: [CommonModule, RouterLink, RouterLinkActive],
  host: {
    '[class.sidebar-open]': 'open',
    '[class.sidebar-collapsed-host]': 'collapsed',
  },
  template: `
    <nav
      class="sidebar"
      role="navigation"
      aria-label="Main navigation"
      [attr.aria-expanded]="!collapsed"
    >
      <ul class="sidebar__nav" role="list">
        @for (item of visibleNavItems; track item.route; let i = $index) {
          @if (
            i === 0 ||
            visibleNavItems[i - 1].section !== item.section
          ) {
            <li class="sidebar__section-label">
              {{ item.section }}
            </li>
          }

          <li>
            <a
              class="sidebar__item"
              [routerLink]="item.route"
              routerLinkActive="active"
              [attr.aria-label]="item.label"
              [title]="collapsed ? item.label : ''"
              (click)="closed.emit()"
            >
              <span
                class="sidebar__icon"
                aria-hidden="true"
              >
                @switch (item.icon) {
                  @case ('dashboard') {
                    <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity=".65"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".65"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity=".35"/></svg>
                  }
                  @case ('storage') {
                    <svg viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="4" rx="1.5"/><rect x="1" y="9" width="14" height="4" rx="1.5"/><circle cx="12.5" cy="5" r="1" fill="currentColor"/><circle cx="12.5" cy="11" r="1" fill="currentColor"/></svg>
                  }
                  @case ('metrics') {
                    <svg viewBox="0 0 16 16" fill="none"><polyline points="1,12 5,7 8,9 12,4 15,6"/></svg>
                  }
                  @case ('events') {
                    <svg viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5"/><polyline points="8,4 8,8 11,10"/></svg>
                  }
                  @case ('alerts') {
                    <svg viewBox="0 0 16 16" fill="none"><path d="M8 1.5 14.5 13H1.5L8 1.5Z"/><path d="M8 6v3.5"/><circle cx="8" cy="11.5" r=".75" fill="currentColor" stroke="none"/></svg>
                  }
                  @case ('incidents') {
                    <svg viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1.5" width="13" height="13" rx="2"/><path d="M8 4.5V9"/><circle cx="8" cy="11.25" r=".9" fill="currentColor" stroke="none"/></svg>
                  }
                  @case ('audit-logs') {
                    <svg viewBox="0 0 16 16" fill="none"><rect x="2" y="1.5" width="12" height="13" rx="1.5"/><path d="M5 5.5h6M5 8h6M5 10.5h3.5"/></svg>
                  }
                  @case ('users') {
                    <svg viewBox="0 0 16 16" fill="none"><circle cx="6" cy="5" r="2.5"/><path d="M1.8 13C2.2 10.8 3.6 9.5 6 9.5s3.8 1.3 4.2 3.5M11 6.5h4M13 4.5v4"/></svg>
                  }
                }
              </span>

              @if (!collapsed) {
                <span class="sidebar__label">
                  {{ item.label }}
                </span>
              }
            </a>
          </li>
        }
      </ul>

      @if (!collapsed) {
        <div class="sidebar__footer">
          <span class="sidebar__status">
            <span
              class="sidebar__status-dot"
              aria-hidden="true"
            ></span>
            System operational
          </span>

          <span class="sidebar__version">v1.0</span>
        </div>
      }
    </nav>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: var(--color-sidebar-bg);
      border-right: 1px solid var(--color-border);
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      overflow-x: hidden;
      overflow-y: auto;
    }

    .sidebar__nav {
      flex: 1;
      list-style: none;
      margin: 0;
      padding: var(--space-3) 0;
    }

    .sidebar__nav li {
      margin-bottom: 2px;
      padding: 0 var(--space-2);
    }

    .sidebar__nav .sidebar__section-label {
      margin: var(--space-4) var(--space-3) var(--space-2);
      padding: 0;
      color: var(--color-text-subtle);
      font-size: 0.625rem;
      font-weight: 700;
      letter-spacing: 0.12em;
      text-transform: uppercase;
    }

    .sidebar__nav .sidebar__section-label:first-child {
      margin-top: var(--space-2);
    }

    .sidebar__item {
      position: relative;
      display: flex;
      align-items: center;
      gap: var(--space-3);
      overflow: hidden;
      padding: 0.5rem var(--space-3);
      border-radius: var(--radius-md);
      color: var(--color-sidebar-text);
      font-size: var(--font-size-sm);
      text-decoration: none;
      white-space: nowrap;
      transition:
        background var(--transition-fast),
        color var(--transition-fast);
    }

    .sidebar__item:hover {
      background: var(--color-surface-2);
      color: var(--color-text);
    }

    .sidebar__item.active {
      background: rgba(88, 166, 255, 0.12);
      color: var(--color-primary);
      font-weight: 500;
    }

    .sidebar__item.active::before {
      content: '';
      position: absolute;
      top: 20%;
      left: 0;
      width: 3px;
      height: 60%;
      border-radius: 0 2px 2px 0;
      background: var(--color-primary);
    }

    .sidebar__icon {
      display: flex;
      flex-shrink: 0;
      align-items: center;
      justify-content: center;
      width: 18px;
      height: 18px;
      opacity: 0.7;
    }

    .sidebar__icon svg {
      width: 16px;
      height: 16px;
      fill: none;
      stroke: currentColor;
      stroke-width: 1.4;
      stroke-linecap: round;
      stroke-linejoin: round;
    }

    .sidebar__item.active .sidebar__icon,
    .sidebar__item:hover .sidebar__icon {
      opacity: 1;
    }

    .sidebar__label {
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .sidebar__footer {
      display: flex;
      flex-direction: column;
      gap: var(--space-2);
      padding: var(--space-3) var(--space-4);
      border-top: 1px solid var(--color-border);
    }

    .sidebar__status {
      display: flex;
      align-items: center;
      gap: var(--space-2);
      color: var(--color-text-muted);
      font-size: 0.6875rem;
      white-space: nowrap;
    }

    .sidebar__status-dot {
      width: 0.4rem;
      height: 0.4rem;
      border-radius: 50%;
      background: var(--color-severity-low);
      box-shadow: 0 0 0 3px var(--color-severity-low-bg);
    }

    .sidebar__version {
      color: var(--color-text-subtle);
      font-size: 0.6875rem;
    }

    /* Collapsed sidebar */
    :host.sidebar-collapsed-host .sidebar__item {
      justify-content: center;
      padding: 0.55rem;
    }

    :host.sidebar-collapsed-host .sidebar__footer {
      display: none;
    }

    :host.sidebar-collapsed-host .sidebar__section-label {
      display: none;
    }
  `],
})
export class SidebarComponent {
  private readonly authService = inject(AuthService);

  @Input() open = false;
  @Input() collapsed = false;

  @Output() closed = new EventEmitter<void>();

  readonly navItems: NavItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      section: 'Overview',
      icon: 'dashboard',
    },
    {
      label: 'Storage Resources',
      route: '/storage-resources',
      section: 'Monitoring',
      icon: 'storage',
    },
    {
      label: 'Metrics',
      route: '/metrics',
      section: 'Monitoring',
      icon: 'metrics',
    },
    {
      label: 'Events',
      route: '/events',
      section: 'Monitoring',
      icon: 'events',
    },
    {
      label: 'Alerts',
      route: '/alerts',
      section: 'Monitoring',
      icon: 'alerts',
    },
    {
      label: 'Incidents',
      route: '/incidents',
      section: 'Monitoring',
      icon: 'incidents',
    },
    {
      label: 'Audit Logs',
      route: '/audit-logs',
      section: 'Administration',
      icon: 'audit-logs',
    },
    {
      label: 'User Management',
      route: '/users',
      section: 'Administration',
      adminOnly: true,
      icon: 'users',
    },
  ];

  get visibleNavItems(): NavItem[] {
    return this.navItems.filter(
      (item) =>
        !item.adminOnly ||
        this.authService.currentUser?.role === 'ADMIN',
    );
  }
}
