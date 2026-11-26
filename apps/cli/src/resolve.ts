// Formats and apps take an ID or their name (names are unique per workspace),
// users an ID or their email
export function resolveId(
  value: string,
  items: { id: string; name?: string | null; email?: string }[],
  label: string
) {
  const wanted = value.trim().toLowerCase();
  const item =
    items.find((i) => i.id === value.trim()) ||
    items.find(
      (i) =>
        i.name?.trim().toLowerCase() === wanted ||
        i.email?.toLowerCase() === wanted
    );
  if (!item) {
    throw new Error(
      `${label} "${value}" nicht gefunden. Vorhanden: ${
        items.map((i) => i.name || i.email || i.id).join(', ') || 'keine'
      }`
    );
  }
  return item.id;
}

// "a,b" or "none" for an empty list
export function idList(value: string) {
  return value.trim().toLowerCase() === 'none'
    ? []
    : value
        .split(',')
        .map((id) => id.trim())
        .filter(Boolean);
}
