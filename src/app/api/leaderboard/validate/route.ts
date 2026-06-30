/**
 * POST /api/leaderboard/validate
 *
 * Real-time username validation endpoint.
 * Called as the user types in the profile linking form.
 *
 * Body: { platform: string, username: string }
 * Returns: { valid: boolean, preview?: object, error?: string }
 */

import { NextResponse } from 'next/server';
import { ALL_PLATFORMS, type Platform } from '@/config/leaderboard';
import { getAdapter } from '@/server/leaderboard/adapters/registry';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { platform, username } = body;

    if (!platform || !username) {
      return NextResponse.json({ error: 'Missing platform or username' }, { status: 400 });
    }

    if (!ALL_PLATFORMS.includes(platform as Platform)) {
      return NextResponse.json({ error: `Unsupported platform: ${platform}` }, { status: 400 });
    }

    const adapter = getAdapter(platform as Platform);
    const result = await adapter.validateUsername(username.trim());

    return NextResponse.json(result);
  } catch (err) {
    console.error('[validate] Error:', err);
    return NextResponse.json(
      { valid: false, error: err instanceof Error ? err.message : 'Validation failed' },
      { status: 500 },
    );
  }
}
