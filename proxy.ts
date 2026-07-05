/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { SESSION_COOKIE, verifySessionToken } from '@/lib/session';

const protectedPrefixes = [
  '/dashboard',
  '/billing',
  '/rooms',
  '/foods',
  '/guests',
  '/reports',
  '/users',
  '/expenses',
  '/settings',
  '/logs',
];

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const token = request.cookies.get(SESSION_COOKIE)?.value;
  const session = token ? await verifySessionToken(token) : null;

  if (pathname === '/login' && session) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  const isProtected = protectedPrefixes.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );

  if (isProtected && !session) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    '/login',
    '/dashboard/:path*',
    '/billing/:path*',
    '/rooms/:path*',
    '/foods/:path*',
    '/guests/:path*',
    '/reports/:path*',
    '/users/:path*',
    '/expenses/:path*',
    '/settings/:path*',
    '/logs/:path*',
  ],
};
