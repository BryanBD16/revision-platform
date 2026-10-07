/** The game modes of the typing test (see docs/api.md); only timed tests so far. */
export type TypingMode = 'timed';

/** The lengths of a timed test, in seconds. */
export const TIMED_TEST_DURATIONS = [60, 120, 300] as const;

/** A finished test. `durationSeconds` is null for a mode that is not timed. */
export interface TypingResult {
  id: number;
  mode: TypingMode;
  durationSeconds: number | null;
  averageWpm: number;
  peakWpm: number;
  playedAt: string;
}

export interface TypingResultPage {
  items: TypingResult[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface SaveTypingResultRequest {
  mode: TypingMode;
  durationSeconds: number | null;
  averageWpm: number;
  peakWpm: number;
}

/** "1 minute", "2 minutes"... */
export function durationLabel(seconds: number): string {
  const minutes = seconds / 60;
  return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
}

/** The name of a test as the results show it, such as "Timed, 2 minutes". */
export function testLabel(test: { mode: TypingMode; durationSeconds: number | null }): string {
  switch (test.mode) {
    case 'timed':
      return `Timed, ${durationLabel(test.durationSeconds ?? 0)}`;
  }
}
