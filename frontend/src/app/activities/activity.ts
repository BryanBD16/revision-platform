export interface Theme {
  id: number;
  name: string;
}

/** A module of an activity. The structure of `content` depends on `type`. */
export interface RevisionModule {
  id: number;
  position: number;
  type: string;
  content: unknown;
}

/** An activity as returned by the list endpoint, without its modules. */
export interface ActivitySummary {
  id: number;
  title: string;
  description: string | null;
  themes: Theme[];
  moduleCount: number;
  createdAt: string;
  updatedAt: string;
}

export interface Activity {
  id: number;
  title: string;
  description: string | null;
  themes: Theme[];
  modules: RevisionModule[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateActivityRequest {
  title: string;
  description: string | null;
  themes: string[];
  modules: { type: string; content: unknown }[];
}

/** Limits enforced by the API (see docs/api.md). */
export const ACTIVITY_LIMITS = {
  titleMaxLength: 200,
  descriptionMaxLength: 2000,
  themeNameMaxLength: 100,
} as const;
