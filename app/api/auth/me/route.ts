/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getSession } from '@/lib/session';
import { getUsers } from '@/lib/db';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';

export async function GET() {
  try {
    await ensureDb();
    const session = await getSession();
    if (!session) {
      return errorResponse('Not authenticated', 401);
    }

    const users = await getUsers();
    const user = users.find((u) => u.id === session.userId);
    if (!user) {
      return errorResponse('User not found', 401);
    }

    const { password: _, ...userWithoutPassword } = user;
    return jsonResponse({ user: userWithoutPassword });
  } catch {
    return errorResponse('Failed to fetch session', 500);
  }
}
