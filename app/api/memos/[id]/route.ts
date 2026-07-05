/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { deleteMemo, getMemos } from '@/lib/db';
import { recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const { id } = await params;
    const memos = await getMemos();
    const existing = memos.find((m) => m.id === id);
    const success = await deleteMemo(id);
    if (success) {
      await recordAudit({
        request,
        action: 'DELETE',
        entityType: 'memo',
        entityId: id,
        entityLabel: existing?.authorName,
        summary: `Deleted memo by "${existing?.authorName ?? id}"`,
      });
      return jsonResponse({ success: true, message: 'Memo removed successfully' });
    }
    return errorResponse('Memo not found', 404);
  } catch {
    return errorResponse('Failed to delete frontdesk memo', 500);
  }
}
