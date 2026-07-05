/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { deleteRoom, getRooms } from '@/lib/db';
import { recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { checkSessionPermission, requireSession, roomDeletePermission } from '@/lib/api-auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const permissionKey = roomDeletePermission(auth.session.role);
    if (!(await checkSessionPermission(auth.session, permissionKey))) {
      return errorResponse('Forbidden: This action is restricted by administrator policy.', 403);
    }

    const { id } = await params;
    const rooms = await getRooms();
    const existing = rooms.find((r) => r.id === id);
    const success = await deleteRoom(id);
    if (success) {
      await recordAudit({
        request,
        action: 'DELETE',
        entityType: 'room',
        entityId: id,
        entityLabel: existing ? `Room ${existing.roomNumber}` : undefined,
        summary: `Deleted Room ${existing?.roomNumber ?? id}`,
      });
      return jsonResponse({ success: true });
    }
    return errorResponse('Room not found', 404);
  } catch {
    return errorResponse('Failed to delete room', 500);
  }
}
