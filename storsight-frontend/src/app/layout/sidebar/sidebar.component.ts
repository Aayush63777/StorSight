import { Component, Input, Output, EventEmitter } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { CommonModule } from '@angular/common';

interface NavItem {
  label: string;
  route: string;
  icon: string;
}

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
      [attr.aria-label]="'Main navigation'"
      [attr.aria-expanded]="!collapsed">

      <ul class="sidebar__nav" role="list">
        @for (item of navItems; track item.route) {
          <li>
            <a
              class="sidebar__item"
              [routerLink]="item.route"
              routerLinkActive="active"
              [attr.aria-label]="item.label"
              [title]="collapsed ? item.label : ''"
              (click)="closed.emit()">
              <span class="sidebar__icon" aria-hidden="true" [innerHTML]="item.icon"></span>
              @if (!collapsed) {
                <span class="sidebar__label">{{ item.label }}</span>
              }
            </a>
          </li>
        }
      </ul>

      @if (!collapsed) {
        <div class="sidebar__footer">
          <span class="sidebar__version">v1.0</span>
        </div>
      }
    </nav>
  `,
  styles: [`
    :host {
      display: flex;
      flex-direction: column;
      background: var(--color-sidebar-bg);
      border-right: 1px solid var(--color-border);
      overflow: hidden;
      width: 100%;
      height: 100%;
      transition: none;
    }

    .sidebar {
      display: flex;
      flex-direction: column;
      width: 100%;
      height: 100%;
      overflow-y: auto;
      overflow-x: hidden;
    }

    .sidebar__nav {
      list-style: none;
      margin: 0;
      padding: var(--space-3) 0;
      flex: 1;
    }

    .sidebar__nav li {
      padding: 0 var(--space-2);
      margin-bottom: 2px;
    }

    .sidebar__item {
      display: flex;
      align-items: center;
      gap: var(--space-3);
      padding: 0.5rem var(--space-3);
      border-radius: var(--radius-md);
      font-size: var(--font-size-sm);
      color: var(--color-sidebar-text);
      text-decoration: none;
      white-space: nowrap;
      overflow: hidden;
      position: relative;
      transition: background var(--transition-fast), color var(--transition-fast);
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
      left: 0;
      top: 20%;
      height: 60%;
      width: 3px;
      background: var(--color-primary);
      border-radius: 0 2px 2px 0;
    }

    .sidebar__icon {
      width: 18px;
      height: 18px;
      flex-shrink: 0;
      display: flex;
      align-items: center;
      justify-content: center;
      opacity: 0.7;
    }

    .sidebar__item.active .sidebar__icon,
    .sidebar__item:hover  .sidebar__icon { opacity: 1; }

    .sidebar__label {
      overflow: hidden;
      text-overflow: ellipsis;
      flex: 1;
    }

    .sidebar__footer {
      padding: var(--space-3) var(--space-4);
      border-top: 1px solid var(--color-border);
    }

    .sidebar__version {
      font-size: 0.6875rem;
      color: var(--color-text-subtle);
    }

    /* Collapsed host: center icons */
    :host.sidebar-collapsed-host .sidebar__item {
      justify-content: center;
      padding: 0.55rem;
    }

    :host.sidebar-collapsed-host .sidebar__footer {
      display: none;
    }
  `],
})
export class SidebarComponent {
  @Input() open      = false;
  @Input() collapsed = false;
  @Output() closed   = new EventEmitter<void>();

  readonly navItems: NavItem[] = [
    {
      label: 'Dashboard',
      route: '/dashboard',
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9"/><rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.6"/><rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.6"/><rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.3"/></svg>`,
    },
    {
      label: 'Storage Resources',
      route: '/storage-resources',
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1" y="3" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="1.4"/><rect x="1" y="9" width="14" height="4" rx="1.5" stroke="currentColor" stroke-width="1.4"/><circle cx="12.5" cy="5" r="1" fill="currentColor"/><circle cx="12.5" cy="11" r="1" fill="currentColor"/></svg>`,
    },
    {
      label: 'Metrics',
      route: '/metrics',
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><polyline points="1,12 5,7 8,9 12,4 15,6" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round" fill="none"/></svg>`,
    },
    {
      label: 'Events',
      route: '/events',
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><circle cx="8" cy="8" r="6.5" stroke="currentColor" stroke-width="1.4"/><polyline points="8,4 8,8 11,10" stroke="currentColor" stroke-width="1.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    },
    {
      label: 'Alerts',
      route: '/alerts',
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><path d="M8 1.5L14.5 13H1.5L8 1.5Z" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><line x1="8" y1="6" x2="8" y2="9.5" stroke="currentColor" stroke-width="1.4" stroke-linecap="round"/><circle cx="8" cy="11.5" r="0.75" fill="currentColor"/></svg>`,
    },
    {
      label: 'Incidents',
      route: '/incidents',
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="1.5" width="13" height="13" rx="2" stroke="currentColor" stroke-width="1.4"/><line x1="8" y1="4.5" x2="8" y2="9" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><circle cx="8" cy="11.25" r="0.9" fill="currentColor"/></svg>`,
    },
    {
      label: 'Audit Logs',
      route: '/audit-logs',
      icon: `<svg width="16" height="16" viewBox="0 0 16 16" fill="none"><rect x="2" y="1.5" width="12" height="13" rx="1.5" stroke="currentColor" stroke-width="1.4"/><line x1="5" y1="5.5" x2="11" y2="5.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="5" y1="8" x2="11" y2="8" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/><line x1="5" y1="10.5" x2="8.5" y2="10.5" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/></svg>`,
    },
  ];
}
