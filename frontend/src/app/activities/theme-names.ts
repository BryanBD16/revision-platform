/**
 * Parses a comma-separated list of theme or course names: trims each name, drops empty
 * ones and removes duplicates ignoring case (keeping the first spelling).
 */
export function parseThemeNames(text: string): string[] {
  const names: string[] = [];
  const seen = new Set<string>();

  for (const part of text.split(',')) {
    const name = part.trim();
    const key = name.toLocaleLowerCase();
    if (name && !seen.has(key)) {
      seen.add(key);
      names.push(name);
    }
  }

  return names;
}
