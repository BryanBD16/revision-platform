import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Activity, ActivityListQuery, ActivityPage, CreateActivityRequest } from './activity';

@Injectable({ providedIn: 'root' })
export class ActivityApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/activities';

  getPage(query: ActivityListQuery): Observable<ActivityPage> {
    const params = new HttpParams().set('page', query.page);
    return this.http.get<ActivityPage>(this.baseUrl, { params });
  }

  getById(id: number): Observable<Activity> {
    return this.http.get<Activity>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateActivityRequest): Observable<Activity> {
    return this.http.post<Activity>(this.baseUrl, request);
  }
}
