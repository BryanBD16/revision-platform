import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { AuthService } from '../../auth/auth.service';
import { SaveTypingResultRequest } from '../typing';
import { TypingSummary } from './typing-summary';

describe('TypingSummary', () => {
  let fixture: ComponentFixture<TypingSummary>;
  let element: HTMLElement;
  let http: HttpTestingController;

  const result: SaveTypingResultRequest = {
    mode: 'timed',
    durationSeconds: 60,
    averageWpm: 48,
    peakWpm: 63,
  };

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting(), provideRouter([])],
    });
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  function signIn(): void {
    TestBed.inject(AuthService).signIn({ email: 'ada@example.com', password: 'p' }).subscribe();
    http
      .expectOne('/api/auth/sign-in')
      .flush({ id: 1, email: 'ada@example.com', displayName: 'Ada', roles: [], permissions: [] });
  }

  async function create(): Promise<void> {
    fixture = TestBed.createComponent(TypingSummary);
    fixture.componentRef.setInput('heading', 'Time is up!');
    fixture.componentRef.setInput('result', result);
    fixture.componentRef.setInput('accuracy', 96);
    element = fixture.nativeElement;
    await fixture.whenStable();
  }

  function text(): string {
    return element.textContent?.replace(/\s+/g, ' ') ?? '';
  }

  it('shows the average and highest speeds and the accuracy', async () => {
    await create();

    expect(text()).toContain('Time is up!');
    const meters = [...element.querySelectorAll('.wpm-meter')].map((m) => [
      m.querySelector('.wpm-meter-label')?.textContent,
      m.querySelector('.wpm-meter-value')?.textContent,
    ]);
    expect(meters).toEqual([
      ['Average speed', '48'],
      ['Highest speed', '63'],
    ]);
    expect(text()).toContain('Accuracy: 96%');
  });

  it('saves the result of a signed-in user', async () => {
    signIn();
    await create();

    const save = http.expectOne({ method: 'POST', url: '/api/typing/results' });
    expect(save.request.body).toEqual(result);
    save.flush({ id: 1, ...result, playedAt: '2026-10-07T14:00:00Z' });
    await fixture.whenStable();

    expect(text()).toContain('Your result is saved.');
  });

  it('lets a signed-in user retry when saving fails', async () => {
    signIn();
    await create();
    http.expectOne('/api/typing/results').flush(null, { status: 500, statusText: 'Server Error' });
    await fixture.whenStable();
    expect(text()).toContain('Your result could not be saved.');

    [...element.querySelectorAll('button')]
      .find((b) => b.textContent?.includes('Try again'))!
      .click();

    http.expectOne('/api/typing/results').flush({ id: 1, ...result, playedAt: '' });
    await fixture.whenStable();
    expect(text()).toContain('Your result is saved.');
  });

  it('does not save the result of a visitor', async () => {
    await create();

    http.expectNone('/api/typing/results');
    expect(text()).toContain('to save your results next time');
  });
});
