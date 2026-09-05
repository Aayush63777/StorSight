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
import { Subject } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil } from 'rxjs/operators';

import { StorageResourceService } from '../../../core/services/storage-resource.service';
import { StorageResource } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';

const STATUS_OPTIONS        = ['', 'healthy', 'warning', 'critical', 'offline'] as const;
const RESOURCE_TYPE_OPTIONS = ['', 'SAN', 'NAS', 'iSCSI', 'NVMe', 'Object'] as const;

@Component({
  selector: 'ss-storage-resource-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    PageHeaderComponent,
    StatusBadgeComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    ErrorBannerComponent,
    RelativeTimePipe,
  ],
  templateUrl: './storage-resource-list.component.html',
  styleUrl:    './storage-resource-list.component.scss',
})
export class StorageResourceListComponent implements OnInit, OnDestroy {
  private readonly svc    = inject(StorageResourceService);
  private readonly router = inject(Router);
  private readonly cdr    = inject(ChangeDetectorRef);
  private readonly destroy$ = new Subject<void>();

  readonly statusOptions       = STATUS_OPTIONS;
  readonly resourceTypeOptions = RESOURCE_TYPE_OPTIONS;

  // ── State ──────────────────────────────────────────────────
  loading     = signal(true);
  error       = signal<string | null>(null);
  resources   = signal<StorageResource[]>([]);

  // ── Filter state ───────────────────────────────────────────
  nameFilter         = signal('');
  statusFilter       = signal('');
  resourceTypeFilter = signal('');

  // ── Filtered view (client-side name search on top of API results) ──
  filtered = computed(() => {
    const name = this.nameFilter().toLowerCase().trim();
    return name
      ? this.resources().filter(r => r.name.toLowerCase().includes(name))
      : this.resources();
  });

  hasActiveFilters = computed(() =>
    !!(this.nameFilter().trim() || this.statusFilter() || this.resourceTypeFilter()),
  );

  // ── Debounced name search stream (no extra API call — filter is client-side) ──
  private readonly nameSearch$ = new Subject<string>();

  ngOnInit(): void {
    // Name search is client-side (no ?name= param on backend).
    // Wire debounce to prevent excessive signal updates during typing.
    this.nameSearch$.pipe(
      debounceTime(150),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(v => {
      this.nameFilter.set(v);
      this.cdr.markForCheck();
    });

    this.loadResources();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onNameInput(value: string): void {
    this.nameSearch$.next(value);
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.nameFilter.set('');
    this.nameSearch$.next('');
    this.loadResources();
  }

  onResourceTypeChange(value: string): void {
    this.resourceTypeFilter.set(value);
    this.statusFilter.set('');
    this.nameFilter.set('');
    this.nameSearch$.next('');
    this.loadResources();
  }

  clearFilters(): void {
    this.statusFilter.set('');
    this.resourceTypeFilter.set('');
    this.nameFilter.set('');
    this.nameSearch$.next('');
    this.loadResources();
  }

  loadResources(): void {
    this.loading.set(true);
    this.error.set(null);

    const status       = this.statusFilter() || undefined;
    const resource_type = this.resourceTypeFilter() || undefined;

    this.svc.list({ status, resource_type }).subscribe({
      next: (list) => {
        this.resources.set(list);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.error.set('Failed to load storage resources.');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  navigateTo(id: number): void {
    this.router.navigate(['/storage-resources', id]);
  }

  /** Safe utilisation percentage clamped 0–100. */
  utilPercent(r: StorageResource): number {
    if (!r.capacity_total || r.capacity_total <= 0) return 0;
    return Math.min(100, Math.round(((r.capacity_used ?? 0) / r.capacity_total) * 100));
  }

  /** CSS class for utilisation bar colour. */
  utilClass(r: StorageResource): string {
    const pct = this.utilPercent(r);
    if (pct >= 90) return 'util-bar__fill--critical';
    if (pct >= 75) return 'util-bar__fill--warning';
    return 'util-bar__fill--ok';
  }

  formatCapacity(gb: number | null): string {
    if (gb === null || gb === undefined) return '—';
    if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`;
    return `${gb} GB`;
  }

  trackById(_: number, r: StorageResource): number { return r.id; }
}
