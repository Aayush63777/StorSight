import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectionStrategy } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuditTrailSectionComponent } from './audit-trail-section.component';
import { AuditLog } from '../../../../core/models';
import { routes } from '../../../../app.routes';

const LOG_ACTION: AuditLog = {
  id: 1, user_id: 2, action: 'engineer_action:investigation',
  entity_type: 'incident', entity_id: 10,
  details: '{"description":"Checked disk I/O metrics."}',
  created_at: '2026-01-03T00:00:00',
};

const LOG_SYSTEM: AuditLog = {
  id: 2, user_id: 1, action: 'incident_resolved',
  entity_type: 'incident', entity_id: 10,
  details: null, created_at: '2026-01-03T01:00:00',
};

describe('AuditTrailSectionComponent', () => {
  let fixture: ComponentFixture<AuditTrailSectionComponent>;
  let component: AuditTrailSectionComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditTrailSectionComponent],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    .overrideComponent(AuditTrailSectionComponent, {
      set: { changeDetection: ChangeDetectionStrategy.Default },
    })
    .compileComponents();

    http      = TestBed.inject(HttpTestingController);
    fixture   = TestBed.createComponent(AuditTrailSectionComponent);
    component = fixture.componentInstance;
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
    component.error   = 'Failed to load audit trail.';
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

  it('should display audit log entries', () => {
    component.loading = false;
    component.items   = [LOG_ACTION];
    component.ngOnChanges();
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('Investigation');
    expect(text).toContain('User 2');
  });

  it('should display multiple entries', () => {
    component.loading = false;
    component.items   = [LOG_ACTION, LOG_SYSTEM];
    component.ngOnChanges();
    fixture.detectChanges();
    const entries = (fixture.nativeElement as HTMLElement).querySelectorAll('.audit-entry');
    expect(entries.length).toBe(2);
  });

  // ── formatAction ─────────────────────────────────────────

  it('should strip engineer_action: prefix', () => {
    expect(component.formatAction('engineer_action:investigation')).toBe('Investigation');
  });

  it('should strip prefix for all action types', () => {
    expect(component.formatAction('engineer_action:diagnosis')).toBe('Diagnosis');
    expect(component.formatAction('engineer_action:remediation')).toBe('Remediation');
    expect(component.formatAction('engineer_action:escalation')).toBe('Escalation');
    expect(component.formatAction('engineer_action:monitoring')).toBe('Monitoring');
    expect(component.formatAction('engineer_action:note')).toBe('Note');
  });

  it('should NOT strip prefix from non-engineer actions', () => {
    expect(component.formatAction('incident_resolved')).toBe('Incident_resolved');
  });

  it('should title-case the cleaned action', () => {
    expect(component.formatAction('engineer_action:investigation').charAt(0)).toBe('I');
  });

  // ── No create form ────────────────────────────────────────

  it('should NOT render a form element', () => {
    component.loading = false;
    component.items   = [LOG_ACTION];
    component.ngOnChanges();
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('form')).toBeFalsy();
  });

  // ── No self-loading GET ───────────────────────────────────

  it('should NOT perform initial GET (parent owns initial load)', () => {
    component.loading = false;
    component.items   = [LOG_ACTION];
    component.ngOnChanges();
    fixture.detectChanges();
    http.expectNone(r => r.url.includes('/audit-logs') && r.method === 'GET');
  });
});
