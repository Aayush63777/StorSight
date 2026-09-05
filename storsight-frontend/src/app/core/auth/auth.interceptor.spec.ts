import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { provideHttpClient, withInterceptors, HttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';

import { authInterceptor } from './auth.interceptor';
import { AuthService } from './auth.service';
import { routes } from '../../app.routes';

const API           = 'http://localhost:5000';
const PROTECTED_URL = `${API}/api/incidents/`;
const LOGIN_URL     = `${API}/api/auth/login`;
const ME_URL        = `${API}/api/auth/me`;

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpTesting: HttpTestingController;
  let authService: AuthService;
  let router: Router;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        AuthService,
      ],
    });

    http         = TestBed.inject(HttpClient);
    httpTesting  = TestBed.inject(HttpTestingController);
    authService  = TestBed.inject(AuthService);
    router       = TestBed.inject(Router);
  });

  afterEach(() => { httpTesting.match(() => true); httpTesting.verify(); });

  // ── Credential attachment ─────────────────────────────────

  it('should attach withCredentials=true to every request', fakeAsync(() => {
    http.get(PROTECTED_URL).subscribe({ error: () => {} });

    const req = httpTesting.expectOne(PROTECTED_URL);
    expect(req.request.withCredentials).toBeTrue();
    req.flush([]);
    tick();
  }));

  it('should attach withCredentials=true to POST requests', fakeAsync(() => {
    http.post(PROTECTED_URL, {}).subscribe({ error: () => {} });

    const req = httpTesting.expectOne(PROTECTED_URL);
    expect(req.request.withCredentials).toBeTrue();
    req.flush({});
    tick();
  }));

  // ── Pass-through on success ───────────────────────────────

  it('should pass through a successful response unchanged', fakeAsync(() => {
    const payload = [{ id: 1, title: 'test' }];
    let result: unknown;

    http.get(PROTECTED_URL).subscribe(r => (result = r));
    httpTesting.expectOne(PROTECTED_URL).flush(payload);
    tick();

    expect(result).toEqual(payload);
  }));

  // ── 401 on protected endpoint ─────────────────────────────

  it('on 401 from a protected endpoint — should call authService.clearSession()', fakeAsync(() => {
    const clearSpy = spyOn(authService, 'clearSession');
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    http.get(PROTECTED_URL).subscribe({ error: () => {} });
    httpTesting.expectOne(PROTECTED_URL).flush(
      { error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' },
    );
    tick();

    expect(clearSpy).toHaveBeenCalled();
  }));

  it('on 401 from a protected endpoint — should navigate to /login', fakeAsync(() => {
    spyOn(authService, 'clearSession');
    const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    http.get(PROTECTED_URL).subscribe({ error: () => {} });
    httpTesting.expectOne(PROTECTED_URL).flush(
      { error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' },
    );
    tick();

    expect(navigateSpy).toHaveBeenCalledWith(['/login']);
  }));

  it('on 401 from a protected endpoint — should propagate the error to the caller', fakeAsync(() => {
    spyOn(authService, 'clearSession');
    spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    let caughtStatus: number | undefined;
    http.get(PROTECTED_URL).subscribe({
      error: (err) => (caughtStatus = err.status),
    });
    httpTesting.expectOne(PROTECTED_URL).flush(
      { error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' },
    );
    tick();

    expect(caughtStatus).toBe(401);
  }));

  // ── Auth endpoint exceptions ──────────────────────────────

  it('on 401 from /api/auth/login — should NOT call clearSession', fakeAsync(() => {
    const clearSpy = spyOn(authService, 'clearSession');

    http.post(LOGIN_URL, {}).subscribe({ error: () => {} });
    httpTesting.expectOne(LOGIN_URL).flush(
      { error: 'Invalid credentials.' }, { status: 401, statusText: 'Unauthorized' },
    );
    tick();

    expect(clearSpy).not.toHaveBeenCalled();
  }));

  it('on 401 from /api/auth/login — should NOT navigate to /login', fakeAsync(() => {
    const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    http.post(LOGIN_URL, {}).subscribe({ error: () => {} });
    httpTesting.expectOne(LOGIN_URL).flush(
      { error: 'Invalid credentials.' }, { status: 401, statusText: 'Unauthorized' },
    );
    tick();

    expect(navigateSpy).not.toHaveBeenCalled();
  }));

  it('on 401 from /api/auth/me — should NOT call clearSession', fakeAsync(() => {
    const clearSpy = spyOn(authService, 'clearSession');

    http.get(ME_URL).subscribe({ error: () => {} });
    httpTesting.expectOne(ME_URL).flush(
      { error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' },
    );
    tick();

    expect(clearSpy).not.toHaveBeenCalled();
  }));

  it('on 401 from /api/auth/me — should NOT navigate to /login', fakeAsync(() => {
    const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    http.get(ME_URL).subscribe({ error: () => {} });
    httpTesting.expectOne(ME_URL).flush(
      { error: 'Unauthorized' }, { status: 401, statusText: 'Unauthorized' },
    );
    tick();

    expect(navigateSpy).not.toHaveBeenCalled();
  }));

  // ── Non-401 errors ────────────────────────────────────────

  it('on 500 — should NOT call clearSession', fakeAsync(() => {
    const clearSpy = spyOn(authService, 'clearSession');

    http.get(PROTECTED_URL).subscribe({ error: () => {} });
    httpTesting.expectOne(PROTECTED_URL).flush(
      { error: 'Internal server error.' }, { status: 500, statusText: 'Internal Server Error' },
    );
    tick();

    expect(clearSpy).not.toHaveBeenCalled();
  }));

  it('on 500 — should NOT navigate to /login', fakeAsync(() => {
    const navigateSpy = spyOn(router, 'navigate').and.returnValue(Promise.resolve(true));

    http.get(PROTECTED_URL).subscribe({ error: () => {} });
    httpTesting.expectOne(PROTECTED_URL).flush(
      { error: 'Internal server error.' }, { status: 500, statusText: 'Internal Server Error' },
    );
    tick();

    expect(navigateSpy).not.toHaveBeenCalled();
  }));

  it('on 500 — should propagate the error to the caller', fakeAsync(() => {
    let caughtStatus: number | undefined;
    http.get(PROTECTED_URL).subscribe({
      error: (err) => (caughtStatus = err.status),
    });
    httpTesting.expectOne(PROTECTED_URL).flush(
      { error: 'Internal server error.' }, { status: 500, statusText: 'Internal Server Error' },
    );
    tick();

    expect(caughtStatus).toBe(500);
  }));

  it('on 404 — should NOT call clearSession', fakeAsync(() => {
    const clearSpy = spyOn(authService, 'clearSession');

    http.get(PROTECTED_URL).subscribe({ error: () => {} });
    httpTesting.expectOne(PROTECTED_URL).flush(
      { error: 'Not found.' }, { status: 404, statusText: 'Not Found' },
    );
    tick();

    expect(clearSpy).not.toHaveBeenCalled();
  }));

  // ── Network error ─────────────────────────────────────────

  it('on network error — should NOT call clearSession (status 0 is not 401)', fakeAsync(() => {
    const clearSpy = spyOn(authService, 'clearSession');

    http.get(PROTECTED_URL).subscribe({ error: () => {} });
    httpTesting.expectOne(PROTECTED_URL).error(new ErrorEvent('network'));
    tick();

    expect(clearSpy).not.toHaveBeenCalled();
  }));

  it('on network error — should propagate the error to the caller', fakeAsync(() => {
    let caught = false;
    http.get(PROTECTED_URL).subscribe({ error: () => (caught = true) });
    httpTesting.expectOne(PROTECTED_URL).error(new ErrorEvent('network'));
    tick();

    expect(caught).toBeTrue();
  }));
});
