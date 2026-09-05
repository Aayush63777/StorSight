import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy } from '@angular/core';

import { AlertListComponent } from './alert-list.component';
import { Alert, StorageResource } from '../../../core/models';
import { routes } from '../../../app.routes';

const API = 'http://localhost:5000';
const ALERTS_BASE    = `${API}/api/alerts/`;
const RESOURCES_BASE = `${API}/api/storage-resources/`;

const R1: StorageResource = { id: 1, name: 'san-01', resource_type: 'SAN', status: 'healthy', health_status: 'healthy', capacity_total: 2000, capacity_used: 800, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' };

const A_CRITICAL: Alert  = { id: 1, resource_id: 1, title: 'Disk full',    severity: 'critical', status: 'active',   message: 'Primary disk exceeded 95%', created_at: '2026-01-02T00:00:00', resolved_at: null };
const A_WARNING: Alert   = { id: 2, resource_id: 1, title: 'High latency', severity: 'warning',  status: 'active',   message: null, created_at: '2026-01-02T01:00:00', resolved_at: null };
const A_RESOLVED: Alert  = { id: 3, resource_id: 1, title: 'Old alert',    severity: 'info',     status: 'resolved', message: null, created_at: '2026-01-01T00:00:00', resolved_at: '2026-01-01T12:00:00' };

describe('AlertListComponent', () => {
  let fixture: ComponentFixture<AlertListComponent>;
  let component: AlertListComponent;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AlertListComponent],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    })
    .overrideComponent(AlertListComponent, { set: { changeDetection: ChangeDetectionStrategy.Default } })
    .compileComponents();

    http     = TestBed.inject(HttpTestingController);
    router   = TestBed.inject(Router);
    fixture  = TestBed.createComponent(AlertListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  function flushResources(data: StorageResource[] = [R1]): void {
    http.match(r => r.url.startsWith(RESOURCES_BASE))[0]?.flush(data);
  }

  function flushAlerts(data: Alert[] = [A_CRITICAL, A_WARNING]): void {
    http.match(r => r.url.startsWith(ALERTS_BASE))[0]?.flush(data);
  }

  // ── Creation ──────────────────────────────────────────────

  it('should create', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushAlerts();
    tick(); fixture.detectChanges();
    expect(component).toBeTruthy();
  }));

  it('should call GET /api/alerts/ on init', fakeAsync(() => {
    fixture.detectChanges();
    const req = http.expectOne(r => r.url.startsWith(ALERTS_BASE) && r.method === 'GET');
    req.flush([A_CRITICAL]);
    flushResources();
    tick(); fixture.detectChanges();
  }));

  it('should show loading spinner before data', () => {
    fixture.detectChanges();
    expect(component.loading()).toBeTrue();
    flushResources(); flushAlerts();
  });

  it('should hide spinner after load', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushAlerts();
    tick(); fixture.detectChanges();
    expect(component.loading()).toBeFalse();
  }));

  // ── Renders data ──────────────────────────────────────────

  it('should populate alerts signal', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushAlerts([A_CRITICAL, A_WARNING, A_RESOLVED]);
    tick(); fixture.detectChanges();
    expect(component.alerts().length).toBe(3);
  }));

  it('should render alert titles', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushAlerts([A_CRITICAL]);
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Disk full');
  }));

  it('should render severity badges', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushAlerts([A_CRITICAL]);
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('ss-severity-badge').length).toBeGreaterThan(0);
  }));

  it('should render status badges', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushAlerts([A_CRITICAL]);
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelectorAll('ss-status-badge').length).toBeGreaterThan(0);
  }));

  it('should resolve resource name from loaded resources', fakeAsync(() => {
    fixture.detectChanges();
    flushResources([R1]); flushAlerts([A_CRITICAL]);
    tick(); fixture.detectChanges();
    expect(component.resourceName(1)).toBe('san-01');
  }));

  // ── Empty state ───────────────────────────────────────────

  it('should show empty state when list is empty', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushAlerts([]);
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-empty-state')).toBeTruthy();
  }));

  // ── Error state ───────────────────────────────────────────

  it('should show error banner on API failure', fakeAsync(() => {
    fixture.detectChanges();
    http.match(r => r.url.startsWith(ALERTS_BASE))[0]?.error(new ErrorEvent('network'));
    flushResources();
    tick(); fixture.detectChanges();
    expect(component.error()).not.toBeNull();
  }));

  it('should reload on retry', fakeAsync(() => {
    fixture.detectChanges();
    http.match(r => r.url.startsWith(ALERTS_BASE))[0]?.error(new ErrorEvent('network'));
    flushResources();
    tick(); fixture.detectChanges();

    component.loadAlerts();
    fixture.detectChanges();
    flushAlerts([A_CRITICAL]);
    tick(); fixture.detectChanges();
    expect(component.error()).toBeNull();
  }));

  // ── Severity filter ───────────────────────────────────────

  it('should call API with ?severity= when severity filter changes', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushAlerts();
    tick(); fixture.detectChanges();

    component.onSeverityChange('critical');
    fixture.detectChanges();

    const req = http.expectOne(r => r.urlWithParams.includes('severity=critical'));
    expect(req.request.method).toBe('GET');
    req.flush([A_CRITICAL]);
    tick(); fixture.detectChanges();
    expect(component.severityFilter()).toBe('critical');
    expect(component.statusFilter()).toBe(''); // cleared
  }));

  // ── Status filter ─────────────────────────────────────────

  it('should call API with ?status= when status filter changes', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushAlerts();
    tick(); fixture.detectChanges();

    component.onStatusChange('active');
    fixture.detectChanges();

    const req = http.expectOne(r => r.urlWithParams.includes('status=active'));
    req.flush([A_CRITICAL, A_WARNING]);
    tick(); fixture.detectChanges();
    expect(component.statusFilter()).toBe('active');
    expect(component.severityFilter()).toBe(''); // cleared
  }));

  // ── Resource filter ───────────────────────────────────────

  it('should call API with ?resource_id= when resource filter changes', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushAlerts();
    tick(); fixture.detectChanges();

    component.onResourceChange('1');
    fixture.detectChanges();

    const req = http.expectOne(r => r.urlWithParams.includes('resource_id=1'));
    req.flush([A_CRITICAL]);
    tick(); fixture.detectChanges();
    expect(component.resourceFilter()).toBe(1);
    expect(component.severityFilter()).toBe(''); // cleared
  }));

  // ── Clear filters ─────────────────────────────────────────

  it('clearFilters resets all filters', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushAlerts();
    tick(); fixture.detectChanges();

    component.severityFilter.set('critical');
    component.clearFilters();
    flushAlerts(); tick(); fixture.detectChanges();
    expect(component.hasActiveFilters()).toBeFalse();
  }));

  // ── Inline resolve ────────────────────────────────────────

  it('should open resolve dialog for active alert', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushAlerts([A_CRITICAL]);
    tick(); fixture.detectChanges();

    const event = new MouseEvent('click');
    component.openResolveDialog(A_CRITICAL, event);
    fixture.detectChanges();
    expect(component.resolveTarget()).toBe(A_CRITICAL);
  }));

  it('should cancel resolve without calling API', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushAlerts([A_CRITICAL]);
    tick(); fixture.detectChanges();

    const event = new MouseEvent('click');
    component.openResolveDialog(A_CRITICAL, event);
    component.cancelResolve();
    expect(component.resolveTarget()).toBeNull();
    http.expectNone(r => r.method === 'PATCH');
  }));

  it('should call PATCH /api/alerts/:id/resolve on confirmResolve', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushAlerts([A_CRITICAL]);
    tick(); fixture.detectChanges();

    const event = new MouseEvent('click');
    component.openResolveDialog(A_CRITICAL, event);
    component.confirmResolve();
    fixture.detectChanges();

    const req = http.expectOne(r =>
      r.url.includes(`/api/alerts/1/resolve`) && r.method === 'PATCH',
    );
    req.flush({ ...A_CRITICAL, status: 'resolved', resolved_at: '2026-06-01T00:00:00' });
    tick(); fixture.detectChanges();
    expect(component.resolving()).toBeFalse();
    expect(component.alerts()[0].status).toBe('resolved');
  }));

  it('should prevent double resolve click', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushAlerts([A_CRITICAL]);
    tick(); fixture.detectChanges();

    const event = new MouseEvent('click');
    component.openResolveDialog(A_CRITICAL, event);
    component.confirmResolve();
    component.confirmResolve(); // second call — should be ignored
    const reqs = http.match(r => r.url.includes('/resolve') && r.method === 'PATCH');
    expect(reqs.length).toBe(1);
    reqs[0].flush({ ...A_CRITICAL, status: 'resolved', resolved_at: '2026-06-01T00:00:00' });
    tick();
  }));

  it('should show resolveError on resolve failure', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushAlerts([A_CRITICAL]);
    tick(); fixture.detectChanges();

    const event = new MouseEvent('click');
    component.openResolveDialog(A_CRITICAL, event);
    component.confirmResolve();

    http.match(r => r.url.includes('/resolve') && r.method === 'PATCH')[0]?.error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();
    expect(component.resolveError()).not.toBeNull();
  }));

  // ── Navigation ────────────────────────────────────────────

  it('should navigate to detail on navigateTo()', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushAlerts([A_CRITICAL]);
    tick(); fixture.detectChanges();

    const spy = spyOn(component['router'], 'navigate');
    component.navigateTo(1);
    expect(spy).toHaveBeenCalledWith(['/alerts', 1]);
  }));
});
