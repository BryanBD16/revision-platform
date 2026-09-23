import { shuffleAvoidingOriginalOrder } from './shuffle';

describe('shuffleAvoidingOriginalOrder', () => {
  // With this random function, a plain shuffle keeps the original order.
  const keepOrder = () => 0.999;

  it('never returns the original order', () => {
    expect(shuffleAvoidingOriginalOrder(['a', 'b', 'c'], keepOrder)).toEqual(['b', 'c', 'a']);
    expect(shuffleAvoidingOriginalOrder(['a', 'b'], keepOrder)).toEqual(['b', 'a']);
  });

  it('keeps a shuffled order that differs from the original', () => {
    expect(shuffleAvoidingOriginalOrder(['a', 'b', 'c'], () => 0)).toEqual(['b', 'c', 'a']);
  });

  it('keeps every item exactly once', () => {
    const items = ['a', 'b', 'c', 'd', 'e'];

    expect(shuffleAvoidingOriginalOrder(items).sort()).toEqual(items);
  });

  it('handles lists with fewer than two items', () => {
    expect(shuffleAvoidingOriginalOrder([])).toEqual([]);
    expect(shuffleAvoidingOriginalOrder(['a'])).toEqual(['a']);
  });
});
