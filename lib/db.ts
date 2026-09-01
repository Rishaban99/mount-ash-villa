/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { prisma } from './prisma';
import { DEFAULT_SETTINGS } from '../prisma/defaults';
import { User, Room, Guest, Food, Bill, Expense, SystemSettings, FrontdeskMemo, ClosedMonth, AuditLog, AuditAction, RoomItem, RoomStatus, PrintLog, GuestFeedback, Attendance } from '@/lib/types';
import type { User as PrismaUser, Prisma } from '@prisma/client';
import { dedupeRoomsByNumber } from '@/lib/rooms';

function mapUser(user: PrismaUser): User {
  return {
    ...user,
    monthlyBaseSalaries: user.monthlyBaseSalaries as Record<string, number> | undefined,
    monthlyPaidSalaries: user.monthlyPaidSalaries as Record<string, any> | undefined,
  };
}

export async function dedupeRoomsInDb() {
  const result = await prisma.$runCommandRaw({
    find: 'rooms',
    filter: {},
  });
  const docs = (result as { cursor?: { firstBatch?: Array<{ _id: unknown; roomNumber: string; status: string }> } })
    .cursor?.firstBatch;
  if (!docs?.length) return;

  const byNumber = new Map<string, typeof docs>();
  for (const doc of docs) {
    const list = byNumber.get(doc.roomNumber) || [];
    list.push(doc);
    byNumber.set(doc.roomNumber, list);
  }

  for (const [, duplicates] of byNumber) {
    if (duplicates.length <= 1) continue;

    const canonical =
      duplicates.find((d) => d.status === 'Occupied') ??
      duplicates.find((d) => typeof d._id === 'object') ??
      duplicates[0];

    const canonicalId = String(canonical._id);
    for (const doc of duplicates) {
      if (String(doc._id) === canonicalId) continue;
      await prisma.$runCommandRaw({
        delete: 'rooms',
        deletes: [{ q: { _id: doc._id as Prisma.InputJsonValue }, limit: 1 }],
      });
    }
  }
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

  await dedupeRoomsInDb();

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
        monthlyPaidSalaries: newUser.monthlyPaidSalaries ?? undefined,
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
        monthlyPaidSalaries: newUser.monthlyPaidSalaries ?? undefined,
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
  const rooms = await prisma.room.findMany();
  return dedupeRoomsByNumber(rooms);
}

async function setRoomStatusByNumber(roomNumber: string, status: RoomStatus) {
  await prisma.room.updateMany({
    where: { roomNumber },
    data: { status },
  });
}

async function normalizeRoomItems(roomItems: RoomItem[]): Promise<RoomItem[]> {
  return Promise.all(
    roomItems.map(async (rItem) => {
      const canonical = await prisma.room.findFirst({
        where: { roomNumber: rItem.roomNumber },
      });
      if (!canonical) return rItem;
      return {
        ...rItem,
        roomId: canonical.id,
        roomNumber: canonical.roomNumber,
        roomType: canonical.roomType as RoomItem['roomType'],
      };
    })
  );
}

export async function saveRoom(room: Room): Promise<Room> {
  const newRoom = { ...room };

  const existing = await prisma.room.findFirst({
    where: { roomNumber: newRoom.roomNumber },
  });

  if (existing) {
    return prisma.room.update({
      where: { id: existing.id },
      data: {
        roomNumber: newRoom.roomNumber,
        roomType: newRoom.roomType,
        price: newRoom.price,
        status: newRoom.status,
      },
    });
  }

  const id = newRoom.id || 'room_' + Math.random().toString(36).substr(2, 9);
  return prisma.room.create({
    data: {
      id,
      roomNumber: newRoom.roomNumber,
      roomType: newRoom.roomType,
      price: newRoom.price,
      status: newRoom.status,
    },
  });
}

