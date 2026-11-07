import { Response } from 'express';
import { getCookieUrlFromDomain } from '@vibeschedule/helpers/subdomain/subdomain.management';

// NOT_SECURED is local http: no secure cookie, the token also goes in a header
const cookieOptions = () => ({
  domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
  ...(!process.env.NOT_SECURED
    ? { secure: true, httpOnly: true, sameSite: 'none' as const }
    : {}),
});

export const setAuthCookie = (res: Response, jwt: string) => {
  res.cookie('auth', jwt, {
    ...cookieOptions(),
    expires: new Date(Date.now() + 1000 * 60 * 60 * 24 * 365),
  });
  if (process.env.NOT_SECURED) {
    res.header('auth', jwt);
  }
};

export const clearAuthCookie = (res: Response) => {
  res.cookie('auth', '', { ...cookieOptions(), expires: new Date(0) });
  res.header('logout', 'true');
};
