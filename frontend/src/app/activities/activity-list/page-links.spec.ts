import { pageLinks } from './page-links';

describe('pageLinks', () => {
  it('shows every page when there are few', () => {
    expect(pageLinks(1, 1)).toEqual([1]);
    expect(pageLinks(2, 5)).toEqual([1, 2, 3, 4, 5]);
  });

  it('shows the first, last and neighbouring pages, with gaps between them', () => {
    expect(pageLinks(10, 20)).toEqual([1, null, 9, 10, 11, null, 20]);
  });

  it('shows a single missing page rather than a gap', () => {
    expect(pageLinks(4, 20)).toEqual([1, 2, 3, 4, 5, null, 20]);
    expect(pageLinks(17, 20)).toEqual([1, null, 16, 17, 18, 19, 20]);
  });

  it('keeps the first and last pages at both ends', () => {
    expect(pageLinks(1, 20)).toEqual([1, 2, null, 20]);
    expect(pageLinks(20, 20)).toEqual([1, null, 19, 20]);
  });

  it('only shows existing pages when the current page is after the last one', () => {
    expect(pageLinks(9, 3)).toEqual([1, 2, 3]);
  });
});
