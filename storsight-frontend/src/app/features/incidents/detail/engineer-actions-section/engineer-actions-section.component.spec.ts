import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ChangeDetectionStrategy } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { EngineerActionsSectionComponent, ACTION_TYPES } from './engineer-actions-section.component';
import { EngineerAction, Recommendation } from '../../../../core/models';
import { routes } from '../../../../app.routes';

const API         = 'http://localhost:5000';
const ACTIONS_URL = `${API}/api/incidents/10/actions`;

const ACTION: EngineerAction = {
  id: 1, incident_id: 10, user_id: 2,
  action_type: 'investigation', description: 'Checked disk I/O metrics.',
  recommendation_id: null, created_at: '2026-01-03T00:00:00',
};

const REC: Recommendation = {
  id: 1, incident_id: 10, title: 'Replace disk', description: 'Replace primary disk.',
  priority: 'high', reason: null, created_at: '2026-01-03T00:00:00',
};

describe('EngineerActionsSectionComponent', () => {
  let fixture: ComponentFixture<EngineerActionsSectionComponent>;
  let component: EngineerActionsSectionComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EngineerActionsSectionComponent],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    .overrideComponent(EngineerActionsSectionComponent, {
      set: { changeDetection: ChangeDetectionStrategy.Default },
    })
    .compileComponents();

    http      = TestBed.inject(HttpTestingController);
    fixture   = TestBed.createComponent(EngineerActionsSectionComponent);
    component = fixture.componentInstance;
    component.incidentId = 10;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  // ── Creation ──────────────────────────────────────────────

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  // ── Loading state ─────────────────────────────────────────

  it('should show loading spinner when loading=true', () => {
    component.loading = true;
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-loading-spinner')).toBeTruthy();
  });

  it('should hide spinner when loading=false', () => {
    component.loading = false;
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-loading-spinner')).toBeFalsy();
  });

  // ── Error state ───────────────────────────────────────────

  it('should show error banner when error is set', () => {
    component.loading = false;
    component.error   = 'Failed to load actions.';
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-error-banner')).toBeTruthy();
  });

  it('should emit retry when Retry button clicked', () => {
    component.loading = false;
    component.error   = 'Error';
    fixture.detectChanges();
    const spy = spyOn(component.retry, 'emit');
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')?.click();
    expect(spy).toHaveBeenCalled();
  });

  // ── Empty state ───────────────────────────────────────────

  it('should show empty state when no items', () => {
    component.loading = false;
    component.items   = [];
    component.ngOnChanges();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-empty-state')).toBeTruthy();
  });

  // ── List display ──────────────────────────────────────────

  it('should display existing actions', () => {
    component.loading = false;
    component.items   = [ACTION];
    component.ngOnChanges();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('investigation');
    expect(text).toContain('Checked disk I/O metrics.');
  });

  it('should show user ID in action entry', () => {
    component.loading = false;
    component.items   = [ACTION];
    component.ngOnChanges();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('User 2');
  });

  it('should show rec reference when recommendation_id is set', () => {
    component.loading = false;
    component.items   = [{ ...ACTION, recommendation_id: 1 }];
    component.ngOnChanges();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('Rec #1');
  });

  it('should NOT show rec reference when recommendation_id is null', () => {
    component.loading = false;
    component.items   = [ACTION]; // recommendation_id: null
    component.ngOnChanges();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).not.toContain('Rec #');
  });

  // ── Form toggle ───────────────────────────────────────────

  it('should open create form when Add Action clicked', () => {
    component.loading = false;
    component.items   = [];
    component.ngOnChanges();
    fixture.detectChanges();

    const btn = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find(b => b.textContent?.includes('Add Action'));
    btn?.click();
    fixture.detectChanges();
    expect(component.showForm()).toBeTrue();
  });

  it('should close form on Cancel', () => {
    component.loading = false;
    component.items   = [];
    component.ngOnChanges();
    component.showForm.set(true);
    fixture.detectChanges();

    const cancelBtn = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find(b => b.textContent?.trim() === 'Cancel');
    cancelBtn?.click();
    fixture.detectChanges();
    expect(component.showForm()).toBeFalse();
  });

  // ── Validation ────────────────────────────────────────────

  it('should validate required action_type', () => {
    component.createForm.patchValue({ action_type: '' });
    component.createForm.get('action_type')!.markAsTouched();
    expect(component.fieldError('action_type')).toContain('required');
  });

  it('should validate required description', () => {
    component.createForm.patchValue({ description: '' });
    component.createForm.get('description')!.markAsTouched();
    expect(component.fieldError('description')).toContain('required');
  });

  it('should have all 6 backend-allowed action_type values', () => {
    expect(ACTION_TYPES).toContain('investigation');
    expect(ACTION_TYPES).toContain('diagnosis');
    expect(ACTION_TYPES).toContain('remediation');
    expect(ACTION_TYPES).toContain('escalation');
    expect(ACTION_TYPES).toContain('monitoring');
    expect(ACTION_TYPES).toContain('note');
    expect(ACTION_TYPES.length).toBe(6);
  });

  // ── Recommendation dropdown ───────────────────────────────

  it('should populate recommendation dropdown from @Input', () => {
    component.loading         = false;
    component.items           = [];
    component.recommendations = [REC];
    component.ngOnChanges();
    component.showForm.set(true);
    fixture.detectChanges();

    const options = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll<HTMLOptionElement>('#action-recommendation option'),
    );
    const titles = options.map(o => o.textContent?.trim());
    expect(titles).toContain('Replace disk');
    expect(titles).toContain('None');
  });

  it('should allow null recommendation_id (None default)', () => {
    component.loading         = false;
    component.items           = [];
    component.recommendations = [];
    component.ngOnChanges();
    component.showForm.set(true);
    fixture.detectChanges();

    // recommendation_id control should default to null
    expect(component.createForm.value.recommendation_id).toBeNull();
  });

  // ── POST + targeted refresh ───────────────────────────────

  it('should POST then GET on valid submission', fakeAsync(() => {
    component.loading         = false;
    component.items           = [];
    component.recommendations = [];
    component.ngOnChanges();
    component.showForm.set(true);
    fixture.detectChanges();

    component.createForm.patchValue({
      action_type: 'investigation',
      description: 'Checked disk I/O metrics.',
      recommendation_id: null,
    });
    component.onCreateSubmit();
    fixture.detectChanges();

    const postReq = http.expectOne(r => r.url === ACTIONS_URL && r.method === 'POST');
    expect(postReq.request.body.action_type).toBe('investigation');
    expect(postReq.request.body.description).toBe('Checked disk I/O metrics.');
    postReq.flush(ACTION);
    tick();

    // Targeted GET refresh — actions only
    const getReq = http.expectOne(r => r.url === ACTIONS_URL && r.method === 'GET');
    getReq.flush([ACTION]);
    tick(); fixture.detectChanges();

    expect(component.displayItems().length).toBe(1);
    expect(component.showForm()).toBeFalse();
  }));

  it('should NOT include recommendation_id when null', fakeAsync(() => {
    component.loading = false;
    component.items   = [];
    component.ngOnChanges();
    component.showForm.set(true);
    fixture.detectChanges();

    component.createForm.patchValue({
      action_type: 'note', description: 'Just a note.', recommendation_id: null,
    });
    component.onCreateSubmit();
    fixture.detectChanges();

    const req = http.match(r => r.url === ACTIONS_URL && r.method === 'POST')[0];
    expect(req?.request.body.recommendation_id).toBeUndefined();
    req?.flush(ACTION);
    tick();
    http.match(() => true);
  }));

  it('should show formError on POST failure', fakeAsync(() => {
    component.loading = false;
    component.items   = [];
    component.ngOnChanges();
    component.showForm.set(true);
    fixture.detectChanges();

    component.createForm.patchValue({
      action_type: 'note', description: 'Test.', recommendation_id: null,
    });
    component.onCreateSubmit();

    http.match(r => r.url === ACTIONS_URL && r.method === 'POST')[0]?.error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();

    expect(component.formError()).not.toBeNull();
    expect(component.saving()).toBeFalse();
  }));

  // ── No self-loading GET ───────────────────────────────────

  it('should NOT perform initial GET (parent owns initial load)', () => {
    component.loading = false;
    component.items   = [ACTION];
    component.ngOnChanges();
    fixture.detectChanges();
    http.expectNone(r => r.url.includes('/actions') && r.method === 'GET');
  });
});
