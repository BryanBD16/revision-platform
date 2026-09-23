import { newItemId } from './item-ids';

describe('newItemId', () => {
  it('starts with the prefix and fits the API limit of 50 characters', () => {
    const id = newItemId('c-', new Set());

    expect(id).toMatch(/^c-[0-9a-z]+$/);
    expect(id.length).toBeLessThanOrEqual(50);
  });

  it('never returns an id that is already taken', () => {
    const taken = new Set<string>();
    for (let i = 0; i < 1000; i++) {
      const id = newItemId('p-', taken);
      expect(taken.has(id)).toBe(false);
      taken.add(id);
    }
  });
});
