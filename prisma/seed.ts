import 'dotenv/config';
import { prisma } from '../server/prisma';
import { UserRole, RoomType, RoomStatus, BillStatus, MemoType } from '../generated/prisma/client';
import { DEFAULT_SETTINGS } from './defaults';

const DEFAULT_GUESTS = [
  {
    id: 'guest_1',
    name: 'John Doe',
    phone: '+94771234567',
    nic: '199512345V',
    address: '45, Galle Road, Colombo 03',
    checkInDate: new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    checkOutDate: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
  {
    id: 'guest_2',
    name: 'Alice Smith',
    phone: '+94779876543',
    nic: '199298765V',
    address: '12, Kandy Road, Peradeniya',
    checkInDate: new Date().toISOString().split('T')[0],
    checkOutDate: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0],
  },
];

const DEFAULT_BILLS = [
  {
    id: 'bill_1',
    guestId: 'guest_1',
    guestDetails: DEFAULT_GUESTS[0],
    roomItems: [
      {
        roomId: 'room_101',
        roomNumber: '101',
        roomType: 'Single',
        pricePerNight: 2500,
        nights: 2,
      },
    ],
    foodItems: [
      {
        foodId: 'food_1',
        foodName: 'Club Sandwich with Fries',
        price: 750,
        quantity: 2,
      },
      {
        foodId: 'food_4',
        foodName: 'Cappuccino',
        price: 450,
        quantity: 2,
      },
    ],
    foodSubtotal: 2400,
    serviceCharge: 240,
    roomSubtotal: 5000,
    totalAmount: 7640,
    status: BillStatus.Active,
    createdAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
    updatedAt: new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString(),
  },
  {
    id: 'bill_2',
    guestId: 'guest_2',
    guestDetails: DEFAULT_GUESTS[1],
    roomItems: [
      {
        roomId: 'room_201',
        roomNumber: '201',
        roomType: 'Double',
        pricePerNight: 4500,
        nights: 1,
      },
    ],
    foodItems: [],
    foodSubtotal: 0,
    serviceCharge: 0,
    roomSubtotal: 4500,
    totalAmount: 4500,
    status: BillStatus.Active,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  },
];

function buildDefaultUsers() {
  const superAdminUsername =
    process.env.NEXT_PUBLIC_INITIAL_SUPER_ADMIN_USERNAME || 'rishaban';
  const superAdminPassword = process.env.INITIAL_SUPER_ADMIN_PASSWORD || 'adminpassword';
  const superAdminName = process.env.NEXT_PUBLIC_INITIAL_SUPER_ADMIN_NAME || 'Super Admin';

  return [
    {
      id: 'user_1',
      username: superAdminUsername,
      name: superAdminName,
      role: UserRole.admin,
      password: superAdminPassword,
      salary: 75000,
      lastPaid: '2026-05-31',
      joinDate: '2026-05-01',
    },
    {
      id: 'user_manager',
      username: 'manager1',
      name: 'Robert Manager',
      role: UserRole.manager,
      password: 'password123',
      salary: 55000,
      lastPaid: '2026-05-31',
      joinDate: '2026-05-01',
    },
    {
      id: 'user_2',
      username: 'receptionist1',
      name: 'Sarah receptionist',
      role: UserRole.receptionist,
      password: 'password123',
      salary: 35000,
      lastPaid: '2026-05-31',
      joinDate: '2026-05-01',
    },
    {
      id: 'user_3',
      username: 'thomas_rep',
      name: 'Thomas receptionist',
      role: UserRole.receptionist,
      password: 'password123',
      salary: 32000,
      lastPaid: '2026-05-31',
      joinDate: '2026-05-10',
    },
    {
      id: 'user_4',
      username: 'emily_rep',
      name: 'Emily receptionist',
      role: UserRole.receptionist,
      password: 'password123',
      salary: 31000,
      lastPaid: '',
      joinDate: '2026-08-01',
    },
  ];
}

