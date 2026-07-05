/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { SystemSettings, UserRole } from '@/lib/types';

export type PermissionCategory = 'Room' | 'Food' | 'Report' | 'Staff' | 'Expenses';

export type PermissionKey = {
  [K in keyof SystemSettings]: SystemSettings[K] extends boolean
    ? K extends `allow${string}`
      ? K
      : never
    : never;
}[keyof SystemSettings];

export interface PermissionDef {
  key: PermissionKey;
  title: string;
  description: string;
  role: 'receptionist' | 'manager';
  category: PermissionCategory;
  sensitive?: boolean;
}

/** Manager permissions that default false and require explicit opt-in. */
const MANAGER_OPT_IN: ReadonlySet<PermissionKey> = new Set(['allowManagerDeleteExpenses']);

export const PERMISSION_KEYS: PermissionKey[] = [
  'allowReceptionistModifyPrice',
  'allowReceptionistAddRooms',
  'allowReceptionistEditRooms',
  'allowReceptionistDeleteRooms',
  'allowManagerManageRooms',
  'allowManagerAddRooms',
  'allowManagerEditRooms',
  'allowManagerDeleteRooms',
  'allowReceptionistAddFoods',
  'allowReceptionistEditFoods',
  'allowReceptionistDeleteFoods',
  'allowManagerAddFoods',
  'allowManagerEditFoods',
  'allowManagerDeleteFoods',
  'allowManagerViewReports',
  'allowReceptionistManageGuests',
  'allowManagerSalaryChange',
  'allowManagerUserEdit',
  'allowReceptionistDelete',
  'allowReceptionistDiscount',
  'allowReceptionistAddExpenses',
  'allowManagerDeleteExpenses',
];

