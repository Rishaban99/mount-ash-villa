/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Room } from '@/lib/types';

/** Keep one room per roomNumber; prefer Occupied (active billing state). */
export function dedupeRoomsByNumber(rooms: Room[]): Room[] {
  const byRoomNumber = new Map<string, Room>();

  for (const room of rooms) {
    const existing = byRoomNumber.get(room.roomNumber);
    if (!existing) {
      byRoomNumber.set(room.roomNumber, room);
      continue;
    }
    if (room.status === 'Occupied' && existing.status !== 'Occupied') {
      byRoomNumber.set(room.roomNumber, room);
    }
  }

  return Array.from(byRoomNumber.values());
}
