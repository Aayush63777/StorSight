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
import { Metric, StorageResource } from '../../../core/models';
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
  resources       = signal<StorageResource[]>([]);

  // ── Filter state ───────────────────────────────────────────
  // Backend: ?resource_id OR ?metric_name — mutually exclusive
  resourceFilter   = signal<number | null>(null);
  metricNameFilter = signal('');

  hasActiveFilters = computed(() =>
    this.resourceFilter() !== null || this.metricNameFilter().trim() !== '',
  );

  /** Lookup map: resource_id → resource name */
  resourceMap = computed(() => {
    const map = new Map<number, string>();
    this.resources().forEach(r => map.set(r.id, r.name));
    return map;
  });

  resourceName(id: number): string {
    return this.resourceMap().get(id) ?? `Resource ${id}`;
  }

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
    this.nameInput$.next('');
    this.loadMetrics();
  }

  loadMetrics(): void {
    this.loading.set(true);
    this.error.set(null);

    const resource_id   = this.resourceFilter() ?? undefined;
    const metric_name   = this.metricNameFilter().trim() || undefined;

    this.metricSvc.list({ resource_id, metric_name }).subscribe({
      next: (list) => {
        this.metrics.set(list);
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

  navigateTo(id: number): void {
    this.router.navigate(['/metrics', id]);
  }

  formatValue(value: number, unit: string | null): string {
    const rounded = Number.isInteger(value) ? value : value.toFixed(2);
    return unit ? `${rounded} ${unit}` : String(rounded);
  }

  trackById(_: number, m: Metric): number { return m.id; }
}
