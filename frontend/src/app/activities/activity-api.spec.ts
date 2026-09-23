import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Activity, ActivityPage, ActivitySummary } from './activity';
import { ActivityApi } from './activity-api';

describe('ActivityApi', () => {
  let api: ActivityApi;
  let http: HttpTestingController;

  const activity: Activity = {
    id: 1,
    title: 'Cell biology',
    description: null,
    themes: [{ id: 1, name: 'Biology' }],
    courses: [],
    modules: [{ id: 1, position: 0, type: 'reading', content: { title: null, body: 'Text' } }],
    createdAt: '2026-09-23T03:06:18Z',
    updatedAt: '2026-09-23T03:06:18Z',
  };

  const summary: ActivitySummary = {
    id: 1,
    title: 'Cell biology',
    description: null,
    themes: [{ id: 1, name: 'Biology' }],
    courses: [],
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

  it('gets a page of activities', () => {
    const page: ActivityPage = { items: [summary], page: 2, pageSize: 20, totalCount: 21 };
    let result: ActivityPage | undefined;
    api
      .getPage({ page: 2, title: null, courseId: null, themeIds: [] })
      .subscribe((p) => (result = p));

    http.expectOne({ method: 'GET', url: '/api/activities?page=2' }).flush(page);

    expect(result).toEqual(page);
  });

  it('sends the filters that are set', () => {
    api.getPage({ page: 1, title: 'cell', courseId: 3, themeIds: [1, 2] }).subscribe();

    http
      .expectOne('/api/activities?page=1&title=cell&courseId=3&themeIds=1&themeIds=2')
      .flush({ items: [], page: 1, pageSize: 20, totalCount: 0 });
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
      courses: ['BIO 101'],
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
