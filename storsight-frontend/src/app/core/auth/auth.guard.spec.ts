import { TestBed, fakeAsync, tick } from '@angular/core/testing';
import { Router, UrlTree } from '@angular/router';
import { provideRouter } from '@angular/router';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting, HttpTestingController } from '@angular/common/http/testing';
import { Observable, BehaviorSubject } from 'rxjs';
import { take } from 'rxjs/operators';

import { authGuard } from './auth.guard';
import { AuthService } from './auth.service';
import { routes } from '../../app.routes';

describe('authGuard', () => {
  let router: Router;
  let authService: AuthService;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        provideRouter(routes),
        provideHttpClient(),
        provideHttpClientTesting(),
        AuthService,
      ],
    });

    router      = TestBed.inject(Router);
    authService = TestBed.inject(AuthService);
    http        = TestBed.inject(HttpTestingController);
  });

  afterEach(() => { http.match(() => true); http.verify(); });

  /**
   * Run the guard in the Angular DI context and return its result.
   * We use runInInjectionContext so the guard's inject() calls resolve.
   */
  function runGuard(): Promise<boolean | UrlTree> {
    return TestBed.runInInjectionContext(() => {
      const result = authGuard({} as never, {} as never) as Observable<boolean | UrlTree>;
      return result.pipe(take(1)).toPromise() as Promise<boolean | UrlTree>;
    });
  }

  // ── Authenticated + loading complete ─────────────────────

  it('allows navigation when user is authenticated and loading is complete', fakeAsync(async () => {
    // Simulate a completed rehydrate that found a session
    (authService as any).loadingSubject.next(false);
    (authService as any).currentUserSubject.next({
      id: 1, username: 'engineer01', email: 'eng@example.com', role: 'ENGINEER',
    });

    const result = await runGuard();
    tick();

    expect(result).toBeTrue();
  }));

  // ── Not authenticated + loading complete ──────────────────

  it('redirects to /login when not authenticated and loading is complete', fakeAsync(async () => {
    (authService as any).loadingSubject.next(false);
    (authService as any).currentUserSubject.next(null);

    const result = await runGuard();
    tick();

    expect(result instanceof UrlTree).toBeTrue();
    expect(router.serializeUrl(result as UrlTree)).toBe('/login');
  }));

  // ── Still loading ─────────────────────────────────────────

  it('does not emit while loading$ is still true', fakeAsync(() => {
    // loading$ starts as true — keep it that way
    (authService as any).loadingSubject.next(true);
    (authService as any).currentUserSubject.next(null);

    let emitted = false;
    TestBed.runInInjectionContext(() => {
      (authGuard({} as never, {} as never) as Observable<boolean | UrlTree>)
        .subscribe(() => (emitted = true));
    });

    tick(100); // advance time — guard should NOT have emitted yet
    expect(emitted).toBeFalse();
  }));

  it('emits once loading$ settles to false', fakeAsync(() => {
    const loadingSubject: BehaviorSubject<boolean> =
      (authService as any).loadingSubject;

    loadingSubject.next(true); // start loading

    let emitted = false;
    TestBed.runInInjectionContext(() => {
      (authGuard({} as never, {} as never) as Observable<boolean | UrlTree>)
        .pipe(take(1))
        .subscribe(() => (emitted = true));
    });

    expect(emitted).toBeFalse();

    // Now settle loading — guard should emit
    loadingSubject.next(false);
    tick();

    expect(emitted).toBeTrue();
  }));
});
