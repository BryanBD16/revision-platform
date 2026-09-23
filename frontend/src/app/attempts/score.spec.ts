import { scoreText } from './score';

describe('scoreText', () => {
  it('shows the score and the rounded percentage', () => {
    expect(scoreText(2, 3)).toBe('2 / 3 (67%)');
    expect(scoreText(0, 1)).toBe('0 / 1 (0%)');
  });

  it('returns null when nothing is graded', () => {
    expect(scoreText(null, null)).toBeNull();
  });
});
