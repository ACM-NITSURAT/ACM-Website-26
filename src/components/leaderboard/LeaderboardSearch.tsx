'use client';

import React, { useState, useEffect, useRef } from 'react';
import { SEARCH_DEBOUNCE_MS } from '@/config/leaderboard';
import styles from './LeaderboardSearch.module.css';

interface LeaderboardSearchProps {
  onSearch: (query: string) => void;
  placeholder?: string;
}

export default function LeaderboardSearch({
  onSearch,
  placeholder = 'Search by name, roll, branch, username...',
}: LeaderboardSearchProps) {
  const [value, setValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Debounced search
  useEffect(() => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(value);
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [value, onSearch]);

  // Keyboard shortcut: "/" to focus search
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key === '/' && document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA') {
        e.preventDefault();
        inputRef.current?.focus();
      }
      if (e.key === 'Escape') {
        inputRef.current?.blur();
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  return (
    <div className={styles.searchWrapper}>
      <svg className={styles.searchIcon} width="16" height="16" viewBox="0 0 16 16" fill="none">
        <circle cx="7" cy="7" r="5" stroke="#52525b" strokeWidth="1.5" />
        <path d="M11 11l3 3" stroke="#52525b" strokeWidth="1.5" strokeLinecap="round" />
      </svg>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={placeholder}
        className={styles.searchInput}
        aria-label="Search leaderboard"
      />
      {value && (
        <button
          className={styles.clearBtn}
          onClick={() => { setValue(''); onSearch(''); }}
          aria-label="Clear search"
        >
          ×
        </button>
      )}
      <kbd className={styles.shortcutHint}>/</kbd>
    </div>
  );
}