export async function deleteRoom(id: string): Promise<boolean> {
  try {
    const room = await prisma.room.findFirst({ where: { id } });
    if (!room) return false;
    await prisma.room.deleteMany({ where: { roomNumber: room.roomNumber } });
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

  const previousBill = await prisma.bill.findUnique({ where: { id: newBill.id } });
  newBill.roomItems = await normalizeRoomItems(newBill.roomItems);

  if (newBill.status === 'DueLater' && !newBill.dueLaterAt) {
    newBill.dueLaterAt = new Date().toISOString();
  }

  // DueLater → Completed (or any update of a departed/settled folio) must not
  // overwrite rooms — a new guest may already occupy them.
  const previousStatus = previousBill?.status;
  const shouldSyncRooms = previousStatus !== 'DueLater' && previousStatus !== 'Completed';

  if (shouldSyncRooms) {
    const targetStatus: RoomStatus =
      newBill.status === 'Active' ? 'Occupied' : 'Available';
    const newRoomNumbers = new Set(newBill.roomItems.map((r) => r.roomNumber));

    if (previousStatus === 'Active' && newBill.status === 'Active') {
      for (const rItem of previousBill!.roomItems) {
        if (!newRoomNumbers.has(rItem.roomNumber)) {
          await setRoomStatusByNumber(rItem.roomNumber, 'Available');
        }
      }
    }

    for (const rItem of newBill.roomItems) {
      await setRoomStatusByNumber(rItem.roomNumber, targetStatus);
    }
  }

  const saved = (await prisma.bill.upsert({
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
      status: newBill.status as any,
      dueLaterNote: newBill.dueLaterNote,
      dueLaterAt: newBill.dueLaterAt,
      advancePaidAmount: newBill.advancePaidAmount ?? 0,
      createdAt: newBill.createdAt,
      updatedAt: newBill.updatedAt,
    } as any,
    update: {
      guestId: newBill.guestId,
      guestDetails: newBill.guestDetails,
      roomItems: newBill.roomItems,
      foodItems: newBill.foodItems,
      foodSubtotal: newBill.foodSubtotal,
      serviceCharge: newBill.serviceCharge,
      roomSubtotal: newBill.roomSubtotal,
      totalAmount: newBill.totalAmount,
      status: newBill.status as any,
      dueLaterNote: newBill.dueLaterNote,
      dueLaterAt: newBill.dueLaterAt,
      advancePaidAmount: newBill.advancePaidAmount ?? 0,
      updatedAt: newBill.updatedAt,
    } as any,
  })) as Bill;

  await dedupeRoomsInDb();
  return saved;
}

export async function deleteBill(id: string): Promise<boolean> {
  const bill = await prisma.bill.findUnique({ where: { id } });
  if (!bill) return false;

  if (bill.status === 'Active') {
    for (const rItem of bill.roomItems) {
      await setRoomStatusByNumber(rItem.roomNumber, 'Available');
    }
  }

  try {
    await prisma.bill.delete({ where: { id } });
    await dedupeRoomsInDb();
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
    return { ...DEFAULT_SETTINGS };
  }

  const { id: _id, ...safeSettings } = dbSettings;
  return { ...DEFAULT_SETTINGS, ...safeSettings } as SystemSettings;
}

