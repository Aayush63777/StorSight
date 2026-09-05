import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy } from '@angular/core';

import { StorageResourceListComponent } from './storage-resource-list.component';
import { routes } from '../../../app.routes';

import { StorageResource } from '../../../core/models';

const API = 'http://localhost:5000';
const BASE = `${API}/api/storage-resources/`;

const R1: StorageResource = {
  id: 1, name: 'san-01', resource_type: 'SAN',
  status: 'healthy', health_status: 'healthy',
  capacity_total: 2000, capacity_used: 800,
  created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00',
};
const R2: StorageResource = {
  id: 2, name: 'nas-01', resource_type: 'NAS',
  status: 'warning', health_status: 'warning',
  capacity_total: 1000, capacity_used: 950,
  created_at: '2026-01-01T00:00:00', updated_at: '2026-01-03T00:00:00',
};
const R3: StorageResource = {
  id: 3, name: 'offline-node', resource_type: 'SAN',
  status: 'offline', health_status: 'unknown',
  capacity_total: null, capacity_used: null,
  created_at: '2026-01-01T00:00:00', updated_at: '2026-01-01T00:00:00',
};

describe('StorageResourceListComponent', () => {
  let fixture: ComponentFixture<StorageResourceListComponent>;
  let component: StorageResourceListComponent;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StorageResourceListComponent],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    .overrideComponent(StorageResourceListComponent, {
      set: { changeDetection: ChangeDetectionStrategy.Default },
    })
    .compileComponents();

    http    = TestBed.inject(HttpTestingController);
    router  = TestBed.inject(Router);
    fixture = TestBed.createComponent(StorageResourceListComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    http.match(() => true); // drain any pending
    http.verify();
  });

  // ── helpers ──────────────────────────────────────────────

  function flushList(data = [R1, R2]): void {
    const reqs = http.match((r) => r.url.startsWith(BASE));
    reqs.forEach(req => req.flush(data));
  }

  // ── creation & initial load ───────────────────────────────

  it('should create', fakeAsync(() => {
    fixture.detectChanges();
    flushList();
    tick();
    fixture.detectChanges();
    expect(component).toBeTruthy();
  }));

  it('should call GET /api/storage-resources/ on init', fakeAsync(() => {
    fixture.detectChanges();
    const req = http.expectOne((r) => r.url.startsWith(BASE));
    expect(req.request.method).toBe('GET');
    req.flush([R1]);
    tick(); fixture.detectChanges();
  }));

  it('should show loading spinner before data arrives', () => {
    fixture.detectChanges();
    expect(component.loading()).toBeTrue();
    flushList();
  });

  it('should hide spinner after data loads', fakeAsync(() => {
    fixture.detectChanges();
    flushList();
    tick(); fixture.detectChanges();
    expect(component.loading()).toBeFalse();
  }));

  // ── renders resources ─────────────────────────────────────

  it('should populate resources signal', fakeAsync(() => {
    fixture.detectChanges();
    flushList([R1, R2, R3]);
    tick(); fixture.detectChanges();
    expect(component.resources().length).toBe(3);
  }));

  it('should render resource names in the table', fakeAsync(() => {
    fixture.detectChanges();
    flushList([R1, R2]);
    tick(); fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('san-01');
    expect(text).toContain('nas-01');
  }));

  it('should display resource type', fakeAsync(() => {
    fixture.detectChanges();
    flushList([R1]);
    tick(); fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('SAN');
  }));

  it('should render status badges', fakeAsync(() => {
    fixture.detectChanges();
    flushList([R1]);
    tick(); fixture.detectChanges();
    const badges = (fixture.nativeElement as HTMLElement).querySelectorAll('ss-status-badge');
    expect(badges.length).toBeGreaterThan(0);
  }));

  // ── capacity helpers ──────────────────────────────────────

  it('should calculate utilPercent correctly', () => {
    expect(component.utilPercent(R1)).toBe(40); // 800/2000
    expect(component.utilPercent(R2)).toBe(95); // 950/1000
  });

  it('should clamp utilPercent at 100', () => {
    const over: StorageResource = { ...R1, capacity_used: 3000 };
    expect(component.utilPercent(over)).toBe(100);
  });

  it('should return 0 utilPercent when capacity_total is null', () => {
    expect(component.utilPercent(R3)).toBe(0);
  });

  it('should format capacity in TB when >= 1024 GB', () => {
    expect(component.formatCapacity(2048)).toBe('2.0 TB');
  });

  it('should format capacity in GB below 1024', () => {
    expect(component.formatCapacity(800)).toBe('800 GB');
  });

  it('should return — for null capacity', () => {
    expect(component.formatCapacity(null)).toBe('—');
  });

  it('should assign warning util class at 75% utilisation', () => {
    const r: StorageResource = { ...R1, capacity_total: 100, capacity_used: 75 };
    expect(component.utilClass(r)).toBe('util-bar__fill--warning');
  });

  it('should assign critical util class at 90%+', () => {
    const r: StorageResource = { ...R1, capacity_total: 100, capacity_used: 90 };
    expect(component.utilClass(r)).toBe('util-bar__fill--critical');
  });

  it('should assign ok util class below 75%', () => {
    const r: StorageResource = { ...R1, capacity_total: 100, capacity_used: 50 };
    expect(component.utilClass(r)).toBe('util-bar__fill--ok');
  });

  // ── empty state ───────────────────────────────────────────

  it('should show empty state when list is empty', fakeAsync(() => {
    fixture.detectChanges();
    flushList([]);
    tick(); fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('ss-empty-state')).toBeTruthy();
  }));

  // ── error handling ────────────────────────────────────────

  it('should show error banner on API failure', fakeAsync(() => {
    fixture.detectChanges();
    http.match((r) => r.url.startsWith(BASE))[0]
      ?.error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();
    expect(component.error()).not.toBeNull();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('ss-error-banner')).toBeTruthy();
  }));

  it('should reload on retry after error', fakeAsync(() => {
    fixture.detectChanges();
    http.match((r) => r.url.startsWith(BASE))[0]
      ?.error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();

    component.loadResources();
    fixture.detectChanges();
    flushList([R1]);
    tick(); fixture.detectChanges();
    expect(component.error()).toBeNull();
    expect(component.resources().length).toBe(1);
  }));

  // ── client-side name filter ───────────────────────────────

  it('should filter resources by name client-side', fakeAsync(() => {
    fixture.detectChanges();
    flushList([R1, R2]);
    tick(); fixture.detectChanges();

    component.nameFilter.set('san');
    fixture.detectChanges();
    expect(component.filtered().length).toBe(1);
    expect(component.filtered()[0].name).toBe('san-01');
  }));

  it('should show empty filtered state when name search has no match', fakeAsync(() => {
    fixture.detectChanges();
    flushList([R1, R2]);
    tick(); fixture.detectChanges();

    component.nameFilter.set('zzz-no-match');
    fixture.detectChanges();
    expect(component.filtered().length).toBe(0);
  }));

  // ── API-backed status filter ──────────────────────────────

  it('should call API with ?status= when status filter changes', fakeAsync(() => {
    fixture.detectChanges();
    flushList(); // initial load
    tick(); fixture.detectChanges();

    component.onStatusChange('warning');
    fixture.detectChanges();

    const req = http.expectOne((r) => r.urlWithParams.includes('status=warning'));
    expect(req.request.method).toBe('GET');
    req.flush([R2]);
    tick(); fixture.detectChanges();
    expect(component.resources()[0].name).toBe('nas-01');
  }));

  // ── API-backed resource_type filter ──────────────────────

  it('should call API with ?resource_type= when type filter changes', fakeAsync(() => {
    fixture.detectChanges();
    flushList(); // initial
    tick(); fixture.detectChanges();

    component.onResourceTypeChange('SAN');
    fixture.detectChanges();

    const req = http.expectOne((r) => r.urlWithParams.includes('resource_type=SAN'));
    expect(req.request.method).toBe('GET');
    req.flush([R1, R3]);
    tick(); fixture.detectChanges();
    expect(component.resources().length).toBe(2);
  }));

  // ── clear filters ─────────────────────────────────────────

  it('hasActiveFilters should be true when status is set', fakeAsync(() => {
    fixture.detectChanges();
    flushList();
    tick(); fixture.detectChanges();

    component.onStatusChange('healthy');
    flushList([R1]);
    tick(); fixture.detectChanges();

    expect(component.hasActiveFilters()).toBeTrue();
  }));

  it('clearFilters should reset all filters and reload', fakeAsync(() => {
    fixture.detectChanges();
    flushList(); tick(); fixture.detectChanges();

    component.statusFilter.set('warning');
    component.clearFilters();
    fixture.detectChanges();

    expect(component.statusFilter()).toBe('');
    expect(component.nameFilter()).toBe('');
    flushList(); tick(); fixture.detectChanges();
    expect(component.hasActiveFilters()).toBeFalse();
  }));

  // ── navigation ────────────────────────────────────────────

  it('should navigate to detail page on navigateTo()', fakeAsync(() => {
    fixture.detectChanges();
    flushList([R1]); tick(); fixture.detectChanges();

    const spy = spyOn(component['router'], 'navigate');
    component.navigateTo(1);
    expect(spy).toHaveBeenCalledWith(['/storage-resources', 1]);
  }));
});
