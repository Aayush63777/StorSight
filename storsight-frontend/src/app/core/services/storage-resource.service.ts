import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { StorageResource } from '../models';

@Injectable({ providedIn: 'root' })
export class StorageResourceService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/storage-resources`;

  list(filters?: { status?: string; resource_type?: string }): Observable<StorageResource[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.resource_type) params = params.set('resource_type', filters.resource_type);
    return this.http.get<StorageResource[]>(`${this.base}/`, { params });
  }

  get(id: number): Observable<StorageResource> {
    return this.http.get<StorageResource>(`${this.base}/${id}`);
  }

  create(payload: Partial<StorageResource>): Observable<StorageResource> {
    return this.http.post<StorageResource>(`${this.base}/`, payload);
  }

  update(id: number, payload: Partial<StorageResource>): Observable<StorageResource> {
    return this.http.patch<StorageResource>(`${this.base}/${id}`, payload);
  }

  delete(id: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.base}/${id}`);
  }
}
