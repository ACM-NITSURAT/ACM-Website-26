import { NextResponse } from 'next/server';
import { requirePermission } from '@/server/guard';
import adminDb from '@/lib/firebase-admin/firestore';
import { recalculateAllScores } from '@/server/leaderboard/scoring.service';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const auth = await requirePermission(request, 'manageLeaderboard');
  if (auth.error) return auth.error;

  const { uid } = await params;

  try {
    // 1. Remove platform links from user document
    await adminDb.doc(`users/${uid}`).update({
      leetcodeUsername: null,
      codeforcesHandle: null,
      codechefUsername: null,
      githubUsername: null,
    });

    // 2. Delete leaderboard document
    await adminDb.doc(`leaderboard/${uid}`).delete();

    // 3. Recalculate ranks for everyone else
    await recalculateAllScores();

    return NextResponse.json({ success: true, message: 'Unlinked successfully' });
  } catch (err) {
    console.error(`[AdminUnlinkUser] Failed for ${uid}:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
