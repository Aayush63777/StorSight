import {
  Component,
  Input,
  Output,
  EventEmitter,
  ChangeDetectionStrategy,
} from '@angular/core';
import { CommonModule } from '@angular/common';

import { RiskScore } from '../../../../core/models';
import { SeverityBadgeComponent } from '../../../../shared/components/severity-badge/severity-badge.component';
import { ErrorBannerComponent } from '../../../../shared/components/error-banner/error-banner.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';

/**
 * Renders the risk-score intelligence section.
 *
 * Data is owned by the parent IncidentDetailComponent and passed in.
 * This component does NOT fetch data — it only presents it.
 * The retry Output lets the parent re-execute the risk GET.
 */
@Component({
  selector: 'ss-risk-score-section',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CommonModule, SeverityBadgeComponent, ErrorBannerComponent, LoadingSpinnerComponent],
  templateUrl: './risk-score-section.component.html',
  styleUrl:    './risk-score-section.component.scss',
})
export class RiskScoreSectionComponent {
  @Input() loading  = false;
  @Input() error:   string | null = null;
  @Input() data:    RiskScore | null = null;

  /** Emitted when the user clicks Retry — parent re-fetches. */
  @Output() retry = new EventEmitter<void>();

  scoreBand(score: number): string {
    if (score >= 75) return 'critical';
    if (score >= 50) return 'high';
    if (score >= 25) return 'medium';
    return 'low';
  }

  scoreBarWidth(score: number): string {
    return `${Math.min(100, Math.max(0, score))}%`;
  }
}
