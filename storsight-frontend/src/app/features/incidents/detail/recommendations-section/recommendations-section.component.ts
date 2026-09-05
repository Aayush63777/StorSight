import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  inject,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';

import { IncidentService } from '../../../../core/services/incident.service';
import { Recommendation } from '../../../../core/models';
import { SeverityBadgeComponent } from '../../../../shared/components/severity-badge/severity-badge.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorBannerComponent } from '../../../../shared/components/error-banner/error-banner.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';

const PRIORITIES = ['low', 'medium', 'high', 'critical'] as const;

/**
 * Recommendations intelligence section.
 *
 * Initial data is passed by the parent (no self-loading GET).
 * After creation, performs a targeted GET /recommendations refresh.
 */
@Component({
  selector: 'ss-recommendations-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    SeverityBadgeComponent, EmptyStateComponent,
    ErrorBannerComponent, LoadingSpinnerComponent,
    RelativeTimePipe,
  ],
  templateUrl: './recommendations-section.component.html',
  styleUrl:    './recommendations-section.component.scss',
})
export class RecommendationsSectionComponent implements OnChanges {
  @Input({ required: true }) incidentId!: number;
  @Input() loading  = false;
  @Input() error:   string | null = null;
  @Input() items:   Recommendation[] = [];

  @Output() retry = new EventEmitter<void>();

  private readonly svc = inject(IncidentService);
  private readonly fb  = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly priorities = PRIORITIES;

  displayItems = signal<Recommendation[]>([]);
  showForm     = signal(false);
  saving       = signal(false);
  formError    = signal<string | null>(null);

  createForm = this.fb.group({
    title:       ['', Validators.required],
    description: ['', Validators.required],
    priority:    ['medium', Validators.required],
    reason:      [''],
  });

  ngOnChanges(): void {
    this.displayItems.set(this.items);
  }

  onCreateSubmit(): void {
    this.createForm.markAllAsTouched();
    if (this.createForm.invalid || this.saving()) return;

    this.saving.set(true);
    this.formError.set(null);

    const v = this.createForm.value;
    const payload: Partial<Recommendation> = {
      title:       v.title!.trim(),
      description: v.description!.trim(),
      priority:    v.priority as Recommendation['priority'],
      reason:      v.reason?.trim() || undefined,
    };

    this.svc.createRecommendation(this.incidentId, payload).subscribe({
      next: () => {
        // Targeted refresh — only reload recommendations list
        this.svc.listRecommendations(this.incidentId).subscribe({
          next: (list) => {
            this.displayItems.set(list);
            this.showForm.set(false);
            this.createForm.reset({ priority: 'medium' });
            this.saving.set(false);
            this.cdr.markForCheck();
          },
          error: () => {
            this.showForm.set(false);
            this.saving.set(false);
            this.cdr.markForCheck();
          },
        });
      },
      error: (err: HttpErrorResponse) => {
        this.formError.set(
          err.status === 400 && err.error?.error
            ? err.error.error
            : 'Failed to save recommendation. Please try again.',
        );
        this.saving.set(false);
        this.cdr.markForCheck();
      },
    });
  }

  fieldError(name: string): string | null {
    const ctrl = this.createForm.get(name);
    if (!ctrl || !ctrl.touched || ctrl.valid) return null;
    if (ctrl.errors?.['required']) return `${this.label(name)} is required.`;
    return 'Invalid value.';
  }

  private label(name: string): string {
    const m: Record<string, string> = {
      title: 'Title', description: 'Description', priority: 'Priority',
    };
    return m[name] ?? name;
  }

  trackById(_: number, r: Recommendation): number { return r.id; }

  toggleShowForm(): void {
    this.showForm.update(v => !v);
  }
}
