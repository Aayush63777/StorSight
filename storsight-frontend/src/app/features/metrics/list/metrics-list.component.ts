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
import { FormsModule } from '@angular/forms';
import { Subject, forkJoin, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, catchError } from 'rxjs/operators';

import { MetricService } from '../../../core/services/metric.service';
import { StorageResourceService } from '../../../core/services/storage-resource.service';
import { Metric, MetricPage, StorageResource } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'ss-metrics-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    PageHeaderComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    ErrorBannerComponent,
    RelativeTimePipe,
  ],
  templateUrl: './metrics-list.component.html',
  styleUrl:    './metrics-list.component.scss',
})
export class MetricsListComponent implements OnInit, OnDestroy {
  private readonly metricSvc   = inject(MetricService);
  private readonly resourceSvc = inject(StorageResourceService);
  private readonly router      = inject(Router);
  private readonly cdr         = inject(ChangeDetectorRef);
  private readonly destroy$    = new Subject<void>();

  // ── State ──────────────────────────────────────────────────
  loading         = signal(true);
  resourcesLoading = signal(true);
  error           = signal<string | null>(null);
  resourceError   = signal<string | null>(null);
  metrics         = signal<Metric[]>([]);
  pagination      = signal<MetricPage['pagination']>({ page: 1, page_size: 50, total: 0, total_pages: 0 });
  timeRange       = signal('24h');
  refreshBusy     = signal(false);
  resources       = signal<StorageResource[]>([]);

  // ── Filter state ───────────────────────────────────────────
  // Backend: ?resource_id OR ?metric_name — mutually exclusive
  resourceFilter   = signal<number | null>(null);
  metricNameFilter = signal('');

  hasActiveFilters = computed(() =>
    this.resourceFilter() !== null || this.metricNameFilter().trim() !== '' || this.timeRange() !== '24h',
  );

  emptyReason = computed(() => {
    const selected = this.resourceFilter() === null
      ? this.resources()
      : this.resources().filter(r => r.id === this.resourceFilter());
    if (selected.some(r => r.monitoring_state === 'error')) return 'provider_failure';
    if (selected.some(r => r.monitoring_state === 'stale')) return 'stale';
    if (selected.length > 0 && selected.every(r => !r.monitoring_enabled || r.monitoring_state === 'unconfigured')) return 'unconfigured';
    if (this.hasActiveFilters()) return 'filtered';
    return 'no_telemetry';
  });

  /** Lookup map: resource_id → resource name */
  resourceMap = computed(() => {
    const map = new Map<number, string>();
    this.resources().forEach(r => map.set(r.id, r.name));
    return map;
  });

  resourceName(id: number): string {
    return this.resourceMap().get(id) ?? `Resource ${id}`;
  }

  trendMetric = computed(() => {
    const metrics = this.metrics();
    const selected = this.metricNameFilter().trim().toLowerCase();
    if (selected) return selected;
    return metrics.length ? metrics[0].metric_name : null;
  });

  trendPoints = computed(() => {
    const name = this.trendMetric();
    if (!name) return [] as Array<{ value: number; height: number; recorded_at: string }>;
    const points = this.metrics()
      .filter(metric => metric.metric_name.toLowerCase() === name)
      .slice()
      .reverse();
    const values = points.map(point => point.metric_value);
    const min = Math.min(...values);
    const max = Math.max(...values);
    const range = max - min || 1;
    return points.map(point => ({
      value: point.metric_value,
      height: 12 + ((point.metric_value - min) / range) * 88,
      recorded_at: point.recorded_at,
    }));
  });

  // Debounce stream for metric name filter (triggers an API call)
  private readonly nameInput$ = new Subject<string>();

  ngOnInit(): void {
    // Load resources for the dropdown (once, no N+1)
    this.loadResources();

    // Wire metric name debounce → API call
    this.nameInput$.pipe(
      debounceTime(400),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(name => {
      this.metricNameFilter.set(name);
      this.loadMetrics();
    });

    this.loadMetrics();
  }

  loadResources(): void {
    this.resourcesLoading.set(true);
    this.resourceError.set(null);
    this.resourceSvc.list().pipe(catchError(() => {
      this.resourceError.set('Failed to load storage resources for filtering.');
      return of([]);
    })).subscribe(list => {
      this.resources.set(list);
      this.resourcesLoading.set(false);
      this.cdr.markForCheck();
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onResourceChange(value: string): void {
    const id = value === '' ? null : Number(value);
    this.resourceFilter.set(id);
    this.metricNameFilter.set('');
    this.nameInput$.next('');
    this.loadMetrics();
  }

  onNameInput(value: string): void {
    // If user types, clear resource filter (mutually exclusive)
    if (value.trim()) {
      this.resourceFilter.set(null);
    }
    this.nameInput$.next(value);
  }

  clearFilters(): void {
    this.resourceFilter.set(null);
    this.metricNameFilter.set('');
    this.timeRange.set('24h');
    this.nameInput$.next('');
    this.loadMetrics();
  }

  loadMetrics(): void {
    this.loading.set(true);
    this.error.set(null);

    const rangeHours: Record<string, number> = { '15m': 0.25, '1h': 1, '6h': 6, '24h': 24, '7d': 168 };
    const from = new Date(Date.now() - rangeHours[this.timeRange()] * 3600_000).toISOString();
    const resource_id = this.resourceFilter() ?? undefined;
    const metric_name = this.metricNameFilter().trim() || undefined;

    this.metricSvc.page({ resource_id, metric_name, page: this.pagination().page, page_size: 50, from }).subscribe({
      next: (result) => {
        this.metrics.set(result.items);
        this.pagination.set(result.pagination);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.error.set('Failed to load metrics.');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  onTimeRangeChange(value: string): void {
    this.timeRange.set(value);
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.loadMetrics();
  }

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination().total_pages) return;
    this.pagination.update(p => ({ ...p, page }));
    this.loadMetrics();
  }

  refresh(): void {
    if (this.refreshBusy()) return;
    this.refreshBusy.set(true);
    this.loadResources();
    this.loadMetrics();
    setTimeout(() => this.refreshBusy.set(false), 300);
  }

  navigateTo(id: number): void {
    this.router.navigate(['/metrics', id]);
  }

  formatValue(value: number, unit: string | null): string {
    const rounded = Number.isInteger(value) ? value : value.toFixed(2);
    return unit ? `${rounded} ${unit}` : String(rounded);
  }

  trackById(_: number, m: Metric): number { return m.id; }
}
