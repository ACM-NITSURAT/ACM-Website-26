/**
 * Represents the single document at `/dict/executives`.
 *
 * This is a server-side allowlist. Any email present in the `emails` array
 * will be assigned `role: 'executive'` automatically when the user signs in
 * for the first time (handled by `syncUser` in `src/lib/firebase-admin/auth.ts`).
 *
 * - `role: 'core'` and `role: 'adviser'` must be set manually in Firestore.
 * - To promote someone to executive, add their email here. Their role will
 *   update on their next sign-in.
 * - To demote, remove their email here and manually update their user document.
 */
export interface ExecutivesDict {
  /** Document ID is always "executives". */
  id: 'executives';

  /**
   * List of email addresses that should receive `role: 'executive'`.
   * Lowercase, trimmed strings only.
   */
  emails: string[];
}
