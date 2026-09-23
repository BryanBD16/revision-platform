import { scoreMatching } from './grading';
import { MatchingContent } from './matching-content';

describe('scoreMatching', () => {
  const content: MatchingContent = {
    instructions: null,
    pairs: [
      { id: 'p1', concept: 'Mitosis', definition: 'Two identical cells' },
      { id: 'p2', concept: 'Meiosis', definition: 'Gametes' },
      { id: 'p3', concept: 'Osmosis', definition: 'Water through a membrane' },
    ],
  };

  it('gives one point per correct match', () => {
    const answers = new Map([
      ['p1', 'p1'],
      ['p2', 'p3'],
      ['p3', 'p2'],
    ]);

    expect(scoreMatching(content, answers)).toBe(1);
  });

  it('gives all the points when every match is correct', () => {
    const answers = new Map([
      ['p1', 'p1'],
      ['p2', 'p2'],
      ['p3', 'p3'],
    ]);

    expect(scoreMatching(content, answers)).toBe(3);
  });

  it('gives no point for unanswered concepts', () => {
    expect(scoreMatching(content, new Map())).toBe(0);
  });

  it('counts a definition chosen for several concepts only where it is correct', () => {
    const answers = new Map([
      ['p1', 'p1'],
      ['p2', 'p1'],
      ['p3', 'p1'],
    ]);

    expect(scoreMatching(content, answers)).toBe(1);
  });
});
