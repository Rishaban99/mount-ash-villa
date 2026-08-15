/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type UserRole = 'admin' | 'manager' | 'receptionist';

export interface User {
  id: string;
  username: string;
  name: string;
  role: UserRole;
  password?: string; // Excluded in response
  salary?: number;   // Monthly base salary
  lastPaid?: string; // Last payment date YYYY-MM-DD
  joinDate?: string; // Salary start date — first eligible payroll month
  leftDate?: string; // Last employment day
  monthlyBaseSalaries?: Record<string, number>; // Month YYYY-MM -> specific base salary
  monthlyPaidSalaries?: Record<string, any>; // Month YYYY-MM -> list of payments
}

export type RoomType = 'Single' | 'Double' | 'Triple';
export type RoomStatus = 'Available' | 'Occupied';

export interface Room {
  id: string;
  roomNumber: string;
  roomType: RoomType;
  price: number;
  status: RoomStatus;
}

export interface Guest {
  id: string;
  name: string;
  phone: string;
  nic: string;
  address: string;
  checkInDate: string;
  checkOutDate: string;
}

export interface Food {
  id: string;
  foodName: string;
  category: string;
  price: number;
}

export interface RoomItem {
  roomId: string;
  roomNumber: string;
  roomType: RoomType;
  pricePerNight: number;
  nights: number;
  originalPricePerNight?: number;
  discount?: number;
}

export interface FoodItem {
  foodId: string;
  foodName: string;
  price: number;
  quantity: number;
}

export type BillStatus = 'Active' | 'DueLater' | 'Completed';

export interface Bill {
  id: string;
  guestId: string;
  guestDetails: Guest;
  roomItems: RoomItem[];
  foodItems: FoodItem[];
  foodSubtotal: number;
  serviceCharge: number; // 10% on food
  roomSubtotal: number;
  totalAmount: number;
  status: BillStatus;
  dueLaterNote?: string;
  dueLaterAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalRooms: number;
  availableRooms: number;
  occupiedRooms: number;
  todayRevenue: number;
  activeBillsCount: number;
  dueLaterBillsCount: number;
  dueLaterAmount: number;
  foodOrdersCount: number;
}

export interface RecentActivity {
  recentBills: Bill[];
  recentCheckins: Guest[];
  recentFoodOrders: {
    billId: string;
    guestName: string;
    items: string;
    amount: number;
    time: string;
  }[];
}

export interface Expense {
  id: string;
  title: string;
  amount: number;
  category: string;
  date: string;
  description: string;
  approvedBy?: string;
  paymentMethod: string; // 'Cash' | 'Card' | 'Bank Transfer' | 'Cheque'
}

export interface SystemSettings {
  hotelName: string;
  phone: string;
  address: string;
  currency: string;
  serviceChargePercent: number;
  vatPercent: number;
  allowReceptionistDelete: boolean;
  allowReceptionistDiscount: boolean;
  allowReceptionistModifyPrice: boolean;
  allowManagerSalaryChange: boolean;
  allowManagerUserEdit: boolean;
  allowReceptionistAddFoods: boolean;
  allowReceptionistEditFoods: boolean;
  allowReceptionistDeleteFoods: boolean;
  allowReceptionistManageGuests: boolean;
  allowReceptionistAddExpenses: boolean;
  allowReceptionistAddRooms: boolean;
  allowReceptionistEditRooms: boolean;
  allowReceptionistDeleteRooms: boolean;
  allowManagerManageRooms: boolean;
  allowManagerAddRooms: boolean;
  allowManagerEditRooms: boolean;
  allowManagerDeleteRooms: boolean;
  allowManagerAddFoods: boolean;
  allowManagerEditFoods: boolean;
  allowManagerDeleteFoods: boolean;
  allowManagerViewReports: boolean;
  allowManagerDeleteExpenses: boolean;
  allowManagerDeleteSettledBills: boolean;
  taxNumber: string;
  email: string;
  checkInTime: string;
  checkOutTime: string;
  receiptFooterMessage: string;
  printerType: 'thermal' | 'standard';
  paperWidth: '58mm' | '80mm' | 'A4';
  printerConnection: 'usb' | 'network' | 'browser';
  printerIpAddress: string;
  autoPrintOnSettle: boolean;
  showLogoOnReceipt: boolean;
  showTaxDetails: boolean;
}

export interface FrontdeskMemo {
  id: string;
  content: string;
  authorName: string;
  authorRole: string;
  type: 'handover' | 'reminder' | 'maintenance' | 'guest_request';
  resolved: boolean;
  resolvedBy?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface ClosedMonth {
  id: string;
  month: string; // YYYY-MM
  totalRevenue: number;
  totalExpenses: number;
  netProfit: number;
  ownerTakeaway: number;
  retainedEarnings: number;
  closedAt: string;
  closedBy: string;
  notes?: string;
}

export type AuditAction = 'CREATE' | 'UPDATE' | 'DELETE' | 'LOGIN';

export interface AuditLog {
  id: string;
  action: AuditAction;
  entityType: string;
  entityId?: string;
  entityLabel?: string;
  actorUserId: string;
  actorName: string;
  actorRole: string;
  timestamp: string;
  summary: string;
  details?: Record<string, unknown>;
}

export interface PrintLog {
  id: string;
  billId: string;
  billLabel: string;
  guestName: string;
  totalAmount: number;
  paymentMethod: string;
  paperWidth: string;
  currency: string;
  printedBy: string;
  printedByRole: string;
  printedAt: string;
}

export interface GuestFeedback {
  id: string;
  roomNumber: string;
  guestName?: string;
  rating: number;
  category?: string;
  message?: string;
  isRead: boolean;
  createdAt: string;
}

export type AttendanceStatus = 'Present' | 'Absent' | 'Late' | 'Half Day' | 'On Leave' | 'Day Off' | 'Day In';
export type ShiftType = 'Morning' | 'Evening' | 'Night' | 'Full Day';

export interface Attendance {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  date: string; // YYYY-MM-DD
  checkIn?: string; // HH:MM (24h or ISO)
  checkOut?: string; // HH:MM (24h or ISO)
  status: AttendanceStatus;
  shift?: ShiftType;
  workHours?: number;
  overtimeHours?: number;
  notes?: string;
  recordedBy: string;
  createdAt: string;
  updatedAt?: string;
}



