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
import { Subject, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, catchError } from 'rxjs/operators';

import { EventService } from '../../../core/services/event.service';
import { StorageResourceService } from '../../../core/services/storage-resource.service';
import { Event as InfraEvent, StorageResource } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SeverityBadgeComponent } from '../../../shared/components/severity-badge/severity-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';

/** Backend-allowed severity values for events. */
const EVENT_SEVERITIES = ['info', 'warning', 'error', 'critical'] as const;

@Component({
  selector: 'ss-event-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    FormsModule,
    PageHeaderComponent,
    SeverityBadgeComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    ErrorBannerComponent,
    RelativeTimePipe,
  ],
  templateUrl: './event-list.component.html',
  styleUrl:    './event-list.component.scss',
})
export class EventListComponent implements OnInit, OnDestroy {
  private readonly eventSvc    = inject(EventService);
  private readonly resourceSvc = inject(StorageResourceService);
  private readonly router      = inject(Router);
  private readonly cdr         = inject(ChangeDetectorRef);
  private readonly destroy$    = new Subject<void>();

  readonly severities = EVENT_SEVERITIES;

  // ── State ──────────────────────────────────────────────────
  loading          = signal(true);
  resourcesLoading = signal(true);
  error            = signal<string | null>(null);
  events           = signal<InfraEvent[]>([]);
  resources        = signal<StorageResource[]>([]);

  // ── Filter state (backend: mutually exclusive) ─────────────
  resourceFilter  = signal<number | null>(null);
  severityFilter  = signal('');

  // Client-side event_type search (no dedicated combined API param)
  eventTypeSearch = signal('');
  private readonly typeSearch$ = new Subject<string>();

  /** Apply client-side event_type search on top of API results. */
  filtered = computed(() => {
    const q = this.eventTypeSearch().toLowerCase().trim();
    return q
      ? this.events().filter(e => e.event_type.toLowerCase().includes(q))
      : this.events();
  });

  hasActiveFilters = computed(() =>
    this.resourceFilter() !== null ||
    this.severityFilter() !== '' ||
    this.eventTypeSearch().trim() !== '',
  );

  /** Lookup: resource_id → name */
  resourceMap = computed(() => {
    const map = new Map<number, string>();
    this.resources().forEach(r => map.set(r.id, r.name));
    return map;
  });

  resourceName(id: number): string {
    return this.resourceMap().get(id) ?? `Resource ${id}`;
  }

  ngOnInit(): void {
    // Load resource list once
    this.resourceSvc.list().pipe(catchError(() => of([]))).subscribe(list => {
      this.resources.set(list);
      this.resourcesLoading.set(false);
      this.cdr.markForCheck();
    });

    // Client-side event_type debounce
    this.typeSearch$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(v => {
      this.eventTypeSearch.set(v);
      this.cdr.markForCheck();
    });

    this.loadEvents();
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  onResourceChange(value: string): void {
    const id = value === '' ? null : Number(value);
    this.resourceFilter.set(id);
    this.severityFilter.set('');    // clear other filter (mutually exclusive)
    this.eventTypeSearch.set('');
    this.typeSearch$.next('');
    this.loadEvents();
  }

  onSeverityChange(value: string): void {
    this.severityFilter.set(value);
    this.resourceFilter.set(null);  // clear other filter (mutually exclusive)
    this.eventTypeSearch.set('');
    this.typeSearch$.next('');
    this.loadEvents();
  }

  onTypeInput(value: string): void {
    this.typeSearch$.next(value);
  }

  clearFilters(): void {
    this.resourceFilter.set(null);
    this.severityFilter.set('');
    this.eventTypeSearch.set('');
    this.typeSearch$.next('');
    this.loadEvents();
  }

  loadEvents(): void {
    this.loading.set(true);
    this.error.set(null);

    const resource_id = this.resourceFilter() ?? undefined;
    const severity    = this.severityFilter() || undefined;

    this.eventSvc.list({ resource_id, severity }).subscribe({
      next: (list) => {
        this.events.set(list);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.error.set('Failed to load events.');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  navigateTo(id: number): void {
    this.router.navigate(['/events', id]);
  }

  trackById(_: number, e: InfraEvent): number { return e.id; }
}
