/** Content of a reading module (see docs/api.md). */
export interface ReadingContent {
  title: string | null;
  body: string;
}

export const READING_LIMITS = {
  titleMaxLength: 200,
  bodyMaxLength: 20000,
} as const;
