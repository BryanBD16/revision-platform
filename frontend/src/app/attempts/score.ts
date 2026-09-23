/** "3 / 4 (75%)", or null when there is nothing graded. */
export function scoreText(score: number | null, maxScore: number | null): string | null {
  if (score === null || maxScore === null || maxScore === 0) {
    return null;
  }
  return `${score} / ${maxScore} (${Math.round((score / maxScore) * 100)}%)`;
}
