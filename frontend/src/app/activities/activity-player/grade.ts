import { ModuleResult } from '../../modules/module-type';

export interface Grade {
  score: number;
  maxScore: number;
  /** Rounded percentage, from 0 to 100. */
  percentage: number;
}

/**
 * Adds up the grades of the graded modules. Modules that are not graded
 * (`null`) are left out. Returns `null` when no module is graded.
 */
export function totalGrade(results: readonly (ModuleResult | null)[]): Grade | null {
  const graded = results.filter((result): result is ModuleResult => result !== null);
  const maxScore = graded.reduce((sum, result) => sum + result.maxScore, 0);
  if (maxScore === 0) {
    return null;
  }

  const score = graded.reduce((sum, result) => sum + result.score, 0);
  return { score, maxScore, percentage: Math.round((score / maxScore) * 100) };
}
