/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getGuests, saveGuest } from '@/lib/db';
import { buildUpdateDetails, recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { requireSession, requireStaffOrPermission } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;
    const guests = await getGuests();
    return jsonResponse(guests);
  } catch {
    return errorResponse('Failed to fetch guests', 500);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const auth = await requireStaffOrPermission(request, 'allowReceptionistManageGuests');
    if (!auth.ok) return auth.response;
    const { id, name, phone, nic, address, checkInDate, checkOutDate } = await request.json();
    if (!name || !nic || !checkInDate) {
      return errorResponse('Name, Identification (NIC/Passport), and Check-In Date are required.', 400);
    }

    const guests = await getGuests();
    const existingGuest = id ? guests.find((g) => g.id === id) : undefined;
    const savedGuest = await saveGuest({
      id: id || '',
      name,
      phone: phone || '',
      nic,
      address: address || 'Hotel Guest Address',
      checkInDate,
      checkOutDate: checkOutDate || '',
    });
    await recordAudit({
      request,
      action: existingGuest ? 'UPDATE' : 'CREATE',
      entityType: 'guest',
      entityId: savedGuest.id,
      entityLabel: savedGuest.name,
      summary: existingGuest
        ? `Updated guest "${savedGuest.name}"`
        : `Registered guest "${savedGuest.name}"`,
      details: existingGuest
        ? buildUpdateDetails(
            existingGuest as unknown as Record<string, unknown>,
            savedGuest as unknown as Record<string, unknown>,
            ['name', 'phone', 'nic', 'address', 'checkInDate', 'checkOutDate']
          )
        : undefined,
    });
    return jsonResponse(savedGuest);
  } catch {
    return errorResponse('Failed to save guest', 500);
  }
}
