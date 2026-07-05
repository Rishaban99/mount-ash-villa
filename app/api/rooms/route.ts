/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getRooms, saveRoom, deleteRoom } from '@/lib/db';
import { buildUpdateDetails, recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import {
  checkSessionPermission,
  requireSession,
  roomMutationPermission,
} from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;
    const rooms = await getRooms();
    return jsonResponse(rooms);
  } catch {
    return errorResponse('Failed to fetch rooms', 500);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const { id, roomNumber, roomType, price, status } = await request.json();
    if (!roomNumber || !roomType || !price || !status) {
      return errorResponse('All room fields are required', 400);
    }

    const permissionKey = roomMutationPermission(auth.session.role, Boolean(id));
    if (!(await checkSessionPermission(auth.session, permissionKey))) {
      return errorResponse('Forbidden: This action is restricted by administrator policy.', 403);
    }

    const rooms = await getRooms();
    if (rooms.some((r) => r.roomNumber === roomNumber && r.id !== id)) {
      return errorResponse('Room number already exists', 400);
    }

    const existingRoom = id ? rooms.find((r) => r.id === id) : undefined;
    const updatedRoom = await saveRoom({
      id: id || '',
      roomNumber,
      roomType,
      price: Number(price),
      status,
    });
    await recordAudit({
      request,
      action: existingRoom ? 'UPDATE' : 'CREATE',
      entityType: 'room',
      entityId: updatedRoom.id,
      entityLabel: `Room ${updatedRoom.roomNumber}`,
      summary: existingRoom
        ? `Updated Room ${updatedRoom.roomNumber}`
        : `Created Room ${updatedRoom.roomNumber}`,
      details: existingRoom
        ? buildUpdateDetails(
            existingRoom as unknown as Record<string, unknown>,
            updatedRoom as unknown as Record<string, unknown>,
            ['roomNumber', 'roomType', 'price', 'status']
          )
        : undefined,
    });
    return jsonResponse(updatedRoom);
  } catch {
    return errorResponse('Failed to save room', 500);
  }
}
