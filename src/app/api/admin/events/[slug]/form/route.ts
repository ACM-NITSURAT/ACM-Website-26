import { NextResponse, type NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import adminDb from '@/lib/firebase-admin/firestore';
import { requirePermission } from '@/server/guard';
import { validateFormSchema } from '@/lib/form-builder/validate-schema';
import { EVENT_TYPES_WITHOUT_FORMS } from '@/config';
import type { EventForm } from '@/schema/form';
import type { Event } from '@/schema/event';

const FORM_DOC = 'config';

// ── Shared: resolve event doc by slug ─────────────────────────────────────────

async function getEventDocBySlug(slug: string) {
  const snap = await adminDb
    .collection('events')
    .where('slug', '==', slug)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0];
}

// ── GET /api/admin/events/[slug]/form — fetch form schema ─────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const guard = await requirePermission(request, 'viewEvents');
  if (guard.error) return guard.error;

  const { slug } = await params;
  const eventDoc = await getEventDocBySlug(slug);
  if (!eventDoc) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

  const formSnap = await eventDoc.ref.collection('form').doc(FORM_DOC).get();
  if (!formSnap.exists) return NextResponse.json({ error: 'No form found for this event.' }, { status: 404 });

  return NextResponse.json({ id: formSnap.id, ...formSnap.data() });
}

// ── PUT /api/admin/events/[slug]/form — create or overwrite form schema ───────

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const guard = await requirePermission(request, 'manageEvents');
  if (guard.error) return guard.error;

  const { slug } = await params;
  const eventDoc = await getEventDocBySlug(slug);
  if (!eventDoc) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

  const event = eventDoc.data() as Event;

  // Block form creation for unsupported event types
  if (EVENT_TYPES_WITHOUT_FORMS.includes(event.type)) {
    return NextResponse.json(
      { error: `Events of type "${event.type}" do not support custom forms.` },
      { status: 400 },
    );
  }

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  // Validate the form schema
  const err = validateFormSchema(body.title, body.description, body.fields);
  if (err) return NextResponse.json({ error: err }, { status: 422 });

  const formRef = eventDoc.ref.collection('form').doc(FORM_DOC);
  const existing = await formRef.get();

  const now = FieldValue.serverTimestamp();

  const formData: Omit<EventForm, 'createdAt' | 'updatedAt'> & {
    createdAt: typeof now | EventForm['createdAt'];
    updatedAt: typeof now;
  } = {
    eventId:     eventDoc.id,
    title:       (body.title as string).trim(),
    description: (body.description as string).trim(),
    fields:      body.fields as EventForm['fields'],
    createdAt:   existing.exists ? existing.data()!.createdAt : now,
    updatedAt:   now,
  };

  await formRef.set(formData);

  // Set hasForm=true on the event doc (idempotent)
  if (!event.hasForm) {
    await eventDoc.ref.update({ hasForm: true });
  }

  console.log(`[PUT /api/admin/events/${slug}/form] saved by uid=${guard.token.uid}`);
  return NextResponse.json({ success: true }, { status: 200 });
}

// ── DELETE /api/admin/events/[slug]/form — delete form schema ─────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const guard = await requirePermission(request, 'manageEvents');
  if (guard.error) return guard.error;

  const { slug } = await params;
  const eventDoc = await getEventDocBySlug(slug);
  if (!eventDoc) return NextResponse.json({ error: 'Event not found.' }, { status: 404 });

  const formRef = eventDoc.ref.collection('form').doc(FORM_DOC);
  const formSnap = await formRef.get();
  if (!formSnap.exists) return NextResponse.json({ error: 'No form found for this event.' }, { status: 404 });

  await formRef.delete();

  // Reset hasForm and close the form on the event doc
  await eventDoc.ref.update({ hasForm: false, isFormOpen: false });

  console.log(`[DELETE /api/admin/events/${slug}/form] deleted by uid=${guard.token.uid}`);
  return NextResponse.json({ success: true });
}
