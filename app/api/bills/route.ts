/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getBills, saveBill, deleteBill } from '@/lib/db';
import type { Bill } from '@/lib/types';
import { buildUpdateDetails, recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';

export async function GET() {
  try {
    await ensureDb();
    const bills = await getBills();
    return jsonResponse(bills);
  } catch {
    return errorResponse('Failed to fetch bills', 500);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const billData = await request.json();
    if (!billData.guestId || !billData.guestDetails) {
      return errorResponse('Guest details are required for creating a bill', 400);
    }

    const foodItems = billData.foodItems || [];
    const roomItems = billData.roomItems || [];

    const foodSubtotal = foodItems.reduce((acc: number, item: { price: number; quantity: number }) => acc + item.price * item.quantity, 0);
    const serviceCharge = Math.round(foodSubtotal * 0.1);
    const roomSubtotal = roomItems.reduce((acc: number, item: { pricePerNight: number; nights: number }) => acc + item.pricePerNight * item.nights, 0);
    const totalAmount = foodSubtotal + serviceCharge + roomSubtotal;

    const bills = await getBills();
    const existingBill = billData.id ? bills.find((b) => b.id === billData.id) : undefined;

    const fullBill: Bill = {
      id: billData.id || '',
      guestId: billData.guestId,
      guestDetails: billData.guestDetails,
      roomItems,
      foodItems,
      foodSubtotal,
      serviceCharge,
      roomSubtotal,
      totalAmount,
      status: billData.status || 'Active',
      createdAt: billData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveBill(fullBill);
    const actionLabel = billData.status === 'Completed' ? 'Settled' : existingBill ? 'Updated' : 'Created';
    await recordAudit({
      request,
      action: existingBill ? 'UPDATE' : 'CREATE',
      entityType: 'bill',
      entityId: saved.id,
      entityLabel: saved.id,
      summary: `${actionLabel} bill ${saved.id} for "${saved.guestDetails.name}"`,
      details: existingBill
        ? buildUpdateDetails(
            existingBill as unknown as Record<string, unknown>,
            saved as unknown as Record<string, unknown>,
            ['status', 'totalAmount', 'foodSubtotal', 'roomSubtotal', 'serviceCharge']
          )
        : undefined,
    });
    return jsonResponse(saved);
  } catch (error) {
    console.error('Save bill failed:', error);
    return errorResponse('Failed to save bill', 500);
  }
}
