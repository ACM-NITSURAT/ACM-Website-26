/**
 * /leaderboard/link-profiles — Link Your Coding Profiles
 *
 * Authenticated users can enter their coding platform usernames.
 * Each username is validated in real-time against the platform API.
 * Shows a preview (rating, rank) when valid.
 */

'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/lib/firebase';
import { auth } from '@/lib/firebase/auth';
import { PLATFORMS, SEARCH_DEBOUNCE_MS, type Platform, ALL_PLATFORMS } from '@/config/leaderboard';
import type { ValidationResult } from '@/server/leaderboard/adapters/types';
import Link from 'next/link';
import FlashingGrid from '@/components/sections/FlashingGrid';

interface PlatformField {
  username: string;
  status: 'idle' | 'validating' | 'valid' | 'invalid' | 'saving';
  validation: ValidationResult | null;
  dirty: boolean;
}

const initialField: PlatformField = {
  username: '',
  status: 'idle',
  validation: null,
  dirty: false,
};

export default function LinkProfilesPage() {
  const { user } = useAuth();
  const [fields, setFields] = useState<Record<Platform, PlatformField>>({
    leetcode: { ...initialField },
    codeforces: { ...initialField },
    codechef: { ...initialField },
    github: { ...initialField },
  });
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const timers = useRef<Record<string, NodeJS.Timeout>>({});

  // Load existing usernames from user doc
  useEffect(() => {
    if (!user) return;

    const loadUserData = async () => {
      try {
        const token = await auth.currentUser?.getIdToken();
        if (!token) return;

        const res = await fetch('/api/leaderboard/link-profiles', {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (res.ok) {
          const data = await res.json();
          const userData = data.user;

          setFields({
            leetcode: { ...initialField, username: userData?.leetcodeUsername ?? '' },
            codeforces: { ...initialField, username: userData?.codeforcesHandle ?? '' },
            codechef: { ...initialField, username: userData?.codechefUsername ?? '' },
            github: { ...initialField, username: userData?.githubUsername ?? '' },
          });
        }
      } catch {
        // Non-critical — user starts with empty fields
      }
    };

    loadUserData();
  }, [user]);

  // Validate a platform username
  const validateUsername = useCallback(async (platform: Platform, username: string) => {
    if (!username.trim()) {
      setFields((prev) => ({
        ...prev,
        [platform]: { ...prev[platform], status: 'idle', validation: null },
      }));
      return;
    }

    setFields((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], status: 'validating' },
    }));

    try {
      const res = await fetch('/api/leaderboard/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ platform, username: username.trim() }),
      });

      const result: ValidationResult = await res.json();

      setFields((prev) => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          status: result.valid ? 'valid' : 'invalid',
          validation: result,
        },
      }));
    } catch {
      setFields((prev) => ({
        ...prev,
        [platform]: {
          ...prev[platform],
          status: 'invalid',
          validation: { valid: false, error: 'Network error — try again' },
        },
      }));
    }
  }, []);

  // Handle username change with debounced validation
  const handleChange = (platform: Platform, value: string) => {
    setFields((prev) => ({
      ...prev,
      [platform]: { ...prev[platform], username: value, dirty: true },
    }));

    // Clear previous timer
    if (timers.current[platform]) {
      clearTimeout(timers.current[platform]);
    }

    // Debounce validation
    timers.current[platform] = setTimeout(() => {
      validateUsername(platform, value);
    }, SEARCH_DEBOUNCE_MS + 200);
  };

  // Save all profiles
  const handleSave = async () => {
    setSaving(true);
    setSaveMessage(null);

    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/leaderboard/link-profiles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken: token,
          leetcodeUsername: fields.leetcode.username.trim() || null,
          codeforcesHandle: fields.codeforces.username.trim() || null,
          codechefUsername: fields.codechef.username.trim() || null,
          githubUsername: fields.github.username.trim() || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to save');
      }

      setSaveMessage({ type: 'success', text: 'Profiles saved! Stats will sync shortly.' });

      // Reset dirty flags
      setFields((prev) => {
        const updated = { ...prev };
        for (const p of ALL_PLATFORMS) {
          updated[p] = { ...updated[p], dirty: false };
        }
        return updated;
      });
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Failed to save profiles',
      });
    } finally {
      setSaving(false);
    }
  };

  // Manual refresh
  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      const token = await auth.currentUser?.getIdToken();
      if (!token) throw new Error('Not authenticated');

      const res = await fetch('/api/leaderboard/sync/user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: token }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Refresh failed');

      setSaveMessage({ type: 'success', text: 'Stats refreshed successfully!' });
    } catch (err) {
      setSaveMessage({
        type: 'error',
        text: err instanceof Error ? err.message : 'Refresh failed',
      });
    } finally {
      setRefreshing(false);
    }
  };

  if (!user) {
    return (
      <div className="relative min-h-[70vh] flex flex-col items-center justify-center p-4">
        <div className="relative z-10 bg-[#12121a]/60 backdrop-blur-xl border border-white/5 p-10 rounded-2xl flex flex-col items-center max-w-md w-full text-center shadow-[0_0_50px_rgba(56,189,248,0.1)]">
          <h2 className="text-3xl font-black text-white mb-4" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>Access Denied</h2>
          <p className="text-zinc-400 font-mono mb-8 text-sm leading-relaxed">
            You must be logged in with your SVNIT email to connect your coding platforms and appear on the leaderboard.
          </p>
          <Link href="/login" className="bg-[#38bdf8] text-[#07060a] hover:bg-[#7dd3fc] hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] px-6 py-3 rounded-md transition-all font-bold uppercase tracking-widest text-sm w-full" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
            Sign In
          </Link>
        </div>
      </div>
    );
  }

  const hasDirtyFields = Object.values(fields).some((f) => f.dirty);
  const hasInvalid = Object.values(fields).some((f) => f.status === 'invalid');
  const hasAnyLinked = Object.values(fields).some((f) => f.username.trim());

  return (
    <div className="relative z-10 max-w-4xl mx-auto px-4 py-12">
      {/* Back link */}
      <Link href="/leaderboard" className="inline-flex items-center text-sm text-[#38bdf8] hover:text-white transition-colors mb-8 font-mono uppercase tracking-widest group" style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}>
        <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> Back to Leaderboard
      </Link>

      <div className="mb-12 text-center md:text-left">
        <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
          Link Your Profiles
        </h1>
        <p className="text-zinc-400 font-mono text-sm max-w-2xl leading-relaxed">
          Connect your accounts to securely track your stats. Usernames are validated in real-time. Changes may take a few minutes to reflect on the global leaderboard.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
        {ALL_PLATFORMS.map((platform) => {
          const field = fields[platform];
          const meta = PLATFORMS[platform];

          return (
            <div
              key={platform}
              className={`bg-[#12121a]/60 backdrop-blur-xl border rounded-2xl p-6 shadow-xl relative overflow-hidden group transition-all duration-300 ${
                field.status === 'valid' ? 'border-green-500/30' :
                field.status === 'invalid' ? 'border-red-500/30' :
                'border-white/10 hover:border-white/20'
              }`}
            >
              <div className="absolute -top-4 -right-4 p-6 opacity-5 blur-[2px] transition-all duration-500 group-hover:opacity-10 group-hover:scale-110 pointer-events-none text-9xl font-black" style={{ color: meta.color, fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
                {meta.displayName.charAt(0)}
              </div>

              <div className="flex items-center justify-between mb-6 relative z-10">
                <div className="flex items-center gap-3">
                  <span className="w-3 h-3 rounded-full" style={{ background: meta.color, boxShadow: `0 0 12px ${meta.color}` }} />
                  <span className="text-lg font-bold text-white uppercase tracking-widest" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
                    {meta.displayName}
                  </span>
                </div>
                {field.status === 'valid' && <span className="text-green-400">✓ Valid</span>}
                {field.status === 'invalid' && <span className="text-red-400">✗ Invalid</span>}
              </div>

              <div className="relative z-10">
                <input
                  type="text"
                  value={field.username}
                  onChange={(e) => handleChange(platform, e.target.value)}
                  placeholder={`Your ${meta.displayName} handle`}
                  className={`w-full bg-black/40 border rounded-lg px-4 py-3 text-sm text-white placeholder:text-zinc-600 focus:outline-none transition-all shadow-inner font-mono ${
                    field.status === 'valid' ? 'border-green-500/30 focus:border-green-500/50 bg-green-500/5' :
                    field.status === 'invalid' ? 'border-red-500/30 focus:border-red-500/50 bg-red-500/5' :
                    'border-white/10 focus:border-[#38bdf8]/50 focus:bg-[#38bdf8]/5'
                  }`}
                  style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}
                />

                <div className="h-16 mt-3">
                  {field.status === 'validating' && (
                    <div className="text-xs text-zinc-400 font-mono animate-pulse flex items-center gap-2">
                      <div className="w-3 h-3 border-2 border-zinc-400 border-t-transparent rounded-full animate-spin" />
                      Validating with API...
                    </div>
                  )}

                  {field.status === 'valid' && field.validation?.preview && (
                    <div className="flex flex-wrap gap-2">
                      {field.validation.preview.displayName && (
                        <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-zinc-300 font-mono uppercase tracking-widest">
                          Name: {field.validation.preview.displayName}
                        </span>
                      )}
                      {field.validation.preview.rating && (
                        <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-zinc-300 font-mono uppercase tracking-widest">
                          Rating: {field.validation.preview.rating}
                        </span>
                      )}
                      {field.validation.preview.rank && (
                        <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-zinc-300 font-mono uppercase tracking-widest">
                          Rank: {field.validation.preview.rank}
                        </span>
                      )}
                      {field.validation.preview.extra && (
                        <span className="px-2 py-1 bg-white/5 border border-white/10 rounded text-[10px] text-zinc-300 font-mono uppercase tracking-widest">
                          {field.validation.preview.extra}
                        </span>
                      )}
                    </div>
                  )}

                  {field.status === 'invalid' && field.validation?.error && (
                    <div className="text-xs text-red-400 font-mono">
                      {field.validation.error}
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row items-center gap-4 border-t border-white/10 pt-8">
        <button
          className="w-full sm:w-auto bg-[#38bdf8] text-[#07060a] px-8 py-3 rounded-md font-bold uppercase tracking-widest text-sm hover:bg-[#7dd3fc] hover:shadow-[0_0_20px_rgba(56,189,248,0.4)] disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}
          onClick={handleSave}
          disabled={saving || (!hasDirtyFields && !hasInvalid)}
        >
          {saving ? 'Saving...' : 'Save Profiles'}
        </button>

        {hasAnyLinked && (
          <button
            className="w-full sm:w-auto bg-white/5 border border-white/10 text-white px-8 py-3 rounded-md font-bold uppercase tracking-widest text-sm hover:bg-white/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}
            onClick={handleRefresh}
            disabled={refreshing}
          >
            {refreshing ? 'Refreshing API...' : '↻ Force Sync Stats'}
          </button>
        )}
      </div>

      {/* Status message */}
      {saveMessage && (
        <div className={`mt-6 p-4 rounded-lg font-mono text-sm tracking-widest border ${
          saveMessage.type === 'success' ? 'bg-green-500/10 border-green-500/20 text-green-400' : 'bg-red-500/10 border-red-500/20 text-red-400'
        }`}>
          {saveMessage.text}
        </div>
      )}
    </div>
  );
}
