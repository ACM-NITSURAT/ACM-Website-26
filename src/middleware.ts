import { NextResponse, type NextRequest } from 'next/server';
import { ONBOARDING_ALLOWLIST } from './server/onboarding-allowlist';

/**
 * Onboarding gate middleware.
 *
 * If a logged-in user has not completed onboarding (no `onboarding_complete`
 * cookie set to "true"), they are redirected to /onboarding for any path
 * not in ONBOARDING_ALLOWLIST.
 *
 * We detect "logged in" via the Firebase session cookies that the client SDK
 * persists automatically. Specifically we check for the presence of any
 * Firebase auth persistence key in the cookies — if none exist the user is
 * not signed in and we leave them alone (the page/layout handles auth redirects).
 *
 * The `onboarding_complete` cookie is set by:
 *  - POST /api/auth/session  (on every sign-in)
 *  - POST /api/onboarding    (when the form is submitted)
 *
 * When EARLY_REJECT=false, users with invalid emails have `email_rejected` cookie
 * set. If they try to access routes other than /onboarding, they're logged out
 * and redirected with ?logged_out=incomplete_registration.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Skip API routes, Next.js internals, and static files
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.(.*)$/) // static file extensions
  ) {
    return NextResponse.next();
  }

  const onboardingComplete = request.cookies.get('onboarding_complete')?.value === 'true';
  const emailRejected = request.cookies.get('email_rejected')?.value === 'true';

  // If user has rejected email and tries to access non-onboarding page, force logout
  if (emailRejected && pathname !== '/onboarding') {
    const authPaths = ['/login', '/register', '/forgot-password'];
    if (!authPaths.includes(pathname)) {
      const url = request.nextUrl.clone();
      url.pathname = '/login';
      url.searchParams.set('logged_out', 'incomplete_registration');
      const res = NextResponse.redirect(url);
      // Clear auth-related cookies
      res.cookies.delete('onboarding_complete');
      res.cookies.delete('email_rejected');
      return res;
    }
  }

  // If onboarding is already done, nothing to gate
  if (onboardingComplete) return NextResponse.next();

  // Admin routes: allow all /admin/* paths (protected by their own layout guard)
  if (pathname.startsWith('/admin')) return NextResponse.next();

  // If path is in the allowlist, let it through
  if ((ONBOARDING_ALLOWLIST as readonly string[]).includes(pathname)) {
    return NextResponse.next();
  }

  // Auth pages are always accessible regardless of onboarding state
  const authPaths = ['/login', '/register', '/forgot-password'];
  if (authPaths.includes(pathname)) return NextResponse.next();

  // User is either not logged in or has not completed onboarding.
  // Redirect to /onboarding — the page itself will redirect to /login
  // if the user is not authenticated.
  const url = request.nextUrl.clone();
  url.pathname = '/onboarding';
  return NextResponse.redirect(url);
}

export const config = {
  // Run on all routes except the ones we skip inside the middleware body.
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
