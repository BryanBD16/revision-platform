import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { TimedTest } from './timed-test';

describe('TimedTest', () => {
  let fixture: ComponentFixture<TimedTest>;
  let element: HTMLElement;
  let http: HttpTestingController;

  beforeEach(async () => {
    // Only the clock of the test is faked: the fixture still waits with real timeouts.
    vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'] });
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    vi.useRealTimers();
    http.verify();
  });

  function signIn(): void {
    TestBed.inject(AuthService).signIn({ email: 'ada@example.com', password: 'p' }).subscribe();
    http
      .expectOne('/api/auth/sign-in')
      .flush({ id: 1, email: 'ada@example.com', displayName: 'Ada', roles: [], permissions: [] });
  }

  async function create(): Promise<void> {
    fixture = TestBed.createComponent(TimedTest);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function button(text: string): HTMLButtonElement {
    return [...element.querySelectorAll<HTMLButtonElement>('button')].find((b) =>
      b.textContent?.includes(text),
    )!;
  }

  function area(): HTMLElement {
    return element.querySelector<HTMLElement>('.typing-area')!;
  }

  function textToType(): string {
    return [...area().querySelectorAll('.typing-char')].map((c) => c.textContent).join('');
  }

  function typedLength(): number {
    return area().querySelectorAll('.typing-char-correct, .typing-char-incorrect').length;
  }

  /** Types the next `count` characters of the text without mistakes. */
  async function typeCorrectly(count: number): Promise<void> {
    const text = textToType();
    const start = typedLength();
    for (const key of text.slice(start, start + count)) {
      area().dispatchEvent(new KeyboardEvent('keydown', { key, cancelable: true }));
    }
    await fixture.whenStable();
  }

  async function wait(ms: number): Promise<void> {
    vi.advanceTimersByTime(ms);
    await fixture.whenStable();
  }

  /** The values of the side panel, by name. */
  function sidebar(): Record<string, string | undefined> {
    const panel = element.querySelector('.typing-sidebar')!;
    const values: Record<string, string | undefined> = {
      speed: panel.querySelector('.wpm-meter-value')?.textContent?.trim(),
      level: panel.querySelector('.wpm-meter-unit')?.textContent?.trim(),
    };
    for (const row of panel.querySelectorAll('.typing-stats div')) {
      values[row.querySelector('dt')!.textContent!.trim()] = row
        .querySelector('dd')
        ?.textContent?.trim();
    }
    return values;
  }

  /** The speeds of the summary, by label. */
  function summarySpeeds(): Record<string, string | undefined> {
    return Object.fromEntries(
      [...element.querySelectorAll('.typing-summary .wpm-meter')].map((m) => [
        m.querySelector('.wpm-meter-label')?.textContent,
        m.querySelector('.wpm-meter-value')?.textContent,
      ]),
    );
  }

  function text(): string {
    return element.textContent?.replace(/\s+/g, ' ') ?? '';
  }

  it('offers tests of 1, 2 and 5 minutes', async () => {
    await create();

    const durations = [...element.querySelectorAll('.typing-durations button')].map((b) =>
      b.textContent?.trim(),
    );
    expect(durations).toEqual(['1 minute', '2 minutes', '5 minutes']);
  });

  it('shows a random text and waits for the first key to start the clock', async () => {
    await create();
    button('2 minutes').click();
    await fixture.whenStable();

    expect(textToType().split(' ').length).toBeGreaterThan(150);
    expect(sidebar()['Time left']).toBe('2:00');
    await wait(5_000);
    expect(sidebar()['Time left']).toBe('2:00');
    expect(text()).toContain('the clock starts with your first key');
  });

  it('shows the speeds in the side panel while the player types', async () => {
    await create();
    button('1 minute').click();
    await fixture.whenStable();

    await typeCorrectly(50);
    await wait(6_000);

    // 50 characters (10 words) in 6 seconds: 100 words per minute.
    expect(sidebar()).toEqual({
      speed: '100',
      level: 'WPM · Expert',
      Average: '100 WPM',
      'Time left': '0:54',
    });

    await wait(6_000);
    // No character typed during the last 10 seconds.
    expect(sidebar()).toEqual({
      speed: '0',
      level: 'WPM · Below average',
      Average: '50 WPM',
      'Time left': '0:48',
    });
  });

  it('adds paragraphs so that the text never runs out', async () => {
    await create();
    button('5 minutes').click();
    await fixture.whenStable();
    const length = textToType().length;

    await typeCorrectly(length - 100);

    expect(textToType().length).toBeGreaterThan(length);
    expect(textToType().startsWith(textToType().slice(0, length))).toBe(true);
  });

  it('ends when the time is up with the average and highest speeds, and saves them', async () => {
    signIn();
    await create();
    button('1 minute').click();
    await fixture.whenStable();

    await typeCorrectly(50);
    await wait(10_000);
    await typeCorrectly(50);
    await wait(50_000);

    // 100 characters in a minute: 20 words per minute on average. The highest speed is
    // measured from 5 seconds on: the first 50 characters in 5 seconds make 120.
    expect(text()).toContain('Time is up!');
    expect(summarySpeeds()).toEqual({ 'Average speed': '20', 'Highest speed': '120' });
    expect(text()).toContain('Accuracy: 100%');
    const save = http.expectOne({ method: 'POST', url: '/api/typing/results' });
    expect(save.request.body).toEqual({
      mode: 'timed',
      durationSeconds: 60,
      averageWpm: 20,
      peakWpm: 120,
    });
    save.flush({ id: 1, ...save.request.body, playedAt: '2026-10-07T14:00:00Z' });
    await fixture.whenStable();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('restarts with an empty text and the clock stopped', async () => {
    await create();
    button('1 minute').click();
    await fixture.whenStable();
    await typeCorrectly(20);
    await wait(3_000);

    button('Restart').click();
    await fixture.whenStable();

    expect(typedLength()).toBe(0);
    expect(sidebar()['Time left']).toBe('1:00');
    expect(sidebar()['Average']).toBe('0 WPM');
    expect(vi.getTimerCount()).toBe(0);
  });

  it('plays again or goes back to the lengths after the test', async () => {
    await create();
    button('1 minute').click();
    await fixture.whenStable();
    await typeCorrectly(5);
    await wait(60_000);

    button('Try again').click();
    await fixture.whenStable();
    expect(sidebar()['Time left']).toBe('1:00');

    button('Choose another length').click();
    await fixture.whenStable();
    expect(element.querySelector('.typing-durations')).not.toBeNull();
  });

  it('stops the clock when the page is left', async () => {
    await create();
    button('1 minute').click();
    await fixture.whenStable();
    await typeCorrectly(5);

    fixture.destroy();

    expect(vi.getTimerCount()).toBe(0);
  });
});
