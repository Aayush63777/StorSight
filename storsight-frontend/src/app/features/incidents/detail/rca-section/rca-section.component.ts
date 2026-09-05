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
import { RootCauseAnalysis } from '../../../../core/models';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorBannerComponent } from '../../../../shared/components/error-banner/error-banner.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';

/**
 * RCA intelligence section.
 *
 * Initial data is passed by the parent (no self-loading GET).
 * After creation, this component performs a targeted GET /rca refresh.
 */
@Component({
  selector: 'ss-rca-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    EmptyStateComponent, ErrorBannerComponent, LoadingSpinnerComponent,
    RelativeTimePipe,
  ],
  templateUrl: './rca-section.component.html',
  styleUrl:    './rca-section.component.scss',
})
export class RcaSectionComponent implements OnChanges {
  @Input({ required: true }) incidentId!: number;
  @Input() loading  = false;
  @Input() error:   string | null = null;
  @Input() items:   RootCauseAnalysis[] = [];

  /** Emitted when user clicks Retry — parent re-fetches the RCA list. */
  @Output() retry = new EventEmitter<void>();

  private readonly svc = inject(IncidentService);
  private readonly fb  = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  // ── Local display state ───────────────────────────────────
  displayItems = signal<RootCauseAnalysis[]>([]);

  // ── Create form ───────────────────────────────────────────
  showForm  = signal(false);
  saving    = signal(false);
  formError = signal<string | null>(null);

  createForm = this.fb.group({
    root_cause_category: ['', Validators.required],
    explanation:         ['', Validators.required],
    rule_name:           ['', Validators.required],
    confidence_score:    [0.5, [Validators.required, Validators.min(0), Validators.max(1)]],
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

    this.svc.createRca(this.incidentId, {
      root_cause_category: v.root_cause_category!.trim(),
      explanation:         v.explanation!.trim(),
      rule_name:           v.rule_name!.trim(),
      confidence_score:    Number(v.confidence_score),
    }).subscribe({
      next: () => {
        // Targeted refresh — only reload RCA list
        this.svc.listRca(this.incidentId).subscribe({
          next: (list) => {
            this.displayItems.set(list);
            this.showForm.set(false);
            this.createForm.reset({ confidence_score: 0.5 });
            this.saving.set(false);
            this.cdr.markForCheck();
          },
          error: () => {
            // Refresh failed; still close form, user can retry the whole section
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
            : 'Failed to save RCA. Please try again.',
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
    if (ctrl.errors?.['min'])      return 'Confidence score must be ≥ 0.';
    if (ctrl.errors?.['max'])      return 'Confidence score must be ≤ 1.';
    return 'Invalid value.';
  }

  private label(name: string): string {
    const m: Record<string, string> = {
      root_cause_category: 'Category',
      explanation:         'Explanation',
      rule_name:           'Rule name',
      confidence_score:    'Confidence score',
    };
    return m[name] ?? name;
  }

  confidencePercent(score: number): string {
    return `${Math.round(score * 100)}%`;
  }

  toggleShowForm(): void {
    this.showForm.update(v => !v);
  }

  trackById(_: number, a: RootCauseAnalysis): number { return a.id; }
}
