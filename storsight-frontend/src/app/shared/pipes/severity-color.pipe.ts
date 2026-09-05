import { Pipe, PipeTransform } from '@angular/core';

/**
 * Maps a severity string to a CSS class suffix used by the badge system.
 *
 * Covers all backend severity sets:
 *   Events   : info | warning | error | critical
 *   Alerts   : info | warning | critical
 *   Incidents: low  | medium  | high  | critical
 *   Risk     : low  | medium  | high  | critical
 */
@Pipe({ name: 'severityColor', standalone: true })
export class SeverityColorPipe implements PipeTransform {
  transform(severity: string | null | undefined): string {
    switch (severity?.toLowerCase()) {
      case 'critical':  return 'critical';
      case 'high':
      case 'error':     return 'high';
      case 'warning':
      case 'medium':    return 'medium';
      case 'low':       return 'low';
      case 'info':      return 'info';
      default:          return 'unknown';
    }
  }
}
