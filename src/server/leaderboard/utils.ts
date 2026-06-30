/**
 * Shared utilities for platform adapters and the sync service.
 *
 * Provides:
 *  - fetchWithRetry: exponential-backoff HTTP fetcher
 *  - rateLimitedBatch: process items with configurable delay
 *  - isStale: check if a timestamp is older than a threshold
 *  - getISOWeekId: generate "2026-W27" style week identifiers
 */

import {
  SYNC_MAX_RETRIES,
  SYNC_RATE_LIMIT_DELAY_MS,
} from '@/config/leaderboard';

// ── Fetch with Retry ──────────────────────────────────────────────────────────

interface FetchRetryOptions {
  /** Maximum number of retry attempts (default: SYNC_MAX_RETRIES) */
  maxRetries?: number;
  /** Initial delay in ms before first retry (doubles each retry) */
  initialDelayMs?: number;
  /** Request timeout in ms */
  timeoutMs?: number;
  /** Custom headers */
  headers?: Record<string, string>;
}

/**
 * Fetch with exponential backoff retry.
 *
 * Retries on:
 *  - Network errors
 *  - 429 (Too Many Requests)
 *  - 500+ (Server errors)
 *
 * Does NOT retry on:
 *  - 400 (Bad Request)
 *  - 401 (Unauthorized)
 *  - 403 (Forbidden)
 *  - 404 (Not Found)
 */
export async function fetchWithRetry(
  url: string,
  options: FetchRetryOptions = {},
): Promise<Response> {
  const {
    maxRetries = SYNC_MAX_RETRIES,
    initialDelayMs = 1000,
    timeoutMs = 10_000,
    headers = {},
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        headers,
        signal: controller.signal,
      });

      clearTimeout(timer);

      // Don't retry client errors (except 429)
      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries) {
          const delay = initialDelayMs * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
      }

      return response;
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error(`fetchWithRetry failed after ${maxRetries + 1} attempts`);
}

/**
 * Fetch JSON with retry. Parses the response body as JSON.
 */
export async function fetchJsonWithRetry<T>(
  url: string,
  options: FetchRetryOptions = {},
): Promise<{ data: T; status: number }> {
  const response = await fetchWithRetry(url, options);
  const data = (await response.json()) as T;
  return { data, status: response.status };
}

/**
 * POST JSON with retry. Sends a JSON body and parses the response.
 */
export async function postJsonWithRetry<T>(
  url: string,
  body: unknown,
  options: FetchRetryOptions = {},
): Promise<{ data: T; status: number }> {
  const {
    maxRetries = SYNC_MAX_RETRIES,
    initialDelayMs = 1000,
    timeoutMs = 10_000,
    headers = {},
  } = options;

  let lastError: Error | null = null;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...headers,
        },
        body: JSON.stringify(body),
        signal: controller.signal,
      });

      clearTimeout(timer);

      if (response.status === 429 || response.status >= 500) {
        if (attempt < maxRetries) {
          const delay = initialDelayMs * Math.pow(2, attempt);
          await sleep(delay);
          continue;
        }
      }

      const data = (await response.json()) as T;
      return { data, status: response.status };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      if (attempt < maxRetries) {
        const delay = initialDelayMs * Math.pow(2, attempt);
        await sleep(delay);
      }
    }
  }

  throw lastError ?? new Error(`postJsonWithRetry failed after ${maxRetries + 1} attempts`);
}

// ── Rate-Limited Batch Processing ─────────────────────────────────────────────

/**
 * Process an array of items with a delay between each call.
 * Prevents hitting platform rate limits during bulk sync.
 *
 * @param items    - Array of items to process
 * @param fn       - Async function to run on each item
 * @param delayMs  - Delay between calls (default: SYNC_RATE_LIMIT_DELAY_MS)
 * @returns Array of results (in order)
 */
export async function rateLimitedBatch<T, R>(
  items: T[],
  fn: (item: T, index: number) => Promise<R>,
  delayMs: number = SYNC_RATE_LIMIT_DELAY_MS,
): Promise<R[]> {
  const results: R[] = [];

  for (let i = 0; i < items.length; i++) {
    results.push(await fn(items[i], i));

    // Delay between calls (skip after last item)
    if (i < items.length - 1 && delayMs > 0) {
      await sleep(delayMs);
    }
  }

  return results;
}

// ── Staleness Check ───────────────────────────────────────────────────────────

/**
 * Returns true if the given ISO timestamp is older than `thresholdHours` hours.
 * Returns true if the timestamp is null/undefined (never synced = always stale).
 */
export function isStale(
  lastUpdated: string | null | undefined,
  thresholdHours: number,
): boolean {
  if (!lastUpdated) return true;

  const lastDate = new Date(lastUpdated);
  if (isNaN(lastDate.getTime())) return true;

  const now = Date.now();
  const diffMs = now - lastDate.getTime();
  const diffHours = diffMs / (1000 * 60 * 60);

  return diffHours >= thresholdHours;
}

/**
 * Returns true if the given ISO timestamp is older than `thresholdMinutes` minutes.
 */
export function isStaleMinutes(
  lastUpdated: string | null | undefined,
  thresholdMinutes: number,
): boolean {
  if (!lastUpdated) return true;

  const lastDate = new Date(lastUpdated);
  if (isNaN(lastDate.getTime())) return true;

  const now = Date.now();
  const diffMs = now - lastDate.getTime();
  const diffMinutes = diffMs / (1000 * 60);

  return diffMinutes >= thresholdMinutes;
}

// ── Week ID ───────────────────────────────────────────────────────────────────

/**
 * Returns an ISO week identifier like "2026-W27" for the given date.
 */
export function getISOWeekId(date: Date = new Date()): string {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Clamp a number to a 0–100 range.
 */
export function clamp0to100(value: number): number {
  return Math.max(0, Math.min(100, value));
}

/**
 * Safe division — returns 0 if denominator is 0.
 */
export function safeDivide(numerator: number, denominator: number): number {
  if (denominator === 0) return 0;
  return numerator / denominator;
}
