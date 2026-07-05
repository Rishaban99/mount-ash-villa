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
    if (actor.role !== 'admin') {
      return errorResponse('Super Admin access required.', 403);
    }

    const { searchParams } = new URL(request.url);
    const logs = await getAuditLogs({
      limit: Number(searchParams.get('limit')) || 100,
      offset: Number(searchParams.get('offset')) || 0,
      entityType: searchParams.get('entityType') || undefined,
      actorUserId: searchParams.get('actorUserId') || undefined,
      from: searchParams.get('from') || undefined,
      to: searchParams.get('to') || undefined,
    });
    return jsonResponse(logs);
  } catch {
    return errorResponse('Failed to fetch audit logs', 500);
  }
}
