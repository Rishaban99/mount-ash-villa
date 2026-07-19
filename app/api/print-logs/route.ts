/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getPrintLogs, savePrintLog } from '@/lib/db';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { requireSession } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const { searchParams } = new URL(request.url);
    const billId = searchParams.get('billId') || undefined;

    const logs = await getPrintLogs(billId);
    return jsonResponse(logs);
  } catch {
    return errorResponse('Failed to fetch print logs', 500);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { billId, billLabel, guestName, totalAmount, paymentMethod, paperWidth, currency } = body;

    if (!billId) {
      return errorResponse('billId is required', 400);
    }

    const log = await savePrintLog({
      billId,
      billLabel: billLabel || billId,
      guestName: guestName || '',
      totalAmount: totalAmount || 0,
      paymentMethod: paymentMethod || 'Cash',
      paperWidth: paperWidth || '80mm',
      currency: currency || 'Rs.',
      printedBy: auth.session.name,
      printedByRole: auth.session.role,
      printedAt: new Date().toISOString(),
    });

    return jsonResponse(log);
  } catch {
    return errorResponse('Failed to save print log', 500);
  }
}
