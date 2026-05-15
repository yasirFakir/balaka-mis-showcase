import createMiddleware from 'next-intl/middleware';
import { routing } from './i18n/navigation';
 
export default createMiddleware(routing);
 
export const config = {
  // Match only internationalized pathnames
  matcher: [
    // Match all pathnames except for
    // - API routes
    // - Static files (e.g. /favicon.ico, /logo.png)
    // - _next/static, _next/image
    '/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)',
    // Match the root
    '/'
  ]
};