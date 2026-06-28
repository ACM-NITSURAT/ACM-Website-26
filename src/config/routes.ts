/**
 * Route access configuration.
 *
 * PUBLIC_ROUTES — accessible to everyone with no authentication required.
 *   Supports exact strings and prefix patterns (ending with /*).
 *   The middleware skips ALL auth/onboarding gates for these routes.
 *
 * Why prefix patterns matter:
 *   /events/*  → covers /events/hackathon-2025, /events/hackathon-2025/register
 *                This is critical for unauthenticated forms: if an event has
 *                unregisteredForm=true, the registration page must be reachable
 *                without login. The API itself enforces auth when required.
 */
export const PUBLIC_ROUTES: readonly string[] = [
  // ── Marketing / public pages ──────────────────────────────────────────────
  '/',
  '/about',
  '/projects',
  '/team',
  '/join',

  // ── Events (fully public — includes detail and register pages) ────────────
  '/events',
  '/events/*',

  // ── Auth pages ────────────────────────────────────────────────────────────
  '/login',
  '/register',
  '/forgot-password',
];

/**
 * Returns true if the given pathname matches any entry in PUBLIC_ROUTES.
 * Supports exact match and prefix wildcard (e.g. '/events/*').
 */
export function isPublicRoute(pathname: string): boolean {
  for (const route of PUBLIC_ROUTES) {
    if (route.endsWith('/*')) {
      const prefix = route.slice(0, -2); // strip '/*'
      if (pathname === prefix || pathname.startsWith(prefix + '/')) return true;
    } else {
      if (pathname === route) return true;
    }
  }
  return false;
}
