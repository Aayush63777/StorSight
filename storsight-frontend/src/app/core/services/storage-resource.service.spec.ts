import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { StorageResourceService } from './storage-resource.service';
import { StorageResource } from '../models';

const API       = 'http://localhost:5000';
const BASE_URL  = `${API}/api/storage-resources/`;

const RESOURCE: StorageResource = {
  id: 1, name: 'san-01', resource_type: 'SAN',
  status: 'healthy', health_status: 'healthy',
  capacity_total: 2000, capacity_used: 800,
  created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00',
};

describe('StorageResourceService', () => {
  let service: StorageResourceService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), StorageResourceService],
    });
    service = TestBed.inject(StorageResourceService);
    http    = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  // ── list() ────────────────────────────────────────────────

  it('list() — GET /api/storage-resources/ with no filters', fakeAsync(() => {
    service.list().subscribe();
    const req = http.expectOne(r => r.url === BASE_URL && r.method === 'GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush([RESOURCE]);
    tick();
  }));

  it('list({ status }) — appends ?status= query param', fakeAsync(() => {
    service.list({ status: 'critical' }).subscribe();
    const req = http.expectOne(r => r.url === BASE_URL && r.method === 'GET');
    expect(req.request.params.get('status')).toBe('critical');
    expect(req.request.params.has('resource_type')).toBeFalse();
    req.flush([RESOURCE]);
    tick();
  }));

  it('list({ resource_type }) — appends ?resource_type= query param', fakeAsync(() => {
    service.list({ resource_type: 'SAN' }).subscribe();
    const req = http.expectOne(r => r.url === BASE_URL && r.method === 'GET');
    expect(req.request.params.get('resource_type')).toBe('SAN');
    expect(req.request.params.has('status')).toBeFalse();
    req.flush([RESOURCE]);
    tick();
  }));

  it('list({ status, resource_type }) — both params sent together', fakeAsync(() => {
    service.list({ status: 'healthy', resource_type: 'NAS' }).subscribe();
    const req = http.expectOne(r => r.url === BASE_URL && r.method === 'GET');
    expect(req.request.params.get('status')).toBe('healthy');
    expect(req.request.params.get('resource_type')).toBe('NAS');
    req.flush([RESOURCE]);
    tick();
  }));

  it('list() — returns array of resources', fakeAsync(() => {
    let result: StorageResource[] = [];
    service.list().subscribe(r => (result = r));
    http.expectOne(r => r.url === BASE_URL).flush([RESOURCE]);
    tick();
    expect(result.length).toBe(1);
    expect(result[0].name).toBe('san-01');
  }));

  // ── get() ─────────────────────────────────────────────────

  it('get(id) — GET /api/storage-resources/:id', fakeAsync(() => {
    service.get(1).subscribe();
    const req = http.expectOne(`${API}/api/storage-resources/1`);
    expect(req.request.method).toBe('GET');
    req.flush(RESOURCE);
    tick();
  }));

  it('get(id) — returns the resource', fakeAsync(() => {
    let result: StorageResource | undefined;
    service.get(1).subscribe(r => (result = r));
    http.expectOne(`${API}/api/storage-resources/1`).flush(RESOURCE);
    tick();
    expect(result?.name).toBe('san-01');
  }));

  // ── create() ──────────────────────────────────────────────

  it('create(payload) — POST /api/storage-resources/ with correct body', fakeAsync(() => {
    const payload: Partial<StorageResource> = { name: 'san-01', resource_type: 'SAN', status: 'healthy' };
    service.create(payload).subscribe();
    const req = http.expectOne(r => r.url === BASE_URL && r.method === 'POST');
    expect(req.request.body.name).toBe('san-01');
    expect(req.request.body.resource_type).toBe('SAN');
    req.flush(RESOURCE);
    tick();
  }));

  it('create(payload) — returns created resource', fakeAsync(() => {
    let result: StorageResource | undefined;
    service.create({ name: 'san-01' }).subscribe(r => (result = r));
    http.expectOne(r => r.url === BASE_URL && r.method === 'POST').flush(RESOURCE);
    tick();
    expect(result?.id).toBe(1);
  }));

  // ── update() ──────────────────────────────────────────────

  it('update(id, payload) — PATCH /api/storage-resources/:id with correct body', fakeAsync(() => {
    service.update(1, { status: 'warning' }).subscribe();
    const req = http.expectOne(`${API}/api/storage-resources/1`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.status).toBe('warning');
    req.flush({ ...RESOURCE, status: 'warning' });
    tick();
  }));

  it('update(id, payload) — returns updated resource', fakeAsync(() => {
    let result: StorageResource | undefined;
    service.update(1, { status: 'critical' }).subscribe(r => (result = r));
    http.expectOne(`${API}/api/storage-resources/1`).flush({ ...RESOURCE, status: 'critical' });
    tick();
    expect(result?.status).toBe('critical');
  }));

  // ── delete() ──────────────────────────────────────────────

  it('delete(id) — DELETE /api/storage-resources/:id', fakeAsync(() => {
    service.delete(1).subscribe();
    const req = http.expectOne(`${API}/api/storage-resources/1`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Deleted.' });
    tick();
  }));

  it('delete(id) — returns message response', fakeAsync(() => {
    let result: { message: string } | undefined;
    service.delete(1).subscribe(r => (result = r));
    http.expectOne(`${API}/api/storage-resources/1`).flush({ message: 'Deleted.' });
    tick();
    expect(result?.message).toBe('Deleted.');
  }));
});
