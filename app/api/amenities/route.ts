/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getAmenities, saveAmenity } from '@/lib/db';
import { buildUpdateDetails, recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import {
  checkSessionPermission,
  requireSession,
  amenityMutationPermission,
  amenityViewPermission,
} from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    if (auth.session.role !== 'admin') {
      const viewKey = amenityViewPermission(auth.session.role);
      const canView = await checkSessionPermission(auth.session, viewKey);
      if (!canView) {
        return errorResponse('Forbidden: View access restricted by administrator policy.', 403);
      }
    }

    const amenities = await getAmenities();
    return jsonResponse(amenities);
  } catch {
    return errorResponse('Failed to fetch amenities', 500);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const { id, name, category, description, price, isFree, isAvailable, icon } = await request.json();
    if (!name || !category) {
      return errorResponse('Name and category fields are required', 400);
    }

    if (auth.session.role !== 'admin') {
      const permissionKey = amenityMutationPermission(auth.session.role, Boolean(id));
      if (!(await checkSessionPermission(auth.session, permissionKey))) {
        return errorResponse('Forbidden: This action is restricted by administrator policy.', 403);
      }
    }

    const amenities = await getAmenities();
    const existingAmenity = id ? amenities.find((a) => a.id === id) : undefined;
    const updatedAmenity = await saveAmenity({
      id: id || '',
      name,
      category,
      description: description ?? '',
      price: price !== undefined && price !== null ? Number(price) : 0,
      isFree: isFree !== undefined ? Boolean(isFree) : true,
      isAvailable: isAvailable !== undefined ? Boolean(isAvailable) : true,
      icon: icon || 'Sparkles',
    });

    await recordAudit({
      request,
      action: existingAmenity ? 'UPDATE' : 'CREATE',
      entityType: 'amenity',
      entityId: updatedAmenity.id,
      entityLabel: updatedAmenity.name,
      summary: existingAmenity
        ? `Updated amenity item "${updatedAmenity.name}"`
        : `Created amenity item "${updatedAmenity.name}"`,
      details: existingAmenity
        ? buildUpdateDetails(
            existingAmenity as unknown as Record<string, unknown>,
            updatedAmenity as unknown as Record<string, unknown>,
            ['name', 'category', 'description', 'price', 'isFree', 'isAvailable', 'icon']
          )
        : undefined,
    });
    return jsonResponse(updatedAmenity);
  } catch {
    return errorResponse('Failed to save amenity', 500);
  }
}
