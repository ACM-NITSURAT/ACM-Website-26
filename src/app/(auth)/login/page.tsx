'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { loginWithEmail, signInWithGoogle, callSessionApi, logout } from '@/lib/firebase';
import { FirebaseError } from 'firebase/app';
import InvalidEmailModal from '@/components/auth/InvalidEmailModal';
import LoggedOutModal from '@/components/auth/LoggedOutModal';
import { EARLY_REJECT } from '@/config';
import FlashingGrid from '@/components/sections/FlashingGrid';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showEmailModal, setShowEmailModal] = useState(false);
  const [showLoggedOutModal, setShowLoggedOutModal] = useState(false);
  const router = useRouter();
  const searchParams = useSearchParams();

  // On mount, check for modal triggers
  useEffect(() => {
    if (searchParams.get('rejected') === '1') {
      setShowEmailModal(true);
    } else if (searchParams.get('logged_out') === 'incomplete_registration') {
      setShowLoggedOutModal(true);
    }
  }, [searchParams]);

  async function afterSignIn() {
    const { role, isOnboardingCompleted, emailRejected } = await callSessionApi();
    console.log('[Login] role:', role, '| onboarding done:', isOnboardingCompleted, '| email rejected:', emailRejected);

    if (emailRejected) {
      if (EARLY_REJECT) {
        // Priority: logout immediately (invalid session)
        await logout();
        // Then show acknowledgement modal via URL param
        router.replace('/login?rejected=1');
      } else {
        // Late rejection: onboarding form will show friendly error
        router.replace('/onboarding');
      }
      return;
    }

    router.replace(isOnboardingCompleted ? '/profile' : '/onboarding');
  }

  function handleDismissEmailModal() {
    setShowEmailModal(false);
    router.replace('/login');
  }

  function handleDismissLoggedOutModal() {
    setShowLoggedOutModal(false);
    router.replace('/login');
  }

  async function handleEmailLogin(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const credential = await loginWithEmail(email, password);
      console.log('[Login] Firebase credential:', credential);
      await afterSignIn();
    } catch (err) {
      setError(err instanceof FirebaseError ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleGoogleLogin() {
    setError('');
    setLoading(true);
    try {
      const credential = await signInWithGoogle();
      console.log('[Google Login] Firebase credential:', credential);
      await afterSignIn();
    } catch (err) {
      if (err instanceof FirebaseError && err.code === 'auth/popup-closed-by-user') return;
      setError(err instanceof FirebaseError ? err.message : 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {showEmailModal && <InvalidEmailModal onDismiss={handleDismissEmailModal} />}
      {showLoggedOutModal && <LoggedOutModal onDismiss={handleDismissLoggedOutModal} />}

      {/* Cinematic Flashing Grid Background */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none z-0" style={{ maskImage: 'radial-gradient(ellipse 90% 80% at 50% 50%, black 40%, transparent 90%)', WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 50%, black 40%, transparent 90%)' }}>
        <div className="absolute inset-0" style={{ backgroundImage: 'linear-gradient(rgba(14, 165, 233, 0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(14, 165, 233, 0.1) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <FlashingGrid />
        <div className="absolute top-[8%] -left-[5%] w-[600px] h-[600px] rounded-full animate-pulse" style={{ background: 'radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, transparent 70%)', animationDuration: '4s' }} />
        <div className="absolute bottom-[12%] -right-[8%] w-[500px] h-[500px] rounded-full animate-pulse" style={{ background: 'radial-gradient(circle, rgba(14, 165, 233, 0.08) 0%, transparent 70%)', animationDuration: '5s' }} />
      </div>

      <div className="relative z-10 w-full max-w-md bg-[#12121a]/60 backdrop-blur-xl border border-white/5 rounded-xl p-8 sm:p-10 shadow-[inset_0_0_0_1px_rgba(255,255,255,0.02),0_16px_40px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col items-center mb-10 text-center">
          <svg viewBox="0 0 200 200" className="w-16 h-16 mb-4" aria-hidden="true">
            <defs>
              <linearGradient id="auth-acm-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#73bdf0" />
                <stop offset="50%" stopColor="#4ba5e4" />
                <stop offset="100%" stopColor="#2a82ca" />
              </linearGradient>
            </defs>
            <path d="M 100,0 L 200,100 L 100,200 L 0,100 Z" fill="url(#auth-acm-gradient)" />
            <circle cx="100" cy="100" r="58" fill="none" stroke="#ffffff" strokeWidth="5" />
            <text x="100" y="108" fontFamily="Arial, Helvetica, sans-serif" fontSize="44" fontWeight="900" fill="#ffffff" textAnchor="middle" letterSpacing="-1.5">acm</text>
            <text x="100" y="130" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontWeight="bold" fill="#ffffff" textAnchor="middle" letterSpacing="0.5">NIT SURAT</text>
          </svg>
          <h1 className="text-3xl font-bold text-white mb-2" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>Sign In</h1>
          <p className="text-sm text-zinc-400 font-mono tracking-wide" style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}>
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[#38bdf8] hover:text-[#7dd3fc] transition-colors underline underline-offset-4 cursor-pointer">
              Register
            </Link>
          </p>
        </div>

        <form onSubmit={handleEmailLogin} className="flex flex-col gap-5">
          <div className="flex flex-col gap-2">
            <label htmlFor="email" className="text-xs font-semibold text-zinc-400 tracking-widest uppercase" style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}>Email</label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-md px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#38bdf8] focus:bg-[#38bdf8]/5 transition-all shadow-inner"
              placeholder="rollnum@deptcode.svnit.ac.in"
              style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}
            />
            <p className="text-[10px] text-zinc-500 mt-1" style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}>* Please use your official SVNIT institute email ID</p>
          </div>

          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label htmlFor="password" className="text-xs font-semibold text-zinc-400 tracking-widest uppercase" style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}>Password</label>
              <Link
                href="/forgot-password"
                className="text-[10px] text-zinc-500 hover:text-[#38bdf8] transition-colors uppercase tracking-wider cursor-pointer"
                style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}
              >
                Forgot Password?
              </Link>
            </div>
            <input
              id="password"
              type="password"
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="bg-black/40 border border-white/10 rounded-md px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none focus:border-[#38bdf8] focus:bg-[#38bdf8]/5 transition-all shadow-inner"
              placeholder="••••••••"
              style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}
            />
          </div>

          {error && <p className="text-xs text-red-400 font-mono mt-1">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="mt-4 bg-[#38bdf8] text-[#07060a] rounded-md py-3 text-sm font-bold uppercase tracking-widest hover:bg-[#7dd3fc] hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
            style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}
          >
            {loading ? 'Authenticating…' : 'Sign in'}
          </button>
        </form>

        <div className="flex items-center gap-4 my-8 opacity-60">
          <span className="flex-1 h-px bg-gradient-to-r from-transparent to-zinc-600" />
          <span className="text-[10px] text-zinc-400 font-mono tracking-widest uppercase" style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}>Or Continue With</span>
          <span className="flex-1 h-px bg-gradient-to-l from-transparent to-zinc-600" />
        </div>

        <button
          onClick={handleGoogleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white/5 border border-white/10 rounded-md py-3 text-sm text-zinc-200 hover:bg-white/10 hover:border-white/20 hover:text-white disabled:opacity-50 disabled:cursor-not-allowed transition-all cursor-pointer"
          style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}
        >
          <GoogleIcon />
          <span>Continue with Google</span>
        </button>
      </div>
    </>
  );
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z" />
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z" />
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z" />
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z" />
    </svg>
  );
}
