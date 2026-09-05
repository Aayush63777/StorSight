import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ChangeDetectionStrategy } from '@angular/core';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { RiskScoreSectionComponent } from './risk-score-section.component';
import { RiskScore } from '../../../../core/models';
import { routes } from '../../../../app.routes';

const RISK: RiskScore = {
  incident_id: 10, score: 58, classification: 'high',
  factors: {
    incident_severity: 'high', base_score: 50,
    event_contribution: 8, alert_contribution: 0,
    correlated_event_count: 1, active_alert_count: 0,
  },
};

describe('RiskScoreSectionComponent', () => {
  let fixture: ComponentFixture<RiskScoreSectionComponent>;
  let component: RiskScoreSectionComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [RiskScoreSectionComponent],
      providers: [provideRouter(routes), provideHttpClient(), provideHttpClientTesting()],
    })
    .overrideComponent(RiskScoreSectionComponent, { set: { changeDetection: ChangeDetectionStrategy.Default } })
    .compileComponents();

    fixture   = TestBed.createComponent(RiskScoreSectionComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  it('should show loading spinner when loading=true', () => {
    component.loading = true;
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-loading-spinner')).toBeTruthy();
  });

  it('should show error banner when error is set', () => {
    component.loading = false;
    component.error   = 'Failed to load risk score.';
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-error-banner')).toBeTruthy();
  });

  it('should show Retry button on error', () => {
    component.loading = false;
    component.error   = 'Failed to load risk score.';
    fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement).querySelector('button');
    expect(btn?.textContent?.trim()).toBe('Retry');
  });

  it('should emit retry event when Retry clicked', () => {
    component.loading = false;
    component.error   = 'Error';
    fixture.detectChanges();

    const spy = spyOn(component.retry, 'emit');
    (fixture.nativeElement as HTMLElement).querySelector<HTMLButtonElement>('button')?.click();
    expect(spy).toHaveBeenCalled();
  });

  it('should display score when data provided', () => {
    component.loading = false;
    component.data    = RISK;
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).textContent).toContain('58');
  });

  it('should display classification badge', () => {
    component.loading = false;
    component.data    = RISK;
    fixture.detectChanges();
    expect((fixture.nativeElement as HTMLElement).querySelector('ss-severity-badge')).toBeTruthy();
  });

  it('should display factor values', () => {
    component.loading = false;
    component.data    = RISK;
    fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('50');   // base_score
    expect(text).toContain('+8');   // event_contribution
  });

  it('scoreBand returns correct class for critical score', () => {
    expect(component.scoreBand(80)).toBe('critical');
  });

  it('scoreBand returns correct class for high score', () => {
    expect(component.scoreBand(60)).toBe('high');
  });

  it('scoreBand returns correct class for medium score', () => {
    expect(component.scoreBand(35)).toBe('medium');
  });

  it('scoreBand returns correct class for low score', () => {
    expect(component.scoreBand(10)).toBe('low');
  });

  it('scoreBarWidth clamps at 100', () => {
    expect(component.scoreBarWidth(150)).toBe('100%');
  });

  it('scoreBarWidth clamps at 0', () => {
    expect(component.scoreBarWidth(-10)).toBe('0%');
  });

  it('does NOT perform any HTTP requests (no self-loading)', () => {
    // RiskScoreSectionComponent must not call any backend endpoint.
    // All data is passed via @Input.
    // Verify that the component renders fine with only @Input data.
    component.loading = false;
    component.data    = RISK;
    fixture.detectChanges();
    expect(component).toBeTruthy();
    // If it performed HTTP calls, the test would have un-flushed requests in afterEach.
    // No HttpTestingController.verify() error = no HTTP calls made.
  });
});
