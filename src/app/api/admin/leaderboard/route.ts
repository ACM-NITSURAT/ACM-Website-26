import { NextResponse } from 'next/server';
import { requirePermission } from '@/server/guard';
import adminDb from '@/lib/firebase-admin/firestore';
import type { User } from '@/schema/user';
import type { LeaderboardEntry } from '@/schema/leaderboard';

export async function GET(request: Request) {
  const auth = await requirePermission(request, 'manageLeaderboard');
  if (auth.error) return auth.error;

  try {
    // We fetch all users who have at least one platform linked
    const usersSnap = await adminDb.collection('users').get();

    const uids: string[] = [];
    const usersMap = new Map<string, User>();

    usersSnap.docs.forEach((doc) => {
      const u = doc.data() as User;
      if (u.leetcodeUsername || u.codeforcesHandle || u.codechefUsername || u.githubUsername) {
        uids.push(doc.id);
        usersMap.set(doc.id, u);
      }
    });

    if (uids.length === 0) {
      return NextResponse.json({ success: true, students: [] });
    }

    // Now fetch their leaderboard entries concurrently
    const refs = uids.map(uid => adminDb.doc(`leaderboard/${uid}`));
    const entrySnaps = await adminDb.getAll(...refs);

    const students = uids.map((uid, i) => {
      const u = usersMap.get(uid)!;
      const entry = entrySnaps[i].data() as LeaderboardEntry | undefined;

      return {
        uid,
        displayName: `${u.firstName} ${u.lastName}`,
        rollNumber: u.rollNumber,
        branch: u.branch,
        currentYear: entry?.currentYear || 1,
        score: entry?.acm?.score || 0,
        rank: entry?.acm?.overallRank || 0,
        lastSync: entry?.sync?.lastSync || null,
        platforms: {
          leetcode: u.leetcodeUsername || null,
          codeforces: u.codeforcesHandle || null,
          codechef: u.codechefUsername || null,
          github: u.githubUsername || null,
        }
      };
    });

    // Sort by score descending
    students.sort((a, b) => b.score - a.score);

    return NextResponse.json({ success: true, students });
  } catch (err) {
    console.error('[AdminLeaderboard] GET Failed:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
