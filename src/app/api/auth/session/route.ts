import { NextResponse } from 'next/server';
import { verifyIdToken, syncUser } from '@/lib/firebase-admin/auth';

/**
 * POST /api/auth/session
 *
 * Called by the client immediately after every Firebase sign-in or registration.
 * Body: { idToken: string }
 *
 * Workflow:
 *  1. Verify the ID token with Admin SDK.
 *  2. Create/update /users/{uid} in Firestore (syncUser).
 *  3. Write role as a custom claim on the JWT.
 *  4. Return the resolved role so the client can force-refresh its token.
 *
 * The client must call auth.currentUser.getIdToken(true) after this
 * to get a new JWT that contains the updated role claim.
 */
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const idToken: string = body?.idToken;

    if (!idToken || typeof idToken !== 'string') {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const token = await verifyIdToken(idToken);
    const role  = await syncUser(token);

    return NextResponse.json({ role });
  } catch (err) {
    console.error('[POST /api/auth/session]', err);
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
}
