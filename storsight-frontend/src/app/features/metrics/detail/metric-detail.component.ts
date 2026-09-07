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
import { forkJoin, of } from 'rxjs';
import { catchError } from 'rxjs/operators';

import { MetricService } from '../../../core/services/metric.service';
import { StorageResourceService } from '../../../core/services/storage-resource.service';
import { Metric, StorageResource } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'ss-metric-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    PageHeaderComponent,
    ErrorBannerComponent,
    LoadingSpinnerComponent,
    RelativeTimePipe,
  ],
  templateUrl: './metric-detail.component.html',
  styleUrl:    './metric-detail.component.scss',
})
export class MetricDetailComponent implements OnInit {
  private readonly route       = inject(ActivatedRoute);
  private readonly metricSvc   = inject(MetricService);
  private readonly resourceSvc = inject(StorageResourceService);
  private readonly cdr         = inject(ChangeDetectorRef);

  // Expose built-ins for template
  readonly Number = Number;

  loading  = signal(true);
  error    = signal<string | null>(null);
  resourceError = signal<string | null>(null);
  metric   = signal<Metric | null>(null);
  resource = signal<StorageResource | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(id) || id <= 0) {
      this.error.set('Invalid metric ID.');
      this.loading.set(false);
      return;
    }
    this.loadMetric(id);
  }

  private loadMetric(id: number): void {
    this.metricSvc.get(id).subscribe({
      next: (m) => {
        this.metric.set(m);
        // Fetch the associated resource (suppress 404 — show ID as fallback)
        this.resourceSvc.get(m.resource_id).pipe(
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
        this.error.set(err.status === 404 ? 'Metric not found.' : 'Failed to load metric.');
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  formatValue(m: Metric): string {
    const rounded = Number.isInteger(m.metric_value)
      ? m.metric_value
      : m.metric_value.toFixed(4);
    return m.unit ? `${rounded} ${m.unit}` : String(rounded);
  }
}
