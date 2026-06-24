/**
 * Server-only auth guard helpers for Route Handlers.
 *
 * Usage:
 *   const result = await requirePermission(request, 'manageEvents');
 *   if (result.error) return result.error;   // early return the NextResponse
 *   const { token } = result;                // use the verified token
 */

import { NextResponse, type NextRequest } from 'next/server';
import { verifyIdToken } from '@/lib/firebase-admin/auth';
import { can, type Permission } from '@/server/permissions';
import type { User } from '@/schema/user';
import type { DecodedIdToken } from 'firebase-admin/auth';

type Role = User['role'];

interface GuardOk {
  error: null;
  token: DecodedIdToken;
  role: Role;
}

interface GuardFail {
  error: NextResponse;
  token: null;
  role: null;
}

/**
 * Verifies the Bearer token from `Authorization` header and checks permission.
 *
 * Expects: `Authorization: Bearer <idToken>`
 *
 * Returns `{ token, role }` on success, `{ error: NextResponse }` on failure.
 */
export async function requirePermission(
  request: NextRequest | Request,
  permission: Permission,
): Promise<GuardOk | GuardFail> {
  const fail = (msg: string, status: number): GuardFail => ({
    error: NextResponse.json({ error: msg }, { status }),
    token: null,
    role: null,
  });

  const authHeader = request.headers.get('Authorization') ?? '';
  const idToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!idToken) return fail('Missing Authorization header', 401);

  let token: DecodedIdToken;
  try {
    token = await verifyIdToken(idToken);
  } catch {
    return fail('Invalid or expired token', 401);
  }

  const role = (token['role'] ?? 'member') as Role;

  if (!can(role, permission)) {
    return fail('Forbidden', 403);
  }

  return { error: null, token, role };
}
