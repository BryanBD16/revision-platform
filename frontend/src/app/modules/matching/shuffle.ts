import { shuffle } from '../../shared/shuffle';

/**
 * Shuffles the items, but never returns the original order (when there are at
 * least two items), so the definitions offered do not line up with the concepts.
 */
export function shuffleAvoidingOriginalOrder<T>(
  items: readonly T[],
  random: () => number = Math.random,
): T[] {
  const result = shuffle(items, random);
  if (result.length > 1 && result.every((item, index) => item === items[index])) {
    result.push(result.shift()!);
  }
  return result;
}
