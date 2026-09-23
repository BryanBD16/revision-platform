import { safeReturnUrl } from './return-url';

describe('safeReturnUrl', () => {
  it('keeps a path of the application', () => {
    expect(safeReturnUrl('/activities/new?x=1')).toBe('/activities/new?x=1');
  });

  it.each([null, '', 'https://evil.example', '//evil.example', '/\\evil.example', 'activities'])(
    'uses the activity list instead of "%s"',
    (value) => {
      expect(safeReturnUrl(value)).toBe('/activities');
    },
  );
});
