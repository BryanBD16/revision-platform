import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router, provideRouter } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { ActivityPage, ActivitySummary } from '../activity';
import { ActivityList } from './activity-list';

describe('ActivityList', () => {
  let harness: RouterTestingHarness;
  let http: HttpTestingController;

  beforeEach(async () => {
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([{ path: 'activities', component: ActivityList }]),
      ],
    });
    http = TestBed.inject(HttpTestingController);
    harness = await RouterTestingHarness.create();
  });

  afterEach(() => http.verify());

  function element(): HTMLElement {
    return harness.routeNativeElement!;
  }

  function text(): string {
    return element().textContent ?? '';
  }

  function summary(id: number, title: string): ActivitySummary {
    return {
      id,
      title,
      description: null,
      themes: [],
      courses: [],
      moduleCount: 1,
      createdAt: '2026-09-23T03:06:18Z',
      updatedAt: '2026-09-23T03:06:18Z',
    };
  }

  function page(items: ActivitySummary[], page: number, totalCount: number): ActivityPage {
    return { items, page, pageSize: 20, totalCount };
  }

  /** Answers the requests for the filter suggestions, sent once when the list is created. */
  function flushSuggestions(): void {
    http.match('/api/themes').forEach((request) => request.flush([{ id: 1, name: 'Biology' }]));
    http.match('/api/courses').forEach((request) => request.flush([{ id: 3, name: 'BIO 101' }]));
  }

  async function open(url: string, response: ActivityPage, expectedRequest: string): Promise<void> {
    const navigation = harness.navigateByUrl(url);
    await harness.fixture.whenStable();
    flushSuggestions();
    http.expectOne(expectedRequest).flush(response);
    await navigation;
    await harness.fixture.whenStable();
  }

  it('shows each activity with its themes, courses and a link to it', async () => {
    const activity: ActivitySummary = {
      ...summary(7, 'Cell biology'),
      themes: [
        { id: 1, name: 'Biology' },
        { id: 2, name: 'Cells' },
      ],
      courses: [{ id: 3, name: 'BIO 101' }],
      moduleCount: 2,
    };

    await open('/activities', page([activity], 1, 1), '/api/activities?page=1');

    const link = element().querySelector<HTMLAnchorElement>('.activity-title');
    expect(link?.textContent).toContain('Cell biology');
    expect(link?.getAttribute('href')).toBe('/activities/7');
    const themes = element().querySelector('.card app-activity-themes')?.textContent;
    expect(themes).toContain('Course');
    expect(themes).toContain('BIO 101');
    expect(themes).toContain('Themes');
    expect(themes).toContain('Biology');
    expect(themes).toContain('Cells');
    expect(text()).toContain('2 modules');
  });

  it('loads the page from the URL and links to the other pages', async () => {
    await open('/activities?page=2', page([summary(1, 'First')], 2, 45), '/api/activities?page=2');

    expect(text()).toContain('Page 2 of 3 · 45 activities');
    const links = [...element().querySelectorAll<HTMLAnchorElement>('.pagination a')];
    expect(links.map((link) => link.getAttribute('href'))).toEqual([
      '/activities',
      '/activities?page=3',
    ]);
  });

  it('does not link before the first or after the last page', async () => {
    await open('/activities', page([summary(1, 'First')], 1, 1), '/api/activities?page=1');

    expect(text()).toContain('Page 1 of 1 · 1 activity');
    expect(element().querySelectorAll('.pagination a').length).toBe(0);
  });

  it('sends the filters of the URL to the server', async () => {
    await open(
      '/activities?title=cell&courseId=3&themeIds=1&themeIds=2&page=2',
      page([summary(1, 'Cell division')], 2, 21),
      '/api/activities?page=2&title=cell&courseId=3&themeIds=1&themeIds=2',
    );

    expect(element().querySelector<HTMLInputElement>('#filter-title')!.value).toBe('cell');
    expect(element().querySelector<HTMLInputElement>('#filter-course')!.value).toBe('BIO 101');
    const previous = element().querySelector<HTMLAnchorElement>('.pagination a');
    expect(previous?.getAttribute('href')).toBe(
      '/activities?title=cell&courseId=3&themeIds=1&themeIds=2',
    );
  });

  it('puts a chosen filter in the URL and goes back to the first page', async () => {
    await open('/activities?page=2', page([summary(1, 'First')], 2, 21), '/api/activities?page=2');

    const course = element().querySelector<HTMLInputElement>('#filter-course')!;
    course.value = 'bio 101';
    course.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/activities?courseId=3');
    http.expectOne('/api/activities?page=1&courseId=3').flush(page([], 1, 0));
    await harness.fixture.whenStable();
    expect(text()).toContain('No activities match these filters.');
  });

  it('shows a message when there are no activities', async () => {
    await open('/activities', page([], 1, 0), '/api/activities?page=1');

    expect(text()).toContain('No activities yet');
    expect(element().querySelector('.pagination')).toBeNull();
  });

  it('links to the first page when the page does not exist', async () => {
    await open('/activities?page=9', page([], 9, 3), '/api/activities?page=9');

    expect(text()).toContain('This page does not exist');
  });

  it('shows an error when loading fails', async () => {
    const navigation = harness.navigateByUrl('/activities');
    await harness.fixture.whenStable();
    flushSuggestions();
    http
      .expectOne('/api/activities?page=1')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await navigation;
    await harness.fixture.whenStable();

    expect(text()).toContain('could not be loaded');
  });
});
