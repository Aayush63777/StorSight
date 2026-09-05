import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy } from '@angular/core';

import { DashboardComponent } from './dashboard.component';
import { Alert, Incident } from '../../core/models';
import { routes } from '../../app.routes';

const API = 'http://localhost:5000';

// ── Typed test stubs ──────────────────────────────────────────────────────────

const R_HEALTHY = { id: 1, name: 'san-01', resource_type: 'SAN', status: 'healthy'  as const, health_status: 'healthy'  as const, capacity_total: 1000, capacity_used: 400,  created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' };
const R_WARNING  = { id: 2, name: 'nas-01', resource_type: 'NAS', status: 'warning'  as const, health_status: 'warning'  as const, capacity_total: 2000, capacity_used: 1800, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' };
const R_CRITICAL = { id: 3, name: 'nas-02', resource_type: 'NAS', status: 'critical' as const, health_status: 'critical' as const, capacity_total: 500,  capacity_used: 500,  created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00' };

const A_CRITICAL: Alert = { id: 1, resource_id: 1, title: 'Disk full',    severity: 'critical', status: 'active',   message: null, created_at: '2026-01-02T00:00:00', resolved_at: null };
const A_WARNING:  Alert = { id: 2, resource_id: 2, title: 'High latency', severity: 'warning',  status: 'active',   message: null, created_at: '2026-01-02T00:00:00', resolved_at: null };
const A_RESOLVED: Alert = { id: 3, resource_id: 3, title: 'Old alert',    severity: 'critical', status: 'resolved', message: null, created_at: '2026-01-01T00:00:00', resolved_at: '2026-01-01T12:00:00' };

const I_CRITICAL: Incident = { id: 1, title: 'Storage outage', description: null, severity: 'critical', status: 'open',     assignee_id: null, created_at: '2026-01-03T00:00:00', updated_at: '2026-01-03T00:00:00', resolved_at: null };
const I_HIGH:     Incident = { id: 2, title: 'Capacity issue', description: null, severity: 'high',     status: 'open',     assignee_id: null, created_at: '2026-01-02T00:00:00', updated_at: '2026-01-02T00:00:00', resolved_at: null };
const I_RESOLVED: Incident = { id: 3, title: 'Old incident',   description: null, severity: 'medium',   status: 'resolved', assignee_id: null, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00', resolved_at: '2026-01-01T20:00:00' };

const EV = { id: 1, resource_id: 1, event_type: 'disk_failure', severity: 'critical' as const, message: 'Disk failed', occurred_at: '2026-01-03T00:00:00' };
const AU = { id: 1, user_id: 1, action: 'incident_resolved', entity_type: 'incident', entity_id: 1, details: null, created_at: '2026-01-03T01:00:00' };

// ── Helper to flush all 5 forkJoin requests ──────────────────────────────────

interface FlushOptions {
  resources?: object[];
  alerts?: Alert[];
  incidents?: Incident[];
  events?: object[];
  auditLogs?: object[];
}

function flushAll(http: HttpTestingController, opts: FlushOptions = {}): void {
  const {
    resources = [R_HEALTHY],
    alerts    = [A_CRITICAL],
    incidents = [I_CRITICAL],
    events    = [EV],
    auditLogs = [AU],
  } = opts;

  // Use match() to handle both `/api/resources/` and `/api/resources/?` variations
  http.match((req) => req.url.includes('/api/storage-resources/'))[0]?.flush(resources);
  http.match((req) => req.url.includes('/api/alerts/'))[0]?.flush(alerts);
  http.match((req) => req.url.includes('/api/incidents/') && !req.url.includes('/rca') && !req.url.includes('/risk') && !req.url.includes('/actions') && !req.url.includes('/events') && !req.url.includes('/recommendations'))[0]?.flush(incidents);
  http.match((req) => req.url.includes('/api/events/'))[0]?.flush(events);
  http.match((req) => req.url.includes('/api/audit-logs/'))[0]?.flush(auditLogs);
}

// ── Tests ────────────────────────────────────────────────────────────────────

describe('DashboardComponent', () => {
  let fixture: ComponentFixture<DashboardComponent>;
  let component: DashboardComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DashboardComponent],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    .overrideComponent(DashboardComponent, {
      set: { changeDetection: ChangeDetectionStrategy.Default },
    })
    .compileComponents();

    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(DashboardComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    // Drain any unflushed requests so verify doesn't complain
    http.match(() => true);
    http.verify();
  });

  // ── Creation ──────────────────────────────────────────────────────────────

  it('should create', fakeAsync(() => {
    fixture.detectChanges();
    flushAll(http);
    tick();
    fixture.detectChanges();
    expect(component).toBeTruthy();
  }));

  // ── Loading state ─────────────────────────────────────────────────────────

  it('should show loading state before data arrives', () => {
    fixture.detectChanges(); // triggers ngOnInit
    expect(component.loading()).toBeTrue();
    flushAll(http); // keep afterEach happy
  });

  it('should hide loading once data loads', fakeAsync(() => {
    fixture.detectChanges();
    flushAll(http);
    tick();
    fixture.detectChanges();
    expect(component.loading()).toBeFalse();
  }));

  // ── KPI: totalResources ───────────────────────────────────────────────────

  it('should calculate totalResources', fakeAsync(() => {
    fixture.detectChanges();
    flushAll(http, { resources: [R_HEALTHY, R_WARNING, R_CRITICAL], alerts: [], incidents: [], events: [], auditLogs: [] });
    tick();
    fixture.detectChanges();
    expect(component.totalResources()).toBe(3);
  }));

  // ── KPI: activeAlerts ─────────────────────────────────────────────────────

  it('should count only active alerts', fakeAsync(() => {
    fixture.detectChanges();
    flushAll(http, { resources: [], alerts: [A_CRITICAL, A_WARNING, A_RESOLVED], incidents: [], events: [], auditLogs: [] });
    tick();
    fixture.detectChanges();
    expect(component.activeAlerts()).toBe(2);
  }));

  // ── KPI: openIncidents ────────────────────────────────────────────────────

  it('should count only non-resolved incidents as open', fakeAsync(() => {
    fixture.detectChanges();
    flushAll(http, { resources: [], alerts: [], incidents: [I_CRITICAL, I_HIGH, I_RESOLVED], events: [], auditLogs: [] });
    tick();
    fixture.detectChanges();
    expect(component.openIncidents()).toBe(2);
  }));

  // ── KPI: criticalIncidents ────────────────────────────────────────────────

  it('should count only critical open incidents', fakeAsync(() => {
    fixture.detectChanges();
    flushAll(http, { resources: [], alerts: [], incidents: [I_CRITICAL, I_HIGH, I_RESOLVED], events: [], auditLogs: [] });
    tick();
    fixture.detectChanges();
    expect(component.criticalIncidents()).toBe(1);
  }));

  // ── Resource health distribution ──────────────────────────────────────────

  it('should calculate resource health distribution', fakeAsync(() => {
    fixture.detectChanges();
    flushAll(http, { resources: [R_HEALTHY, R_WARNING, R_CRITICAL], alerts: [], incidents: [], events: [], auditLogs: [] });
    tick();
    fixture.detectChanges();
    const dist = component.resourcesByStatus();
    expect(dist.healthy).toBe(1);
    expect(dist.warning).toBe(1);
    expect(dist.critical).toBe(1);
    expect(dist.offline).toBe(0);
  }));

  it('should calculate health percent', fakeAsync(() => {
    fixture.detectChanges();
    flushAll(http, { resources: [R_HEALTHY, R_WARNING, R_CRITICAL], alerts: [], incidents: [], events: [], auditLogs: [] });
    tick();
    fixture.detectChanges();
    expect(component.healthPercent()).toBe(33);
  }));

  it('should return 0 health percent when no resources', fakeAsync(() => {
    fixture.detectChanges();
    flushAll(http, { resources: [], alerts: [], incidents: [], events: [], auditLogs: [] });
    tick();
    fixture.detectChanges();
    expect(component.healthPercent()).toBe(0);
  }));

  // ── Alert severity distribution ───────────────────────────────────────────

  it('should split active alerts by severity', fakeAsync(() => {
    fixture.detectChanges();
    flushAll(http, { resources: [], alerts: [A_CRITICAL, A_WARNING, A_RESOLVED], incidents: [], events: [], auditLogs: [] });
    tick();
    fixture.detectChanges();
    const dist = component.activeAlertsBySeverity();
    expect(dist.critical).toBe(1);
    expect(dist.warning).toBe(1);
    expect(dist.info).toBe(0);
  }));

  // ── Recent events slicing ─────────────────────────────────────────────────

  it('should slice recent events to 5', fakeAsync(() => {
    const manyEvents = Array.from({ length: 10 }, (_, i) => ({ ...EV, id: i + 1 }));
    fixture.detectChanges();
    flushAll(http, { resources: [], alerts: [], incidents: [], events: manyEvents, auditLogs: [] });
    tick();
    fixture.detectChanges();
    expect(component.recentEvents().length).toBe(5);
  }));

  // ── Empty states ──────────────────────────────────────────────────────────

  it('should show empty components when no active alerts', fakeAsync(() => {
    fixture.detectChanges();
    flushAll(http, { resources: [R_HEALTHY], alerts: [A_RESOLVED], incidents: [], events: [], auditLogs: [] });
    tick();
    fixture.detectChanges();
    expect(component.activeAlerts()).toBe(0);
    const empties = (fixture.nativeElement as HTMLElement).querySelectorAll('ss-empty-state');
    expect(empties.length).toBeGreaterThan(0);
  }));

  // ── Graceful degradation on partial failure ───────────────────────────────

  it('should render with empty data when a stream fails', fakeAsync(() => {
    fixture.detectChanges();
    http.match((req) => req.url.includes('/api/storage-resources/'))[0]?.error(new ErrorEvent('network'));
    http.match((req) => req.url.includes('/api/alerts/'))[0]?.flush([]);
    http.match((req) => req.url.includes('/api/incidents/') && !req.url.includes('/rca') && !req.url.includes('/risk') && !req.url.includes('/actions') && !req.url.includes('/events') && !req.url.includes('/recommendations'))[0]?.flush([]);
    http.match((req) => req.url.includes('/api/events/'))[0]?.flush([]);
    http.match((req) => req.url.includes('/api/audit-logs/'))[0]?.flush([]);
    tick();
    fixture.detectChanges();
    expect(component.loading()).toBeFalse();
    expect(component.error()).toBeNull();
    expect(component.totalResources()).toBe(0);
  }));

  // ── Retry / refresh ───────────────────────────────────────────────────────

  it('should reload data on loadDashboard()', fakeAsync(() => {
    fixture.detectChanges();
    flushAll(http);
    tick();
    fixture.detectChanges();

    component.loadDashboard();
    fixture.detectChanges();
    expect(component.loading()).toBeTrue();

    flushAll(http, { resources: [R_HEALTHY, R_WARNING], alerts: [], incidents: [], events: [], auditLogs: [] });
    tick();
    fixture.detectChanges();
    expect(component.totalResources()).toBe(2);
  }));

  // ── Incident navigation ───────────────────────────────────────────────────

  it('should navigate to incident detail', fakeAsync(() => {
    fixture.detectChanges();
    flushAll(http, { resources: [], alerts: [], incidents: [I_CRITICAL], events: [], auditLogs: [] });
    tick();
    fixture.detectChanges();

    const spy = spyOn(component.router, 'navigate');
    component.navigateToIncident(42);
    expect(spy).toHaveBeenCalledWith(['/incidents', 42]);
  }));

  // ── formatAction helper ───────────────────────────────────────────────────

  it('should format audit action strings', () => {
    expect(component.formatAction('incident_resolved')).toBe('Incident Resolved');
    expect(component.formatAction('engineer_action:investigation')).toBe('Investigation');
    expect(component.formatAction('engineer_action:root_cause')).toBe('Root Cause');
  });
});
