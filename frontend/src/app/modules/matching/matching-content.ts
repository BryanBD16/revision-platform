/** Content of a matching module (see docs/api.md). */
export interface MatchingContent {
  instructions: string | null;
  pairs: MatchingPair[];
}

export interface MatchingPair {
  id: string;
  concept: string;
  definition: string;
}

export const MATCHING_LIMITS = {
  instructionsMaxLength: 500,
  minPairs: 2,
  maxPairs: 10,
  conceptMaxLength: 200,
  definitionMaxLength: 1000,
} as const;
