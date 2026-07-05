/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { createAuditLog, queryAuditLogs, getUsers } from '@/lib/db';
import { getSessionFromRequest } from '@/lib/session';
import type { AuditAction } from '@/lib/types';

export interface Actor {
  userId: string;
  name: string;
  role: string;
}

export async function resolveActor(request: Request): Promise<Actor> {
  const session = await getSessionFromRequest(request);
  if (session) {
    const users = await getUsers();
    const user = users.find((u) => u.id === session.userId);
    if (user) {
      return { userId: user.id, name: user.name, role: user.role };
    }
    return {
      userId: session.userId,
      name: session.name,
      role: session.role,
    };
  }

  return { userId: 'unknown', name: 'Unknown', role: 'unknown' };
}

export function buildUpdateDetails(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  fields: string[]
): Record<string, { from: unknown; to: unknown }> {
  const details: Record<string, { from: unknown; to: unknown }> = {};
  for (const field of fields) {
    const fromVal = before[field];
    const toVal = after[field];
    if (JSON.stringify(fromVal) !== JSON.stringify(toVal)) {
      details[field] = { from: fromVal, to: toVal };
    }
  }
  return details;
}

export async function recordAudit(params: {
  request: Request;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  summary: string;
  details?: Record<string, unknown>;
}) {
  const actor = await resolveActor(params.request);
  await createAuditLog({
    action: params.action,
    entityType: params.entityType,
    entityId: params.entityId,
    entityLabel: params.entityLabel,
    actorUserId: actor.userId,
    actorName: actor.name,
    actorRole: actor.role,
    summary: params.summary,
    details: params.details,
  });
}

export async function getAuditLogs(filters: {
  limit?: number;
  offset?: number;
  entityType?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
}) {
  return queryAuditLogs(filters);
}
