import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

const PASSWORD = 'cara';
const COOKIE_NAME = 'cara-hq-auth';

export function middleware(request: NextRequest) {
  // Skip auth for API routes and static files
  if (
    request.nextUrl.pathname.startsWith('/api/') ||
    request.nextUrl.pathname.startsWith('/_next/') ||
    request.nextUrl.pathname === '/login' ||
    request.nextUrl.pathname === '/favicon.ico'
  ) {
    return NextResponse.next();
  }

  // Check for auth cookie
  const authCookie = request.cookies.get(COOKIE_NAME);
  if (authCookie?.value === 'authenticated') {
    return NextResponse.next();
  }

  // Check for password in query param (for login)
  const password = request.nextUrl.searchParams.get('password');
  if (password === PASSWORD) {
    const response = NextResponse.redirect(new URL('/', request.url));
    response.cookies.set(COOKIE_NAME, 'authenticated', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
    return response;
  }

  // Redirect to login page
  return NextResponse.redirect(new URL('/login', request.url));
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
