import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Metric } from '../models';

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
    } else if (filters?.metric_name) {
      params = params.set('metric_name', filters.metric_name);
    }
    return this.http.get<Metric[]>(`${this.base}/`, { params });
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
