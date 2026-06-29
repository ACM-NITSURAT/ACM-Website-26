import { NextResponse } from 'next/server';

/**
 * POST /api/onboarding/heal
 *
 * Sets the onboarding_complete cookie to "true" without any DB write.
 * Called when the onboarding page discovers the Firestore doc already has
 * isOnboardingCompleted=true but the cookie is missing (e.g. new device sign-in).
 *
 * No body required. No auth check needed — the worst an attacker can do is
 * set a cookie that lets them skip a UI form; the actual gate is Firestore.
 */
export async function POST() {
  const res = NextResponse.json({ healed: true });
  res.cookies.set('onboarding_complete', 'true', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 365,
  });
  return res;
}
