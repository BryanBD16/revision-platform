import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Activity, ActivitySummary } from './activity';
import { ActivityApi } from './activity-api';

describe('ActivityApi', () => {
  let api: ActivityApi;
  let http: HttpTestingController;

  const activity: Activity = {
    id: 1,
    title: 'Cell biology',
    description: null,
    themes: [{ id: 1, name: 'Biology' }],
    modules: [{ id: 1, position: 0, type: 'reading', content: { title: null, body: 'Text' } }],
    createdAt: '2026-09-23T03:06:18Z',
    updatedAt: '2026-09-23T03:06:18Z',
  };

  const summary: ActivitySummary = {
    id: 1,
    title: 'Cell biology',
    description: null,
    themes: [{ id: 1, name: 'Biology' }],
    moduleCount: 1,
    createdAt: '2026-09-23T03:06:18Z',
    updatedAt: '2026-09-23T03:06:18Z',
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()],
    });
    api = TestBed.inject(ActivityApi);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('gets all activities', () => {
    let result: ActivitySummary[] | undefined;
    api.getAll().subscribe((activities) => (result = activities));

    http.expectOne({ method: 'GET', url: '/api/activities' }).flush([summary]);

    expect(result).toEqual([summary]);
  });

  it('gets one activity by id', () => {
    let result: Activity | undefined;
    api.getById(1).subscribe((a) => (result = a));

    http.expectOne({ method: 'GET', url: '/api/activities/1' }).flush(activity);

    expect(result).toEqual(activity);
  });

  it('creates an activity', () => {
    const request = {
      title: 'Cell biology',
      description: null,
      themes: ['Biology'],
      modules: [{ type: 'reading', content: { title: null, body: 'Text' } }],
    };
    let result: Activity | undefined;
    api.create(request).subscribe((a) => (result = a));

    const req = http.expectOne({ method: 'POST', url: '/api/activities' });
    expect(req.request.body).toEqual(request);
    req.flush(activity);

    expect(result).toEqual(activity);
  });
});
