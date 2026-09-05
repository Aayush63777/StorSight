import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { StorageResourceFormComponent } from './storage-resource-form.component';
import { routes } from '../../../app.routes';

const API  = 'http://localhost:5000';
const BASE = `${API}/api/storage-resources/`;

const EXISTING = {
  id: 7, name: 'san-07', resource_type: 'SAN',
  status: 'healthy' as const, health_status: 'healthy' as const,
  capacity_total: 1000, capacity_used: 400,
  created_at: '2026-01-01T00:00:00', updated_at: '2026-01-02T00:00:00',
};

/** Helper to build the test module with a specific route param. */
async function setup(paramId: string | null) {
  await TestBed.configureTestingModule({
    imports: [StorageResourceFormComponent],
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
  .overrideComponent(StorageResourceFormComponent, {
    set: { changeDetection: ChangeDetectionStrategy.Default },
  })
  .compileComponents();
}

// ── CREATE mode ───────────────────────────────────────────────────────────────

describe('StorageResourceFormComponent — create mode', () => {
  let fixture: ComponentFixture<StorageResourceFormComponent>;
  let component: StorageResourceFormComponent;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await setup(null); // no :id → create mode
    http      = TestBed.inject(HttpTestingController);
    router    = TestBed.inject(Router);
    fixture   = TestBed.createComponent(StorageResourceFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  it('should create in create mode', () => {
    expect(component.isEditMode()).toBeFalse();
    expect(component).toBeTruthy();
  });

  it('should show "Add Storage Resource" title in create mode', () => {
    expect(component.title).toBe('Add Storage Resource');
  });

  // ── Required validation ───────────────────────────────────

  it('should be invalid when name is empty', () => {
    component.form.patchValue({ name: '' });
    component.form.markAllAsTouched();
    fixture.detectChanges();
    expect(component.form.get('name')!.valid).toBeFalse();
  });

  it('should be invalid when resource_type is empty', () => {
    component.form.patchValue({ resource_type: '' });
    component.form.markAllAsTouched();
    fixture.detectChanges();
    expect(component.form.get('resource_type')!.valid).toBeFalse();
  });

  it('should show field error for blank name after touch', () => {
    component.form.get('name')!.markAsTouched();
    expect(component.fieldError('name')).toContain('required');
  });

  // ── Capacity cross-field validation ───────────────────────

  it('should flag capacityError when used > total', () => {
    component.form.patchValue({ capacity_total: 100, capacity_used: 150 });
    component.form.get('capacity_total')!.markAsTouched();
    component.form.get('capacity_used')!.markAsTouched();
    expect(component.capacityError).toBeTruthy();
  });

  it('should NOT flag capacityError when used <= total', () => {
    component.form.patchValue({ capacity_total: 100, capacity_used: 100 });
    expect(component.capacityError).toBeNull();
  });

  it('should reject negative capacity_total', () => {
    component.form.patchValue({ capacity_total: -1 });
    expect(component.form.get('capacity_total')!.valid).toBeFalse();
  });

  // ── Form valid state ──────────────────────────────────────

  it('should be valid with required fields filled', () => {
    component.form.patchValue({ name: 'test-node', resource_type: 'SAN' });
    expect(component.form.valid).toBeTrue();
  });

  // ── Submit disabled states ────────────────────────────────

  it('should not submit when form is invalid', () => {
    component.form.patchValue({ name: '', resource_type: '' });
    component.onSubmit();
    http.expectNone(BASE);
  });

  // ── Successful creation ───────────────────────────────────

  it('should POST to /api/storage-resources/ on valid submit', fakeAsync(() => {
    component.form.patchValue({
      name: 'new-node', resource_type: 'NAS',
      status: 'healthy', health_status: 'healthy',
    });
    component.onSubmit();
    fixture.detectChanges();

    const req = http.expectOne(BASE);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.name).toBe('new-node');
    expect(req.request.body.resource_type).toBe('NAS');

    req.flush({ ...EXISTING, id: 99, name: 'new-node' });
    tick(); fixture.detectChanges();
  }));

  it('should navigate to detail page after successful creation', fakeAsync(() => {
    component.form.patchValue({ name: 'n', resource_type: 'SAN' });
    const spy = spyOn(component['router'], 'navigate');
    component.onSubmit();

    http.expectOne(BASE).flush({ ...EXISTING, id: 55, name: 'n' });
    tick(); fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(['/storage-resources', 55]);
  }));

  it('should set saving signal while request is in-flight', fakeAsync(() => {
    component.form.patchValue({ name: 'x', resource_type: 'SAN' });
    component.onSubmit();
    expect(component.saving()).toBeTrue();
    http.expectOne(BASE).flush({ ...EXISTING, id: 1 });
    tick(); fixture.detectChanges();
    expect(component.saving()).toBeFalse();
  }));

  it('should prevent double submission', fakeAsync(() => {
    component.form.patchValue({ name: 'y', resource_type: 'SAN' });
    component.onSubmit();
    component.onSubmit(); // second call should be ignored
    const reqs = http.match(BASE);
    expect(reqs.length).toBe(1);
    reqs[0].flush({ ...EXISTING, id: 2 });
    tick();
  }));

  // ── API validation error ──────────────────────────────────

  it('should display API 400 error message', fakeAsync(() => {
    component.form.patchValue({ name: 'duplicate', resource_type: 'SAN' });
    component.onSubmit();

    http.expectOne(BASE).flush(
      { error: 'Storage resource already exists.' },
      { status: 400, statusText: 'Bad Request' },
    );
    tick(); fixture.detectChanges();

    expect(component.apiError()).toBe('Storage resource already exists.');
    expect(component.saving()).toBeFalse();
  }));

  it('should display network error message on status 0', fakeAsync(() => {
    component.form.patchValue({ name: 'z', resource_type: 'SAN' });
    component.onSubmit();
    http.expectOne(BASE).error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();
    expect(component.apiError()).toBe('Cannot connect to server.');
  }));

  // ── Cancel ────────────────────────────────────────────────

  it('should navigate to list on cancel in create mode', () => {
    const spy = spyOn(component['router'], 'navigate');
    component.onCancel();
    expect(spy).toHaveBeenCalledWith(['/storage-resources']);
  });
});

// ── EDIT mode ─────────────────────────────────────────────────────────────────

describe('StorageResourceFormComponent — edit mode', () => {
  let fixture: ComponentFixture<StorageResourceFormComponent>;
  let component: StorageResourceFormComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await setup('7'); // :id=7 → edit mode
    http      = TestBed.inject(HttpTestingController);
    fixture   = TestBed.createComponent(StorageResourceFormComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  it('should be in edit mode when route has :id', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}7`).flush(EXISTING);
    tick(); fixture.detectChanges();
    expect(component.isEditMode()).toBeTrue();
  }));

  it('should show "Edit Storage Resource" title', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}7`).flush(EXISTING);
    tick(); fixture.detectChanges();
    expect(component.title).toBe('Edit Storage Resource');
  }));

  it('should load existing resource GET /api/storage-resources/:id', fakeAsync(() => {
    fixture.detectChanges();
    const req = http.expectOne(`${BASE}7`);
    expect(req.request.method).toBe('GET');
    req.flush(EXISTING);
    tick(); fixture.detectChanges();
  }));

  it('should populate form fields with existing resource data', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}7`).flush(EXISTING);
    tick(); fixture.detectChanges();
    expect(component.form.value.name).toBe('san-07');
    expect(component.form.value.resource_type).toBe('SAN');
    expect(component.form.value.capacity_total).toBe(1000);
    expect(component.form.value.capacity_used).toBe(400);
  }));

  it('should PATCH /api/storage-resources/:id on valid submit', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}7`).flush(EXISTING);
    tick(); fixture.detectChanges();

    component.form.patchValue({ name: 'san-07-updated' });
    component.onSubmit();
    fixture.detectChanges();

    const req = http.expectOne(`${BASE}7`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body.name).toBe('san-07-updated');
    req.flush({ ...EXISTING, name: 'san-07-updated' });
    tick(); fixture.detectChanges();
  }));

  it('should navigate to detail after successful update', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}7`).flush(EXISTING);
    tick(); fixture.detectChanges();

    const spy = spyOn(component['router'], 'navigate');
    component.onSubmit();
    http.expectOne(`${BASE}7`).flush(EXISTING);
    tick(); fixture.detectChanges();

    expect(spy).toHaveBeenCalledWith(['/storage-resources', EXISTING.id]);
  }));

  it('should set error message on 404 during load', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}7`).flush(
      { error: 'Storage resource not found' },
      { status: 404, statusText: 'Not Found' },
    );
    tick(); fixture.detectChanges();
    expect(component.apiError()).toBe('Storage resource not found.');
  }));

  it('should cancel to detail page in edit mode', fakeAsync(() => {
    fixture.detectChanges();
    http.expectOne(`${BASE}7`).flush(EXISTING);
    tick(); fixture.detectChanges();

    const spy = spyOn(component['router'], 'navigate');
    component.onCancel();
    expect(spy).toHaveBeenCalledWith(['/storage-resources', 7]);
  }));
});
