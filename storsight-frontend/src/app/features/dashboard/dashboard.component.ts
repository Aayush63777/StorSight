import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { StorageResourceService } from '../../core/services/storage-resource.service';
import { AlertService } from '../../core/services/alert.service';
import { IncidentService } from '../../core/services/incident.service';
import { EventService } from '../../core/services/event.service';
import { AuditLogService } from '../../core/services/audit-log.service';

import { StorageResource, Alert, Incident, Event, AuditLog } from '../../core/models';

import { SeverityBadgeComponent } from '../../shared/components/severity-badge/severity-badge.component';
import { StatusBadgeComponent } from '../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';

interface DashboardData {
  resources: StorageResource[];
  alerts: Alert[];
  incidents: Incident[];
  events: Event[];
  auditLogs: AuditLog[];
}

@Component({
  selector: 'ss-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    SeverityBadgeComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    ErrorBannerComponent,
    RelativeTimePipe,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  private readonly resources = inject(StorageResourceService);
  private readonly alertSvc = inject(AlertService);
  private readonly incidentSvc = inject(IncidentService);
  private readonly eventSvc = inject(EventService);
  private readonly auditSvc = inject(AuditLogService);
  private readonly cdr = inject(ChangeDetectorRef);
  readonly router = inject(Router);

  // ── State signals ─────────────────────────────────────────
  loading = signal(true);
  error = signal<string | null>(null);
  lastUpdated = signal<Date | null>(null);

  // ── Raw data ──────────────────────────────────────────────
  allResources = signal<StorageResource[]>([]);
  allAlerts    = signal<Alert[]>([]);
  allIncidents = signal<Incident[]>([]);
  allEvents    = signal<Event[]>([]);
  auditLogs    = signal<AuditLog[]>([]);

  // ── Computed KPIs ─────────────────────────────────────────
  totalResources  = computed(() => this.allResources().length);
  activeAlerts    = computed(() => this.allAlerts().filter(a => a.status === 'active').length);
  openIncidents   = computed(() => this.allIncidents().filter(i => i.status !== 'resolved').length);
  criticalIncidents = computed(() =>
    this.allIncidents().filter(i => i.severity === 'critical' && i.status !== 'resolved').length
  );

  // ── Resource health distribution ─────────────────────────
  resourcesByStatus = computed(() => {
    const r = this.allResources();
    return {
      healthy:  r.filter(x => x.status === 'healthy').length,
      warning:  r.filter(x => x.status === 'warning').length,
      critical: r.filter(x => x.status === 'critical').length,
      offline:  r.filter(x => x.status === 'offline').length,
    };
  });

  healthPercent = computed(() => {
    const total = this.totalResources();
    if (total === 0) return 0;
    return Math.round((this.resourcesByStatus().healthy / total) * 100);
  });

  // ── Alert severity distribution ───────────────────────────
  activeAlertsBySeverity = computed(() => {
    const active = this.allAlerts().filter(a => a.status === 'active');
    return {
      critical: active.filter(a => a.severity === 'critical').length,
      warning:  active.filter(a => a.severity === 'warning').length,
      info:     active.filter(a => a.severity === 'info').length,
    };
  });

  // ── Incident severity distribution ────────────────────────
  openIncidentsBySeverity = computed(() => {
    const open = this.allIncidents().filter(i => i.status !== 'resolved');
    return {
      critical: open.filter(i => i.severity === 'critical').length,
      high:     open.filter(i => i.severity === 'high').length,
      medium:   open.filter(i => i.severity === 'medium').length,
      low:      open.filter(i => i.severity === 'low').length,
    };
  });

  // ── Sliced lists for display ──────────────────────────────
  recentEvents    = computed(() => [...this.allEvents()].slice(0, 5));
  recentIncidents = computed(() =>
    [...this.allIncidents()]
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
      .slice(0, 5)
  );
  recentAuditLogs = computed(() => [...this.auditLogs()].slice(0, 5));

  ngOnInit(): void {
    this.loadDashboard();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);

    forkJoin({
      resources: this.resources.list().pipe(catchError(() => of([]))),
      alerts:    this.alertSvc.list().pipe(catchError(() => of([]))),
      incidents: this.incidentSvc.list().pipe(catchError(() => of([]))),
      events:    this.eventSvc.list().pipe(catchError(() => of([]))),
      auditLogs: this.auditSvc.list().pipe(catchError(() => of([]))),
    }).subscribe({
      next: (data: DashboardData) => {
        this.allResources.set(data.resources);
        this.allAlerts.set(data.alerts);
        this.allIncidents.set(data.incidents);
        this.allEvents.set(data.events);
        this.auditLogs.set(data.auditLogs);
        this.lastUpdated.set(new Date());
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.error.set('Unable to load dashboard data. Please try again.');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  navigateToIncident(id: number): void {
    this.router.navigate(['/incidents', id]);
  }

  formatAction(action: string): string {
    return action
      .replace('engineer_action:', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  trackById(_: number, item: { id: number }): number {
    return item.id;
  }
}
