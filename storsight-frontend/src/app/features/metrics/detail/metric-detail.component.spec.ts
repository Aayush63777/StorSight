import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { MetricDetailComponent } from './metric-detail.component';
import { Metric, StorageResource } from '../../../core/models';
import { routes } from '../../../app.routes';

const API = 'http://localhost:5000';
const METRICS_BASE  = `${API}/api/metrics/`;
const RESOURCES_BASE = `${API}/api/storage-resources/`;

const METRIC: Metric = {
  id: 7, resource_id: 3, metric_name: 'cpu_util',
  metric_value: 72.5, unit: '%', recorded_at: '2026-01-03T00:00:00',
};

const RESOURCE: StorageResource = {
  id: 3, name: 'san-03', resource_type: 'SAN',
  status: 'healthy', health_status: 'healthy',
  capacity_total: 1000, capacity_used: 400,
  created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00',
};

async function setupWithParam(paramId: string) {
  await TestBed.configureTestingModule({
    imports: [MetricDetailComponent],
    providers: [
      provideRouter(routes),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => paramId } } } },
    ],
  })
  .overrideComponent(MetricDetailComponent, {
    set: { changeDetection: ChangeDetectionStrategy.Default },
  })
  .compileComponents();
}

describe('MetricDetailComponent', () => {
  let fixture: ComponentFixture<MetricDetailComponent>;
  let component: MetricDetailComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await setupWithParam('7');
    http     = TestBed.inject(HttpTestingController);
    fixture  = TestBed.createComponent(MetricDetailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  // ── creation ──────────────────────────────────────────────

  it('should create', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${METRICS_BASE}7`).flush(METRIC);
    http.match((r) => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect(component).toBeTruthy();
  }));

  // ── loading ───────────────────────────────────────────────

  it('should show loading spinner initially', () => {
    fixture.detectChanges();
    expect(component.loading()).toBeTrue();
    http.match(() => true);
  });

  it('should hide loading after data arrives', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${METRICS_BASE}7`).flush(METRIC);
    http.match((r) => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect(component.loading()).toBeFalse();
  }));

  // ── data ──────────────────────────────────────────────────

  it('should set metric signal on success', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${METRICS_BASE}7`).flush(METRIC);
    http.match((r) => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect(component.metric()?.metric_name).toBe('cpu_util');
  }));

  it('should set resource signal on success', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${METRICS_BASE}7`).flush(METRIC);
    http.match((r) => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect(component.resource()?.name).toBe('san-03');
  }));

  it('should display metric name in the page', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${METRICS_BASE}7`).flush(METRIC);
    http.match((r) => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('cpu_util');
  }));

  it('should still load even if resource fetch fails', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${METRICS_BASE}7`).flush(METRIC);
    http.match((r) => r.url.startsWith(RESOURCES_BASE))[0]?.error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();
    expect(component.loading()).toBeFalse();
    expect(component.metric()).not.toBeNull();
    expect(component.resource()).toBeNull();
  }));

  // ── formatValue ───────────────────────────────────────────

  it('should format value with unit', () => {
    expect(component.formatValue(METRIC)).toBe('72.5000 %');
  });

  it('should format integer value without decimals', () => {
    const m: Metric = { ...METRIC, metric_value: 100, unit: '%' };
    expect(component.formatValue(m)).toBe('100 %');
  });

  it('should format value without unit', () => {
    const m: Metric = { ...METRIC, metric_value: 42, unit: null };
    expect(component.formatValue(m)).toBe('42');
  });

  // ── error handling ────────────────────────────────────────

  it('should set "Metric not found." on 404', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${METRICS_BASE}7`).flush(
      { error: 'Metric not found' }, { status: 404, statusText: 'Not Found' },
    );
    tick(); fixture.detectChanges();
    expect(component.error()).toBe('Metric not found.');
  }));

  it('should set generic error on network failure', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${METRICS_BASE}7`).error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();
    expect(component.error()).toBe('Failed to load metric.');
  }));

  it('should show error banner on failure', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${METRICS_BASE}7`).error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-error-banner')).toBeTruthy();
  }));
});

// ── Invalid ID ────────────────────────────────────────────────────────────────

describe('MetricDetailComponent — invalid ID', () => {
  let fixture: ComponentFixture<MetricDetailComponent>;
  let component: MetricDetailComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await setupWithParam('not-a-number');
    http     = TestBed.inject(HttpTestingController);
    fixture  = TestBed.createComponent(MetricDetailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  it('should set error without calling API for non-numeric id', () => {
    fixture.detectChanges();
    expect(component.error()).toBe('Invalid metric ID.');
    http.expectNone(`${API}/api/metrics/NaN`);
  });
});
