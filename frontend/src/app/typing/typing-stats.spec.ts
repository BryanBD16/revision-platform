import { SpeedTracker, accuracyPercent, speedLevel, wordsPerMinute } from './typing-stats';

describe('wordsPerMinute', () => {
  it('counts a word as 5 correct characters', () => {
    expect(wordsPerMinute(250, 60_000)).toBe(50);
    expect(wordsPerMinute(250, 120_000)).toBe(25);
    expect(wordsPerMinute(52, 10_000)).toBe(62);
  });

  it('is 0 before any time has passed or without characters', () => {
    expect(wordsPerMinute(10, 0)).toBe(0);
    expect(wordsPerMinute(0, 5_000)).toBe(0);
  });
});

describe('accuracyPercent', () => {
  it('is the share of keystrokes that were right', () => {
    expect(accuracyPercent(47, 50)).toBe(94);
  });

  it('is 100 without keystrokes', () => {
    expect(accuracyPercent(0, 0)).toBe(100);
  });
});

describe('speedLevel', () => {
  it('goes from slow to expert', () => {
    expect([0, 39, 40, 69, 70, 99, 100, 180].map(speedLevel)).toEqual([
      'slow',
      'slow',
      'good',
      'good',
      'fast',
      'fast',
      'expert',
      'expert',
    ]);
  });
});

describe('SpeedTracker', () => {
  it('measures the current speed over the last 10 seconds', () => {
    const tracker = new SpeedTracker();
    // 50 WPM (≈ 4.17 characters a second) for 10 seconds, then 100 WPM.
    tracker.record(10_000, 42);
    expect(tracker.current).toBe(50);

    tracker.record(15_000, 84);
    tracker.record(20_000, 125);

    expect(tracker.current).toBe(100);
  });

  it('measures from the start during the first 10 seconds', () => {
    const tracker = new SpeedTracker();
    tracker.record(3_000, 15);

    expect(tracker.current).toBe(60);
  });

  it('keeps the highest current speed, only after the first 5 seconds', () => {
    const tracker = new SpeedTracker();
    // A fast start of 2 seconds is not a peak.
    tracker.record(2_000, 20);
    expect(tracker.peak).toBe(0);

    tracker.record(10_000, 50);
    tracker.record(20_000, 150);
    tracker.record(30_000, 175);

    expect(tracker.current).toBe(30);
    expect(tracker.peak).toBe(120);
  });

  it('does not go below 0 when corrections remove characters', () => {
    const tracker = new SpeedTracker();
    tracker.record(10_000, 20);
    tracker.record(25_000, 10);

    expect(tracker.current).toBe(0);
  });
});
