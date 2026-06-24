import { NextResponse, type NextRequest } from 'next/server';
import adminDb from '@/lib/firebase-admin/firestore';
import { requirePermission } from '@/server/guard';
import type { Event } from '@/schema/event';

const COLLECTION = 'events';

// ── Shared: resolve doc by slug ───────────────────────────────────────────────

/** Returns the Firestore DocumentSnapshot for the given slug, or null. */
async function getDocBySlug(slug: string) {
  const snap = await adminDb
    .collection(COLLECTION)
    .where('slug', '==', slug)
    .limit(1)
    .get();
  return snap.empty ? null : snap.docs[0];
}

/** Slugify a string: lowercase, spaces → hyphens, strip non-alphanumeric. */
function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

// ── GET /api/admin/events/[slug] — fetch one event ────────────────────────────

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const guard = await requirePermission(request, 'viewEvents');
  if (guard.error) return guard.error;

  const { slug } = await params;
  const doc = await getDocBySlug(slug);

  if (!doc) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  return NextResponse.json({ id: doc.id, ...doc.data() });
}

// ── PATCH /api/admin/events/[slug] — edit event ───────────────────────────────

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const guard = await requirePermission(request, 'manageEvents');
  if (guard.error) return guard.error;

  const { slug } = await params;
  const doc = await getDocBySlug(slug);

  if (!doc) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  let body: Partial<Event> & { slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Strip read-only/server-managed fields
  const { id: _id, creationDate: _cd, totalParticipants: _tp, totalTeams: _tt, ...updates } = body as Partial<Event>;

  // If slug is being changed, validate uniqueness
  if (updates.slug !== undefined) {
    const newSlug = toSlug(updates.slug);
    if (!newSlug) {
      return NextResponse.json({ error: 'Invalid slug value' }, { status: 400 });
    }
    // Check uniqueness (excluding current doc)
    const conflict = await adminDb
      .collection(COLLECTION)
      .where('slug', '==', newSlug)
      .limit(1)
      .get();

    if (!conflict.empty && conflict.docs[0].id !== doc.id) {
      return NextResponse.json(
        { error: `Slug "${newSlug}" is already taken.` },
        { status: 409 },
      );
    }
    updates.slug = newSlug;
  }

  await doc.ref.update(updates as Record<string, unknown>);

  console.log(`[PATCH /api/admin/events/${slug}] updated by uid=${guard.token.uid}`);

  const updated = await doc.ref.get();
  return NextResponse.json({ id: updated.id, ...updated.data() });
}

// ── DELETE /api/admin/events/[slug] — delete event ───────────────────────────

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const guard = await requirePermission(request, 'manageEvents');
  if (guard.error) return guard.error;

  const { slug } = await params;
  const doc = await getDocBySlug(slug);

  if (!doc) {
    return NextResponse.json({ error: 'Event not found' }, { status: 404 });
  }

  await doc.ref.delete();

  console.log(`[DELETE /api/admin/events/${slug}] deleted by uid=${guard.token.uid}`);

  return NextResponse.json({ success: true });
}
