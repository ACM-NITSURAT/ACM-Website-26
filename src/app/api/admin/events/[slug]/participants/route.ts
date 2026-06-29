import { NextResponse, type NextRequest } from 'next/server';
import adminDb from '@/lib/firebase-admin/firestore';
import { requirePermission } from '@/server/guard';
import type { EventForm } from '@/schema/form';

// ── Shared: resolve event doc by slug ─────────────────────────────────────────

async function getEventDocBySlug(slug: string) {
  const snap = await adminDb
    .collection('events')
    .where('slug', '==', slug)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0];
}

// ── GET /api/admin/events/[slug]/participants ─────────────────────────────────
/**
 * Returns all participants for the event, plus the form schema so the client
 * can resolve extraFields UUID keys to human-readable labels.
 *
 * Permission: viewEvents (core, adviser)
 *
 * Response:
 *   {
 *     participants: Participant[],   // raw Firestore docs with id injected
 *     form: EventForm | null,        // form/config doc, or null if none exists
 *   }
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const guard = await requirePermission(request, 'viewEvents');
  if (guard.error) return guard.error;

  const { slug } = await params;
  const eventDoc = await getEventDocBySlug(slug);
  if (!eventDoc) {
    return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  }

  // Fetch all participants (no ordering — client handles sort)
  const participantsSnap = await eventDoc.ref.collection('participants').get();
  const participants = participantsSnap.docs.map((d) => ({
    id: d.id,
    ...d.data(),
  }));

  // Fetch form config so the client can resolve extraFields keys → labels
  let form: EventForm | null = null;
  const formSnap = await eventDoc.ref.collection('form').doc('config').get();
  if (formSnap.exists) {
    form = formSnap.data() as EventForm;
  }

  return NextResponse.json({ participants, form });
}
