import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { AttemptApi } from './attempt-api';

describe('AttemptApi', () => {
  let api: AttemptApi;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(AttemptApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('saves an attempt', () => {
    const request = {
      activityId: 3,
      modules: [{ moduleId: 10, label: 'Question', score: 1, maxScore: 1 }],
    };
    api.save(request).subscribe();

    const req = http.expectOne({ method: 'POST', url: '/api/attempts' });
    expect(req.request.body).toEqual(request);
    req.flush({});
  });

  it('gets a page of attempts with the options that are set', () => {
    api.getPage({}).subscribe();
    api.getPage({ page: 2, activityId: 3, pageSize: 5 }).subscribe();

    http.expectOne({ method: 'GET', url: '/api/attempts' }).flush({});
    http.expectOne('/api/attempts?page=2&activityId=3&pageSize=5').flush({});
  });

  it('gets one attempt', () => {
    api.getById(7).subscribe();

    http.expectOne({ method: 'GET', url: '/api/attempts/7' }).flush({});
  });
});
