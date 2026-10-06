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

  const themes: TriviaTheme[] = [
    { id: 1, name: 'Biology', questionCount: 2 },
    { id: 2, name: 'Chemistry', questionCount: 1 },
    { id: 3, name: 'History', questionCount: 5 },
    { id: 4, name: 'Physics', questionCount: 3 },
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

  function button(text: string): HTMLButtonElement {
    return [...element.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes(text),
    )!;
  }

  async function chooseAndStart(names: string[], questions: TriviaQuestion[]): Promise<void> {
    for (const name of names) {
      checkbox(name).click();
    }
    await fixture.whenStable();
    button('Start the game').click();
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

  it('lists the themes with their number of questions', async () => {
    await create();

    const labels = [...element.querySelectorAll('.trivia-theme')].map((l) =>
      l.textContent?.replace(/\s+/g, ' ').trim(),
    );
    expect(labels).toEqual([
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
    await fixture.whenStable();

    expect(button('Start the game').disabled).toBe(false);
    expect(checkbox('Physics').disabled).toBe(true);
    expect(text()).toContain('Themes (3 / 3)');

    checkbox('Chemistry').click();
    await fixture.whenStable();
    expect(checkbox('Physics').disabled).toBe(false);
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
