import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Alert } from '../models';

@Injectable({ providedIn: 'root' })
export class AlertService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/alerts`;

  list(filters?: { resource_id?: number; severity?: string; status?: string }): Observable<Alert[]> {
    let params = new HttpParams();
    if (filters?.resource_id != null) params = params.set('resource_id', filters.resource_id);
    if (filters?.severity) params = params.set('severity', filters.severity);
    if (filters?.status) params = params.set('status', filters.status);
    return this.http.get<Alert[]>(`${this.base}/`, { params });
  }

  get(id: number): Observable<Alert> {
    return this.http.get<Alert>(`${this.base}/${id}`);
  }

  create(payload: { resource_id: number; title: string; severity: string; message?: string }): Observable<Alert> {
    return this.http.post<Alert>(`${this.base}/`, payload);
  }

  resolve(id: number): Observable<Alert> {
    return this.http.patch<Alert>(`${this.base}/${id}/resolve`, {});
  }
}
