import { NextResponse, type NextRequest } from 'next/server';
import { FieldValue } from 'firebase-admin/firestore';
import adminDb from '@/lib/firebase-admin/firestore';
import { verifyIdToken } from '@/lib/firebase-admin/auth';
import type { IndividualParticipant, TeamParticipant, TeamMember } from '@/schema/participant';
import type { Event } from '@/schema/event';
import type { EventForm, FormResponse } from '@/schema/form';
import { validateFormResponse } from '@/lib/form-builder/validate-response';
import { EVENT_TYPES_WITHOUT_FORMS } from '@/config';
import { isValidRollNumber } from '@/lib/validators/rollNumber';

// ── Helpers ───────────────────────────────────────────────────────────────────

type Gender = 'male' | 'female' | 'other';
const VALID_GENDERS: Gender[] = ['male', 'female', 'other'];

function normaliseRoll(r: string): string {
  return r.trim().toLowerCase();
}

/** Resolve the Firestore event doc by slug. Returns [docId, data] or null. */
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

// ── POST /api/event/[slug]/form ───────────────────────────────────────────────
/**
 * Public registration endpoint. Accepts individual or team submissions.
 *
 * Auth rules:
 *  - unregisteredForm=true  → no token required
 *  - unregisteredForm=false → valid Firebase ID token required (Authorization: Bearer <token>)
 *
 * Note: isOpenToAll=false + unregisteredForm=true is a logically inconsistent
 * event configuration (cannot verify role without auth). The API refuses
 * submissions for that combination to prevent the inconsistency from being
 * silently ignored.
 *
 * Counters (totalParticipants / totalTeams) are incremented inside a
 * Firestore transaction to prevent race conditions under concurrent submissions.
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

  // Logically inconsistent state: can't check role without auth
  if (!event.isOpenToAll && event.unregisteredForm) {
    return NextResponse.json(
      { error: 'This event has an invalid configuration. Please contact the organiser.' },
      { status: 409 },
    );
  }

  // Block registration for event types that don't support forms
  if (EVENT_TYPES_WITHOUT_FORMS.includes(event.type)) {
    return NextResponse.json(
      { error: 'This event type does not support participant registration.' },
      { status: 400 },
    );
  }

  // Load custom form schema (if one exists) for extraFields validation later
  const formSnap = await adminDb
    .collection('events')
    .doc(eventDocId)
    .collection('form')
    .doc('config')
    .get();
  const eventForm = formSnap.exists ? (formSnap.data() as EventForm) : null;

  // ── 3. Auth ────────────────────────────────────────────────────────────────

  let userId: string | null = null;
  let userRole: string | null = null;

  if (!event.unregisteredForm) {
    const authHeader = request.headers.get('Authorization') ?? '';
    const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;
    if (!idToken) {
      return NextResponse.json({ error: 'Authentication required for this event.' }, { status: 401 });
    }
    try {
      const token = await verifyIdToken(idToken);
      userId   = token.uid;
      userRole = (token['role'] as string | undefined) ?? 'member';
    } catch {
      return NextResponse.json({ error: 'Invalid or expired token.' }, { status: 401 });
    }

    // Role check for members-only events
    if (!event.isOpenToAll && userRole === 'member') {
      return NextResponse.json(
        { error: 'This event is only open to ACM executives and above.' },
        { status: 403 },
      );
    }
  }

  // ── 4. Parse body ──────────────────────────────────────────────────────────

  let body: Record<string, unknown>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body.' }, { status: 400 });
  }

  const participantsRef = adminDb
    .collection('events')
    .doc(eventDocId)
    .collection('participants');

  const eventRef = adminDb.collection('events').doc(eventDocId);

  // ── 5. Branch: individual vs team ─────────────────────────────────────────

  if (!event.isTeamEvent) {
    // ── INDIVIDUAL REGISTRATION ──────────────────────────────────────────────

    const firstName  = String(body.firstName  ?? '').trim();
    const lastName   = String(body.lastName   ?? '').trim();
    const rollNumber = normaliseRoll(String(body.rollNumber ?? ''));
    const gender     = String(body.gender ?? '') as Gender;
    const extraFields = (body.extraFields ?? {}) as Record<string, unknown>;

    if (!firstName || !lastName || !rollNumber) {
      return NextResponse.json(
        { error: 'firstName, lastName, and rollNumber are required.' },
        { status: 400 },
      );
    }
    if (!isValidRollNumber(rollNumber)) {
      return NextResponse.json(
        { error: 'Invalid roll number format. Expected format: U24CS089 (1 letter, 2 digits, 2 letters, 3 digits).' },
        { status: 400 },
      );
    }
    if (!VALID_GENDERS.includes(gender)) {
      return NextResponse.json({ error: 'Valid gender is required (male, female, other).' }, { status: 400 });
    }

    // Validate custom form fields
    if (eventForm) {
      const formErr = validateFormResponse(eventForm, extraFields as FormResponse);
      if (formErr) return NextResponse.json({ error: formErr }, { status: 422 });
    }

    // Female-mandatory check for individual events
    if (event.isFemaleMandatory && gender !== 'female') {
      return NextResponse.json(
        { error: 'This event requires the participant to be female.' },
        { status: 422 },
      );
    }

    // Duplicate check: same userId (authenticated) or same rollNumber (anonymous)
    if (userId) {
      const dupUid = await participantsRef
        .where('isTeam', '==', false)
        .where('userId', '==', userId)
        .limit(1)
        .get();
      if (!dupUid.empty) {
        return NextResponse.json({ error: 'You are already registered for this event.' }, { status: 409 });
      }
    } else {
      const dupRoll = await participantsRef
        .where('isTeam', '==', false)
        .where('rollNumber', '==', rollNumber)
        .limit(1)
        .get();
      if (!dupRoll.empty) {
        return NextResponse.json(
          { error: 'A participant with this roll number is already registered.' },
          { status: 409 },
        );
      }
    }

    // Capacity check + atomic write
    const docRef = participantsRef.doc();

    try {
      await adminDb.runTransaction(async (tx) => {
        const eventSnap = await tx.get(eventRef);
        const current = (eventSnap.data()?.totalParticipants ?? 0) as number;
        const max = event.maxParticipants;

        if (max > 0 && current >= max) {
          throw new Error('CAPACITY_FULL');
        }

        const participant: Omit<IndividualParticipant, 'id'> = {
          isTeam:    false,
          userId,
          firstName,
          lastName,
          rollNumber,
          gender,
          attended:  false,
          registrationTimestamp: FieldValue.serverTimestamp() as never,
          extraFields,
        };

        tx.set(docRef, participant);
        tx.update(eventRef, { totalParticipants: FieldValue.increment(1) });
      });
    } catch (e) {
      if (e instanceof Error && e.message === 'CAPACITY_FULL') {
        return NextResponse.json({ error: 'This event is full. No more registrations are being accepted.' }, { status: 409 });
      }
      throw e;
    }

    console.log(`[POST /api/event/${slug}/form] individual registered roll=${rollNumber}`);
    return NextResponse.json({ participantId: docRef.id }, { status: 201 });

  } else {
    // ── TEAM REGISTRATION ────────────────────────────────────────────────────

    const teamName        = String(body.teamName        ?? '').trim();
    const leaderName      = String(body.leaderName      ?? '').trim();
    const leaderRollNumber = normaliseRoll(String(body.leaderRollNumber ?? ''));
    const rawMembers      = body.members;
    const extraFields     = (body.extraFields ?? {}) as Record<string, unknown>;

    if (!teamName || !leaderName || !leaderRollNumber) {
      return NextResponse.json(
        { error: 'teamName, leaderName, and leaderRollNumber are required.' },
        { status: 400 },
      );
    }
    if (!isValidRollNumber(leaderRollNumber)) {
      return NextResponse.json(
        { error: 'Invalid leader roll number format. Expected format: U24CS089.' },
        { status: 400 },
      );
    }
    if (!Array.isArray(rawMembers)) {
      return NextResponse.json({ error: 'members must be an array.' }, { status: 400 });
    }

    // Validate custom form fields
    if (eventForm) {
      const formErr = validateFormResponse(eventForm, extraFields as FormResponse);
      if (formErr) return NextResponse.json({ error: formErr }, { status: 422 });
    }

    // Normalise and validate each member
    let members: TeamMember[];
    try {
      members = rawMembers.map((m: unknown, i: number) => {
        const member = m as Record<string, unknown>;
        const name       = String(member.name       ?? '').trim();
        const rollNumber = normaliseRoll(String(member.rollNumber ?? ''));
        const gender     = String(member.gender ?? '') as Gender;
        const memberUserId = member.userId ? String(member.userId) : null;

        if (!name || !rollNumber) {
          throw Object.assign(new Error(`Member ${i + 1}: name and rollNumber are required.`), { status: 400 });
        }
        if (!isValidRollNumber(rollNumber)) {
          throw Object.assign(new Error(`Member ${i + 1}: invalid roll number format. Expected format: U24CS089.`), { status: 400 });
        }
        if (!VALID_GENDERS.includes(gender)) {
          throw Object.assign(new Error(`Member ${i + 1}: valid gender is required.`), { status: 400 });
        }
        return { userId: memberUserId, name, rollNumber, gender };
      });
    } catch (e) {
      const err = e as Error & { status?: number };
      return NextResponse.json({ error: err.message }, { status: err.status ?? 400 });
    }

    // Total team size = leader + additional members
    const teamSize = members.length + 1;

    if (teamSize < event.minTeamMembers || teamSize > event.maxTeamMembers) {
      return NextResponse.json(
        {
          error: `Team size must be between ${event.minTeamMembers} and ${event.maxTeamMembers} (including leader). Got ${teamSize}.`,
        },
        { status: 422 },
      );
    }

    // Female-mandatory check
    if (event.isFemaleMandatory) {
      const femaleCount = members.filter((m) => m.gender === 'female').length;
      if (femaleCount < event.minFemaleRequired) {
        return NextResponse.json(
          {
            error: `This event requires at least ${event.minFemaleRequired} female member(s). Found ${femaleCount}.`,
          },
          { status: 422 },
        );
      }
    }

    // Duplicate roll numbers within the team itself
    const teamRolls = members.map((m) => m.rollNumber);
    const uniqueTeamRolls = new Set(teamRolls);
    if (uniqueTeamRolls.size !== teamRolls.length) {
      return NextResponse.json(
        { error: 'Duplicate roll numbers found within the team.' },
        { status: 422 },
      );
    }

    // Check leader not duplicated in members list (leader submits separately)
    // The leader's roll number must not also appear as a team member
    if (uniqueTeamRolls.has(leaderRollNumber)) {
      return NextResponse.json(
        { error: 'The team leader\'s roll number cannot also appear in the members list.' },
        { status: 422 },
      );
    }

    // All roll numbers on the event: leader + members
    const allRolls = [leaderRollNumber, ...teamRolls];
    const uniqueAllRolls = new Set(allRolls);
    if (uniqueAllRolls.size !== allRolls.length) {
      return NextResponse.json(
        { error: 'Duplicate roll numbers found across leader and members.' },
        { status: 422 },
      );
    }

    // Duplicate check: same team name already registered
    const dupTeamName = await participantsRef
      .where('isTeam', '==', true)
      .where('teamName', '==', teamName)
      .limit(1)
      .get();
    if (!dupTeamName.empty) {
      return NextResponse.json(
        { error: `A team named "${teamName}" is already registered for this event.` },
        { status: 409 },
      );
    }

    // Duplicate check: leader (by userId if authenticated, else by roll number)
    if (userId) {
      const dupLeader = await participantsRef
        .where('isTeam', '==', true)
        .where('leaderId', '==', userId)
        .limit(1)
        .get();
      if (!dupLeader.empty) {
        return NextResponse.json(
          { error: 'You have already registered a team for this event.' },
          { status: 409 },
        );
      }
    } else {
      const dupLeaderRoll = await participantsRef
        .where('isTeam', '==', true)
        .where('leaderRollNumber', '==', leaderRollNumber)
        .limit(1)
        .get();
      if (!dupLeaderRoll.empty) {
        return NextResponse.json(
          { error: 'A team with this leader\'s roll number is already registered.' },
          { status: 409 },
        );
      }
    }

    // Cross-team roll number collision: none of the rolls (leader + members)
    // may appear as a member in any other team for this event.
    // We query all existing team registrations and scan locally — Firestore
    // does not support array-contains-any for multiple values across fields.
    const existingTeams = await participantsRef
      .where('isTeam', '==', true)
      .get();

    const takenRolls = new Set<string>();
    existingTeams.docs.forEach((doc) => {
      const d = doc.data() as TeamParticipant;
      takenRolls.add(d.leaderRollNumber);
      d.members.forEach((m) => takenRolls.add(m.rollNumber));
    });

    const conflicts = allRolls.filter((r) => takenRolls.has(r));
    if (conflicts.length > 0) {
      return NextResponse.json(
        {
          error: `The following roll number(s) are already registered in another team: ${conflicts.join(', ')}.`,
        },
        { status: 409 },
      );
    }

    // Capacity check + atomic write
    const docRef = participantsRef.doc();

    try {
      await adminDb.runTransaction(async (tx) => {
        const eventSnap = await tx.get(eventRef);
        const currentTeams = (eventSnap.data()?.totalTeams ?? 0) as number;
        const max = event.maxParticipants; // maxParticipants = max teams for team events

        if (max > 0 && currentTeams >= max) {
          throw new Error('CAPACITY_FULL');
        }

        const participant: Omit<TeamParticipant, 'id'> = {
          isTeam:            true,
          teamName,
          teamSize,
          leaderId:          userId,
          leaderName,
          leaderRollNumber,
          members,
          attended:          false,
          registrationTimestamp: FieldValue.serverTimestamp() as never,
          extraFields,
        };

        tx.set(docRef, participant);
        tx.update(eventRef, {
          totalTeams:        FieldValue.increment(1),
          totalParticipants: FieldValue.increment(teamSize), // leader + members
        });
      });
    } catch (e) {
      if (e instanceof Error && e.message === 'CAPACITY_FULL') {
        return NextResponse.json({ error: 'This event is full. No more team registrations are being accepted.' }, { status: 409 });
      }
      throw e;
    }

    console.log(`[POST /api/event/${slug}/form] team "${teamName}" registered leader=${leaderRollNumber}`);
    return NextResponse.json({ participantId: docRef.id }, { status: 201 });
  }
}
