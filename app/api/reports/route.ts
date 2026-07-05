/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getBills } from '@/lib/db';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';

export async function GET() {
  try {
    await ensureDb();
    const bills = await getBills();

    const dailyMap = new Map<string, { revenue: number; foodRevenue: number; serviceCharge: number; roomRevenue: number; billsCount: number }>();
    const monthlyMap = new Map<string, { revenue: number; foodRevenue: number; serviceCharge: number; roomRevenue: number; billsCount: number }>();

    bills.forEach((b) => {
      if (b.status === 'Completed') {
        const dayKey = b.updatedAt.split('T')[0];
        const monthKey = dayKey.substring(0, 7);

        const currentDaily = dailyMap.get(dayKey) || { revenue: 0, foodRevenue: 0, serviceCharge: 0, roomRevenue: 0, billsCount: 0 };
        currentDaily.revenue += b.totalAmount;
        currentDaily.foodRevenue += b.foodSubtotal;
        currentDaily.serviceCharge += b.serviceCharge;
        currentDaily.roomRevenue += b.roomSubtotal;
        currentDaily.billsCount += 1;
        dailyMap.set(dayKey, currentDaily);

        const currentMonthly = monthlyMap.get(monthKey) || { revenue: 0, foodRevenue: 0, serviceCharge: 0, roomRevenue: 0, billsCount: 0 };
        currentMonthly.revenue += b.totalAmount;
        currentMonthly.foodRevenue += b.foodSubtotal;
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
