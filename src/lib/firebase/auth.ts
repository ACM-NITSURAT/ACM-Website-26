import {
  getAuth,
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  signInWithPopup,
  signOut,
  sendEmailVerification,
  sendPasswordResetEmail,
  type Auth,
  type User,
  type UserCredential,
} from 'firebase/auth';
import app from './app';

// ── Singleton instances ───────────────────────────────────────────────────────

export const auth: Auth = getAuth(app);

const googleProvider = new GoogleAuthProvider();

// ── Google OAuth ──────────────────────────────────────────────────────────────

/**
 * Opens a Google sign-in popup and returns the credential.
 * Works for both new and returning Google users — Firebase handles both cases.
 */
export async function signInWithGoogle(): Promise<UserCredential> {
  return signInWithPopup(auth, googleProvider);
}

// ── Email / Password ──────────────────────────────────────────────────────────

/**
 * Creates a new account with email and password, then immediately sends
 * a verification email to the registered address.
 */
export async function registerWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await sendVerificationEmail(credential.user);
  return credential;
}

/**
 * Signs in an existing user with email and password.
 */
export async function loginWithEmail(
  email: string,
  password: string,
): Promise<UserCredential> {
  return signInWithEmailAndPassword(auth, email, password);
}

// ── Email verification ────────────────────────────────────────────────────────

/**
 * Sends a verification email to the given user.
 * Call this after registration, or to re-send if the original email expired.
 */
export async function sendVerificationEmail(user: User): Promise<void> {
  return sendEmailVerification(user);
}

// ── Password reset ────────────────────────────────────────────────────────────

/**
 * Sends a password-reset email to the given address.
 * Resolves silently even if the email is not registered (Firebase behaviour —
 * avoids leaking whether an account exists).
 */
export async function sendPasswordReset(email: string): Promise<void> {
  return sendPasswordResetEmail(auth, email);
}

// ── Sign out ──────────────────────────────────────────────────────────────────

/**
 * Signs the current user out and clears the local auth state.
 */
export async function logout(): Promise<void> {
  return signOut(auth);
}
