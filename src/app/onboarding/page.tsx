'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth, logout, auth } from '@/lib/firebase';
import type { User } from '@/schema/user';

type Gender = User['gender'];

export default function OnboardingPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Pre-fill from OAuth display name if available
  useEffect(() => {
    if (!user) return;
    const parts = (user.displayName ?? '').split(' ');
    if (parts[0]) setFirstName(parts[0]);
    if (parts.slice(1).join(' ')) setLastName(parts.slice(1).join(' '));
  }, [user]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-zinc-950">
        <span className="text-zinc-500 text-sm">Loading…</span>
      </div>
    );
  }

  // Derive rollNumber from email (first segment before '.')
  const rollNumber = user.email?.split('@')[0] ?? '';

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');

    if (!gender) { setError('Please select a gender.'); return; }

    setSubmitting(true);
    try {
      const idToken = await auth.currentUser!.getIdToken();

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, firstName, lastName, gender }),
      });

      if (!res.ok) {
        console.error('[onboarding] server returned', res.status, await res.text());
        setError('Please register using your institute email address (ending with .svnit.ac.in).');
        return;
      }

      router.replace('/profile');
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  async function handleLogout() {
    await logout();
    router.replace('/login');
  }

  return (
    <div className="min-h-screen bg-zinc-950 flex items-center justify-center px-4 py-12">
      <div className="w-full max-w-sm">
        <h1 className="text-2xl font-semibold text-white mb-1">Complete your profile</h1>
        <p className="text-sm text-zinc-400 mb-8">
          This information is required before you can use the platform.
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">

            {/* First name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="firstName" className="text-sm text-zinc-300">First name</label>
              <input
                id="firstName"
                type="text"
                required
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                placeholder="First name"
              />
            </div>

            {/* Last name */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="lastName" className="text-sm text-zinc-300">Last name</label>
              <input
                id="lastName"
                type="text"
                required
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:ring-1 focus:ring-zinc-500"
                placeholder="Last name"
              />
            </div>

            {/* Email — readonly */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="email" className="text-sm text-zinc-300">Email</label>
              <input
                id="email"
                type="email"
                readOnly
                value={user.email ?? ''}
                className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-400 cursor-not-allowed"
              />
            </div>

            {/* Roll number — readonly, derived */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="rollNumber" className="text-sm text-zinc-300">Roll number</label>
              <input
                id="rollNumber"
                type="text"
                readOnly
                value={rollNumber}
                className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-400 cursor-not-allowed"
              />
            </div>

            {/* Gender */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="gender" className="text-sm text-zinc-300">Gender</label>
              <select
                id="gender"
                required
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="bg-zinc-900 border border-zinc-700 rounded-md px-3 py-2 text-sm text-white focus:outline-none focus:ring-1 focus:ring-zinc-500"
              >
                <option value="" disabled>Select gender</option>
                <option value="male">Male</option>
                <option value="female">Female</option>
                <option value="other">Other</option>
              </select>
            </div>

            {/* Role — readonly */}
            <div className="flex flex-col gap-1.5">
              <label htmlFor="role" className="text-sm text-zinc-300">Role</label>
              <input
                id="role"
                type="text"
                readOnly
                value={role ?? '—'}
                className="bg-zinc-800 border border-zinc-700 rounded-md px-3 py-2 text-sm text-zinc-400 cursor-not-allowed uppercase"
              />
            </div>

            {error && <p className="text-xs text-red-400">{error}</p>}

            <button
              type="submit"
              disabled={submitting}
              className="mt-1 bg-white text-zinc-900 rounded-md py-2 text-sm font-medium hover:bg-zinc-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Saving…' : 'Confirm and continue'}
            </button>
          </form>

          <button
            onClick={handleLogout}
            className="mt-4 w-full text-center text-sm text-zinc-500 hover:text-zinc-300 transition-colors"
          >
            Sign out and cancel
          </button>
        </div>
    </div>
  );
}
