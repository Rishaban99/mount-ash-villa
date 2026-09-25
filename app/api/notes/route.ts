/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { NextRequest } from 'next/server';
import { getDailyNotes, createDailyNote, updateDailyNote } from '@/lib/db';
import type { DailyNote } from '@/lib/types';
import { recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';

export async function GET(request: NextRequest) {
  try {
    await ensureDb();
    const searchParams = request.nextUrl.searchParams;
    const date = searchParams.get('date') || undefined;
    const notes = await getDailyNotes(date);
    return jsonResponse(notes);
  } catch (error) {
    console.error('API /notes GET error:', error);
    return errorResponse('Failed to retrieve daily notes', 500);
  }
}

export async function POST(request: NextRequest) {
  try {
    await ensureDb();
    const body = (await request.json()) as Partial<DailyNote>;
    if (!body.content && !body.title) {
      return errorResponse('Note title or content is required', 400);
    }

    if (body.id) {
      const updated = await updateDailyNote(body.id, body);
      return jsonResponse(updated);
    }

    const created = await createDailyNote(body);
    await recordAudit({
      request,
      action: 'CREATE',
      entityType: 'daily_note',
      entityId: created.id,
      entityLabel: created.title,
      summary: `Created notebook entry "${created.title}" for ${created.date}`,
    });

    return jsonResponse(created);
  } catch (error) {
    console.error('API /notes POST error:', error);
    return errorResponse('Failed to save notebook entry', 500);
  }
}
