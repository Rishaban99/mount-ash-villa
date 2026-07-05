/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSettings } from '@/lib/db';
import { errorResponse } from '@/lib/api-utils';
import { hasPermission, type PermissionKey } from '@/lib/permissions';
import { getSessionFromRequest, type SessionPayload } from '@/lib/session';
import type { UserRole } from '@/lib/types';

type AuthResult =
  | { ok: true; session: SessionPayload; response?: never }
  | { ok: false; session?: never; response: ReturnType<typeof errorResponse> };

type PermissionResult = AuthResult;

export async function requireSession(request: Request): Promise<AuthResult> {
  const session = await getSessionFromRequest(request);
  if (!session) {
    return { ok: false, response: errorResponse('Unauthorized: Please sign in.', 401) };
  }
  return { ok: true, session };
}

export async function requireRole(
  request: Request,
  roles: UserRole[]
): Promise<AuthResult> {
  const auth = await requireSession(request);
  if (!auth.ok) return auth;
  if (!roles.includes(auth.session.role)) {
    return {
      ok: false,
      response: errorResponse('Forbidden: Insufficient role privileges.', 403),
    };
  }
  return auth;
}

export async function requirePermission(
  request: Request,
  permissionKey: PermissionKey
): Promise<PermissionResult> {
  const auth = await requireSession(request);
  if (!auth.ok) return auth;

  const settings = await getSettings();
  if (!hasPermission(auth.session.role, permissionKey, settings)) {
    return {
      ok: false,
      response: errorResponse('Forbidden: This action is restricted by administrator policy.', 403),
    };
  }

  return auth;
}

/** Admin and manager bypass; receptionist must have the given permission. */
export async function requireStaffOrPermission(
  request: Request,
  receptionistPermission: PermissionKey
): Promise<PermissionResult> {
  const auth = await requireSession(request);
  if (!auth.ok) return auth;
  if (auth.session.role === 'admin' || auth.session.role === 'manager') {
    return auth;
  }
  const settings = await getSettings();
  if (!hasPermission(auth.session.role, receptionistPermission, settings)) {
    return {
      ok: false,
      response: errorResponse('Forbidden: This action is restricted by administrator policy.', 403),
    };
  }
  return auth;
}

/** Check a role-specific permission key after session is established. */
export async function checkSessionPermission(
  session: SessionPayload,
  permissionKey: PermissionKey
): Promise<boolean> {
  const settings = await getSettings();
  return hasPermission(session.role, permissionKey, settings);
}

/** Resolve the correct room permission key for add vs edit based on role. */
export function roomMutationPermission(
  role: UserRole,
  isUpdate: boolean
): PermissionKey {
  if (role === 'manager') {
    return isUpdate ? 'allowManagerEditRooms' : 'allowManagerAddRooms';
  }
  return isUpdate ? 'allowReceptionistEditRooms' : 'allowReceptionistAddRooms';
}

/** Resolve the correct food permission key for add vs edit based on role. */
export function foodMutationPermission(
  role: UserRole,
  isUpdate: boolean
): PermissionKey {
  if (role === 'manager') {
    return isUpdate ? 'allowManagerEditFoods' : 'allowManagerAddFoods';
  }
  return isUpdate ? 'allowReceptionistEditFoods' : 'allowReceptionistAddFoods';
}

/** Resolve the correct room delete permission key based on role. */
export function roomDeletePermission(role: UserRole): PermissionKey {
  return role === 'manager' ? 'allowManagerDeleteRooms' : 'allowReceptionistDeleteRooms';
}

/** Resolve the correct food delete permission key based on role. */
export function foodDeletePermission(role: UserRole): PermissionKey {
  return role === 'manager' ? 'allowManagerDeleteFoods' : 'allowReceptionistDeleteFoods';
}
