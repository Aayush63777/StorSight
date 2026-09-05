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
import { FormsModule } from '@angular/forms';

import { AuditLogService } from '../../core/services/audit-log.service';
import { AuditLog } from '../../core/models';
import { PageHeaderComponent } from '../../shared/components/page-header/page-header.component';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorBannerComponent } from '../../shared/components/error-banner/error-banner.component';
import { RelativeTimePipe } from '../../shared/pipes/relative-time.pipe';

const PAGE_SIZE = 20;

@Component({
  selector: 'ss-audit-logs',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    FormsModule,
    PageHeaderComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    ErrorBannerComponent,
    RelativeTimePipe,
  ],
  templateUrl: './audit-logs.component.html',
  styleUrl:    './audit-logs.component.scss',
})
export class AuditLogsComponent implements OnInit {
  private readonly auditSvc = inject(AuditLogService);
  private readonly cdr      = inject(ChangeDetectorRef);

  // ── State ──────────────────────────────────────────────────
  loading = signal(true);
  error   = signal<string | null>(null);
  allLogs = signal<AuditLog[]>([]);

  // ── Filters ───────────────────────────────────────────────
  entityTypeFilter = signal('');
  actionKeyword    = signal('');

  // ── Pagination ────────────────────────────────────────────
  currentPage = signal(1);
  readonly pageSize = PAGE_SIZE;

  // ── Derived: distinct entity types for dropdown ───────────
  entityTypes = computed(() => {
    const types = new Set(
      this.allLogs()
        .map(l => l.entity_type)
        .filter((t): t is string => !!t),
    );
    return [...types].sort();
  });

  // ── Derived: filtered list ────────────────────────────────
  filtered = computed(() => {
    const typeFilter    = this.entityTypeFilter();
    const keyword       = this.actionKeyword().toLowerCase().trim();
    return this.allLogs().filter(log => {
      const typeMatch    = typeFilter ? log.entity_type === typeFilter : true;
      const keywordMatch = keyword
        ? log.action.toLowerCase().includes(keyword)
        : true;
      return typeMatch && keywordMatch;
    });
  });

  // ── Derived: paginated slice ──────────────────────────────
  totalPages = computed(() =>
    Math.max(1, Math.ceil(this.filtered().length / PAGE_SIZE)),
  );

  paginated = computed(() => {
    const page  = this.currentPage();
    const start = (page - 1) * PAGE_SIZE;
    return this.filtered().slice(start, start + PAGE_SIZE);
  });

  hasActiveFilters = computed(() =>
    this.entityTypeFilter() !== '' || this.actionKeyword().trim() !== '',
  );

  ngOnInit(): void {
    this.load();
  }

  load(): void {
    this.loading.set(true);
    this.error.set(null);

    this.auditSvc.list().subscribe({
      next: (logs) => {
        this.allLogs.set(logs);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.error.set('Failed to load audit logs.');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  onEntityTypeChange(value: string): void {
    this.entityTypeFilter.set(value);
    this.currentPage.set(1);
  }

  onActionKeywordChange(value: string): void {
    this.actionKeyword.set(value);
    this.currentPage.set(1);
  }

  clearFilters(): void {
    this.entityTypeFilter.set('');
    this.actionKeyword.set('');
    this.currentPage.set(1);
  }

  prevPage(): void {
    if (this.currentPage() > 1) {
      this.currentPage.update(p => p - 1);
    }
  }

  nextPage(): void {
    if (this.currentPage() < this.totalPages()) {
      this.currentPage.update(p => p + 1);
    }
  }

  /**
   * Strip the "engineer_action:" prefix, replace underscores with spaces,
   * and title-case the result.
   * Source: dashboard.component.ts — exact same implementation.
   */
  formatAction(action: string): string {
    return action
      .replace('engineer_action:', '')
      .replace(/_/g, ' ')
      .replace(/\b\w/g, c => c.toUpperCase());
  }

  truncateDetails(details: string | null): string {
    if (!details) return '—';
    return details.length > 80 ? details.slice(0, 80) + '…' : details;
  }

  trackById(_: number, log: AuditLog): number { return log.id; }
}
