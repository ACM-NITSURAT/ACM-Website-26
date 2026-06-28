import { NextResponse, type NextRequest } from 'next/server';
import { ONBOARDING_ALLOWLIST } from './server/onboarding-allowlist';
import { isPublicRoute } from './config/routes';

/**
 * Route guard middleware.
 *
 * Gate 1 — Public routes:
 *   If the path matches PUBLIC_ROUTES (see src/config/routes.ts), let it
 *   through unconditionally. No auth, no onboarding checks. This is the
 *   single source of truth for what is publicly accessible.
 *
 *   Crucially, /events/* is public so that:
 *    - Anyone can browse events without logging in.
 *    - Unauthenticated registration forms (unregisteredForm=true) can be
 *      filled without forcing a login. The API itself enforces auth where
 *      required — the middleware doesn't need to.
 *
 * Gate 2 — Email rejected:
 *   If the `email_rejected` cookie is set and the user tries to access any
 *   non-auth page, they are redirected to /login with ?logged_out=incomplete_registration
 *   and their cookies are cleared. This handles the EARLY_REJECT=false case
 *   where the invalid-email is caught at onboarding submit time.
 *
 * Gate 3 — Onboarding:
 *   If `onboarding_complete` cookie is not set, logged-in users are redirected
 *   to /onboarding unless the path is in ONBOARDING_ALLOWLIST.
 *   Unauthenticated users are also redirected there — the /onboarding page
 *   itself redirects them to /login.
 *
 *   Admin routes are exempt from the onboarding gate (they have their own
 *   layout-level auth guard).
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // ── Skip infrastructure paths unconditionally ─────────────────────────────
  if (
    pathname.startsWith('/api/') ||
    pathname.startsWith('/_next/') ||
    pathname.startsWith('/favicon') ||
    pathname.match(/\.\w+$/) // static files (e.g. .png, .svg, .ico)
  ) {
    return NextResponse.next();
  }

  // ── Gate 1: Public routes — always accessible, no auth needed ─────────────
  if (isPublicRoute(pathname)) {
    return NextResponse.next();
  }

  const onboardingComplete = request.cookies.get('onboarding_complete')?.value === 'true';
  const emailRejected      = request.cookies.get('email_rejected')?.value === 'true';

  // ── Gate 2: Email rejected — force logout ─────────────────────────────────
  if (emailRejected && pathname !== '/onboarding') {
    const url = request.nextUrl.clone();
    url.pathname = '/login';
    url.searchParams.set('logged_out', 'incomplete_registration');
    const res = NextResponse.redirect(url);
    res.cookies.delete('onboarding_complete');
    res.cookies.delete('email_rejected');
    return res;
  }

  // ── Gate 3: Onboarding ────────────────────────────────────────────────────

  // Already done — nothing to gate.
  if (onboardingComplete) return NextResponse.next();

  // Admin routes are protected by their own layout guard, not onboarding.
  if (pathname.startsWith('/admin')) return NextResponse.next();

  // Paths explicitly allowed for pre-onboarding users.
  if ((ONBOARDING_ALLOWLIST as readonly string[]).includes(pathname)) {
    return NextResponse.next();
  }

  // Redirect to onboarding (which in turn redirects unauthenticated users to /login).
  const url = request.nextUrl.clone();
  url.pathname = '/onboarding';
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
