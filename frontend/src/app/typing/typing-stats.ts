/** The standard length of a "word" in typing speeds: 5 characters, spaces included. */
export const CHARS_PER_WORD = 5;

/** The current speed is measured over this last part of the test. */
export const CURRENT_SPEED_WINDOW_MS = 10_000;

/** The highest speed is only measured after this delay, when the first words are too few to be meaningful. */
export const PEAK_SPEED_DELAY_MS = 5_000;

/** Words per minute for `correctChars` typed in `elapsedMs`, rounded; 0 before any time has passed. */
export function wordsPerMinute(correctChars: number, elapsedMs: number): number {
  if (elapsedMs <= 0) {
    return 0;
  }
  return Math.max(0, Math.round(correctChars / CHARS_PER_WORD / (elapsedMs / 60_000)));
}

/** The share of the typed characters that were right when typed, as a whole percentage. */
export function accuracyPercent(correctKeystrokes: number, keystrokes: number): number {
  return keystrokes === 0 ? 100 : Math.round((correctKeystrokes / keystrokes) * 100);
}

/**
 * The speed levels shown by the WPM meter, from the slowest. A speed belongs to the last
 * level whose `minWpm` it reaches (see the WPM guide page).
 */
export const SPEED_LEVELS = [
  { level: 'slow', minWpm: 0, label: 'Below average' },
  { level: 'good', minWpm: 40, label: 'Good' },
  { level: 'fast', minWpm: 70, label: 'Fast' },
  { level: 'expert', minWpm: 100, label: 'Expert' },
] as const;

export type SpeedLevel = (typeof SPEED_LEVELS)[number]['level'];

export function speedLevel(wpm: number): SpeedLevel {
  return [...SPEED_LEVELS].reverse().find((level) => wpm >= level.minWpm)!.level;
}

/**
 * Follows the speed during a test, from samples of the number of correct characters at a
 * given time since the start. The current speed is the speed over the last 10 seconds, and
 * the peak speed is the highest current speed after the first 5 seconds.
 */
export class SpeedTracker {
  private readonly samples: { elapsedMs: number; correctChars: number }[] = [
    { elapsedMs: 0, correctChars: 0 },
  ];
  private currentWpm = 0;
  private peakWpm = 0;

  /** Records the number of correct characters at `elapsedMs`; samples come in time order. */
  record(elapsedMs: number, correctChars: number): void {
    this.samples.push({ elapsedMs, correctChars });

    // The latest sample at or before the start of the window (the start of the test at first).
    const windowStart = elapsedMs - CURRENT_SPEED_WINDOW_MS;
    while (this.samples.length > 2 && this.samples[1].elapsedMs <= windowStart) {
      this.samples.shift();
    }
    const first = this.samples[0];
    this.currentWpm = wordsPerMinute(
      correctChars - first.correctChars,
      elapsedMs - first.elapsedMs,
    );

    if (elapsedMs >= PEAK_SPEED_DELAY_MS) {
      this.peakWpm = Math.max(this.peakWpm, this.currentWpm);
    }
  }

  get current(): number {
    return this.currentWpm;
  }

  get peak(): number {
    return this.peakWpm;
  }
}
