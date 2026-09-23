import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AttemptPage, AttemptSummary } from '../attempt';
import { MyResults } from './my-results';

describe('MyResults', () => {
  let fixture: ComponentFixture<MyResults>;
  let http: HttpTestingController;
  let element: HTMLElement;

  function attempt(id: number, overrides: Partial<AttemptSummary> = {}): AttemptSummary {
    return {
      id,
      activityId: 3,
      activityTitle: 'Cell biology',
      score: 2,
      maxScore: 3,
      completedAt: '2026-09-23T03:06:18Z',
      ...overrides,
    };
  }

  function page(items: AttemptSummary[], totalCount = items.length, number = 1): AttemptPage {
    return { items, page: number, pageSize: 20, totalCount };
  }

  async function create(activityId?: string): Promise<void> {
    TestBed.configureTestingModule({
      imports: [MyResults],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(MyResults);
    if (activityId) {
      fixture.componentRef.setInput('activityId', activityId);
    }
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  afterEach(() => http.verify());

  it('lists the results with their score and a link to each', async () => {
    await create();
    http
      .expectOne('/api/attempts?page=1')
      .flush(page([attempt(7), attempt(6, { score: null, maxScore: null, activityId: null })]));
    await fixture.whenStable();

    const cards = [...element.querySelectorAll('.card')];
    expect(cards[0].querySelector('a')?.getAttribute('href')).toBe('/results/7');
    expect(cards[0].textContent).toContain('2 / 3 (67%)');
    expect(cards[1].textContent).toContain('Not graded');
    expect(cards[1].textContent).toContain('Activity deleted');
  });

  it('shows only the results of one activity when asked', async () => {
    await create('3');

    http.expectOne('/api/attempts?page=1&activityId=3').flush(page([attempt(7)]));
    await fixture.whenStable();
    expect(element.textContent).toContain('Only the results of one activity are shown.');
  });

  it('shows the older results', async () => {
    await create();
    http.expectOne('/api/attempts?page=1').flush(page([attempt(7)], 21));
    await fixture.whenStable();

    [...element.querySelectorAll<HTMLButtonElement>('.pagination button')]
      .find((b) => b.textContent?.includes('Older'))!
      .click();
    await fixture.whenStable();

    http.expectOne('/api/attempts?page=2').flush(page([attempt(1)], 21, 2));
  });

  it('explains how to get a first result', async () => {
    await create();
    http.expectOne('/api/attempts?page=1').flush(page([]));
    await fixture.whenStable();

    expect(element.textContent).toContain('No results yet.');
  });
});
