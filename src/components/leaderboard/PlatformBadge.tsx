import React from 'react';
import styles from './PlatformBadge.module.css';
import { Platform } from '@/config/leaderboard';
import { LeetCodeStats, CodeforcesStats, CodeChefStats, GitHubStats } from '@/schema/leaderboard';

interface PlatformBadgeProps {
  platform: Platform;
  stats: any | null; // Pass the specific platform stats
}

// ── Codeforces Rank Colors ───────────────────────────────────────────────────
function getCodeforcesColor(rank: string): string {
  const normalized = rank.toLowerCase();
  if (normalized.includes('newbie')) return '#808080';
  if (normalized.includes('pupil')) return '#008000';
  if (normalized.includes('specialist')) return '#03a89e';
  if (normalized.includes('expert')) return '#0000ff';
  if (normalized.includes('candidate master')) return '#a0a';
  if (normalized.includes('master')) return '#ff8c00';
  if (normalized.includes('grandmaster')) return '#ff0000';
  return '#ffffff';
}

// ── CodeChef Star Colors ─────────────────────────────────────────────────────
function getCodeChefColor(stars: number): string {
  if (stars <= 2) return '#666666';
  if (stars === 3) return '#1e7d22';
  if (stars === 4) return '#684273';
  if (stars === 5) return '#ffbf00';
  if (stars === 6) return '#ff7f00';
  if (stars >= 7) return '#d0011b';
  return '#ffffff';
}

// ── LeetCode Badge Inference (Fallback) ──────────────────────────────────────
function getLeetCodeBadge(rating: number): { label: string, color: string } | null {
  if (rating >= 2150) return { label: 'Guardian', color: '#ef4444' };
  if (rating >= 1850) return { label: 'Knight', color: '#f97316' };
  // If no badge, return null so we don't invent one
  return null;
}

export default function PlatformBadge({ platform, stats }: PlatformBadgeProps) {
  if (!stats) {
    return <span className={styles.notLinked}>Not Linked</span>;
  }

  if (platform === 'codeforces') {
    const cfStats = stats as CodeforcesStats;
    const rank = cfStats.currentRank || 'Unrated';
    const color = getCodeforcesColor(rank);
    return (
      <span className={styles.chip} style={{ backgroundColor: `${color}20`, color: color, borderColor: `${color}40` }}>
        {rank}
      </span>
    );
  }

  if (platform === 'codechef') {
    const ccStats = stats as CodeChefStats;
    const stars = ccStats.stars || 1;
    const color = getCodeChefColor(stars);
    return (
      <span className={styles.chip} style={{ backgroundColor: `${color}20`, color: color, borderColor: `${color}40` }}>
        {stars}★
      </span>
    );
  }

  if (platform === 'leetcode') {
    const lcStats = stats as LeetCodeStats;
    const badge = getLeetCodeBadge(lcStats.rating);
    if (badge) {
      return (
        <span className={styles.chip} style={{ backgroundColor: `${badge.color}20`, color: badge.color, borderColor: `${badge.color}40` }}>
          {badge.label}
        </span>
      );
    }
    return <span className={styles.linked}>✓ Linked</span>;
  }

  if (platform === 'github') {
    const ghStats = stats as GitHubStats;
    return (
      <span className={styles.linked}>
        {ghStats.publicRepos} Repos
      </span>
    );
  }

  return null;
}
