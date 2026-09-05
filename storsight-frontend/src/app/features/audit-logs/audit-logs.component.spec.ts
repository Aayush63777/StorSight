import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ChangeDetectionStrategy } from '@angular/core';

import { AuditLogsComponent } from './audit-logs.component';
import { AuditLog } from '../../core/models';
import { routes } from '../../app.routes';

const API           = 'http://localhost:5000';
const AUDIT_LOG_URL = `${API}/api/audit-logs/`;

// ── Fixtures ──────────────────────────────────────────────────

function makeLog(overrides: Partial<AuditLog> & Pick<AuditLog, 'id'>): AuditLog {
  const defaults: AuditLog = {
    id: overrides.id,
    user_id: 1,
    action: 'engineer_action:investigation',
    entity_type: 'incident',
    entity_id: 10,
    details: '{"description":"Checked disk I/O"}',
    created_at: '2026-01-03T00:00:00',
  };
  return { ...defaults, ...overrides };
}

const LOG_A = makeLog({ id: 1, action: 'engineer_action:investigation', entity_type: 'incident', entity_id: 10 });
const LOG_B = makeLog({ id: 2, action: 'engineer_action:remediation',   entity_type: 'incident', entity_id: 10 });
const LOG_C = makeLog({ id: 3, action: 'user_login',                    entity_type: 'user',     entity_id: 2, details: null });

/** Build an array of n logs with unique IDs for pagination tests. */
function makeLogs(n: number): AuditLog[] {
  return Array.from({ length: n }, (_, i) =>
    makeLog({ id: i + 1, action: `engineer_action:note`, entity_type: 'incident', entity_id: i + 1 }),
  );
}

// ── Suite ─────────────────────────────────────────────────────

