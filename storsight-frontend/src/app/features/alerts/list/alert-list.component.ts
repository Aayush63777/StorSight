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
import { FormsModule } from '@angular/forms';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AlertService } from '../../../core/services/alert.service';
import { StorageResourceService } from '../../../core/services/storage-resource.service';
import { Alert, StorageResource } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SeverityBadgeComponent } from '../../../shared/components/severity-badge/severity-badge.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';

/** Alert severities from backend: info | warning | critical */
const ALERT_SEVERITIES = ['info', 'warning', 'critical'] as const;
/** Alert statuses from backend: active | resolved */
const ALERT_STATUSES   = ['active', 'resolved'] as const;

@Component({
  selector: 'ss-alert-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterLink, FormsModule,
    PageHeaderComponent, SeverityBadgeComponent, StatusBadgeComponent,
    EmptyStateComponent, LoadingSpinnerComponent, ErrorBannerComponent,
    ConfirmDialogComponent, RelativeTimePipe,
  ],
  templateUrl: './alert-list.component.html',
  styleUrl:    './alert-list.component.scss',
})
export class AlertListComponent implements OnInit {
  private readonly alertSvc    = inject(AlertService);
  private readonly resourceSvc = inject(StorageResourceService);
  private readonly router      = inject(Router);
  private readonly cdr         = inject(ChangeDetectorRef);

  readonly severities = ALERT_SEVERITIES;
  readonly statuses   = ALERT_STATUSES;

  // ── State ──────────────────────────────────────────────────
  loading          = signal(true);
  resourcesLoading = signal(true);
  error            = signal<string | null>(null);
  alerts           = signal<Alert[]>([]);
  resources        = signal<StorageResource[]>([]);

  // ── Resolve inline ─────────────────────────────────────────
  resolveTarget    = signal<Alert | null>(null);
  resolving        = signal(false);
  resolveError     = signal<string | null>(null);

  // ── Filters (mutually exclusive server-side) ───────────────
  resourceFilter  = signal<number | null>(null);
  severityFilter  = signal('');
  statusFilter    = signal('');

  hasActiveFilters = computed(() =>
    this.resourceFilter() !== null ||
    this.severityFilter() !== '' ||
    this.statusFilter() !== '',
  );

  resourceMap = computed(() => {
    const map = new Map<number, string>();
    this.resources().forEach(r => map.set(r.id, r.name));
    return map;
  });

  resourceName(id: number): string {
    return this.resourceMap().get(id) ?? `Resource ${id}`;
  }

  ngOnInit(): void {
    this.resourceSvc.list().pipe(catchError(() => of([]))).subscribe(list => {
      this.resources.set(list);
      this.resourcesLoading.set(false);
      this.cdr.markForCheck();
    });
    this.loadAlerts();
  }

  onResourceChange(value: string): void {
    this.resourceFilter.set(value === '' ? null : Number(value));
    this.severityFilter.set('');
    this.statusFilter.set('');
    this.loadAlerts();
  }

  onSeverityChange(value: string): void {
    this.severityFilter.set(value);
    this.resourceFilter.set(null);
    this.statusFilter.set('');
    this.loadAlerts();
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.resourceFilter.set(null);
    this.severityFilter.set('');
    this.loadAlerts();
  }

  clearFilters(): void {
    this.resourceFilter.set(null);
    this.severityFilter.set('');
    this.statusFilter.set('');
    this.loadAlerts();
  }

  loadAlerts(): void {
    this.loading.set(true);
    this.error.set(null);
    const resource_id = this.resourceFilter() ?? undefined;
    const severity    = this.severityFilter() || undefined;
    const status      = this.statusFilter() || undefined;

    this.alertSvc.list({ resource_id, severity, status }).subscribe({
      next: (list) => {
        this.alerts.set(list);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.error.set('Failed to load alerts.');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  navigateTo(id: number): void {
    this.router.navigate(['/alerts', id]);
  }

  // ── Inline resolve ─────────────────────────────────────────
  openResolveDialog(alert: Alert, event: MouseEvent): void {
    event.stopPropagation();
    this.resolveTarget.set(alert);
    this.resolveError.set(null);
  }

  cancelResolve(): void {
    this.resolveTarget.set(null);
  }

  confirmResolve(): void {
    const target = this.resolveTarget();
    if (!target || this.resolving()) return;

    this.resolving.set(true);
    this.resolveTarget.set(null);

    this.alertSvc.resolve(target.id).subscribe({
      next: (updated) => {
        this.alerts.update(list =>
          list.map(a => a.id === updated.id ? updated : a),
        );
        this.resolving.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.resolveError.set('Failed to resolve alert. Please try again.');
        this.resolving.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  trackById(_: number, a: Alert): number { return a.id; }
}
