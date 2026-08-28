/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getAuditLogs, resolveActor } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';

export async function GET(request: Request) {
  try {
    await ensureDb();
    const actor = await resolveActor(request);
    if (!actor || actor.role === 'unknown') {
      return errorResponse('Authentication required.', 401);
    }

    const { searchParams } = new URL(request.url);
    const requestedActorId = searchParams.get('actorUserId');

    // Non-admins can view their own activity logs
    if (actor.role !== 'admin' && requestedActorId && requestedActorId !== actor.userId) {
      return errorResponse('Access denied. You can only view your own activity logs.', 403);
    }

    const logs = await getAuditLogs({
      limit: Number(searchParams.get('limit')) || 100,
      offset: Number(searchParams.get('offset')) || 0,
      entityType: searchParams.get('entityType') || undefined,
      actorUserId: requestedActorId || (actor.role !== 'admin' ? actor.userId : undefined),
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
    });
    return jsonResponse(logs);
  } catch {
    return errorResponse('Failed to fetch audit logs', 500);
  }
}
