import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Activity, ActivitySummary, CreateActivityRequest } from './activity';

@Injectable({ providedIn: 'root' })
export class ActivityApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/activities';

  getAll(): Observable<ActivitySummary[]> {
    return this.http.get<ActivitySummary[]>(this.baseUrl);
  }

  getById(id: number): Observable<Activity> {
    return this.http.get<Activity>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateActivityRequest): Observable<Activity> {
    return this.http.post<Activity>(this.baseUrl, request);
  }
}
