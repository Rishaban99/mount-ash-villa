/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getAttendanceRecords, saveAttendanceRecord } from '@/lib/db';
import { recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { requireSession } from '@/lib/api-auth';
import type { Attendance } from '@/lib/types';

export async function GET(request: Request) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date') || undefined;
    const month = searchParams.get('month') || undefined;
    const userId = searchParams.get('userId') || undefined;

    const records = await getAttendanceRecords({ date, month, userId });
    return jsonResponse(records);
  } catch (error) {
    console.error('Error fetching attendance records:', error);
    return errorResponse('Failed to fetch attendance records', 500);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();

    // Check if bulk save (array of records) or single record
    if (Array.isArray(body)) {
      const results: Attendance[] = [];
      for (const item of body) {
        if (!item.userId || !item.date) continue;
        const saved = await saveAttendanceRecord({
          ...item,
          recordedBy: auth.session.name,
        });
        results.push(saved);
      }

      await recordAudit({
        request,
        action: 'UPDATE',
        entityType: 'attendance',
        summary: `Batch updated attendance records (${results.length} items)`,
      });

      return jsonResponse(results);
    }

    const { userId, date, checkIn, checkOut, status, shift, workHours, overtimeHours, notes, userName, userRole } = body;
    if (!userId || !date) {
      return errorResponse('userId and date are required', 400);
    }

    const saved = await saveAttendanceRecord({
      userId,
      userName,
      userRole,
      date,
      checkIn,
      checkOut,
      status,
      shift,
      workHours,
      overtimeHours,
      notes,
      recordedBy: auth.session.name,
    });

    await recordAudit({
      request,
      action: 'CREATE',
      entityType: 'attendance',
      entityId: saved.id,
      entityLabel: `${saved.userName} (${saved.date})`,
      summary: `Logged attendance for "${saved.userName}" on ${saved.date}: ${saved.status}`,
    });

    return jsonResponse(saved);
  } catch (error) {
    console.error('Error saving attendance record:', error);
    return errorResponse('Failed to save attendance record', 500);
  }
}
