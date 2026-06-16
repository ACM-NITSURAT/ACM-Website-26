'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { registerWithEmail, signInWithGoogle, callSessionApi } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';
import { isValidSvnitEmail, SVNIT_EMAIL_ERROR } from '@/lib/validators/email';

const devMode = process.env.NEXT_PUBLIC_DEV_MODE === 'true';

export default function RegisterPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function afterSignIn() {
    const { role, isOnboardingCompleted } = await callSessionApi();
    console.log('[Register] role:', role, '| onboarding done:', isOnboardingCompleted);
    if (!isOnboardingCompleted) router.replace('/onboarding');
  }

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    if (password !== confirm) { setError('Passwords do not match.'); return; }
    if (!isValidSvnitEmail(email, devMode)) { setError(SVNIT_EMAIL_ERROR); return; }
    setLoading(true);
    try {
      const credential = await registerWithEmail(email, password);
      console.log('[Register] Firebase credential:', credential);
      await afterSignIn();
      setDone(true);
    } catch (err) {
      setError(err instanceof FirebaseError ? err.message : 'Registration failed.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleRegister() {
    setError('');
    setLoading(true);
    try {
      const credential = await signInWithGoogle();
      console.log('[Google Register] Firebase credential:', credential);
      await afterSignIn();
    } catch (err) {
      setError(err instanceof FirebaseError ? err.message : 'Google sign-in failed.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="text-3xl mb-4" aria-hidden="true">✉️</div>
        <h1 className="text-xl font-semibold text-white mb-2">Verify your email</h1>
        <p className="text-sm text-zinc-400">
          A verification link has been sent to{' '}
          <span className="text-white">{email}</span>. Check your inbox and
          click the link to activate your account.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm text-zinc-400 underline underline-offset-4 hover:text-white"
        >
          Back to sign in
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full max-w-sm">
      <h1 className="text-2xl font-semibold text-white mb-1">Create account</h1>
      <p className="text-sm text-zinc-400 mb-8">
        Already have an account?{' '}
        <Link href="/login" className="text-white underline underline-offset-4">
          Sign in
        </Link>
      </p>

      <form onSubmit={handleRegister} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm text-zinc-300">Email</label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            placeholder={!devMode ? 'u24ai091.aid@svnit.ac.in' : 'you@example.com'}
          />
          {!devMode && (
            <p className="text-xs text-zinc-500">Only @svnit.ac.in emails are accepted.</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="password" className="text-sm text-zinc-300">Password</label>
          <input
            id="password"
            type="password"
            autoComplete="new-password"
            required
            minLength={6}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            placeholder="Min. 6 characters"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="confirm" className="text-sm text-zinc-300">Confirm password</label>
          <input
            id="confirm"
            type="password"
            autoComplete="new-password"
            required
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            placeholder="••••••••"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 bg-white text-zinc-900 rounded-md py-2 text-sm font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Creating account…' : 'Create account'}
        </button>
      </form>

      <div className="flex items-center gap-3 my-6">
        <span className="flex-1 h-px bg-zinc-800" />
        <span className="text-xs text-zinc-500">or</span>
        <span className="flex-1 h-px bg-zinc-800" />
      </div>

      <button
        onClick={handleGoogleRegister}
        disabled={loading}
        className="w-full flex items-center justify-center gap-2.5 bg-zinc-900 border border-zinc-700 rounded-md py-2 text-sm text-white hover:bg-zinc-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
      >
        <GoogleIcon />
        Continue with Google
      </button>
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
