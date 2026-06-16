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

  /** UTC timestamp of when the account was first created. */
  registrationTimestamp: Timestamp;
}
