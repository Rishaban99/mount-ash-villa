/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getExpenses, saveExpense, deleteExpense } from '@/lib/db';
import { buildUpdateDetails, recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { requireSession, requireStaffOrPermission, requirePermission } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;
    const expenses = await getExpenses();
    return jsonResponse(expenses);
  } catch {
    return errorResponse('Failed to fetch expenses', 500);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const auth = await requireStaffOrPermission(request, 'allowReceptionistAddExpenses');
    if (!auth.ok) return auth.response;
    const { id, title, amount, category, date, description, approvedBy, paymentMethod } = await request.json();
    if (!title || !amount || !category || !date || !paymentMethod) {
      return errorResponse('Title, amount, category, date, and payment method are required.', 400);
    }

    const expenses = await getExpenses();
    const existingExpense = id ? expenses.find((e) => e.id === id) : undefined;
    const savedExpense = await saveExpense({
      id: id || '',
      title,
      amount: Number(amount),
      category,
      date,
      description: description || '',
      approvedBy: approvedBy || 'Admin',
      paymentMethod,
    });
    await recordAudit({
      request,
      action: existingExpense ? 'UPDATE' : 'CREATE',
      entityType: 'expense',
      entityId: savedExpense.id,
      entityLabel: savedExpense.title,
      summary: existingExpense
        ? `Updated expense "${savedExpense.title}"`
        : `Logged expense "${savedExpense.title}"`,
      details: existingExpense
        ? buildUpdateDetails(
            existingExpense as unknown as Record<string, unknown>,
            savedExpense as unknown as Record<string, unknown>,
            ['title', 'amount', 'category', 'date', 'description', 'paymentMethod']
          )
        : undefined,
    });
    return jsonResponse(savedExpense);
  } catch {
    return errorResponse('Failed to save expense', 500);
  }
}
