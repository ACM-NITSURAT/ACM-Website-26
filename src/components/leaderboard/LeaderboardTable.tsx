'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import type { LeaderboardEntry } from '@/schema/leaderboard';
import styles from './LeaderboardTable.module.css';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface Column {
  key: string;
  label: string;
  /** Accessor function to get value from entry */
  getValue: (entry: LeaderboardEntry) => string | number;
  /** Sort accessor — returns number for numeric sort */
  getSortValue?: (entry: LeaderboardEntry) => number;
  /** Custom render function */
  render?: (entry: LeaderboardEntry) => React.ReactNode;
  /** Column width hint */
  width?: string;
  /** Text alignment */
  align?: 'left' | 'center' | 'right';
}

interface LeaderboardTableProps {
  entries: LeaderboardEntry[];
  columns: Column[];
  /** Currently loading data */
  loading?: boolean;
  /** Platform for accent colors */
  platform?: string;
  /** Whether to show rank column */
  showRank?: boolean;
  /** Custom empty state message */
  emptyMessage?: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export default function LeaderboardTable({
  entries,
  columns,
  loading = false,
  showRank = true,
  emptyMessage = 'No students found',
}: LeaderboardTableProps) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const handleSort = (key: string) => {
    if (sortKey === key) {
      setSortOrder((prev) => (prev === 'desc' ? 'asc' : 'desc'));
    } else {
      setSortKey(key);
      setSortOrder('desc');
    }
  };

  const sortedEntries = useMemo(() => {
    if (!sortKey) return entries;

    const col = columns.find((c) => c.key === sortKey);
    if (!col) return entries;

    const accessor = col.getSortValue ?? ((e: LeaderboardEntry) => {
      const val = col.getValue(e);
      return typeof val === 'number' ? val : 0;
    });

    return [...entries].sort((a, b) => {
      const aVal = accessor(a);
      const bVal = accessor(b);
      return sortOrder === 'desc' ? bVal - aVal : aVal - bVal;
    });
  }, [entries, sortKey, sortOrder, columns]);

