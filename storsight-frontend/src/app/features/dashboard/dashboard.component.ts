import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  signal,
  computed,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { forkJoin, Observable, of, Subject } from 'rxjs';
import { catchError, map } from 'rxjs/operators';

import { AutoRefreshService } from '../../core/services/auto-refresh.service';
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
  resources: DashboardResult<StorageResource[]>;
  alerts: DashboardResult<Alert[]>;
  incidents: DashboardResult<Incident[]>;
  events: DashboardResult<Event[]>;
  auditLogs: DashboardResult<AuditLog[]>;
}

interface DashboardResult<T> {
  value: T;
  failed: boolean;
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
export class DashboardComponent implements OnInit, OnDestroy {
  private readonly resources = inject(StorageResourceService);
  private readonly alertSvc = inject(AlertService);
  private readonly incidentSvc = inject(IncidentService);
  private readonly eventSvc = inject(EventService);
  private readonly auditSvc = inject(AuditLogService);
  private readonly autoRefresh = inject(AutoRefreshService);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();
  readonly router = inject(Router);

  // ── State signals ─────────────────────────────────────────
  loading = signal(true);
  error = signal<string | null>(null);
  degraded = signal(false);
  degradedSections = signal<string[]>([]);
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
  attentionCount  = computed(() => this.activeAlerts() + this.openIncidents());
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
    this.autoRefresh.startPolling({
      request: () => this.loadDashboardRequest(),
      intervalMs: 120_000,
      destroy$: this.destroy$,
      initialDelayMs: 120_000,
      onSuccess: (data) => {
        const failedSections = Object.entries(data)
          .filter(([, result]) => result.failed)
          .map(([section]) => section);

        this.allResources.set(data.resources.value);
        this.allAlerts.set(data.alerts.value);
        this.allIncidents.set(data.incidents.value);
        this.allEvents.set(data.events.value);
        this.auditLogs.set(data.auditLogs.value);
        this.degradedSections.set(failedSections);
        this.degraded.set(failedSections.length > 0);
        this.lastUpdated.set(new Date());
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      onError: () => {
        this.error.set('Failed to load dashboard.');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadDashboard(): void {
    this.loading.set(true);
    this.error.set(null);
    this.degraded.set(false);
    this.degradedSections.set([]);

    this.loadDashboardRequest().subscribe({
      next: (data: DashboardData) => {
        const failedSections = Object.entries(data)
          .filter(([, result]) => result.failed)
          .map(([section]) => section);

        this.allResources.set(data.resources.value);
        this.allAlerts.set(data.alerts.value);
        this.allIncidents.set(data.incidents.value);
        this.allEvents.set(data.events.value);
        this.auditLogs.set(data.auditLogs.value);
        this.degradedSections.set(failedSections);
        this.degraded.set(failedSections.length > 0);
        this.lastUpdated.set(new Date());
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.error.set('Failed to load dashboard.');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  private loadDashboardRequest(): Observable<DashboardData> {
    return forkJoin({
      resources: this.dashboardRequest(this.resources.list(), []),
      alerts: this.dashboardRequest(this.alertSvc.list(), []),
      incidents: this.dashboardRequest(this.incidentSvc.list(), []),
      events: this.dashboardRequest(this.eventSvc.list(), []),
      auditLogs: this.dashboardRequest(this.auditSvc.list(), []),
    });
  }

  private dashboardRequest<T>(
    request: Observable<T>,
    fallback: T,
  ): Observable<DashboardResult<T>> {
    return request.pipe(
      map(value => ({ value, failed: false })),
      catchError(() => of({ value: fallback, failed: true })),
    );
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