describe('AuditLogsComponent', () => {
  let fixture: ComponentFixture<AuditLogsComponent>;
  let component: AuditLogsComponent;
  let http: HttpTestingController;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [AuditLogsComponent],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    })
    .overrideComponent(AuditLogsComponent, {
      set: { changeDetection: ChangeDetectionStrategy.Default },
    })
    .compileComponents();

    http      = TestBed.inject(HttpTestingController);
    fixture   = TestBed.createComponent(AuditLogsComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  // ── helpers ───────────────────────────────────────────────

  function flush(data: AuditLog[] = [LOG_A, LOG_B, LOG_C]): void {
    http.expectOne(AUDIT_LOG_URL).flush(data);
  }

  function flushError(): void {
    http.expectOne(AUDIT_LOG_URL).error(new ErrorEvent('network'));
  }

  // ── Creation + init ───────────────────────────────────────

  it('should create', fakeAsync(() => {
    fixture.detectChanges();
    flush();
    tick(); fixture.detectChanges();
    expect(component).toBeTruthy();
  }));

  it('should call GET /api/audit-logs/ on init', fakeAsync(() => {
    fixture.detectChanges();
    const req = http.expectOne(AUDIT_LOG_URL);
    expect(req.request.method).toBe('GET');
    req.flush([]);
    tick();
  }));

  it('should show loading spinner on init before response', () => {
    fixture.detectChanges();
    expect(component.loading()).toBeTrue();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('ss-loading-spinner'),
    ).toBeTruthy();
    http.match(() => true);
  });

  it('should hide loading after data arrives', fakeAsync(() => {
    fixture.detectChanges();
    flush();
    tick(); fixture.detectChanges();
    expect(component.loading()).toBeFalse();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('ss-loading-spinner'),
    ).toBeFalsy();
  }));

  // ── Display ───────────────────────────────────────────────

  it('should display audit log entries', fakeAsync(() => {
    fixture.detectChanges();
    flush();
    tick(); fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('Investigation');   // formatAction applied
    expect(text).toContain('Remediation');
  }));

  it('should set allLogs signal', fakeAsync(() => {
    fixture.detectChanges();
    flush([LOG_A, LOG_B]);
    tick(); fixture.detectChanges();
    expect(component.allLogs().length).toBe(2);
  }));

  // ── Empty state ───────────────────────────────────────────

  it('should show empty state when list is empty', fakeAsync(() => {
    fixture.detectChanges();
    flush([]);
    tick(); fixture.detectChanges();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('ss-empty-state'),
    ).toBeTruthy();
  }));

  // ── Error state ───────────────────────────────────────────

  it('should show error banner on fetch failure', fakeAsync(() => {
    fixture.detectChanges();
    flushError();
    tick(); fixture.detectChanges();
    expect(component.error()).not.toBeNull();
    expect(
      (fixture.nativeElement as HTMLElement).querySelector('ss-error-banner'),
    ).toBeTruthy();
  }));

  it('should show Retry button on error', fakeAsync(() => {
    fixture.detectChanges();
    flushError();
    tick(); fixture.detectChanges();
    const retryBtn = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find(b => b.textContent?.includes('Retry'));
    expect(retryBtn).toBeTruthy();
  }));

  it('Retry button re-fetches data', fakeAsync(() => {
    fixture.detectChanges();
    flushError();
    tick(); fixture.detectChanges();

    const retryBtn = Array.from(
      (fixture.nativeElement as HTMLElement).querySelectorAll('button'),
    ).find(b => b.textContent?.includes('Retry'));
    retryBtn?.click();
    fixture.detectChanges();

    const req = http.expectOne(AUDIT_LOG_URL);
    expect(req.request.method).toBe('GET');
    req.flush([LOG_A]);
    tick(); fixture.detectChanges();

    expect(component.error()).toBeNull();
    expect(component.allLogs().length).toBe(1);
  }));

  // ── formatAction ──────────────────────────────────────────

  it('formatAction strips engineer_action: prefix', () => {
    expect(component.formatAction('engineer_action:investigation'))
      .not.toContain('engineer_action:');
  });

  it('formatAction replaces underscores with spaces', () => {
    expect(component.formatAction('engineer_action:root_cause'))
      .toContain('Root Cause');
  });

  it('formatAction title-cases the result', () => {
    const result = component.formatAction('engineer_action:investigation');
    expect(result.charAt(0)).toBe(result.charAt(0).toUpperCase());
    expect(result).toBe('Investigation');
  });

  it('formatAction handles non-engineer actions', () => {
    expect(component.formatAction('user_login')).toBe('User Login');
  });

  // ── entity_type filter ────────────────────────────────────

  it('entity_type filter shows only matching entries', fakeAsync(() => {
    fixture.detectChanges();
    flush([LOG_A, LOG_B, LOG_C]); // incident x2, user x1
    tick(); fixture.detectChanges();

    component.onEntityTypeChange('user');
    fixture.detectChanges();

    expect(component.filtered().length).toBe(1);
    expect(component.filtered()[0].entity_type).toBe('user');
  }));

  it('entity_type filter "All" shows all entries', fakeAsync(() => {
    fixture.detectChanges();
    flush([LOG_A, LOG_B, LOG_C]);
    tick(); fixture.detectChanges();

    component.onEntityTypeChange('user');
    component.onEntityTypeChange('');
    fixture.detectChanges();

    expect(component.filtered().length).toBe(3);
  }));

  it('entityTypes computed has distinct values from loaded data', fakeAsync(() => {
    fixture.detectChanges();
    flush([LOG_A, LOG_B, LOG_C]); // incident, incident, user
    tick(); fixture.detectChanges();

    expect(component.entityTypes()).toContain('incident');
    expect(component.entityTypes()).toContain('user');
    // distinct — no duplicates
    expect(component.entityTypes().length).toBe(2);
  }));

  // ── action keyword filter ─────────────────────────────────

  it('action keyword filter is case-insensitive', fakeAsync(() => {
    fixture.detectChanges();
    flush([LOG_A, LOG_B, LOG_C]);
    tick(); fixture.detectChanges();

    component.onActionKeywordChange('INVESTIGATION');
    fixture.detectChanges();

    expect(component.filtered().length).toBe(1);
    expect(component.filtered()[0].action).toContain('investigation');
  }));

  it('action keyword filter matches substring of raw action', fakeAsync(() => {
    fixture.detectChanges();
    flush([LOG_A, LOG_B, LOG_C]);
    tick(); fixture.detectChanges();

    component.onActionKeywordChange('engineer_action');
    fixture.detectChanges();

    // LOG_A and LOG_B have engineer_action prefix; LOG_C does not
    expect(component.filtered().length).toBe(2);
  }));

  it('action keyword filter reset shows all entries', fakeAsync(() => {
    fixture.detectChanges();
    flush([LOG_A, LOG_B, LOG_C]);
    tick(); fixture.detectChanges();

    component.onActionKeywordChange('investigation');
    component.onActionKeywordChange('');
    fixture.detectChanges();

    expect(component.filtered().length).toBe(3);
  }));

  // ── Combined AND filters ──────────────────────────────────

  it('both filters combine with AND logic', fakeAsync(() => {
    const logD = makeLog({ id: 4, action: 'user_login', entity_type: 'incident', entity_id: 5 });
    fixture.detectChanges();
    flush([LOG_A, LOG_B, LOG_C, logD]);
    tick(); fixture.detectChanges();

    // entity_type = incident AND keyword = 'remediation'
    component.onEntityTypeChange('incident');
    component.onActionKeywordChange('remediation');
    fixture.detectChanges();

    expect(component.filtered().length).toBe(1);
    expect(component.filtered()[0].action).toContain('remediation');
  }));

  // ── Filter resets page ────────────────────────────────────

  it('entity_type filter change resets to page 1', fakeAsync(() => {
    fixture.detectChanges();
    flush(makeLogs(25));
    tick(); fixture.detectChanges();

    component.nextPage(); // go to page 2
    fixture.detectChanges();
    expect(component.currentPage()).toBe(2);

    component.onEntityTypeChange('incident');
    fixture.detectChanges();
    expect(component.currentPage()).toBe(1);
  }));

  it('action keyword filter change resets to page 1', fakeAsync(() => {
    fixture.detectChanges();
    flush(makeLogs(25));
    tick(); fixture.detectChanges();

    component.nextPage();
    fixture.detectChanges();
    expect(component.currentPage()).toBe(2);

    component.onActionKeywordChange('note');
    fixture.detectChanges();
    expect(component.currentPage()).toBe(1);
  }));

  // ── Pagination ────────────────────────────────────────────

  it('pagination — first page shows max 20 entries', fakeAsync(() => {
    fixture.detectChanges();
    flush(makeLogs(25));
    tick(); fixture.detectChanges();

    expect(component.paginated().length).toBe(20);
  }));

  it('pagination — Next button advances to page 2', fakeAsync(() => {
    fixture.detectChanges();
    flush(makeLogs(25));
    tick(); fixture.detectChanges();

    expect(component.currentPage()).toBe(1);
    component.nextPage();
    fixture.detectChanges();
    expect(component.currentPage()).toBe(2);
  }));

  it('pagination — page 2 shows remaining entries', fakeAsync(() => {
    fixture.detectChanges();
    flush(makeLogs(25));
    tick(); fixture.detectChanges();

    component.nextPage();
    fixture.detectChanges();
    expect(component.paginated().length).toBe(5);
  }));

  it('pagination — Previous button goes back to page 1', fakeAsync(() => {
    fixture.detectChanges();
    flush(makeLogs(25));
    tick(); fixture.detectChanges();

    component.nextPage();
    fixture.detectChanges();
    component.prevPage();
    fixture.detectChanges();
    expect(component.currentPage()).toBe(1);
  }));

  it('pagination — Previous disabled on first page', fakeAsync(() => {
    fixture.detectChanges();
    flush(makeLogs(25));
    tick(); fixture.detectChanges();

    component.prevPage(); // should not go below 1
    fixture.detectChanges();
    expect(component.currentPage()).toBe(1);
  }));

  it('pagination — Next disabled on last page', fakeAsync(() => {
    fixture.detectChanges();
    flush(makeLogs(25));
    tick(); fixture.detectChanges();

    component.nextPage(); // page 2 (last)
    component.nextPage(); // should not advance beyond last
    fixture.detectChanges();
    expect(component.currentPage()).toBe(2);
    expect(component.currentPage()).toBe(component.totalPages());
  }));

  it('pagination — totalPages is 1 for 20 or fewer entries', fakeAsync(() => {
    fixture.detectChanges();
    flush(makeLogs(20));
    tick(); fixture.detectChanges();

    expect(component.totalPages()).toBe(1);
  }));

  it('pagination — totalPages is 2 for 21 entries', fakeAsync(() => {
    fixture.detectChanges();
    flush(makeLogs(21));
    tick(); fixture.detectChanges();

    expect(component.totalPages()).toBe(2);
  }));

  // ── Section count badge ───────────────────────────────────

  it('section count badge reflects filtered total', fakeAsync(() => {
    fixture.detectChanges();
    flush([LOG_A, LOG_B, LOG_C]);
    tick(); fixture.detectChanges();

    component.onEntityTypeChange('user');
    fixture.detectChanges();

    // filtered() has 1 entry — badge must show 1
    expect(component.filtered().length).toBe(1);
    const badge = (fixture.nativeElement as HTMLElement).querySelector('.section-count');
    expect(badge?.textContent?.trim()).toBe('1');
  }));

  it('section count badge shows total when no filter active', fakeAsync(() => {
    fixture.detectChanges();
    flush([LOG_A, LOG_B, LOG_C]);
    tick(); fixture.detectChanges();

    const badge = (fixture.nativeElement as HTMLElement).querySelector('.section-count');
    expect(badge?.textContent?.trim()).toBe('3');
  }));

  // ── truncateDetails ───────────────────────────────────────

  it('truncateDetails returns dash for null', () => {
    expect(component.truncateDetails(null)).toBe('—');
  });

  it('truncateDetails returns full string when under 80 chars', () => {
    const short = 'short details';
    expect(component.truncateDetails(short)).toBe(short);
  });

  it('truncateDetails truncates and appends ellipsis at 80 chars', () => {
    const long = 'a'.repeat(100);
    const result = component.truncateDetails(long);
    expect(result.length).toBe(81); // 80 chars + '…'
    expect(result.endsWith('…')).toBeTrue();
  });
});
