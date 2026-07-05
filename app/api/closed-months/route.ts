/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getClosedMonths, saveClosedMonth, deleteClosedMonth } from '@/lib/db';
import type { ClosedMonth } from '@/lib/types';
import { buildUpdateDetails, recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';

export async function GET() {
  try {
    await ensureDb();
    const list = await getClosedMonths();
    const sorted = [...list].sort((a, b) => b.month.localeCompare(a.month));
    return jsonResponse(sorted);
  } catch {
    return errorResponse('Failed to retrieve closed months', 500);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const closedMonth = (await request.json()) as ClosedMonth;
    if (!closedMonth.month || closedMonth.ownerTakeaway === undefined) {
      return errorResponse('Month and owner profit takeaway values are required', 400);
    }
    const list = await getClosedMonths();
    const existingMonth = closedMonth.id
      ? list.find((m) => m.id === closedMonth.id)
      : list.find((m) => m.month === closedMonth.month);
    const saved = await saveClosedMonth(closedMonth);
    await recordAudit({
      request,
      action: existingMonth ? 'UPDATE' : 'CREATE',
      entityType: 'closed_month',
      entityId: saved.id,
      entityLabel: saved.month,
      summary: existingMonth
        ? `Updated closed month ${saved.month}`
        : `Closed month ${saved.month}`,
      details: existingMonth
        ? buildUpdateDetails(
            existingMonth as unknown as Record<string, unknown>,
            saved as unknown as Record<string, unknown>,
            ['totalRevenue', 'totalExpenses', 'netProfit', 'ownerTakeaway', 'retainedEarnings']
          )
        : undefined,
    });
    return jsonResponse(saved);
  } catch {
    return errorResponse('Failed to save closed month ledger', 500);
  }
}
