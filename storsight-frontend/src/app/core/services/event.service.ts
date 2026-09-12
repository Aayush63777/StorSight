import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Event as InfraEvent, EventPage } from '../models';

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/events`;

  /**
   * List events.
   *
  * All supplied filters are applied together by the backend.
   */
  list(filters?: {
    resource_id?: number;
    severity?: string;
    event_type?: string;
  }): Observable<InfraEvent[]> {
    let params = new HttpParams();
    if (filters?.resource_id != null) {
      params = params.set('resource_id', filters.resource_id);
    }
    if (filters?.severity) {
      params = params.set('severity', filters.severity);
    }
    if (filters?.event_type?.trim()) {
      params = params.set('event_type', filters.event_type);
    }
    return this.http.get<InfraEvent[]>(`${this.base}/`, { params });
  }

  page(filters?: {
    resource_id?: number;
    severity?: string;
    event_type?: string;
    page?: number;
    page_size?: number;
  }): Observable<EventPage> {
    let params = new HttpParams()
      .set('page', filters?.page ?? 1)
      .set('page_size', filters?.page_size ?? 50);
    if (filters?.resource_id != null) params = params.set('resource_id', filters.resource_id);
    if (filters?.severity) params = params.set('severity', filters.severity);
    if (filters?.event_type?.trim()) params = params.set('event_type', filters.event_type.trim());
    return this.http.get<EventPage | InfraEvent[]>(`${this.base}/`, { params }).pipe(
      map(response => Array.isArray(response)
        ? { items: response, pagination: { page: 1, page_size: response.length, total: response.length, total_pages: response.length ? 1 : 0 } }
        : response),
    );
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
