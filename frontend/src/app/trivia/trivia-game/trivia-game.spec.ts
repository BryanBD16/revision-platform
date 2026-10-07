import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { TriviaQuestion, TriviaTheme } from '../trivia';
import { TriviaGame } from './trivia-game';

describe('TriviaGame', () => {
  let fixture: ComponentFixture<TriviaGame>;
  let element: HTMLElement;
  let http: HttpTestingController;

  // Not in alphabetical order: the game sorts them.
  const themes: TriviaTheme[] = [
    { id: 3, name: 'History', questionCount: 5 },
    { id: 1, name: 'Biology', questionCount: 2 },
    { id: 4, name: 'Physics', questionCount: 3 },
    { id: 2, name: 'Chemistry', questionCount: 1 },
  ];

  function question(moduleId: number, text: string): TriviaQuestion {
    return {
      moduleId,
      activityId: 10,
      activityTitle: 'Science',
      content: {
        question: text,
        choices: [
          { id: 'a', text: 'Right' },
          { id: 'b', text: 'Wrong' },
        ],
        correctChoiceIds: ['a'],
        explanation: null,
      },
    };
  }

  beforeEach(() => {
    // With a value close to 1, shuffling keeps the order of the questions.
    vi.spyOn(Math, 'random').mockReturnValue(0.999);
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    vi.restoreAllMocks();
  });

  function signIn(): void {
    TestBed.inject(AuthService).signIn({ email: 'ada@example.com', password: 'p' }).subscribe();
    http
      .expectOne('/api/auth/sign-in')
      .flush({ id: 1, email: 'ada@example.com', displayName: 'Ada', roles: [], permissions: [] });
  }

  async function create(): Promise<void> {
    fixture = TestBed.createComponent(TriviaGame);
    element = fixture.nativeElement;
    await fixture.whenStable();
    http.expectOne('/api/trivia/themes').flush(themes);
    await fixture.whenStable();
  }

  function checkbox(name: string): HTMLInputElement {
    const label = [...element.querySelectorAll('.trivia-theme')].find((l) =>
      l.textContent?.includes(name),
    );
    return label!.querySelector('input')!;
  }

  function labels(): (string | undefined)[] {
    return [...element.querySelectorAll('.trivia-theme')].map((l) =>
      l.textContent?.replace(/\s+/g, ' ').trim(),
    );
  }

  /** Answers the pending counts of questions; the ones of an earlier choice are cancelled. */
  function flushCounts(questionCount: number): void {
    for (const request of http.match((r) => r.url === '/api/trivia/questions/count')) {
      if (!request.cancelled) {
        request.flush({ questionCount });
      }
    }
  }

  async function searchFor(value: string): Promise<void> {
    const input = element.querySelector<HTMLInputElement>('#trivia-theme-search')!;
    input.value = value;
    input.dispatchEvent(new Event('input'));
    await fixture.whenStable();
  }

  function button(text: string): HTMLButtonElement {
    return [...element.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes(text),
    )!;
  }

  async function chooseAndStart(names: string[], questions: TriviaQuestion[]): Promise<void> {
    for (const name of names) {
      checkbox(name).click();
    }
    flushCounts(questions.length);
    await fixture.whenStable();
    button('Start').click();
    const ids = names.map((name) => themes.find((t) => t.name === name)!.id);
    http
      .expectOne(`/api/trivia/questions?${ids.map((id) => `themeIds=${id}`).join('&')}`)
      .flush(questions);
    await fixture.whenStable();
  }

  async function answer(choice: 'Right' | 'Wrong'): Promise<void> {
    const label = [...element.querySelectorAll('.choice')].find((l) =>
      l.textContent?.includes(choice),
    );
    label!.querySelector('input')!.click();
    await fixture.whenStable();
    button('Check answer').click();
    await fixture.whenStable();
    button('Continue').click();
    await fixture.whenStable();
  }

  function text(): string {
    return element.textContent ?? '';
  }

  it('lists the themes in alphabetical order with their number of questions', async () => {
    await create();

    expect(labels()).toEqual([
      'Biology 2 questions',
      'Chemistry 1 question',
      'History 5 questions',
      'Physics 3 questions',
    ]);
  });

  it('starts only with one to three themes', async () => {
    await create();
    expect(button('Start the game').disabled).toBe(true);

    checkbox('Biology').click();
    checkbox('Chemistry').click();
    checkbox('History').click();
    flushCounts(8);
    await fixture.whenStable();

    expect(button('Start with 3 themes').disabled).toBe(false);
    expect(checkbox('Physics').disabled).toBe(true);
    expect(text()).toContain('Themes (3 / 3)');
    expect(text()).toContain('You can choose up to 3 themes: remove one to choose another.');

    checkbox('Chemistry').click();
    flushCounts(7);
    await fixture.whenStable();
    expect(checkbox('Physics').disabled).toBe(false);
    expect(text()).not.toContain('You can choose up to 3 themes');
  });

  it('explains how to start before any theme is chosen', async () => {
    await create();

    expect(text()).toContain('Choose at least 1 theme to start.');
    http.expectNone((r) => r.url === '/api/trivia/questions/count');
  });

  it('filters the themes by name, ignoring case and accents', async () => {
    await create();

    await searchFor('  HIS ');
    expect(labels()).toEqual(['History 5 questions']);

    await searchFor('phýs');
    expect(labels()).toEqual(['Physics 3 questions']);

    await searchFor('Geology');
    expect(labels()).toEqual([]);
    expect(text()).toContain('No theme matches “Geology”.');
  });

  it('shows the chosen themes, even when the search hides them, and removes them', async () => {
    await create();
    checkbox('Physics').click();
    checkbox('Biology').click();
    flushCounts(5);
    await fixture.whenStable();

    await searchFor('History');
    const chosen = () =>
      [...element.querySelectorAll('.trivia-selection .theme')].map((t) =>
        t.textContent?.replace('×', '').trim(),
      );
    expect(chosen()).toEqual(['Physics', 'Biology']);

    element.querySelector<HTMLButtonElement>('[aria-label="Remove the theme Physics"]')!.click();
    flushCounts(2);
    await fixture.whenStable();
    expect(chosen()).toEqual(['Biology']);
    expect(button('Start with 1 theme').disabled).toBe(false);
  });

  it('shows the number of questions of the chosen themes, counted by the server', async () => {
    await create();
    checkbox('Biology').click();
    checkbox('History').click();
    await fixture.whenStable();

    const counts = http.match((r) => r.url === '/api/trivia/questions/count');
    // Only the count of the latest choice is still wanted.
    expect(counts.map((r) => r.cancelled)).toEqual([true, false]);
    expect(counts[1].request.params.getAll('themeIds')).toEqual(['1', '3']);
    counts[1].flush({ questionCount: 6 });
    await fixture.whenStable();

    expect(text()).toContain('6 questions to answer in a perfect game');
  });

  it('asks questions until the first wrong answer and saves the score', async () => {
    signIn();
    await create();
    await chooseAndStart(
      ['Biology', 'History'],
      [question(1, 'First?'), question(2, 'Second?'), question(3, 'Third?')],
    );

    expect(text()).toContain('Question 1 of 3');
    expect(text()).toContain('First?');
    await answer('Right');
    expect(text()).toContain('Question 2 of 3');
    expect(text()).toContain('Score: 1');
    expect(text()).toContain('Second?');
    await answer('Wrong');

    expect(text()).toContain('Game over');
    expect(text()).toContain('Your score: 1 correct answer in a row');
    expect(text()).toContain('Themes: Biology, History');
    const save = http.expectOne({ method: 'POST', url: '/api/trivia/scores' });
    expect(save.request.body).toEqual({ score: 1, themeIds: [1, 3] });
    save.flush({ id: 1, score: 1, themes: [], playedAt: '2026-10-06T14:00:00Z' });
    await fixture.whenStable();
    expect(text()).toContain('Your score is saved.');
  });

  it('ends with a perfect game when every question is answered correctly', async () => {
    signIn();
    await create();
    await chooseAndStart(['Biology'], [question(1, 'First?'), question(2, 'Second?')]);

    await answer('Right');
    await answer('Right');

    expect(text()).toContain('Perfect!');
    expect(text()).toContain('Your score: 2 correct answers in a row');
    http
      .expectOne({ method: 'POST', url: '/api/trivia/scores' })
      .flush({ id: 1, score: 2, themes: [], playedAt: '2026-10-06T14:00:00Z' });
  });

  it('lets visitors play without saving their score', async () => {
    await create();
    await chooseAndStart(['Chemistry'], [question(1, 'First?')]);

    await answer('Wrong');

    expect(text()).toContain('Your score: 0 correct answers in a row');
    expect(text()).toContain('to save your scores next time');
    http.expectNone('/api/trivia/scores');
  });

  it('plays again on the same themes, from a score of zero', async () => {
    await create();
    await chooseAndStart(['Biology'], [question(1, 'First?'), question(2, 'Second?')]);
    await answer('Right');
    await answer('Wrong');

    button('Play again').click();
    await fixture.whenStable();

    expect(text()).toContain('Question 1 of 2');
    expect(text()).toContain('Score: 0');
  });

  it('shows an error when the themes cannot be loaded', async () => {
    fixture = TestBed.createComponent(TriviaGame);
    element = fixture.nativeElement;
    await fixture.whenStable();
    http.expectOne('/api/trivia/themes').flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();

    expect(text()).toContain('The themes could not be loaded');
  });
});
