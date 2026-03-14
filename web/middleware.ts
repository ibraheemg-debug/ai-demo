import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/routing';

/**
 * next-intl middleware handles:
 * – Locale detection (Accept-Language header + NEXT_LOCALE cookie)
 * – Cookie-based persistence across refreshes
 * – URL rewriting to the /[locale]/... pattern
 */
export default createMiddleware(routing);

export const config = {
  // Match every path except Next.js internals and static assets
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)'],
};
