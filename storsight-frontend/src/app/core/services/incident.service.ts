import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import {
  Incident, IncidentEvent, RootCauseAnalysis, RiskScore,
  Recommendation, EngineerAction,
} from '../models';

@Injectable({ providedIn: 'root' })
export class IncidentService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api/incidents`;

  list(filters?: { status?: string; severity?: string }): Observable<Incident[]> {
    let params = new HttpParams();
    if (filters?.status) params = params.set('status', filters.status);
    if (filters?.severity) params = params.set('severity', filters.severity);
    return this.http.get<Incident[]>(`${this.base}/`, { params });
  }

  get(id: number): Observable<Incident> {
    return this.http.get<Incident>(`${this.base}/${id}`);
  }

  create(payload: { title: string; description?: string; severity?: string; assignee_id?: number }): Observable<Incident> {
    return this.http.post<Incident>(`${this.base}/`, payload);
  }

  resolve(id: number): Observable<Incident> {
    return this.http.patch<Incident>(`${this.base}/${id}/resolve`, {});
  }

  assign(id: number, assigneeId: number): Observable<Incident> {
    return this.http.patch<Incident>(`${this.base}/${id}/assign`, { assignee_id: assigneeId });
  }

  listEvents(incidentId: number): Observable<IncidentEvent[]> {
    return this.http.get<IncidentEvent[]>(`${this.base}/${incidentId}/events`);
  }

  linkEvent(incidentId: number, eventId: number, relationshipType = 'related'): Observable<IncidentEvent> {
    return this.http.post<IncidentEvent>(`${this.base}/${incidentId}/events`, {
      event_id: eventId, relationship_type: relationshipType,
    });
  }

  listRca(incidentId: number): Observable<RootCauseAnalysis[]> {
    return this.http.get<RootCauseAnalysis[]>(`${this.base}/${incidentId}/rca`);
  }

  createRca(incidentId: number, payload: Partial<RootCauseAnalysis>): Observable<RootCauseAnalysis> {
    return this.http.post<RootCauseAnalysis>(`${this.base}/${incidentId}/rca`, payload);
  }

  getRisk(incidentId: number): Observable<RiskScore> {
    return this.http.get<RiskScore>(`${this.base}/${incidentId}/risk`);
  }

  listRecommendations(incidentId: number): Observable<Recommendation[]> {
    return this.http.get<Recommendation[]>(`${this.base}/${incidentId}/recommendations`);
  }

  createRecommendation(incidentId: number, payload: Partial<Recommendation>): Observable<Recommendation> {
    return this.http.post<Recommendation>(`${this.base}/${incidentId}/recommendations`, payload);
  }

  listActions(incidentId: number): Observable<EngineerAction[]> {
    return this.http.get<EngineerAction[]>(`${this.base}/${incidentId}/actions`);
  }

  createAction(incidentId: number, payload: { action_type: string; description: string; recommendation_id?: number }): Observable<EngineerAction> {
    return this.http.post<EngineerAction>(`${this.base}/${incidentId}/actions`, payload);
  }
}
