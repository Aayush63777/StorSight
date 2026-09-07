import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { AppShellComponent } from './layout/app-shell/app-shell.component';

export const routes: Routes = [
  // Public routes
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login.component').then(
        (m) => m.LoginComponent,
      ),
  },
  {
    path: 'unauthorized',
    loadComponent: () =>
      import('./features/unauthorized/unauthorized.component').then(
        (m) => m.UnauthorizedComponent,
      ),
  },

  // Protected routes — wrapped in the AppShell layout
  {
    path: '',
    component: AppShellComponent,
    canActivate: [authGuard],
    children: [
      {
        path: '',
        redirectTo: 'dashboard',
        pathMatch: 'full',
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent,
          ),
      },
      {
        path: 'storage-resources',
        loadComponent: () =>
          import(
            './features/storage-resources/list/storage-resource-list.component'
          ).then((m) => m.StorageResourceListComponent),
      },
      // 'new' must come before ':id' so Angular doesn't treat it as an ID
      {
        path: 'storage-resources/new',
        loadComponent: () =>
          import(
            './features/storage-resources/form/storage-resource-form.component'
          ).then((m) => m.StorageResourceFormComponent),
      },
      {
        path: 'storage-resources/:id',
        loadComponent: () =>
          import(
            './features/storage-resources/detail/storage-resource-detail.component'
          ).then((m) => m.StorageResourceDetailComponent),
      },
      {
        path: 'storage-resources/:id/edit',
        loadComponent: () =>
          import(
            './features/storage-resources/form/storage-resource-form.component'
          ).then((m) => m.StorageResourceFormComponent),
      },
      {
        path: 'metrics',
        loadComponent: () =>
          import('./features/metrics/list/metrics-list.component').then(
            (m) => m.MetricsListComponent,
          ),
      },
      {
        path: 'metrics/:id',
        loadComponent: () =>
          import('./features/metrics/detail/metric-detail.component').then(
            (m) => m.MetricDetailComponent,
          ),
      },
      {
        path: 'events',
        loadComponent: () =>
          import('./features/events/list/event-list.component').then(
            (m) => m.EventListComponent,
          ),
      },
      {
        path: 'events/:id',
        loadComponent: () =>
          import('./features/events/detail/event-detail.component').then(
            (m) => m.EventDetailComponent,
          ),
      },
      {
        path: 'alerts',
        loadComponent: () =>
          import('./features/alerts/list/alert-list.component').then(
            (m) => m.AlertListComponent,
          ),
      },
      {
        path: 'alerts/:id',
        loadComponent: () =>
          import('./features/alerts/detail/alert-detail.component').then(
            (m) => m.AlertDetailComponent,
          ),
      },
      {
        path: 'incidents',
        loadComponent: () =>
          import('./features/incidents/list/incident-list.component').then(
            (m) => m.IncidentListComponent,
          ),
      },
      {
        path: 'incidents/:id',
        loadComponent: () =>
          import(
            './features/incidents/detail/incident-detail.component'
          ).then((m) => m.IncidentDetailComponent),
      },
      {
        path: 'audit-logs',
        loadComponent: () =>
          import('./features/audit-logs/audit-logs.component').then(
            (m) => m.AuditLogsComponent,
          ),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/users/users.component').then(
            (m) => m.UsersComponent,
          ),
      },
    ],
  },

  // Catch-all — must be last
  {
    path: '**',
    loadComponent: () =>
      import('./features/not-found/not-found.component').then(
        (m) => m.NotFoundComponent,
      ),
  },
];
