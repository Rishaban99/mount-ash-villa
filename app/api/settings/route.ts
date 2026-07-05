/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSettings, saveSettings, getUsers } from '@/lib/db';
import { buildUpdateDetails, recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { PERMISSION_KEYS } from '@/lib/permissions';

export async function GET() {
  try {
    await ensureDb();
    const settings = await getSettings();
    return jsonResponse(settings);
  } catch {
    return errorResponse('Failed to fetch settings', 500);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const { settings, userId } = await request.json();
    if (!settings) {
      return errorResponse('Settings payload is required', 400);
    }

    const users = await getUsers();
    const operator = users.find((u) => u.id === userId);
    if (!operator || operator.role !== 'admin') {
      return errorResponse('Unauthorized: Only administrators are permitted to save settings.', 403);
    }

    const previousSettings = await getSettings();
    const updatedSettings = await saveSettings(settings);

    try {
      await recordAudit({
        request,
        action: 'UPDATE',
        entityType: 'settings',
        entityId: 'system_settings',
        entityLabel: 'System Settings',
        summary: 'Updated system settings',
        details: buildUpdateDetails(
          previousSettings as unknown as Record<string, unknown>,
          updatedSettings as unknown as Record<string, unknown>,
          ['hotelName', ...PERMISSION_KEYS]
        ),
      });
    } catch (auditError) {
      console.warn('Audit log failed but settings were saved:', auditError);
    }

    return jsonResponse(updatedSettings);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Settings update error:', errorMsg, error);
    return errorResponse(`Failed to update system settings: ${errorMsg}`, 500);
  }
}
