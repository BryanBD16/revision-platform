import { parseThemeNames } from './theme-names';

describe('parseThemeNames', () => {
  it('splits on commas and trims names', () => {
    expect(parseThemeNames(' Biology ,Cells ')).toEqual(['Biology', 'Cells']);
  });

  it('ignores empty entries', () => {
    expect(parseThemeNames('Biology,, ,Cells,')).toEqual(['Biology', 'Cells']);
  });

  it('removes duplicates ignoring case, keeping the first spelling', () => {
    expect(parseThemeNames('Biology, biology, BIOLOGY')).toEqual(['Biology']);
  });

  it('returns an empty list for blank text', () => {
    expect(parseThemeNames('   ')).toEqual([]);
  });
});
