/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import 'dotenv/config';
import express from 'express';
import path from 'path';
import {
  initializeDatabase,
  getUsers,
  saveUser,
  deleteUser,
  getRooms,
  saveRoom,
  deleteRoom,
  getGuests,
  saveGuest,
  getFoods,
  saveFood,
  deleteFood,
  getBills,
  saveBill,
  deleteBill,
  getExpenses,
  saveExpense,
  deleteExpense,
  getSettings,
  saveSettings,
  getMemos,
  saveMemo,
  deleteMemo,
  getClosedMonths,
  saveClosedMonth,
  deleteClosedMonth,
  createAuditLog,
} from './server/db';
import { prisma } from './server/prisma';
import { recordAudit, resolveActor, buildUpdateDetails, getAuditLogs } from './server/auditLog';
import { User, Room, Guest, Food, Bill, DashboardStats, Expense, FrontdeskMemo, ClosedMonth } from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json());

// Vercel: connect to the database before handling any request.
let dbInitPromise: Promise<void> | undefined;
if (process.env.VERCEL) {
  app.use(async (_req, res, next) => {
    try {
      if (!dbInitPromise) dbInitPromise = initializeDatabase();
      await dbInitPromise;
      next();
    } catch (err) {
      console.error('Database initialization failed:', err);
      res.status(503).json({
        error: 'Service unavailable. Check that DATABASE_URL is set in Vercel environment variables.',
      });
    }
  });
}

// API Routes

// HELPER: Date comparison for "today" in local timezone
function isToday(dateString: string) {
  try {
    const d = new Date(dateString);
    const today = new Date();
    return (
      d.getDate() === today.getDate() &&
      d.getMonth() === today.getMonth() &&
      d.getFullYear() === today.getFullYear()
    );
  } catch (e) {
    return false;
  }
}

// 1. Authentication
app.post('/api/auth/login', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  try {
    const users = await getUsers();
    const user = users.find(
      (u) => u.username.toLowerCase() === username.toLowerCase() && u.password === password
    );

    if (!user) {
      return res.status(401).json({ error: 'Invalid username or password' });
    }

    const today = new Date().toISOString().split('T')[0];
    if (user.leftDate && user.leftDate <= today) {
      return res.status(403).json({ error: 'This account is no longer active.' });
    }

    // Omit password in response
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
    res.json({ success: true, user: userWithoutPassword });
  } catch (error) {
    res.status(500).json({ error: 'Internal server error during login' });
  }
});

