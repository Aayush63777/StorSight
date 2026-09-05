import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AlertService } from './alert.service';
import { Alert } from '../models';

const API        = 'http://localhost:5000';
const ALERTS_URL = `${API}/api/alerts/`;

const ALERT: Alert = {
  id: 1, resource_id: 1, title: 'Disk full', severity: 'critical',
  status: 'active', message: 'Primary disk at 95%',
  created_at: '2026-01-02T00:00:00', resolved_at: null,
};

describe('AlertService', () => {
  let service: AlertService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), AlertService],
    });
    service = TestBed.inject(AlertService);
    http    = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  // ── list() ────────────────────────────────────────────────

  it('list() — GET /api/alerts/ with no filters', fakeAsync(() => {
    service.list().subscribe();
    const req = http.expectOne(r => r.url === ALERTS_URL && r.method === 'GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush([ALERT]);
    tick();
  }));

  it('list({ severity }) — appends ?severity= query param', fakeAsync(() => {
    service.list({ severity: 'critical' }).subscribe();
    const req = http.expectOne(r => r.url === ALERTS_URL && r.method === 'GET');
    expect(req.request.params.get('severity')).toBe('critical');
    req.flush([ALERT]);
    tick();
  }));

  it('list({ status }) — appends ?status= query param', fakeAsync(() => {
    service.list({ status: 'active' }).subscribe();
    const req = http.expectOne(r => r.url === ALERTS_URL && r.method === 'GET');
    expect(req.request.params.get('status')).toBe('active');
    req.flush([ALERT]);
    tick();
  }));

  it('list({ resource_id }) — appends ?resource_id= query param', fakeAsync(() => {
    service.list({ resource_id: 3 }).subscribe();
    const req = http.expectOne(r => r.url === ALERTS_URL && r.method === 'GET');
    expect(req.request.params.get('resource_id')).toBe('3');
    req.flush([ALERT]);
    tick();
  }));

  it('list() — returns array of alerts', fakeAsync(() => {
    let result: Alert[] = [];
    service.list().subscribe(r => (result = r));
    http.expectOne(r => r.url === ALERTS_URL).flush([ALERT]);
    tick();
    expect(result.length).toBe(1);
    expect(result[0].title).toBe('Disk full');
  }));

  // ── get() ─────────────────────────────────────────────────

  it('get(id) — GET /api/alerts/:id', fakeAsync(() => {
    service.get(1).subscribe();
    const req = http.expectOne(`${API}/api/alerts/1`);
    expect(req.request.method).toBe('GET');
    req.flush(ALERT);
    tick();
  }));

  it('get(id) — returns the alert', fakeAsync(() => {
    let result: Alert | undefined;
    service.get(1).subscribe(r => (result = r));
    http.expectOne(`${API}/api/alerts/1`).flush(ALERT);
    tick();
    expect(result?.id).toBe(1);
  }));

  // ── create() ──────────────────────────────────────────────

  it('create() — POST /api/alerts/ with correct body', fakeAsync(() => {
    const payload = { resource_id: 1, title: 'Disk full', severity: 'critical', message: 'At 95%' };
    service.create(payload).subscribe();
    const req = http.expectOne(r => r.url === ALERTS_URL && r.method === 'POST');
    expect(req.request.body.resource_id).toBe(1);
    expect(req.request.body.title).toBe('Disk full');
    expect(req.request.body.severity).toBe('critical');
    req.flush({ ...ALERT });
    tick();
  }));

  // ── resolve() ─────────────────────────────────────────────

  it('resolve(id) — PATCH /api/alerts/:id/resolve', fakeAsync(() => {
    service.resolve(1).subscribe();
    const req = http.expectOne(`${API}/api/alerts/1/resolve`);
    expect(req.request.method).toBe('PATCH');
    req.flush({ ...ALERT, status: 'resolved' });
    tick();
  }));

  it('resolve(id) — returns updated alert', fakeAsync(() => {
    let result: Alert | undefined;
    service.resolve(1).subscribe(r => (result = r));
    http.expectOne(`${API}/api/alerts/1/resolve`).flush({ ...ALERT, status: 'resolved' });
    tick();
    expect(result?.status).toBe('resolved');
  }));
});
