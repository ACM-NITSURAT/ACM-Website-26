/**
 * /leaderboard/student/[slug] — Student Profile
 *
 * Shows full coding profile for a single student:
 *  - ACM Score card with rank badges
 *  - Platform stats cards (raw data, never normalized)
 *  - Weekly deltas
 *  - Platform links
 */

'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Image from 'next/image';
import Link from 'next/link';
import { PLATFORMS, type Platform, ALL_PLATFORMS } from '@/config/leaderboard';
import type { LeaderboardEntry } from '@/schema/leaderboard';
import DeltaBadge from '@/components/leaderboard/DeltaBadge';
import PlatformBadge from '@/components/leaderboard/PlatformBadge';
import { formatCompactNumber } from '@/lib/utils/formatters';
import FlashingGrid from '@/components/sections/FlashingGrid';

export default function StudentProfilePage() {
  const params = useParams();
  const slug = params.slug as string;
  const [entry, setEntry] = useState<LeaderboardEntry | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) return;

    async function fetchProfile() {
      setLoading(true);
      try {
        const res = await fetch(`/api/leaderboard/student/${slug}`);
        if (res.status === 404) throw new Error('Student not found');
        if (!res.ok) throw new Error('Failed to fetch profile');

        const json = await res.json();
        setEntry(json.data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Something went wrong');
      } finally {
        setLoading(false);
      }
    }

    fetchProfile();
  }, [slug]);

  if (loading) return <ProfileSkeleton />;
  if (error) return <ErrorState message={error} />;
  if (!entry) return <ErrorState message="Student not found" />;

  return (
    <div className="relative min-h-screen text-white overflow-hidden pb-20 selection:bg-[#38bdf8]/30">
      {/* Background */}
      <div className="fixed inset-0 pointer-events-none z-0" style={{ maskImage: 'radial-gradient(ellipse 90% 80% at 50% 50%, black 40%, transparent 90%)', WebkitMaskImage: 'radial-gradient(ellipse 90% 80% at 50% 50%, black 40%, transparent 90%)' }}>
        <div className="absolute inset-0 bg-[#07060a]" />
        <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'linear-gradient(rgba(14, 165, 233, 0.2) 1px, transparent 1px), linear-gradient(90deg, rgba(14, 165, 233, 0.2) 1px, transparent 1px)', backgroundSize: '60px 60px' }} />
        <FlashingGrid />
        <div className="absolute top-[8%] -left-[5%] w-[600px] h-[600px] rounded-full animate-pulse opacity-60" style={{ background: 'radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, transparent 70%)', animationDuration: '4s' }} />
        <div className="absolute bottom-[12%] -right-[8%] w-[500px] h-[500px] rounded-full animate-pulse opacity-60" style={{ background: 'radial-gradient(circle, rgba(14, 165, 233, 0.1) 0%, transparent 70%)', animationDuration: '5s' }} />
      </div>

      <div className="relative z-10 max-w-5xl mx-auto px-4 pt-8">
        {/* Back link */}
        <Link href="/leaderboard" className="inline-flex items-center text-sm text-[#38bdf8] hover:text-white transition-colors mb-6 font-mono uppercase tracking-widest group" style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}>
          <span className="mr-2 group-hover:-translate-x-1 transition-transform">←</span> Back to Leaderboard
        </Link>

        {/* Profile header - ACM ID Card Style */}
        <div className="relative overflow-hidden bg-[#12121a]/60 backdrop-blur-xl border border-white/10 p-8 rounded-2xl shadow-2xl mb-8 flex flex-col md:flex-row items-center md:items-start gap-8">
          
          {/* ACM Watermark */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 opacity-5 pointer-events-none">
            <svg viewBox="0 0 200 200" className="w-96 h-96" aria-hidden="true">
              <path d="M 100,0 L 200,100 L 100,200 L 0,100 Z" fill="#ffffff" />
              <circle cx="100" cy="100" r="58" fill="none" stroke="#ffffff" strokeWidth="5" />
              <text x="100" y="108" fontFamily="Arial, Helvetica, sans-serif" fontSize="44" fontWeight="900" fill="#ffffff" textAnchor="middle" letterSpacing="-1.5">acm</text>
            </svg>
          </div>

          {/* Left Column: Avatar & Logo */}
          <div className="flex flex-col items-center gap-4 relative z-10">
            <div className="relative w-32 h-32 shrink-0 rounded-xl border border-white/10 overflow-hidden shadow-[0_0_30px_rgba(56,189,248,0.2)] bg-black/50">
              {entry.profileImageUrl ? (
                <Image src={entry.profileImageUrl} alt={entry.displayName} fill className="object-cover" />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-5xl font-bold text-[#38bdf8]" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
                  {entry.displayName.charAt(0)}
                </div>
              )}
              {/* Scanline effect */}
              <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.2)_50%)] bg-[length:100%_4px] pointer-events-none mix-blend-overlay" />
            </div>
            
            {/* Small ACM Logo */}
            <svg viewBox="0 0 200 200" className="w-12 h-12" aria-hidden="true">
              <defs>
                <linearGradient id="student-acm-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#73bdf0" />
                  <stop offset="50%" stopColor="#4ba5e4" />
                  <stop offset="100%" stopColor="#2a82ca" />
                </linearGradient>
              </defs>
              <path d="M 100,0 L 200,100 L 100,200 L 0,100 Z" fill="url(#student-acm-gradient)" />
              <circle cx="100" cy="100" r="58" fill="none" stroke="#ffffff" strokeWidth="5" />
              <text x="100" y="108" fontFamily="Arial, Helvetica, sans-serif" fontSize="44" fontWeight="900" fill="#ffffff" textAnchor="middle" letterSpacing="-1.5">acm</text>
              <text x="100" y="130" fontFamily="Arial, Helvetica, sans-serif" fontSize="11" fontWeight="bold" fill="#ffffff" textAnchor="middle" letterSpacing="0.5">NIT SURAT</text>
            </svg>
          </div>

          {/* Right Column: Info */}
          <div className="flex flex-col items-center md:items-start text-center md:text-left flex-1 relative z-10 pt-2">
            <div className="inline-flex items-center px-2 py-1 bg-[#2a82ca]/20 border border-[#2a82ca]/30 rounded text-[#73bdf0] text-[10px] uppercase tracking-widest font-bold mb-3" style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}>
              ACM Student Profile
            </div>
            <h1 className="text-4xl md:text-5xl font-black text-white mb-2 tracking-tight" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
              {entry.displayName}
            </h1>
            <p className="text-[#38bdf8] font-mono text-sm tracking-widest uppercase mb-6 bg-[#38bdf8]/10 px-3 py-1 rounded inline-block border border-[#38bdf8]/20 shadow-inner">
              ID: {entry.rollNumber}
            </p>
            
            <div className="flex flex-wrap items-center justify-center md:justify-start gap-4 w-full">
              <div className="flex flex-col bg-black/30 px-4 py-2 rounded-lg border border-white/5 min-w-[100px]">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Branch</span>
                <span className="text-sm font-bold text-white uppercase">{entry.branch}</span>
              </div>
              <div className="flex flex-col bg-black/30 px-4 py-2 rounded-lg border border-white/5 min-w-[100px]">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Year</span>
                <span className="text-sm font-bold text-white uppercase">{entry.currentYear}</span>
              </div>
              <div className="flex flex-col bg-black/30 px-4 py-2 rounded-lg border border-white/5 min-w-[100px]">
                <span className="text-[10px] text-zinc-500 uppercase tracking-widest font-mono">Batch</span>
                <span className="text-sm font-bold text-white uppercase">{entry.graduationBatch}</span>
              </div>
            </div>
          </div>
        </div>

        {/* ACM Score card */}
        <div className="relative overflow-hidden bg-gradient-to-br from-[#12121a]/80 to-[#1a1a2e]/80 backdrop-blur-xl border border-[#38bdf8]/30 p-8 rounded-2xl shadow-[0_0_40px_rgba(56,189,248,0.1)] mb-12 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="absolute inset-0 bg-[url('/noise.png')] opacity-[0.03] mix-blend-overlay pointer-events-none" />
          
          <div className="flex flex-col items-center md:items-start relative z-10">
            <span className="text-sm text-[#73bdf0] uppercase tracking-widest font-mono mb-2 flex items-center gap-2">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon></svg>
              Global ACM Score
            </span>
            <div className="flex items-baseline gap-4">
              <span className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-[#e0f2fe] to-[#38bdf8]" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
                {entry.acm.score.toFixed(1)}
              </span>
              <DeltaBadge
                current={entry.acm.score}
                previous={entry.previousSnapshot?.acmScore ?? null}
                precision={1}
              />
            </div>
          </div>
          
          <div className="flex items-center gap-6 md:gap-12 relative z-10 bg-black/40 p-4 rounded-xl border border-white/5">
            <div className="flex flex-col items-center gap-1">
              <span className="text-4xl font-bold text-[#38bdf8]" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
                #{entry.acm.overallRank}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">Overall</span>
            </div>
            <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
                #{entry.acm.branchRank}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">{entry.branch}</span>
            </div>
            <div className="w-px h-16 bg-gradient-to-b from-transparent via-white/20 to-transparent" />
            <div className="flex flex-col items-center gap-1">
              <span className="text-3xl font-bold text-white" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
                #{entry.acm.yearRank}
              </span>
              <span className="text-[10px] text-zinc-400 font-mono uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">Year {entry.currentYear}</span>
            </div>
          </div>
        </div>

        {/* Platform stats grid */}
        <h2 className="text-xl font-bold text-white mb-6 uppercase tracking-widest" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
          Platform Analytics
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
          {ALL_PLATFORMS.map((platform) => (
            <PlatformCard key={platform} platform={platform} entry={entry} />
          ))}
        </div>

        {/* Sync info */}
        {entry.sync.lastSync && (
          <p className="text-center text-xs text-zinc-600 font-mono uppercase tracking-widest">
            Last Indexed: {new Date(entry.sync.lastSync).toLocaleString('en-IN')}
          </p>
        )}
      </div>
    </div>
  );
}

