import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Attempt } from '../attempt';
import { AttemptDetail } from './attempt-detail';

describe('AttemptDetail', () => {
  let fixture: ComponentFixture<AttemptDetail>;
  let http: HttpTestingController;
  let element: HTMLElement;

  const attempt: Attempt = {
    id: 7,
    activityId: 3,
    activityTitle: 'Cell biology',
    score: 1,
    maxScore: 3,
    completedAt: '2026-09-23T03:06:18Z',
    modules: [
      {
        moduleId: 10,
        position: 0,
        moduleType: 'reading',
        label: 'Introduction',
        score: null,
        maxScore: null,
      },
      {
        moduleId: 11,
        position: 1,
        moduleType: 'multiple-choice',
        label: 'What is a cell?',
        score: 1,
        maxScore: 1,
      },
      { moduleId: null, position: 2, moduleType: 'matching', label: null, score: 0, maxScore: 2 },
    ],
  };

  beforeEach(async () => {
    TestBed.configureTestingModule({
      imports: [AttemptDetail],
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
    fixture = TestBed.createComponent(AttemptDetail);
    fixture.componentRef.setInput('id', '7');
    element = fixture.nativeElement;
    await fixture.whenStable();
  });

  afterEach(() => http.verify());

  async function load(value: Attempt): Promise<void> {
    http.expectOne('/api/attempts/7').flush(value);
    await fixture.whenStable();
  }

  function rows(): string[][] {
    return [...element.querySelectorAll('.grades tbody tr')].map((row) =>
      [...row.querySelectorAll('td')].map((cell) => cell.textContent!.replace(/\s+/g, ' ').trim()),
    );
  }

  it('shows the score of each module as it was', async () => {
    await load(attempt);

    expect(element.querySelector('h2')?.textContent).toContain('Cell biology');
    expect(element.querySelector('.total-grade')?.textContent).toContain('1 / 3 (33%)');
    expect(rows()).toEqual([
      ['1. Introduction (Reading)', 'Not graded'],
      ['2. What is a cell? (Multiple choice)', '1 / 1'],
      ['3. Matching (Matching)', '0 / 2'],
    ]);
    expect(element.querySelector('a[href="/activities/3"]')).not.toBeNull();
  });

  it('says when the activity has been deleted', async () => {
    await load({ ...attempt, activityId: null });

    expect(element.textContent).toContain('This activity has been deleted.');
    expect(element.querySelector('a[href^="/activities/"]')).toBeNull();
  });

  it('shows a not found message for an unknown result', async () => {
    http.expectOne('/api/attempts/7').flush(null, { status: 404, statusText: 'Not Found' });
    await fixture.whenStable();

    expect(element.textContent).toContain('This result does not exist.');
  });
});