  // Loading skeleton
  if (loading) {
    return (
      <div className={styles.tableWrapper}>
        <div className={styles.skeleton}>
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className={styles.skeletonRow}>
              <div className={styles.skeletonCell} style={{ width: '40px' }} />
              <div className={styles.skeletonCell} style={{ width: '200px' }} />
              {columns.slice(0, 4).map((_, j) => (
                <div key={j} className={styles.skeletonCell} style={{ width: '80px' }} />
              ))}
            </div>
          ))}
        </div>
      </div>
    );
  }

  // Empty state
  if (entries.length === 0) {
    return (
      <div className={styles.emptyState}>
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none" className={styles.emptyIcon}>
          <circle cx="24" cy="24" r="20" stroke="#3f3f46" strokeWidth="2" />
          <path d="M16 28s2 4 8 4 8-4 8-4" stroke="#3f3f46" strokeWidth="2" strokeLinecap="round" />
          <circle cx="18" cy="20" r="2" fill="#3f3f46" />
          <circle cx="30" cy="20" r="2" fill="#3f3f46" />
        </svg>
        <p className={styles.emptyText}>{emptyMessage}</p>
        <p className={styles.emptyHint}>Try adjusting your filters or search query</p>
      </div>
    );
  }

  return (
    <>
      {/* Desktop table */}
      <div className={styles.tableWrapper}>
        <table className={styles.table}>
          <thead>
            <tr>
              {showRank && (
                <th className={styles.th} style={{ width: '60px', textAlign: 'center' }}>#</th>
              )}
              <th className={styles.th} style={{ minWidth: '200px' }}>Student</th>
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`${styles.th} ${styles.thSortable}`}
                  style={{ width: col.width, textAlign: col.align ?? 'right' }}
                  onClick={() => handleSort(col.key)}
                >
                  <span className={styles.thContent}>
                    {col.label}
                    {sortKey === col.key && (
                      <span className={styles.sortArrow}>
                        {sortOrder === 'desc' ? '↓' : '↑'}
                      </span>
                    )}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            <AnimatePresence mode="popLayout">
              {sortedEntries.map((entry, index) => {
                const rank = entry.acm.overallRank || index + 1;
                const isTop3 = rank <= 3;

                return (
                  <motion.tr
                    key={entry.uid}
                    layout
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className={`${styles.tr} ${isTop3 ? styles[`rank${rank}`] : ''}`}
                  >
                    {showRank && (
                      <td className={styles.tdRank}>
                        <RankBadge rank={rank} />
                      </td>
                    )}
                    <td className={styles.tdStudent}>
                      <Link href={`/leaderboard/student/${entry.slug}`} className={styles.studentLink}>
                        <div className={styles.avatar}>
                          {entry.profileImageUrl ? (
                            <Image
                              src={entry.profileImageUrl}
                              alt={entry.displayName}
                              width={32}
                              height={32}
                              className={styles.avatarImg}
                            />
                          ) : (
                            <span className={styles.avatarFallback}>
                              {entry.displayName.charAt(0).toUpperCase()}
                            </span>
                          )}
                        </div>
                        <div className={styles.studentInfo}>
                          <span className={styles.studentName}>{entry.displayName}</span>
                          <span className={styles.studentMeta}>
                            {entry.branch} · Year {entry.currentYear}
                          </span>
                        </div>
                      </Link>
                    </td>
                    {columns.map((col) => (
                      <td
                        key={col.key}
                        className={styles.td}
                        style={{ textAlign: col.align ?? 'right' }}
                      >
                        {col.render ? col.render(entry) : col.getValue(entry)}
                      </td>
                    ))}
                  </motion.tr>
                );
              })}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Mobile cards */}
      <div className={styles.mobileCards}>
        {sortedEntries.map((entry, index) => {
          const rank = entry.acm.overallRank || index + 1;
          return (
            <Link
              key={entry.uid}
              href={`/leaderboard/student/${entry.slug}`}
              className={`${styles.mobileCard} ${rank <= 3 ? styles[`rank${rank}`] : ''}`}
            >
              <div className={styles.mobileCardHeader}>
                <RankBadge rank={rank} />
                <div className={styles.avatar}>
                  {entry.profileImageUrl ? (
                    <Image
                      src={entry.profileImageUrl}
                      alt={entry.displayName}
                      width={32}
                      height={32}
                      className={styles.avatarImg}
                    />
                  ) : (
                    <span className={styles.avatarFallback}>
                      {entry.displayName.charAt(0).toUpperCase()}
                    </span>
                  )}
                </div>
                <div className={styles.studentInfo}>
                  <span className={styles.studentName}>{entry.displayName}</span>
                  <span className={styles.studentMeta}>
                    {entry.branch} · Year {entry.currentYear}
                  </span>
                </div>
              </div>
              <div className={styles.mobileCardStats}>
                {columns.slice(0, 3).map((col) => (
                  <div key={col.key} className={styles.mobileCardStat}>
                    <span className={styles.mobileStatLabel}>{col.label}</span>
                    <span className={styles.mobileStatValue}>
                      {col.render ? col.render(entry) : col.getValue(entry)}
                    </span>
                  </div>
                ))}
              </div>
            </Link>
          );
        })}
      </div>
    </>
  );
}

// ── Rank Badge ────────────────────────────────────────────────────────────────

function RankBadge({ rank }: { rank: number }) {
  if (rank === 1) return <span className={`${styles.rankBadge} ${styles.gold}`}>🥇</span>;
  if (rank === 2) return <span className={`${styles.rankBadge} ${styles.silver}`}>🥈</span>;
  if (rank === 3) return <span className={`${styles.rankBadge} ${styles.bronze}`}>🥉</span>;
  return <span className={styles.rankNumber}>{rank}</span>;
}
