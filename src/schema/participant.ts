import type { Timestamp } from './firestore';

// ── Shared team-member shape ──────────────────────────────────────────────────

/**
 * Describes a single member within a team registration.
 * `userId` is `null` when the event allows anonymous (unregistered) participants.
 */
export interface TeamMember {
  userId: string | null;
  name: string;
  rollNumber: string;
  gender: 'male' | 'female' | 'other';
}

// ── Common base fields ────────────────────────────────────────────────────────

/**
 * Fields shared by every document in the
 * `/events/{eventId}/participants/{participantId}` subcollection.
 */
interface ParticipantBase {
  /** Firestore document ID. */
  id: string;

  /** Whether the participant physically attended / checked in. */
  attended: boolean;

  /** UTC timestamp recorded at the moment of registration. */
  registrationTimestamp: Timestamp;

  /**
   * Catch-all map for dynamic fields collected via custom web forms.
   * Keys are field names; values may be any serialisable type.
   */
  extraFields: Record<string, unknown>;
}

// ── Individual registration ───────────────────────────────────────────────────

/**
 * A solo registration (`isTeam === false`).
 *
 * `userId` is `null` when the event's `unregisteredForm` flag is `true`
 * and the participant did not sign in with Firebase Auth.
 */
export interface IndividualParticipant extends ParticipantBase {
  isTeam: false;

  /** Firebase Auth UID, or `null` for anonymous submissions. */
  userId: string | null;

  firstName: string;
  lastName: string;
  rollNumber: string;
}

// ── Team registration ─────────────────────────────────────────────────────────

/**
 * A team registration (`isTeam === true`).
 *
 * `leaderId` is `null` for anonymous leaders (unregistered form).
 */
export interface TeamParticipant extends ParticipantBase {
  isTeam: true;

  teamName: string;

  /** Actual number of members in this team at registration time. */
  teamSize: number;

  /** Firebase Auth UID of the team leader, or `null` for anonymous leaders. */
  leaderId: string | null;

  leaderName: string;
  leaderRollNumber: string;

  members: TeamMember[];
}

// ── Discriminated union ───────────────────────────────────────────────────────

/**
 * Polymorphic type for any document in the participants subcollection.
 * Narrow using the `isTeam` discriminant:
 *
 * ```ts
 * if (participant.isTeam) {
 *   // participant is TeamParticipant
 * } else {
 *   // participant is IndividualParticipant
 * }
 * ```
 */
export type Participant = IndividualParticipant | TeamParticipant;
