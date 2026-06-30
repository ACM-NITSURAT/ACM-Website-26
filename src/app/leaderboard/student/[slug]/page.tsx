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
import styles from './page.module.css';

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
    <div className={styles.page}>
      {/* Back link */}
      <Link href="/leaderboard" className={styles.backLink}>
        ← Back to Leaderboard
      </Link>

      {/* Profile header */}
      <div className={styles.profileHeader}>
        <div className={styles.avatarLarge}>
          {entry.profileImageUrl ? (
            <Image src={entry.profileImageUrl} alt={entry.displayName} width={72} height={72} className={styles.avatarImg} />
          ) : (
            <span className={styles.avatarFallback}>{entry.displayName.charAt(0)}</span>
          )}
        </div>
        <div className={styles.profileInfo}>
          <h1 className={styles.name}>{entry.displayName}</h1>
          <div className={styles.meta}>
            <span className={styles.metaChip}>{entry.branch}</span>
            <span className={styles.metaChip}>Year {entry.currentYear}</span>
            <span className={styles.metaChip}>Batch {entry.graduationBatch}</span>
          </div>
          <p className={styles.rollNumber}>{entry.rollNumber}</p>
        </div>
      </div>

      {/* ACM Score card */}
      <div className={styles.acmCard}>
        <div className={styles.acmScoreMain}>
          <span className={styles.acmLabel}>ACM Score</span>
          <span className={styles.acmScore}>{entry.acm.score.toFixed(1)}</span>
          <DeltaBadge
            current={entry.acm.score}
            previous={entry.previousSnapshot?.acmScore ?? null}
            precision={1}
          />
        </div>
        <div className={styles.acmRanks}>
          <div className={styles.rankItem}>
            <span className={styles.rankValue}>#{entry.acm.overallRank}</span>
            <span className={styles.rankLabel}>Overall</span>
          </div>
          <div className={styles.rankDivider} />
          <div className={styles.rankItem}>
            <span className={styles.rankValue}>#{entry.acm.branchRank}</span>
            <span className={styles.rankLabel}>{entry.branch}</span>
          </div>
          <div className={styles.rankDivider} />
          <div className={styles.rankItem}>
            <span className={styles.rankValue}>#{entry.acm.yearRank}</span>
            <span className={styles.rankLabel}>Year {entry.currentYear}</span>
          </div>
        </div>
      </div>

      {/* Platform stats grid */}
      <div className={styles.platformGrid}>
        {ALL_PLATFORMS.map((platform) => (
          <PlatformCard key={platform} platform={platform} entry={entry} />
        ))}
      </div>

      {/* Sync info */}
      {entry.sync.lastSync && (
        <p className={styles.syncInfo}>
          Last synced: {new Date(entry.sync.lastSync).toLocaleString('en-IN')}
        </p>
      )}
    </div>
  );
}

// ── Platform Card ─────────────────────────────────────────────────────────────

function PlatformCard({ platform, entry }: { platform: Platform; entry: LeaderboardEntry }) {
  const meta = PLATFORMS[platform];
  const stats = entry[platform];

  if (!stats) {
    return (
      <div className={styles.statCard} style={{ '--platform-color': meta.color } as React.CSSProperties}>
        <div className={styles.statCardHeader}>
          <span className={styles.platformDot} style={{ background: meta.color }} />
          <span className={styles.platformName}>{meta.displayName}</span>
        </div>
        <p className={styles.notLinked}>Not linked</p>
      </div>
    );
  }

  const profileUrl = meta.profileUrl.replace('{username}',
    'username' in stats ? stats.username : ('handle' in stats ? stats.handle : ''));

  return (
    <div className={styles.statCard} style={{ '--platform-color': meta.color } as React.CSSProperties}>
      <div className={styles.statCardHeader}>
        <span className={styles.platformDot} style={{ background: meta.color }} />
        <span className={styles.platformName}>{meta.displayName}</span>
        <a href={profileUrl} target="_blank" rel="noopener noreferrer" className={styles.externalLink}>
          ↗
        </a>
      </div>

      <div className={styles.statGrid}>
        {platform === 'leetcode' && entry.leetcode && (
          <>
            <StatItem label="Rating" value={entry.leetcode.rating} color={meta.color} />
            <StatItem label="Solved" value={entry.leetcode.totalSolved} />
            <StatItem label="Easy" value={entry.leetcode.easySolved} color="#22c55e" />
            <StatItem label="Medium" value={entry.leetcode.mediumSolved} color="#eab308" />
            <StatItem label="Hard" value={entry.leetcode.hardSolved} color="#ef4444" />
            <StatItem label="Contests" value={entry.leetcode.contestCount} />
          </>
        )}
        {platform === 'codeforces' && entry.codeforces && (
          <>
            <StatItem label="Rating" value={entry.codeforces.currentRating} color={meta.color} />
            <StatItem label="Max Rating" value={entry.codeforces.maxRating} />
            <StatItem label="Rank" value={entry.codeforces.currentRank} />
            <StatItem label="Solved" value={entry.codeforces.problemsSolved} />
            <StatItem label="Contests" value={entry.codeforces.contestCount} />
          </>
        )}
        {platform === 'codechef' && entry.codechef && (
          <>
            <StatItem label="Rating" value={entry.codechef.currentRating} color={meta.color} />
            <StatItem label="Stars" value={'★'.repeat(entry.codechef.stars)} color="#eab308" />
            <StatItem label="Highest" value={entry.codechef.highestRating} />
            <StatItem label="Contests" value={entry.codechef.contestCount} />
          </>
        )}
        {platform === 'github' && entry.github && (
          <>
            <StatItem label="Commits" value={entry.github.totalCommits.toLocaleString()} color="#22c55e" />
            <StatItem label="Stars" value={entry.github.starsReceived} color="#eab308" />
            <StatItem label="Repos" value={entry.github.publicRepos} />
            <StatItem label="PRs" value={entry.github.pullRequests} />
            <StatItem label="Followers" value={entry.github.followers} />
          </>
        )}
      </div>
    </div>
  );
}

function StatItem({ label, value, color }: { label: string; value: string | number; color?: string }) {
  return (
    <div className={styles.statItem}>
      <span className={styles.statLabel}>{label}</span>
      <span className={styles.statValue} style={color ? { color } : undefined}>{value}</span>
    </div>
  );
}

// ── Loading / Error ───────────────────────────────────────────────────────────

function ProfileSkeleton() {
  return (
    <div className={styles.page}>
      <div className={styles.skeletonHeader} />
      <div className={styles.skeletonCard} style={{ height: '140px' }} />
      <div className={styles.skeletonGrid}>
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className={styles.skeletonCard} style={{ height: '200px' }} />
        ))}
      </div>
    </div>
  );
}

function ErrorState({ message }: { message: string }) {
  return (
    <div className={styles.errorState}>
      <h2>Oops</h2>
      <p>{message}</p>
      <Link href="/leaderboard" className={styles.backBtn}>Back to Leaderboard</Link>
    </div>
  );
}
