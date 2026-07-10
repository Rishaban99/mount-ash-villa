/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  getUsers,
  saveUser,
  deleteUser,
} from '@/lib/db';
import { buildUpdateDetails, recordAudit } from '@/lib/auditLog';
import { ensureDb, errorResponse, jsonResponse } from '@/lib/api-utils';
import { checkSessionPermission, requirePermission, requireSession } from '@/lib/api-auth';

export async function GET(request: Request) {
  try {
    await ensureDb();
    const auth = await requirePermission(request, 'allowManagerUserEdit');
    if (!auth.ok) return auth.response;
    const users = await getUsers();
    const safeUsers = users.map(({ password, ...u }) => u);
    return jsonResponse(safeUsers);
  } catch {
    return errorResponse('Failed to fetch users', 500);
  }
}

export async function POST(request: Request) {
  try {
    await ensureDb();
    const auth = await requirePermission(request, 'allowManagerUserEdit');
    if (!auth.ok) return auth.response;

    const body = await request.json();
    const { id, username, name, role, password, salary, lastPaid, joinDate, leftDate, monthlyBaseSalaries, monthlyPaidSalaries } = body;

    if (id) {
      const users = await getUsers();
      const existingUser = users.find((u) => u.id === id);
      if (!existingUser) {
        return errorResponse('User not found', 404);
      }

      const salaryChanging =
        salary !== undefined && Number(salary) !== existingUser.salary;
      const monthlySalariesChanging =
        monthlyBaseSalaries !== undefined &&
        JSON.stringify(monthlyBaseSalaries) !== JSON.stringify(existingUser.monthlyBaseSalaries);

      if (salaryChanging || monthlySalariesChanging) {
        if (!(await checkSessionPermission(auth.session, 'allowManagerSalaryChange'))) {
          return errorResponse('Forbidden: Salary changes are restricted by administrator policy.', 403);
        }
      }

      const updatedUser = await saveUser({
        ...existingUser,
        username: username || existingUser.username,
        name: name || existingUser.name,
        role: role || existingUser.role,
        ...(password ? { password } : {}),
        salary: salary !== undefined ? Number(salary) : existingUser.salary,
        lastPaid: lastPaid !== undefined ? lastPaid : existingUser.lastPaid,
        joinDate: joinDate !== undefined ? joinDate : existingUser.joinDate,
        leftDate: leftDate !== undefined ? leftDate : existingUser.leftDate,
        monthlyBaseSalaries: monthlyBaseSalaries !== undefined ? monthlyBaseSalaries : existingUser.monthlyBaseSalaries,
        monthlyPaidSalaries: monthlyPaidSalaries !== undefined ? monthlyPaidSalaries : (existingUser.monthlyPaidSalaries || undefined),
      });

      const { password: _, ...safeUser } = updatedUser;
      const details = buildUpdateDetails(
        existingUser as unknown as Record<string, unknown>,
        updatedUser as unknown as Record<string, unknown>,
        ['username', 'name', 'role', 'salary', 'lastPaid', 'joinDate', 'leftDate']
      );
      await recordAudit({
        request,
        action: 'UPDATE',
        entityType: 'user',
        entityId: updatedUser.id,
        entityLabel: updatedUser.name,
        summary: `Updated user "${updatedUser.name}"`,
        details: Object.keys(details).length ? details : undefined,
      });
      return jsonResponse(safeUser);
    }

    if (!username || !name || !role || !password) {
      return errorResponse('All fields are required', 400);
    }

    if (salary !== undefined || monthlyBaseSalaries !== undefined) {
      if (!(await checkSessionPermission(auth.session, 'allowManagerSalaryChange'))) {
        return errorResponse('Forbidden: Salary changes are restricted by administrator policy.', 403);
      }
    }

    const users = await getUsers();
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return errorResponse('Username already exists', 400);
    }

    const newUser = await saveUser({
      id: '',
      username,
      name,
      role,
      password,
      salary: salary ? Number(salary) : 35000,
      lastPaid: lastPaid || '',
      joinDate: joinDate || new Date().toISOString().split('T')[0],
      monthlyBaseSalaries: monthlyBaseSalaries || {},
      monthlyPaidSalaries: monthlyPaidSalaries || {},
    });

    const { password: _, ...safeUser } = newUser;
    await recordAudit({
      request,
      action: 'CREATE',
      entityType: 'user',
      entityId: newUser.id,
      entityLabel: newUser.name,
      summary: `Created user "${newUser.name}" (${newUser.role})`,
    });
    return jsonResponse(safeUser);
  } catch {
    return errorResponse('Failed to save or update user', 500);
  }
}
