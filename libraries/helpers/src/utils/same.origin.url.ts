// A return address is only followed when it stays on this app, so signing in
// can never send someone to another site or run a javascript: URL. A path
// counts as this app. No imports: `node --test` runs this file as is.
export const sameOriginUrl = (url: string | null, origin: string) => {
  if (!url) {
    return null;
  }
  try {
    const parsed = new URL(url, origin);
    return parsed.origin === new URL(origin).origin ? parsed.toString() : null;
  } catch {
    return null;
  }
};
