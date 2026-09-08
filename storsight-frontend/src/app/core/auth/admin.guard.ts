import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { map, skipWhile, take } from 'rxjs/operators';

import { AuthService } from './auth.service';

export const adminGuard: CanActivateFn = () => {
  const authService = inject(AuthService);
  const router = inject(Router);

  return authService.loading$.pipe(
    skipWhile((loading) => loading),
    take(1),
    map(() => authService.currentUser?.role === 'ADMIN'
      ? true
      : router.createUrlTree(['/unauthorized'])),
  );
};