import { MultipleChoiceContent } from '../modules/multiple-choice/multiple-choice-content';

/** A game is played on 1 to 3 themes (see docs/api.md). */
export const TRIVIA_THEME_LIMITS = { min: 1, max: 3 } as const;

/** A theme of the public activities, with its number of multiple-choice questions. */
export interface TriviaTheme {
  id: number;
  name: string;
  questionCount: number;
}

/** A multiple-choice module of a public activity. */
export interface TriviaQuestion {
  moduleId: number;
  activityId: number;
  activityTitle: string;
  content: MultipleChoiceContent;
}

/** The number of questions of some themes, each counted once. */
export interface TriviaQuestionCount {
  questionCount: number;
}

/** A finished game. A theme's `id` is null once the theme is deleted. */
export interface TriviaScore {
  id: number;
  score: number;
  themes: { id: number | null; name: string }[];
  playedAt: string;
}

export interface TriviaScorePage {
  items: TriviaScore[];
  page: number;
  pageSize: number;
  totalCount: number;
  /** The best score of all pages; null without scores. */
  bestScore: number | null;
}

export interface SaveTriviaScoreRequest {
  score: number;
  themeIds: number[];
}
