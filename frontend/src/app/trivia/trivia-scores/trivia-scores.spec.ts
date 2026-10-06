import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TriviaScore, TriviaScorePage } from '../trivia';
import { TriviaScores } from './trivia-scores';

describe('TriviaScores', () => {
  let fixture: ComponentFixture<TriviaScores>;
  let element: HTMLElement;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function score(id: number, value: number, themes: string[]): TriviaScore {
    return {
      id,
      score: value,
      themes: themes.map((name, index) => ({ id: index + 1, name })),
      playedAt: '2026-10-06T14:00:00Z',
    };
  }

  async function open(page: TriviaScorePage): Promise<void> {
    fixture = TestBed.createComponent(TriviaScores);
    element = fixture.nativeElement;
    await fixture.whenStable();
    http.expectOne('/api/trivia/scores?page=1').flush(page);
    await fixture.whenStable();
  }

  it('shows the best score and each game with its themes', async () => {
    await open({
      items: [score(2, 4, ['Biology', 'Cells']), score(1, 9, ['History'])],
      page: 1,
      pageSize: 20,
      totalCount: 2,
      bestScore: 9,
    });

    expect(element.querySelector('.total-grade')?.textContent).toContain('Best score: 9');
    const rows = [...element.querySelectorAll('tbody tr')].map((row) =>
      [...row.querySelectorAll('td')].slice(1).map((cell) => cell.textContent?.trim()),
    );
    expect(rows).toEqual([
      ['Biology, Cells', '4'],
      ['History', '9'],
    ]);
  });

  it('invites to play when there are no scores', async () => {
    await open({ items: [], page: 1, pageSize: 20, totalCount: 0, bestScore: null });

    expect(element.textContent).toContain('No scores yet.');
  });

  it('loads the older scores', async () => {
    await open({
      items: [score(1, 3, ['Biology'])],
      page: 1,
      pageSize: 1,
      totalCount: 2,
      bestScore: 5,
    });

    element.querySelector<HTMLButtonElement>('.pagination button')!.click();
    await fixture.whenStable();

    http
      .expectOne('/api/trivia/scores?page=2')
      .flush({
        items: [score(2, 5, ['History'])],
        page: 2,
        pageSize: 1,
        totalCount: 2,
        bestScore: 5,
      });
    await fixture.whenStable();
    expect(element.querySelector('tbody')?.textContent).toContain('History');
  });
});
