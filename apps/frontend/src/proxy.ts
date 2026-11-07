import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { getCookieUrlFromDomain } from '@vibeschedule/helpers/subdomain/subdomain.management';

export async function proxy(request: NextRequest) {
  const nextUrl = request.nextUrl;
  const authCookie =
    request.cookies.get('auth') ||
    request.headers.get('auth') ||
    nextUrl.searchParams.get('loggedAuth');

  // static files from public/ need no login
  if (/\.\w+$/.test(nextUrl.pathname)) {
    return NextResponse.next();
  }

  if (nextUrl.href.indexOf('/auth/logout') > -1) {
    const response = NextResponse.redirect(
      new URL('/auth/login', nextUrl.href)
    );
    response.cookies.set('auth', '', {
      path: '/',
      ...(!process.env.NOT_SECURED
        ? {
            secure: true,
            httpOnly: true,
            sameSite: false,
          }
        : {}),
      maxAge: -1,
      domain: getCookieUrlFromDomain(process.env.FRONTEND_URL!),
    });
    return response;
  }

  const search = new URL(nextUrl).search;
  if (!nextUrl.pathname.startsWith('/auth') && !authCookie) {
    // the PfM OAuth return page needs a login first, then continues
    const returnUrl = nextUrl.pathname.startsWith('/integrations/social/')
      ? `?returnUrl=${encodeURIComponent(nextUrl.href)}`
      : '';
    return NextResponse.redirect(
      new URL(`/auth/login${returnUrl}`, nextUrl.href)
    );
  }

  if (nextUrl.pathname.startsWith('/auth') && authCookie) {
    return NextResponse.redirect(new URL(`/${search}`, nextUrl.href));
  }

  if (nextUrl.pathname === '/' || nextUrl.pathname === '/auth') {
    return NextResponse.redirect(
      new URL(authCookie ? '/launches' : '/auth/login', nextUrl.href)
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: '/((?!api/|_next/|_static/|_vercel|[\\w-]+\\.\\w+).*)',
};