async function main() {
  const userCount = await prisma.user.count();
  if (userCount > 0) {
    console.log('Database already seeded, skipping.');
    return;
  }

  console.log('Seeding database...');

  await prisma.user.createMany({ data: buildDefaultUsers() });
  await prisma.room.createMany({
    data: [
      { id: 'room_101', roomNumber: '101', roomType: RoomType.Single, price: 2500, status: RoomStatus.Occupied },
      { id: 'room_102', roomNumber: '102', roomType: RoomType.Single, price: 2500, status: RoomStatus.Available },
      { id: 'room_201', roomNumber: '201', roomType: RoomType.Double, price: 4500, status: RoomStatus.Occupied },
      { id: 'room_202', roomNumber: '202', roomType: RoomType.Double, price: 4500, status: RoomStatus.Available },
      { id: 'room_301', roomNumber: '301', roomType: RoomType.Triple, price: 6500, status: RoomStatus.Available },
      { id: 'room_302', roomNumber: '302', roomType: RoomType.Triple, price: 6500, status: RoomStatus.Available },
    ],
  });
  await prisma.food.createMany({
    data: [
      { id: 'food_1', foodName: 'Club Sandwich with Fries', category: 'Snacks', price: 750 },
      { id: 'food_2', foodName: 'Chicken Fried Rice', category: 'Main Course', price: 950 },
      { id: 'food_3', foodName: 'Margherita Pizza 12"', category: 'Main Course', price: 1200 },
      { id: 'food_4', foodName: 'Cappuccino', category: 'Beverages', price: 450 },
      { id: 'food_5', foodName: 'Fresh Orange Juice', category: 'Beverages', price: 350 },
      { id: 'food_6', foodName: 'Chocolate Lava Cake', category: 'Desserts', price: 550 },
      { id: 'food_7', foodName: 'Chicken Burger with Fries', category: 'Snacks', price: 850 },
      { id: 'food_8', foodName: 'French Fries', category: 'Snacks', price: 400 },
      { id: 'food_9', foodName: 'Tomato Cream Soup', category: 'Soups', price: 450 },
      { id: 'food_10', foodName: 'Caesar Salad', category: 'Salads', price: 650 },
    ],
  });
  await prisma.guest.createMany({ data: DEFAULT_GUESTS });
  await prisma.bill.createMany({ data: DEFAULT_BILLS });
  await prisma.expense.createMany({
    data: [
      {
        id: 'exp_1',
        title: 'Electricity Bill May 2026',
        amount: 14500,
        category: 'Utilities',
        date: '2026-05-25',
        description: 'Monthly electricity charges for the main premises',
        approvedBy: 'Super Admin',
        paymentMethod: 'Bank Transfer',
      },
      {
        id: 'exp_2',
        title: 'Chef Salary May 2026',
        amount: 45000,
        category: 'Salaries',
        date: '2026-05-31',
        description: 'Monthly salary for head chef',
        approvedBy: 'Super Admin',
        paymentMethod: 'Bank Transfer',
      },
      {
        id: 'exp_3',
        title: 'Vegetable & Food Supplies',
        amount: 8500,
        category: 'Food & Supplies',
        date: '2026-06-02',
        description: 'Fresh ingredients purchased from local market',
        approvedBy: 'Sarah receptionist',
        paymentMethod: 'Cash',
      },
      {
        id: 'exp_4',
        title: 'Plumbing Repair Room 102',
        amount: 3200,
        category: 'Maintenance',
        date: '2026-06-05',
        description: 'Fixed leaking bathroom pipes and fixtures',
        approvedBy: 'Super Admin',
        paymentMethod: 'Cash',
      },
    ],
  });
  await prisma.settings.create({ data: DEFAULT_SETTINGS });
  await prisma.memo.createMany({
    data: [
      {
        id: 'memo_1',
        content:
          'VIP Guest in Room 301 requested a delayed checkout at 14:00. Please coordinate with housekeeping.',
        authorName: 'Sarah receptionist',
        authorRole: 'receptionist',
        type: MemoType.guest_request,
        resolved: false,
        createdAt: new Date(Date.now() - 3 * 3600 * 1000).toISOString(),
      },
      {
        id: 'memo_2',
        content:
          'Housekeeping alert: Air conditioning unit in Room 102 makes a rattling sound, technician will visit today between 14:00 - 15:00.',
        authorName: 'Robert Manager',
        authorRole: 'manager',
        type: MemoType.maintenance,
        resolved: false,
        createdAt: new Date(Date.now() - 5 * 3600 * 1000).toISOString(),
      },
    ],
  });

  console.log('Seed completed successfully.');
}

main()
  .catch((error) => {
    console.error('Seed failed:', error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
