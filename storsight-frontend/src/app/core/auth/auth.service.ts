import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { Router } from '@angular/router';

import { environment } from '../../../environments/environment';
import { User, LoginResponse } from '../models';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly router = inject(Router);

  private readonly api = environment.apiBaseUrl;

  /** Emits the currently authenticated user, or null if unauthenticated. */
  private readonly currentUserSubject = new BehaviorSubject<User | null>(null);
  readonly currentUser$ = this.currentUserSubject.asObservable();

  /** True while the initial /api/auth/me check is in progress. */
  private readonly loadingSubject = new BehaviorSubject<boolean>(true);
  readonly loading$ = this.loadingSubject.asObservable();

  get currentUser(): User | null {
    return this.currentUserSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.currentUserSubject.value !== null;
  }

  /**
   * Called once on application bootstrap to rehydrate session from
   * an existing Flask session cookie.
   *
   * Error handling:
   *   401 → not logged in (expected, silent)
   *   network / 0 → server unreachable; keeps loading=false so the app
   *                  can still render (guard will redirect to login)
   *   5xx → server error; treats as unauthenticated but logs a warning
   */
  rehydrate(): Observable<User | null> {
    return this.http
      .get<User>(`${this.api}/api/auth/me`, { withCredentials: true })
      .pipe(
        tap((user) => {
          this.currentUserSubject.next(user);
          this.loadingSubject.next(false);
        }),
        catchError((err: unknown) => {
          if (err instanceof HttpErrorResponse) {
            if (err.status !== 401) {
              // Non-401: network failure, 500, etc. — warn but don't crash.
              console.warn(
                `[AuthService] rehydrate: unexpected status ${err.status}`,
                err.message,
              );
            }
            // In all HTTP error cases: treat as unauthenticated.
          } else {
            console.warn('[AuthService] rehydrate: unknown error', err);
          }
          this.currentUserSubject.next(null);
          this.loadingSubject.next(false);
          return of(null);
        }),
      );
  }

  login(username: string, password: string): Observable<LoginResponse> {
    return this.http
      .post<LoginResponse>(
        `${this.api}/api/auth/login`,
        { username, password },
        { withCredentials: true },
      )
      .pipe(
        tap((response) => {
          this.currentUserSubject.next(response.user);
        }),
      );
  }

  forgotPassword(email: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.api}/api/auth/forgot-password`,
      { email },
    );
  }

  resetPassword(token: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(
      `${this.api}/api/auth/reset-password`,
      { token, password },
    );
  }

  logout(): Observable<void> {
    return this.http
      .post<{ message: string }>(
        `${this.api}/api/auth/logout`,
        {},
        { withCredentials: true },
      )
      .pipe(
        tap(() => {
          this.currentUserSubject.next(null);
          this.router.navigate(['/login']);
        }),
        map(() => void 0),
        catchError(() => {
          // Even if the server call fails, clear local state.
          this.currentUserSubject.next(null);
          this.router.navigate(['/login']);
          return of(void 0);
        }),
      );
  }

  /** Clear session state locally (used by interceptor on 401). */
  clearSession(): void {
    this.currentUserSubject.next(null);
  }
}