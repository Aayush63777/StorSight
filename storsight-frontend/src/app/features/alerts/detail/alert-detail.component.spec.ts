import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { AlertDetailComponent } from './alert-detail.component';
import { Alert, StorageResource } from '../../../core/models';
import { routes } from '../../../app.routes';

const API = 'http://localhost:5000';
const ALERTS_BASE    = `${API}/api/alerts/`;
const RESOURCES_BASE = `${API}/api/storage-resources/`;

const ALERT: Alert = { id: 5, resource_id: 2, title: 'Disk capacity critical', severity: 'critical', status: 'active', message: 'Primary volume at 99%.', created_at: '2026-01-02T00:00:00', resolved_at: null };
const RESOURCE: StorageResource = { id: 2, name: 'nas-02', resource_type: 'NAS', status: 'critical', health_status: 'critical', capacity_total: 1000, capacity_used: 990, created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00' };

async function setup(paramId: string) {
  await TestBed.configureTestingModule({
    imports: [AlertDetailComponent],
    providers: [
      provideRouter(routes), provideHttpClient(), provideHttpClientTesting(),
      { provide: ActivatedRoute, useValue: { snapshot: { paramMap: { get: () => paramId } } } },
    ],
  })
  .overrideComponent(AlertDetailComponent, { set: { changeDetection: ChangeDetectionStrategy.Default } })
  .compileComponents();
}

describe('AlertDetailComponent', () => {
  let fixture: ComponentFixture<AlertDetailComponent>;
  let component: AlertDetailComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await setup('5');
    http     = TestBed.inject(HttpTestingController);
    fixture  = TestBed.createComponent(AlertDetailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  // ── Creation ──────────────────────────────────────────────

  it('should create', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ALERTS_BASE}5`).flush(ALERT);
    http.match(r => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect(component).toBeTruthy();
  }));

  // ── Loading ───────────────────────────────────────────────

  it('should show loading initially', () => {
    fixture.detectChanges();
    expect(component.loading()).toBeTrue();
    http.match(() => true);
  });

  it('should hide loading after data arrives', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ALERTS_BASE}5`).flush(ALERT);
    http.match(r => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect(component.loading()).toBeFalse();
  }));

  // ── Renders data ──────────────────────────────────────────

  it('should set alert signal', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ALERTS_BASE}5`).flush(ALERT);
    http.match(r => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect(component.alert()?.title).toBe('Disk capacity critical');
  }));

  it('should display alert title', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ALERTS_BASE}5`).flush(ALERT);
    http.match(r => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Disk capacity critical');
  }));

  it('should display alert message', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ALERTS_BASE}5`).flush(ALERT);
    http.match(r => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Primary volume at 99%');
  }));

  it('should load even if resource fetch fails', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ALERTS_BASE}5`).flush(ALERT);
    http.match(r => r.url.startsWith(RESOURCES_BASE))[0]?.error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();
    expect(component.loading()).toBeFalse();
    expect(component.alert()).not.toBeNull();
    expect(component.resource()).toBeNull();
  }));

  // ── Error handling ─────────────────────────────────────────

  it('should set "Alert not found." on 404', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ALERTS_BASE}5`).flush({ error: 'Alert not found' }, { status: 404, statusText: 'Not Found' });
    tick(); fixture.detectChanges();
    expect(component.error()).toBe('Alert not found.');
  }));

  it('should show error banner on failure', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ALERTS_BASE}5`).error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-error-banner')).toBeTruthy();
  }));

  // ── Resolve workflow ──────────────────────────────────────

  it('should open confirm dialog when resolve button clicked', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ALERTS_BASE}5`).flush(ALERT);
    http.match(r => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();

    component.showConfirm.set(true);
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-confirm-dialog')).toBeTruthy();
  }));

  it('should NOT call PATCH when dialog cancelled', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ALERTS_BASE}5`).flush(ALERT);
    http.match(r => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();

    component.showConfirm.set(true);
    component.showConfirm.set(false); // cancel
    http.expectNone(r => r.method === 'PATCH');
  }));

  it('should call PATCH /api/alerts/:id/resolve on confirm', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ALERTS_BASE}5`).flush(ALERT);
    http.match(r => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();

    component.onResolveConfirmed();
    fixture.detectChanges();

    const req = http.expectOne(r => r.url.includes('/api/alerts/5/resolve') && r.method === 'PATCH');
    req.flush({ ...ALERT, status: 'resolved', resolved_at: '2026-06-01T00:00:00' });
    tick(); fixture.detectChanges();

    expect(component.alert()?.status).toBe('resolved');
    expect(component.resolving()).toBeFalse();
  }));

  it('should prevent duplicate resolve clicks', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ALERTS_BASE}5`).flush(ALERT);
    http.match(r => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();

    component.onResolveConfirmed();
    component.onResolveConfirmed(); // ignored
    const reqs = http.match(r => r.url.includes('/resolve') && r.method === 'PATCH');
    expect(reqs.length).toBe(1);
    reqs[0].flush({ ...ALERT, status: 'resolved', resolved_at: '2026-06-01T00:00:00' });
    tick();
  }));

  it('should set resolveError on resolve failure', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${ALERTS_BASE}5`).flush(ALERT);
    http.match(r => r.url.startsWith(RESOURCES_BASE))[0]?.flush(RESOURCE);
    tick(); fixture.detectChanges();

    component.onResolveConfirmed();
    http.match(r => r.url.includes('/resolve') && r.method === 'PATCH')[0]?.error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();
    expect(component.resolveError()).not.toBeNull();
  }));
});

// ── Invalid ID ────────────────────────────────────────────────────────────────

describe('AlertDetailComponent — invalid ID', () => {
  let fixture: ComponentFixture<AlertDetailComponent>;
  let component: AlertDetailComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await setup('not-a-number');
    http    = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AlertDetailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  it('should set error for non-numeric ID without calling API', () => {
    fixture.detectChanges();
    expect(component.error()).toBe('Invalid alert ID.');
    http.expectNone(`${API}/api/alerts/NaN`);
  });
});
