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
import { EngineerAction, Recommendation } from '../../../../core/models';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorBannerComponent } from '../../../../shared/components/error-banner/error-banner.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';

export const ACTION_TYPES = [
  'investigation',
  'diagnosis',
  'remediation',
  'escalation',
  'monitoring',
  'note',
] as const;

/**
 * Engineer Actions intelligence section.
 *
 * Initial data is passed by the parent (no self-loading GET).
 * After creation, performs a targeted GET /actions refresh.
 */
@Component({
  selector: 'ss-engineer-actions-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, ReactiveFormsModule,
    EmptyStateComponent, ErrorBannerComponent,
    LoadingSpinnerComponent, RelativeTimePipe,
  ],
  templateUrl: './engineer-actions-section.component.html',
  styleUrl:    './engineer-actions-section.component.scss',
})
export class EngineerActionsSectionComponent implements OnChanges {
  @Input({ required: true }) incidentId!: number;
  @Input() loading         = false;
  @Input() error: string | null = null;
  @Input() items: EngineerAction[] = [];
  @Input() recommendations: Recommendation[] = [];

  @Output() retry = new EventEmitter<void>();

  private readonly svc = inject(IncidentService);
  private readonly fb  = inject(FormBuilder);
  private readonly cdr = inject(ChangeDetectorRef);

  readonly actionTypes = ACTION_TYPES;

  displayItems = signal<EngineerAction[]>([]);
  showForm     = signal(false);
  saving       = signal(false);
  formError    = signal<string | null>(null);

  createForm = this.fb.group({
    action_type:       ['', Validators.required],
    description:       ['', Validators.required],
    recommendation_id: [null as number | null],
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
    const payload: { action_type: string; description: string; recommendation_id?: number } = {
      action_type: v.action_type!.trim(),
      description: v.description!.trim(),
    };
    const recId = v.recommendation_id ? Number(v.recommendation_id) : null;
    if (recId) { payload.recommendation_id = recId; }

    this.svc.createAction(this.incidentId, payload).subscribe({
      next: () => {
        // Targeted refresh — only reload actions list
        this.svc.listActions(this.incidentId).subscribe({
          next: (list) => {
            this.displayItems.set(list);
            this.showForm.set(false);
            this.createForm.reset();
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
            : 'Failed to save action. Please try again.',
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
      action_type: 'Action type',
      description: 'Description',
    };
    return m[name] ?? name;
  }

  trackById(_: number, a: EngineerAction): number { return a.id; }

  toggleShowForm(): void {
    this.showForm.update(v => !v);
  }
}
