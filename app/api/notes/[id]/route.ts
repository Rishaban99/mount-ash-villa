/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextRequest } from 'next/server';
import { updateDailyNote, deleteDailyNote } from '@/lib/db';
import type { DailyNote } from '@/lib/types';
import { recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const { id } = await params;
    const body = (await request.json()) as Partial<DailyNote>;
    const updated = await updateDailyNote(id, body);
    if (!updated) {
      return errorResponse('Note not found', 404);
    }
    return jsonResponse(updated);
  } catch (error) {
    console.error('API /notes/[id] PATCH error:', error);
    return errorResponse('Failed to update notebook entry', 500);
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const { id } = await params;
    const success = await deleteDailyNote(id);
    if (!success) {
      return errorResponse('Failed to delete note or note not found', 404);
    }

    await recordAudit({
      request,
      action: 'DELETE',
      entityType: 'daily_note',
      entityId: id,
      summary: `Deleted notebook entry ${id}`,
    });

    return jsonResponse({ success: true, id });
  } catch (error) {
    console.error('API /notes/[id] DELETE error:', error);
    return errorResponse('Failed to delete notebook entry', 500);
  }
}
