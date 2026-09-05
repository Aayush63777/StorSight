import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { StorageResourceDetailComponent } from './storage-resource-detail.component';
import { StorageResource } from '../../../core/models';
import { routes } from '../../../app.routes';

const API  = 'http://localhost:5000';
const BASE = `${API}/api/storage-resources/`;

const RESOURCE: StorageResource = {
  id: 42, name: 'san-primary', resource_type: 'SAN',
  status: 'healthy', health_status: 'healthy',
  capacity_total: 4000, capacity_used: 2000,
  created_at: '2026-01-01T00:00:00', updated_at: '2026-06-01T00:00:00',
};

const RESOURCE_NO_CAP: StorageResource = {
  ...RESOURCE, id: 43, name: 'no-cap', capacity_total: null, capacity_used: null,
};

function makeFixture(paramId: string) {
  return TestBed.configureTestingModule({
    imports: [StorageResourceDetailComponent],
    providers: [
      provideRouter(routes),
      provideHttpClient(),
      provideHttpClientTesting(),
      {
        provide: ActivatedRoute,
        useValue: { snapshot: { paramMap: { get: () => paramId } } },
      },
    ],
  })
  .overrideComponent(StorageResourceDetailComponent, {
    set: { changeDetection: ChangeDetectionStrategy.Default },
  })
  .compileComponents();
}

describe('StorageResourceDetailComponent', () => {
  let fixture: ComponentFixture<StorageResourceDetailComponent>;
  let component: StorageResourceDetailComponent;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await makeFixture('42');
    http     = TestBed.inject(HttpTestingController);
    router   = TestBed.inject(Router);
    fixture  = TestBed.createComponent(StorageResourceDetailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => {
    http.match(() => true);
    http.verify();
  });

  // ── creation ──────────────────────────────────────────────

  it('should create', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}42`).flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect(component).toBeTruthy();
  }));

  // ── loading ───────────────────────────────────────────────

  it('should show loading spinner initially', () => {
    fixture.detectChanges();
    expect(component.loading()).toBeTrue();
    http.match(() => true); // drain
  });

  it('should hide loading after data arrives', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}42`).flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect(component.loading()).toBeFalse();
  }));

  // ── renders correct data ──────────────────────────────────

  it('should set resource signal on success', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}42`).flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect(component.resource()?.name).toBe('san-primary');
  }));

  it('should display resource name in the page', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}42`).flush(RESOURCE);
    tick(); fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('san-primary');
  }));

  it('should display resource type', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}42`).flush(RESOURCE);
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('SAN');
  }));

  it('should render status badges', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}42`).flush(RESOURCE);
    tick(); fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelectorAll('ss-status-badge').length).toBeGreaterThan(0);
  }));

  // ── capacity helpers ──────────────────────────────────────

  it('should calculate utilPercent correctly', () => {
    expect(component.utilPercent(RESOURCE)).toBe(50); // 2000/4000
  });

  it('should return 0 utilPercent for null capacity', () => {
    expect(component.utilPercent(RESOURCE_NO_CAP)).toBe(0);
  });

  it('should compute available capacity', () => {
    // 4000 - 2000 = 2000 GB; formatCapacity(2000) → 2000 >= 1024 → "2.0 TB"
    expect(component.availableCapacity(RESOURCE)).toBe('2.0 TB');
  });

  it('should return — for available capacity when data is null', () => {
    expect(component.availableCapacity(RESOURCE_NO_CAP)).toBe('—');
  });

  it('should format capacity in TB when >= 1024 GB', () => {
    expect(component.formatCapacity(2048)).toBe('2.0 TB');
  });

  // ── error handling ────────────────────────────────────────

  it('should set error message on 404', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}42`).flush(
      { error: 'Storage resource not found' }, { status: 404, statusText: 'Not Found' },
    );
    tick(); fixture.detectChanges();
    expect(component.error()).toBe('Storage resource not found.');
  }));

  it('should set generic error on non-404 failure', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}42`).error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();
    expect(component.error()).toBe('Failed to load resource.');
  }));

  it('should show error banner on failure', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}42`).error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-error-banner')).toBeTruthy();
  }));

  // ── delete workflow ───────────────────────────────────────

  it('should open confirm dialog when delete button clicked', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}42`).flush(RESOURCE);
    tick(); fixture.detectChanges();

    component.showDeleteDialog.set(true);
    fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('ss-confirm-dialog')).toBeTruthy();
  }));

  it('should NOT call DELETE when dialog is cancelled', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}42`).flush(RESOURCE);
    tick(); fixture.detectChanges();

    component.showDeleteDialog.set(true);
    component.showDeleteDialog.set(false); // cancel
    fixture.detectChanges();

    // No DELETE request should have been made
    http.expectNone(`${BASE}42`);
  }));

  it('should call DELETE /api/storage-resources/:id on confirm', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}42`).flush(RESOURCE);
    tick(); fixture.detectChanges();

    component.onDeleteConfirmed();
    fixture.detectChanges();

    const req = http.expectOne(`${BASE}42`);
    expect(req.request.method).toBe('DELETE');
    req.flush({ message: 'Storage resource deleted' });
    tick(); fixture.detectChanges();
  }));

  it('should navigate to list after successful delete', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}42`).flush(RESOURCE);
    tick(); fixture.detectChanges();

    const spy = spyOn(component['router'], 'navigate');
    component.onDeleteConfirmed();
    http.expectOne(`${BASE}42`).flush({ message: 'Storage resource deleted' });
    tick(); fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(['/storage-resources']);
  }));

  it('should show deleteError on delete failure', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}42`).flush(RESOURCE);
    tick(); fixture.detectChanges();

    component.onDeleteConfirmed();
    http.expectOne(`${BASE}42`).error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();

    expect(component.deleteError()).not.toBeNull();
  }));

  it('should set deleting signal to false after delete error', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}42`).flush(RESOURCE);
    tick(); fixture.detectChanges();

    component.onDeleteConfirmed();
    http.expectOne(`${BASE}42`).error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();

    expect(component.deleting()).toBeFalse();
  }));
});

// ── Invalid ID ────────────────────────────────────────────────────────────────

describe('StorageResourceDetailComponent — invalid ID', () => {
  let fixture: ComponentFixture<StorageResourceDetailComponent>;
  let component: StorageResourceDetailComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await makeFixture('not-a-number');
    http     = TestBed.inject(HttpTestingController);
    fixture  = TestBed.createComponent(StorageResourceDetailComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  it('should set error without calling API for non-numeric id', () => {
    fixture.detectChanges();
    expect(component.error()).toBe('Invalid resource ID.');
    http.expectNone(`${API}/api/storage-resources/NaN`);
  });
});
