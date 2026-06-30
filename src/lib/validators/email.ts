/**
 * SVNIT institutional email validator.
 *
 * Expected format: <rollNumber>.<branch>@svnit.ac.in
 * Example: u24ai091.aid@svnit.ac.in
 *
 * This module is side-effect free and runs in both server and browser contexts.
 */

/** Matches any email ending with @svnit.ac.in or @subdomain.svnit.ac.in */
const SVNIT_EMAIL_REGEX = /^[^\s@]+@([a-z0-9-]+\.)*svnit\.ac\.in$/i;

/**
 * Returns true if the email conforms to the SVNIT domain pattern.
 * Always returns true when DEV_MODE is enabled.
 *
 * @param email   - The email address to validate.
 * @param devMode - Pass `process.env.DEV_MODE === 'true'` on the server,
 *                  or `process.env.NEXT_PUBLIC_DEV_MODE === 'true'` on the client.
 */
export function isValidSvnitEmail(email: string, devMode: boolean): boolean {
  if (devMode) return true;
  return SVNIT_EMAIL_REGEX.test(email.trim());
}

export const SVNIT_EMAIL_ERROR =
  'Only SVNIT institutional emails are allowed (e.g. u24ai091@aid.svnit.ac.in).';
