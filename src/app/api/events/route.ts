import { NextResponse } from 'next/server';
import adminDb from '@/lib/firebase-admin/firestore';
import type { Event } from '@/schema/event';

/**
 * GET /api/events
 *
 * Public endpoint — no authentication required.
 * Returns all events ordered by startDate descending.
 * Strips any sensitive server-only fields before responding.
 */
export async function GET() {
  const snap = await adminDb
    .collection('events')
    .orderBy('startDate', 'desc')
    .get();

  const events = snap.docs.map((doc) => ({
    id: doc.id,
    ...(doc.data() as Omit<Event, 'id'>),
  }));

  return NextResponse.json({ events });
}
