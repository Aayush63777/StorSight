import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ChangeDetectionStrategy } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { RecommendationsSectionComponent } from './recommendations-section.component';
import { Recommendation } from '../../../../core/models';
import { routes } from '../../../../app.routes';

const API = 'http://localhost:5000';
const REC_BASE = `${API}/api/incidents/10/recommendations`;

const REC: Recommendation = {
  id: 1, incident_id: 10, title: 'Replace disk', description: 'Replace primary disk.',
  priority: 'high', reason: 'Root cause confirmed.', created_at: '2026-01-03T00:00:00',
};

describe('RecommendationsSectionComponent', () => {
  let fixture: ComponentFixture<RecommendationsSectionComponent>;
  let component: RecommendationsSectionComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RecommendationsSectionComponent],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    })
    .overrideComponent(RecommendationsSectionComponent, { set: { changeDetection: ChangeDetectionStrategy.Default } })
    .compileComponents();

    http      = TestBed.inject(HttpTestingController);
    fixture   = TestBed.createComponent(RecommendationsSectionComponent);
    component = fixture.componentInstance;
    component.incidentId = 10;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should show loading spinner when loading=true', () => {
    component.loading = true;
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-loading-spinner')).toBeTruthy();
  });

  it('should show error banner on error', () => {
    component.loading = false;
    component.error   = 'Failed to load recommendations.';
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-error-banner')).toBeTruthy();
  });

  it('should emit retry event', () => {
    component.loading = false;
    component.error   = 'Error';
    fixture.detectChanges();
    const spy = spyOn(component.retry, 'emit');
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')?.click();
    expect(spy).toHaveBeenCalled();
  });

  it('should show empty state when no items', () => {
    component.loading = false;
    component.items   = [];
    component.ngOnChanges();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-empty-state')).toBeTruthy();
  });

  it('should display existing recommendations', () => {
    component.loading = false;
    component.items   = [REC];
    component.ngOnChanges();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('Replace disk');
    expect(text).toContain('Replace primary disk.');
  });

  it('should open create form', () => {
    component.loading = false;
    component.items   = [];
    component.ngOnChanges();
    fixture.detectChanges();

    const btn = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find(b => b.textContent?.includes('Add Recommendation'));
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

  it('should validate required title', () => {
    component.createForm.patchValue({ title: '' });
    component.createForm.get('title')!.markAsTouched();
    expect(component.fieldError('title')).toContain('required');
  });

  it('should validate required description', () => {
    component.createForm.patchValue({ description: '' });
    component.createForm.get('description')!.markAsTouched();
    expect(component.fieldError('description')).toContain('required');
  });

  it('should have all backend priority values in select', () => {
    expect(component.priorities).toContain('low');
    expect(component.priorities).toContain('medium');
    expect(component.priorities).toContain('high');
    expect(component.priorities).toContain('critical');
  });

  it('should POST then GET on valid submission', fakeAsync(() => {
    component.loading = false;
    component.items   = [];
    component.ngOnChanges();
    component.showForm.set(true);
    fixture.detectChanges();

    component.createForm.patchValue({
      title: 'Replace disk', description: 'Replace primary disk.', priority: 'high', reason: '',
    });
    component.onCreateSubmit();
    fixture.detectChanges();

    const postReq = http.expectOne(r => r.url === REC_BASE && r.method === 'POST');
    expect(postReq.request.body.title).toBe('Replace disk');
    postReq.flush(REC);
    tick();

    // Targeted GET refresh
    const getReq = http.expectOne(r => r.url === REC_BASE && r.method === 'GET');
    getReq.flush([REC]);
    tick(); fixture.detectChanges();

    expect(component.displayItems().length).toBe(1);
    expect(component.showForm()).toBeFalse();
  }));

  it('optional reason should be omitted when blank', fakeAsync(() => {
    component.loading = false;
    component.items   = [];
    component.ngOnChanges();
    component.showForm.set(true);
    fixture.detectChanges();

    component.createForm.patchValue({
      title: 'T', description: 'D', priority: 'low', reason: '   ',
    });
    component.onCreateSubmit();
    fixture.detectChanges();

    const req = http.match(r => r.url === REC_BASE && r.method === 'POST')[0];
    expect(req?.request.body.reason).toBeUndefined();
    req?.flush(REC);
    tick();
    http.match(() => true);
  }));

  it('should show formError on POST failure', fakeAsync(() => {
    component.loading = false;
    component.items   = [];
    component.ngOnChanges();
    component.showForm.set(true);
    fixture.detectChanges();

    component.createForm.patchValue({ title: 'T', description: 'D', priority: 'low', reason: '' });
    component.onCreateSubmit();

    http.match(r => r.url === REC_BASE && r.method === 'POST')[0]?.error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();

    expect(component.formError()).not.toBeNull();
    expect(component.saving()).toBeFalse();
  }));

  it('should NOT perform initial GET (parent owns initial load)', () => {
    component.loading = false;
    component.items   = [REC];
    component.ngOnChanges();
    fixture.detectChanges();
    http.expectNone(r => r.url.includes('/recommendations') && r.method === 'GET');
  });
});
