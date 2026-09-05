import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { IncidentDetailComponent } from './incident-detail.component';
import { Incident, IncidentEvent, Event as InfraEvent, RiskScore, RootCauseAnalysis, Recommendation, EngineerAction, AuditLog } from '../../../core/models';
import { routes } from '../../../app.routes';

const API       = 'http://localhost:5000';
const INC_BASE  = `${API}/api/incidents/`;
const EVTS_BASE = `${API}/api/events/`;

const INCIDENT: Incident = {
  id: 10, title: 'SAN latency spike', description: 'Latency exceeded 50ms.',
  severity: 'high', status: 'open', assignee_id: null,
  created_at: '2026-01-03T00:00:00', updated_at: '2026-01-03T00:00:00', resolved_at: null,
};

const RESOLVED_INCIDENT: Incident = { ...INCIDENT, status: 'resolved', resolved_at: '2026-01-03T12:00:00' };

const LINK: IncidentEvent = { id: 1, incident_id: 10, event_id: 5, relationship_type: 'related', created_at: '2026-01-03T01:00:00' };

const EVENT: InfraEvent = { id: 5, resource_id: 1, event_type: 'storage_latency', severity: 'warning', message: 'Latency 52ms', occurred_at: '2026-01-03T00:30:00' };

const RISK: RiskScore = {
  incident_id: 10, score: 58, classification: 'high',
  factors: { incident_severity: 'high', base_score: 50, event_contribution: 8, alert_contribution: 0, correlated_event_count: 1, active_alert_count: 0 },
};

const RCA_ITEM: RootCauseAnalysis = {
  id: 1, incident_id: 10, root_cause_category: 'disk_degradation',
  confidence_score: 0.9, explanation: 'Disk I/O degraded.', rule_name: 'disk_rule',
  created_at: '2026-01-03T02:00:00',
};

const REC_ITEM: Recommendation = {
  id: 1, incident_id: 10, title: 'Replace disk', description: 'Replace primary disk.',
  priority: 'high', reason: 'Identified as root cause.', created_at: '2026-01-03T03:00:00',
};

const ACTION_ITEM: EngineerAction = {
  id: 1, incident_id: 10, user_id: 2, action_type: 'investigation',
  description: 'Checked disk I/O metrics.', recommendation_id: null,
  created_at: '2026-01-03T04:00:00',
};

const AUDIT_ITEM: AuditLog = {
  id: 1, user_id: 2, action: 'engineer_action:investigation',
  entity_type: 'incident', entity_id: 10,
  details: '{"description":"Checked disk I/O metrics."}',
  created_at: '2026-01-03T04:00:00',
};

async function setup(paramId: string) {
  await TestBed.configureTestingModule({
    imports: [IncidentDetailComponent],
    providers: [
      provideRouter(routes), provideHttpClient(), provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => paramId } } } },
    ],
  })
  .overrideComponent(IncidentDetailComponent, { set: { changeDetection: ChangeDetectionStrategy.Default } })
  .compileComponents();
}

