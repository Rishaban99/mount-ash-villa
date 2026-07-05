/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { deleteUser, getUsers } from '@/lib/db';
import { recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { requirePermission } from '@/lib/api-auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const auth = await requirePermission(request, 'allowManagerUserEdit');
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const users = await getUsers();
    const existing = users.find((u) => u.id === id);
    const success = await deleteUser(id);
    if (success) {
      await recordAudit({
        request,
        action: 'DELETE',
        entityType: 'user',
        entityId: id,
        entityLabel: existing?.name,
        summary: `Deleted user "${existing?.name ?? id}"`,
      });
      return jsonResponse({ success: true });
    }
    return errorResponse('User not found', 404);
  } catch {
    return errorResponse('Failed to delete user', 500);
  }
}
