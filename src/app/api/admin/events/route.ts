import { NextResponse, type NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import adminDb from '@/lib/firebase-admin/firestore';
import { requirePermission } from '@/server/guard';
import {
  validateEventDates,
  validatePrizes,
  validateTeamConfig,
  VALID_STATUSES,
  VALID_TYPES,
} from '@/server/event-validators';
import type { Event } from '@/schema/event';

const COLLECTION = 'events';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Slugify a string: lowercase, spaces → hyphens, strip non-alphanumeric. */
function toSlug(str: string): string {
  return str
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-]/g, '')
    .replace(/-+/g, '-');
}

/** Check if a slug is already taken (optionally excluding a doc ID). */
async function isSlugTaken(slug: string, excludeId?: string): Promise<boolean> {
  const snap = await adminDb
    .collection(COLLECTION)
    .where('slug', '==', slug)
    .limit(1)
    .get();
  if (snap.empty) return false;
  if (excludeId && snap.docs[0].id === excludeId) return false;
  return true;
}

// ── POST /api/admin/events — create event ─────────────────────────────────────

export async function POST(request: NextRequest) {
  const guard = await requirePermission(request, 'manageEvents');
  if (guard.error) return guard.error;

  let body: Partial<Event> & { slug?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Required fields validation
  const required = ['eventName', 'eventDescription', 'type', 'location', 'startDate', 'endDate'] as const;
  for (const field of required) {
    if (body[field] === undefined || body[field] === null || body[field] === '') {
      return NextResponse.json({ error: `Missing required field: ${field}` }, { status: 400 });
    }
  }

  // Enum validation
  const status = body.status ?? 'upcoming';
  if (!VALID_STATUSES.includes(status)) return NextResponse.json({ error: 'Invalid status value.' }, { status: 400 });
  if (!VALID_TYPES.includes(body.type as Event['type'])) return NextResponse.json({ error: 'Invalid type value.' }, { status: 400 });

  // Business logic validation
  const dateErr = validateEventDates(status, body.startDate, body.endDate);
  if (dateErr) return NextResponse.json({ error: dateErr }, { status: 422 });

  const prizeErr = validatePrizes(body.prizeMoney, body.prizeMoneyDistribution);
  if (prizeErr) return NextResponse.json({ error: prizeErr }, { status: 422 });

  const teamErr = validateTeamConfig(body.isTeamEvent, body.minTeamMembers, body.maxTeamMembers, body.isFemaleMandatory, body.minFemaleRequired);
  if (teamErr) return NextResponse.json({ error: teamErr }, { status: 422 });

  // Generate doc ID (random hash via Firestore auto-ID)
  const docRef = adminDb.collection(COLLECTION).doc();
  const id = docRef.id;

  // Slug: use provided slug or derive from eventName, then fall back to doc ID
  const rawSlug = body.slug ? toSlug(body.slug) : toSlug(body.eventName as string);
  const slug = rawSlug || id;

  if (await isSlugTaken(slug)) {
    return NextResponse.json(
      { error: `Slug "${slug}" is already taken. Provide a unique slug.` },
      { status: 409 },
    );
  }

  const event: Omit<Event, 'id'> = {
    slug,
    eventName:          (body.eventName as string).trim(),
    eventDescription:   (body.eventDescription as string).trim(),
    status,
    eventThumbnail:     body.eventThumbnail ?? '',
    type:               body.type as Event['type'],
    location:           (body.location as string).trim(),
    tags:               body.tags ?? [],
    isOpenToAll:        body.isOpenToAll ?? false,
    unregisteredForm:   body.unregisteredForm ?? false,
    maxParticipants:    body.maxParticipants ?? 0,
    startDate:          body.startDate as unknown as Event['startDate'],
    endDate:            body.endDate as unknown as Event['endDate'],
    creationDate:       FieldValue.serverTimestamp() as unknown as Event['creationDate'],
    totalParticipants:  0,
    isTeamEvent:        body.isTeamEvent ?? false,
    totalTeams:         0,
    minTeamMembers:     body.minTeamMembers ?? 1,
    maxTeamMembers:     body.maxTeamMembers ?? 1,
    isFemaleMandatory:  body.isFemaleMandatory ?? false,
    minFemaleRequired:  body.minFemaleRequired ?? 0,
    prizeMoney:         body.prizeMoney ?? 0,
    prizeMoneyDistribution: body.prizeMoneyDistribution ?? {
      firstPrize: 0,
      secondPrize: 0,
      thirdPrize: 0,
    },
    isFormOpen:         false,  // must be explicitly opened by admin
    hasForm:            false,  // set true when form is saved via form builder
  };

  await docRef.set(event);

  console.log(`[POST /api/admin/events] created event id=${id} slug=${slug} by uid=${guard.token.uid}`);

  return NextResponse.json({ id, ...event }, { status: 201 });
}

// ── GET /api/admin/events — list all events ───────────────────────────────────

export async function GET(request: NextRequest) {
  const guard = await requirePermission(request, 'viewEvents');
  if (guard.error) return guard.error;

  const snap = await adminDb
    .collection(COLLECTION)
    .orderBy('creationDate', 'desc')
    .get();

  const events = snap.docs.map((doc) => ({ id: doc.id, ...doc.data() }));

  return NextResponse.json({ events });
}
