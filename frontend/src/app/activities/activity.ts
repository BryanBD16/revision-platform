export interface Theme {
  id: number;
  name: string;
}

export interface Activity {
  id: number;
  title: string;
  description: string | null;
  themes: Theme[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityRequest {
  title: string;
  description: string | null;
  themes: string[];
}

/** Limits enforced by the API (see docs/api.md). */
export const ACTIVITY_LIMITS = {
  titleMaxLength: 200,
  descriptionMaxLength: 2000,
  themeNameMaxLength: 100,
} as const;
