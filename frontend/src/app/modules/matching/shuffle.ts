/**
 * Returns the items in a random order that is never the original order (when
 * there are at least two items), so the options do not line up with the concepts.
 * `random` returns a number in [0, 1) and can be replaced in tests.
 */
export function shuffle<T>(items: readonly T[], random: () => number = Math.random): T[] {
  const result = [...items];
  // Fisher-Yates shuffle.
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }

  if (result.length > 1 && result.every((item, index) => item === items[index])) {
    result.push(result.shift()!);
  }
  return result;
}
