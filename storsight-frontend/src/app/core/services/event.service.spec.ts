import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { EventService } from './event.service';
import { Event as InfraEvent } from '../models';

const API        = 'http://localhost:5000';
const EVENTS_URL = `${API}/api/events/`;

const EVENT: InfraEvent = {
  id: 1, resource_id: 1, event_type: 'disk_failure',
  severity: 'critical', message: 'Disk A failed',
  occurred_at: '2026-01-03T00:00:00',
};

describe('EventService', () => {
  let service: EventService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), EventService],
    });
    service = TestBed.inject(EventService);
    http    = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  // ── list() ────────────────────────────────────────────────

  it('list() — GET /api/events/ with no filters', fakeAsync(() => {
    service.list().subscribe();
    const req = http.expectOne(r => r.url === EVENTS_URL && r.method === 'GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush([EVENT]);
    tick();
  }));

  it('list({ resource_id }) — appends ?resource_id=', fakeAsync(() => {
    service.list({ resource_id: 1 }).subscribe();
    const req = http.expectOne(r => r.url === EVENTS_URL && r.method === 'GET');
    expect(req.request.params.get('resource_id')).toBe('1');
    expect(req.request.params.has('severity')).toBeFalse();
    req.flush([EVENT]);
    tick();
  }));

  it('list({ severity }) — appends ?severity=', fakeAsync(() => {
    service.list({ severity: 'critical' }).subscribe();
    const req = http.expectOne(r => r.url === EVENTS_URL && r.method === 'GET');
    expect(req.request.params.get('severity')).toBe('critical');
    expect(req.request.params.has('resource_id')).toBeFalse();
    req.flush([EVENT]);
    tick();
  }));

  it('list({ event_type }) — appends ?event_type=', fakeAsync(() => {
    service.list({ event_type: 'disk_failure' }).subscribe();
    const req = http.expectOne(r => r.url === EVENTS_URL && r.method === 'GET');
    expect(req.request.params.get('event_type')).toBe('disk_failure');
    expect(req.request.params.has('resource_id')).toBeFalse();
    expect(req.request.params.has('severity')).toBeFalse();
    req.flush([EVENT]);
    tick();
  }));

  it('list({ resource_id, severity }) — appends both filters', fakeAsync(() => {
    service.list({ resource_id: 1, severity: 'critical' }).subscribe();
    const req = http.expectOne(r => r.url === EVENTS_URL && r.method === 'GET');
    expect(req.request.params.get('resource_id')).toBe('1');
    expect(req.request.params.get('severity')).toBe('critical');
    req.flush([EVENT]);
    tick();
  }));

  it('list() — returns array of events', fakeAsync(() => {
    let result: InfraEvent[] = [];
    service.list().subscribe(r => (result = r));
    http.expectOne(r => r.url === EVENTS_URL).flush([EVENT]);
    tick();
    expect(result.length).toBe(1);
    expect(result[0].event_type).toBe('disk_failure');
  }));

  // ── get() ─────────────────────────────────────────────────

  it('get(id) — GET /api/events/:id', fakeAsync(() => {
    service.get(1).subscribe();
    const req = http.expectOne(`${API}/api/events/1`);
    expect(req.request.method).toBe('GET');
    req.flush(EVENT);
    tick();
  }));

  it('get(id) — returns the event', fakeAsync(() => {
    let result: InfraEvent | undefined;
    service.get(1).subscribe(r => (result = r));
    http.expectOne(`${API}/api/events/1`).flush(EVENT);
    tick();
    expect(result?.id).toBe(1);
  }));

  // ── create() ──────────────────────────────────────────────

  it('create() — POST /api/events/ with correct body', fakeAsync(() => {
    const payload = { resource_id: 1, event_type: 'disk_failure', message: 'Disk A failed', severity: 'critical' };
    service.create(payload).subscribe();
    const req = http.expectOne(r => r.url === EVENTS_URL && r.method === 'POST');
    expect(req.request.body.resource_id).toBe(1);
    expect(req.request.body.event_type).toBe('disk_failure');
    expect(req.request.body.message).toBe('Disk A failed');
    req.flush(EVENT);
    tick();
  }));
});
