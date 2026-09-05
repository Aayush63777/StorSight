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
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { IncidentService } from '../../../core/services/incident.service';
import { Incident } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SeverityBadgeComponent } from '../../../shared/components/severity-badge/severity-badge.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';

/** Incident severities from backend */
const INCIDENT_SEVERITIES = ['low', 'medium', 'high', 'critical'] as const;
/** Incident statuses from backend */
const INCIDENT_STATUSES   = ['open', 'in_progress', 'resolved'] as const;

@Component({
  selector: 'ss-incident-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule,
    PageHeaderComponent, SeverityBadgeComponent, StatusBadgeComponent,
    EmptyStateComponent, LoadingSpinnerComponent, ErrorBannerComponent,
    RelativeTimePipe,
  ],
  templateUrl: './incident-list.component.html',
  styleUrl:    './incident-list.component.scss',
})
export class IncidentListComponent implements OnInit {
  private readonly incidentSvc = inject(IncidentService);
  private readonly router      = inject(Router);
  private readonly cdr         = inject(ChangeDetectorRef);

  readonly severities = INCIDENT_SEVERITIES;
  readonly statuses   = INCIDENT_STATUSES;

  // ── State ──────────────────────────────────────────────────
  loading  = signal(true);
  error    = signal<string | null>(null);
  incidents = signal<Incident[]>([]);

  // ── Filters (mutually exclusive server-side: status OR severity) ──
  statusFilter   = signal('');
  severityFilter = signal('');

  hasActiveFilters = computed(() =>
    this.statusFilter() !== '' || this.severityFilter() !== '',
  );

  ngOnInit(): void {
    this.loadIncidents();
  }

  onStatusChange(value: string): void {
    this.statusFilter.set(value);
    this.severityFilter.set('');   // mutually exclusive
    this.loadIncidents();
  }

  onSeverityChange(value: string): void {
    this.severityFilter.set(value);
    this.statusFilter.set('');     // mutually exclusive
    this.loadIncidents();
  }

  clearFilters(): void {
    this.statusFilter.set('');
    this.severityFilter.set('');
    this.loadIncidents();
  }

  loadIncidents(): void {
    this.loading.set(true);
    this.error.set(null);

    const status   = this.statusFilter()   || undefined;
    const severity = this.severityFilter() || undefined;

    this.incidentSvc.list({ status, severity }).subscribe({
      next: (list) => {
        this.incidents.set(list);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: () => {
        this.error.set('Failed to load incidents.');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  navigateTo(id: number): void {
    this.router.navigate(['/incidents', id]);
  }

  trackById(_: number, i: Incident): number { return i.id; }
}
