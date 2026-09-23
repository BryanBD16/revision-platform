import { convertToParamMap } from '@angular/router';
import { EMPTY_QUERY, hasFilters, paramsFromQuery, queryFromParams } from './activity-list-query';

describe('activity list query', () => {
  it('reads the page from the URL', () => {
    expect(queryFromParams(convertToParamMap({ page: '3' }))).toEqual({ ...EMPTY_QUERY, page: 3 });
  });

  it.each(['', '0', '-2', '1.5', 'abc'])(
    'uses the first page for the invalid page "%s"',
    (page) => {
      expect(queryFromParams(convertToParamMap({ page }))).toEqual(EMPTY_QUERY);
    },
  );

  it('reads the filters from the URL, ignoring invalid ids', () => {
    const params = convertToParamMap({
      title: '  cell ',
      courseId: '3',
      themeIds: ['1', 'x', '2', '1', '-4'],
    });

    expect(queryFromParams(params)).toEqual({
      page: 1,
      title: 'cell',
      courseId: 3,
      themeIds: [1, 2],
      visibility: null,
    });
  });

  it('reads the visibility from the URL, ignoring unknown values', () => {
    expect(queryFromParams(convertToParamMap({ visibility: 'private' })).visibility).toBe(
      'private',
    );
    expect(queryFromParams(convertToParamMap({ visibility: 'public' })).visibility).toBe('public');
    expect(queryFromParams(convertToParamMap({ visibility: 'friends' })).visibility).toBeNull();
  });

  it('ignores a blank title and an invalid course', () => {
    const params = convertToParamMap({ title: '  ', courseId: 'abc' });

    expect(queryFromParams(params)).toEqual(EMPTY_QUERY);
  });

  it('leaves the default values out of the URL', () => {
    expect(paramsFromQuery(EMPTY_QUERY)).toEqual({
      page: null,
      title: null,
      courseId: null,
      themeIds: null,
      visibility: null,
    });
    expect(
      paramsFromQuery({
        page: 4,
        title: 'cell',
        courseId: 3,
        themeIds: [1, 2],
        visibility: 'public',
      }),
    ).toEqual({
      page: 4,
      title: 'cell',
      courseId: 3,
      themeIds: [1, 2],
      visibility: 'public',
    });
  });

  it('tells whether a filter is set', () => {
    expect(hasFilters({ ...EMPTY_QUERY, page: 2 })).toBe(false);
    expect(hasFilters({ ...EMPTY_QUERY, title: 'cell' })).toBe(true);
    expect(hasFilters({ ...EMPTY_QUERY, courseId: 3 })).toBe(true);
    expect(hasFilters({ ...EMPTY_QUERY, themeIds: [1] })).toBe(true);
    expect(hasFilters({ ...EMPTY_QUERY, visibility: 'private' })).toBe(true);
  });
});