describe('IncidentDetailComponent', () => {
  let fixture: ComponentFixture<IncidentDetailComponent>;
  let component: IncidentDetailComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await setup('10');
    http      = TestBed.inject(HttpTestingController);
    fixture   = TestBed.createComponent(IncidentDetailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  // ── flush helpers ────────────────────────────────────────

  /** Flush the 5 concurrent initial requests (incident + events + risk + rca + recs).
   *  Also drains the 2 new Phase 10.9 streams so afterEach stays clean. */
  function flushFive(opts: {
    noLinks?: boolean;
    riskFail?: boolean;
    rcaFail?: boolean;
    recFail?: boolean;
  } = {}): void {
    http.expectOne(`${INC_BASE}10`).flush(INCIDENT);
    http.match(r => r.url.includes('/10/events') && r.method === 'GET')[0]
      ?.flush(opts.noLinks ? [] : [LINK]);

    if (opts.riskFail) {
      http.match(r => r.url.includes('/10/risk'))[0]?.error(new ErrorEvent('network'));
    } else {
      http.match(r => r.url.includes('/10/risk'))[0]?.flush(RISK);
    }

    if (opts.rcaFail) {
      http.match(r => r.url.includes('/10/rca') && r.method === 'GET')[0]?.error(new ErrorEvent('network'));
    } else {
      http.match(r => r.url.includes('/10/rca') && r.method === 'GET')[0]?.flush([RCA_ITEM]);
    }

    if (opts.recFail) {
      http.match(r => r.url.includes('/10/recommendations') && r.method === 'GET')[0]?.error(new ErrorEvent('network'));
    } else {
      http.match(r => r.url.includes('/10/recommendations') && r.method === 'GET')[0]?.flush([REC_ITEM]);
    }

    // Drain Phase 10.9 streams so afterEach http.verify() stays clean
    http.match(r => r.url.includes('/10/actions') && r.method === 'GET')[0]?.flush([]);
    http.match(r => r.url.includes('/api/audit-logs/incidents/10') && r.method === 'GET')[0]?.flush([]);
  }

  /** Flush all 7 concurrent initial requests (Phase 10.9). */
  function flushSeven(opts: {
    noLinks?: boolean;
    riskFail?: boolean;
    rcaFail?: boolean;
    recFail?: boolean;
    actionsFail?: boolean;
    auditFail?: boolean;
  } = {}): void {
    http.expectOne(`${INC_BASE}10`).flush(INCIDENT);
    http.match(r => r.url.includes('/10/events') && r.method === 'GET')[0]
      ?.flush(opts.noLinks ? [] : [LINK]);

    if (opts.riskFail) {
      http.match(r => r.url.includes('/10/risk'))[0]?.error(new ErrorEvent('network'));
    } else {
      http.match(r => r.url.includes('/10/risk'))[0]?.flush(RISK);
    }

    if (opts.rcaFail) {
      http.match(r => r.url.includes('/10/rca') && r.method === 'GET')[0]?.error(new ErrorEvent('network'));
    } else {
      http.match(r => r.url.includes('/10/rca') && r.method === 'GET')[0]?.flush([RCA_ITEM]);
    }

    if (opts.recFail) {
      http.match(r => r.url.includes('/10/recommendations') && r.method === 'GET')[0]?.error(new ErrorEvent('network'));
    } else {
      http.match(r => r.url.includes('/10/recommendations') && r.method === 'GET')[0]?.flush([REC_ITEM]);
    }

    if (opts.actionsFail) {
      http.match(r => r.url.includes('/10/actions') && r.method === 'GET')[0]?.error(new ErrorEvent('network'));
    } else {
      http.match(r => r.url.includes('/10/actions') && r.method === 'GET')[0]?.flush([ACTION_ITEM]);
    }

    if (opts.auditFail) {
      http.match(r => r.url.includes('/api/audit-logs/incidents/10') && r.method === 'GET')[0]?.error(new ErrorEvent('network'));
    } else {
      http.match(r => r.url.includes('/api/audit-logs/incidents/10') && r.method === 'GET')[0]?.flush([AUDIT_ITEM]);
    }
  }

  // ── Creation ──────────────────────────────────────────────

  it('should create', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true });
    tick(); fixture.detectChanges();
    expect(component).toBeTruthy();
  }));

  it('should initiate 7 concurrent requests on load', fakeAsync(() => {
    fixture.detectChanges();
    // All 7 should be pending concurrently before any flush
    const incReq     = http.match(r => r.url === `${INC_BASE}10` && r.method === 'GET');
    const evtReq     = http.match(r => r.url.includes('/10/events') && r.method === 'GET');
    const rskReq     = http.match(r => r.url.includes('/10/risk') && r.method === 'GET');
    const rcaReq     = http.match(r => r.url.includes('/10/rca') && r.method === 'GET');
    const recReq     = http.match(r => r.url.includes('/10/recommendations') && r.method === 'GET');
    const actReq     = http.match(r => r.url.includes('/10/actions') && r.method === 'GET');
    const auditReq   = http.match(r => r.url.includes('/api/audit-logs/incidents/10') && r.method === 'GET');

    expect(incReq.length).toBe(1);
    expect(evtReq.length).toBe(1);
    expect(rskReq.length).toBe(1);
    expect(rcaReq.length).toBe(1);
    expect(recReq.length).toBe(1);
    expect(actReq.length).toBe(1);
    expect(auditReq.length).toBe(1);

    // Flush all so afterEach is clean
    incReq[0].flush(INCIDENT);
    evtReq[0].flush([]);
    rskReq[0].flush(RISK);
    rcaReq[0].flush([]);
    recReq[0].flush([]);
    actReq[0].flush([]);
    auditReq[0].flush([]);
    tick();
  }));

  it('should show loading initially', () => {
    fixture.detectChanges();
    expect(component.loading()).toBeTrue();
    http.match(() => true);
  });

  it('should hide loading after data arrives', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true });
    tick(); fixture.detectChanges();
    expect(component.loading()).toBeFalse();
  }));

  // ── Renders incident data ─────────────────────────────────

  it('should set incident signal', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true });
    tick(); fixture.detectChanges();
    expect(component.incident()?.title).toBe('SAN latency spike');
  }));

  it('should display incident title', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true });
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('SAN latency spike');
  }));

  // ── Intelligence data ─────────────────────────────────────

  it('should set riskScore signal on success', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true });
    tick(); fixture.detectChanges();
    expect(component.riskScore()?.score).toBe(58);
  }));

  it('should set rcaItems on success', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true });
    tick(); fixture.detectChanges();
    expect(component.rcaItems().length).toBe(1);
  }));

  it('should set recItems on success', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true });
    tick(); fixture.detectChanges();
    expect(component.recItems().length).toBe(1);
  }));

  // ── Error isolation ───────────────────────────────────────

  it('Risk failure must NOT destroy incident or other sections', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true, riskFail: true });
    tick(); fixture.detectChanges();

    // Incident still loaded
    expect(component.incident()?.title).toBe('SAN latency spike');
    // Risk error set
    expect(component.riskError()).not.toBeNull();
    // Other sections unaffected
    expect(component.rcaError()).toBeNull();
    expect(component.recError()).toBeNull();
  }));

  it('RCA failure must NOT destroy incident or other sections', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true, rcaFail: true });
    tick(); fixture.detectChanges();

    expect(component.incident()?.title).toBe('SAN latency spike');
    expect(component.rcaError()).not.toBeNull();
    expect(component.riskError()).toBeNull();
    expect(component.recError()).toBeNull();
  }));

  it('Recommendations failure must NOT destroy incident or other sections', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true, recFail: true });
    tick(); fixture.detectChanges();

    expect(component.incident()?.title).toBe('SAN latency spike');
    expect(component.recError()).not.toBeNull();
    expect(component.riskError()).toBeNull();
    expect(component.rcaError()).toBeNull();
  }));

  // ── Retry methods ─────────────────────────────────────────

  it('retryRisk should re-fetch only risk', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true, riskFail: true });
    tick(); fixture.detectChanges();

    component.retryRisk();
    const req = http.expectOne(r => r.url.includes('/10/risk') && r.method === 'GET');
    req.flush(RISK);
    tick(); fixture.detectChanges();
    expect(component.riskScore()?.score).toBe(58);
    expect(component.riskError()).toBeNull();
  }));

  it('retryRca should re-fetch only RCA', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true, rcaFail: true });
    tick(); fixture.detectChanges();

    component.retryRca();
    const req = http.expectOne(r => r.url.includes('/10/rca') && r.method === 'GET');
    req.flush([RCA_ITEM]);
    tick(); fixture.detectChanges();
    expect(component.rcaItems().length).toBe(1);
    expect(component.rcaError()).toBeNull();
  }));

  it('retryRec should re-fetch only recommendations', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true, recFail: true });
    tick(); fixture.detectChanges();

    component.retryRec();
    const req = http.expectOne(r => r.url.includes('/10/recommendations') && r.method === 'GET');
    req.flush([REC_ITEM]);
    tick(); fixture.detectChanges();
    expect(component.recItems().length).toBe(1);
    expect(component.recError()).toBeNull();
  }));

  // ── Correlated events (Phase 10.7, must remain intact) ────

  it('should call GET /api/incidents/:id/events', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${INC_BASE}10`).flush(INCIDENT);
    const evReq = http.expectOne(r => r.url.includes('/10/events') && r.method === 'GET');
    evReq.flush([]);
    http.match(() => true); // drain risk/rca/recs
    tick(); fixture.detectChanges();
  }));

  it('should populate correlatedLinks', fakeAsync(() => {
    fixture.detectChanges();
    flushFive();
    tick();
    http.match(r => r.url.includes(`${EVTS_BASE}5`))[0]?.flush(EVENT);
    tick();
    http.match(r => r.url.includes('/api/storage-resources/'))[0]?.flush({
      id: 1, name: 'san-01', resource_type: 'SAN', status: 'healthy', health_status: 'healthy',
      capacity_total: 2000, capacity_used: 800, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00',
    });
    tick(); fixture.detectChanges();
    expect(component.correlatedLinks().length).toBe(1);
  }));

  it('should show empty state when no correlated events', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true });
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-empty-state')).toBeTruthy();
  }));

  // ── Error handling (Phase 10.7) ───────────────────────────

  it('should set "Incident not found." on 404', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${INC_BASE}10`).flush({ error: 'Incident not found' }, { status: 404, statusText: 'Not Found' });
    http.match(() => true);
    tick(); fixture.detectChanges();
    expect(component.error()).toBe('Incident not found.');
  }));

  it('should show error banner on incident fetch failure', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${INC_BASE}10`).error(new ErrorEvent('network'));
    http.match(() => true);
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-error-banner')).toBeTruthy();
  }));

  // ── isResolvable (Phase 10.7) ─────────────────────────────

  it('should be resolvable when status is open', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true });
    tick(); fixture.detectChanges();
    expect(component.isResolvable).toBeTrue();
  }));

  it('should NOT be resolvable when already resolved', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${INC_BASE}10`).flush(RESOLVED_INCIDENT);
    http.match(r => r.url.includes('/10/events'))[0]?.flush([]);
    http.match(() => true);
    tick(); fixture.detectChanges();
    expect(component.isResolvable).toBeFalse();
  }));

  // ── Resolve workflow (Phase 10.7) ─────────────────────────

  it('should call PATCH /resolve on confirm', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true });
    tick(); fixture.detectChanges();

    component.onResolveConfirmed();
    const req = http.expectOne(r => r.url.includes('/10/resolve') && r.method === 'PATCH');
    req.flush(RESOLVED_INCIDENT);
    tick(); fixture.detectChanges();
    expect(component.incident()?.status).toBe('resolved');
  }));

  it('should handle 409 on resolve', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true });
    tick(); fixture.detectChanges();

    component.onResolveConfirmed();
    http.match(r => r.url.includes('/resolve') && r.method === 'PATCH')[0]?.flush(
      { error: 'Incident is already resolved.' }, { status: 409, statusText: 'Conflict' },
    );
    tick(); fixture.detectChanges();
    expect(component.resolveError()).toContain('already been resolved');
  }));

  it('should prevent duplicate resolve clicks', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true });
    tick(); fixture.detectChanges();

    component.onResolveConfirmed();
    component.onResolveConfirmed();
    const reqs = http.match(r => r.url.includes('/resolve') && r.method === 'PATCH');
    expect(reqs.length).toBe(1);
    reqs[0].flush(RESOLVED_INCIDENT);
    tick();
  }));

  // ── Assign workflow (Phase 10.7) ──────────────────────────

  it('should call PATCH /assign on valid submit', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true });
    tick(); fixture.detectChanges();

    component.showAssignForm.set(true);
    component.assignForm.setValue({ assignee_id: 3 });
    component.onAssignSubmit();

    const req = http.expectOne(r => r.url.includes('/10/assign') && r.method === 'PATCH');
    expect(req.request.body.assignee_id).toBe(3);
    req.flush({ ...INCIDENT, assignee_id: 3 });
    tick(); fixture.detectChanges();
    expect(component.incident()?.assignee_id).toBe(3);
  }));

  it('should not submit assign when form invalid', fakeAsync(() => {
    fixture.detectChanges();
    flushFive({ noLinks: true });
    tick(); fixture.detectChanges();

    component.assignForm.setValue({ assignee_id: null });
    component.onAssignSubmit();
    http.expectNone(r => r.url.includes('/assign'));
  }));

  // ── Phase 10.9 — Engineer Actions signals ─────────────────

  it('should set actionsItems signal on success', fakeAsync(() => {
    fixture.detectChanges();
    flushSeven({ noLinks: true });
    tick(); fixture.detectChanges();
    expect(component.actionsItems().length).toBe(1);
    expect(component.actionsItems()[0].action_type).toBe('investigation');
  }));

  it('should set auditItems signal on success', fakeAsync(() => {
    fixture.detectChanges();
    flushSeven({ noLinks: true });
    tick(); fixture.detectChanges();
    expect(component.auditItems().length).toBe(1);
    expect(component.auditItems()[0].action).toBe('engineer_action:investigation');
  }));

  it('actionsLoading should be false after load', fakeAsync(() => {
    fixture.detectChanges();
    flushSeven({ noLinks: true });
    tick(); fixture.detectChanges();
    expect(component.actionsLoading()).toBeFalse();
  }));

  it('auditLoading should be false after load', fakeAsync(() => {
    fixture.detectChanges();
    flushSeven({ noLinks: true });
    tick(); fixture.detectChanges();
    expect(component.auditLoading()).toBeFalse();
  }));

  // ── Phase 10.9 — Error isolation ─────────────────────────

  it('Actions failure must NOT destroy incident or other sections', fakeAsync(() => {
    fixture.detectChanges();
    flushSeven({ noLinks: true, actionsFail: true });
    tick(); fixture.detectChanges();

    expect(component.incident()?.title).toBe('SAN latency spike');
    expect(component.actionsError()).not.toBeNull();
    // All other sections unaffected
    expect(component.riskError()).toBeNull();
    expect(component.rcaError()).toBeNull();
    expect(component.recError()).toBeNull();
    expect(component.auditError()).toBeNull();
  }));

  it('Audit failure must NOT destroy incident or other sections', fakeAsync(() => {
    fixture.detectChanges();
    flushSeven({ noLinks: true, auditFail: true });
    tick(); fixture.detectChanges();

    expect(component.incident()?.title).toBe('SAN latency spike');
    expect(component.auditError()).not.toBeNull();
    // All other sections unaffected
    expect(component.riskError()).toBeNull();
    expect(component.rcaError()).toBeNull();
    expect(component.recError()).toBeNull();
    expect(component.actionsError()).toBeNull();
  }));

  it('Actions failure must NOT affect audit trail', fakeAsync(() => {
    fixture.detectChanges();
    flushSeven({ noLinks: true, actionsFail: true });
    tick(); fixture.detectChanges();
    expect(component.auditItems().length).toBe(1);
    expect(component.auditError()).toBeNull();
  }));

  it('Audit failure must NOT affect engineer actions', fakeAsync(() => {
    fixture.detectChanges();
    flushSeven({ noLinks: true, auditFail: true });
    tick(); fixture.detectChanges();
    expect(component.actionsItems().length).toBe(1);
    expect(component.actionsError()).toBeNull();
  }));

  // ── Phase 10.9 — Retry methods ────────────────────────────

  it('retryActions should re-fetch only actions', fakeAsync(() => {
    fixture.detectChanges();
    flushSeven({ noLinks: true, actionsFail: true });
    tick(); fixture.detectChanges();

    expect(component.actionsError()).not.toBeNull();

    component.retryActions();
    const req = http.expectOne(r => r.url.includes('/10/actions') && r.method === 'GET');
    req.flush([ACTION_ITEM]);
    tick(); fixture.detectChanges();

    expect(component.actionsItems().length).toBe(1);
    expect(component.actionsError()).toBeNull();
    expect(component.actionsLoading()).toBeFalse();
  }));

  it('retryAudit should re-fetch only audit logs', fakeAsync(() => {
    fixture.detectChanges();
    flushSeven({ noLinks: true, auditFail: true });
    tick(); fixture.detectChanges();

    expect(component.auditError()).not.toBeNull();

    component.retryAudit();
    const req = http.expectOne(r => r.url.includes('/api/audit-logs/incidents/10') && r.method === 'GET');
    req.flush([AUDIT_ITEM]);
    tick(); fixture.detectChanges();

    expect(component.auditItems().length).toBe(1);
    expect(component.auditError()).toBeNull();
    expect(component.auditLoading()).toBeFalse();
  }));

  it('retryActions should NOT re-fetch audit logs', fakeAsync(() => {
    fixture.detectChanges();
    flushSeven({ noLinks: true, actionsFail: true });
    tick(); fixture.detectChanges();

    component.retryActions();
    // Only one actions request should fire — no audit request
    http.expectNone(r => r.url.includes('/api/audit-logs/incidents/') && r.method === 'GET');
    http.match(r => r.url.includes('/10/actions') && r.method === 'GET')[0]?.flush([]);
    tick();
  }));

  it('retryAudit should NOT re-fetch actions', fakeAsync(() => {
    fixture.detectChanges();
    flushSeven({ noLinks: true, auditFail: true });
    tick(); fixture.detectChanges();

    component.retryAudit();
    // Only one audit request should fire — no actions request
    http.expectNone(r => r.url.includes('/10/actions') && r.method === 'GET');
    http.match(r => r.url.includes('/api/audit-logs/incidents/10') && r.method === 'GET')[0]?.flush([]);
    tick();
  }));
});

// ── Invalid ID ─────────────────────────────────────────────────────────────

describe('IncidentDetailComponent — invalid ID', () => {
  let fixture: ComponentFixture<IncidentDetailComponent>;
  let component: IncidentDetailComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await setup('bad');
    http    = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(IncidentDetailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  it('should set error for non-numeric ID without calling API', () => {
    fixture.detectChanges();
    expect(component.error()).toBe('Invalid incident ID.');
  });
});
