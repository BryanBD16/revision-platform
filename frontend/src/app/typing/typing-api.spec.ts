import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { TypingApi } from './typing-api';

describe('TypingApi', () => {
  let api: TypingApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(TypingApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('saves a result', () => {
    const request = { mode: 'timed', durationSeconds: 60, averageWpm: 45, peakWpm: 58 } as const;
    api.saveResult(request).subscribe();

    const saved = http.expectOne({ method: 'POST', url: '/api/typing/results' });
    expect(saved.request.body).toEqual(request);
    saved.flush({ id: 1, ...request, playedAt: '2026-10-07T14:00:00Z' });
  });

  it('gets a page of results', () => {
    api.getResults(2).subscribe();

    http
      .expectOne({ method: 'GET', url: '/api/typing/results?page=2' })
      .flush({ items: [], page: 2, pageSize: 20, totalCount: 0 });
  });
});
