/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getBills, saveBill, getRooms, getSettings } from '@/lib/db';
import type { Bill, RoomItem, FoodItem } from '@/lib/types';
import { buildUpdateDetails, recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { requireSession } from '@/lib/api-auth';
import { hasPermission } from '@/lib/permissions';

async function validateReceptionistBillRestrictions(
  role: string,
  roomItems: RoomItem[]
): Promise<string | null> {
  if (role !== 'receptionist') return null;

  const settings = await getSettings();
  const rooms = await getRooms();

  for (const item of roomItems) {
    const room = rooms.find((r) => r.id === item.roomId);
    const basePrice = room?.price ?? item.originalPricePerNight ?? item.pricePerNight;
    const discount = item.discount || 0;

    if (discount > 0 && !hasPermission('receptionist', 'allowReceptionistDiscount', settings)) {
      return 'Receptionists are not permitted to apply discounts on room stays.';
    }

    if (item.pricePerNight !== basePrice && discount === 0 &&
        !hasPermission('receptionist', 'allowReceptionistModifyPrice', settings)) {
      return 'Receptionists are not permitted to override base room prices.';
    }
  }

  return null;
}

export async function GET(request: Request) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;
    const bills = await getBills();
    return jsonResponse(bills);
  } catch {
    return errorResponse('Failed to fetch bills', 500);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const billData = await request.json();
    if (!billData.guestId || !billData.guestDetails) {
      return errorResponse('Guest details are required for creating a bill', 400);
    }

    const rawFoodItems = billData.foodItems || [];
    const rawAmenityItems = billData.amenityItems || [];
    const combinedInput = [...rawFoodItems, ...rawAmenityItems];

    let roomItems: RoomItem[] = billData.roomItems || [];
    const requestedStatus = billData.status || 'Active';

    const bills = await getBills();
    const existingBill = billData.id ? bills.find((b) => b.id === billData.id) : undefined;

    if (!existingBill && requestedStatus === 'DueLater') {
      return errorResponse('Checkout on trust requires an existing active stay.', 400);
    }
    if (existingBill?.status === 'DueLater' && requestedStatus === 'Active') {
      return errorResponse('Cannot reopen a trust-checkout bill as an active stay.', 400);
    }
    if (existingBill?.status === 'Completed' && requestedStatus === 'DueLater') {
      return errorResponse('Cannot mark a settled bill as due later.', 400);
    }
    // Completed bill edit restriction: Only Admin can edit an already completed/settled bill
    if (existingBill?.status === 'Completed' && auth.session.role !== 'admin') {
      return errorResponse('Access denied. Only system administrators are permitted to edit completed/settled bills.', 403);
    }

    let foodItems: FoodItem[];
    let amenityItems: FoodItem[];

    if (existingBill?.status === 'DueLater') {
      roomItems = existingBill.roomItems;
      foodItems = existingBill.foodItems || [];
      amenityItems = existingBill.amenityItems || [];
    } else {
      foodItems = combinedInput.filter(
        (item: any) => !item.foodId?.startsWith('amenity_') && !item.foodName?.startsWith('✨')
      );
      amenityItems = combinedInput.filter(
        (item: any) => item.foodId?.startsWith('amenity_') || item.foodName?.startsWith('✨')
      );
    }

    const restrictionError = await validateReceptionistBillRestrictions(
      auth.session.role,
      roomItems
    );
    if (restrictionError) {
      return errorResponse(restrictionError, 403);
    }

    const foodSubtotal = existingBill?.status === 'DueLater'
      ? existingBill.foodSubtotal
      : foodItems.reduce((acc: number, item: { price: number; quantity: number }) => acc + item.price * item.quantity, 0);

    const amenitiesSubtotal = existingBill?.status === 'DueLater'
      ? (existingBill.amenitiesSubtotal || 0)
      : amenityItems.reduce((acc: number, item: { price: number; quantity: number }) => acc + item.price * item.quantity, 0);

    const settings = await getSettings();
    const serviceChargePercent = settings?.serviceChargePercent ?? 10;
    const applyServiceCharge = billData.applyServiceCharge !== false;
    const serviceCharge = existingBill?.status === 'DueLater'
      ? existingBill.serviceCharge
      : applyServiceCharge ? Math.round(foodSubtotal * (serviceChargePercent / 100)) : 0;
    const roomSubtotal = existingBill?.status === 'DueLater'
      ? existingBill.roomSubtotal
      : roomItems.reduce((acc: number, item: { pricePerNight: number; nights: number }) => acc + item.pricePerNight * item.nights, 0);
    const totalAmount = existingBill?.status === 'DueLater'
      ? existingBill.totalAmount
      : foodSubtotal + amenitiesSubtotal + serviceCharge + roomSubtotal;

    const dueLaterNote = typeof billData.dueLaterNote === 'string'
      ? billData.dueLaterNote.trim()
      : existingBill?.dueLaterNote;
    const dueLaterAt = requestedStatus === 'DueLater'
      ? (existingBill?.dueLaterAt || new Date().toISOString())
      : existingBill?.dueLaterAt;
    const advancePaidAmount = typeof billData.advancePaidAmount === 'number'
      ? Math.max(0, billData.advancePaidAmount)
      : (existingBill?.advancePaidAmount || 0);

    let finalGuestDetails = billData.guestDetails;
    if (finalGuestDetails && finalGuestDetails.checkInDate) {
      const maxNights = roomItems && roomItems.length > 0
        ? Math.max(...roomItems.map((item: any) => Number(item.nights) || 1))
        : 1;
      const d = new Date(finalGuestDetails.checkInDate);
      if (!isNaN(d.getTime())) {
        d.setDate(d.getDate() + maxNights);
        finalGuestDetails = {
          ...finalGuestDetails,
          checkOutDate: d.toISOString().split("T")[0],
        };
      }
    }

    const fullBill: Bill = {
      id: billData.id || '',
      guestId: billData.guestId,
      guestDetails: finalGuestDetails,
      roomItems,
      foodItems,
      amenityItems,
      foodSubtotal,
      amenitiesSubtotal,
      serviceCharge,
      roomSubtotal,
      totalAmount,
      status: requestedStatus,
      dueLaterNote: dueLaterNote || undefined,
      dueLaterAt,
      advancePaidAmount,
      createdAt: billData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveBill(fullBill);
    const actionLabel = requestedStatus === 'Completed'
      ? 'Settled'
      : requestedStatus === 'DueLater'
        ? 'Checked out on trust'
        : existingBill ? 'Updated' : 'Created';
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
            ['status', 'totalAmount', 'foodSubtotal', 'roomSubtotal', 'serviceCharge', 'dueLaterNote', 'advancePaidAmount']
          )
        : undefined,
    });
    return jsonResponse(saved);
  } catch (error) {
    console.error('Save bill failed:', error);
    return errorResponse('Failed to save bill', 500);
  }
}
