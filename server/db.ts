/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma } from './prisma';
import { DEFAULT_SETTINGS } from '../prisma/defaults';
import { User, Room, Guest, Food, Bill, Expense, SystemSettings, FrontdeskMemo, ClosedMonth, AuditLog, AuditAction } from '../src/types';
import type { User as PrismaUser, Prisma } from '@prisma/client';

function mapUser(user: PrismaUser): User {
  return {
    ...user,
    monthlyBaseSalaries: user.monthlyBaseSalaries as Record<string, number> | undefined,
  };
}

export async function initializeDatabase() {
  const connectionString = process.env.DATABASE_URL || process.env.MONGODB_URI;
  if (!connectionString) {
    throw new Error(
      'DATABASE_URL is required. Set it in .env to your MongoDB Atlas connection string.'
    );
  }

  await prisma.$connect();
  console.log('Prisma connected to MongoDB.');

  const userCount = await prisma.user.count();
  if (userCount === 0) {
    console.log('Database is empty. Run `npm run db:seed` to seed initial data.');
  }
}

// ==========================================
// USERS
// ==========================================

export async function getUsers(): Promise<User[]> {
  const users = await prisma.user.findMany();
  const mapped = users.map(mapUser);
  const byUsername = new Map<string, User>();

  for (const user of mapped) {
    const key = user.username.toLowerCase();
    const existing = byUsername.get(key);
    if (!existing) {
      byUsername.set(key, user);
      continue;
    }
    const userScore = (user.joinDate ? 2 : 0) + (user.leftDate ? 1 : 0);
    const existingScore = (existing.joinDate ? 2 : 0) + (existing.leftDate ? 1 : 0);
    if (userScore >= existingScore) {
      byUsername.set(key, user);
    }
  }

  return Array.from(byUsername.values());
}

export async function saveUser(user: User): Promise<User> {
  const newUser = { ...user };
  if (!newUser.id) {
    newUser.id = 'user_' + Math.random().toString(36).substr(2, 9);
  }

  return mapUser(
    await prisma.user.upsert({
      where: { id: newUser.id },
      create: {
        id: newUser.id,
        username: newUser.username,
        name: newUser.name,
        role: newUser.role,
        password: newUser.password ?? '',
        salary: newUser.salary,
        lastPaid: newUser.lastPaid,
        joinDate: newUser.joinDate,
        leftDate: newUser.leftDate,
        monthlyBaseSalaries: newUser.monthlyBaseSalaries ?? undefined,
      },
      update: {
        username: newUser.username,
        name: newUser.name,
        role: newUser.role,
        password: newUser.password ?? '',
        salary: newUser.salary,
        lastPaid: newUser.lastPaid,
        joinDate: newUser.joinDate,
        leftDate: newUser.leftDate,
        monthlyBaseSalaries: newUser.monthlyBaseSalaries ?? undefined,
      },
    })
  );
}

