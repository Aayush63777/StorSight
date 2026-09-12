import {
  Component,
  OnInit,
  OnDestroy,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of, Subscription } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { EventService } from '../../../core/services/event.service';
import { StorageResourceService } from '../../../core/services/storage-resource.service';
import { Event as InfraEvent, StorageResource } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SeverityBadgeComponent } from '../../../shared/components/severity-badge/severity-badge.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'ss-event-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    PageHeaderComponent,
    SeverityBadgeComponent,
    ErrorBannerComponent,
    LoadingSpinnerComponent,
    RelativeTimePipe,
  ],
  templateUrl: './event-detail.component.html',
  styleUrl:    './event-detail.component.scss',
})
export class EventDetailComponent implements OnInit, OnDestroy {
  private readonly route       = inject(ActivatedRoute);
  private readonly eventSvc    = inject(EventService);
  private readonly resourceSvc = inject(StorageResourceService);
  private readonly cdr         = inject(ChangeDetectorRef);

  loading  = signal(true);
  error    = signal<string | null>(null);
  resourceError = signal<string | null>(null);
  event    = signal<InfraEvent | null>(null);
  resource = signal<StorageResource | null>(null);
  private eventSubscription?: Subscription;
  private resourceSubscription?: Subscription;
  private routeSubscription?: Subscription;

  ngOnInit(): void {
    if (this.route.paramMap) {
      this.routeSubscription = this.route.paramMap.subscribe(params => {
        this.loadRouteId(Number(params.get('id')));
      });
      return;
    }

    this.loadRouteId(Number(this.route.snapshot.paramMap.get('id')));
  }

  ngOnDestroy(): void {
    this.routeSubscription?.unsubscribe();
    this.eventSubscription?.unsubscribe();
    this.resourceSubscription?.unsubscribe();
  }

  private loadRouteId(id: number): void {
    this.eventSubscription?.unsubscribe();
    this.resourceSubscription?.unsubscribe();
    this.event.set(null);
    this.resource.set(null);
    this.error.set(null);
    this.resourceError.set(null);

    if (isNaN(id) || id <= 0) {
      this.error.set('Invalid event ID.');
      this.loading.set(false);
      return;
    }
    this.loading.set(true);
    this.loadEvent(id);
  }

  private loadEvent(id: number): void {
    this.eventSubscription = this.eventSvc.get(id).subscribe({
      next: (e) => {
        this.event.set(e);
        this.loading.set(false);
        this.cdr.markForCheck();
        // Fetch the associated resource; suppress errors — ID shown as fallback
        this.resourceSubscription = this.resourceSvc.get(e.resource_id).pipe(
          catchError(() => {
            this.resourceError.set('Storage resource details are unavailable.');
            return of(null);
          }),
        ).subscribe(r => {
          this.resource.set(r);
          this.cdr.markForCheck();
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.status === 404 ? 'Event not found.' : 'Failed to load event.');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  /** CSS modifier class based on severity for the header accent. */
  severityAccentClass(severity: string): string {
    switch (severity) {
      case 'critical': return 'severity-accent--critical';
      case 'error':    return 'severity-accent--error';
      case 'warning':  return 'severity-accent--warning';
      default:         return 'severity-accent--info';
    }
  }
}
