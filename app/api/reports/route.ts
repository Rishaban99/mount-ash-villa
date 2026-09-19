/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getBills } from '@/lib/db';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { requirePermission } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    await ensureDb();
    const auth = await requirePermission(request, 'allowManagerViewReports');
    if (!auth.ok) return auth.response;
    const bills = await getBills();

    const dailyMap = new Map<string, { revenue: number; foodRevenue: number; amenitiesRevenue: number; serviceCharge: number; roomRevenue: number; billsCount: number }>();
    const monthlyMap = new Map<string, { revenue: number; foodRevenue: number; amenitiesRevenue: number; serviceCharge: number; roomRevenue: number; billsCount: number }>();

    bills.forEach((b) => {
      if (b.status === 'Completed') {
        const dayKey = b.updatedAt.split('T')[0];
        const monthKey = dayKey.substring(0, 7);

        const amenityItemsTotal = (b.amenitiesSubtotal !== undefined && b.amenitiesSubtotal > 0)
          ? b.amenitiesSubtotal
          : (b.amenityItems && b.amenityItems.length > 0)
            ? b.amenityItems.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0)
            : (b.foodItems || [])
                .filter((item: any) => item.foodId?.startsWith('amenity_') || item.foodName?.startsWith('✨'))
                .reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);

        const foodOnlySubtotal = (b.amenityItems && b.amenityItems.length > 0)
          ? b.foodSubtotal
          : (b.foodItems || [])
              .filter((item: any) => !item.foodId?.startsWith('amenity_') && !item.foodName?.startsWith('✨'))
              .reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);

        const currentDaily = dailyMap.get(dayKey) || { revenue: 0, foodRevenue: 0, amenitiesRevenue: 0, serviceCharge: 0, roomRevenue: 0, billsCount: 0 };
        currentDaily.revenue += b.totalAmount;
        currentDaily.foodRevenue += foodOnlySubtotal;
        currentDaily.amenitiesRevenue += amenityItemsTotal;
        currentDaily.serviceCharge += b.serviceCharge;
        currentDaily.roomRevenue += b.roomSubtotal;
        currentDaily.billsCount += 1;
        dailyMap.set(dayKey, currentDaily);

        const currentMonthly = monthlyMap.get(monthKey) || { revenue: 0, foodRevenue: 0, amenitiesRevenue: 0, serviceCharge: 0, roomRevenue: 0, billsCount: 0 };
        currentMonthly.revenue += b.totalAmount;
        currentMonthly.foodRevenue += foodOnlySubtotal;
        currentMonthly.amenitiesRevenue += amenityItemsTotal;
        currentMonthly.serviceCharge += b.serviceCharge;
        currentMonthly.roomRevenue += b.roomSubtotal;
        currentMonthly.billsCount += 1;
        monthlyMap.set(monthKey, currentMonthly);
      }
    });

    const dailySummary = Array.from(dailyMap.entries())
      .map(([date, details]) => ({ date, ...details }))
      .sort((a, b) => b.date.localeCompare(a.date));

    const monthlySummary = Array.from(monthlyMap.entries())
      .map(([month, details]) => ({ month, ...details }))
      .sort((a, b) => b.month.localeCompare(a.month));

    return jsonResponse({ dailySummary, monthlySummary });
  } catch {
    return errorResponse('Failed to compile report summaries', 500);
  }
}
