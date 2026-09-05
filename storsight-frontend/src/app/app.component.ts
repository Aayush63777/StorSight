import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';

/**
 * Root component — thin router host only.
 * Layout (AppShell / Sidebar / Topbar) is loaded by the protected route
 * children. Login and error pages render directly without the shell.
 */
@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet],
  template: `<router-outlet></router-outlet>`,
})
export class AppComponent {}
