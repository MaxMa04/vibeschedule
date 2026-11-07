'use client';

import { ReactNode, useCallback } from 'react';
import { FetchWrapperComponent } from '@vibeschedule/helpers/utils/custom.fetch';
import { useReturnUrl } from '@vibeschedule/frontend/app/(app)/auth/return.url.component';
import { useVariables } from '@vibeschedule/react/helpers/variable.context';

export function setCookie(cname: string, cvalue: string, exdays: number) {
  const d = new Date();
  d.setTime(d.getTime() + exdays * 24 * 60 * 60 * 1000);
  document.cookie =
    cname + '=' + cvalue + ';expires=' + d.toUTCString() + ';path=/';
}

export default function LayoutContext({ children }: { children: ReactNode }) {
  const returnUrl = useReturnUrl();
  const { backendUrl, isSecured } = useVariables();
  const afterRequest = useCallback(
    async (url: string, options: RequestInit, response: Response) => {
      const headerAuth =
        response.headers.get('auth') || response.headers.get('Auth');
      const logout =
        response.headers.get('logout') || response.headers.get('Logout');
      if (headerAuth) {
        setCookie('auth', headerAuth, 365);
      }

      if (response.headers.get('reload')) {
        window.location.href = returnUrl.getAndClear() || '/launches';
        return true;
      }

      if (response.status === 401 || logout) {
        if (!isSecured) {
          setCookie('auth', '', -10);
        }
        window.location.href = '/';
      }
      return true;
    },
    []
  );
  return (
    <FetchWrapperComponent baseUrl={backendUrl} afterRequest={afterRequest}>
      {children}
    </FetchWrapperComponent>
  );
}
