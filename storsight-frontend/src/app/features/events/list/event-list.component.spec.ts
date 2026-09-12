import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy } from '@angular/core';

import { EventListComponent } from './event-list.component';
import { Event as InfraEvent, StorageResource } from '../../../core/models';
import { routes } from '../../../app.routes';

const API = 'http://localhost:5000';
const EVENTS_BASE    = `${API}/api/events/`;
const RESOURCES_BASE = `${API}/api/storage-resources/`;

const R1: StorageResource = {
  id: 1, name: 'san-01', resource_type: 'SAN',
  status: 'healthy', health_status: 'healthy',
  capacity_total: 2000, capacity_used: 800,
  created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00',
};

const E_CRITICAL: InfraEvent = { id: 1, resource_id: 1, event_type: 'disk_failure',    severity: 'critical', message: 'Disk A failed',          occurred_at: '2026-01-03T00:00:00' };
const E_WARNING:  InfraEvent = { id: 2, resource_id: 1, event_type: 'capacity_warning', severity: 'warning',  message: 'Capacity at 90%',        occurred_at: '2026-01-03T01:00:00' };
const E_INFO:     InfraEvent = { id: 3, resource_id: 1, event_type: 'health_check',     severity: 'info',     message: 'Routine check completed', occurred_at: '2026-01-03T02:00:00' };

function eventPage(items: InfraEvent[], page = 1, pageSize = 50) {
  return {
    items,
    pagination: {
      page,
      page_size: pageSize,
      total: items.length,
      total_pages: items.length ? 1 : 0,
    },
  };
}

