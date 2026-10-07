import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { TypingResult, TypingResultPage } from '../typing';
import { TypingResults } from './typing-results';

describe('TypingResults', () => {
  let fixture: ComponentFixture<TypingResults>;
  let element: HTMLElement;
  let http: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function result(id: number, durationSeconds: number, averageWpm: number): TypingResult {
    return {
      id,
      mode: 'timed',
      durationSeconds,
      averageWpm,
      peakWpm: averageWpm + 12,
      playedAt: '2026-10-07T14:00:00Z',
    };
  }

  async function open(page: TypingResultPage): Promise<void> {
    fixture = TestBed.createComponent(TypingResults);
    element = fixture.nativeElement;
    await fixture.whenStable();
    http.expectOne('/api/typing/results?page=1').flush(page);
    await fixture.whenStable();
  }

  it('shows each test with its date, kind and speeds', async () => {
    await open({
      items: [result(2, 120, 52), result(1, 60, 41)],
      page: 1,
      pageSize: 20,
      totalCount: 2,
    });

    const rows = [...element.querySelectorAll('tbody tr')].map((row) =>
      [...row.querySelectorAll('td')].map((cell) => cell.textContent?.trim()),
    );
    expect(rows.map((row) => row.slice(1))).toEqual([
      ['Timed, 2 minutes', '52 WPM', '64 WPM'],
      ['Timed, 1 minute', '41 WPM', '53 WPM'],
    ]);
    expect(rows[0][0]).toContain('2026');
  });

  it('invites to take a test when there are no results', async () => {
    await open({ items: [], page: 1, pageSize: 20, totalCount: 0 });

    expect(element.textContent).toContain('No results yet.');
  });

  it('loads the older results', async () => {
    await open({ items: [result(2, 60, 40)], page: 1, pageSize: 1, totalCount: 2 });

    element.querySelector<HTMLButtonElement>('.pagination button')!.click();
    await fixture.whenStable();

    http
      .expectOne('/api/typing/results?page=2')
      .flush({ items: [result(1, 300, 35)], page: 2, pageSize: 1, totalCount: 2 });
    await fixture.whenStable();
    expect(element.querySelector('tbody')?.textContent).toContain('Timed, 5 minutes');
  });

  it('shows an error when the results cannot be loaded', async () => {
    fixture = TestBed.createComponent(TypingResults);
    element = fixture.nativeElement;
    await fixture.whenStable();
    http
      .expectOne('/api/typing/results?page=1')
      .flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(element.textContent).toContain('Your results could not be loaded');
  });
});
