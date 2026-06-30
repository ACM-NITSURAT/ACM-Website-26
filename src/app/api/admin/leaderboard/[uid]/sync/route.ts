import { NextResponse } from 'next/server';
import { requirePermission } from '@/server/guard';
import { syncUserByUid } from '@/server/leaderboard/sync.service';

export async function POST(
  request: Request,
  { params }: { params: Promise<{ uid: string }> }
) {
  const auth = await requirePermission(request, 'manageLeaderboard');
  if (auth.error) return auth.error;

  const { uid } = await params;

  try {
    const result = await syncUserByUid(uid);
    return NextResponse.json({ success: true, ...result });
  } catch (err) {
    console.error(`[AdminSyncUser] Failed for ${uid}:`, err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unknown error' },
      { status: 500 },
    );
  }
}
