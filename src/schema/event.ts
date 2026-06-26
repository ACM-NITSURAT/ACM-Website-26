import type { Timestamp } from './firestore';

/**
 * Represents a document in the `/events/{eventId}` collection.
 *
 * Firestore document ID is an auto-generated random hash — never changes.
 * `slug` is the human-readable URL identifier used in event form links
 * (e.g., /events/hackathon-2025). Admins can customise it; defaults to
 * the auto-generated doc ID on creation.
 */
export interface Event {
  /** Firestore document ID — auto-generated random hash. Never changes. */
  id: string;

  /**
   * URL-friendly slug used as the public identifier in event links.
   * Defaults to the auto-generated doc ID. Admin can override it.
   * Must be unique across all events.
   * Example: "hackathon-2025", "webdev-workshop-jan"
   */
  slug: string;

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

  // ── Prize configuration ───────────────────────────────────────────────────

  /** Total prize pool in INR (₹). Set to `0` if there is no prize money. */
  prizeMoney: number;

  /**
   * Breakdown of prize money across the top three positions (INR).
   * All three keys are always present; set a position to `0` if unused.
   */
  prizeMoneyDistribution: PrizeMoneyDistribution;

  /**
   * Controls whether the public registration form is currently accepting
   * submissions. Admins toggle this from the event detail page.
   * Defaults to `false` on event creation — must be explicitly opened.
   * Cannot be set to `true` when `hasForm === false`.
   */
  isFormOpen: boolean;

  /**
   * Whether a custom form has been created for this event.
   * Defaults to `false`. Set to `true` when the admin saves a form via the
   * form builder. The `isFormOpen` toggle is hidden until this is `true`.
   * Not applicable for event types listed in `EVENT_TYPES_WITHOUT_FORMS`.
   */
  hasForm: boolean;
}

/** Prize breakdown across the top three positions. Values are in INR (₹). */
export interface PrizeMoneyDistribution {
  firstPrize: number;
  secondPrize: number;
  thirdPrize: number;
}
