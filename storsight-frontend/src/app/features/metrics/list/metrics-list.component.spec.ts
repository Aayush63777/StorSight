import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy } from '@angular/core';

import { MetricsListComponent } from './metrics-list.component';
import { Metric, StorageResource } from '../../../core/models';
import { routes } from '../../../app.routes';

const API        = 'http://localhost:5000';
const METRICS_BASE = `${API}/api/metrics/`;
const RESOURCES_BASE = `${API}/api/storage-resources/`;

const R1: StorageResource = {
  id: 1, name: 'san-01', resource_type: 'SAN',
  status: 'healthy', health_status: 'healthy',
  capacity_total: 2000, capacity_used: 800,
  created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00',
};

const M1: Metric = { id: 1, resource_id: 1, metric_name: 'cpu_util', metric_value: 72.5, unit: '%', recorded_at: '2026-01-03T00:00:00' };
const M2: Metric = { id: 2, resource_id: 1, metric_name: 'iops', metric_value: 1200, unit: 'IOPS', recorded_at: '2026-01-03T01:00:00' };
const M3: Metric = { id: 3, resource_id: 1, metric_name: 'latency', metric_value: 4.5, unit: 'ms', recorded_at: '2026-01-03T02:00:00' };

describe('MetricsListComponent', () => {
  let fixture: ComponentFixture<MetricsListComponent>;
  let component: MetricsListComponent;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [MetricsListComponent],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    .overrideComponent(MetricsListComponent, {
      set: { changeDetection: ChangeDetectionStrategy.Default },
    })
    .compileComponents();

    http     = TestBed.inject(HttpTestingController);
    router   = TestBed.inject(Router);
    fixture  = TestBed.createComponent(MetricsListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  // ── helpers ──────────────────────────────────────────────

  function flushResources(data: StorageResource[] = [R1]): void {
    http.match((r) => r.url.startsWith(RESOURCES_BASE))[0]?.flush(data);
  }

  function flushMetrics(data: Metric[] = [M1, M2]): void {
    http.match((r) => r.url.startsWith(METRICS_BASE))[0]?.flush(data);
  }

  // ── creation & initial load ───────────────────────────────

  it('should create', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushMetrics();
    tick(); fixture.detectChanges();
    expect(component).toBeTruthy();
  }));

  it('should call GET /api/metrics/ on init', fakeAsync(() => {
    fixture.detectChanges();
    const req = http.expectOne((r) => r.url.startsWith(METRICS_BASE) && r.method === 'GET');
    req.flush([M1]);
    flushResources();
    tick(); fixture.detectChanges();
  }));

  it('should call GET /api/storage-resources/ on init for dropdown', fakeAsync(() => {
    fixture.detectChanges();
    const req = http.expectOne((r) => r.url.startsWith(RESOURCES_BASE) && r.method === 'GET');
    req.flush([R1]);
    flushMetrics();
    tick(); fixture.detectChanges();
  }));

  it('should show loading spinner before data arrives', () => {
    fixture.detectChanges();
    expect(component.loading()).toBeTrue();
    flushResources(); flushMetrics();
  });

  it('should hide spinner after data loads', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushMetrics();
    tick(); fixture.detectChanges();
    expect(component.loading()).toBeFalse();
  }));

  // ── renders data ──────────────────────────────────────────

  it('should populate metrics signal', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushMetrics([M1, M2, M3]);
    tick(); fixture.detectChanges();
    expect(component.metrics().length).toBe(3);
  }));

  it('should display metric names in table', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushMetrics([M1]);
    tick(); fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('cpu_util');
  }));

  it('should resolve resource name from loaded resources', fakeAsync(() => {
    fixture.detectChanges();
    flushResources([R1]); flushMetrics([M1]);
    tick(); fixture.detectChanges();
    expect(component.resourceName(1)).toBe('san-01');
  }));

  it('should fall back to "Resource N" for unknown resource id', () => {
    expect(component.resourceName(999)).toBe('Resource 999');
  });

  // ── formatValue ───────────────────────────────────────────

  it('should format integer values without decimal', () => {
    expect(component.formatValue(1200, 'IOPS')).toBe('1200 IOPS');
  });

  it('should format float values to 2 decimal places', () => {
    expect(component.formatValue(72.5, '%')).toBe('72.50 %');
  });

  it('should format value without unit', () => {
    expect(component.formatValue(42, null)).toBe('42');
  });

  // ── empty state ───────────────────────────────────────────

  it('should show empty state when list is empty', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushMetrics([]);
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-empty-state')).toBeTruthy();
  }));

  // ── error state ───────────────────────────────────────────

  it('should show error banner on API failure', fakeAsync(() => {
    fixture.detectChanges();
    http.match((r) => r.url.startsWith(METRICS_BASE))[0]?.error(new ErrorEvent('network'));
    flushResources();
    tick(); fixture.detectChanges();
    expect(component.error()).not.toBeNull();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-error-banner')).toBeTruthy();
  }));

  it('should reload on retry', fakeAsync(() => {
    fixture.detectChanges();
    http.match((r) => r.url.startsWith(METRICS_BASE))[0]?.error(new ErrorEvent('network'));
    flushResources();
    tick(); fixture.detectChanges();

    component.loadMetrics();
    fixture.detectChanges();
    flushMetrics([M1]);
    tick(); fixture.detectChanges();
    expect(component.error()).toBeNull();
    expect(component.metrics().length).toBe(1);
  }));

  // ── resource filter (API-backed) ──────────────────────────

  it('should call API with ?resource_id when resource filter set', fakeAsync(() => {
    fixture.detectChanges();
    flushResources([R1]); flushMetrics();
    tick(); fixture.detectChanges();

    component.onResourceChange('1');
    fixture.detectChanges();

    const req = http.expectOne((r) =>
      r.url.startsWith(METRICS_BASE) && r.urlWithParams.includes('resource_id=1'),
    );
    expect(req.request.method).toBe('GET');
    req.flush([M1, M2]);
    tick(); fixture.detectChanges();
    expect(component.resourceFilter()).toBe(1);
    expect(component.metricNameFilter()).toBe(''); // cleared
  }));

  it('should clear resource filter when "All resources" is selected', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushMetrics();
    tick(); fixture.detectChanges();

    component.onResourceChange('');
    flushMetrics();
    tick(); fixture.detectChanges();
    expect(component.resourceFilter()).toBeNull();
  }));

  // ── metric name filter (API-backed) ──────────────────────

  it('should clear resource filter when name filter is typed', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushMetrics();
    tick(); fixture.detectChanges();

    component.resourceFilter.set(1);
    component.onNameInput('cpu_util');
    tick(500); // past 400ms debounce
    fixture.detectChanges();

    // resource filter should have been cleared
    expect(component.resourceFilter()).toBeNull();
    http.match(() => true); // drain pending request
  }));

  // ── hasActiveFilters ──────────────────────────────────────

  it('hasActiveFilters true when resource filter set', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushMetrics();
    tick(); fixture.detectChanges();

    component.onResourceChange('1');
    flushMetrics();
    tick(); fixture.detectChanges();
    expect(component.hasActiveFilters()).toBeTrue();
  }));

  it('clearFilters resets all state', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushMetrics();
    tick(); fixture.detectChanges();

    component.resourceFilter.set(1);
    component.metricNameFilter.set('cpu');
    component.clearFilters();
    fixture.detectChanges();

    expect(component.resourceFilter()).toBeNull();
    expect(component.metricNameFilter()).toBe('');
    flushMetrics(); tick(); fixture.detectChanges();
    expect(component.hasActiveFilters()).toBeFalse();
  }));

  // ── navigation ────────────────────────────────────────────

  it('should navigate to metric detail on navigateTo()', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushMetrics([M1]);
    tick(); fixture.detectChanges();

    const spy = spyOn(component['router'], 'navigate');
    component.navigateTo(1);
    expect(spy).toHaveBeenCalledWith(['/metrics', 1]);
  }));
});