// ── Platform Card ─────────────────────────────────────────────────────────────

function PlatformCard({ platform, entry }: { platform: Platform; entry: LeaderboardEntry }) {
  const meta = PLATFORMS[platform];
  const stats = entry[platform];

  if (!stats) {
    return (
      <div className="bg-black/30 backdrop-blur-md border border-white/5 rounded-2xl p-6 shadow-inner relative overflow-hidden group">
        <div className="absolute top-0 right-0 p-6 opacity-10 blur-[2px] transition-opacity group-hover:opacity-20 pointer-events-none text-8xl font-black text-white" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
          {meta.displayName.charAt(0)}
        </div>
        <div className="flex items-center gap-3 mb-6 relative z-10">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}` }} />
          <span className="text-sm font-bold text-white uppercase tracking-widest" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
            {meta.displayName}
          </span>
        </div>
        <div className="flex items-center justify-center h-24 border border-dashed border-white/10 rounded-xl bg-black/20">
          <p className="text-xs text-zinc-600 font-mono uppercase tracking-widest">Not linked</p>
        </div>
      </div>
    );
  }

  const profileUrl = meta.profileUrl.replace('{username}',
    'username' in stats ? stats.username : ('handle' in stats ? (stats as any).handle : ''));

  return (
    <div className="bg-[#12121a]/60 backdrop-blur-xl border border-white/10 rounded-2xl p-6 shadow-xl relative overflow-hidden group hover:border-white/20 transition-colors">
      <div className="absolute -top-4 -right-4 p-6 opacity-5 blur-[2px] transition-all duration-500 group-hover:opacity-10 group-hover:scale-110 pointer-events-none text-9xl font-black" style={{ color: meta.color, fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
        {meta.displayName.charAt(0)}
      </div>
      
      <div className="flex items-center justify-between mb-4 relative z-10">
        <div className="flex items-center gap-3">
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: meta.color, boxShadow: `0 0 10px ${meta.color}` }} />
          <span className="text-sm font-bold text-white uppercase tracking-widest" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
            {meta.displayName}
          </span>
        </div>
        <a href={profileUrl} target="_blank" rel="noopener noreferrer" className="text-zinc-500 hover:text-white transition-colors" aria-label={`View ${meta.displayName} profile`}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"></path>
            <polyline points="15 3 21 3 21 9"></polyline>
            <line x1="10" y1="14" x2="21" y2="3"></line>
          </svg>
        </a>
      </div>
      
      <div className="mb-6 relative z-10 inline-block">
        <PlatformBadge platform={platform} stats={stats} />
      </div>

      <div className="grid grid-cols-2 gap-4 relative z-10" style={{ fontFamily: 'var(--font-geist-mono), "Courier New", monospace' }}>
        {platform === 'leetcode' && entry.leetcode && (
          <>
            <StatItem label="Username" value={entry.leetcode.username} />
            <StatItem label="Rating" value={Math.round(entry.leetcode.rating)} color={meta.color} />
            <StatItem label="Global Rank" value={formatCompactNumber(entry.leetcode.globalRank)} />
            <StatItem label="Solved" value={entry.leetcode.totalSolved} />
            <StatItem label="Easy" value={entry.leetcode.easySolved} color="#22c55e" />
            <StatItem label="Medium" value={entry.leetcode.mediumSolved} color="#eab308" />
            <StatItem label="Hard" value={entry.leetcode.hardSolved} color="#ef4444" />
            <StatItem label="Contests" value={entry.leetcode.contestCount} />
          </>
        )}
        {platform === 'codeforces' && entry.codeforces && (
          <>
            <StatItem label="Handle" value={entry.codeforces.handle} />
            <StatItem label="Rating" value={entry.codeforces.currentRating} color={meta.color} />
            <StatItem label="Max Rating" value={entry.codeforces.maxRating} />
            <StatItem label="Max Rank" value={entry.codeforces.maxRank} />
            <StatItem label="Solved" value={entry.codeforces.problemsSolved} />
            <StatItem label="Contests" value={entry.codeforces.contestCount} />
          </>
        )}
        {platform === 'codechef' && entry.codechef && (
          <>
            <StatItem label="Username" value={entry.codechef.username} />
            <StatItem label="Rating" value={entry.codechef.currentRating} color={meta.color} />
            <StatItem label="Highest" value={entry.codechef.highestRating} />
            <StatItem label="Global Rank" value={formatCompactNumber(entry.codechef.globalRank)} />
            <StatItem label="Contests" value={entry.codechef.contestCount} />
          </>
        )}
        {platform === 'github' && entry.github && (
          <>
            <StatItem label="Username" value={entry.github.username} />
            <StatItem label="Repos" value={entry.github.publicRepos} />
            <StatItem label="Commits" value={formatCompactNumber(entry.github.totalCommits)} color="#22c55e" />
            <StatItem label="Stars" value={formatCompactNumber(entry.github.starsReceived)} color="#eab308" />
            <StatItem label="PRs" value={formatCompactNumber(entry.github.pullRequests)} />
            <StatItem label="Followers" value={formatCompactNumber(entry.github.followers)} />
          </>
        )}
      </div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className="flex flex-col p-3 bg-black/40 rounded-lg border border-white/5 shadow-inner">
      <span className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">{label}</span>
      <span className="text-sm font-bold truncate" style={color ? { color } : { color: 'white' }}>{value}</span>
    </div>
  );
}

// ── Loading / Error ───────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className="min-h-screen bg-[#07060a] p-8 flex flex-col items-center justify-center">
      <div className="w-32 h-32 rounded-full bg-white/5 animate-pulse mb-8" />
      <div className="w-64 h-8 bg-white/5 rounded animate-pulse mb-4" />
      <div className="w-48 h-4 bg-white/5 rounded animate-pulse mb-12" />
      <div className="w-full max-w-5xl h-40 bg-white/5 rounded-2xl animate-pulse mb-12" />
      <div className="w-full max-w-5xl grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="h-64 bg-white/5 rounded-2xl animate-pulse" />
        <div className="h-64 bg-white/5 rounded-2xl animate-pulse" />
        <div className="h-64 bg-white/5 rounded-2xl animate-pulse" />
        <div className="h-64 bg-white/5 rounded-2xl animate-pulse" />
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className="min-h-screen bg-[#07060a] flex flex-col items-center justify-center p-4">
      <FlashingGrid />
      <div className="relative z-10 bg-[#12121a]/60 backdrop-blur-xl border border-red-500/20 p-10 rounded-2xl flex flex-col items-center max-w-md w-full text-center shadow-[0_0_50px_rgba(239,68,68,0.1)]">
        <h2 className="text-4xl font-black text-red-500 mb-4" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>Oops</h2>
        <p className="text-zinc-400 font-mono mb-8">{message}</p>
        <Link href="/leaderboard" className="bg-white/10 hover:bg-white/20 text-white px-6 py-3 rounded-md transition-colors font-bold uppercase tracking-widest text-sm" style={{ fontFamily: 'var(--font-display), "Space Grotesk", sans-serif' }}>
          Back to Leaderboard
        </Link>
      </div>
    </div>
  );
}
