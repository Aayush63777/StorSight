import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { IncidentService } from './incident.service';
import {
  Incident, IncidentEvent, RootCauseAnalysis, RiskScore,
  Recommendation, EngineerAction,
} from '../models';

const API          = 'http://localhost:5000';
const BASE_URL     = `${API}/api/incidents/`;
const incUrl = (id: number, path = '') => `${API}/api/incidents/${id}${path}`;

// ── Fixtures ──────────────────────────────────────────────────

const INCIDENT: Incident = {
  id: 10, title: 'SAN latency spike', description: 'Latency exceeded 50ms.',
  severity: 'high', status: 'open', assignee_id: null,
  created_at: '2026-01-03T00:00:00', updated_at: '2026-01-03T00:00:00', resolved_at: null,
};

const INC_EVENT: IncidentEvent = {
  id: 1, incident_id: 10, event_id: 5, relationship_type: 'related',
  created_at: '2026-01-03T01:00:00',
};

const RCA: RootCauseAnalysis = {
  id: 1, incident_id: 10, root_cause_category: 'disk_degradation',
  confidence_score: 0.9, explanation: 'Disk I/O degraded.', rule_name: 'disk_rule',
  created_at: '2026-01-03T02:00:00',
};

const RISK: RiskScore = {
  incident_id: 10, score: 58, classification: 'high',
  factors: { incident_severity: 'high', base_score: 50, event_contribution: 8, alert_contribution: 0, correlated_event_count: 1, active_alert_count: 0 },
};

const REC: Recommendation = {
  id: 1, incident_id: 10, title: 'Replace disk', description: 'Replace primary disk.',
  priority: 'high', reason: null, created_at: '2026-01-03T03:00:00',
};

const ACTION: EngineerAction = {
  id: 1, incident_id: 10, user_id: 2, action_type: 'investigation',
  description: 'Checked disk I/O metrics.', recommendation_id: null,
  created_at: '2026-01-03T04:00:00',
};

// ── Suite ─────────────────────────────────────────────────────

