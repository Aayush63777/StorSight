import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuditLogService } from './audit-log.service';
import { AuditLog } from '../models';

const API            = 'http://localhost:5000';
const AUDIT_LOGS_URL = `${API}/api/audit-logs/`;

const LOG: AuditLog = {
  id: 1, user_id: 2, action: 'engineer_action:investigation',
  entity_type: 'incident', entity_id: 10,
  details: '{"description":"Checked disk I/O"}',
  created_at: '2026-01-03T00:00:00',
};

describe('AuditLogService', () => {
  let service: AuditLogService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AuditLogService],
    });
    service = TestBed.inject(AuditLogService);
    http    = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  // ── list() ────────────────────────────────────────────────

  it('list() — GET /api/audit-logs/', fakeAsync(() => {
    service.list().subscribe();
    const req = http.expectOne(AUDIT_LOGS_URL);
    expect(req.request.method).toBe('GET');
    req.flush([LOG]);
    tick();
  }));

  it('list() — returns array of audit logs', fakeAsync(() => {
    let result: AuditLog[] = [];
    service.list().subscribe(r => (result = r));
    http.expectOne(AUDIT_LOGS_URL).flush([LOG]);
    tick();
    expect(result.length).toBe(1);
    expect(result[0].action).toBe('engineer_action:investigation');
  }));

  // ── listByIncident() ──────────────────────────────────────

  it('listByIncident(id) — GET /api/audit-logs/incidents/:id', fakeAsync(() => {
    service.listByIncident(10).subscribe();
    const req = http.expectOne(`${API}/api/audit-logs/incidents/10`);
    expect(req.request.method).toBe('GET');
    req.flush([LOG]);
    tick();
  }));

  it('listByIncident(id) — returns array scoped to incident', fakeAsync(() => {
    let result: AuditLog[] = [];
    service.listByIncident(10).subscribe(r => (result = r));
    http.expectOne(`${API}/api/audit-logs/incidents/10`).flush([LOG]);
    tick();
    expect(result.length).toBe(1);
    expect(result[0].entity_id).toBe(10);
  }));

  it('listByIncident(id) — uses correct incident ID in URL', fakeAsync(() => {
    service.listByIncident(42).subscribe();
    const req = http.expectOne(`${API}/api/audit-logs/incidents/42`);
    req.flush([]);
    tick();
    expect(req.request.url).toContain('/42');
  }));
});
