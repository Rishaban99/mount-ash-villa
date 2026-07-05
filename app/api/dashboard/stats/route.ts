/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getRooms, getBills } from '@/lib/db';
import type { DashboardStats } from '@/lib/types';
import { ensureDb, errorResponse, isToday, jsonResponse } from '@/lib/api-utils';

export async function GET() {
  try {
    await ensureDb();
    const rooms = await getRooms();
    const bills = await getBills();

    const totalRooms = rooms.length;
    const availableRooms = rooms.filter((r) => r.status === 'Available').length;
    const occupiedRooms = rooms.filter((r) => r.status === 'Occupied').length;

    const todayRevenue = bills
      .filter((b) => b.status === 'Completed' && isToday(b.updatedAt))
      .reduce((acc, b) => acc + b.totalAmount, 0);

    const activeBillsCount = bills.filter((b) => b.status === 'Active').length;

    const foodOrdersCount = bills
      .filter((b) => isToday(b.createdAt))
      .reduce((acc, b) => {
        const qty = b.foodItems.reduce((qState, f) => qState + f.quantity, 0);
        return acc + qty;
      }, 0);

    const stats: DashboardStats = {
      totalRooms,
      availableRooms,
      occupiedRooms,
      todayRevenue,
      activeBillsCount,
      foodOrdersCount,
    };

    return jsonResponse(stats);
  } catch {
    return errorResponse('Failed to load dashboard statistics', 500);
  }
}
