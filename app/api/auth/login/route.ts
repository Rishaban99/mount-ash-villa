/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { cookies } from 'next/headers';
import { createAuditLog, getUsers } from '@/lib/db';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { createSessionToken, sessionCookieOptions } from '@/lib/session';

export async function POST(request: Request) {
  try {
    await ensureDb();
    const { username, password } = await request.json();

    if (!username || !password) {
      return errorResponse('Username and password are required', 400);
    }

    const users = await getUsers();
    const user = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (!user) {
      return errorResponse('Invalid username or password', 401);
    }

    const today = new Date().toISOString().split('T')[0];
    if (user.leftDate && user.leftDate <= today) {
      return errorResponse('This account is no longer active.', 403);
    }

    const token = await createSessionToken({
      userId: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
    });

    const cookieStore = await cookies();
    cookieStore.set(sessionCookieOptions(token));

    const { password: _, ...userWithoutPassword } = user;
    await createAuditLog({
      action: 'LOGIN',
      entityType: 'auth',
      entityId: user.id,
      entityLabel: user.username,
      actorUserId: user.id,
      actorName: user.name,
      actorRole: user.role,
      summary: `User "${user.username}" logged in`,
    });

    return jsonResponse({ success: true, user: userWithoutPassword });
  } catch {
    return errorResponse('Internal server error during login', 500);
  }
}
