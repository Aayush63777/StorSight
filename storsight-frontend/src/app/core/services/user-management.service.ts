import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CreateUserPayload, ManagedUser, Role } from '../models';

@Injectable({ providedIn: 'root' })
export class UserManagementService {
  private readonly http = inject(HttpClient);
  private readonly usersUrl = `${environment.apiBaseUrl}/api/users/`;
  private readonly rolesUrl = `${environment.apiBaseUrl}/api/roles/`;

  list(): Observable<ManagedUser[]> {
    return this.http.get<ManagedUser[]>(this.usersUrl);
  }

  listRoles(): Observable<Role[]> {
    return this.http.get<Role[]>(this.rolesUrl);
  }

  create(payload: CreateUserPayload): Observable<ManagedUser> {
    return this.http.post<ManagedUser>(this.usersUrl, payload);
  }
}