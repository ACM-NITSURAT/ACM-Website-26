'use client';

import { useState } from 'react';
import Link from 'next/link';
import { sendPasswordReset } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState(false);
  const [loading, setLoading] = useState(false);

  async function handleReset(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await sendPasswordReset(email);
      // Firebase resolves silently even for unknown emails — log the attempt
      console.log('[Forgot Password] Reset email requested for:', email);
      setDone(true);
    } catch (err) {
      setError(err instanceof FirebaseError ? err.message : 'Something went wrong.');
    } finally {
      setLoading(false);
    }
  }

  if (done) {
    return (
      <div className="w-full max-w-sm text-center">
        <div className="text-3xl mb-4" aria-hidden="true">📬</div>
        <h1 className="text-xl font-semibold text-white mb-2">Check your inbox</h1>
        <p className="text-sm text-zinc-400">
          If an account exists for{' '}
          <span className="text-white">{email}</span>, a password reset link
          has been sent.
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
      <h1 className="text-2xl font-semibold text-white mb-1">Reset password</h1>
      <p className="text-sm text-zinc-400 mb-8">
        Enter your email and we&apos;ll send a reset link.
      </p>

      <form onSubmit={handleReset} className="flex flex-col gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="email" className="text-sm text-zinc-300">
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
            placeholder="you@example.com"
          />
        </div>

        {error && <p className="text-xs text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-1 bg-white text-zinc-900 rounded-md py-2 text-sm font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Sending…' : 'Send reset link'}
        </button>
      </form>

      <Link
        href="/login"
        className="mt-6 block text-center text-sm text-zinc-400 underline underline-offset-4 hover:text-white"
      >
        Back to sign in
      </Link>
    </div>
  );
}
