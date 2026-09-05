import {
  Component,
  OnInit,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';

import { StorageResourceService } from '../../../core/services/storage-resource.service';
import { PageHeaderComponent } from '../../../shared/components/page-header/page-header.component';
import { ErrorBannerComponent } from '../../../shared/components/error-banner/error-banner.component';
import { LoadingSpinnerComponent } from '../../../shared/components/loading-spinner/loading-spinner.component';

const ALLOWED_STATUSES        = ['healthy', 'warning', 'critical', 'offline'] as const;
const ALLOWED_HEALTH_STATUSES = ['healthy', 'warning', 'critical', 'unknown'] as const;

/** Cross-field validator: used ≤ total when both are provided. */
function capacityValidator(group: AbstractControl): ValidationErrors | null {
  const total = group.get('capacity_total')?.value;
  const used  = group.get('capacity_used')?.value;
  if (total !== null && total !== '' && used !== null && used !== '') {
    const t = Number(total);
    const u = Number(used);
    if (!isNaN(t) && !isNaN(u) && u > t) {
      return { usedExceedsTotal: true };
    }
  }
  return null;
}

@Component({
  selector: 'ss-storage-resource-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, ReactiveFormsModule, PageHeaderComponent, ErrorBannerComponent, LoadingSpinnerComponent],
  templateUrl: './storage-resource-form.component.html',
  styleUrl: './storage-resource-form.component.scss',
})
export class StorageResourceFormComponent implements OnInit {
  private readonly svc    = inject(StorageResourceService);
  private readonly router = inject(Router);
  private readonly route  = inject(ActivatedRoute);
  private readonly fb     = inject(FormBuilder);
  private readonly cdr    = inject(ChangeDetectorRef);

  readonly statuses       = ALLOWED_STATUSES;
  readonly healthStatuses = ALLOWED_HEALTH_STATUSES;

  isEditMode  = signal(false);
  resourceId  = signal<number | null>(null);
  loading     = signal(false);   // loading existing resource in edit
  saving      = signal(false);
  apiError    = signal<string | null>(null);

  form = this.fb.group(
    {
      name:           ['', [Validators.required, Validators.maxLength(150)]],
      resource_type:  ['', [Validators.required, Validators.maxLength(50)]],
      status:         ['healthy', [Validators.required]],
      health_status:  ['healthy', [Validators.required]],
      capacity_total: [null as number | null, [Validators.min(0)]],
      capacity_used:  [null as number | null, [Validators.min(0)]],
    },
    { validators: capacityValidator },
  );

  get title(): string {
    return this.isEditMode() ? 'Edit Storage Resource' : 'Add Storage Resource';
  }
  get subtitle(): string {
    return this.isEditMode()
      ? 'Update resource configuration'
      : 'Register a new infrastructure storage resource';
  }
  get submitLabel(): string {
    return this.saving() ? (this.isEditMode() ? 'Saving…' : 'Creating…') : (this.isEditMode() ? 'Save Changes' : 'Create Resource');
  }

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) {
      const parsed = Number(id);
      if (!isNaN(parsed)) {
        this.isEditMode.set(true);
        this.resourceId.set(parsed);
        this.loadResource(parsed);
      }
    }
  }

  private loadResource(id: number): void {
    this.loading.set(true);
    this.svc.get(id).subscribe({
      next: (r) => {
        this.form.patchValue({
          name:           r.name,
          resource_type:  r.resource_type,
          status:         r.status,
          health_status:  r.health_status,
          capacity_total: r.capacity_total,
          capacity_used:  r.capacity_used,
        });
        this.loading.set(false);
        this.cdr.markForCheck();
      },
      error: (err: HttpErrorResponse) => {
        this.apiError.set(
          err.status === 404 ? 'Storage resource not found.' : 'Failed to load resource.',
        );
        this.loading.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  onSubmit(): void {
    this.form.markAllAsTouched();
    if (this.form.invalid || this.saving()) return;

    this.saving.set(true);
    this.apiError.set(null);

    const raw = this.form.value;
    const payload: Partial<import('../../../core/models').StorageResource> = {
      name:           raw.name!.trim(),
      resource_type:  raw.resource_type!.trim(),
      status:         raw.status as 'healthy' | 'warning' | 'critical' | 'offline',
      health_status:  raw.health_status as 'healthy' | 'warning' | 'critical' | 'unknown',
      capacity_total: raw.capacity_total !== null && raw.capacity_total !== undefined && raw.capacity_total !== ('' as unknown) ? Number(raw.capacity_total) : null,
      capacity_used:  raw.capacity_used  !== null && raw.capacity_used  !== undefined && raw.capacity_used  !== ('' as unknown) ? Number(raw.capacity_used)  : null,
    };

    const request$ = this.isEditMode()
      ? this.svc.update(this.resourceId()!, payload)
      : this.svc.create(payload);

    request$.subscribe({
      next: (saved) => {
        this.saving.set(false);
        this.router.navigate(['/storage-resources', saved.id]);
      },
      error: (err: HttpErrorResponse) => {
        this.saving.set(false);
        if (err.status === 400 && err.error?.error) {
          this.apiError.set(err.error.error);
        } else if (err.status === 0) {
          this.apiError.set('Cannot connect to server.');
        } else {
          this.apiError.set('Failed to save resource. Please try again.');
        }
        this.cdr.markForCheck();
      },
    });
  }

  onCancel(): void {
    if (this.isEditMode() && this.resourceId()) {
      this.router.navigate(['/storage-resources', this.resourceId()]);
    } else {
      this.router.navigate(['/storage-resources']);
    }
  }

  fieldError(name: string): string | null {
    const ctrl = this.form.get(name);
    if (!ctrl || !ctrl.touched || ctrl.valid) return null;
    if (ctrl.errors?.['required'])    return `${this.fieldLabel(name)} is required.`;
    if (ctrl.errors?.['maxlength'])   return `${this.fieldLabel(name)} is too long.`;
    if (ctrl.errors?.['min'])         return `${this.fieldLabel(name)} cannot be negative.`;
    return 'Invalid value.';
  }

  get capacityError(): string | null {
    if (!this.form.errors?.['usedExceedsTotal']) return null;
    const t = this.form.get('capacity_total');
    const u = this.form.get('capacity_used');
    if (t?.touched || u?.touched) return 'Used capacity cannot exceed total capacity.';
    return null;
  }

  private fieldLabel(name: string): string {
    const map: Record<string, string> = {
      name: 'Name', resource_type: 'Resource type',
      status: 'Status', health_status: 'Health status',
      capacity_total: 'Total capacity', capacity_used: 'Used capacity',
    };
    return map[name] ?? name;
  }
}
