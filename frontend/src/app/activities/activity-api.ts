import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Activity, ActivityListQuery, ActivityPage, CreateActivityRequest } from './activity';

@Injectable({ providedIn: 'root' })
export class ActivityApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/activities';

  getPage(query: ActivityListQuery): Observable<ActivityPage> {
    let params = new HttpParams().set('page', query.page);
    if (query.title) {
      params = params.set('title', query.title);
    }
    if (query.courseId !== null) {
      params = params.set('courseId', query.courseId);
    }
    for (const themeId of query.themeIds) {
      params = params.append('themeIds', themeId);
    }
    return this.http.get<ActivityPage>(this.baseUrl, { params });
  }

  getById(id: number): Observable<Activity> {
    return this.http.get<Activity>(`${this.baseUrl}/${id}`);
  }

  create(request: CreateActivityRequest): Observable<Activity> {
    return this.http.post<Activity>(this.baseUrl, request);
  }
}
