import { shuffle } from './shuffle';

describe('shuffle', () => {
  it('keeps every item exactly once', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];

    expect(shuffle(items).sort()).toEqual(items);
  });

  it('uses the random function to choose the order', () => {
    // With 0, each item is swapped with the first one: [a, b, c] -> [c, b, a] -> [b, c, a].
    expect(shuffle(['a', 'b', 'c'], () => 0)).toEqual(['b', 'c', 'a']);
    // With a value close to 1, each item stays in place.
    expect(shuffle(['a', 'b', 'c'], () => 0.999)).toEqual(['a', 'b', 'c']);
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