describe('EventListComponent', () => {
  let fixture: ComponentFixture<EventListComponent>;
  let component: EventListComponent;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EventListComponent],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    .overrideComponent(EventListComponent, {
      set: { changeDetection: ChangeDetectionStrategy.Default },
    })
    .compileComponents();

    http     = TestBed.inject(HttpTestingController);
    router   = TestBed.inject(Router);
    fixture  = TestBed.createComponent(EventListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  // ── helpers ──────────────────────────────────────────────

  function flushResources(data: StorageResource[] = [R1]): void {
    http.match((r) => r.url.startsWith(RESOURCES_BASE))[0]?.flush(data);
  }

  function flushEvents(data: InfraEvent[] = [E_CRITICAL, E_WARNING]): void {
    http.match((r) => r.url.startsWith(EVENTS_BASE))[0]?.flush(eventPage(data));
  }

  // ── creation & load ───────────────────────────────────────

  it('should create', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushEvents();
    tick(); fixture.detectChanges();
    expect(component).toBeTruthy();
  }));

  it('should call GET /api/events/ on init', fakeAsync(() => {
    fixture.detectChanges();
    const req = http.expectOne((r) => r.url.startsWith(EVENTS_BASE) && r.method === 'GET');
    req.flush(eventPage([E_CRITICAL]));
    flushResources();
    tick(); fixture.detectChanges();
  }));

  it('should show loading spinner before data', () => {
    fixture.detectChanges();
    expect(component.loading()).toBeTrue();
    flushResources(); flushEvents();
  });

  it('should hide spinner after load', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushEvents();
    tick(); fixture.detectChanges();
    expect(component.loading()).toBeFalse();
  }));

  // ── renders data ──────────────────────────────────────────

  it('should populate events signal', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushEvents([E_CRITICAL, E_WARNING, E_INFO]);
    tick(); fixture.detectChanges();
    expect(component.events().length).toBe(3);
  }));

  it('should display event types in table', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushEvents([E_CRITICAL]);
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('disk_failure');
  }));

  it('should render severity badges', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushEvents([E_CRITICAL]);
    tick(); fixture.detectChanges();
    const badges = (fixture.nativeElement as HTMLElement).querySelectorAll('ss-severity-badge');
    expect(badges.length).toBeGreaterThan(0);
  }));

  it('should resolve resource name from loaded resources', fakeAsync(() => {
    fixture.detectChanges();
    flushResources([R1]); flushEvents([E_CRITICAL]);
    tick(); fixture.detectChanges();
    expect(component.resourceName(1)).toBe('san-01');
  }));

  // ── empty state ───────────────────────────────────────────

  it('should show empty state when events list is empty', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushEvents([]);
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-empty-state')).toBeTruthy();
  }));

  // ── error state ───────────────────────────────────────────

  it('should show error banner on API failure', fakeAsync(() => {
    fixture.detectChanges();
    http.match((r) => r.url.startsWith(EVENTS_BASE))[0]?.error(new ErrorEvent('network'));
    flushResources();
    tick(); fixture.detectChanges();
    expect(component.error()).not.toBeNull();
  }));

  it('should reload on retry', fakeAsync(() => {
    fixture.detectChanges();
    http.match((r) => r.url.startsWith(EVENTS_BASE))[0]?.error(new ErrorEvent('network'));
    flushResources();
    tick(); fixture.detectChanges();

    component.loadEvents();
    fixture.detectChanges();
    flushEvents([E_CRITICAL]);
    tick(); fixture.detectChanges();
    expect(component.error()).toBeNull();
    expect(component.events().length).toBe(1);
  }));

  // ── severity filter (API-backed) ──────────────────────────

  it('should call API with ?severity= when severity filter set', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushEvents();
    tick(); fixture.detectChanges();

    component.onSeverityChange('critical');
    fixture.detectChanges();

    const req = http.expectOne((r) =>
      r.url.startsWith(EVENTS_BASE) && r.urlWithParams.includes('severity=critical'),
    );
    expect(req.request.method).toBe('GET');
    req.flush(eventPage([E_CRITICAL]));
    tick(); fixture.detectChanges();
    expect(component.severityFilter()).toBe('critical');
    expect(component.resourceFilter()).toBeNull();
  }));

  it('should have correct severity options from backend spec', () => {
    expect(component.severities).toContain('info');
    expect(component.severities).toContain('warning');
    expect(component.severities).toContain('error');
    expect(component.severities).toContain('critical');
  });

  // ── resource filter (API-backed) ──────────────────────────

  it('should call API with ?resource_id= when resource filter set', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushEvents();
    tick(); fixture.detectChanges();

    component.onResourceChange('1');
    fixture.detectChanges();

    const req = http.expectOne((r) =>
      r.url.startsWith(EVENTS_BASE) && r.urlWithParams.includes('resource_id=1'),
    );
    req.flush(eventPage([E_CRITICAL, E_WARNING]));
    tick(); fixture.detectChanges();
    expect(component.resourceFilter()).toBe(1);
    expect(component.severityFilter()).toBe('');
  }));

  // ── event_type search (API-backed) ───────────────────────

  it('should search event types through the API', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushEvents([E_CRITICAL, E_WARNING, E_INFO]);
    tick(); fixture.detectChanges();

    component.onTypeInput('disk');
    tick(200);
    const req = http.expectOne((r) =>
      r.url.startsWith(EVENTS_BASE) && r.urlWithParams.includes('event_type=disk'),
    );
    req.flush(eventPage([E_CRITICAL]));
    tick(); fixture.detectChanges();
    expect(component.filtered().length).toBe(1);
    expect(component.filtered()[0].event_type).toBe('disk_failure');
  }));

  it('should show all events when event_type search is empty', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushEvents([E_CRITICAL, E_WARNING]);
    tick(); fixture.detectChanges();

    component.eventTypeSearch.set('');
    fixture.detectChanges();
    expect(component.filtered().length).toBe(2);
  }));

  it('should send event_type with the active filters', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushEvents();
    tick(); fixture.detectChanges();

    component.resourceFilter.set(1);
    component.severityFilter.set('critical');
    component.eventTypeSearch.set('disk');
    component.loadEvents();

    const req = http.expectOne((r) =>
      r.url.startsWith(EVENTS_BASE)
      && r.urlWithParams.includes('resource_id=1')
      && r.urlWithParams.includes('severity=critical')
      && r.urlWithParams.includes('event_type=disk'),
    );
    req.flush(eventPage([E_CRITICAL]));
    tick(); fixture.detectChanges();
    expect(component.events()).toEqual([E_CRITICAL]);
  }));

  // ── clearFilters ──────────────────────────────────────────

  it('clearFilters resets all filter signals', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushEvents();
    tick(); fixture.detectChanges();

    component.severityFilter.set('critical');
    component.eventTypeSearch.set('disk');
    component.clearFilters();
    fixture.detectChanges();

    expect(component.severityFilter()).toBe('');
    expect(component.eventTypeSearch()).toBe('');
    flushEvents(); tick(); fixture.detectChanges();
    expect(component.hasActiveFilters()).toBeFalse();
  }));

  // ── navigation ────────────────────────────────────────────

  it('should navigate to event detail on navigateTo()', fakeAsync(() => {
    fixture.detectChanges();
    flushResources(); flushEvents([E_CRITICAL]);
    tick(); fixture.detectChanges();

    const spy = spyOn(component['router'], 'navigate');
    component.navigateTo(1);
    expect(spy).toHaveBeenCalledWith(['/events', 1]);
  }));
});
