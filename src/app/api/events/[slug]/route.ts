import { NextResponse, type NextRequest } from 'next/server';
import adminDb from '@/lib/firebase-admin/firestore';
import type { Event } from '@/schema/event';
import type { EventForm } from '@/schema/form';

/**
 * GET /api/events/[slug]
 *
 * Public endpoint — no authentication required.
 * Returns a single event by slug, plus the form schema if one exists.
 */
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  const snap = await adminDb
    .collection('events')
    .where('slug', '==', slug)
    .limit(1)
    .get();

  if (snap.empty) {
    return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  }

  const doc = snap.docs[0];
  const event: Event = { id: doc.id, ...(doc.data() as Omit<Event, 'id'>) };

  // Fetch form schema if it exists
  let form: EventForm | null = null;
  if (event.hasForm) {
    const formSnap = await adminDb
      .collection('events')
      .doc(doc.id)
      .collection('form')
      .doc('config')
      .get();
    if (formSnap.exists) {
      form = formSnap.data() as EventForm;
    }
  }

  return NextResponse.json({ event, form });
}
