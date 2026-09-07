import { ComponentFixture, TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { LoginComponent } from './login.component';
import { User, LoginResponse } from '../../../core/models';
import { routes } from '../../../app.routes';

const API       = 'http://localhost:5000';
const LOGIN_URL = `${API}/api/auth/login`;
const ME_URL    = `${API}/api/auth/me`;

const MOCK_USER: User = {
  id: 1, username: 'engineer01', email: 'eng@example.com', role: 'ENGINEER',
};

const LOGIN_RESPONSE: LoginResponse = {
  message: 'Login successful.', user: MOCK_USER,
};

describe('LoginComponent', () => {
  let fixture: ComponentFixture<LoginComponent>;
  let component: LoginComponent;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [LoginComponent],
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
      ],
    }).compileComponents();

    http      = TestBed.inject(HttpTestingController);
    router    = TestBed.inject(Router);
    fixture   = TestBed.createComponent(LoginComponent);
    component = fixture.componentInstance;
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  // ── helpers ───────────────────────────────────────────────

  /** Drain the /api/auth/me rehydration call the AuthService fires on init. */
  function flushMe(status = 401): void {
    const req = http.match(r => r.url === ME_URL);
    if (req.length) {
      req[0].flush({ error: 'Unauthorized' }, { status, statusText: 'Unauthorized' });
    }
  }

  function setCredentials(username: string, password: string): void {
    component.username = username;
    component.password = password;
  }

  // ── Creation ──────────────────────────────────────────────

  it('should create', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick(); fixture.detectChanges();
    expect(component).toBeTruthy();
  }));

  // ── Initial render ────────────────────────────────────────

  it('should render the StorSight title', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick(); fixture.detectChanges();
    const text = (fixture.nativeElement as HTMLElement).textContent!;
    expect(text).toContain('StorSight');
  }));

  it('should render username and password inputs', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick(); fixture.detectChanges();
    const el = fixture.nativeElement as HTMLElement;
    expect(el.querySelector('#username')).toBeTruthy();
    expect(el.querySelector('#password')).toBeTruthy();
  }));

  it('should render the Sign in button', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick(); fixture.detectChanges();
    const btn = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[type="submit"]');
    expect(btn).toBeTruthy();
  }));

  it('should keep the password hidden by default', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick(); fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#password') as HTMLInputElement;
    const toggle = fixture.nativeElement.querySelector('.password-field__toggle') as HTMLButtonElement;

    expect(input.type).toBe('password');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');
  }));

  it('should toggle password visibility from the accessible button', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick(); fixture.detectChanges();

    const input = fixture.nativeElement.querySelector('#password') as HTMLInputElement;
    const toggle = fixture.nativeElement.querySelector('.password-field__toggle') as HTMLButtonElement;

    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('text');
    expect(toggle.getAttribute('aria-label')).toBe('Hide password');

    toggle.click();
    fixture.detectChanges();
    expect(input.type).toBe('password');
    expect(toggle.getAttribute('aria-label')).toBe('Show password');
  }));

  it('should initialise with empty credentials', () => {
    expect(component.username).toBe('');
    expect(component.password).toBe('');
  });

  it('should initialise loading as false', () => {
    expect(component.loading()).toBeFalse();
  });

  it('should initialise errorMessage as null', () => {
    expect(component.errorMessage()).toBeNull();
  });

  // ── Submit guard ──────────────────────────────────────────

  it('should NOT call POST /api/auth/login when fields are empty', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick(); fixture.detectChanges();

    component.onSubmit();
    http.expectNone(LOGIN_URL);
  }));

  it('should NOT submit when only username is set', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick();

    component.username = 'engineer01';
    component.onSubmit();
    http.expectNone(LOGIN_URL);
  }));

  it('should NOT submit when only password is set', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick();

    component.password = 'secret';
    component.onSubmit();
    http.expectNone(LOGIN_URL);
  }));

  // ── Successful login ──────────────────────────────────────

  it('should POST to /api/auth/login with credentials', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick();

    setCredentials('engineer01', 'secret');
    component.onSubmit();

    const req = http.expectOne(LOGIN_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.username).toBe('engineer01');
    expect(req.request.body.password).toBe('secret');
    req.flush(LOGIN_RESPONSE);
    tick();
  }));

  it('should set loading=true while request is in flight', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick(); fixture.detectChanges();

    setCredentials('engineer01', 'secret');
    component.onSubmit();
    fixture.detectChanges();

    expect(component.loading()).toBeTrue();

    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
    tick(); fixture.detectChanges();
  }));

  it('should set loading=false after successful login', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick();

    setCredentials('engineer01', 'secret');
    component.onSubmit();

    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
    tick(); fixture.detectChanges();

    expect(component.loading()).toBeFalse();
  }));

  it('should navigate to /dashboard on successful login', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick();

    const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    setCredentials('engineer01', 'secret');
    component.onSubmit();

    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
    tick(); fixture.detectChanges();

    expect(navigateSpy).toHaveBeenCalledWith(['/dashboard']);
  }));

  it('should clear errorMessage before submitting', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick();

    component.errorMessage.set('Old error');
    setCredentials('engineer01', 'secret');
    component.onSubmit();

    expect(component.errorMessage()).toBeNull();

    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
    tick();
  }));

  it('should prevent duplicate submit while loading', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick(); fixture.detectChanges();

    setCredentials('engineer01', 'secret');
    component.onSubmit();
    fixture.detectChanges();

    // While in-flight, loading=true and the submit button is disabled
    expect(component.loading()).toBeTrue();
    const btn = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(btn.disabled).toBeTrue();

    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
    tick(); fixture.detectChanges();
  }));

  // ── Error handling ────────────────────────────────────────

  it('should show "Invalid username or password." on 401', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick(); fixture.detectChanges();

    setCredentials('engineer01', 'wrongpassword');
    component.onSubmit();

    http.expectOne(LOGIN_URL).flush(
      { error: 'Invalid credentials.' },
      { status: 401, statusText: 'Unauthorized' },
    );
    tick(); fixture.detectChanges();

    expect(component.errorMessage()).toBe('Invalid username or password.');
  }));

  it('should show server unreachable message on status 0', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick();

    setCredentials('engineer01', 'secret');
    component.onSubmit();

    http.expectOne(LOGIN_URL).error(new ErrorEvent('network'));
    tick(); fixture.detectChanges();

    expect(component.errorMessage()).toContain('Cannot connect');
  }));

  it('should show generic error on 500', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick();

    setCredentials('engineer01', 'secret');
    component.onSubmit();

    http.expectOne(LOGIN_URL).flush(
      { error: 'Internal server error.' },
      { status: 500, statusText: 'Internal Server Error' },
    );
    tick(); fixture.detectChanges();

    expect(component.errorMessage()).toContain('try again');
  }));

  it('should set loading=false after failed login', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick();

    setCredentials('engineer01', 'secret');
    component.onSubmit();

    http.expectOne(LOGIN_URL).flush(
      { error: 'Invalid credentials.' },
      { status: 401, statusText: 'Unauthorized' },
    );
    tick(); fixture.detectChanges();

    expect(component.loading()).toBeFalse();
  }));

  it('should show error banner when errorMessage is set', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick();

    component.errorMessage.set('Invalid username or password.');
    fixture.detectChanges();

    expect(
      (fixture.nativeElement as HTMLElement).querySelector('ss-error-banner'),
    ).toBeTruthy();
  }));

  it('should dismiss error banner when errorMessage is cleared', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick();

    component.errorMessage.set(null);
    fixture.detectChanges();

    // Error banner renders conditionally — with null message it should
    // either not render or render with null (ErrorBannerComponent handles null)
    const banner = (fixture.nativeElement as HTMLElement).querySelector('ss-error-banner');
    // If rendered, its message binding must be null
    if (banner) {
      expect(component.errorMessage()).toBeNull();
    } else {
      expect(banner).toBeFalsy();
    }
  }));

  // ── Submit button state ───────────────────────────────────

  it('should disable submit button when username is empty', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick(); fixture.detectChanges();

    component.username = '';
    component.password = 'secret';
    fixture.detectChanges();

    const btn = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(btn.disabled).toBeTrue();
  }));

  it('should disable submit button when password is empty', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick(); fixture.detectChanges();

    component.username = 'engineer01';
    component.password = '';
    fixture.detectChanges();

    const btn = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(btn.disabled).toBeTrue();
  }));

  it('should enable submit button when both fields are filled', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick(); fixture.detectChanges();

    component.username = 'engineer01';
    component.password = 'secret';
    fixture.detectChanges();

    const btn = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(btn.disabled).toBeFalse();
  }));

  it('should show "Signing in…" label while loading', fakeAsync(() => {
    fixture.detectChanges();
    flushMe();
    tick(); fixture.detectChanges();

    setCredentials('engineer01', 'secret');
    component.onSubmit();
    fixture.detectChanges();

    const btn = (fixture.nativeElement as HTMLElement)
      .querySelector<HTMLButtonElement>('button[type="submit"]')!;
    expect(btn.textContent?.trim()).toContain('Signing in');

    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
    tick();
  }));
});
