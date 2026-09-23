/** A private activity is seen only by its owner; a public one by everyone. */
export type Visibility = 'private' | 'public';

/** A theme or a course. */
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
  courses: Theme[];
  visibility: Visibility;
  moduleCount: number;
  createdAt: string;
  updatedAt: string;
}

/** One page of the activity list. */
export interface ActivityPage {
  items: ActivitySummary[];
  page: number;
  pageSize: number;
  totalCount: number;
}

/**
 * What the activity list shows. Each filter that is set narrows the result
 * (see docs/api.md). The server uses its default page size.
 */
export interface ActivityListQuery {
  page: number;
  title: string | null;
  courseId: number | null;
  themeIds: number[];
  visibility: Visibility | null;
}

export interface Activity {
  id: number;
  title: string;
  description: string | null;
  themes: Theme[];
  courses: Theme[];
  visibility: Visibility;
  modules: RevisionModule[];
  createdAt: string;
  updatedAt: string;
}

/**
 * The body to create or update an activity. When updating, a module with an `id` is an
 * existing module (it keeps its id); a module without one is new.
 */
export interface SaveActivityRequest {
  title: string;
  description: string | null;
  themes: string[];
  courses: string[];
  visibility: Visibility;
  modules: { id?: number; type: string; content: unknown }[];
}

/** Limits enforced by the API (see docs/api.md). */
export const ACTIVITY_LIMITS = {
  titleMaxLength: 200,
  descriptionMaxLength: 2000,
  themeNameMaxLength: 100,
} as const;
