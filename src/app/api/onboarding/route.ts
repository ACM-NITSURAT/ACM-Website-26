import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin/auth';
import adminDb from '@/lib/firebase-admin/firestore';
import type { User } from '@/schema/user';

const COOKIE = 'onboarding_complete';
const COOKIE_OPTS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production',
  sameSite: 'lax' as const,
  path: '/',
  maxAge: 60 * 60 * 24 * 365,
};

/**
 * POST /api/onboarding
 * Body: { idToken, firstName, lastName, gender }
 *
 * Saves the onboarding form, sets isOnboardingCompleted = true in Firestore,
 * and sets the onboarding_complete cookie so middleware stops gating.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken, firstName, lastName, gender } = body;

    if (!idToken || !firstName || !lastName || !gender) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const token = await verifyIdToken(idToken);
    const { uid } = token;

    const validGenders: User['gender'][] = ['male', 'female', 'other'];
    if (!validGenders.includes(gender)) {
      return NextResponse.json({ error: 'Invalid gender value' }, { status: 400 });
    }

    await adminDb.doc(`users/${uid}`).update({
      firstName:             firstName.trim(),
      lastName:              lastName.trim(),
      gender,
      isOnboardingCompleted: true,
    });

    const res = NextResponse.json({ success: true });
    res.cookies.set(COOKIE, 'true', COOKIE_OPTS);
    return res;
  } catch (err) {
    console.error('[POST /api/onboarding]', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
