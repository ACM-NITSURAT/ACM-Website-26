'use client';

import React from 'react';

interface DeltaBadgeProps {
  current: number | null;
  previous: number | null;
  /** Show as integer (default) or with 1 decimal */
  precision?: number;
}

/**
 * Shows weekly change: ▲ +76 (green), ▼ -12 (red), — (gray)
 */
export default function DeltaBadge({ current, previous, precision = 0 }: DeltaBadgeProps) {
  if (current == null || previous == null) {
    return <span style={{ color: '#3f3f46', fontSize: '0.75rem' }}>—</span>;
  }

  const delta = current - previous;

  if (delta === 0) {
    return <span style={{ color: '#3f3f46', fontSize: '0.75rem' }}>—</span>;
  }

  const isPositive = delta > 0;
  const color = isPositive ? '#22c55e' : '#ef4444';
  const arrow = isPositive ? '▲' : '▼';
  const formatted = delta.toFixed(precision);

  return (
    <span style={{
      color,
      fontSize: '0.75rem',
      fontWeight: 500,
      fontVariantNumeric: 'tabular-nums',
    }}>
      {arrow} {isPositive ? '+' : ''}{formatted}
    </span>
  );
}
