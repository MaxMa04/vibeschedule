'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  FilterState,
  parseSaved,
  pickFilters,
  restoreQuery,
  sameFilters,
} from '@vibeschedule/frontend/lib/persisted-filters';

const storageKey = (page: string) => `vibeschedule:filters:${page}`;

const readSaved = (page: string) => {
  try {
    return localStorage.getItem(storageKey(page));
  } catch {
    return null;
  }
};

const writeSaved = (page: string, state: FilterState) => {
  try {
    if (Object.keys(state).length) {
      localStorage.setItem(storageKey(page), JSON.stringify(state));
    } else {
      localStorage.removeItem(storageKey(page));
    }
  } catch {
    /* storage blocked: the filters live in the URL only */
  }
};

/**
 * Keeps the filter params of a page in the URL and in localStorage. Opened
 * without them, the page gets the saved ones back. `ready` stays false until
 * then, so the page does not load data for the wrong filters first.
 */
export const usePersistedFilters = (page: string, keys: readonly string[]) => {
  const params = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();
  const query = params.toString();
  const keyList = keys.join(',');
  const [ready, setReady] = useState(false);
  const target = useRef<FilterState | null>(null);

  useEffect(() => {
    const filterKeys = keyList.split(',');
    const current = pickFilters(query, filterKeys);
    if (ready) {
      writeSaved(page, current);
      return;
    }
    if (target.current) {
      // waits for the router to show the restored params
      if (sameFilters(current, target.current)) setReady(true);
      return;
    }
    const next = restoreQuery(query, filterKeys, parseSaved(readSaved(page), filterKeys));
    if (next === null) {
      writeSaved(page, current);
      setReady(true);
      return;
    }
    target.current = pickFilters(next, filterKeys);
    router.replace(`${pathname}?${next}`, { scroll: false });
  }, [query, ready, page, keyList, pathname, router]);

  // sets params, null removes one (= default value)
  const setParams = useCallback(
    (next: Record<string, string | null>) => {
      const updated = new URLSearchParams(window.location.search);
      for (const [key, value] of Object.entries(next)) {
        if (value) updated.set(key, value);
        else updated.delete(key);
      }
      const qs = updated.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [pathname, router]
  );

  return { ready, params, setParams };
};
