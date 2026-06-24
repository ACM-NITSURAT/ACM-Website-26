/**
 * Paths a logged-in user may visit before completing onboarding.
 *
 * All other routes will trigger the onboarding gate (redirect to /onboarding).
 * Add paths here only when you explicitly want to allow pre-onboarding access.
 *
 * Rules:
 * - Exact match only (no wildcards).
 * - Always include '/onboarding' itself so the form is reachable.
 * - Auth routes (/login, /register, /forgot-password) are handled separately
 *   by the auth layout and are not needed here.
 */
export const ONBOARDING_ALLOWLIST: readonly string[] = [
  '/',
  '/onboarding',
  '/admin',
  '/admin/events',
  '/admin/create/event',
];
