import type { Timestamp } from './firestore';

/**
 * Position held within the ACM SVNIT core team.
 * Only applicable when `role === 'core'`; must be `null` for all other roles.
 */
export type CorePosition =
  | 'Chairperson'
  | 'Vice Chairperson'
  | 'Secretary'
  | 'Developer'
  | 'Community Head'
  | 'Designer'
  | 'Treasurer'
  | 'Social Media Manager'
  | 'Core Member';

/**
 * Represents a document in the `/users/{userId}` collection.
 * The document ID is the Firebase Auth UID.
 */
export interface User {
  /** Firebase Auth UID — mirrors the Firestore document ID. */
  id: string;

  firstName: string;
  lastName: string;
  email: string;

  /**
   * Institutional roll number.
   * Derived from email: everything before the '@' character.
   * e.g. email "u24ai091.aid@svnit.ac.in" → rollNumber "u24ai091.aid"
   */
  rollNumber: string;

  gender: 'male' | 'female' | 'other';

  /** Publicly accessible download URL for the user's profile picture. */
  profileImageUrl: string;

  /** Organisational role within ACM SVNIT. */
  role: 'member' | 'executive' | 'core' | 'adviser';

  /**
   * Position in the core team.
   * Must be non-null only when `role === 'core'`; null for all other roles.
   */
  position: CorePosition | null;

  /**
   * Whether the user has completed the mandatory onboarding form.
   * Defaults to `false` on account creation.
   * Set to `true` only after the user submits the onboarding form.
   * Any user with `isOnboardingCompleted === false` is redirected to /onboarding.
   */
  isOnboardingCompleted: boolean;

  /**
   * Grants unrestricted administrative access across the platform.
   * Defaults to `false` for all new accounts.
   */
  isSuperAdmin: boolean;

  // ── Leaderboard fields ──────────────────────────────────────────────────

  /**
   * Canonical branch code derived from the roll number / email.
   * e.g. 'CSE', 'ECE', 'AI'. See `src/config/leaderboard.ts` for the full mapping.
   * Null if the email doesn't follow the standard SVNIT format.
   */
  branch: string | null;

  /**
   * Expected graduation year derived from the roll number / email.
   * e.g. 2028. Null if unparseable.
   */
  graduationBatch: number | null;

  /**
   * URL-friendly slug for the student's leaderboard profile.
   * Format: "firstname-lastname-rollnumber" (e.g. "siddharth-sheth-u24cs024").
   * Generated on account creation. Null until leaderboard data exists.
   */
  leaderboardSlug: string | null;

  // ── Coding platform usernames (null = not linked) ─────────────────────

  /** LeetCode username */
  leetcodeUsername: string | null;
  /** Codeforces handle */
  codeforcesHandle: string | null;
  /** CodeChef username */
  codechefUsername: string | null;
  /** GitHub username */
  githubUsername: string | null;

  /** UTC timestamp of when the account was first created. */
  registrationTimestamp: Timestamp;
}
