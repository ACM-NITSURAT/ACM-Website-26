'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { doc, getDoc } from 'firebase/firestore';
import { useAuth, logout, auth, db } from '@/lib/firebase';
import type { User } from '@/schema/user';
import FlashingGrid from '@/components/sections/FlashingGrid';

type Gender = User['gender'];

export default function OnboardingPage() {
  const { user, role, loading } = useAuth();
  const router = useRouter();

  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [gender, setGender] = useState<Gender | ''>('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  // null = still checking, false = show form, true = already done (healing)
  const [alreadyComplete, setAlreadyComplete] = useState<boolean | null>(null);

  // Redirect unauthenticated users to login
  useEffect(() => {
    if (!loading && !user) router.replace('/login');
  }, [user, loading, router]);

  // Secondary check: cookie was missing/false but Firestore may say otherwise
  useEffect(() => {
    if (!user) return;

    getDoc(doc(db, 'users', user.uid))
      .then((snap) => {
        const data = snap.data() as Partial<User> | undefined;
        if (data?.isOnboardingCompleted) {
          // Firestore says done — heal the cookie and redirect
          setAlreadyComplete(true);
          auth.currentUser?.getIdToken()
            .then((idToken) => {
              if (!idToken) return;
              return fetch('/api/onboarding/heal', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ idToken }),
              });
            })
            .catch(() => {/* non-critical */})
            .finally(() => router.replace('/'));
        } else {
          setAlreadyComplete(false);
        }
      })
      .catch(() => {
        // Firestore unreachable — fall back to showing the form
        setAlreadyComplete(false);
      });
  }, [user, router]);

  // Pre-fill from OAuth display name if available
  useEffect(() => {
    if (!user) return;
    const parts = (user.displayName ?? '').split(' ');
    if (parts[0]) setFirstName(parts[0]);
    if (parts.slice(1).join(' ')) setLastName(parts.slice(1).join(' '));
  }, [user]);

  if (loading || !user || alreadyComplete === null) {
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
      const idToken = await auth.currentUser!.getIdToken(/* forceRefresh */ true);

      const res = await fetch('/api/onboarding', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken, firstName, lastName, gender }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string };
        console.error('[onboarding] server returned', res.status, body);
        setError(body.error ?? 'Something went wrong. Please try again.');
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
    <>
      {/* Cinematic Flashing Grid Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" style={{ maskImage: 'radial-gradient(ellipse 90% 80% at 50% 50%, black 40%, transparent 90%)', WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 50%, black 40%, transparent 90%)' }}>
        <div className="absolute inset-0 bg-[#07060a]" />
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(14, 165, 233, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(14, 165, 233, 0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <FlashingGrid />
        <div className="absolute top-[8%] -left-[5%] w-[600px] h-[600px] rounded-full animate-pulse" style={{ background: 'radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, transparent 70%)', animationDuration: '4s' }} />
        <div className="absolute bottom-[12%] -right-[8%] w-[500px] h-[500px] rounded-full animate-pulse" style={{ background: 'radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, transparent 70%)', animationDuration: '5s' }} />
      </div>

      <div className="relative min-h-screen flex items-center justify-center px-4 py-12 z-10">
        <div className="w-full max-w-md bg-[#12121a]/60 backdrop-blur-xl border border-white/5 rounded-xl p-8 sm:p-10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02),0_16px_40px_rgba(0,0,0,0.5)]">
          <div className="flex flex-col items-center mb-8 text-center">
            <svg viewBox="0 0 200 200" className="w-16 h-16 mb-4" aria-hidden="true">
              <defs>
                <linearGradient id="onboarding-acm-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#73bdf0" />
                  <stop offset="50%" stopColor="#4ba5e4" />
                  <stop offset="100%" stopColor="#2a82ca" />
                </linearGradient>
              </defs>
              <path d="M 100,0 L 200,100 L 100,200 L 0,100 Z" fill="url(#onboarding-acm-gradient)" />
              <circle cx="100" cy="100" r="58" fill="none" stroke="#ffffff" strokeWidth="5" />
              <text x="100" y="108" fontFamily="Arial, Helvetica, sans-serif" fontSize="44" fontWeight="900" fill="#ffffff" textAnchor="middle" letterSpacing="-1.5">acm</text>
              <text x="100" y="130" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontWeight="bold" fill="#ffffff" textAnchor="middle" letterSpacing="0.5">NIT SURAT</text>
            </svg>
            <h1 className="text-2xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>Complete Your Profile</h1>
            <p className="text-xs text-zinc-400 font-mono tracking-wide" style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}>
              Initialize your identity on the platform.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-5">

              <div className="grid grid-cols-2 gap-4">
                {/* First name */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="firstName" className="text-xs font-semibold text-zinc-400 tracking-widest uppercase" style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}>First Name</label>
                  <input
                    id="firstName"
                    type="text"
                    required
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-md px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#38bdf8] focus:bg-[#38bdf8]/5 transition-all shadow-inner"
                    placeholder="First"
                    style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}
                  />
                </div>

                {/* Last name */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="lastName" className="text-xs font-semibold text-zinc-400 tracking-widest uppercase" style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}>Last Name</label>
                  <input
                    id="lastName"
                    type="text"
                    required
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    className="bg-black/40 border border-white/10 rounded-md px-3 py-2.5 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#38bdf8] focus:bg-[#38bdf8]/5 transition-all shadow-inner"
                    placeholder="Last"
                    style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}
                  />
                </div>
              </div>

              {/* Email — readonly */}
              <div className="flex flex-col gap-2">
                <label htmlFor="email" className="text-xs font-semibold text-zinc-500 tracking-widest uppercase" style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}>Email (Locked)</label>
                <input
                  id="email"
                  type="email"
                  readOnly
                  value={user.email ?? ''}
                  className="bg-black/20 border border-white/5 rounded-md px-3 py-2.5 text-sm text-zinc-500 cursor-not-allowed shadow-inner"
                  style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                {/* Roll number — readonly, derived */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="rollNumber" className="text-xs font-semibold text-zinc-500 tracking-widest uppercase" style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}>Roll # (Locked)</label>
                  <input
                    id="rollNumber"
                    type="text"
                    readOnly
                    value={rollNumber}
                    className="bg-black/20 border border-white/5 rounded-md px-3 py-2.5 text-sm text-[#38bdf8] font-bold cursor-not-allowed shadow-inner"
                    style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}
                  />
                </div>

                {/* Role — readonly */}
                <div className="flex flex-col gap-2">
                  <label htmlFor="role" className="text-xs font-semibold text-zinc-500 tracking-widest uppercase" style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}>Role (Locked)</label>
                  <input
                    id="role"
                    type="text"
                    readOnly
                    value={role || 'member'}
                    className="bg-black/20 border border-white/5 rounded-md px-3 py-2.5 text-sm text-amber-500 font-bold uppercase cursor-not-allowed shadow-inner"
                    style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}
                  />
                </div>
              </div>

              {/* Gender */}
              <div className="flex flex-col gap-2">
                <label htmlFor="gender" className="text-xs font-semibold text-zinc-400 tracking-widest uppercase" style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}>Gender</label>
                <select
                  id="gender"
                  required
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="bg-black/40 border border-white/10 rounded-md px-3 py-2.5 text-sm text-white focus:outline-none focus:border-[#38bdf8] focus:bg-[#38bdf8]/5 transition-all shadow-inner appearance-none cursor-pointer"
                  style={{ 
                    fontFamily: 'var(--font-geist-mono), "Courier New", monospace',
                    backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\'12\' height=\'12\' viewBox=\'0 0 24 24\' fill=\'none\' stroke=\'rgba(14, 165, 233, 0.8)\' stroke-width=\'2\' stroke-linecap=\'round\' stroke-linejoin=\'round\'%3E%3Cpolyline points=\'6 9 12 15 18 9\'%3E%3C/polyline%3E%3C/svg%3E")',
                    backgroundRepeat: 'no-repeat',
                    backgroundPosition: 'right 12px center'
                  }}
                >
                  <option value="" disabled className="bg-[#07060a]">Select Identity</option>
                  <option value="male" className="bg-[#07060a]">Male</option>
                  <option value="female" className="bg-[#07060a]">Female</option>
                  <option value="other" className="bg-[#07060a]">Other</option>
                </select>
              </div>

              {error && <p className="text-xs text-red-400 font-mono mt-1">{error}</p>}

              <button
                type="submit"
                disabled={submitting}
                className="mt-4 bg-[#38bdf8] text-[#07060a] rounded-md py-3 text-sm font-bold uppercase tracking-widest hover:bg-[#7dd3fc] hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
                style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}
              >
                {submitting ? 'Initializing…' : 'Complete Setup'}
              </button>
            </form>

            <button
              onClick={handleLogout}
              className="mt-6 w-full text-center text-xs text-zinc-500 hover:text-red-400 uppercase tracking-widest transition-colors cursor-pointer"
              style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}
            >
              Abort & Sign Out
            </button>
          </div>
      </div>
    </>
  );
}
