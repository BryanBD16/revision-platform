import { shuffle } from './shuffle';

describe('shuffle', () => {
  it('keeps every item exactly once', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];

    expect(shuffle(items).sort()).toEqual(items);
  });

  it('never returns the original order', () => {
    // With this random function, the Fisher-Yates shuffle leaves the order unchanged.
    const keepOrder = () => 0.999;

    expect(shuffle(['a', 'b', 'c'], keepOrder)).not.toEqual(['a', 'b', 'c']);
    expect(shuffle(['a', 'b'], keepOrder)).toEqual(['b', 'a']);
  });

  it('does not modify the given list', () => {
    const items = ['a', 'b', 'c'];

    shuffle(items);

    expect(items).toEqual(['a', 'b', 'c']);
  });

  it('handles lists with fewer than two items', () => {
    expect(shuffle([])).toEqual([]);
    expect(shuffle(['a'])).toEqual(['a']);
  });
});
