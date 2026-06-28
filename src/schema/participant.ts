import type { Timestamp } from './firestore';

// ── Submitter identity (always present when unregisteredForm=false) ───────────

/**
 * Denormalised identity of the person who submitted the form.
 * Fetched from /users/{uid} at registration time and stored on the participant
 * doc so the admin panel never needs a secondary lookup.
 *
 * Only present when `unregisteredForm=false`. When the event allows anonymous
 * submissions (`unregisteredForm=true`), neither userId nor submitterInfo is
 * stored — the submission is intentionally identity-free.
 */
export interface SubmitterInfo {
  /** Firebase Auth UID of the submitter. */
  userId: string;
  /** Denormalised from /users/{uid}.firstName + lastName at registration time. */
  name: string;
  /** Denormalised from /users/{uid}.rollNumber at registration time. */
  rollNumber: string;
}

// ── Common base ───────────────────────────────────────────────────────────────

interface ParticipantBase {
  /** Firestore document ID. */
  id: string;

  /**
   * Discriminant: `false` for individual, `true` for team.
   * Derived from event.isTeamEvent at write time — never changes.
   */
  isTeam: boolean;

  /**
   * Identity of the person who submitted the form.
   * `null` when `event.unregisteredForm === true` (anonymous submission).
   */
  submitter: SubmitterInfo | null;

  /** Whether the participant physically attended / checked in. */
  attended: boolean;

  /** UTC timestamp recorded at the moment of registration. */
  registrationTimestamp: Timestamp;

  /**
   * All form responses, keyed by FormField.id (stable UUID).
   * Also contains all default-field responses when includeDefaultFields=true
   * (e.g. firstName, lastName, rollNumber, gender, teamName, members[]).
   * The system does not interpret these keys — they are purely admin-defined.
   * Paragraph field ids are never present here.
   */
  extraFields: Record<string, unknown>;
}

// ── Individual participant ────────────────────────────────────────────────────

/**
 * A solo registration (`isTeam === false`).
 *
 * When `includeDefaultFields=true`, the body will contain firstName/lastName/
 * rollNumber/gender but those are validated and stored inside `extraFields`
 * using their form field UUIDs — not as top-level typed fields.
 *
 * The only system-level identity is `submitter` (from auth token).
 */
export interface IndividualParticipant extends ParticipantBase {
  isTeam: false;
}

// ── Team participant ──────────────────────────────────────────────────────────

/**
 * A team registration (`isTeam === true`).
 *
 * When `includeDefaultFields=true`, the body will contain teamName/leaderName/
 * leaderRollNumber/members[] but those are validated and stored inside
 * `extraFields` — not as top-level typed fields.
 *
 * The only system-level identity is `submitter` (from auth token), which
 * always refers to the team leader.
 */
export interface TeamParticipant extends ParticipantBase {
  isTeam: true;
}

// ── Discriminated union ───────────────────────────────────────────────────────

/**
 * Any document in the /events/{eventId}/participants subcollection.
 * Narrow on `isTeam` for display purposes only.
 */
export type Participant = IndividualParticipant | TeamParticipant;
