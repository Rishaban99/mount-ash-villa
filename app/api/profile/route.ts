/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { getUsers, saveUser } from '@/lib/db';
import { recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { requireSession } from '@/lib/api-auth';
import { createSessionToken, sessionCookieOptions } from '@/lib/session';
import { cookies } from 'next/headers';

export async function GET(request: Request) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const users = await getUsers();
    const currentUser = users.find((u) => u.id === auth.session.userId);
    if (!currentUser) {
      return errorResponse('User profile not found', 404);
    }

    const { password, ...safeProfile } = currentUser;
    return jsonResponse(safeProfile);
  } catch (error) {
    console.error('Error fetching profile:', error);
    return errorResponse('Failed to load profile details', 500);
  }
}

export async function PUT(request: Request) {
  try {
    await ensureDb();
    const auth = await requireSession(request);
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { name, username, currentPassword, newPassword } = body;

    const users = await getUsers();
    const currentUser = users.find((u) => u.id === auth.session.userId);
    if (!currentUser) {
      return errorResponse('User profile not found', 404);
    }

    // If changing username, check uniqueness
    if (username && username.trim().toLowerCase() !== currentUser.username.toLowerCase()) {
      const usernameExists = users.some(
        (u) => u.id !== currentUser.id && u.username.toLowerCase() === username.trim().toLowerCase()
      );
      if (usernameExists) {
        return errorResponse('Username is already taken by another staff member.', 400);
      }
    }

    let updatedPassword = currentUser.password;
    if (newPassword && newPassword.trim().length > 0) {
      if (!currentPassword) {
        return errorResponse('Current password is required to change password.', 400);
      }
      if (currentPassword !== currentUser.password) {
        return errorResponse('Current password verification failed.', 400);
      }
      if (newPassword.trim().length < 4) {
        return errorResponse('New password must be at least 4 characters long.', 400);
      }
      updatedPassword = newPassword.trim();
    }

    const updatedUser = {
      ...currentUser,
      name: name ? name.trim() : currentUser.name,
      username: username ? username.trim() : currentUser.username,
      password: updatedPassword,
    };

    const saved = await saveUser(updatedUser);

    // Update session cookie with new name/username
    const token = await createSessionToken({
      userId: saved.id,
      username: saved.username,
      name: saved.name,
      role: saved.role,
    });
    const cookieStore = await cookies();
    cookieStore.set(sessionCookieOptions(token));

    await recordAudit({
      request,
      action: 'UPDATE',
      entityType: 'user',
      entityId: saved.id,
      entityLabel: saved.name,
      summary: `Updated profile details for "${saved.name}" (${saved.username})`,
    });

    const { password: _, ...safeSavedUser } = saved;
    return jsonResponse({
      message: 'Profile updated successfully',
      user: safeSavedUser,
    });
  } catch (error) {
    console.error('Error updating profile:', error);
    return errorResponse('Failed to update profile details', 500);
  }
}
