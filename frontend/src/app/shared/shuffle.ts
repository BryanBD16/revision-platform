/**
 * Returns the items in a random order (Fisher-Yates shuffle), without changing
 * the given list. `random` returns a number in [0, 1) and can be replaced in tests.
 */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}
