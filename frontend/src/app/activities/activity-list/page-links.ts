/** A page number to link to, or null for the gap ("…") between two numbers. */
export type PageLink = number | null;

/**
 * The page numbers to show in the pagination: the first and last pages and the
 * pages next to the current one, for example 1 … 4 5 6 … 20. A gap of a single
 * page shows that page, since "…" would take the same room.
 */
export function pageLinks(current: number, total: number): PageLink[] {
  const shown = [1, current - 1, current, current + 1, total]
    .filter((page) => page >= 1 && page <= total)
    .sort((a, b) => a - b);

  const links: PageLink[] = [];
  for (const page of new Set(shown)) {
    const previous = links.at(-1);
    if (typeof previous === 'number' && page - previous === 2) {
      links.push(previous + 1);
    } else if (typeof previous === 'number' && page - previous > 2) {
      links.push(null);
    }
    links.push(page);
  }
  return links;
}
