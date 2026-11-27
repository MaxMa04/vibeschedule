'use client';

import { useCallback } from 'react';
import { useFetch } from '@vibeschedule/helpers/utils/custom.fetch';
import { responseMessage } from '@vibeschedule/frontend/lib/response-message';

/** fetches JSON from the backend, a failed response throws its message */
export const useJson = () => {
  const fetch = useFetch();
  return useCallback(
    async (path: string, init?: RequestInit) => {
      const response = await fetch(path, init);
      if (!response.ok) {
        throw new Error(
          (await responseMessage(response)) || response.statusText
        );
      }
      const text = await response.text();
      return text ? JSON.parse(text) : null;
    },
    [fetch]
  );
};
