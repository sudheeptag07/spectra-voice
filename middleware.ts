import { NextRequest, NextResponse } from 'next/server';
import { DASHBOARD_AUTH_COOKIE, getDashboardPassword } from '@/lib/dashboard-auth';

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const password = getDashboardPassword();

  // If no password is configured, do not block dashboard routes.
  if (!password) {
    return NextResponse.next();
  }

  const cookieValue = request.cookies.get(DASHBOARD_AUTH_COOKIE)?.value;
  const isAuthed = cookieValue === password;

  if (pathname.startsWith('/dashboard-login')) {
    if (isAuthed) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
    return NextResponse.next();
  }

  if (pathname.startsWith('/dashboard') && !isAuthed) {
    const loginUrl = new URL('/dashboard-login', request.url);
    loginUrl.searchParams.set('next', `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/dashboard-login']
};
