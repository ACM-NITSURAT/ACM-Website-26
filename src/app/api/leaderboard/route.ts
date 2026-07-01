/**
 * GET /api/leaderboard
 *
 * Paginated leaderboard data. Public (no auth required).
 *
 * Query params:
 *   platform  — 'overall' | 'leetcode' | 'codeforces' | 'codechef' | 'github'
 *   branch    — filter by branch code (e.g. 'CSE')
 *   year      — filter by current year (1–5)
 *   batch     — filter by graduation batch (e.g. 2028)
 *   sort      — sort field (default varies by platform)
 *   order     — 'asc' | 'desc' (default: 'desc')
 *   page      — page number (default: 1)
 *   limit     — items per page (default: 25, max: 100)
 *   search    — search string (name, roll, branch, platform usernames)
 */

import { NextResponse, type NextRequest } from 'next/server';
import adminDb from '@/lib/firebase-admin/firestore';
import { FIRESTORE_PATHS, LEADERBOARD_PAGE_SIZE, LEADERBOARD_MAX_PAGE_SIZE } from '@/config/leaderboard';
import type { LeaderboardEntry } from '@/schema/leaderboard';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = request.nextUrl;

    const platform = searchParams.get('platform') ?? 'overall';
    const branch = searchParams.get('branch');
    const year = searchParams.get('year') ? parseInt(searchParams.get('year')!, 10) : null;
    const batch = searchParams.get('batch') ? parseInt(searchParams.get('batch')!, 10) : null;
    const sortField = searchParams.get('sort');
    const order = (searchParams.get('order') ?? 'desc') as 'asc' | 'desc';
    const page = Math.max(1, parseInt(searchParams.get('page') ?? '1', 10));
    const limit = Math.min(
      LEADERBOARD_MAX_PAGE_SIZE,
      Math.max(1, parseInt(searchParams.get('limit') ?? String(LEADERBOARD_PAGE_SIZE), 10)),
    );
    const search = searchParams.get('search')?.toLowerCase().trim();

    // Fetch all entries (Firestore doesn't support OR search across fields)
    // For 500–3000 students this is perfectly fine — each doc is ~1–2 KB
    const snapshot = await adminDb.collection(FIRESTORE_PATHS.leaderboardCollection).get();

    let entries = snapshot.docs.map((doc) => doc.data() as LeaderboardEntry);

    // Filter by branch
    if (branch) {
      entries = entries.filter((e) => e.branch === branch);
    }

    // Filter by year
    if (year) {
      entries = entries.filter((e) => e.currentYear === year);
    }

    // Filter by graduation batch
    if (batch) {
      entries = entries.filter((e) => e.graduationBatch === batch);
    }

    // Filter by platform (only show students who have that platform linked)
    if (platform !== 'overall') {
      entries = entries.filter((e) => e[platform as keyof LeaderboardEntry] != null);
    }

    // Search filter
    if (search) {
      entries = entries.filter((e) => {
        const searchable = [
          e.displayName,
          e.rollNumber,
          e.branch,
          e.leetcode?.username,
          e.codeforces?.handle,
          e.codechef?.username,
          e.github?.username,
        ]
          .filter(Boolean)
          .join(' ')
          .toLowerCase();
        return searchable.includes(search);
      });
    }

    // Sort
    const sortKey = getSortKey(platform, sortField);
    entries.sort((a, b) => {
      const aVal = getNestedValue(a, sortKey) ?? 0;
      const bVal = getNestedValue(b, sortKey) ?? 0;
      return order === 'desc' ? bVal - aVal : aVal - bVal;
    });

    // Paginate
    const total = entries.length;
    const totalPages = Math.ceil(total / limit);
    const offset = (page - 1) * limit;
    const paginatedEntries = entries.slice(offset, offset + limit);

    // Fetch config for metadata
    const configSnap = await adminDb.doc(FIRESTORE_PATHS.configDoc).get();
    const configData = configSnap.data() as any;
    const lastGlobalSync = configData?.lastGlobalSync || null;

    return NextResponse.json({
      data: paginatedEntries,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
      meta: {
        lastGlobalSync
      }
    });
  } catch (err) {
    console.error('[GET /api/leaderboard]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 },
    );
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function getSortKey(platform: string, sortField: string | null): string {
  if (sortField) return sortField;

  switch (platform) {
    case 'leetcode':   return 'leetcode.rating';
    case 'codeforces': return 'codeforces.currentRating';
    case 'codechef':   return 'codechef.currentRating';
    case 'github':     return 'github.totalCommits';
    default:           return 'acm.score';
  }
}

function getNestedValue(obj: unknown, path: string): number {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current == null || typeof current !== 'object') return 0;
    current = (current as Record<string, unknown>)[part];
  }

  return typeof current === 'number' ? current : 0;
}
