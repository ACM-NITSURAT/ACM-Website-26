import type { Timestamp } from './firestore';

/**
 * Represents a document in the `/events/{eventId}` collection.
 * The document ID is either a human-readable slug or an auto-generated Firestore ID.
 */
export interface Event {
  /** Firestore document ID — slug or auto-ID. */
  id: string;

  eventName: string;
  eventDescription: string;

  /** Lifecycle state of the event. */
  status: 'upcoming' | 'ongoing' | 'finished';

  /** Publicly accessible URL for the event's cover/thumbnail image. */
  eventThumbnail: string;

  /** Broad classification of the event format. */
  type: 'event' | 'workshop' | 'meet';

  /**
   * Human-readable venue string.
   * Examples: "Online", "Computer Dept. Seminar Hall", "Main Audi"
   */
  location: string;

  /**
   * Freeform topic/technology tags for filtering and discovery.
   * Examples: ["Web3", "AI", "CP", "DevOps"]
   */
  tags: string[];

  /** Whether non-ACM members may register. */
  isOpenToAll: boolean;

  /**
   * When `true`, an anonymous (unregistered) user may participate via
   * an external form without a Firebase account.
   */
  unregisteredForm: boolean;

  /** Hard cap on the total number of registrations accepted. */
  maxParticipants: number;

  /** UTC timestamp for the event's start date/time. */
  startDate: Timestamp;

  /** UTC timestamp for the event's end date/time. */
  endDate: Timestamp;

  /** UTC timestamp recording when this document was first created. */
  creationDate: Timestamp;

  /** Denormalised running count of confirmed participants/teams. */
  totalParticipants: number;

  // ── Team-event configuration ─────────────────────────────────────────────

  /** `true` if participants register as teams rather than individuals. */
  isTeamEvent: boolean;

  /** Denormalised running count of registered teams. */
  totalTeams: number;

  /** Minimum number of members required to form a valid team. */
  minTeamMembers: number;

  /** Maximum number of members allowed in a single team. */
  maxTeamMembers: number;

  // ── Diversity constraints ─────────────────────────────────────────────────

  /** `true` if at least one female member is required per team/registration. */
  isFemaleMandatory: boolean;

  /** Minimum number of female participants required per team. */
  minFemaleRequired: number;
}
