import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { IncidentService } from '../../../core/services/incident.service';
import { AuditLogService } from '../../../core/services/audit-log.service';
import { EventService } from '../../../core/services/event.service';
import { StorageResourceService } from '../../../core/services/storage-resource.service';
import {
  Incident, IncidentEvent, Event as InfraEvent, StorageResource,
  RiskScore, RootCauseAnalysis, Recommendation, EngineerAction, AuditLog,
} from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SeverityBadgeComponent } from '../../../shared/components/severity-badge/severity-badge.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { EmptyStateComponent } from '../../../shared/components/empty-state/empty-state.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';

// Phase 10.8 child sections
import { RiskScoreSectionComponent } from './risk-score-section/risk-score-section.component';
import { RcaSectionComponent } from './rca-section/rca-section.component';
import { RecommendationsSectionComponent } from './recommendations-section/recommendations-section.component';
// Phase 10.9 child sections
import { EngineerActionsSectionComponent } from './engineer-actions-section/engineer-actions-section.component';
import { AuditTrailSectionComponent } from './audit-trail-section/audit-trail-section.component';

@Component({
  selector: 'ss-incident-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule,
    PageHeaderComponent, SeverityBadgeComponent, StatusBadgeComponent,
    ErrorBannerComponent, LoadingSpinnerComponent, ConfirmDialogComponent,
    EmptyStateComponent, RelativeTimePipe,
    // Phase 10.8
    RiskScoreSectionComponent, RcaSectionComponent, RecommendationsSectionComponent,
    // Phase 10.9
    EngineerActionsSectionComponent, AuditTrailSectionComponent,
  ],
  templateUrl: './incident-detail.component.html',
  styleUrl:    './incident-detail.component.scss',
})
export class IncidentDetailComponent implements OnInit {
  private readonly route       = inject(ActivatedRoute);
  private readonly incidentSvc = inject(IncidentService);
  private readonly auditLogSvc = inject(AuditLogService);
  private readonly eventSvc    = inject(EventService);
  private readonly resourceSvc = inject(StorageResourceService);
  private readonly fb          = inject(FormBuilder);
  private readonly cdr         = inject(ChangeDetectorRef);

  // ── Core data ─────────────────────────────────────────────
  loading         = signal(true);
  error           = signal<string | null>(null);
  incident        = signal<Incident | null>(null);
  correlatedLinks = signal<IncidentEvent[]>([]);
  eventMap        = signal<Map<number, InfraEvent>>(new Map());
  resourceMap     = signal<Map<number, StorageResource>>(new Map());
  correlatedError = signal<string | null>(null);
  resourceError   = signal<string | null>(null);

  // ── Risk ──────────────────────────────────────────────────
  riskLoading = signal(true);
  riskError   = signal<string | null>(null);
  riskScore   = signal<RiskScore | null>(null);

  // ── RCA ───────────────────────────────────────────────────
  rcaLoading = signal(true);
  rcaError   = signal<string | null>(null);
  rcaItems   = signal<RootCauseAnalysis[]>([]);

  // ── Recommendations ───────────────────────────────────────
  recLoading = signal(true);
  recError   = signal<string | null>(null);
  recItems   = signal<Recommendation[]>([]);

  // ── Engineer Actions ──────────────────────────────────────
  actionsLoading = signal(true);
  actionsError   = signal<string | null>(null);
  actionsItems   = signal<EngineerAction[]>([]);

  // ── Audit Trail ───────────────────────────────────────────
  auditLoading = signal(true);
  auditError   = signal<string | null>(null);
  auditItems   = signal<AuditLog[]>([]);

  // ── Resolve ───────────────────────────────────────────────
  showResolveConfirm = signal(false);
  resolving          = signal(false);
  resolveError       = signal<string | null>(null);

  // ── Assign ───────────────────────────────────────────────
  showAssignForm = signal(false);
  assigning      = signal(false);
  assignError    = signal<string | null>(null);
  assignForm = this.fb.group({
    assignee_id: [null as number | null, [Validators.required, Validators.min(1)]],
  });

