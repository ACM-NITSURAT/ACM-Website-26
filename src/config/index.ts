/**
 * App-wide configuration constants.
 *
 * Add non-secret, non-environment-specific values here.
 * For secrets or environment-dependent values, use .env variables.
 */

/**
 * When true: a user who signs in with a non-SVNIT email is immediately
 * signed out and shown the InvalidEmailModal — they never reach onboarding.
 *
 * When false: the user reaches onboarding but sees a friendly error when
 * they try to submit the form with an unauthorised email.
 *
 * Only has any effect when DEV_MODE=false.
 */
export const EARLY_REJECT = false;
