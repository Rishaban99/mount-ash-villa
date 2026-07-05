/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { deleteBill, getBills } from '@/lib/db';
import { recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { requireStaffOrPermission } from '@/lib/api-auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const auth = await requireStaffOrPermission(request, 'allowReceptionistDelete');
    if (!auth.ok) return auth.response;

    const { id } = await params;
    const bills = await getBills();
    const existing = bills.find((b) => b.id === id);
    const deleted = await deleteBill(id);
    if (deleted) {
      await recordAudit({
        request,
        action: 'DELETE',
        entityType: 'bill',
        entityId: id,
        entityLabel: id,
        summary: `Deleted bill ${id}${existing ? ` for "${existing.guestDetails.name}"` : ''}`,
      });
      return jsonResponse({ success: true });
    }
    return errorResponse('Bill not found', 404);
  } catch (error) {
    console.error('Delete bill failed:', error);
    return errorResponse('Failed to delete bill', 500);
  }
}