  private incidentId = 0;

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(id) || id <= 0) {
      this.error.set('Invalid incident ID.');
      this.loading.set(false);
      this.riskLoading.set(false);
      this.rcaLoading.set(false);
      this.recLoading.set(false);
      this.actionsLoading.set(false);
      this.auditLoading.set(false);
      return;
    }
    this.incidentId = id;
    this.loadAll(id);
  }

  private loadAll(id: number): void {
    // ── Seven concurrent initial reads ────────────────────
    // Incident and correlated-events are required; the five
    // intelligence streams are optional and use catchError so
    // a single failure does not prevent the page from loading.
    forkJoin({
      incident: this.incidentSvc.get(id),
      links:    this.incidentSvc.listEvents(id).pipe(catchError(() => {
        this.correlatedError.set('Failed to load correlated events.');
        return of([]);
      })),
      risk:     this.incidentSvc.getRisk(id).pipe(catchError((err: HttpErrorResponse) => {
        this.riskError.set(err.status === 404 ? 'Risk score not available.' : 'Failed to load risk score.');
        this.riskLoading.set(false);
        return of(null);
      })),
      rca:      this.incidentSvc.listRca(id).pipe(catchError(() => {
        this.rcaError.set('Failed to load root cause analyses.');
        this.rcaLoading.set(false);
        return of(null);
      })),
      recs:     this.incidentSvc.listRecommendations(id).pipe(catchError(() => {
        this.recError.set('Failed to load recommendations.');
        this.recLoading.set(false);
        return of(null);
      })),
      actions:  this.incidentSvc.listActions(id).pipe(catchError(() => {
        this.actionsError.set('Failed to load engineer actions.');
        this.actionsLoading.set(false);
        return of(null);
      })),
      auditLogs: this.auditLogSvc.listByIncident(id).pipe(catchError(() => {
        this.auditError.set('Failed to load audit trail.');
        this.auditLoading.set(false);
        return of(null);
      })),
    }).subscribe({
      next: ({ incident, links, risk, rca, recs, actions, auditLogs }) => {
        this.incident.set(incident);
        this.correlatedLinks.set(links);

        // Settle intelligence sections
        if (risk)     { this.riskScore.set(risk); }
        if (rca)      { this.rcaItems.set(rca); }
        if (recs)     { this.recItems.set(recs); }
        if (actions)  { this.actionsItems.set(actions); }
        if (auditLogs){ this.auditItems.set(auditLogs); }

        this.riskLoading.set(false);
        this.rcaLoading.set(false);
        this.recLoading.set(false);
        this.actionsLoading.set(false);
        this.auditLoading.set(false);

        // Correlated-event detail loading (parallel fan-out, Phase 10.7 unchanged)
        const eventIds = [...new Set(links.map(l => l.event_id))];
        if (eventIds.length === 0) {
          this.loading.set(false);
          this.cdr.markForCheck();
          return;
        }

        const eventFetches = eventIds.map(eid =>
          this.eventSvc.get(eid).pipe(catchError(() => {
            this.correlatedError.set('Some correlated event details could not be loaded.');
            return of(null);
          })),
        );

        forkJoin(eventFetches).subscribe(events => {
          const eMap = new Map<number, InfraEvent>();
          const resourceIds = new Set<number>();
          events.forEach(e => {
            if (e) { eMap.set(e.id, e); resourceIds.add(e.resource_id); }
          });
          this.eventMap.set(eMap);

          if (resourceIds.size === 0) {
            this.loading.set(false);
            this.cdr.markForCheck();
            return;
          }

          const resFetches = [...resourceIds].map(rid =>
            this.resourceSvc.get(rid).pipe(catchError(() => {
              this.resourceError.set('Some related storage resources could not be loaded.');
              return of(null);
            })),
          );
          forkJoin(resFetches).subscribe(resources => {
            const rMap = new Map<number, StorageResource>();
            resources.forEach(r => { if (r) rMap.set(r.id, r); });
            this.resourceMap.set(rMap);
            this.loading.set(false);
            this.cdr.markForCheck();
          });
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.status === 404 ? 'Incident not found.' : 'Failed to load incident.');
        this.loading.set(false);
        this.riskLoading.set(false);
        this.rcaLoading.set(false);
        this.recLoading.set(false);
        this.actionsLoading.set(false);
        this.auditLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Targeted retries (called from child @Output) ──────────

  retryRisk(): void {
    this.riskLoading.set(true);
    this.riskError.set(null);
    this.incidentSvc.getRisk(this.incidentId).subscribe({
      next: (r) => { this.riskScore.set(r); this.riskLoading.set(false); this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => {
        this.riskError.set(err.status === 404 ? 'Risk score not available.' : 'Failed to load risk score.');
        this.riskLoading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  retryRca(): void {
    this.rcaLoading.set(true);
    this.rcaError.set(null);
    this.incidentSvc.listRca(this.incidentId).subscribe({
      next: (list) => { this.rcaItems.set(list); this.rcaLoading.set(false); this.cdr.markForCheck(); },
      error: () => { this.rcaError.set('Failed to load root cause analyses.'); this.rcaLoading.set(false); this.cdr.markForCheck(); },
    });
  }

  retryRec(): void {
    this.recLoading.set(true);
    this.recError.set(null);
    this.incidentSvc.listRecommendations(this.incidentId).subscribe({
      next: (list) => { this.recItems.set(list); this.recLoading.set(false); this.cdr.markForCheck(); },
      error: () => { this.recError.set('Failed to load recommendations.'); this.recLoading.set(false); this.cdr.markForCheck(); },
    });
  }

  retryActions(): void {
    this.actionsLoading.set(true);
    this.actionsError.set(null);
    this.incidentSvc.listActions(this.incidentId).subscribe({
      next: (list) => { this.actionsItems.set(list); this.actionsLoading.set(false); this.cdr.markForCheck(); },
      error: () => { this.actionsError.set('Failed to load engineer actions.'); this.actionsLoading.set(false); this.cdr.markForCheck(); },
    });
  }

  retryAudit(): void {
    this.auditLoading.set(true);
    this.auditError.set(null);
    this.auditLogSvc.listByIncident(this.incidentId).subscribe({
      next: (list) => { this.auditItems.set(list); this.auditLoading.set(false); this.cdr.markForCheck(); },
      error: () => { this.auditError.set('Failed to load audit trail.'); this.auditLoading.set(false); this.cdr.markForCheck(); },
    });
  }

  retryCorrelatedData(): void {
    this.correlatedError.set(null);
    this.resourceError.set(null);
    this.loadAll(this.incidentId);
  }

  // ── Resolve workflow ──────────────────────────────────────
  onResolveConfirmed(): void {
    const inc = this.incident();
    if (!inc || this.resolving()) return;

    this.showResolveConfirm.set(false);
    this.resolving.set(true);
    this.resolveError.set(null);

    this.incidentSvc.resolve(inc.id).subscribe({
      next: (updated) => { this.incident.set(updated); this.resolving.set(false); this.cdr.markForCheck(); },
      error: (err: HttpErrorResponse) => {
        if (err.status === 409)       this.resolveError.set('This incident has already been resolved.');
        else if (err.status === 404)  this.resolveError.set('Incident no longer exists.');
        else                          this.resolveError.set('Failed to resolve incident. Please try again.');
        this.resolving.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Assign workflow ───────────────────────────────────────
  onAssignSubmit(): void {
    if (this.assignForm.invalid || this.assigning()) return;
    const inc = this.incident();
    if (!inc) return;

    const assigneeId = Number(this.assignForm.value.assignee_id);
    this.assigning.set(true);
    this.assignError.set(null);

    this.incidentSvc.assign(inc.id, assigneeId).subscribe({
      next: (updated) => {
        this.incident.set(updated);
        this.showAssignForm.set(false);
        this.assignForm.reset();
        this.assigning.set(false);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.assignError.set(
          err.status === 404 ? 'Incident not found.' :
          err.status === 400 ? (err.error?.error ?? 'Invalid assignee ID.') :
          'Failed to assign incident.',
        );
        this.assigning.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  // ── Helpers ───────────────────────────────────────────────
  getEvent(eventId: number): InfraEvent | undefined {
    return this.eventMap().get(eventId);
  }

  getResourceName(resourceId: number): string {
    return this.resourceMap().get(resourceId)?.name ?? `Resource ${resourceId}`;
  }

  get isResolvable(): boolean {
    const inc = this.incident();
    return inc !== null && inc.status !== 'resolved';
  }

  toggleAssignForm(): void {
    this.showAssignForm.update(v => !v);
  }
}