describe('IncidentService', () => {
  let service: IncidentService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), IncidentService],
    });
    service = TestBed.inject(IncidentService);
    http    = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  // ── list() ────────────────────────────────────────────────

  it('list() — GET /api/incidents/ with no filters', fakeAsync(() => {
    service.list().subscribe();
    const req = http.expectOne(r => r.url === BASE_URL && r.method === 'GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush([INCIDENT]);
    tick();
  }));

  it('list({ status }) — appends ?status= query param', fakeAsync(() => {
    service.list({ status: 'open' }).subscribe();
    const req = http.expectOne(r => r.url === BASE_URL && r.method === 'GET');
    expect(req.request.params.get('status')).toBe('open');
    req.flush([INCIDENT]);
    tick();
  }));

  it('list({ severity }) — appends ?severity= query param', fakeAsync(() => {
    service.list({ severity: 'high' }).subscribe();
    const req = http.expectOne(r => r.url === BASE_URL && r.method === 'GET');
    expect(req.request.params.get('severity')).toBe('high');
    req.flush([INCIDENT]);
    tick();
  }));

  it('list() — returns array of incidents', fakeAsync(() => {
    let result: Incident[] = [];
    service.list().subscribe(r => (result = r));
    http.expectOne(r => r.url === BASE_URL).flush([INCIDENT]);
    tick();
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('SAN latency spike');
  }));

  // ── get() ─────────────────────────────────────────────────

  it('get(id) — GET /api/incidents/:id', fakeAsync(() => {
    service.get(10).subscribe();
    const req = http.expectOne(incUrl(10));
    expect(req.request.method).toBe('GET');
    req.flush(INCIDENT);
    tick();
  }));

  it('get(id) — returns the incident', fakeAsync(() => {
    let result: Incident | undefined;
    service.get(10).subscribe(r => (result = r));
    http.expectOne(incUrl(10)).flush(INCIDENT);
    tick();
    expect(result?.title).toBe('SAN latency spike');
  }));

  // ── create() ──────────────────────────────────────────────

  it('create() — POST /api/incidents/ with correct body', fakeAsync(() => {
    const payload = { title: 'SAN latency spike', severity: 'high', description: 'desc' };
    service.create(payload).subscribe();
    const req = http.expectOne(r => r.url === BASE_URL && r.method === 'POST');
    expect(req.request.body.title).toBe('SAN latency spike');
    expect(req.request.body.severity).toBe('high');
    req.flush(INCIDENT);
    tick();
  }));

  // ── resolve() ─────────────────────────────────────────────

  it('resolve(id) — PATCH /api/incidents/:id/resolve', fakeAsync(() => {
    service.resolve(10).subscribe();
    const req = http.expectOne(incUrl(10, '/resolve'));
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...INCIDENT, status: 'resolved' });
    tick();
  }));

  it('resolve(id) — returns updated incident', fakeAsync(() => {
    let result: Incident | undefined;
    service.resolve(10).subscribe(r => (result = r));
    http.expectOne(incUrl(10, '/resolve')).flush({ ...INCIDENT, status: 'resolved' });
    tick();
    expect(result?.status).toBe('resolved');
  }));

  // ── assign() ──────────────────────────────────────────────

  it('assign(id, assigneeId) — PATCH /api/incidents/:id/assign with correct body', fakeAsync(() => {
    service.assign(10, 3).subscribe();
    const req = http.expectOne(incUrl(10, '/assign'));
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.assignee_id).toBe(3);
    req.flush({ ...INCIDENT, assignee_id: 3 });
    tick();
  }));

  it('assign(id, assigneeId) — returns updated incident', fakeAsync(() => {
    let result: Incident | undefined;
    service.assign(10, 3).subscribe(r => (result = r));
    http.expectOne(incUrl(10, '/assign')).flush({ ...INCIDENT, assignee_id: 3 });
    tick();
    expect(result?.assignee_id).toBe(3);
  }));

  // ── listEvents() ──────────────────────────────────────────

  it('listEvents(incidentId) — GET /api/incidents/:id/events', fakeAsync(() => {
    service.listEvents(10).subscribe();
    const req = http.expectOne(incUrl(10, '/events'));
    expect(req.request.method).toBe('GET');
    req.flush([INC_EVENT]);
    tick();
  }));

  it('listEvents(incidentId) — returns array of incident events', fakeAsync(() => {
    let result: IncidentEvent[] = [];
    service.listEvents(10).subscribe(r => (result = r));
    http.expectOne(incUrl(10, '/events')).flush([INC_EVENT]);
    tick();
    expect(result[0].event_id).toBe(5);
  }));

  // ── linkEvent() ───────────────────────────────────────────

  it('linkEvent(incidentId, eventId) — POST /api/incidents/:id/events', fakeAsync(() => {
    service.linkEvent(10, 5).subscribe();
    const req = http.expectOne(incUrl(10, '/events'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body.event_id).toBe(5);
    expect(req.request.body.relationship_type).toBe('related');
    req.flush(INC_EVENT);
    tick();
  }));

  it('linkEvent — uses custom relationship_type when provided', fakeAsync(() => {
    service.linkEvent(10, 5, 'cause').subscribe();
    const req = http.expectOne(incUrl(10, '/events'));
    expect(req.request.body.relationship_type).toBe('cause');
    req.flush(INC_EVENT);
    tick();
  }));

  // ── listRca() ─────────────────────────────────────────────

  it('listRca(incidentId) — GET /api/incidents/:id/rca', fakeAsync(() => {
    service.listRca(10).subscribe();
    const req = http.expectOne(incUrl(10, '/rca'));
    expect(req.request.method).toBe('GET');
    req.flush([RCA]);
    tick();
  }));

  it('listRca(incidentId) — returns array of RCAs', fakeAsync(() => {
    let result: RootCauseAnalysis[] = [];
    service.listRca(10).subscribe(r => (result = r));
    http.expectOne(incUrl(10, '/rca')).flush([RCA]);
    tick();
    expect(result[0].root_cause_category).toBe('disk_degradation');
  }));

  // ── createRca() ───────────────────────────────────────────

  it('createRca(incidentId, payload) — POST /api/incidents/:id/rca', fakeAsync(() => {
    const payload: Partial<RootCauseAnalysis> = { root_cause_category: 'disk_degradation', confidence_score: 0.9 };
    service.createRca(10, payload).subscribe();
    const req = http.expectOne(incUrl(10, '/rca'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body.root_cause_category).toBe('disk_degradation');
    req.flush(RCA);
    tick();
  }));

  // ── getRisk() ─────────────────────────────────────────────

  it('getRisk(incidentId) — GET /api/incidents/:id/risk', fakeAsync(() => {
    service.getRisk(10).subscribe();
    const req = http.expectOne(incUrl(10, '/risk'));
    expect(req.request.method).toBe('GET');
    req.flush(RISK);
    tick();
  }));

  it('getRisk(incidentId) — returns risk score', fakeAsync(() => {
    let result: RiskScore | undefined;
    service.getRisk(10).subscribe(r => (result = r));
    http.expectOne(incUrl(10, '/risk')).flush(RISK);
    tick();
    expect(result?.score).toBe(58);
    expect(result?.classification).toBe('high');
  }));

  // ── listRecommendations() ─────────────────────────────────

  it('listRecommendations(incidentId) — GET /api/incidents/:id/recommendations', fakeAsync(() => {
    service.listRecommendations(10).subscribe();
    const req = http.expectOne(incUrl(10, '/recommendations'));
    expect(req.request.method).toBe('GET');
    req.flush([REC]);
    tick();
  }));

  it('listRecommendations(incidentId) — returns array of recommendations', fakeAsync(() => {
    let result: Recommendation[] = [];
    service.listRecommendations(10).subscribe(r => (result = r));
    http.expectOne(incUrl(10, '/recommendations')).flush([REC]);
    tick();
    expect(result[0].title).toBe('Replace disk');
  }));

  // ── createRecommendation() ────────────────────────────────

  it('createRecommendation(incidentId, payload) — POST /api/incidents/:id/recommendations', fakeAsync(() => {
    const payload: Partial<Recommendation> = { title: 'Replace disk', description: 'Replace primary disk.', priority: 'high' };
    service.createRecommendation(10, payload).subscribe();
    const req = http.expectOne(incUrl(10, '/recommendations'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body.title).toBe('Replace disk');
    req.flush(REC);
    tick();
  }));

  // ── listActions() ─────────────────────────────────────────

  it('listActions(incidentId) — GET /api/incidents/:id/actions', fakeAsync(() => {
    service.listActions(10).subscribe();
    const req = http.expectOne(incUrl(10, '/actions'));
    expect(req.request.method).toBe('GET');
    req.flush([ACTION]);
    tick();
  }));

  it('listActions(incidentId) — returns array of engineer actions', fakeAsync(() => {
    let result: EngineerAction[] = [];
    service.listActions(10).subscribe(r => (result = r));
    http.expectOne(incUrl(10, '/actions')).flush([ACTION]);
    tick();
    expect(result[0].action_type).toBe('investigation');
  }));

  // ── createAction() ────────────────────────────────────────

  it('createAction(incidentId, payload) — POST /api/incidents/:id/actions with correct body', fakeAsync(() => {
    const payload = { action_type: 'investigation', description: 'Checked disk I/O metrics.' };
    service.createAction(10, payload).subscribe();
    const req = http.expectOne(incUrl(10, '/actions'));
    expect(req.request.method).toBe('POST');
    expect(req.request.body.action_type).toBe('investigation');
    expect(req.request.body.description).toBe('Checked disk I/O metrics.');
    req.flush(ACTION);
    tick();
  }));

  it('createAction — optional recommendation_id included when provided', fakeAsync(() => {
    const payload = { action_type: 'remediation', description: 'Applied fix.', recommendation_id: 1 };
    service.createAction(10, payload).subscribe();
    const req = http.expectOne(incUrl(10, '/actions'));
    expect(req.request.body.recommendation_id).toBe(1);
    req.flush({ ...ACTION, action_type: 'remediation', recommendation_id: 1 });
    tick();
  }));

  it('createAction(incidentId, payload) — returns created action', fakeAsync(() => {
    let result: EngineerAction | undefined;
    service.createAction(10, { action_type: 'note', description: 'Just a note.' }).subscribe(r => (result = r));
    http.expectOne(incUrl(10, '/actions')).flush(ACTION);
    tick();
    expect(result?.id).toBe(1);
  }));
});
