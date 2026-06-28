import { NextResponse, type NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import adminDb from '@/lib/firebase-admin/firestore';
import { verifyIdToken } from '@/lib/firebase-admin/auth';
import type { IndividualParticipant, TeamParticipant, SubmitterInfo } from '@/schema/participant';
import type { Event } from '@/schema/event';
import type { EventForm, FormResponse } from '@/schema/form';
import type { User } from '@/schema/user';
import { validateFormResponse } from '@/lib/form-builder/validate-response';
import { EVENT_TYPES_WITHOUT_FORMS } from '@/config';

// ── Helpers ───────────────────────────────────────────────────────────────────

async function getEventBySlug(slug: string): Promise<[string, Event] | null> {
  const snap = await adminDb
    .collection('events')
    .where('slug', '==', slug)
    .limit(1)
    .get();
  if (snap.empty) return null;
  const doc = snap.docs[0];
  return [doc.id, { id: doc.id, ...doc.data() } as Event];
}

/**
 * Fetch denormalised submitter info from /users/{uid}.
 * Returns null if the user doc doesn't exist yet (shouldn't happen, but safe).
 */
async function getSubmitterInfo(uid: string): Promise<SubmitterInfo | null> {
  const snap = await adminDb.collection('users').doc(uid).get();
  if (!snap.exists) return null;
  const user = snap.data() as User;
  return {
    userId: uid,
    name: `${user.firstName} ${user.lastName}`.trim(),
    rollNumber: user.rollNumber,
  };
}

// ── POST /api/event/[slug]/form ───────────────────────────────────────────────
/**
 * Public registration endpoint.
 *
 * The system has two concerns:
 *  1. Submitter identity — who filled this form (from auth token, not body).
 *     Stored as `submitter: { userId, name, rollNumber }` when authenticated.
 *     Null for anonymous submissions (unregisteredForm=true).
 *  2. Form responses — whatever fields the admin designed, stored as-is in
 *     `extraFields`. The system does not interpret these fields. If the admin
 *     included default fields (includeDefaultFields=true), they arrive in the
 *     body and are validated against the form schema, then stored in extraFields.
 *
 * The system does NOT require teamName / leaderName / members / firstName /
 * gender etc. in the body — those are admin-defined form fields. The only
 * required inputs from the body are the custom form responses.
 *
 * Duplicate prevention:
 *  - Authenticated (unregisteredForm=false): by userId / leaderId
 *  - Anonymous (unregisteredForm=true): no duplicate prevention
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;

  // ── 1. Load event ──────────────────────────────────────────────────────────
  const eventResult = await getEventBySlug(slug);
  if (!eventResult) {
    return NextResponse.json({ error: 'Event not found.' }, { status: 404 });
  }
  const [eventDocId, event] = eventResult;

  // ── 2. Gate checks ─────────────────────────────────────────────────────────
  if (!event.isFormOpen) {
    return NextResponse.json(
      { error: 'Registrations are currently closed for this event.' },
      { status: 403 },
    );
  }
  if (event.status === 'finished') {
    return NextResponse.json(
      { error: 'This event has already ended. Registrations are closed.' },
      { status: 403 },
    );
  }
  if (!event.isOpenToAll && event.unregisteredForm) {
    return NextResponse.json(
      // { error: 'This event has an invalid configuration. Please contact the organiser.' },
      { error: 'This form is only open for executives. Please contact us if you think this is a mistake.' },
      { status: 409 },
    );
  }
  if (EVENT_TYPES_WITHOUT_FORMS.includes(event.type)) {
    return NextResponse.json(
      { error: 'This event type does not support participant registration.' },
      { status: 400 },
    );
  }

  // ── 3. Load form schema (for extraFields validation) ──────────────────────
  const formSnap = await adminDb
    .collection('events')
    .doc(eventDocId)
    .collection('form')
    .doc('config')
    .get();
  const eventForm = formSnap.exists ? (formSnap.data() as EventForm) : null;

  // ── 4. Authenticate (when required) ───────────────────────────────────────
  let submitter: SubmitterInfo | null = null;
  let userRole: string | null = null;

  if (!event.unregisteredForm) {
    const authHeader = request.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ error: 'Authentication required for this event.' }, { status: 401 });
    }
    let uid: string;
    try {
      const token = await verifyIdToken(idToken);
      uid = token.uid;
      userRole = (token['role'] as string | undefined) ?? 'member';
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
    }
    if (!event.isOpenToAll && userRole === 'member') {
      return NextResponse.json(
        { error: 'This event is only open to ACM executives and above.' },
        { status: 403 },
      );
    }
    // Fetch denormalised identity from Firestore
    submitter = await getSubmitterInfo(uid);
    if (!submitter) {
      // Fallback: store uid only — user doc may not have synced yet
      submitter = { userId: uid, name: '', rollNumber: '' };
    }
  }

  // ── 5. Parse body ──────────────────────────────────────────────────────────
  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const extraFields = (body.extraFields ?? {}) as Record<string, unknown>;

  // ── 6. Validate custom form fields ────────────────────────────────────────
  if (eventForm) {
    const formErr = validateFormResponse(eventForm, extraFields as FormResponse);
    if (formErr) return NextResponse.json({ error: formErr }, { status: 422 });
  }

  const participantsRef = adminDb
    .collection('events')
    .doc(eventDocId)
    .collection('participants');
  const eventRef = adminDb.collection('events').doc(eventDocId);

  // ── 7. Duplicate check (authenticated only) ────────────────────────────────
  if (submitter) {
    const dupField = event.isTeamEvent ? 'submitter.userId' : 'submitter.userId';
    const dup = await participantsRef
      .where('submitter.userId', '==', submitter.userId)
      .limit(1)
      .get();
    if (!dup.empty) {
      const msg = event.isTeamEvent
        ? 'You have already registered a team for this event.'
        : 'You are already registered for this event.';
      return NextResponse.json({ error: msg }, { status: 409 });
    }
  }

  // ── 8. Capacity check + atomic write ──────────────────────────────────────
  const docRef = participantsRef.doc();

  try {
    await adminDb.runTransaction(async (tx) => {
      const eventSnap = await tx.get(eventRef);
      const data = eventSnap.data() ?? {};

      const max = event.maxParticipants;

      if (!event.isTeamEvent) {
        const current = (data.totalParticipants ?? 0) as number;
        if (max > 0 && current >= max) throw new Error('CAPACITY_FULL');

        const participant: Omit<IndividualParticipant, 'id'> = {
          isTeam: false,
          submitter,
          attended: false,
          registrationTimestamp: FieldValue.serverTimestamp() as never,
          extraFields,
        };
        tx.set(docRef, participant);
        tx.update(eventRef, { totalParticipants: FieldValue.increment(1) });
      } else {
        const currentTeams = (data.totalTeams ?? 0) as number;
        if (max > 0 && currentTeams >= max) throw new Error('CAPACITY_FULL');

        const participant: Omit<TeamParticipant, 'id'> = {
          isTeam: true,
          submitter,
          attended: false,
          registrationTimestamp: FieldValue.serverTimestamp() as never,
          extraFields,
        };
        tx.set(docRef, participant);
        tx.update(eventRef, {
          totalTeams: FieldValue.increment(1),
          totalParticipants: FieldValue.increment(1),
        });
      }
    });
  } catch (e) {
    if (e instanceof Error && e.message === 'CAPACITY_FULL') {
      return NextResponse.json(
        { error: 'This event is full. No more registrations are being accepted.' },
        { status: 409 },
      );
    }
    throw e;
  }

  const label = event.isTeamEvent ? 'team' : 'individual';
  const who = submitter?.userId ?? 'anonymous';
  console.log(`[POST /api/event/${slug}/form] ${label} registered submitter=${who}`);
  return NextResponse.json({ participantId: docRef.id }, { status: 201 });
}