export async function saveSettings(settings: SystemSettings): Promise<SystemSettings> {
  const { id, ...settingsData } = settings as SystemSettings & { id?: string };

  const payload: Record<string, any> = { ...settingsData };

  // Attempt upsert with automatic stripping of any client-unrecognized fields
  let maxRetries = 10;
  while (maxRetries > 0) {
    try {
      await prisma.settings.upsert({
        where: { id: 'system_settings' },
        create: {
          ...payload,
          id: 'system_settings',
        } as any,
        update: payload,
      });
      break;
    } catch (err: any) {
      if (err?.message?.includes('Unknown argument')) {
        const match = err.message.match(/Unknown argument `([^`]+)`/);
        if (match && match[1] && match[1] in payload) {
          delete payload[match[1]];
          maxRetries--;
          continue;
        }
      }
      throw err;
    }
  }

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

// ==========================================
// PRINT LOGS
// ==========================================

export async function getPrintLogs(billId?: string): Promise<PrintLog[]> {
  const where = billId ? { billId } : {};
  return prisma.printLog.findMany({
    where,
    orderBy: { printedAt: 'desc' },
  });
}

export async function savePrintLog(log: Omit<PrintLog, 'id'>): Promise<PrintLog> {
  const id = 'print_' + Math.random().toString(36).substr(2, 9);
  return prisma.printLog.create({
    data: {
      id,
      ...log,
    },
  });
}

// ==========================================
// GUEST FEEDBACK
// ==========================================

export async function getGuestFeedbacks(): Promise<GuestFeedback[]> {
  // @ts-ignore - dynamic model added
  // @ts-ignore - when using the dynamic client, fallback to raw commands
  if (!prisma.guestFeedback) {
    try {
      const result = await prisma.$runCommandRaw({
        find: 'guest_feedbacks',
        filter: {},
        sort: { createdAt: -1 }
      });
      const docs = (result as any)?.cursor?.firstBatch || [];
      return docs.map((doc: any) => ({
        id: String(doc._id),
        roomNumber: doc.roomNumber,
        guestName: doc.guestName,
        rating: doc.rating,
        category: doc.category,
        message: doc.message,
        isRead: Boolean(doc.isRead),
        createdAt: doc.createdAt
      }));
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Fallback $runCommandRaw failed for guest feedbacks', err);
      return [];
    }
  }

  try {
    // @ts-ignore
    return await prisma.guestFeedback.findMany({
      orderBy: { createdAt: 'desc' },
    });
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error('prisma.guestFeedback.findMany failed', err);
    throw err;
  }
}

export async function saveGuestFeedback(feedback: Omit<GuestFeedback, 'id' | 'isRead' | 'createdAt'>): Promise<GuestFeedback> {
  const id = 'fb_' + Math.random().toString(36).substr(2, 9);
  const now = new Date().toISOString();
  const newFeedback = {
    id,
    roomNumber: feedback.roomNumber,
    guestName: feedback.guestName || 'Guest',
    rating: feedback.rating,
    category: feedback.category || '',
    message: feedback.message || '',
    isRead: false,
    createdAt: now,
  };

  // @ts-ignore
  if (!prisma.guestFeedback) {
    await prisma.$runCommandRaw({
      insert: 'guest_feedbacks',
      documents: [{
        _id: id,
        ...newFeedback
      }]
    });
    return newFeedback;
  }
  // @ts-ignore
  return prisma.guestFeedback.create({
    data: newFeedback,
  });
}

export async function markGuestFeedbackAsRead(id: string): Promise<void> {
  // @ts-ignore
  if (!prisma.guestFeedback) {
    await prisma.$runCommandRaw({
      update: 'guest_feedbacks',
      updates: [{
        q: { _id: id },
        u: { $set: { isRead: true } }
      }]
    });
    return;
  }
  // @ts-ignore
  await prisma.guestFeedback.update({
    where: { id },
    data: { isRead: true }
  });
}

// ==========================================
// ATTENDANCE
// ==========================================

export async function getAttendanceRecords(filters?: {
  date?: string;
  month?: string; // YYYY-MM
  userId?: string;
}): Promise<Attendance[]> {
  // @ts-ignore
  if (!prisma.attendance) {
    const queryFilter: Record<string, any> = {};
    if (filters?.date) {
      queryFilter.date = filters.date;
    } else if (filters?.month) {
      queryFilter.date = { $regex: `^${filters.month}` };
    }
    if (filters?.userId) {
      queryFilter.userId = filters.userId;
    }

    const result = await prisma.$runCommandRaw({
      find: 'attendances',
      filter: queryFilter,
      sort: { date: -1 }
    });
    const docs = (result as any)?.cursor?.firstBatch || [];
    return docs.map((doc: any) => ({
      id: String(doc._id),
      userId: doc.userId,
      userName: doc.userName,
      userRole: doc.userRole,
      date: doc.date,
      checkIn: doc.checkIn,
      checkOut: doc.checkOut,
      status: doc.status,
      shift: doc.shift,
      workHours: doc.workHours,
      overtimeHours: doc.overtimeHours,
      notes: doc.notes,
      recordedBy: doc.recordedBy,
      createdAt: doc.createdAt,
      updatedAt: doc.updatedAt,
    }));
  }

  const where: any = {};
  if (filters?.date) {
    where.date = filters.date;
  } else if (filters?.month) {
    where.date = { startsWith: filters.month };
  }
  if (filters?.userId) {
    where.userId = filters.userId;
  }

  // @ts-ignore
  const records = await prisma.attendance.findMany({
    where,
    orderBy: { date: 'desc' },
  });

  return records as Attendance[];
}

export async function saveAttendanceRecord(record: Partial<Attendance> & { userId: string; date: string }): Promise<Attendance> {
  const existingRecords = await getAttendanceRecords({ date: record.date, userId: record.userId });
  const existing = existingRecords[0];

  const now = new Date().toISOString();
  const id = record.id || existing?.id || 'att_' + Math.random().toString(36).substr(2, 9);

  const payload: Attendance = {
    id,
    userId: record.userId,
    userName: record.userName || existing?.userName || 'Staff Member',
    userRole: record.userRole || existing?.userRole || 'staff',
    date: record.date,
    checkIn: record.checkIn !== undefined ? record.checkIn : existing?.checkIn,
    checkOut: record.checkOut !== undefined ? record.checkOut : existing?.checkOut,
    status: record.status || existing?.status || 'Present',
    shift: record.shift || existing?.shift || 'Full Day',
    workHours: record.workHours !== undefined ? record.workHours : existing?.workHours,
    overtimeHours: record.overtimeHours !== undefined ? record.overtimeHours : existing?.overtimeHours,
    notes: record.notes !== undefined ? record.notes : existing?.notes,
    recordedBy: record.recordedBy || existing?.recordedBy || 'System',
    createdAt: existing?.createdAt || now,
    updatedAt: now,
  };

  // Calculate work hours if checkIn and checkOut exist and workHours wasn't explicitly supplied
  if (payload.checkIn && payload.checkOut && payload.workHours === undefined) {
    try {
      const [inH, inM] = payload.checkIn.split(':').map(Number);
      const [outH, outM] = payload.checkOut.split(':').map(Number);
      if (!isNaN(inH) && !isNaN(inM) && !isNaN(outH) && !isNaN(outM)) {
        let diffMinutes = (outH * 60 + outM) - (inH * 60 + inM);
        if (diffMinutes < 0) diffMinutes += 24 * 60; // Overnight shift
        payload.workHours = Math.round((diffMinutes / 60) * 10) / 10;
      }
    } catch {}
  }

  // @ts-ignore
  if (!prisma.attendance) {
    await prisma.$runCommandRaw({
      update: 'attendances',
      updates: [{
        q: { _id: id },
        u: { $set: payload as any },
        upsert: true
      }]
    });
    return payload;
  }

  const { id: _unused, ...updatePayload } = payload;

  // @ts-ignore
  return prisma.attendance.upsert({
    where: { id },
    create: payload,
    update: updatePayload,
  }) as Promise<Attendance>;
}

export async function deleteAttendanceRecord(id: string): Promise<boolean> {
  try {
    // @ts-ignore
    if (!prisma.attendance) {
      await prisma.$runCommandRaw({
        delete: 'attendances',
        deletes: [{ q: { _id: id }, limit: 1 }]
      });
      return true;
    }
    // @ts-ignore
    await prisma.attendance.delete({ where: { id } });
    return true;
  } catch {
    return false;
  }
}

