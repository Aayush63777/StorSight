import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { EventDetailComponent } from './event-detail.component';
import { Event as InfraEvent, StorageResource } from '../../../core/models';
import { routes } from '../../../app.routes';

const API = 'http://localhost:5000';
const EVENTS_BASE    = `${API}/api/events/`;
const RESOURCES_BASE = `${API}/api/storage-resources/`;

const EVENT: InfraEvent = {
  id: 5, resource_id: 2, event_type: 'disk_failure',
  severity: 'critical', message: 'Primary disk failed on controller A.',
  occurred_at: '2026-01-03T00:00:00',
};

const RESOURCE: StorageResource = {
  id: 2, name: 'nas-02', resource_type: 'NAS',
  status: 'critical', health_status: 'critical',
  capacity_total: 500, capacity_used: 500,
  created_at: '2026-01-01T00:00:00', updated_at: '2026-01-03T00:00:00',
};

async function setupWithParam(paramId: string) {
  await TestBed.configureTestingModule({
    imports: [EventDetailComponent],
    providers: [
      provideRouter(routes),
      provideHttpClient(),
      provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => paramId } } } },
    ],
  })
  .overrideComponent(EventDetailComponent, {
    set: { changeDetection: ChangeDetectionStrategy.Default },
  })
  .compileComponents();
}

describe('EventDetailComponent', () => {
  let fixture: ComponentFixture<EventDetailComponent>;
  let component: EventDetailComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await setupWithParam('5');
    http     = TestBed.inject(HttpTestingController);
    fixture  = TestBed.createComponent(EventDetailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  // ── creation ──────────────────────────────────────────────

  it('should create', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${EVENTS_BASE}5`).flush(EVENT);
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
    http.expectOne(`${EVENTS_BASE}5`).flush(EVENT);
    http.match((r) => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect(component.loading()).toBeFalse();
  }));

  // ── renders data ──────────────────────────────────────────

  it('should set event signal on success', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${EVENTS_BASE}5`).flush(EVENT);
    http.match((r) => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect(component.event()?.event_type).toBe('disk_failure');
  }));

  it('should set resource signal on success', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${EVENTS_BASE}5`).flush(EVENT);
    http.match((r) => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect(component.resource()?.name).toBe('nas-02');
  }));

  it('should display event type in page', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${EVENTS_BASE}5`).flush(EVENT);
    http.match((r) => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('disk_failure');
  }));

  it('should display event message', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${EVENTS_BASE}5`).flush(EVENT);
    http.match((r) => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Primary disk failed');
  }));

  it('should render severity badge', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${EVENTS_BASE}5`).flush(EVENT);
    http.match((r) => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();
    const badges = (fixture.nativeElement as HTMLElement).querySelectorAll('ss-severity-badge');
    expect(badges.length).toBeGreaterThan(0);
  }));

  it('should still load if resource fetch fails', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${EVENTS_BASE}5`).flush(EVENT);
    http.match((r) => r.url.startsWith(RESOURCES_BASE))[0]?.error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();
    expect(component.loading()).toBeFalse();
    expect(component.event()).not.toBeNull();
    expect(component.resource()).toBeNull();
  }));

  // ── severityAccentClass ───────────────────────────────────

  it('should return correct accent class for critical', () => {
    expect(component.severityAccentClass('critical')).toBe('severity-accent--critical');
  });

  it('should return correct accent class for error', () => {
    expect(component.severityAccentClass('error')).toBe('severity-accent--error');
  });

  it('should return correct accent class for warning', () => {
    expect(component.severityAccentClass('warning')).toBe('severity-accent--warning');
  });

  it('should return info accent class for info and unknown', () => {
    expect(component.severityAccentClass('info')).toBe('severity-accent--info');
    expect(component.severityAccentClass('unknown')).toBe('severity-accent--info');
  });

  // ── error handling ────────────────────────────────────────

  it('should set "Event not found." on 404', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${EVENTS_BASE}5`).flush(
      { error: 'Event not found' }, { status: 404, statusText: 'Not Found' },
    );
    tick(); fixture.detectChanges();
    expect(component.error()).toBe('Event not found.');
  }));

  it('should set generic error on network failure', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${EVENTS_BASE}5`).error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();
    expect(component.error()).toBe('Failed to load event.');
  }));

  it('should show error banner on failure', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${EVENTS_BASE}5`).error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-error-banner')).toBeTruthy();
  }));
});

// ── Invalid ID ────────────────────────────────────────────────────────────────

describe('EventDetailComponent — invalid ID', () => {
  let fixture: ComponentFixture<EventDetailComponent>;
  let component: EventDetailComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await setupWithParam('not-a-number');
    http     = TestBed.inject(HttpTestingController);
    fixture  = TestBed.createComponent(EventDetailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  it('should set error without calling API for non-numeric id', () => {
    fixture.detectChanges();
    expect(component.error()).toBe('Invalid event ID.');
    http.expectNone(`${API}/api/events/NaN`);
  });
});
