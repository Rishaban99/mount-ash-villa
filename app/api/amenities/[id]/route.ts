/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { deleteAmenity, getAmenities } from '@/lib/db';
import { recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { checkSessionPermission, requireSession, amenityDeletePermission } from '@/lib/api-auth';

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    if (auth.session.role !== 'admin') {
      const permissionKey = amenityDeletePermission(auth.session.role);
      if (!(await checkSessionPermission(auth.session, permissionKey))) {
        return errorResponse('Forbidden: This action is restricted by administrator policy.', 403);
      }
    }

    const { id } = await params;
    const amenities = await getAmenities();
    const existing = amenities.find((a) => a.id === id);
    const success = await deleteAmenity(id);
    if (success) {
      await recordAudit({
        request,
        action: 'DELETE',
        entityType: 'amenity',
        entityId: id,
        entityLabel: existing?.name,
        summary: `Deleted amenity item "${existing?.name ?? id}"`,
      });
      return jsonResponse({ success: true });
    }
    return errorResponse('Amenity not found', 404);
  } catch {
    return errorResponse('Failed to delete amenity', 500);
  }
}
