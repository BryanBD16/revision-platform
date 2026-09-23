/** Content of a multiple-choice module (see docs/api.md). */
export interface MultipleChoiceContent {
  question: string;
  choices: Choice[];
  /** One or more ids of `choices`. */
  correctChoiceIds: string[];
  explanation: string | null;
}

export interface Choice {
  id: string;
  text: string;
}

export const MULTIPLE_CHOICE_LIMITS = {
  questionMaxLength: 1000,
  minChoices: 2,
  maxChoices: 10,
  choiceTextMaxLength: 500,
  explanationMaxLength: 2000,
} as const;