// Manage Receptionist Accounts (Super Admin only - validated on frontend, but we support CRUD here)
app.get('/api/users', async (req, res) => {
  try {
    const users = await getUsers();
    const safeUsers = users.map(({ password, ...u }) => u);
    res.json(safeUsers);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.post('/api/users', async (req, res) => {
  try {
    const { id, username, name, role, password, salary, lastPaid, joinDate, leftDate, monthlyBaseSalaries } = req.body;

    if (id) {
      // It's a user update/edit
      const users = await getUsers();
      const existingUser = users.find((u) => u.id === id);
      if (!existingUser) {
        return res.status(404).json({ error: 'User not found' });
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
      });

      const { password: _, ...safeUser } = updatedUser;
      const details = buildUpdateDetails(
        existingUser as unknown as Record<string, unknown>,
        updatedUser as unknown as Record<string, unknown>,
        ['username', 'name', 'role', 'salary', 'lastPaid', 'joinDate', 'leftDate']
      );
      await recordAudit({
        req,
        action: 'UPDATE',
        entityType: 'user',
        entityId: updatedUser.id,
        entityLabel: updatedUser.name,
        summary: `Updated user "${updatedUser.name}"`,
        details: Object.keys(details).length ? details : undefined,
      });
      return res.json(safeUser);
    }

    // It's a new user creation
    if (!username || !name || !role || !password) {
      return res.status(400).json({ error: 'All fields are required' });
    }

    const users = await getUsers();
    if (users.some((u) => u.username.toLowerCase() === username.toLowerCase())) {
      return res.status(400).json({ error: 'Username already exists' });
    }

    const newUser = await saveUser({
      id: '',
      username,
      name,
      role,
      password,
      salary: salary ? Number(salary) : 35000, // Default seed salary if not set
      lastPaid: lastPaid || '',
      joinDate: joinDate || new Date().toISOString().split('T')[0],
      monthlyBaseSalaries: monthlyBaseSalaries || {},
    });

    const { password: _, ...safeUser } = newUser;
    await recordAudit({
      req,
      action: 'CREATE',
      entityType: 'user',
      entityId: newUser.id,
      entityLabel: newUser.name,
      summary: `Created user "${newUser.name}" (${newUser.role})`,
    });
    res.json(safeUser);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save or update user' });
  }
});

app.delete('/api/users/:id', async (req, res) => {
  try {
    const users = await getUsers();
    const existing = users.find((u) => u.id === req.params.id);
    const success = await deleteUser(req.params.id);
    if (success) {
      await recordAudit({
        req,
        action: 'DELETE',
        entityType: 'user',
        entityId: req.params.id,
        entityLabel: existing?.name,
        summary: `Deleted user "${existing?.name ?? req.params.id}"`,
      });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'User not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

// 2. Room Management
app.get('/api/rooms', async (req, res) => {
  try {
    const rooms = await getRooms();
    res.json(rooms);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch rooms' });
  }
});

app.post('/api/rooms', async (req, res) => {
  try {
    const { id, roomNumber, roomType, price, status } = req.body;
    if (!roomNumber || !roomType || !price || !status) {
      return res.status(400).json({ error: 'All room fields are required' });
    }

    // Check if room number already exists (excluding current ID for edits)
    const rooms = await getRooms();
    if (rooms.some((r) => r.roomNumber === roomNumber && r.id !== id)) {
      return res.status(400).json({ error: 'Room number already exists' });
    }

    const existingRoom = id ? rooms.find((r) => r.id === id) : undefined;
    const updatedRoom = await saveRoom({
      id: id || '',
      roomNumber,
      roomType,
      price: Number(price),
      status,
    });
    await recordAudit({
      req,
      action: existingRoom ? 'UPDATE' : 'CREATE',
      entityType: 'room',
      entityId: updatedRoom.id,
      entityLabel: `Room ${updatedRoom.roomNumber}`,
      summary: existingRoom
        ? `Updated Room ${updatedRoom.roomNumber}`
        : `Created Room ${updatedRoom.roomNumber}`,
      details: existingRoom
        ? buildUpdateDetails(
            existingRoom as unknown as Record<string, unknown>,
            updatedRoom as unknown as Record<string, unknown>,
            ['roomNumber', 'roomType', 'price', 'status']
          )
        : undefined,
    });
    res.json(updatedRoom);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save room' });
  }
});

app.delete('/api/rooms/:id', async (req, res) => {
  try {
    const rooms = await getRooms();
    const existing = rooms.find((r) => r.id === req.params.id);
    const success = await deleteRoom(req.params.id);
    if (success) {
      await recordAudit({
        req,
        action: 'DELETE',
        entityType: 'room',
        entityId: req.params.id,
        entityLabel: existing ? `Room ${existing.roomNumber}` : undefined,
        summary: `Deleted Room ${existing?.roomNumber ?? req.params.id}`,
      });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Room not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete room' });
  }
});

// 3. Food Management
app.get('/api/foods', async (req, res) => {
  try {
    const foods = await getFoods();
    res.json(foods);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch foods' });
  }
});

app.post('/api/foods', async (req, res) => {
  try {
    const { id, foodName, category, price } = req.body;
    if (!foodName || !category || !price) {
      return res.status(400).json({ error: 'All food fields are required' });
    }

    const foods = await getFoods();
    const existingFood = id ? foods.find((f) => f.id === id) : undefined;
    const updatedFood = await saveFood({
      id: id || '',
      foodName,
      category,
      price: Number(price),
    });
    await recordAudit({
      req,
      action: existingFood ? 'UPDATE' : 'CREATE',
      entityType: 'food',
      entityId: updatedFood.id,
      entityLabel: updatedFood.foodName,
      summary: existingFood
        ? `Updated food item "${updatedFood.foodName}"`
        : `Created food item "${updatedFood.foodName}"`,
      details: existingFood
        ? buildUpdateDetails(
            existingFood as unknown as Record<string, unknown>,
            updatedFood as unknown as Record<string, unknown>,
            ['foodName', 'category', 'price']
          )
        : undefined,
    });
    res.json(updatedFood);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save food' });
  }
});

app.delete('/api/foods/:id', async (req, res) => {
  try {
    const foods = await getFoods();
    const existing = foods.find((f) => f.id === req.params.id);
    const success = await deleteFood(req.params.id);
    if (success) {
      await recordAudit({
        req,
        action: 'DELETE',
        entityType: 'food',
        entityId: req.params.id,
        entityLabel: existing?.foodName,
        summary: `Deleted food item "${existing?.foodName ?? req.params.id}"`,
      });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Food not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete food' });
  }
});

// 4. Guest Management
app.get('/api/guests', async (req, res) => {
  try {
    const guests = await getGuests();
    res.json(guests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch guests' });
  }
});

app.post('/api/guests', async (req, res) => {
  try {
    const { id, name, phone, nic, address, checkInDate, checkOutDate } = req.body;
    if (!name || !nic || !checkInDate) {
      return res.status(400).json({ error: 'Name, Identification (NIC/Passport), and Check-In Date are required.' });
    }

    const guests = await getGuests();
    const existingGuest = id ? guests.find((g) => g.id === id) : undefined;
    const savedGuest = await saveGuest({
      id: id || '',
      name,
      phone: phone || '',
      nic,
      address: address || 'Hotel Guest Address',
      checkInDate,
      checkOutDate: checkOutDate || '',
    });
    await recordAudit({
      req,
      action: existingGuest ? 'UPDATE' : 'CREATE',
      entityType: 'guest',
      entityId: savedGuest.id,
      entityLabel: savedGuest.name,
      summary: existingGuest
        ? `Updated guest "${savedGuest.name}"`
        : `Registered guest "${savedGuest.name}"`,
      details: existingGuest
        ? buildUpdateDetails(
            existingGuest as unknown as Record<string, unknown>,
            savedGuest as unknown as Record<string, unknown>,
            ['name', 'phone', 'nic', 'address', 'checkInDate', 'checkOutDate']
          )
        : undefined,
    });
    res.json(savedGuest);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save guest' });
  }
});

// 5. Billing System
app.get('/api/bills', async (req, res) => {
  try {
    const bills = await getBills();
    res.json(bills);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch bills' });
  }
});

app.post('/api/bills', async (req, res) => {
  try {
    const billData = req.body;
    if (!billData.guestId || !billData.guestDetails) {
      return res.status(400).json({ error: 'Guest details are required for creating a bill' });
    }

    // Automatically recalculate Room & Food subtotals, Service Charge (10% Food Only), and Grand Total to guarantee server audit accuracy
    const foodItems = billData.foodItems || [];
    const roomItems = billData.roomItems || [];

    const foodSubtotal = foodItems.reduce((acc: number, item: any) => acc + item.price * item.quantity, 0);
    const serviceCharge = Math.round(foodSubtotal * 0.1); // 10% on food
    const roomSubtotal = roomItems.reduce((acc: number, item: any) => acc + item.pricePerNight * item.nights, 0);
    const totalAmount = foodSubtotal + serviceCharge + roomSubtotal;

    const bills = await getBills();
    const existingBill = billData.id ? bills.find((b) => b.id === billData.id) : undefined;

    const fullBill: Bill = {
      id: billData.id || '',
      guestId: billData.guestId,
      guestDetails: billData.guestDetails,
      roomItems,
      foodItems,
      foodSubtotal,
      serviceCharge,
      roomSubtotal,
      totalAmount,
      status: billData.status || 'Active',
      createdAt: billData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const saved = await saveBill(fullBill);
    const actionLabel = billData.status === 'Completed' ? 'Settled' : existingBill ? 'Updated' : 'Created';
    await recordAudit({
      req,
      action: existingBill ? 'UPDATE' : 'CREATE',
      entityType: 'bill',
      entityId: saved.id,
      entityLabel: saved.id,
      summary: `${actionLabel} bill ${saved.id} for "${saved.guestDetails.name}"`,
      details: existingBill
        ? buildUpdateDetails(
            existingBill as unknown as Record<string, unknown>,
            saved as unknown as Record<string, unknown>,
            ['status', 'totalAmount', 'foodSubtotal', 'roomSubtotal', 'serviceCharge']
          )
        : undefined,
    });
    res.json(saved);
  } catch (error) {
    console.error('Save bill failed:', error);
    res.status(500).json({ error: 'Failed to save bill' });
  }
});

app.delete('/api/bills/:id', async (req, res) => {
  try {
    const bills = await getBills();
    const existing = bills.find((b) => b.id === req.params.id);
    const deleted = await deleteBill(req.params.id);
    if (deleted) {
      await recordAudit({
        req,
        action: 'DELETE',
        entityType: 'bill',
        entityId: req.params.id,
        entityLabel: req.params.id,
        summary: `Deleted bill ${req.params.id}${existing ? ` for "${existing.guestDetails.name}"` : ''}`,
      });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Bill not found' });
    }
  } catch (error) {
    console.error('Delete bill failed:', error);
    res.status(500).json({ error: 'Failed to delete bill' });
  }
});

// 5.1. Expense Management
app.get('/api/expenses', async (req, res) => {
  try {
    const expenses = await getExpenses();
    res.json(expenses);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch expenses' });
  }
});

app.post('/api/expenses', async (req, res) => {
  try {
    const { id, title, amount, category, date, description, approvedBy, paymentMethod } = req.body;
    if (!title || !amount || !category || !date || !paymentMethod) {
      return res.status(400).json({ error: 'Title, amount, category, date, and payment method are required.' });
    }

    const expenses = await getExpenses();
    const existingExpense = id ? expenses.find((e) => e.id === id) : undefined;
    const savedExpense = await saveExpense({
      id: id || '',
      title,
      amount: Number(amount),
      category,
      date,
      description: description || '',
      approvedBy: approvedBy || 'Admin',
      paymentMethod,
    });
    await recordAudit({
      req,
      action: existingExpense ? 'UPDATE' : 'CREATE',
      entityType: 'expense',
      entityId: savedExpense.id,
      entityLabel: savedExpense.title,
      summary: existingExpense
        ? `Updated expense "${savedExpense.title}"`
        : `Logged expense "${savedExpense.title}"`,
      details: existingExpense
        ? buildUpdateDetails(
            existingExpense as unknown as Record<string, unknown>,
            savedExpense as unknown as Record<string, unknown>,
            ['title', 'amount', 'category', 'date', 'description', 'paymentMethod']
          )
        : undefined,
    });
    res.json(savedExpense);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save expense' });
  }
});

app.delete('/api/expenses/:id', async (req, res) => {
  try {
    const expenses = await getExpenses();
    const existing = expenses.find((e) => e.id === req.params.id);
    const success = await deleteExpense(req.params.id);
    if (success) {
      await recordAudit({
        req,
        action: 'DELETE',
        entityType: 'expense',
        entityId: req.params.id,
        entityLabel: existing?.title,
        summary: `Deleted expense "${existing?.title ?? req.params.id}"`,
      });
      res.json({ success: true });
    } else {
      res.status(404).json({ error: 'Expense not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete expense' });
  }
});

// 6. Dashboard Statistics API
app.get('/api/dashboard/stats', async (req, res) => {
  try {
    const rooms = await getRooms();
    const bills = await getBills();

    const totalRooms = rooms.length;
    const availableRooms = rooms.filter((r) => r.status === 'Available').length;
    const occupiedRooms = rooms.filter((r) => r.status === 'Occupied').length;

    // Today's Revenue: Completed bills that were updated today
    const todayRevenue = bills
      .filter((b) => b.status === 'Completed' && isToday(b.updatedAt))
      .reduce((acc, b) => acc + b.totalAmount, 0);

    const activeBillsCount = bills.filter((b) => b.status === 'Active').length;

    // Food Orders Count (quantities of food ordered today across all bills)
    const foodOrdersCount = bills
      .filter((b) => isToday(b.createdAt))
      .reduce((acc, b) => {
        const qty = b.foodItems.reduce((qState, f) => qState + f.quantity, 0);
        return acc + qty;
      }, 0);

    const stats: DashboardStats = {
      totalRooms,
      availableRooms,
      occupiedRooms,
      todayRevenue,
      activeBillsCount,
      foodOrdersCount,
    };

    res.json(stats);
  } catch (error) {
    res.status(500).json({ error: 'Failed to load dashboard statistics' });
  }
});

// Recent Activities API
app.get('/api/dashboard/recent', async (req, res) => {
  try {
    const bills = await getBills();
    const guests = await getGuests();

    // 1. Recent Bills (only show Active bills for current active checkouts)
    const sortedBills = bills
      .filter((b) => b.status === 'Active')
      .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());

    // 2. Recent Check-ins (last 5 guests created)
    const sortedGuests = [...guests]
      .sort((a, b) => new Date(b.checkInDate).getTime() - new Date(a.checkInDate).getTime())
      .slice(0, 5);

    // 3. Recent Food Orders from active/completed bills
    const recentFoodOrders: any[] = [];
    bills.forEach((b) => {
      if (b.foodItems.length > 0) {
        const itemNames = b.foodItems.map((fi) => `${fi.foodName} (${fi.quantity}x)`).join(', ');
        recentFoodOrders.push({
          billId: b.id,
          guestName: b.guestDetails.name,
          items: itemNames,
          amount: b.foodSubtotal + b.serviceCharge,
          time: new Date(b.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          dateObj: new Date(b.updatedAt),
        });
      }
    });

    const sortedFoodOrders = recentFoodOrders
      .sort((a, b) => b.dateObj.getTime() - a.dateObj.getTime())
      .slice(0, 5)
      .map(({ dateObj, ...rest }) => rest);

    res.json({
      recentBills: sortedBills,
      recentCheckins: sortedGuests,
      recentFoodOrders: sortedFoodOrders,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch recent activities' });
  }
});

// 7. Comprehensive Reports API
app.get('/api/reports', async (req, res) => {
  try {
    const bills = await getBills();

    // Group completed bills by Day (YYYY-MM-DD)
    const dailyMap = new Map<string, { revenue: number; foodRevenue: number; serviceCharge: number; roomRevenue: number; billsCount: number }>();
    const monthlyMap = new Map<string, { revenue: number; foodRevenue: number; serviceCharge: number; roomRevenue: number; billsCount: number }>();

    bills.forEach((b) => {
      if (b.status === 'Completed') {
        const dayKey = b.updatedAt.split('T')[0];
        const monthKey = dayKey.substring(0, 7); // YYYY-MM

        // Daily mapping
        const currentDaily = dailyMap.get(dayKey) || { revenue: 0, foodRevenue: 0, serviceCharge: 0, roomRevenue: 0, billsCount: 0 };
        currentDaily.revenue += b.totalAmount;
        currentDaily.foodRevenue += b.foodSubtotal;
        currentDaily.serviceCharge += b.serviceCharge;
        currentDaily.roomRevenue += b.roomSubtotal;
        currentDaily.billsCount += 1;
        dailyMap.set(dayKey, currentDaily);

        // Monthly mapping
        const currentMonthly = monthlyMap.get(monthKey) || { revenue: 0, foodRevenue: 0, serviceCharge: 0, roomRevenue: 0, billsCount: 0 };
        currentMonthly.revenue += b.totalAmount;
        currentMonthly.foodRevenue += b.foodSubtotal;
        currentMonthly.serviceCharge += b.serviceCharge;
        currentMonthly.roomRevenue += b.roomSubtotal;
        currentMonthly.billsCount += 1;
        monthlyMap.set(monthKey, currentMonthly);
      }
    });

    const dailySummary = Array.from(dailyMap.entries()).map(([date, details]) => ({
      date,
      ...details,
    })).sort((a, b) => b.date.localeCompare(a.date));

    const monthlySummary = Array.from(monthlyMap.entries()).map(([month, details]) => ({
      month,
      ...details,
    })).sort((a, b) => b.month.localeCompare(a.month));

    res.json({
      dailySummary,
      monthlySummary,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to compile report summaries' });
  }
});

// 8. System Settings API
app.get('/api/settings', async (req, res) => {
  try {
    const settings = await getSettings();
    res.json(settings);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

app.post('/api/settings', async (req, res) => {
  try {
    const { settings, userId } = req.body;
    if (!settings) {
      return res.status(400).json({ error: 'Settings payload is required' });
    }
    
    // Check if operator is Admin
    const users = await getUsers();
    const operator = users.find(u => u.id === userId);
    if (!operator || operator.role !== 'admin') {
      return res.status(403).json({ error: 'Unauthorized: Only administrators are permitted to save settings.' });
    }

    const previousSettings = await getSettings();
    const updatedSettings = await saveSettings(settings);
    
    try {
      await recordAudit({
        req,
        action: 'UPDATE',
        entityType: 'settings',
        entityId: 'system_settings',
        entityLabel: 'System Settings',
        summary: 'Updated system settings',
        details: buildUpdateDetails(
          previousSettings as unknown as Record<string, unknown>,
          updatedSettings as unknown as Record<string, unknown>,
          ['hotelName', 'allowManagerViewReports', 'allowManagerUserEdit', 'allowReceptionistAddExpenses']
        ),
      });
    } catch (auditError) {
      console.warn('Audit log failed but settings were saved:', auditError);
      // Don't fail the request if audit fails, just warn
    }
    
    res.json(updatedSettings);
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : 'Unknown error';
    console.error('Settings update error:', errorMsg, error);
    res.status(500).json({ error: `Failed to update system settings: ${errorMsg}` });
  }
});

// 9. Frontdesk Memo & Shift Handover Board API
app.get('/api/memos', async (req, res) => {
  try {
    const memos = await getMemos();
    const sorted = [...memos].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve frontdesk memos' });
  }
});

app.post('/api/memos', async (req, res) => {
  try {
    const memo = req.body as FrontdeskMemo;
    if (!memo.content || !memo.authorName) {
      return res.status(400).json({ error: 'Content and author details are required' });
    }
    const memos = await getMemos();
    const existingMemo = memo.id ? memos.find((m) => m.id === memo.id) : undefined;
    const saved = await saveMemo(memo);
    await recordAudit({
      req,
      action: existingMemo ? 'UPDATE' : 'CREATE',
      entityType: 'memo',
      entityId: saved.id,
      entityLabel: saved.authorName,
      summary: existingMemo
        ? `Updated memo by "${saved.authorName}"`
        : `Created memo by "${saved.authorName}"`,
    });
    res.json(saved);
  } catch (error) {
    res.status(500).json({ error: 'Failed to store frontdesk memo' });
  }
});

app.delete('/api/memos/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const memos = await getMemos();
    const existing = memos.find((m) => m.id === id);
    const success = await deleteMemo(id);
    if (success) {
      await recordAudit({
        req,
        action: 'DELETE',
        entityType: 'memo',
        entityId: id,
        entityLabel: existing?.authorName,
        summary: `Deleted memo by "${existing?.authorName ?? id}"`,
      });
      res.json({ success: true, message: 'Memo removed successfully' });
    } else {
      res.status(404).json({ error: 'Memo not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete frontdesk memo' });
  }
});

// 10. Monthly Profit Closer & Owner's Takeaway Ledger API
app.get('/api/closed-months', async (req, res) => {
  try {
    const list = await getClosedMonths();
    const sorted = [...list].sort((a, b) => b.month.localeCompare(a.month));
    res.json(sorted);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve closed months' });
  }
});

app.post('/api/closed-months', async (req, res) => {
  try {
    const closedMonth = req.body as ClosedMonth;
    if (!closedMonth.month || closedMonth.ownerTakeaway === undefined) {
      return res.status(400).json({ error: 'Month and owner profit takeaway values are required' });
    }
    const list = await getClosedMonths();
    const existingMonth = closedMonth.id
      ? list.find((m) => m.id === closedMonth.id)
      : list.find((m) => m.month === closedMonth.month);
    const saved = await saveClosedMonth(closedMonth);
    await recordAudit({
      req,
      action: existingMonth ? 'UPDATE' : 'CREATE',
      entityType: 'closed_month',
      entityId: saved.id,
      entityLabel: saved.month,
      summary: existingMonth
        ? `Updated closed month ${saved.month}`
        : `Closed month ${saved.month}`,
      details: existingMonth
        ? buildUpdateDetails(
            existingMonth as unknown as Record<string, unknown>,
            saved as unknown as Record<string, unknown>,
            ['totalRevenue', 'totalExpenses', 'netProfit', 'ownerTakeaway', 'retainedEarnings']
          )
        : undefined,
    });
    res.json(saved);
  } catch (error) {
    res.status(500).json({ error: 'Failed to save closed month ledger' });
  }
});

app.delete('/api/closed-months/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const list = await getClosedMonths();
    const existing = list.find((m) => m.id === id);
    const success = await deleteClosedMonth(id);
    if (success) {
      await recordAudit({
        req,
        action: 'DELETE',
        entityType: 'closed_month',
        entityId: id,
        entityLabel: existing?.month,
        summary: `Deleted closed month ${existing?.month ?? id}`,
      });
      res.json({ success: true, message: 'Closed month ledger removed successfully' });
    } else {
      res.status(404).json({ error: 'Closed month not found' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete closed month ledger' });
  }
});

// 11. Audit Logs API (Super Admin only)
app.get('/api/audit-logs', async (req, res) => {
  try {
    const actor = await resolveActor(req);
    if (actor.role !== 'admin') {
      return res.status(403).json({ error: 'Super Admin access required.' });
    }
    const logs = await getAuditLogs({
      limit: Number(req.query.limit) || 100,
      offset: Number(req.query.offset) || 0,
      entityType: req.query.entityType as string,
      actorUserId: req.query.actorUserId as string,
      from: req.query.from as string,
      to: req.query.to as string,
    });
    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch audit logs' });
  }
});


// Start server function and Vite Middleware mounting
async function startServer() {
  await initializeDatabase();

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Hotel POS Server booting on http://localhost:${PORT}`);
  });

  const shutdown = async () => {
    await prisma.$disconnect();
    process.exit(0);
  };
  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);
}

// ─── Vercel Serverless Export ─────────────────────────────────────────────
// On Vercel: export the Express app as the default handler (no app.listen).
// Locally: call startServer() which sets up Vite dev middleware and listens on PORT.

export default app;

if (!process.env.VERCEL) {
  startServer();
}
