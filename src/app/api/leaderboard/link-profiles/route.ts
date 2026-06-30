/**
 * POST /api/leaderboard/link-profiles
 *
 * Save/update platform usernames for the authenticated user.
 * Triggers initial sync for newly linked platforms.
 *
 * Body: {
 *   idToken: string,
 *   leetcodeUsername?: string | null,
 *   codeforcesHandle?: string | null,
 *   codechefUsername?: string | null,
 *   githubUsername?: string | null,
 * }
 */

import { NextResponse } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin/auth';
import adminDb from '@/lib/firebase-admin/firestore';
import type { User } from '@/schema/user';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { idToken, leetcodeUsername, codeforcesHandle, codechefUsername, githubUsername } = body;

    if (!idToken) {
      return NextResponse.json({ error: 'Missing idToken' }, { status: 400 });
    }

    const token = await verifyIdToken(idToken);
    const uid = token.uid;

    // Build update object — only update fields that were provided
    const update: Partial<User> = {};

    if (leetcodeUsername !== undefined) {
      update.leetcodeUsername = leetcodeUsername?.trim() || null;
    }
    if (codeforcesHandle !== undefined) {
      update.codeforcesHandle = codeforcesHandle?.trim() || null;
    }
    if (codechefUsername !== undefined) {
      update.codechefUsername = codechefUsername?.trim() || null;
    }
    if (githubUsername !== undefined) {
      update.githubUsername = githubUsername?.trim() || null;
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No fields to update' }, { status: 400 });
    }

    // Save to user document
    await adminDb.doc(`users/${uid}`).update(update);

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('[link-profiles] Error:', err);
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Unauthorized' },
      { status: 401 },
    );
  }
}
