import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { Role, UserRecord } from '../models';

@Injectable({ providedIn: 'root' })
export class UserService {
  private readonly http = inject(HttpClient);
  private readonly base = `${environment.apiBaseUrl}/api`;

  list(): Observable<UserRecord[]> {
    return this.http.get<UserRecord[]>(`${this.base}/users/`);
  }

  listRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(`${this.base}/roles/`);
  }

  create(payload: {
    username: string;
    email: string;
    password: string;
    role_id: number;
  }): Observable<UserRecord> {
    return this.http.post<UserRecord>(`${this.base}/users/`, payload);
  }
}
