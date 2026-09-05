import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy } from '@angular/core';

import { IncidentListComponent } from './incident-list.component';
import { Incident } from '../../../core/models';
import { routes } from '../../../app.routes';

const API = 'http://localhost:5000';
const INC_BASE = `${API}/api/incidents/`;

const I_CRITICAL: Incident = { id: 1, title: 'Storage outage', description: 'Primary SAN offline', severity: 'critical', status: 'open',        assignee_id: null, created_at: '2026-01-03T00:00:00', updated_at: '2026-01-03T00:00:00', resolved_at: null };
const I_HIGH:     Incident = { id: 2, title: 'Capacity spike',  description: null,                  severity: 'high',     status: 'in_progress', assignee_id: 3,    created_at: '2026-01-02T00:00:00', updated_at: '2026-01-02T12:00:00', resolved_at: null };
const I_RESOLVED: Incident = { id: 3, title: 'Old issue',       description: null,                  severity: 'medium',   status: 'resolved',    assignee_id: null, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T20:00:00', resolved_at: '2026-01-01T20:00:00' };

describe('IncidentListComponent', () => {
  let fixture: ComponentFixture<IncidentListComponent>;
  let component: IncidentListComponent;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [IncidentListComponent],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    })
    .overrideComponent(IncidentListComponent, { set: { changeDetection: ChangeDetectionStrategy.Default } })
    .compileComponents();

    http      = TestBed.inject(HttpTestingController);
    router    = TestBed.inject(Router);
    fixture   = TestBed.createComponent(IncidentListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  function flushIncidents(data: Incident[] = [I_CRITICAL, I_HIGH]): void {
    http.match(r => r.url.startsWith(INC_BASE))[0]?.flush(data);
  }

  // ── Creation ──────────────────────────────────────────────

  it('should create', fakeAsync(() => {
    fixture.detectChanges();
    flushIncidents();
    tick(); fixture.detectChanges();
    expect(component).toBeTruthy();
  }));

  it('should call GET /api/incidents/ on init', fakeAsync(() => {
    fixture.detectChanges();
    const req = http.expectOne(r => r.url.startsWith(INC_BASE) && r.method === 'GET');
    req.flush([I_CRITICAL]);
    tick(); fixture.detectChanges();
  }));

  it('should show loading spinner before data', () => {
    fixture.detectChanges();
    expect(component.loading()).toBeTrue();
    flushIncidents();
  });

  it('should hide spinner after load', fakeAsync(() => {
    fixture.detectChanges();
    flushIncidents();
    tick(); fixture.detectChanges();
    expect(component.loading()).toBeFalse();
  }));

  // ── Renders data ──────────────────────────────────────────

  it('should populate incidents signal', fakeAsync(() => {
    fixture.detectChanges();
    flushIncidents([I_CRITICAL, I_HIGH, I_RESOLVED]);
    tick(); fixture.detectChanges();
    expect(component.incidents().length).toBe(3);
  }));

  it('should display incident titles', fakeAsync(() => {
    fixture.detectChanges();
    flushIncidents([I_CRITICAL]);
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Storage outage');
  }));

  it('should render severity badges', fakeAsync(() => {
    fixture.detectChanges();
    flushIncidents([I_CRITICAL]);
    tick(); fixture.detectChanges();
    const badges = (fixture.nativeElement as HTMLElement).querySelectorAll('ss-severity-badge');
    expect(badges.length).toBeGreaterThan(0);
  }));

  it('should render status badges', fakeAsync(() => {
    fixture.detectChanges();
    flushIncidents([I_CRITICAL]);
    tick(); fixture.detectChanges();
    const badges = (fixture.nativeElement as HTMLElement).querySelectorAll('ss-status-badge');
    expect(badges.length).toBeGreaterThan(0);
  }));

  // ── Empty state ───────────────────────────────────────────

  it('should show empty state when list is empty', fakeAsync(() => {
    fixture.detectChanges();
    flushIncidents([]);
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-empty-state')).toBeTruthy();
  }));

  // ── Error state ───────────────────────────────────────────

  it('should show error on API failure', fakeAsync(() => {
    fixture.detectChanges();
    http.match(r => r.url.startsWith(INC_BASE))[0]?.error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();
    expect(component.error()).not.toBeNull();
  }));

  it('should reload on retry', fakeAsync(() => {
    fixture.detectChanges();
    http.match(r => r.url.startsWith(INC_BASE))[0]?.error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();

    component.loadIncidents();
    fixture.detectChanges();
    flushIncidents([I_CRITICAL]);
    tick(); fixture.detectChanges();
    expect(component.error()).toBeNull();
  }));

  // ── Status filter ─────────────────────────────────────────

  it('should call API with ?status= on status change', fakeAsync(() => {
    fixture.detectChanges();
    flushIncidents();
    tick(); fixture.detectChanges();

    component.onStatusChange('open');
    fixture.detectChanges();

    const req = http.expectOne(r => r.urlWithParams.includes('status=open'));
    expect(req.request.method).toBe('GET');
    req.flush([I_CRITICAL]);
    tick(); fixture.detectChanges();
    expect(component.statusFilter()).toBe('open');
    expect(component.severityFilter()).toBe(''); // mutually exclusive
  }));

  // ── Severity filter ───────────────────────────────────────

  it('should call API with ?severity= on severity change', fakeAsync(() => {
    fixture.detectChanges();
    flushIncidents();
    tick(); fixture.detectChanges();

    component.onSeverityChange('critical');
    fixture.detectChanges();

    const req = http.expectOne(r => r.urlWithParams.includes('severity=critical'));
    req.flush([I_CRITICAL]);
    tick(); fixture.detectChanges();
    expect(component.severityFilter()).toBe('critical');
    expect(component.statusFilter()).toBe(''); // cleared
  }));

  // ── Clear filters ─────────────────────────────────────────

  it('should reset all filters on clearFilters', fakeAsync(() => {
    fixture.detectChanges();
    flushIncidents(); tick(); fixture.detectChanges();

    component.statusFilter.set('open');
    component.clearFilters();
    flushIncidents(); tick(); fixture.detectChanges();
    expect(component.hasActiveFilters()).toBeFalse();
  }));

  // ── Navigation ────────────────────────────────────────────

  it('should navigate to incident detail on navigateTo()', fakeAsync(() => {
    fixture.detectChanges();
    flushIncidents([I_CRITICAL]); tick(); fixture.detectChanges();

    const spy = spyOn(component['router'], 'navigate');
    component.navigateTo(1);
    expect(spy).toHaveBeenCalledWith(['/incidents', 1]);
  }));
});
