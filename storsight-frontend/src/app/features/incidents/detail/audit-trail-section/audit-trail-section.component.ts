import {
  Component,
  Input,
  Output,
  EventEmitter,
  OnChanges,
  ChangeDetectionStrategy,
  signal,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { AuditLog } from '../../../../core/models';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { ErrorBannerComponent } from '../../../../shared/components/error-banner/error-banner.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { RelativeTimePipe } from '../../../../shared/pipes/relative-time.pipe';

/**
 * Audit Trail intelligence section.
 *
 * Read-only. Initial data is passed by the parent (no self-loading GET).
 * Strips the "engineer_action:" prefix from the action field for display.
 */
@Component({
  selector: 'ss-audit-trail-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    EmptyStateComponent, ErrorBannerComponent,
    LoadingSpinnerComponent, RelativeTimePipe,
  ],
  templateUrl: './audit-trail-section.component.html',
  styleUrl:    './audit-trail-section.component.scss',
})
export class AuditTrailSectionComponent implements OnChanges {
  @Input() loading         = false;
  @Input() error: string | null = null;
  @Input() items: AuditLog[] = [];

  @Output() retry = new EventEmitter<void>();

  displayItems = signal<AuditLog[]>([]);

  ngOnChanges(): void {
    this.displayItems.set(this.items);
  }

  /**
   * Strip the "engineer_action:" prefix and title-case the remainder.
   * E.g. "engineer_action:investigation" → "Investigation"
   *      "system:login"                  → "System:login"  (no prefix → unchanged)
   */
  formatAction(raw: string): string {
    const cleaned = raw.startsWith('engineer_action:')
      ? raw.slice('engineer_action:'.length)
      : raw;
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  }

  trackById(_: number, log: AuditLog): number { return log.id; }
}
