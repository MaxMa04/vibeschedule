'use client';

import { useSearchParams } from 'next/navigation';
import { FC, useCallback, useEffect } from 'react';
import { sameOriginUrl as onThisApp } from '@vibeschedule/helpers/utils/same.origin.url';

const sameOriginUrl = (url: string | null) =>
  onThisApp(url, window.location.origin);

const ReturnUrlComponent: FC = () => {
  const params = useSearchParams();
  const url = params.get('returnUrl');
  useEffect(() => {
    const returnUrl = sameOriginUrl(url);
    if (returnUrl) {
      localStorage.setItem('returnUrl', returnUrl);
    }
  }, [url]);
  return null;
};
export const useReturnUrl = () => {
  return {
    getAndClear: useCallback(() => {
      const data = localStorage.getItem('returnUrl');
      localStorage.removeItem('returnUrl');
      // also on read: localStorage can hold a value saved before this check
      return sameOriginUrl(data);
    }, []),
  };
};
export default ReturnUrlComponent;
