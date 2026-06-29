import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin/auth';
import adminDb from '@/lib/firebase-admin/firestore';

const COOKIE = 'onboarding_complete';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
};

/**
 * POST /api/onboarding/heal
 * Body: { idToken }
 *
 * Sets the onboarding_complete cookie to "true" without any DB write.
 * Called when the onboarding page discovers the Firestore doc already has
 * isOnboardingCompleted=true but the cookie is missing (e.g. new device sign-in).
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken } = body;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const token = await verifyIdToken(idToken);
    const { uid } = token;

    const snap = await adminDb.doc(`users/${uid}`).get();
    if (!snap.exists || !snap.data()?.isOnboardingCompleted) {
      return NextResponse.json({ error: 'Onboarding has not been completed' }, { status: 403 });
    }

    const res = NextResponse.json({ healed: true });
    res.cookies.set(COOKIE, 'true', COOKIE_OPTS);
    return res;
  } catch (err) {
    console.error('[POST /api/onboarding/heal]', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}

