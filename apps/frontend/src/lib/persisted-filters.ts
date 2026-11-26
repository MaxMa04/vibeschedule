/** Filter params of a page by name; a missing key is the default value */
export type FilterState = Record<string, string>;

/** The filter params of a query string, empty values dropped */
export const pickFilters = (
  query: string,
  keys: readonly string[]
): FilterState => {
  const params = new URLSearchParams(query);
  const state: FilterState = {};
  for (const key of keys) {
    const value = params.get(key);
    if (value) state[key] = value;
  }
  return state;
};

/** What localStorage holds for a page; anything unexpected counts as nothing */
export const parseSaved = (
  raw: string | null | undefined,
  keys: readonly string[]
): FilterState => {
  if (!raw) return {};
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    return {};
  }
  if (!json || typeof json !== 'object' || Array.isArray(json)) return {};
  const state: FilterState = {};
  for (const key of keys) {
    const value = (json as Record<string, unknown>)[key];
    if (typeof value === 'string' && value) state[key] = value;
  }
  return state;
};

/**
 * The query to open the page with: filter params the URL already has win
 * (a link into the page), the missing ones come from the saved filters.
 * null when there is nothing to restore.
 */
export const restoreQuery = (
  query: string,
  keys: readonly string[],
  saved: FilterState
): string | null => {
  const params = new URLSearchParams(query);
  let changed = false;
  for (const key of keys) {
    if (!params.get(key) && saved[key]) {
      params.set(key, saved[key]);
      changed = true;
    }
  }
  return changed ? params.toString() : null;
};

export const sameFilters = (a: FilterState, b: FilterState) => {
  const keys = Object.keys(a);
  return (
    keys.length === Object.keys(b).length && keys.every((k) => a[k] === b[k])
  );
};
