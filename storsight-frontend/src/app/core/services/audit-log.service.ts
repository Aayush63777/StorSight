import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AuditLog } from '../models';

@Injectable({ providedIn: 'root' })
export class AuditLogService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/audit-logs`;

  list(): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.base}/`);
  }

  listByIncident(incidentId: number): Observable<AuditLog[]> {
    return this.http.get<AuditLog[]>(`${this.base}/incidents/${incidentId}`);
  }
}
