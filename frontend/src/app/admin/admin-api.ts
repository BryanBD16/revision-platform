import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';

export interface AdminUser {
  id: number;
  email: string;
  displayName: string;
  roles: string[];
  createdAt: string;
  lockedOut: boolean;
}

export interface UserReference {
  id: number;
  email: string;
  displayName: string;
}

/** An entry of the audit trail. `changedBy` is null for a command run on the server. */
export interface RoleChange {
  id: number;
  user: UserReference;
  role: string;
  action: 'granted' | 'revoked';
  changedBy: UserReference | null;
  origin: string;
  changedAt: string;
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  totalCount: number;
}

@Injectable({ providedIn: 'root' })
export class AdminApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/admin';

  getUsers(search: string, page: number): Observable<Page<AdminUser>> {
    let params = new HttpParams().set('page', page);
    if (search) {
      params = params.set('search', search);
    }
    return this.http.get<Page<AdminUser>>(`${this.baseUrl}/users`, { params });
  }

  getRoles(): Observable<string[]> {
    return this.http.get<string[]>(`${this.baseUrl}/roles`);
  }

  grantRole(userId: number, role: string): Observable<void> {
    return this.http.put<void>(this.roleUrl(userId, role), null);
  }

  revokeRole(userId: number, role: string): Observable<void> {
    return this.http.delete<void>(this.roleUrl(userId, role));
  }

  getRoleChanges(page: number): Observable<Page<RoleChange>> {
    return this.http.get<Page<RoleChange>>(`${this.baseUrl}/role-changes`, {
      params: new HttpParams().set('page', page),
    });
  }

  private roleUrl(userId: number, role: string): string {
    return `${this.baseUrl}/users/${userId}/roles/${encodeURIComponent(role)}`;
  }
}
