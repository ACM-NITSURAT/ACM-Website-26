import type { Timestamp } from './firestore';

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

  /** Institutional roll number, e.g. "22CE001". */
  rollNumber: string;

  gender: 'male' | 'female' | 'other';

  /** Publicly accessible download URL for the user's profile picture. */
  profileImageUrl: string;

  /** Organisational role within ACM SVNIT. */
  role: 'member' | 'executive' | 'core' | 'adviser';

  /**
   * Grants unrestricted administrative access across the platform.
   * Defaults to `false` for all new accounts.
   */
  isSuperAdmin: boolean;

  /** UTC timestamp of when the account was first created. */
  registrationTimestamp: Timestamp;
}
