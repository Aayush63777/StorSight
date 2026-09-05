import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { AuthService } from './auth.service';
import { User, LoginResponse } from '../models';
import { routes } from '../../app.routes';

const API         = 'http://localhost:5000';
const ME_URL      = `${API}/api/auth/me`;
const LOGIN_URL   = `${API}/api/auth/login`;
const LOGOUT_URL  = `${API}/api/auth/logout`;

const MOCK_USER: User = {
  id: 1, username: 'engineer01', email: 'eng@example.com', role: 'ENGINEER',
};

const LOGIN_RESPONSE: LoginResponse = {
  message: 'Login successful.', user: MOCK_USER,
};

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
      ],
    });

    service = TestBed.inject(AuthService);
    http    = TestBed.inject(HttpTestingController);
    router  = TestBed.inject(Router);
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  // ── rehydrate() ───────────────────────────────────────────

  it('should call GET /api/auth/me on rehydrate', fakeAsync(() => {
    service.rehydrate().subscribe();
    const req = http.expectOne(ME_URL);
    expect(req.request.method).toBe('GET');
    req.flush(MOCK_USER);
    tick();
  }));

  it('should set currentUser on successful rehydrate', fakeAsync(() => {
    service.rehydrate().subscribe();
    http.expectOne(ME_URL).flush(MOCK_USER);
    tick();
    expect(service.currentUser).toEqual(MOCK_USER);
  }));

  it('should set isAuthenticated=true on successful rehydrate', fakeAsync(() => {
    service.rehydrate().subscribe();
    http.expectOne(ME_URL).flush(MOCK_USER);
    tick();
    expect(service.isAuthenticated).toBeTrue();
  }));

  it('should set loading$=false after successful rehydrate', fakeAsync(() => {
    let loading: boolean | undefined;
    service.rehydrate().subscribe();
    http.expectOne(ME_URL).flush(MOCK_USER);
    tick();
    service.loading$.subscribe(v => (loading = v));
    expect(loading).toBeFalse();
  }));

  it('should set currentUser=null on 401 (silent, expected)', fakeAsync(() => {
    service.rehydrate().subscribe();
    http.expectOne(ME_URL).flush(
      { error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' },
    );
    tick();
    expect(service.currentUser).toBeNull();
  }));

  it('should set isAuthenticated=false on 401', fakeAsync(() => {
    service.rehydrate().subscribe();
    http.expectOne(ME_URL).flush(
      { error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' },
    );
    tick();
    expect(service.isAuthenticated).toBeFalse();
  }));

  it('should set loading$=false after 401', fakeAsync(() => {
    let loading: boolean | undefined;
    service.rehydrate().subscribe();
    http.expectOne(ME_URL).flush(
      { error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' },
    );
    tick();
    service.loading$.subscribe(v => (loading = v));
    expect(loading).toBeFalse();
  }));

  it('should set currentUser=null on network error', fakeAsync(() => {
    service.rehydrate().subscribe();
    http.expectOne(ME_URL).error(new ErrorEvent('network'));
    tick();
    expect(service.currentUser).toBeNull();
  }));

  it('should set loading$=false after network error', fakeAsync(() => {
    let loading: boolean | undefined;
    service.rehydrate().subscribe();
    http.expectOne(ME_URL).error(new ErrorEvent('network'));
    tick();
    service.loading$.subscribe(v => (loading = v));
    expect(loading).toBeFalse();
  }));

  it('rehydrate should complete without throwing on 401', fakeAsync(() => {
    let completed = false;
    service.rehydrate().subscribe({ complete: () => (completed = true) });
    http.expectOne(ME_URL).flush(
      { error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' },
    );
    tick();
    expect(completed).toBeTrue();
  }));

  // ── login() ───────────────────────────────────────────────

  it('should POST to /api/auth/login with credentials', fakeAsync(() => {
    service.login('engineer01', 'secret').subscribe();
    const req = http.expectOne(LOGIN_URL);
    expect(req.request.method).toBe('POST');
    expect(req.request.body.username).toBe('engineer01');
    expect(req.request.body.password).toBe('secret');
    req.flush(LOGIN_RESPONSE);
    tick();
  }));

  it('should update currentUser on successful login', fakeAsync(() => {
    service.login('engineer01', 'secret').subscribe();
    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
    tick();
    expect(service.currentUser).toEqual(MOCK_USER);
  }));

  it('should set isAuthenticated=true after successful login', fakeAsync(() => {
    service.login('engineer01', 'secret').subscribe();
    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
    tick();
    expect(service.isAuthenticated).toBeTrue();
  }));

  it('should propagate HTTP error to caller on failed login', fakeAsync(() => {
    let caught = false;
    service.login('engineer01', 'wrong').subscribe({
      error: () => (caught = true),
    });
    http.expectOne(LOGIN_URL).flush(
      { error: 'Invalid credentials.' },
      { status: 401, statusText: 'Unauthorized' },
    );
    tick();
    expect(caught).toBeTrue();
  }));

  it('should NOT update currentUser on failed login', fakeAsync(() => {
    service.login('engineer01', 'wrong').subscribe({ error: () => {} });
    http.expectOne(LOGIN_URL).flush(
      { error: 'Invalid credentials.' },
      { status: 401, statusText: 'Unauthorized' },
    );
    tick();
    expect(service.currentUser).toBeNull();
  }));

  // ── logout() ──────────────────────────────────────────────

  it('should POST to /api/auth/logout', fakeAsync(() => {
    // First log in so we have a session to log out from
    service.login('engineer01', 'secret').subscribe();
    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
    tick();

    const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    service.logout().subscribe();
    const req = http.expectOne(LOGOUT_URL);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Logged out.' });
    tick();
    navigateSpy.calls.reset();
  }));

  it('should set currentUser=null after successful logout', fakeAsync(() => {
    service.login('engineer01', 'secret').subscribe();
    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
    tick();
    expect(service.currentUser).toEqual(MOCK_USER);

    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    service.logout().subscribe();
    http.expectOne(LOGOUT_URL).flush({ message: 'Logged out.' });
    tick();

    expect(service.currentUser).toBeNull();
  }));

  it('should navigate to /login after successful logout', fakeAsync(() => {
    service.login('engineer01', 'secret').subscribe();
    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
    tick();

    const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    service.logout().subscribe();
    http.expectOne(LOGOUT_URL).flush({ message: 'Logged out.' });
    tick();

    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  }));

  it('should set currentUser=null even when logout POST fails', fakeAsync(() => {
    service.login('engineer01', 'secret').subscribe();
    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
    tick();

    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    service.logout().subscribe();
    http.expectOne(LOGOUT_URL).error(new ErrorEvent('network'));
    tick();

    expect(service.currentUser).toBeNull();
  }));

  it('should navigate to /login even when logout POST fails', fakeAsync(() => {
    service.login('engineer01', 'secret').subscribe();
    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
    tick();

    const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));
    service.logout().subscribe();
    http.expectOne(LOGOUT_URL).error(new ErrorEvent('network'));
    tick();

    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  }));

  // ── clearSession() ────────────────────────────────────────

  it('clearSession should set currentUser=null', fakeAsync(() => {
    service.login('engineer01', 'secret').subscribe();
    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
    tick();
    expect(service.currentUser).toEqual(MOCK_USER);

    service.clearSession();
    expect(service.currentUser).toBeNull();
  }));

  it('isAuthenticated should be false after clearSession', fakeAsync(() => {
    service.login('engineer01', 'secret').subscribe();
    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
    tick();

    service.clearSession();
    expect(service.isAuthenticated).toBeFalse();
  }));

  it('clearSession does not affect loading$', fakeAsync(() => {
    service.rehydrate().subscribe();
    http.expectOne(ME_URL).flush(MOCK_USER);
    tick();

    service.clearSession();
    let loading: boolean | undefined;
    service.loading$.subscribe(v => (loading = v));
    expect(loading).toBeFalse();
  }));

  // ── currentUser$ observable ───────────────────────────────

  it('currentUser$ should emit null initially', () => {
    let emitted: User | null | undefined;
    service.currentUser$.subscribe(v => (emitted = v));
    expect(emitted).toBeNull();
  });

  it('currentUser$ should emit user after successful login', fakeAsync(() => {
    const emitted: (User | null)[] = [];
    service.currentUser$.subscribe(v => emitted.push(v));

    service.login('engineer01', 'secret').subscribe();
    http.expectOne(LOGIN_URL).flush(LOGIN_RESPONSE);
    tick();

    expect(emitted).toContain(MOCK_USER);
  }));
});
