import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { SaveTypingResultRequest, TypingResult, TypingResultPage } from './typing';

@Injectable({ providedIn: 'root' })
export class TypingApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/typing';

  saveResult(request: SaveTypingResultRequest): Observable<TypingResult> {
    return this.http.post<TypingResult>(`${this.baseUrl}/results`, request);
  }

  /** A page of the results of the signed-in user, newest first. */
  getResults(page: number): Observable<TypingResultPage> {
    return this.http.get<TypingResultPage>(`${this.baseUrl}/results`, {
      params: new HttpParams().set('page', page),
    });
  }
}
