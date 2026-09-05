import {
  ApplicationConfig,
  APP_INITIALIZER,
  provideZoneChangeDetection,
} from '@angular/core';
import {
  provideRouter,
  withComponentInputBinding,
  withRouterConfig,
} from '@angular/router';
import {
  provideHttpClient,
  withInterceptors,
  withFetch,
} from '@angular/common/http';

import { routes } from './app.routes';
import { authInterceptor } from './core/auth/auth.interceptor';
import { AuthService } from './core/auth/auth.service';

/**
 * Factory for APP_INITIALIZER.
 * Calls AuthService.rehydrate() before the first route is activated,
 * so the AuthGuard already knows whether a session cookie exists.
 */
function initAuth(authService: AuthService): () => Promise<void> {
  return () =>
    new Promise<void>((resolve) => {
      authService.rehydrate().subscribe({ complete: resolve, error: resolve });
    });
}

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),

    provideRouter(
      routes,
      withComponentInputBinding(),
      withRouterConfig({ onSameUrlNavigation: 'reload' }),
    ),

    provideHttpClient(
      withFetch(),
      withInterceptors([authInterceptor]),
    ),

    {
      provide: APP_INITIALIZER,
      useFactory: initAuth,
      deps: [AuthService],
      multi: true,
    },
  ],
};
