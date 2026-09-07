import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { AlertService } from '../../../core/services/alert.service';
import { StorageResourceService } from '../../../core/services/storage-resource.service';
import { Alert, StorageResource } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { SeverityBadgeComponent } from '../../../shared/components/severity-badge/severity-badge.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'ss-alert-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterLink,
    PageHeaderComponent, SeverityBadgeComponent, StatusBadgeComponent,
    ErrorBannerComponent, LoadingSpinnerComponent, ConfirmDialogComponent,
    RelativeTimePipe,
  ],
  templateUrl: './alert-detail.component.html',
  styleUrl:    './alert-detail.component.scss',
})
export class AlertDetailComponent implements OnInit {
  private readonly route       = inject(ActivatedRoute);
  private readonly alertSvc    = inject(AlertService);
  private readonly resourceSvc = inject(StorageResourceService);
  private readonly cdr         = inject(ChangeDetectorRef);

  loading          = signal(true);
  resolving        = signal(false);
  error            = signal<string | null>(null);
  resolveError     = signal<string | null>(null);
  resourceError    = signal<string | null>(null);
  showConfirm      = signal(false);
  alert            = signal<Alert | null>(null);
  resource         = signal<StorageResource | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(id) || id <= 0) {
      this.error.set('Invalid alert ID.');
      this.loading.set(false);
      return;
    }
    this.loadAlert(id);
  }

  private loadAlert(id: number): void {
    this.alertSvc.get(id).subscribe({
      next: (a) => {
        this.alert.set(a);
        this.resourceSvc.get(a.resource_id).pipe(
          catchError(() => {
            this.resourceError.set('Storage resource details are unavailable.');
            return of(null);
          }),
        ).subscribe(r => {
          this.resource.set(r);
          this.loading.set(false);
          this.cdr.markForCheck();
        });
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(err.status === 404 ? 'Alert not found.' : 'Failed to load alert.');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  onResolveConfirmed(): void {
    const a = this.alert();
    if (!a || this.resolving()) return;

    this.showConfirm.set(false);
    this.resolving.set(true);
    this.resolveError.set(null);

    this.alertSvc.resolve(a.id).subscribe({
      next: (updated) => {
        this.alert.set(updated);
        this.resolving.set(false);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.resolveError.set(
          err.status === 404 ? 'Alert no longer exists.' : 'Failed to resolve alert. Please try again.',
        );
        this.resolving.set(false);
        this.cdr.markForCheck();
      },
    });
  }
}
