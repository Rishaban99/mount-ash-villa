/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { deleteExpense, getExpenses } from '@/lib/db';
import { recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { requirePermission } from '@/lib/api-auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const auth = await requirePermission(request, 'allowManagerDeleteExpenses');
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const expenses = await getExpenses();
    const existing = expenses.find((e) => e.id === id);
    const success = await deleteExpense(id);
    if (success) {
      await recordAudit({
        request,
        action: 'DELETE',
        entityType: 'expense',
        entityId: id,
        entityLabel: existing?.title,
        summary: `Deleted expense "${existing?.title ?? id}"`,
      });
      return jsonResponse({ success: true });
    }
    return errorResponse('Expense not found', 404);
  } catch {
    return errorResponse('Failed to delete expense', 500);
  }
}
