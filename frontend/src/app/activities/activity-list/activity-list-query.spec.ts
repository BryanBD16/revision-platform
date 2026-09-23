import { convertToParamMap } from '@angular/router';
import { paramsFromQuery, queryFromParams } from './activity-list-query';

describe('activity list query', () => {
  it('reads the page from the URL', () => {
    expect(queryFromParams(convertToParamMap({ page: '3' }))).toEqual({ page: 3 });
  });

  it.each(['', '0', '-2', '1.5', 'abc'])(
    'uses the first page for the invalid page "%s"',
    (page) => {
      expect(queryFromParams(convertToParamMap({ page }))).toEqual({ page: 1 });
    },
  );

  it('leaves the first page out of the URL', () => {
    expect(paramsFromQuery({ page: 1 })).toEqual({ page: null });
    expect(paramsFromQuery({ page: 4 })).toEqual({ page: 4 });
  });
});
