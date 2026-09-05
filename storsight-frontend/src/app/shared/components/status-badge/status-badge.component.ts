import { Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'ss-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="badge badge--status badge--status-{{ status?.toLowerCase() ?? 'unknown' }}">
      {{ status ?? '—' }}
    </span>
  `,
  styles: [],
})
export class StatusBadgeComponent {
  @Input() status: string | null | undefined;
}
