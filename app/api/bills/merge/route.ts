/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getBills, saveBill, deleteBill, getSettings } from '@/lib/db';
import type { Bill, RoomItem, FoodItem } from '@/lib/types';
import { recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { requireSession } from '@/lib/api-auth';

export async function POST(request: Request) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    // Strict Admin authorization check
    if (auth.session.role !== 'admin') {
      return errorResponse('Access denied. Only system administrators are permitted to merge guest bills.', 403);
    }

    const body = await request.json();
    const { targetBillId, sourceBillIds, mergeNotes } = body;

    if (!targetBillId || !Array.isArray(sourceBillIds) || sourceBillIds.length === 0) {
      return errorResponse('Target bill and at least one source bill are required for merging.', 400);
    }

    // Ensure targetBillId is not in sourceBillIds
    const filteredSourceIds = sourceBillIds.filter((id: string) => id !== targetBillId);
    if (filteredSourceIds.length === 0) {
      return errorResponse('Cannot merge a bill into itself.', 400);
    }

    const allBills = await getBills();
    const targetBill = allBills.find((b) => b.id === targetBillId);

    if (!targetBill) {
      return errorResponse(`Target bill ${targetBillId} not found.`, 404);
    }

    const sourceBills: Bill[] = [];
    for (const id of filteredSourceIds) {
      const src = allBills.find((b) => b.id === id);
      if (!src) {
        return errorResponse(`Source bill ${id} not found.`, 404);
      }
      sourceBills.push(src);
    }

    // Combine room items
    const combinedRoomItems: RoomItem[] = [...(targetBill.roomItems || [])];
    sourceBills.forEach((sb) => {
      if (Array.isArray(sb.roomItems)) {
        combinedRoomItems.push(...sb.roomItems);
      }
    });

    // Consolidate food items (sum quantities for same foodId & unit price)
    const foodMap: Record<string, FoodItem> = {};
    const allFoodItemsList: FoodItem[] = [...(targetBill.foodItems || [])];
    sourceBills.forEach((sb) => {
      if (Array.isArray(sb.foodItems)) {
        allFoodItemsList.push(...sb.foodItems);
      }
    });

    allFoodItemsList.forEach((item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      const key = `${item.foodId || item.foodName}_${price}`;

      if (!foodMap[key]) {
        foodMap[key] = {
          foodId: item.foodId || '',
          foodName: item.foodName,
          price,
          quantity: qty,
        };
      } else {
        foodMap[key].quantity += qty;
      }
    });

    const combinedFoodItems: FoodItem[] = Object.values(foodMap);

    // Recalculate Subtotals
    const foodSubtotal = combinedFoodItems.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const roomSubtotal = combinedRoomItems.reduce((acc, item) => acc + item.pricePerNight * item.nights, 0);

    const settings = await getSettings();
    const serviceChargePercent = settings?.serviceChargePercent ?? 10;
    
    // Check if target or any source bill had service charge applied
    const hadServiceCharge = (targetBill.serviceCharge || 0) > 0 || sourceBills.some((sb) => (sb.serviceCharge || 0) > 0);
    const serviceCharge = hadServiceCharge ? Math.round(foodSubtotal * (serviceChargePercent / 100)) : 0;
    const totalAmount = foodSubtotal + serviceCharge + roomSubtotal;

    // Build consolidated bill
    const mergedNotes = [
      targetBill.dueLaterNote,
      ...sourceBills.map((sb) => sb.dueLaterNote),
      mergeNotes ? `[Merge Note]: ${mergeNotes}` : '',
      `Merged from: ${filteredSourceIds.join(', ')}`,
    ]
      .filter(Boolean)
      .join(' | ');

    const updatedTargetBill: Bill = {
      ...targetBill,
      roomItems: combinedRoomItems,
      foodItems: combinedFoodItems,
      foodSubtotal,
      roomSubtotal,
      serviceCharge,
      totalAmount,
      dueLaterNote: mergedNotes || undefined,
      updatedAt: new Date().toISOString(),
    };

    // 1. Save updated master bill
    const savedMasterBill = await saveBill(updatedTargetBill);

    // 2. Delete/consume source bills
    for (const sb of sourceBills) {
      await deleteBill(sb.id);
    }

    // 3. Record Audit Log
    await recordAudit({
      request,
      action: 'UPDATE',
      entityType: 'bill',
      entityId: savedMasterBill.id,
      entityLabel: savedMasterBill.id,
      summary: `Admin ${auth.session.name} merged ${sourceBills.length} bill(s) (${filteredSourceIds.join(', ')}) into master bill ${savedMasterBill.id} (${savedMasterBill.guestDetails.name})`,
      details: {
        targetBillId: savedMasterBill.id,
        sourceBillIds: filteredSourceIds,
        newTotal: totalAmount,
        combinedRoomsCount: combinedRoomItems.length,
        combinedFoodsCount: combinedFoodItems.length,
      },
    });

    return jsonResponse({
      success: true,
      message: `Successfully merged ${sourceBills.length} bill(s) into master bill ${savedMasterBill.id}`,
      bill: savedMasterBill,
      mergedSourceIds: filteredSourceIds,
    });
  } catch (error) {
    console.error('Bill merge failed:', error);
    return errorResponse('Failed to merge bills', 500);
  }
}
