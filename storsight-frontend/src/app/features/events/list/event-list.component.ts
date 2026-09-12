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
import { Subject, Subscription, of } from 'rxjs';
import { debounceTime, distinctUntilChanged, takeUntil, catchError } from 'rxjs/operators';

import { EventService } from '../../../core/services/event.service';
import { StorageResourceService } from '../../../core/services/storage-resource.service';
import { Event as InfraEvent, EventPage, StorageResource } from '../../../core/models';
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
  resourceError    = signal<string | null>(null);
  events           = signal<InfraEvent[]>([]);
  pagination       = signal<EventPage['pagination']>({ page: 1, page_size: 50, total: 0, total_pages: 0 });
  resources        = signal<StorageResource[]>([]);
  refreshBusy      = signal(false);
  private eventsSubscription?: Subscription;

  // ── Filter state ───────────────────────────────────────────
  resourceFilter  = signal<number | null>(null);
  severityFilter  = signal('');

  eventTypeSearch = signal('');
  private readonly typeSearch$ = new Subject<string>();

  filtered = computed(() => this.events());

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
    this.loadResources();

    // Client-side event_type debounce
    this.typeSearch$.pipe(
      debounceTime(200),
      distinctUntilChanged(),
      takeUntil(this.destroy$),
    ).subscribe(v => {
      this.eventTypeSearch.set(v);
      this.pagination.update(p => ({ ...p, page: 1 }));
      this.loadEvents();
      this.cdr.markForCheck();
    });

    this.loadEvents();
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
    this.eventsSubscription?.unsubscribe();
    this.destroy$.next();
    this.destroy$.complete();
  }

  onResourceChange(value: string): void {
    const id = value === '' ? null : Number(value);
    this.resourceFilter.set(id);
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.loadEvents();
  }

  onSeverityChange(value: string): void {
    this.severityFilter.set(value);
    this.pagination.update(p => ({ ...p, page: 1 }));
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
    this.pagination.update(p => ({ ...p, page: 1 }));
    this.loadEvents();
  }

  loadEvents(): void {
    this.eventsSubscription?.unsubscribe();
    this.loading.set(true);
    this.error.set(null);

    const resource_id = this.resourceFilter() ?? undefined;
    const severity    = this.severityFilter() || undefined;
    const event_type  = this.eventTypeSearch().trim() || undefined;

    this.eventsSubscription = this.eventSvc.page({
      resource_id,
      severity,
      event_type,
      page: this.pagination().page,
      page_size: 50,
    }).subscribe({
      next: (result) => {
        this.events.set(result.items);
        this.pagination.set(result.pagination);
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

  goToPage(page: number): void {
    if (page < 1 || page > this.pagination().total_pages) return;
    this.pagination.update(p => ({ ...p, page }));
    this.loadEvents();
  }

  refresh(): void {
    if (this.refreshBusy()) return;
    this.refreshBusy.set(true);
    this.loadResources();
    this.loadEvents();
    setTimeout(() => this.refreshBusy.set(false), 300);
  }

  navigateTo(id: number): void {
    this.router.navigate(['/events', id]);
  }

  trackById(_: number, e: InfraEvent): number { return e.id; }
}
