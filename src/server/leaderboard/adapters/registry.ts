/**
 * Platform adapter registry.
 *
 * Central registry for all platform adapters.
 * Adding a new platform is a 3-step process:
 *   1. Create the adapter file (e.g. atcoder.adapter.ts)
 *   2. Import and register it here
 *   3. Add the platform to the Platform type in src/config/leaderboard.ts
 */

import type { Platform } from '@/config/leaderboard';
import type { PlatformAdapter } from './types';
import { LeetCodeAdapter } from './leetcode.adapter';
import { CodeforcesAdapter } from './codeforces.adapter';
import { CodeChefAdapter } from './codechef.adapter';
import { GitHubAdapter } from './github.adapter';

// ── Singleton Instances ───────────────────────────────────────────────────────

const leetcodeAdapter = new LeetCodeAdapter();
const codeforcesAdapter = new CodeforcesAdapter();
const codechefAdapter = new CodeChefAdapter();
const githubAdapter = new GitHubAdapter();

// ── Registry ──────────────────────────────────────────────────────────────────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ADAPTER_MAP: Record<Platform, PlatformAdapter<any>> = {
  leetcode:   leetcodeAdapter,
  codeforces: codeforcesAdapter,
  codechef:   codechefAdapter,
  github:     githubAdapter,
};

/**
 * Get the adapter for a specific platform.
 * Throws if the platform is not registered.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAdapter(platform: Platform): PlatformAdapter<any> {
  const adapter = ADAPTER_MAP[platform];
  if (!adapter) {
    throw new Error(`No adapter registered for platform: ${platform}`);
  }
  return adapter;
}

/**
 * Get all registered adapters.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAllAdapters(): PlatformAdapter<any>[] {
  return Object.values(ADAPTER_MAP);
}

/**
 * Get adapters for specific platforms.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function getAdapters(platforms: Platform[]): PlatformAdapter<any>[] {
  return platforms.map(getAdapter);
}
