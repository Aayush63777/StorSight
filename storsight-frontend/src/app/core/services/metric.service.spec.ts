import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { MetricService } from './metric.service';
import { Metric } from '../models';

const API         = 'http://localhost:5000';
const METRICS_URL = `${API}/api/metrics/`;

const METRIC: Metric = {
  id: 1, resource_id: 1, metric_name: 'cpu_utilization',
  metric_value: 87.5, unit: '%', recorded_at: '2026-01-03T00:00:00',
};

describe('MetricService', () => {
  let service: MetricService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), MetricService],
    });
    service = TestBed.inject(MetricService);
    http    = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  // ── list() ────────────────────────────────────────────────

  it('list() — GET /api/metrics/ with no filters', fakeAsync(() => {
    service.list().subscribe();
    const req = http.expectOne(r => r.url === METRICS_URL && r.method === 'GET');
    expect(req.request.params.keys().length).toBe(0);
    req.flush([METRIC]);
    tick();
  }));

  it('list({ resource_id }) — appends ?resource_id= (takes priority)', fakeAsync(() => {
    service.list({ resource_id: 1 }).subscribe();
    const req = http.expectOne(r => r.url === METRICS_URL && r.method === 'GET');
    expect(req.request.params.get('resource_id')).toBe('1');
    expect(req.request.params.has('metric_name')).toBeFalse();
    req.flush([METRIC]);
    tick();
  }));

  it('list({ metric_name }) — appends ?metric_name= when no resource_id', fakeAsync(() => {
    service.list({ metric_name: 'cpu_utilization' }).subscribe();
    const req = http.expectOne(r => r.url === METRICS_URL && r.method === 'GET');
    expect(req.request.params.get('metric_name')).toBe('cpu_utilization');
    expect(req.request.params.has('resource_id')).toBeFalse();
    req.flush([METRIC]);
    tick();
  }));

  it('list({ resource_id, metric_name }) — only resource_id sent (mutually exclusive)', fakeAsync(() => {
    service.list({ resource_id: 1, metric_name: 'cpu_utilization' }).subscribe();
    const req = http.expectOne(r => r.url === METRICS_URL && r.method === 'GET');
    expect(req.request.params.get('resource_id')).toBe('1');
    expect(req.request.params.has('metric_name')).toBeFalse();
    req.flush([METRIC]);
    tick();
  }));

  it('list() — returns array of metrics', fakeAsync(() => {
    let result: Metric[] = [];
    service.list().subscribe(r => (result = r));
    http.expectOne(r => r.url === METRICS_URL).flush([METRIC]);
    tick();
    expect(result.length).toBe(1);
    expect(result[0].metric_name).toBe('cpu_utilization');
  }));

  // ── get() ─────────────────────────────────────────────────

  it('get(id) — GET /api/metrics/:id', fakeAsync(() => {
    service.get(1).subscribe();
    const req = http.expectOne(`${API}/api/metrics/1`);
    expect(req.request.method).toBe('GET');
    req.flush(METRIC);
    tick();
  }));

  it('get(id) — returns the metric', fakeAsync(() => {
    let result: Metric | undefined;
    service.get(1).subscribe(r => (result = r));
    http.expectOne(`${API}/api/metrics/1`).flush(METRIC);
    tick();
    expect(result?.metric_value).toBe(87.5);
  }));

  // ── create() ──────────────────────────────────────────────

  it('create() — POST /api/metrics/ with correct body', fakeAsync(() => {
    const payload = { resource_id: 1, metric_name: 'cpu_utilization', metric_value: 87.5, unit: '%' };
    service.create(payload).subscribe();
    const req = http.expectOne(r => r.url === METRICS_URL && r.method === 'POST');
    expect(req.request.body.resource_id).toBe(1);
    expect(req.request.body.metric_name).toBe('cpu_utilization');
    expect(req.request.body.metric_value).toBe(87.5);
    req.flush(METRIC);
    tick();
  }));
});
