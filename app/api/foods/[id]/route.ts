/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { deleteFood, getFoods } from '@/lib/db';
import { recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { checkSessionPermission, requireSession, foodDeletePermission } from '@/lib/api-auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const permissionKey = foodDeletePermission(auth.session.role);
    if (!(await checkSessionPermission(auth.session, permissionKey))) {
      return errorResponse('Forbidden: This action is restricted by administrator policy.', 403);
    }

    const { id } = await params;
    const foods = await getFoods();
    const existing = foods.find((f) => f.id === id);
    const success = await deleteFood(id);
    if (success) {
      await recordAudit({
        request,
        action: 'DELETE',
        entityType: 'food',
        entityId: id,
        entityLabel: existing?.foodName,
        summary: `Deleted food item "${existing?.foodName ?? id}"`,
      });
      return jsonResponse({ success: true });
    }
    return errorResponse('Food not found', 404);
  } catch {
    return errorResponse('Failed to delete food', 500);
  }
}
