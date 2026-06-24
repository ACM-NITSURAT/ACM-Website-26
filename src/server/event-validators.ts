/**
 * Shared event validation logic used by both POST and PATCH handlers.
 * Returns an error string if invalid, null if valid.
 */

import type { Event } from '@/schema/event';

type Ts = { seconds: number } | null | undefined;

function toSeconds(ts: unknown): number | null {
  if (!ts || typeof ts !== 'object') return null;
  const t = ts as Record<string, unknown>;
  const s = t.seconds ?? t._seconds;
  return typeof s === 'number' ? s : null;
}

export function validateEventDates(
  status: Event['status'] | undefined,
  startDate: unknown,
  endDate: unknown,
): string | null {
  if (!status) return null; // partial PATCH — skip

  const start = toSeconds(startDate);
  const end = toSeconds(endDate);
  const now = Math.floor(Date.now() / 1000);

  if (start !== null && end !== null) {
    if (end <= start) return 'End date must be after start date.';
  }

  if (status === 'upcoming') {
    if (start !== null && start <= now) return 'An upcoming event must have a start date in the future.';
  }

  if (status === 'ongoing') {
    if (start !== null && start > now) return 'An ongoing event must have already started (start date in the past).';
    if (end !== null && end <= now) return 'An ongoing event must not have ended yet (end date must be in the future).';
  }

  if (status === 'finished') {
    if (end !== null && end > now) return 'A finished event must have an end date in the past.';
  }

  return null;
}

export function validatePrizes(
  prizeMoney: unknown,
  dist: unknown,
): string | null {
  const total = typeof prizeMoney === 'number' ? prizeMoney : 0;
  if (total <= 0 || !dist || typeof dist !== 'object') return null;

  const d = dist as Record<string, unknown>;
  const sum = (Number(d.firstPrize) || 0) + (Number(d.secondPrize) || 0) + (Number(d.thirdPrize) || 0);
  if (sum > total) {
    return `Prize distribution (₹${sum}) exceeds the total prize pool (₹${total}).`;
  }
  return null;
}

export function validateTeamConfig(
  isTeamEvent: unknown,
  minTeamMembers: unknown,
  maxTeamMembers: unknown,
  isFemaleMandatory: unknown,
  minFemaleRequired: unknown,
): string | null {
  if (!isTeamEvent) return null;

  const min = Number(minTeamMembers) || 1;
  const max = Number(maxTeamMembers) || 1;
  if (min > max) return 'Min team members cannot exceed max team members.';
  if (min < 1) return 'Min team members must be at least 1.';

  if (isFemaleMandatory) {
    const minF = Number(minFemaleRequired) || 0;
    if (minF > max) return 'Min female required cannot exceed max team members.';
  }

  return null;
}

export const VALID_STATUSES: Event['status'][] = ['upcoming', 'ongoing', 'finished'];
export const VALID_TYPES: Event['type'][] = ['event', 'workshop', 'meet'];
