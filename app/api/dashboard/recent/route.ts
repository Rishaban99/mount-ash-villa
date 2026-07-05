/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getBills, getGuests } from '@/lib/db';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';

export async function GET() {
  try {
    await ensureDb();
    const bills = await getBills();
    const guests = await getGuests();

    const sortedBills = bills
      .filter((b) => b.status === 'Active')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    const sortedGuests = [...guests]
      .sort((a, b) => new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime())
      .slice(0, 5);

    const recentFoodOrders: Array<{
      billId: string;
      guestName: string;
      items: string;
      amount: number;
      time: string;
      dateObj: Date;
    }> = [];

    bills.forEach((b) => {
      if (b.foodItems.length > 0) {
        const itemNames = b.foodItems.map((fi) => `${fi.foodName} (${fi.quantity}x)`).join(', ');
        recentFoodOrders.push({
          billId: b.id,
          guestName: b.guestDetails.name,
          items: itemNames,
          amount: b.foodSubtotal + b.serviceCharge,
          time: new Date(b.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dateObj: new Date(b.updatedAt),
        });
      }
    });

    const sortedFoodOrders = recentFoodOrders
      .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())
      .slice(0, 5)
      .map(({ dateObj: _dateObj, ...rest }) => rest);

    return jsonResponse({
      recentBills: sortedBills,
      recentCheckins: sortedGuests,
      recentFoodOrders: sortedFoodOrders,
    });
  } catch {
    return errorResponse('Failed to fetch recent activities', 500);
  }
}
