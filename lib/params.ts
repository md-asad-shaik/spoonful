/**
 * Reads the page number from a URL like /recipes/page/2/.
 * Returns null for anything that isn't a whole number >= 2
 * (page 1 lives at /recipes/ and /recipes/page/1/ redirects there).
 */
export function parsePageNumber(value: string | undefined): number | null {
  if (!value || !/^\d+$/.test(value)) return null;
  const page = Number(value);
  return page >= 2 ? page : null;
}
