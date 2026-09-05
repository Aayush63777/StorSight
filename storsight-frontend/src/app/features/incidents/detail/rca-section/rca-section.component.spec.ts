import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { ChangeDetectionStrategy } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { RcaSectionComponent } from './rca-section.component';
import { RootCauseAnalysis } from '../../../../core/models';
import { routes } from '../../../../app.routes';

const API = 'http://localhost:5000';
const RCA_BASE = `${API}/api/incidents/10/rca`;

const RCA_ITEM: RootCauseAnalysis = {
  id: 1, incident_id: 10, root_cause_category: 'disk_degradation',
  confidence_score: 0.9, explanation: 'Disk I/O degraded on controller A.',
  rule_name: 'disk_rule', created_at: '2026-01-03T00:00:00',
};

describe('RcaSectionComponent', () => {
  let fixture: ComponentFixture<RcaSectionComponent>;
  let component: RcaSectionComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RcaSectionComponent],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    })
    .overrideComponent(RcaSectionComponent, { set: { changeDetection: ChangeDetectionStrategy.Default } })
    .compileComponents();

    http      = TestBed.inject(HttpTestingController);
    fixture   = TestBed.createComponent(RcaSectionComponent);
    component = fixture.componentInstance;
    component.incidentId = 10;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should show loading state', () => {
    component.loading = true;
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-loading-spinner')).toBeTruthy();
  });

  it('should show error banner on error', () => {
    component.loading = false;
    component.error   = 'Failed to load RCA.';
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

  it('should display existing RCA items', () => {
    component.loading = false;
    component.items   = [RCA_ITEM];
    component.ngOnChanges();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('disk_degradation');
    expect(text).toContain('Disk I/O degraded');
  });

  it('should open create form on Add RCA click', () => {
    component.loading = false;
    component.items   = [];
    component.ngOnChanges();
    fixture.detectChanges();

    const btn = Array.from((fixture.nativeElement as HTMLElement).querySelectorAll('button'))
      .find(b => b.textContent?.includes('Add RCA'));
    btn?.click();
    fixture.detectChanges();
    expect(component.showForm()).toBeTrue();
  });

  it('should close form on Cancel click', () => {
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

  it('should validate required fields', () => {
    component.loading = false;
    component.items   = [];
    component.ngOnChanges();
    component.showForm.set(true);
    fixture.detectChanges();

    component.createForm.patchValue({ root_cause_category: '', explanation: '', rule_name: '' });
    component.onCreateSubmit();
    expect(component.fieldError('root_cause_category')).toContain('required');
    expect(component.fieldError('explanation')).toContain('required');
  });

  it('should reject confidence_score < 0', () => {
    component.createForm.patchValue({ confidence_score: -0.1 });
    component.createForm.get('confidence_score')!.markAsTouched();
    expect(component.createForm.get('confidence_score')!.valid).toBeFalse();
    expect(component.fieldError('confidence_score')).toContain('≥ 0');
  });

  it('should reject confidence_score > 1', () => {
    component.createForm.patchValue({ confidence_score: 1.1 });
    component.createForm.get('confidence_score')!.markAsTouched();
    expect(component.createForm.get('confidence_score')!.valid).toBeFalse();
    expect(component.fieldError('confidence_score')).toContain('≤ 1');
  });

  it('should accept confidence_score of 0.5', () => {
    component.createForm.patchValue({ confidence_score: 0.5 });
    expect(component.createForm.get('confidence_score')!.valid).toBeTrue();
  });

  it('should call POST then GET on valid submission', fakeAsync(() => {
    component.loading = false;
    component.items   = [];
    component.ngOnChanges();
    component.showForm.set(true);
    fixture.detectChanges();

    component.createForm.patchValue({
      root_cause_category: 'capacity',
      explanation: 'Disk full.',
      rule_name: 'cap_rule',
      confidence_score: 0.8,
    });
    component.onCreateSubmit();
    fixture.detectChanges();

    const postReq = http.expectOne(r => r.url === RCA_BASE && r.method === 'POST');
    expect(postReq.request.body.root_cause_category).toBe('capacity');
    postReq.flush(RCA_ITEM);
    tick();

    // Targeted GET refresh
    const getReq = http.expectOne(r => r.url === `${RCA_BASE}` && r.method === 'GET');
    getReq.flush([RCA_ITEM]);
    tick(); fixture.detectChanges();

    expect(component.displayItems().length).toBe(1);
    expect(component.showForm()).toBeFalse();
  }));

  it('should show formError on POST failure', fakeAsync(() => {
    component.loading = false;
    component.items   = [];
    component.ngOnChanges();
    component.showForm.set(true);
    fixture.detectChanges();

    component.createForm.patchValue({
      root_cause_category: 'x', explanation: 'y', rule_name: 'z', confidence_score: 0.5,
    });
    component.onCreateSubmit();

    http.match(r => r.url === RCA_BASE && r.method === 'POST')[0]?.error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();

    expect(component.formError()).not.toBeNull();
    expect(component.saving()).toBeFalse();
  }));

  it('should NOT perform initial GET (parent owns initial load)', () => {
    // Component renders from @Input only.
    // No GET should be fired on init.
    component.loading = false;
    component.items   = [RCA_ITEM];
    component.ngOnChanges();
    fixture.detectChanges();
    http.expectNone(r => r.url.includes('/rca') && r.method === 'GET');
  });

  it('confidencePercent converts correctly', () => {
    expect(component.confidencePercent(0.9)).toBe('90%');
    expect(component.confidencePercent(0.5)).toBe('50%');
  });
});
