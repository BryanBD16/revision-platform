import { MatchingContent } from './matching-content';

/**
 * One point per concept matched with its own definition. `answers` maps the id
 * of each concept's pair to the id of the pair whose definition was chosen.
 */
export function scoreMatching(content: MatchingContent, answers: ReadonlyMap<string, string>): number {
  return content.pairs.filter((pair) => answers.get(pair.id) === pair.id).length;
}
