/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { User } from '@/lib/types';

export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function isDeparted(user: User): boolean {
  return !!user.leftDate && user.leftDate <= todayISO();
}

/** joinDate month = first eligible payroll month */
export function isStaffActiveForMonth(user: User, monthYYYYMM: string): boolean {
  if (user.role === 'admin') return false;
  if (!user.joinDate) return false;
  if (user.joinDate.substring(0, 7) > monthYYYYMM) return false;
  if (user.leftDate && user.leftDate.substring(0, 7) < monthYYYYMM) return false;
  return true;
}

export function getSalaryStartMonth(user: User): string | null {
  return user.joinDate ? user.joinDate.substring(0, 7) : null;
}

export function joinedInMonth(user: User, monthYYYYMM: string): boolean {
  return !!user.joinDate && user.joinDate.substring(0, 7) === monthYYYYMM;
}
