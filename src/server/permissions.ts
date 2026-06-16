/**
 * Server-only permissions index.
 *
 * Import ONLY in Route Handlers, Server Actions, or middleware.
 *
 * Hierarchy: member < executive < core
 * Adviser is independent — permissions assigned explicitly, no inheritance.
 *
 * Usage:
 *   import { can } from '@/server/permissions';
 *   if (!can(role, 'manageEvents')) return Response.json({ error: 'Forbidden' }, { status: 403 });
 */

import type { User } from '@/schema/user';

type Role = User['role'];

const PERMISSIONS = {
  /** View all events — everyone including members */
  viewEvents:                 ['member', 'executive', 'core', 'adviser'],

  /** Register for restricted (non-open) events */
  registerForEvent:           ['executive', 'core', 'adviser'],

  /** Register for events marked isOpenToAll */
  registerForOpenToAllEvents: ['member', 'executive', 'core', 'adviser'],

  /** Create, modify, and delete events */
  manageEvents:               ['core', 'adviser'],

  /** View all user profiles */
  viewAllUsers:               ['core', 'adviser'],

  /** Mark attendance for event participants */
  markAttendance:             ['core', 'adviser'],
} as const satisfies Record<string, Role[]>;

export type Permission = keyof typeof PERMISSIONS;

/**
 * Returns true if `role` is authorised to perform `permission`.
 *
 * @example
 * can('executive', 'registerForEvent')  // true
 * can('member',    'registerForEvent')  // false
 */
export function can(role: Role, permission: Permission): boolean {
  return (PERMISSIONS[permission] as readonly Role[]).includes(role);
}

/**
 * Returns all permissions granted to a role.
 */
export function permissionsFor(role: Role): Permission[] {
  return (Object.keys(PERMISSIONS) as Permission[]).filter((p) => can(role, p));
}
