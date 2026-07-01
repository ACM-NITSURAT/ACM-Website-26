import { NextResponse } from 'next/server';
import adminDb from '@/lib/firebase-admin/firestore';
import { FIRESTORE_PATHS } from '@/config/leaderboard';

export async function GET() {
  try {
    const configSnap = await adminDb.doc(FIRESTORE_PATHS.configDoc).get();
    const configData = configSnap.data() as any;
    
    return NextResponse.json({
      lastGlobalSync: configData?.lastGlobalSync || null
    });
  } catch (err) {
    console.error('[GET /api/leaderboard/meta]', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Internal error' },
      { status: 500 }
    );
  }
}
