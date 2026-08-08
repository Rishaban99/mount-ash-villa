/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { deleteAttendanceRecord, saveAttendanceRecord } from '@/lib/db';
import { recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { requireSession } from '@/lib/api-auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const { id } = await params;
    if (!id) {
      return errorResponse('Missing attendance record ID', 400);
    }

    const success = await deleteAttendanceRecord(id);
    if (!success) {
      return errorResponse('Failed to delete attendance record', 404);
    }

    await recordAudit({
      request,
      action: 'DELETE',
      entityType: 'attendance',
      entityId: id,
      summary: `Deleted attendance record ID "${id}"`,
    });

    return jsonResponse({ success: true });
  } catch (error) {
    console.error('Error deleting attendance record:', error);
    return errorResponse('Failed to delete attendance record', 500);
  }
}
