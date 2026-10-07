import { Component, DestroyRef, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TextPicker } from '../text-bank';
import { TypingArea, TypingProgress } from '../typing-area/typing-area';
import { TypingSummary } from '../typing-summary/typing-summary';
import { TIMED_TEST_DURATIONS, SaveTypingResultRequest, durationLabel } from '../typing';
import { SpeedTracker, accuracyPercent, wordsPerMinute } from '../typing-stats';
import { WpmMeter } from '../wpm-meter/wpm-meter';

const NO_PROGRESS: TypingProgress = {
  typed: '',
  correctChars: 0,
  keystrokes: 0,
  correctKeystrokes: 0,
};

/** How often the clock and the current speed are updated while the player types. */
const TICK_MS = 250;

/** A paragraph is added when fewer characters than this remain to type. */
const TEXT_MARGIN_CHARS = 150;

/**
 * The timed typing test: the player chooses 1, 2 or 5 minutes and types random paragraphs
 * until the time is up. The clock starts with the first key. The side panel shows the
 * current speed at all times.
 */
@Component({
  selector: 'app-timed-test',
  imports: [RouterLink, TypingArea, TypingSummary, WpmMeter],
  templateUrl: './timed-test.html',
})
export class TimedTest {
  protected readonly durations = TIMED_TEST_DURATIONS;
  protected readonly durationLabel = durationLabel;

  protected readonly phase = signal<'choosing' | 'ready' | 'running' | 'over'>('choosing');
  protected readonly durationSeconds = signal(60);
  protected readonly text = signal('');
  protected readonly progress = signal(NO_PROGRESS);
  protected readonly elapsedMs = signal(0);
  protected readonly currentWpm = signal(0);
  /** Increased for every new test, so that the typing area starts again empty. */
  protected readonly run = signal(0);

  protected readonly averageWpm = computed(() =>
    wordsPerMinute(this.progress().correctChars, this.elapsedMs()),
  );
  protected readonly timeLeft = computed(() => {
    const seconds = Math.max(
      0,
      Math.ceil((this.durationSeconds() * 1000 - this.elapsedMs()) / 1000),
    );
    return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
  });

  /** The result of the finished test. */
  protected readonly result = signal<SaveTypingResultRequest | null>(null);
  protected readonly accuracy = computed(() =>
    accuracyPercent(this.progress().correctKeystrokes, this.progress().keystrokes),
  );

  private picker = new TextPicker();
  private tracker = new SpeedTracker();
  private startedAt = 0;
  private timer?: ReturnType<typeof setInterval>;

  constructor() {
    inject(DestroyRef).onDestroy(() => this.stopClock());
  }

  /** Prepares a new test of `seconds`; the clock waits for the first key. */
  protected start(seconds: number): void {
    this.stopClock();
    this.durationSeconds.set(seconds);
    this.picker = new TextPicker();
    this.tracker = new SpeedTracker();
    this.text.set([this.picker.next(), this.picker.next()].map((t) => t.text).join(' '));
    this.progress.set(NO_PROGRESS);
    this.elapsedMs.set(0);
    this.currentWpm.set(0);
    this.result.set(null);
    this.run.update((run) => run + 1);
    this.phase.set('ready');
  }

  protected restart(): void {
    this.start(this.durationSeconds());
  }

  protected chooseOtherDuration(): void {
    this.stopClock();
    this.phase.set('choosing');
  }

  protected onProgress(progress: TypingProgress): void {
    if (this.phase() === 'ready') {
      this.startedAt = Date.now();
      this.phase.set('running');
      this.timer = setInterval(() => this.tick(), TICK_MS);
    }
    this.progress.set(progress);
    this.measure();

    if (this.text().length - progress.typed.length < TEXT_MARGIN_CHARS) {
      this.text.update((text) => `${text} ${this.picker.next().text}`);
    }
  }

  private tick(): void {
    if (Date.now() - this.startedAt >= this.durationSeconds() * 1000) {
      this.finish();
    } else {
      this.measure();
    }
  }

  private measure(): void {
    const elapsedMs = Math.min(Date.now() - this.startedAt, this.durationSeconds() * 1000);
    this.elapsedMs.set(elapsedMs);
    this.tracker.record(elapsedMs, this.progress().correctChars);
    this.currentWpm.set(this.tracker.current);
  }

  private finish(): void {
    this.stopClock();
    this.elapsedMs.set(this.durationSeconds() * 1000);
    const averageWpm = this.averageWpm();
    this.result.set({
      mode: 'timed',
      durationSeconds: this.durationSeconds(),
      averageWpm,
      // The highest speed is measured over 10 seconds; over a whole test, at least one such
      // part is as fast as the average, but the samples may miss it by a little.
      peakWpm: Math.max(this.tracker.peak, averageWpm),
    });
    this.phase.set('over');
  }

  private stopClock(): void {
    clearInterval(this.timer);
    this.timer = undefined;
  }
}
