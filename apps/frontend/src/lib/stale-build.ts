// After a deploy the old page still asks for JS chunks of the previous build,
// which the new container no longer serves. A full reload loads the new build.
const RELOAD_KEY = 'vibeschedule:stale-build-reload';

export const isStaleBuildError = (error: unknown) => {
  const text = `${(error as Error)?.name ?? ''} ${(error as Error)?.message ?? ''}`;
  return /ChunkLoadError|Loading (CSS )?chunk|Failed to load chunk|Failed to fetch dynamically imported module|Importing a module script failed/i.test(
    text
  );
};

/** Reloads once per minute at most, so a real outage does not loop. Returns true when it reloads. */
export const reloadForStaleBuild = (error: unknown) => {
  if (!isStaleBuildError(error)) {
    return false;
  }
  try {
    const last = Number(sessionStorage.getItem(RELOAD_KEY) || 0);
    if (Date.now() - last < 60_000) {
      return false;
    }
    sessionStorage.setItem(RELOAD_KEY, String(Date.now()));
  } catch {
    return false;
  }
  window.location.reload();
  return true;
};
