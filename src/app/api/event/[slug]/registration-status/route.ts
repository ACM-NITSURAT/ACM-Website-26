import { NextResponse, type NextRequest } from 'next/server';
import adminDb from '@/lib/firebase-admin/firestore';
import { verifyIdToken } from '@/lib/firebase-admin/auth';
import type { Event } from '@/schema/event';

/**
 * GET /api/event/[slug]/registration-status
 *
 * Returns whether the authenticated user is already registered for this event.
 * Requires a valid Firebase ID token in the Authorization header.
 *
 * Response: { registered: boolean }
 *  - 200 registered: false  — user is not registered
 *  - 200 registered: true   — user is already registered
 *  - 401                    — no or invalid token
 *  - 404                    — event not found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // Require auth
  const authHeader = request.headers.get('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
  if (!idToken) {
    return NextResponse.json({ error: 'Authentication required.' }, { status: 401 });
  }

  let uid: string;
  try {
    const token = await verifyIdToken(idToken);
    uid = token.uid;
  } catch {
    return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
  }

  // Resolve event by slug
  const snap = await adminDb
    .collection('events')
    .where('slug', '==', slug)
    .limit(1)
    .get();

  if (snap.empty) {
    return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  }

  const eventDoc = snap.docs[0];
  const event = eventDoc.data() as Event;
  const participantsRef = adminDb
    .collection('events')
    .doc(eventDoc.id)
    .collection('participants');

  let registered = false;

  if (!event.isTeamEvent) {
    // Individual: check by userId
    const q = await participantsRef
      .where('isTeam', '==', false)
      .where('userId', '==', uid)
      .limit(1)
      .get();
    registered = !q.empty;
  } else {
    // Team: check if user is the leader of any team
    const q = await participantsRef
      .where('isTeam', '==', true)
      .where('leaderId', '==', uid)
      .limit(1)
      .get();
    registered = !q.empty;
  }

  return NextResponse.json({ registered });
}
