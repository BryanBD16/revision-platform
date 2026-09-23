/** The result of one module; `score` and `maxScore` are null for a module that is not graded. */
export interface AttemptModule {
  moduleId: number | null;
  position: number;
  moduleType: string;
  label: string | null;
  score: number | null;
  maxScore: number | null;
}

/**
 * A completed activity, as it was when it was completed. `activityId` is null once the
 * activity is deleted; `score` and `maxScore` are null when no module is graded.
 */
export interface Attempt {
  id: number;
  activityId: number | null;
  activityTitle: string;
  score: number | null;
  maxScore: number | null;
  completedAt: string;
  modules: AttemptModule[];
}

export type AttemptSummary = Omit<Attempt, 'modules'>;

export interface AttemptPage {
  items: AttemptSummary[];
  page: number;
  pageSize: number;
  totalCount: number;
}

export interface SaveAttemptRequest {
  activityId: number;
  modules: {
    moduleId: number;
    label: string | null;
    score: number | null;
    maxScore: number | null;
  }[];
}
