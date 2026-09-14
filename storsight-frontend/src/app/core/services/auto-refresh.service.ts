import { Injectable } from '@angular/core';
import { EMPTY, Observable, Subscription, timer } from 'rxjs';
import { catchError, switchMap, takeUntil, tap } from 'rxjs/operators';

export interface PollingOptions<T> {
  request: () => Observable<T>;
  intervalMs: number;
  destroy$: Observable<void>;
  initialDelayMs?: number;
  onSuccess?: (value: T) => void;
  onError?: (error: unknown) => void;
}

@Injectable({ providedIn: 'root' })
export class AutoRefreshService {
  startPolling<T>({
    request,
    intervalMs,
    destroy$,
    initialDelayMs = intervalMs,
    onSuccess,
    onError,
  }: PollingOptions<T>): Subscription {
    return timer(initialDelayMs, intervalMs).pipe(
      switchMap(() =>
        request().pipe(
          tap(value => onSuccess?.(value)),
          catchError((error) => {
            onError?.(error);
            return EMPTY;
          }),
        ),
      ),
      takeUntil(destroy$),
    ).subscribe();
  }
}
