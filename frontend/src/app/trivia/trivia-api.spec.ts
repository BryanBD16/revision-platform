import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TriviaApi } from './trivia-api';

describe('TriviaApi', () => {
  let api: TriviaApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(TriviaApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gets the themes', () => {
    api.getThemes().subscribe();

    http.expectOne({ method: 'GET', url: '/api/trivia/themes' }).flush([]);
  });

  it('gets the questions of the chosen themes', () => {
    api.getQuestions([1, 4]).subscribe();

    http.expectOne({ method: 'GET', url: '/api/trivia/questions?themeIds=1&themeIds=4' }).flush([]);
  });

  it('counts the questions of the chosen themes', () => {
    api.countQuestions([1, 4]).subscribe();

    http
      .expectOne({ method: 'GET', url: '/api/trivia/questions/count?themeIds=1&themeIds=4' })
      .flush({ questionCount: 0 });
  });

  it('saves a score', () => {
    api.saveScore({ score: 3, themeIds: [1] }).subscribe();

    const request = http.expectOne({ method: 'POST', url: '/api/trivia/scores' });
    expect(request.request.body).toEqual({ score: 3, themeIds: [1] });
    request.flush({ id: 1, score: 3, themes: [], playedAt: '2026-10-06T14:00:00Z' });
  });

  it('gets a page of scores', () => {
    api.getScores(2).subscribe();

    http
      .expectOne({ method: 'GET', url: '/api/trivia/scores?page=2' })
      .flush({ items: [], page: 2, pageSize: 20, totalCount: 0, bestScore: null });
  });
});
