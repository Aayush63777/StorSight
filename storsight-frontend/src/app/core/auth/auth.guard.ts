import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, skipWhile, take } from 'rxjs/operators';

import { AuthService } from './auth.service';

/**
 * Protects routes from unauthenticated access.
 *
 * Waits for the initial /api/auth/me rehydration to complete before
 * making a decision, preventing a race condition on hard refresh.
 */
export const authGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.loading$.pipe(
    // Wait until the initial session check has finished.
    skipWhile((loading) => loading),
    take(1),
    map(() => {
      if (authService.isAuthenticated) {
        return true;
      }
      return router.createUrlTree(['/login']);
    }),
  );
};
