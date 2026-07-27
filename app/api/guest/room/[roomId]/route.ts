/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getBills, getRooms, getSettings } from '@/lib/db';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';

/**
 * GET /api/guest/room/[roomId]
 * Public endpoint – no auth required.
 * roomId can be either a room DB id OR a room number (e.g. "101").
 * Returns the active bill for the room plus room & settings info.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ roomId: string }> }
) {
  try {
    await ensureDb();

    const { roomId } = await params;

    const [rooms, bills, settings] = await Promise.all([
      getRooms(),
      getBills(),
      getSettings(),
    ]);

    // Match by room number (QR code uses roomNumber) or DB id
    const room = rooms.find(
      (r) => r.roomNumber === roomId || r.id === roomId
    );

    if (!room) {
      return errorResponse('Room not found', 404);
    }

    // Find the latest active bill for this room
    const activeBill = bills.find(
      (b) =>
        b.status === 'Active' &&
        b.roomItems.some(
          (ri) => ri.roomNumber === room.roomNumber || ri.roomId === room.id
        )
    );

    return jsonResponse({
      room,
      bill: activeBill ?? null,
      settings: {
        hotelName: settings.hotelName,
        phone: settings.phone,
        address: settings.address,
        currency: settings.currency,
        serviceChargePercent: settings.serviceChargePercent,
        checkInTime: settings.checkInTime,
        checkOutTime: settings.checkOutTime,
      },
    });
  } catch (err) {
    console.error('[guest/room] error:', err);
    return errorResponse('Failed to fetch room data', 500);
  }
}
