import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

import { environment } from '../../../environments/environment';
import { Metric, MetricPage } from '../models';

@Injectable({ providedIn: 'root' })
export class MetricService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/metrics`;

  /**
   * List metrics.
   *
   * Backend supports mutually exclusive filters:
   *   ?resource_id=<int>  OR  ?metric_name=<str>
   * Do NOT send both simultaneously.
   */
  list(filters?: { resource_id?: number; metric_name?: string }): Observable<Metric[]> {
    let params = new HttpParams();
    if (filters?.resource_id != null) {
      params = params.set('resource_id', filters.resource_id);
    }
    if (filters?.metric_name) {
      params = params.set('metric_name', filters.metric_name);
    }
    return this.http.get<Metric[]>(`${this.base}/`, { params });
  }

  page(filters?: { resource_id?: number; metric_name?: string; page?: number; page_size?: number; from?: string; to?: string }): Observable<MetricPage> {
    let params = new HttpParams()
      .set('page', filters?.page ?? 1)
      .set('page_size', filters?.page_size ?? 50);
    if (filters?.resource_id != null) params = params.set('resource_id', filters.resource_id);
    if (filters?.metric_name) params = params.set('metric_name', filters.metric_name);
    if (filters?.from) params = params.set('from', filters.from);
    if (filters?.to) params = params.set('to', filters.to);
    return this.http.get<MetricPage | Metric[]>(`${this.base}/`, { params }).pipe(
      map(response => Array.isArray(response)
        ? { items: response, pagination: { page: 1, page_size: response.length, total: response.length, total_pages: response.length ? 1 : 0 } }
        : response),
    );
  }

  get(id: number): Observable<Metric> {
    return this.http.get<Metric>(`${this.base}/${id}`);
  }

  create(payload: {
    resource_id: number;
    metric_name: string;
    metric_value: number;
    unit?: string;
  }): Observable<Metric> {
    return this.http.post<Metric>(`${this.base}/`, payload);
  }
}
