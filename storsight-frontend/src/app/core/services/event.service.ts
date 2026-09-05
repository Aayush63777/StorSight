import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Event as InfraEvent } from '../models';

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/events`;

  /**
   * List events.
   *
   * Backend supports mutually exclusive filters (if/elif chain):
   *   ?resource_id=<int>  OR  ?severity=<str>  OR  ?event_type=<str>
   * Only one filter is active at a time server-side.
   */
  list(filters?: {
    resource_id?: number;
    severity?: string;
    event_type?: string;
  }): Observable<InfraEvent[]> {
    let params = new HttpParams();
    if (filters?.resource_id != null) {
      params = params.set('resource_id', filters.resource_id);
    } else if (filters?.severity) {
      params = params.set('severity', filters.severity);
    } else if (filters?.event_type) {
      params = params.set('event_type', filters.event_type);
    }
    return this.http.get<InfraEvent[]>(`${this.base}/`, { params });
  }

  get(id: number): Observable<InfraEvent> {
    return this.http.get<InfraEvent>(`${this.base}/${id}`);
  }

  create(payload: {
    resource_id: number;
    event_type: string;
    message: string;
    severity?: string;
  }): Observable<InfraEvent> {
    return this.http.post<InfraEvent>(`${this.base}/`, payload);
  }
}
