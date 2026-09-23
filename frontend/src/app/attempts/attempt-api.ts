import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { Attempt, AttemptPage, SaveAttemptRequest } from './attempt';

/** The results of the signed-in user. */
@Injectable({ providedIn: 'root' })
export class AttemptApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/attempts';

  save(request: SaveAttemptRequest): Observable<Attempt> {
    return this.http.post<Attempt>(this.baseUrl, request);
  }

  /** A page of attempts, newest first, optionally only those of one activity. */
  getPage(options: {
    page?: number;
    pageSize?: number;
    activityId?: number;
  }): Observable<AttemptPage> {
    let params = new HttpParams();
    for (const [name, value] of Object.entries(options)) {
      if (value !== undefined) {
        params = params.set(name, value);
      }
    }
    return this.http.get<AttemptPage>(this.baseUrl, { params });
  }

  getById(id: number): Observable<Attempt> {
    return this.http.get<Attempt>(`${this.baseUrl}/${id}`);
  }
}
