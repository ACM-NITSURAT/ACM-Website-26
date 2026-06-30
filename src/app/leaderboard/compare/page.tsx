/**
 * /leaderboard/compare — Compare Students
 *
 * Side-by-side comparison of two students' coding profiles.
 * Users search/select two students and see their stats compared.
 */

'use client';

import React, { useState, useEffect } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { PLATFORMS, ALL_PLATFORMS, type Platform } from '@/config/leaderboard';
import type { LeaderboardEntry } from '@/schema/leaderboard';
import styles from './page.module.css';

export default function ComparePage() {
  const [searchA, setSearchA] = useState('');
  const [searchB, setSearchB] = useState('');
  const [suggestions, setSuggestions] = useState<LeaderboardEntry[]>([]);
  const [activeInput, setActiveInput] = useState<'a' | 'b' | null>(null);
  const [studentA, setStudentA] = useState<LeaderboardEntry | null>(null);
  const [studentB, setStudentB] = useState<LeaderboardEntry | null>(null);

  // Search for suggestions
  useEffect(() => {
    const query = activeInput === 'a' ? searchA : searchB;
    if (!query || query.length < 2) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch(`/api/leaderboard?search=${encodeURIComponent(query)}&limit=5`);
        if (!res.ok) return;
        const json = await res.json();
        setSuggestions(json.data ?? []);
      } catch {
        setSuggestions([]);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [searchA, searchB, activeInput]);

  const handleSelect = (entry: LeaderboardEntry, slot: 'a' | 'b') => {
    if (slot === 'a') {
      setStudentA(entry);
      setSearchA(entry.displayName);
    } else {
      setStudentB(entry);
      setSearchB(entry.displayName);
    }
    setSuggestions([]);
    setActiveInput(null);
  };

  return (
    <div className={styles.page}>
      <Link href="/leaderboard" className={styles.backLink}>← Back to Leaderboard</Link>

      <h2 className={styles.title}>Compare Students</h2>
      <p className={styles.subtitle}>Search and select two students to compare their profiles side-by-side.</p>

      {/* Search inputs */}
      <div className={styles.searchRow}>
        <div className={styles.searchContainer}>
          <input
            type="text"
            value={searchA}
            onChange={(e) => { setSearchA(e.target.value); setActiveInput('a'); setStudentA(null); }}
            onFocus={() => setActiveInput('a')}
            placeholder="Search student A..."
            className={styles.searchInput}
          />
          {activeInput === 'a' && suggestions.length > 0 && (
            <div className={styles.dropdown}>
              {suggestions.map((entry) => (
                <button
                  key={entry.uid}
                  className={styles.suggestion}
                  onClick={() => handleSelect(entry, 'a')}
                >
                  <span className={styles.sugName}>{entry.displayName}</span>
                  <span className={styles.sugMeta}>{entry.branch} · Year {entry.currentYear}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        <span className={styles.vs}>VS</span>

        <div className={styles.searchContainer}>
          <input
            type="text"
            value={searchB}
            onChange={(e) => { setSearchB(e.target.value); setActiveInput('b'); setStudentB(null); }}
            onFocus={() => setActiveInput('b')}
            placeholder="Search student B..."
            className={styles.searchInput}
          />
          {activeInput === 'b' && suggestions.length > 0 && (
            <div className={styles.dropdown}>
              {suggestions.map((entry) => (
                <button
                  key={entry.uid}
                  className={styles.suggestion}
                  onClick={() => handleSelect(entry, 'b')}
                >
                  <span className={styles.sugName}>{entry.displayName}</span>
                  <span className={styles.sugMeta}>{entry.branch} · Year {entry.currentYear}</span>
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Comparison */}
      {studentA && studentB && (
        <div className={styles.comparison}>
          {/* Headers */}
          <div className={styles.compareHeaders}>
            <CompareHeader student={studentA} />
            <CompareHeader student={studentB} />
          </div>

          {/* ACM Score */}
          <CompareRow
            label="ACM Score"
            valueA={studentA.acm.score.toFixed(1)}
            valueB={studentB.acm.score.toFixed(1)}
            numA={studentA.acm.score}
            numB={studentB.acm.score}
          />
          <CompareRow
            label="Overall Rank"
            valueA={`#${studentA.acm.overallRank}`}
            valueB={`#${studentB.acm.overallRank}`}
            numA={-studentA.acm.overallRank}
            numB={-studentB.acm.overallRank}
          />

          {/* Platform stats */}
          {ALL_PLATFORMS.map((platform) => (
            <PlatformCompare key={platform} platform={platform} a={studentA} b={studentB} />
          ))}
        </div>
      )}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

function CompareHeader({ student }: { student: LeaderboardEntry }) {
  return (
    <div className={styles.compareHeaderCard}>
      <div className={styles.headerAvatar}>
        {student.profileImageUrl ? (
          <Image src={student.profileImageUrl} alt={student.displayName} width={40} height={40} className={styles.headerAvatarImg} />
        ) : (
          <span className={styles.headerAvatarFallback}>{student.displayName.charAt(0)}</span>
        )}
      </div>
      <div>
        <div className={styles.headerName}>{student.displayName}</div>
        <div className={styles.headerMeta}>{student.branch} · Year {student.currentYear}</div>
      </div>
    </div>
  );
}

function CompareRow({
  label,
  valueA,
  valueB,
  numA,
  numB,
}: {
  label: string;
  valueA: string;
  valueB: string;
  numA: number;
  numB: number;
}) {
  const isAWinner = numA > numB;
  const isBWinner = numB > numA;
  const isTie = numA === numB;

  return (
    <div className={styles.compareRow}>
      <span className={`${styles.compareValue} ${isAWinner ? styles.winner : isTie ? '' : styles.loser}`}>
        {valueA}
      </span>
      <span className={styles.compareLabel}>{label}</span>
      <span className={`${styles.compareValue} ${isBWinner ? styles.winner : isTie ? '' : styles.loser}`}>
        {valueB}
      </span>
    </div>
  );
}

function PlatformCompare({ platform, a, b }: { platform: Platform; a: LeaderboardEntry; b: LeaderboardEntry }) {
  const meta = PLATFORMS[platform];
  const statsA = a[platform];
  const statsB = b[platform];

  if (!statsA && !statsB) return null;

  const rows = getPlatformCompareRows(platform, a, b);

  return (
    <div className={styles.platformSection}>
      <div className={styles.platformSectionHeader}>
        <span className={styles.platformDot} style={{ background: meta.color }} />
        <span>{meta.displayName}</span>
      </div>
      {rows.map((row) => (
        <CompareRow key={row.label} {...row} />
      ))}
    </div>
  );
}

function getPlatformCompareRows(platform: Platform, a: LeaderboardEntry, b: LeaderboardEntry) {
  const rows: Array<{ label: string; valueA: string; valueB: string; numA: number; numB: number }> = [];

  if (platform === 'leetcode') {
    rows.push(
      { label: 'Rating', valueA: String(a.leetcode?.rating ?? '—'), valueB: String(b.leetcode?.rating ?? '—'), numA: a.leetcode?.rating ?? 0, numB: b.leetcode?.rating ?? 0 },
      { label: 'Solved', valueA: String(a.leetcode?.totalSolved ?? '—'), valueB: String(b.leetcode?.totalSolved ?? '—'), numA: a.leetcode?.totalSolved ?? 0, numB: b.leetcode?.totalSolved ?? 0 },
      { label: 'Contests', valueA: String(a.leetcode?.contestCount ?? '—'), valueB: String(b.leetcode?.contestCount ?? '—'), numA: a.leetcode?.contestCount ?? 0, numB: b.leetcode?.contestCount ?? 0 },
    );
  } else if (platform === 'codeforces') {
    rows.push(
      { label: 'Rating', valueA: String(a.codeforces?.currentRating ?? '—'), valueB: String(b.codeforces?.currentRating ?? '—'), numA: a.codeforces?.currentRating ?? 0, numB: b.codeforces?.currentRating ?? 0 },
      { label: 'Max Rating', valueA: String(a.codeforces?.maxRating ?? '—'), valueB: String(b.codeforces?.maxRating ?? '—'), numA: a.codeforces?.maxRating ?? 0, numB: b.codeforces?.maxRating ?? 0 },
      { label: 'Solved', valueA: String(a.codeforces?.problemsSolved ?? '—'), valueB: String(b.codeforces?.problemsSolved ?? '—'), numA: a.codeforces?.problemsSolved ?? 0, numB: b.codeforces?.problemsSolved ?? 0 },
    );
  } else if (platform === 'codechef') {
    rows.push(
      { label: 'Rating', valueA: String(a.codechef?.currentRating ?? '—'), valueB: String(b.codechef?.currentRating ?? '—'), numA: a.codechef?.currentRating ?? 0, numB: b.codechef?.currentRating ?? 0 },
      { label: 'Stars', valueA: a.codechef ? '★'.repeat(a.codechef.stars) : '—', valueB: b.codechef ? '★'.repeat(b.codechef.stars) : '—', numA: a.codechef?.stars ?? 0, numB: b.codechef?.stars ?? 0 },
    );
  } else if (platform === 'github') {
    rows.push(
      { label: 'Commits', valueA: String(a.github?.totalCommits ?? '—'), valueB: String(b.github?.totalCommits ?? '—'), numA: a.github?.totalCommits ?? 0, numB: b.github?.totalCommits ?? 0 },
      { label: 'Stars', valueA: String(a.github?.starsReceived ?? '—'), valueB: String(b.github?.starsReceived ?? '—'), numA: a.github?.starsReceived ?? 0, numB: b.github?.starsReceived ?? 0 },
      { label: 'PRs', valueA: String(a.github?.pullRequests ?? '—'), valueB: String(b.github?.pullRequests ?? '—'), numA: a.github?.pullRequests ?? 0, numB: b.github?.pullRequests ?? 0 },
    );
  }

  return rows;
}
