import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ViewportScroller } from '@angular/common';
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
      visibility: 'public',
      moduleCount: 1,
      createdAt: '2026-09-23T03:06:18Z',
      updatedAt: '2026-09-23T03:06:18Z',
    };
  }

  function page(items: ActivitySummary[], page: number, totalCount: number): ActivityPage {
    return { items, page, pageSize: 12, totalCount };
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

    await open('/activities', page([activity], 1, 1), '/api/activities?page=1&pageSize=12');

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

  it('marks the private activities', async () => {
    await open(
      '/activities',
      page([{ ...summary(1, 'Mine'), visibility: 'private' }, summary(2, 'Everyone')], 1, 2),
      '/api/activities?page=1&pageSize=12',
    );

    const cards = [...element().querySelectorAll('.activity-list .card')];
    expect(cards.map((card) => card.querySelector('.badge-private') !== null)).toEqual([
      true,
      false,
    ]);
  });

  it('loads the page from the URL and links to the other pages', async () => {
    await open(
      '/activities?page=2',
      page([summary(1, 'First')], 2, 30),
      '/api/activities?page=2&pageSize=12',
    );

    expect(text()).toContain('Page 2 of 3 · 30 activities');
    const links = [...element().querySelectorAll<HTMLAnchorElement>('.pagination a')];
    expect(links.map((link) => [link.textContent?.trim(), link.getAttribute('href')])).toEqual([
      ['← Previous', '/activities'],
      ['1', '/activities'],
      ['3', '/activities?page=3'],
      ['Next →', '/activities?page=3'],
    ]);
    expect(element().querySelector('[aria-current="page"]')?.textContent).toBe('2');
  });

  it('shows the first, last and neighbouring page numbers when there are many pages', async () => {
    await open(
      '/activities?page=10',
      page([summary(1, 'First')], 10, 240),
      '/api/activities?page=10&pageSize=12',
    );

    const pages = [...element().querySelectorAll('.page-links > *')]
      .map((item) => item.textContent?.trim())
      .slice(1, -1);
    expect(pages).toEqual(['1', '…', '9', '10', '11', '…', '20']);
  });

  it('disables Previous on the first page and Next on the last page', async () => {
    await open(
      '/activities',
      page([summary(1, 'First')], 1, 30),
      '/api/activities?page=1&pageSize=12',
    );

    const disabled = [...element().querySelectorAll('.page-links [aria-disabled="true"]')];
    expect(disabled.map((item) => item.textContent?.trim())).toEqual(['← Previous']);

    await open(
      '/activities?page=3',
      page([summary(1, 'Last')], 3, 30),
      '/api/activities?page=3&pageSize=12',
    );

    const disabledOnLast = [...element().querySelectorAll('.page-links [aria-disabled="true"]')];
    expect(disabledOnLast.map((item) => item.textContent?.trim())).toEqual(['Next →']);
  });

  it('goes to the chosen page, keeping the filters, and shows it from the top', async () => {
    await open(
      '/activities?title=cell',
      page([summary(1, 'First')], 1, 30),
      '/api/activities?page=1&pageSize=12&title=cell',
    );
    const scroll = vi.spyOn(TestBed.inject(ViewportScroller), 'scrollToPosition');

    element().querySelector<HTMLAnchorElement>('.page-links a[aria-label="Page 3"]')!.click();
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/activities?page=3&title=cell');
    expect(scroll).toHaveBeenCalledWith([0, 0]);
    http
      .expectOne('/api/activities?page=3&pageSize=12&title=cell')
      .flush(page([summary(2, 'Third page')], 3, 30));
    await harness.fixture.whenStable();
    expect(text()).toContain('Third page');
  });

  it('does not link before the first or after the last page', async () => {
    await open(
      '/activities',
      page([summary(1, 'First')], 1, 1),
      '/api/activities?page=1&pageSize=12',
    );

    expect(text()).toContain('Page 1 of 1 · 1 activity');
    expect(element().querySelectorAll('.pagination a').length).toBe(0);
    expect(element().querySelector('.page-links')).toBeNull();
  });

  it('sends the filters of the URL to the server', async () => {
    await open(
      '/activities?title=cell&courseId=3&themeIds=1&themeIds=2&page=2',
      page([summary(1, 'Cell division')], 2, 21),
      '/api/activities?page=2&pageSize=12&title=cell&courseId=3&themeIds=1&themeIds=2',
    );

    expect(element().querySelector<HTMLInputElement>('#filter-title')!.value).toBe('cell');
    expect(element().querySelector<HTMLInputElement>('#filter-course')!.value).toBe('BIO 101');
    const previous = element().querySelector<HTMLAnchorElement>('.pagination a');
    expect(previous?.getAttribute('href')).toBe(
      '/activities?title=cell&courseId=3&themeIds=1&themeIds=2',
    );
  });

  it('puts a chosen filter in the URL and goes back to the first page', async () => {
    await open(
      '/activities?page=2',
      page([summary(1, 'First')], 2, 21),
      '/api/activities?page=2&pageSize=12',
    );

    const course = element().querySelector<HTMLInputElement>('#filter-course')!;
    course.value = 'bio 101';
    course.dispatchEvent(new Event('change'));
    await harness.fixture.whenStable();

    expect(TestBed.inject(Router).url).toBe('/activities?courseId=3');
    http.expectOne('/api/activities?page=1&pageSize=12&courseId=3').flush(page([], 1, 0));
    await harness.fixture.whenStable();
    expect(text()).toContain('No activities match these filters.');
  });

  it('shows a message when there are no activities', async () => {
    await open('/activities', page([], 1, 0), '/api/activities?page=1&pageSize=12');

    expect(text()).toContain('No activities yet');
    expect(element().querySelector('.pagination')).toBeNull();
  });

  it('links to the first page when the page does not exist', async () => {
    await open('/activities?page=9', page([], 9, 3), '/api/activities?page=9&pageSize=12');

    expect(text()).toContain('This page does not exist');
  });

  it('shows an error when loading fails', async () => {
    const navigation = harness.navigateByUrl('/activities');
    await harness.fixture.whenStable();
    flushSuggestions();
    http
      .expectOne('/api/activities?page=1&pageSize=12')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await navigation;
    await harness.fixture.whenStable();

    expect(text()).toContain('could not be loaded');
  });
});
