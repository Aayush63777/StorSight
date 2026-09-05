import { HttpInterceptorFn, HttpRequest, HttpHandlerFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AuthService } from './auth.service';
import { environment } from '../../../environments/environment';

/** Endpoints that must NOT trigger a redirect on 401. */
const AUTH_ENDPOINTS = [
  `${environment.apiBaseUrl}/api/auth/login`,
  `${environment.apiBaseUrl}/api/auth/me`,
];

/**
 * Functional HTTP interceptor.
 *
 * Responsibilities:
 *   1. Attach withCredentials to every API request so the Flask
 *      session cookie is sent by the browser.
 *   2. On 401 from a protected endpoint, clear the session and
 *      redirect to /login to avoid stale UI.
 */
export const authInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
) => {
  const router = inject(Router);
  const authService = inject(AuthService);

  // Attach credentials so the browser sends the Flask session cookie.
  const credentialedReq = req.clone({ withCredentials: true });

  return next(credentialedReq).pipe(
    catchError((error: unknown) => {
      if (error instanceof HttpErrorResponse && error.status === 401) {
        const isAuthEndpoint = AUTH_ENDPOINTS.some((ep) =>
          credentialedReq.url.includes(ep),
        );

        if (!isAuthEndpoint) {
          // Session expired or invalidated on a protected call.
          authService.clearSession();
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    }),
  );
};
