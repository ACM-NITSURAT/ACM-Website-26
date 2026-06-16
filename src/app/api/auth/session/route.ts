import { NextResponse } from 'next/server';
import { verifyIdToken, syncUser } from '@/lib/firebase-admin/auth';
import { isValidSvnitEmail, SVNIT_EMAIL_ERROR } from '@/lib/validators/email';
import { EARLY_REJECT } from '@/config';

const ONBOARDING_COOKIE = 'onboarding_complete';
const EMAIL_REJECTED_COOKIE = 'email_rejected';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 365, // 1 year
};

/**
 * POST /api/auth/session
 * Body: { idToken: string }
 *
 * Syncs Firestore user doc, writes role custom claim, and sets the
 * `onboarding_complete` cookie so middleware can gate routes without
 * hitting Firestore on every request.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken: string = body?.idToken;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const token = await verifyIdToken(idToken);

    const devMode = process.env.DEV_MODE === 'true';
    if (!isValidSvnitEmail(token.email ?? '', devMode)) {
      // When EARLY_REJECT=false, set cookie so middleware can enforce logout
      const res = NextResponse.json({ error: SVNIT_EMAIL_ERROR }, { status: 403 });
      if (!EARLY_REJECT) {
        res.cookies.set(EMAIL_REJECTED_COOKIE, 'true', COOKIE_OPTS);
      }
      return res;
    }

    const { role, isOnboardingCompleted } = await syncUser(token);

    const res = NextResponse.json({ role, isOnboardingCompleted });
    res.cookies.set(ONBOARDING_COOKIE, String(isOnboardingCompleted), COOKIE_OPTS);
    // Clear email_rejected cookie if it was set previously
    res.cookies.delete(EMAIL_REJECTED_COOKIE);
    return res;
  } catch (err) {
    console.error('[POST /api/auth/session]', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