export async function deleteUser(id: string): Promise<boolean> {
  try {
    await prisma.user.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// ROOMS
// ==========================================

export async function getRooms(): Promise<Room[]> {
  return prisma.room.findMany();
}

export async function saveRoom(room: Room): Promise<Room> {
  const newRoom = { ...room };
  if (!newRoom.id) {
    newRoom.id = 'room_' + Math.random().toString(36).substr(2, 9);
  }

  return prisma.room.upsert({
    where: { id: newRoom.id },
    create: {
      id: newRoom.id,
      roomNumber: newRoom.roomNumber,
      roomType: newRoom.roomType,
      price: newRoom.price,
      status: newRoom.status,
    },
    update: {
      roomNumber: newRoom.roomNumber,
      roomType: newRoom.roomType,
      price: newRoom.price,
      status: newRoom.status,
    },
  });
}

export async function deleteRoom(id: string): Promise<boolean> {
  try {
    await prisma.room.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// GUESTS
// ==========================================

export async function getGuests(): Promise<Guest[]> {
  return prisma.guest.findMany();
}

export async function saveGuest(guest: Guest): Promise<Guest> {
  const newGuest = { ...guest };
  if (!newGuest.id) {
    newGuest.id = 'guest_' + Math.random().toString(36).substr(2, 9);
  }

  return prisma.guest.upsert({
    where: { id: newGuest.id },
    create: { ...newGuest },
    update: {
      name: newGuest.name,
      phone: newGuest.phone,
      nic: newGuest.nic,
      address: newGuest.address,
      checkInDate: newGuest.checkInDate,
      checkOutDate: newGuest.checkOutDate,
    },
  });
}

// ==========================================
// FOODS
// ==========================================

export async function getFoods(): Promise<Food[]> {
  return prisma.food.findMany();
}

export async function saveFood(food: Food): Promise<Food> {
  const newFood = { ...food };
  if (!newFood.id) {
    newFood.id = 'food_' + Math.random().toString(36).substr(2, 9);
  }

  return prisma.food.upsert({
    where: { id: newFood.id },
    create: {
      id: newFood.id,
      foodName: newFood.foodName,
      category: newFood.category,
      price: newFood.price,
    },
    update: {
      foodName: newFood.foodName,
      category: newFood.category,
      price: newFood.price,
    },
  });
}

export async function deleteFood(id: string): Promise<boolean> {
  try {
    await prisma.food.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// BILLS
// ==========================================

export async function getBills(): Promise<Bill[]> {
  return prisma.bill.findMany() as Promise<Bill[]>;
}

export async function saveBill(bill: Bill): Promise<Bill> {
  const newBill = { ...bill };
  if (!newBill.id) {
    const bills = await prisma.bill.findMany({ select: { id: true } });
    let maxNum = 0;
    for (const b of bills) {
      if (b.id && b.id.startsWith('bill_')) {
        const suffix = b.id.slice(5);
        const num = parseInt(suffix, 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    const nextNum = maxNum + 1;
    newBill.id = 'bill_' + String(nextNum).padStart(6, '0');
  }
  newBill.updatedAt = new Date().toISOString();

  const rooms = await getRooms();
  for (const rItem of newBill.roomItems) {
    const room = rooms.find((rm) => rm.id === rItem.roomId);
    if (room) {
      const targetStatus = newBill.status === 'Completed' ? 'Available' : 'Occupied';
      if (room.status !== targetStatus) {
        room.status = targetStatus;
        await saveRoom(room);
      }
    }
  }

  return prisma.bill.upsert({
    where: { id: newBill.id },
    create: {
      id: newBill.id,
      guestId: newBill.guestId,
      guestDetails: newBill.guestDetails,
      roomItems: newBill.roomItems,
      foodItems: newBill.foodItems,
      foodSubtotal: newBill.foodSubtotal,
      serviceCharge: newBill.serviceCharge,
      roomSubtotal: newBill.roomSubtotal,
      totalAmount: newBill.totalAmount,
      status: newBill.status,
      createdAt: newBill.createdAt,
      updatedAt: newBill.updatedAt,
    },
    update: {
      guestId: newBill.guestId,
      guestDetails: newBill.guestDetails,
      roomItems: newBill.roomItems,
      foodItems: newBill.foodItems,
      foodSubtotal: newBill.foodSubtotal,
      serviceCharge: newBill.serviceCharge,
      roomSubtotal: newBill.roomSubtotal,
      totalAmount: newBill.totalAmount,
      status: newBill.status,
      updatedAt: newBill.updatedAt,
    },
  }) as Promise<Bill>;
}

export async function deleteBill(id: string): Promise<boolean> {
  const bill = await prisma.bill.findUnique({ where: { id } });
  if (!bill) return false;

  if (bill.status === 'Active') {
    const rooms = await getRooms();
    for (const rItem of bill.roomItems) {
      const room = rooms.find((rm) => rm.id === rItem.roomId);
      if (room && room.status === 'Occupied') {
        room.status = 'Available';
        await saveRoom(room);
      }
    }
  }

  try {
    await prisma.bill.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// EXPENSES
// ==========================================

export async function getExpenses(): Promise<Expense[]> {
  return prisma.expense.findMany();
}

export async function saveExpense(expense: Expense): Promise<Expense> {
  const newExpense = { ...expense };
  if (!newExpense.id) {
    newExpense.id = 'exp_' + Math.random().toString(36).substr(2, 9);
  }

  return prisma.expense.upsert({
    where: { id: newExpense.id },
    create: {
      id: newExpense.id,
      title: newExpense.title,
      amount: newExpense.amount,
      category: newExpense.category,
      date: newExpense.date,
      description: newExpense.description,
      approvedBy: newExpense.approvedBy,
      paymentMethod: newExpense.paymentMethod,
    },
    update: {
      title: newExpense.title,
      amount: newExpense.amount,
      category: newExpense.category,
      date: newExpense.date,
      description: newExpense.description,
      approvedBy: newExpense.approvedBy,
      paymentMethod: newExpense.paymentMethod,
    },
  });
}

export async function deleteExpense(id: string): Promise<boolean> {
  try {
    await prisma.expense.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// SETTINGS
// ==========================================

export async function getSettings(): Promise<SystemSettings> {
  const dbSettings = await prisma.settings.findUnique({ where: { id: 'system_settings' } });
  if (!dbSettings) {
    const { id: _, ...defaults } = DEFAULT_SETTINGS;
    return { ...defaults } as SystemSettings;
  }

  const { id: _id, ...safeSettings } = dbSettings;
  return { ...DEFAULT_SETTINGS, ...safeSettings } as SystemSettings;
}

export async function saveSettings(settings: SystemSettings): Promise<SystemSettings> {
  const settingsToSave = { ...settings, id: 'system_settings' };

  await prisma.settings.upsert({
    where: { id: 'system_settings' },
    create: settingsToSave,
    update: settingsToSave,
  });

  return settings;
}

// ==========================================
// MEMOS
// ==========================================

export async function getMemos(): Promise<FrontdeskMemo[]> {
  return prisma.memo.findMany() as Promise<FrontdeskMemo[]>;
}

export async function saveMemo(memo: FrontdeskMemo): Promise<FrontdeskMemo> {
  const newMemo = { ...memo };
  if (!newMemo.id) {
    newMemo.id = 'memo_' + Math.random().toString(36).substr(2, 9);
  }

  return prisma.memo.upsert({
    where: { id: newMemo.id },
    create: {
      id: newMemo.id,
      content: newMemo.content,
      authorName: newMemo.authorName,
      authorRole: newMemo.authorRole,
      type: newMemo.type,
      resolved: newMemo.resolved,
      resolvedBy: newMemo.resolvedBy,
      createdAt: newMemo.createdAt,
      updatedAt: newMemo.updatedAt,
    },
    update: {
      content: newMemo.content,
      authorName: newMemo.authorName,
      authorRole: newMemo.authorRole,
      type: newMemo.type,
      resolved: newMemo.resolved,
      resolvedBy: newMemo.resolvedBy,
      updatedAt: newMemo.updatedAt,
    },
  }) as Promise<FrontdeskMemo>;
}

export async function deleteMemo(id: string): Promise<boolean> {
  try {
    await prisma.memo.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// CLOSED MONTHS
// ==========================================

export async function getClosedMonths(): Promise<ClosedMonth[]> {
  return prisma.closedMonth.findMany();
}

export async function saveClosedMonth(closedMonth: ClosedMonth): Promise<ClosedMonth> {
  const newMonth = { ...closedMonth };
  if (!newMonth.id) {
    const list = await prisma.closedMonth.findMany({ select: { id: true } });
    let maxNum = 0;
    for (const item of list) {
      if (item.id && item.id.startsWith('close_')) {
        const num = parseInt(item.id.slice(6), 10);
        if (!isNaN(num) && num > maxNum) {
          maxNum = num;
        }
      }
    }
    const nextNum = maxNum + 1;
    newMonth.id = 'close_' + String(nextNum).padStart(6, '0');
  }

  return prisma.closedMonth.upsert({
    where: { id: newMonth.id },
    create: {
      id: newMonth.id,
      month: newMonth.month,
      totalRevenue: newMonth.totalRevenue,
      totalExpenses: newMonth.totalExpenses,
      netProfit: newMonth.netProfit,
      ownerTakeaway: newMonth.ownerTakeaway,
      retainedEarnings: newMonth.retainedEarnings,
      closedAt: newMonth.closedAt,
      closedBy: newMonth.closedBy,
      notes: newMonth.notes,
    },
    update: {
      month: newMonth.month,
      totalRevenue: newMonth.totalRevenue,
      totalExpenses: newMonth.totalExpenses,
      netProfit: newMonth.netProfit,
      ownerTakeaway: newMonth.ownerTakeaway,
      retainedEarnings: newMonth.retainedEarnings,
      closedAt: newMonth.closedAt,
      closedBy: newMonth.closedBy,
      notes: newMonth.notes,
    },
  });
}

export async function deleteClosedMonth(id: string): Promise<boolean> {
  try {
    await prisma.closedMonth.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

// ==========================================
// AUDIT LOGS
// ==========================================

export async function createAuditLog(entry: {
  action: AuditAction;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  actorUserId: string;
  actorName: string;
  actorRole: string;
  summary: string;
  details?: Record<string, unknown>;
}): Promise<AuditLog> {
  const existing = await prisma.auditLog.findMany({ select: { id: true } });
  let maxNum = 0;
  for (const item of existing) {
    if (item.id && item.id.startsWith('audit_')) {
      const num = parseInt(item.id.slice(6), 10);
      if (!isNaN(num) && num > maxNum) maxNum = num;
    }
  }
  const id = 'audit_' + String(maxNum + 1).padStart(6, '0');

  const created = await prisma.auditLog.create({
    data: {
      id,
      action: entry.action,
      entityType: entry.entityType,
      entityId: entry.entityId,
      entityLabel: entry.entityLabel,
      actorUserId: entry.actorUserId,
      actorName: entry.actorName,
      actorRole: entry.actorRole,
      timestamp: new Date().toISOString(),
      summary: entry.summary,
      details: entry.details ? (entry.details as Prisma.InputJsonValue) : undefined,
    },
  });

  return {
    ...created,
    details: created.details as Record<string, unknown> | undefined,
  };
}

export async function queryAuditLogs(filters: {
  limit?: number;
  offset?: number;
  entityType?: string;
  actorUserId?: string;
  from?: string;
  to?: string;
}): Promise<AuditLog[]> {
  const where: Record<string, unknown> = {};
  if (filters.entityType) where.entityType = filters.entityType;
  if (filters.actorUserId) where.actorUserId = filters.actorUserId;
  if (filters.from || filters.to) {
    where.timestamp = {};
    if (filters.from) (where.timestamp as Record<string, string>).gte = filters.from;
    if (filters.to) (where.timestamp as Record<string, string>).lte = filters.to + 'T23:59:59.999Z';
  }

  const logs = await prisma.auditLog.findMany({
    where,
    orderBy: { timestamp: 'desc' },
    take: filters.limit ?? 100,
    skip: filters.offset ?? 0,
  });

  return logs.map((log) => ({
    ...log,
    details: log.details as Record<string, unknown> | undefined,
  }));
}
