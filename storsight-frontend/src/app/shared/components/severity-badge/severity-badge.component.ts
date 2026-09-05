import { Component, Input } from '@angular/core';
import { SeverityColorPipe } from '../../pipes/severity-color.pipe';

@Component({
  selector: 'ss-severity-badge',
  standalone: true,
  imports: [SeverityColorPipe],
  template: `
    <span
      class="badge badge--severity"
      [class]="'badge badge--severity badge--' + (severity | severityColor)"
      [attr.aria-label]="'Severity: ' + (severity ?? 'unknown')">
      {{ severity ?? '—' }}
    </span>
  `,
})
export class SeverityBadgeComponent {
  @Input() severity: string | null | undefined;
}
