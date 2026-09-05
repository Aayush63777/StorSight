import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, ActivatedRoute, RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { StorageResourceService } from '../../../core/services/storage-resource.service';
import { StorageResource } from '../../../core/models';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { StatusBadgeComponent } from '../../../shared/components/status-badge/status-badge.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog.component';
import { RelativeTimePipe } from '../../../shared/pipes/relative-time.pipe';

@Component({
  selector: 'ss-storage-resource-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterLink,
    PageHeaderComponent,
    StatusBadgeComponent,
    ErrorBannerComponent,
    LoadingSpinnerComponent,
    ConfirmDialogComponent,
    RelativeTimePipe,
  ],
  templateUrl: './storage-resource-detail.component.html',
  styleUrl:    './storage-resource-detail.component.scss',
})
export class StorageResourceDetailComponent implements OnInit {
  private readonly svc    = inject(StorageResourceService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  private readonly cdr    = inject(ChangeDetectorRef);

  loading         = signal(true);
  deleting        = signal(false);
  error           = signal<string | null>(null);
  deleteError     = signal<string | null>(null);
  resource        = signal<StorageResource | null>(null);
  showDeleteDialog = signal(false);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    if (isNaN(id) || id <= 0) {
      this.error.set('Invalid resource ID.');
      this.loading.set(false);
      return;
    }
    this.loadResource(id);
  }

  private loadResource(id: number): void {
    this.loading.set(true);
    this.error.set(null);

    this.svc.get(id).subscribe({
      next: (r) => {
        this.resource.set(r);
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.error.set(
          err.status === 404
            ? 'Storage resource not found.'
            : 'Failed to load resource.',
        );
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  onDeleteConfirmed(): void {
    const r = this.resource();
    if (!r) return;

    this.showDeleteDialog.set(false);
    this.deleting.set(true);
    this.deleteError.set(null);

    this.svc.delete(r.id).subscribe({
      next: () => {
        this.deleting.set(false);
        this.router.navigate(['/storage-resources']);
      },
      error: (err: HttpErrorResponse) => {
        this.deleting.set(false);
        this.deleteError.set(
          err.status === 404
            ? 'Resource no longer exists.'
            : 'Failed to delete resource. Please try again.',
        );
        this.cdr.markForCheck();
      },
    });
  }

  // ── Capacity helpers ──────────────────────────────────────

  utilPercent(r: StorageResource): number {
    if (!r.capacity_total || r.capacity_total <= 0) return 0;
    return Math.min(100, Math.round(((r.capacity_used ?? 0) / r.capacity_total) * 100));
  }

  utilClass(r: StorageResource): string {
    const pct = this.utilPercent(r);
    if (pct >= 90) return 'util-bar__fill--critical';
    if (pct >= 75) return 'util-bar__fill--warning';
    return 'util-bar__fill--ok';
  }

  formatCapacity(gb: number | null): string {
    if (gb === null || gb === undefined) return '—';
    if (gb >= 1024) return `${(gb / 1024).toFixed(1)} TB`;
    return `${gb} GB`;
  }

  availableCapacity(r: StorageResource): string {
    if (r.capacity_total === null || r.capacity_used === null) return '—';
    const avail = r.capacity_total - r.capacity_used;
    return this.formatCapacity(avail < 0 ? 0 : avail);
  }
}
