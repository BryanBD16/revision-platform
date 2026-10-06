import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import {
  SaveTriviaScoreRequest,
  TriviaQuestion,
  TriviaScore,
  TriviaScorePage,
  TriviaTheme,
} from './trivia';

@Injectable({ providedIn: 'root' })
export class TriviaApi {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = '/api/trivia';

  getThemes(): Observable<TriviaTheme[]> {
    return this.http.get<TriviaTheme[]>(`${this.baseUrl}/themes`);
  }

  /** The questions of the activities that have at least one of the themes, sorted by module id. */
  getQuestions(themeIds: number[]): Observable<TriviaQuestion[]> {
    let params = new HttpParams();
    for (const themeId of themeIds) {
      params = params.append('themeIds', themeId);
    }
    return this.http.get<TriviaQuestion[]>(`${this.baseUrl}/questions`, { params });
  }

  saveScore(request: SaveTriviaScoreRequest): Observable<TriviaScore> {
    return this.http.post<TriviaScore>(`${this.baseUrl}/scores`, request);
  }

  /** A page of the scores of the signed-in user, newest first. */
  getScores(page: number): Observable<TriviaScorePage> {
    return this.http.get<TriviaScorePage>(`${this.baseUrl}/scores`, {
      params: new HttpParams().set('page', page),
    });
  }
}
