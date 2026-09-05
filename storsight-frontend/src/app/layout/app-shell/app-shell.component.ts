import { Component, OnInit, OnDestroy, signal, HostListener } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CommonModule } from '@angular/common';

import { SidebarComponent } from '../sidebar/sidebar.component';
import { TopbarComponent } from '../topbar/topbar.component';

@Component({
  selector: 'ss-app-shell',
  standalone: true,
  imports: [RouterOutlet, SidebarComponent, TopbarComponent, CommonModule],
  template: `
    <ss-topbar
      [sidebarCollapsed]="sidebarCollapsed()"
      [isMobile]="isMobile()"
      (menuToggled)="handleMenuToggle()">
    </ss-topbar>

    <ss-sidebar
      [open]="mobileSidebarOpen()"
      [collapsed]="sidebarCollapsed() && !isMobile()"
      (closed)="mobileSidebarOpen.set(false)">
    </ss-sidebar>

    <!-- Mobile overlay backdrop -->
    @if (isMobile() && mobileSidebarOpen()) {
      <div
        class="sidebar-backdrop"
        (click)="mobileSidebarOpen.set(false)"
        aria-hidden="true">
      </div>
    }

    <main class="main-content" id="main-content" role="main">
      <router-outlet></router-outlet>
    </main>
  `,
  styles: [`
    :host {
      display: grid;
      grid-template-rows: var(--topbar-height) 1fr;
      grid-template-columns: var(--sidebar-width) 1fr;
      grid-template-areas:
        'topbar  topbar'
        'sidebar main';
      min-height: 100vh;
      background: var(--color-bg);
      transition: grid-template-columns var(--transition-base);
    }

    :host.sidebar-collapsed {
      grid-template-columns: 56px 1fr;
    }

    ss-topbar {
      grid-area: topbar;
      position: sticky;
      top: 0;
      z-index: 100;
    }

    ss-sidebar {
      grid-area: sidebar;
      position: sticky;
      top: var(--topbar-height);
      height: calc(100vh - var(--topbar-height));
      overflow: hidden;
    }

    .main-content {
      grid-area: main;
      padding: var(--space-6) var(--space-8);
      min-height: calc(100vh - var(--topbar-height));
      min-width: 0;
      overflow-x: hidden;
    }

    .sidebar-backdrop {
      position: fixed;
      inset: 0;
      top: var(--topbar-height);
      background: rgba(0, 0, 0, 0.65);
      z-index: 150;
      backdrop-filter: blur(2px);
    }

    /* Tablet: auto-collapse to icon rail */
    @media (max-width: 1024px) {
      :host,
      :host.sidebar-collapsed {
        grid-template-columns: 56px 1fr;
      }
      .main-content { padding: var(--space-5) var(--space-5); }
    }

    /* Mobile: full-width, sidebar out of grid */
    @media (max-width: 768px) {
      :host,
      :host.sidebar-collapsed {
        grid-template-columns: 1fr;
        grid-template-areas:
          'topbar'
          'main';
      }

      ss-sidebar {
        display: none;
        position: fixed !important;
        top: var(--topbar-height);
        left: 0;
        height: calc(100vh - var(--topbar-height));
        width: var(--sidebar-width) !important;
        z-index: 200;
      }

      ss-sidebar.sidebar-open {
        display: block;
      }

      .main-content { padding: var(--space-4); }
    }

    @media (max-width: 480px) {
      .main-content { padding: var(--space-3); }
    }
  `],
  host: { '[class.sidebar-collapsed]': 'sidebarCollapsed()' },
})
export class AppShellComponent implements OnInit, OnDestroy {
  sidebarCollapsed  = signal(false);
  mobileSidebarOpen = signal(false);
  isMobile          = signal(false);

  ngOnInit(): void {
    this.checkBreakpoint();
  }

  ngOnDestroy(): void {}

  @HostListener('window:resize')
  onResize(): void {
    this.checkBreakpoint();
    if (!this.isMobile()) {
      this.mobileSidebarOpen.set(false);
    }
  }

  handleMenuToggle(): void {
    if (this.isMobile()) {
      this.mobileSidebarOpen.update(v => !v);
    } else {
      this.sidebarCollapsed.update(v => !v);
    }
  }

  private checkBreakpoint(): void {
    this.isMobile.set(window.innerWidth <= 768);
  }
}
