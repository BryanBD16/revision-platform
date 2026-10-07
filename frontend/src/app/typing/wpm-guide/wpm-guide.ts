import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import {
  CHARS_PER_WORD,
  CURRENT_SPEED_WINDOW_MS,
  PEAK_SPEED_DELAY_MS,
  SPEED_LEVELS,
} from '../typing-stats';
import { WpmMeter } from '../wpm-meter/wpm-meter';

/** Speeds commonly reported by typing schools and online tests; rough guides, not norms. */
const SPEEDS_BY_AGE = [
  { group: '7 to 10 years', range: '10 to 25 WPM' },
  { group: '11 to 13 years', range: '20 to 35 WPM' },
  { group: '14 to 17 years', range: '30 to 50 WPM' },
  { group: '18 to 30 years', range: '35 to 55 WPM' },
  { group: '31 to 50 years', range: '35 to 50 WPM' },
  { group: 'Over 50 years', range: '25 to 45 WPM' },
];

const SPEEDS_BY_WORK = [
  {
    work: 'Occasional computer use',
    range: '25 to 40 WPM',
    note: 'Enough for emails, searches and short messages.',
  },
  {
    work: 'Students and general office work',
    range: '40 to 50 WPM',
    note: 'Notes, reports and assignments can be written at the speed of thought.',
  },
  {
    work: 'Software development',
    range: '40 to 70 WPM',
    note: 'Thinking, reading and editing take more time than typing, but touch typing still helps with documentation, messages and reviews.',
  },
  {
    work: 'Administrative assistants and chat support',
    range: '50 to 70 WPM',
    note: 'Job offers often require a tested minimum, commonly around 50 WPM.',
  },
  {
    work: 'Data entry',
    range: '60 to 80 WPM',
    note: 'Accuracy matters as much as speed: a wrong number is costly.',
  },
  {
    work: 'Transcription (medical, legal)',
    range: '70 to 100 WPM or more',
    note: 'Transcriptionists type what they hear, with specialized vocabulary.',
  },
  {
    work: 'Court reporters and live captioners',
    range: 'Over 200 WPM',
    note: 'Reached on a stenotype machine, which types whole syllables at once, not on a regular keyboard.',
  },
];

/** Explains how the typing test measures speed, and what a good speed is. */
@Component({
  selector: 'app-wpm-guide',
  imports: [RouterLink, WpmMeter],
  templateUrl: './wpm-guide.html',
})
export class WpmGuide {
  protected readonly charsPerWord = CHARS_PER_WORD;
  protected readonly windowSeconds = CURRENT_SPEED_WINDOW_MS / 1000;
  protected readonly peakDelaySeconds = PEAK_SPEED_DELAY_MS / 1000;
  protected readonly speedsByAge = SPEEDS_BY_AGE;
  protected readonly speedsByWork = SPEEDS_BY_WORK;

  /** Each level with the range of speeds it covers and an example speed in the middle of it. */
  protected readonly levels = SPEED_LEVELS.map((level, index) => {
    const next = SPEED_LEVELS[index + 1];
    return {
      ...level,
      range: next ? `${level.minWpm} to ${next.minWpm - 1} WPM` : `${level.minWpm} WPM and more`,
      example: next ? Math.round((level.minWpm + next.minWpm - 1) / 2) : level.minWpm + 10,
    };
  });
}
