/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { deleteClosedMonth, getClosedMonths } from '@/lib/db';
import { recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const { id } = await params;
    const list = await getClosedMonths();
    const existing = list.find((m) => m.id === id);
    const success = await deleteClosedMonth(id);
    if (success) {
      await recordAudit({
        request,
        action: 'DELETE',
        entityType: 'closed_month',
        entityId: id,
        entityLabel: existing?.month,
        summary: `Deleted closed month ${existing?.month ?? id}`,
      });
      return jsonResponse({ success: true, message: 'Closed month ledger removed successfully' });
    }
    return errorResponse('Closed month not found', 404);
  } catch {
    return errorResponse('Failed to delete closed month ledger', 500);
  }
}