export const permissionDefinitions: PermissionDef[] = [
  {
    key: 'allowReceptionistModifyPrice',
    title: 'Override Base Room Prices',
    description: 'Allow frontdesk receptionists to change base prices dynamically per stay room.',
    role: 'receptionist',
    category: 'Room',
    sensitive: true,
  },
  {
    key: 'allowReceptionistAddRooms',
    title: 'Register New Guest Rooms',
    description: 'Enable clerk credentials to write new items into the room master inventory.',
    role: 'receptionist',
    category: 'Room',
  },
  {
    key: 'allowReceptionistEditRooms',
    title: 'Modify Existing Room Profiles',
    description: 'Enable clerk credentials to edit price points and attributes of active rooms.',
    role: 'receptionist',
    category: 'Room',
  },
  {
    key: 'allowReceptionistDeleteRooms',
    title: 'Permanently Decommission Rooms',
    description: 'Erase inactive or retired hotel room records entirely from database logs.',
    role: 'receptionist',
    category: 'Room',
    sensitive: true,
  },
  {
    key: 'allowManagerManageRooms',
    title: 'Open Rooms Configuration Module',
    description: 'Grant manager accounts authorization to inspect configurations and inventory stock.',
    role: 'manager',
    category: 'Room',
  },
  {
    key: 'allowManagerAddRooms',
    title: 'Manager: Register Guest Rooms',
    description: 'Let managers create, price, and publish brand-new room units to receptionist tools.',
    role: 'manager',
    category: 'Room',
  },
  {
    key: 'allowManagerEditRooms',
    title: 'Manager: Edit Room Price/Attributes',
    description: 'Let managers adjust nightly tier values and service configurations of guest rooms.',
    role: 'manager',
    category: 'Room',
  },
  {
    key: 'allowManagerDeleteRooms',
    title: 'Manager: Delete Guest Room Cards',
    description: 'Permit manager accounts to drop or wipe guest room files permanently.',
    role: 'manager',
    category: 'Room',
    sensitive: true,
  },
  {
    key: 'allowReceptionistAddFoods',
    title: 'Add Culinary Menu Items',
    description: 'Allow receptionists to add new items, beverages, or snacks to the live database.',
    role: 'receptionist',
    category: 'Food',
  },
  {
    key: 'allowReceptionistEditFoods',
    title: 'Edit Culinary Descriptions & Rates',
    description: 'Allow receptionists to modify descriptions, tags, and price points of active foods.',
    role: 'receptionist',
    category: 'Food',
  },
  {
    key: 'allowReceptionistDeleteFoods',
    title: 'Wipe Culinary Menu Dishes',
    description: 'Enable receptionist clerks to drop foods or culinary files from order registers.',
    role: 'receptionist',
    category: 'Food',
    sensitive: true,
  },
  {
    key: 'allowManagerAddFoods',
    title: 'Manager: Add Culinary Foods',
    description: 'Enable managers to add new dishes or custom pricing to the kitchen index.',
    role: 'manager',
    category: 'Food',
  },
  {
    key: 'allowManagerEditFoods',
    title: 'Manager: Edit Food Pricing/Details',
    description: 'Permit managers to adjust base metrics, descriptions, or groupings of menu dishes.',
    role: 'manager',
    category: 'Food',
  },
  {
    key: 'allowManagerDeleteFoods',
    title: 'Manager: Delete Food Cards',
    description: 'Permit managers to sweep dishes permanently from restaurant terminal viewports.',
    role: 'manager',
    category: 'Food',
    sensitive: true,
  },
  {
    key: 'allowManagerViewReports',
    title: 'Browse High-Level Financial Turnover',
    description: 'Permit managers to download tax details, inspect profit graphs, and study revenues.',
    role: 'manager',
    category: 'Report',
  },
  {
    key: 'allowReceptionistManageGuests',
    title: 'Modify Guest File Directories',
    description: 'Permit clerk accounts to log, edit, or wipe records from the hotel guest folders.',
    role: 'receptionist',
    category: 'Staff',
  },
  {
    key: 'allowManagerSalaryChange',
    title: 'Update Employee Contract Salaries',
    description: 'Managers can adjust baseline payroll wages of active frontdesk employees.',
    role: 'manager',
    category: 'Staff',
    sensitive: true,
  },
  {
    key: 'allowManagerUserEdit',
    title: 'Register or Wreak Frontdesk Accounts',
    description: 'Managers can create, update, or retire receptionist profiles and passwords.',
    role: 'manager',
    category: 'Staff',
    sensitive: true,
  },
  {
    key: 'allowReceptionistDelete',
    title: 'Void or Delete Transactions',
    description: 'Allow frontdesk receptionists to delete, void, or roll back active room stays.',
    role: 'receptionist',
    category: 'Expenses',
    sensitive: true,
  },
  {
    key: 'allowReceptionistDiscount',
    title: 'Issue Manual Discounts',
    description: 'Allow frontdesk receptionists to specify arbitrary percentage or flat discounts.',
    role: 'receptionist',
    category: 'Expenses',
  },
  {
    key: 'allowReceptionistAddExpenses',
    title: 'Record Outflow Expenses',
    description: 'Permit clerks to submit bills and outlays directly into operating ledger registers.',
    role: 'receptionist',
    category: 'Expenses',
  },
  {
    key: 'allowManagerDeleteExpenses',
    title: 'Liquidate Ledger Outflow Records',
    description: 'Authorize managers to delete historical or erroneous ledger items from system books.',
    role: 'manager',
    category: 'Expenses',
    sensitive: true,
  },
];

export const PERMISSION_CATEGORIES: PermissionCategory[] = [
  'Room',
  'Food',
  'Report',
  'Staff',
  'Expenses',
];

function permissionAppliesToRole(key: PermissionKey, role: UserRole): boolean {
  if (role === 'admin') return true;
  if (role === 'manager') return key.startsWith('allowManager');
  if (role === 'receptionist') return key.startsWith('allowReceptionist');
  return false;
}

export function hasPermission(
  role: UserRole,
  key: PermissionKey,
  settings: SystemSettings | null | undefined
): boolean {
  if (role === 'admin') return true;
  if (!settings || !permissionAppliesToRole(key, role)) return false;

  const value = settings[key];
  if (typeof value !== 'boolean') return false;

  if (role === 'manager') {
    return MANAGER_OPT_IN.has(key) ? value === true : value !== false;
  }

  return value === true;
}

export function getPermissionsForRole(role: 'receptionist' | 'manager'): PermissionDef[] {
  return permissionDefinitions.filter((def) => def.role === role);
}

export function countEnabledPermissions(
  role: 'receptionist' | 'manager',
  settings: SystemSettings
): { enabled: number; total: number } {
  const defs = getPermissionsForRole(role);
  const enabled = defs.filter((def) => settings[def.key] === true).length;
  return { enabled, total: defs.length };
}
