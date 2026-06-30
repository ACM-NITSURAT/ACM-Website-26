'use client';

import React from 'react';
import { ALL_BRANCHES } from '@/config/leaderboard';
import styles from './LeaderboardFilters.module.css';

interface FilterState {
  branch: string;
  year: string;
  batch: string;
}

interface LeaderboardFiltersProps {
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
}

const YEARS = [
  { value: '', label: 'All Years' },
  { value: '1', label: '1st Year' },
  { value: '2', label: '2nd Year' },
  { value: '3', label: '3rd Year' },
  { value: '4', label: '4th Year' },
];

// Generate batch options (current year → current year + 5)
function getBatchOptions() {
  const currentYear = new Date().getFullYear();
  const options = [{ value: '', label: 'All Batches' }];
  for (let y = currentYear + 4; y >= currentYear; y--) {
    options.push({ value: String(y), label: `Batch ${y}` });
  }
  return options;
}

export default function LeaderboardFilters({
  filters,
  onFilterChange,
}: LeaderboardFiltersProps) {
  const batches = getBatchOptions();

  const handleChange = (key: keyof FilterState, value: string) => {
    onFilterChange({ ...filters, [key]: value });
  };

  const hasActiveFilters = filters.branch || filters.year || filters.batch;

  return (
    <div className={styles.filtersRow}>
      <div className={styles.filterGroup}>
        <select
          value={filters.branch}
          onChange={(e) => handleChange('branch', e.target.value)}
          className={styles.select}
          aria-label="Filter by branch"
        >
          <option value="">All Branches</option>
          {ALL_BRANCHES.map((b) => (
            <option key={b.code} value={b.code}>{b.code}</option>
          ))}
        </select>

        <select
          value={filters.year}
          onChange={(e) => handleChange('year', e.target.value)}
          className={styles.select}
          aria-label="Filter by year"
        >
          {YEARS.map((y) => (
            <option key={y.value} value={y.value}>{y.label}</option>
          ))}
        </select>

        <select
          value={filters.batch}
          onChange={(e) => handleChange('batch', e.target.value)}
          className={styles.select}
          aria-label="Filter by batch"
        >
          {batches.map((b) => (
            <option key={b.value} value={b.value}>{b.label}</option>
          ))}
        </select>
      </div>

      {hasActiveFilters && (
        <button
          className={styles.clearFilters}
          onClick={() => onFilterChange({ branch: '', year: '', batch: '' })}
        >
          Clear filters
        </button>
      )}
    </div>
  );
}
