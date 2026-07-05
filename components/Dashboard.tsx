'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DashboardStats, RecentActivity, User, Room } from '@/lib/types';
import {
  Hotel,
  CheckCircle,
  AlertCircle,
  TrendingUp,
  Clock,
  Coffee,
  PlusCircle,
  UserPlus,
  UtensilsCrossed,
  ArrowRight,
  ShieldCheck,
  Receipt,
  UserCheck,
  FileText,
  Bed,
  Sparkles,
  Coins,
  Plus,
  Wallet,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth-provider';

export const Dashboard: React.FC = () => {
  const router = useRouter();
  const { user: currentUser } = useAuth();
  if (!currentUser) return null;

  const navigate = (tab: string, arg?: string) => {
    if (tab === 'expenses' && arg) {
      router.push(`/expenses?action=${arg}`);
    } else {
      router.push(`/${tab}`);
    }
  };

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';
  const [stats, setStats] = useState<DashboardStats>({
    totalRooms: 0,
    availableRooms: 0,
    occupiedRooms: 0,
    todayRevenue: 0,
    activeBillsCount: 0,
    foodOrdersCount: 0,
  });

  const [recent, setRecent] = useState<RecentActivity>({
    recentBills: [],
    recentCheckins: [],
    recentFoodOrders: [],
  });

  const [rooms, setRooms] = useState<Room[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchDashboardData = async () => {
    try {
      const [statsRes, recentRes, roomsRes] = await Promise.all([
        fetch('/api/dashboard/stats'),
        fetch('/api/dashboard/recent'),
        fetch('/api/rooms')
      ]);

      if (statsRes.ok && recentRes.ok) {
        const statsData = await statsRes.json();
        const recentData = await recentRes.json();
        setStats(statsData);
        setRecent(recentData);
      }
      if (roomsRes && roomsRes.ok) {
        const roomsData = await roomsRes.json();
        setRooms(roomsData);
      }
    } catch (e) {
      console.error('Failed to fetch dashboard data', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const activeBillsList = recent.recentBills;

  // Create guest initials for profile lists
  const getGuestInitials = (name: string) => {
    if (!name) return "G";
    return name
      .trim()
      .split(/\s+/)
      .map((n) => n[0])
      .slice(0, 2)
      .join("")
      .toUpperCase();
  };

  // Group rooms dynamically by floor based on the room number's first digit
  const floorMap: Record<string, Room[]> = {};
  rooms.forEach((room) => {
    const firstDigit = room.roomNumber.charAt(0);
    const floorKey = /^[1-9]$/.test(firstDigit) ? `Floor ${firstDigit}` : "Ground Floor";
    if (!floorMap[floorKey]) {
      floorMap[floorKey] = [];
    }
    floorMap[floorKey].push(room);
  });

  // Sort floors logically (Ground Floor first, then Floor 1, Floor 2...)
  const sortedFloors = Object.keys(floorMap).sort((a, b) => {
    if (a.includes("Ground")) return -1;
    if (b.includes("Ground")) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="space-y-6 font-sans text-slate-800">
      
      {/* Dynamic Welcome Operator Banner */}
      <div className="bg-slate-900 text-white p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-md relative overflow-hidden">
        <div className="absolute right-0 top-0 bottom-0 w-2/5 bg-gradient-to-l from-indigo-900/30 via-transparent to-transparent pointer-events-none" />
        <div className="flex items-center gap-4 relative z-10">
          <div className="h-12 w-12 rounded-xl bg-indigo-500/10 border border-indigo-400/20 flex items-center justify-center text-indigo-400 font-bold shrink-0 text-lg">
            {getGuestInitials(currentUser.name)}
          </div>
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-indigo-400 uppercase tracking-widest">
              <ShieldCheck className="h-3.5 w-3.5 text-indigo-400" />
              <span>Frontdesk Operations Terminal</span>
            </div>
            <h2 className="text-lg md:text-xl font-display font-extrabold text-white mt-0.5">
              Welcome back, {currentUser.name}
            </h2>
            <p className="text-xs text-slate-450 mt-0.5">
              Authorization clearance level: <span className="font-bold text-indigo-300 uppercase">{currentUser.role}</span>
            </p>
          </div>
        </div>

        <div className="relative z-10 shrink-0 self-start md:self-center">
          <button
            id="dash-record-expense-pill-btn"
            type="button"
            onClick={() => navigate('expenses', 'new')}
            className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold py-2.5 px-6 rounded-full text-xs shadow-lg shadow-indigo-950/45 flex items-center gap-2 border-0 cursor-pointer transition-all hover:scale-103 active:scale-97 select-none animate-fade-in"
          >
            <Plus className="h-4 w-4" />
            <span>Record New Expense</span>
          </button>
        </div>

        <div className="text-left md:text-right relative z-10 shrink-0 border-t border-slate-800 md:border-0 pt-3 md:pt-0">
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Arriving Station Date</p>
          <div className="flex items-center md:justify-end gap-1.5 mt-0.5 text-xs font-semibold text-slate-200">
            <Clock className="h-3.5 w-3.5 text-slate-400" />
            <span>{new Date().toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' })}</span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="bg-white p-16 text-center rounded-2xl border border-slate-150">
          <p className="text-slate-450 text-sm animate-pulse flex items-center justify-center gap-2">
            <span className="w-2 h-2 rounded-full bg-indigo-600 animate-ping" />
            Loading real-time checkout ledgers & configurations...
          </p>
        </div>
      ) : (
        <>
          {/* HIGH-DENSITY HIGH-CONTRAST KPI TILES GRID */}
          <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
            
            <div className="bg-white p-4.5 rounded-2xl border border-slate-100 shadow-xs flex flex-col justify-between relative overflow-hidden gap-3 hover:translate-y-[-1px] transition-transform">
              <div>
                <p className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">Total Rooms</p>
                <p className="text-2xl font-extrabold text-slate-900 mt-1">{stats.totalRooms}</p>
              </div>
              <div className="absolute right-3.5 bottom-3.5 h-8 w-8 rounded-lg bg-indigo-50 flex items-center justify-center text-indigo-600">
                <Hotel className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="bg-emerald-50/20 p-4.5 rounded-2xl border border-emerald-100 shadow-xs flex flex-col justify-between relative overflow-hidden gap-3 hover:translate-y-[-1px] transition-transform">
              <div>
                <p className="text-[10px] uppercase font-bold text-emerald-800 tracking-wider">Available Rooms</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <p className="text-2xl font-extrabold text-emerald-800">{stats.availableRooms}</p>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-100/55 px-1.5 py-0.5 rounded">Ready</span>
                </div>
              </div>
              <div className="absolute right-3.5 bottom-3.5 h-8 w-8 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
                <Bed className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="bg-rose-50/15 p-4.5 rounded-2xl border border-rose-100 shadow-xs flex flex-col justify-between relative overflow-hidden gap-3 hover:translate-y-[-1px] transition-transform">
              <div>
                <p className="text-[10px] uppercase font-bold text-rose-800 tracking-wider">Occupied Rooms</p>
                <div className="flex items-baseline gap-1.5 mt-1">
                  <p className="text-2xl font-extrabold text-rose-800">{stats.occupiedRooms}</p>
                  <span className="text-[10px] font-bold text-rose-600 bg-rose-100/55 px-1.5 py-0.5 rounded">In Stay</span>
                </div>
              </div>
              <div className="absolute right-3.5 bottom-3.5 h-8 w-8 rounded-lg bg-rose-50 text-rose-700 flex items-center justify-center">
                <UserCheck className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="bg-amber-50/15 p-4.5 rounded-2xl border border-amber-100 shadow-xs flex flex-col justify-between relative overflow-hidden gap-3 hover:translate-y-[-1px] transition-transform">
              <div>
                <p className="text-[10px] uppercase font-bold text-amber-800 tracking-wider">Today Revenue</p>
                <p className="text-lg font-extrabold text-slate-950 mt-1 truncate">Rs. {stats.todayRevenue.toLocaleString()}</p>
              </div>
              <div className="absolute right-3.5 bottom-3.5 h-8 w-8 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
                <TrendingUp className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="bg-indigo-50/15 p-4.5 rounded-2xl border border-indigo-100 shadow-xs flex flex-col justify-between relative overflow-hidden gap-3 hover:translate-y-[-1px] transition-transform">
              <div>
                <p className="text-[10px] uppercase font-bold text-indigo-800 tracking-wider">Active Bills</p>
                <p className="text-2xl font-extrabold text-indigo-900 mt-1">{stats.activeBillsCount}</p>
              </div>
              <div className="absolute right-3.5 bottom-3.5 h-8 w-8 rounded-lg bg-indigo-50 text-indigo-700 flex items-center justify-center">
                <Receipt className="h-4.5 w-4.5" />
              </div>
            </div>

            <div className="bg-purple-50/15 p-4.5 rounded-2xl border border-purple-100 shadow-xs flex flex-col justify-between relative overflow-hidden gap-3 hover:translate-y-[-1px] transition-transform">
              <div>
                <p className="text-[10px] uppercase font-bold text-purple-800 tracking-wider">Food Orders</p>
                <p className="text-2xl font-extrabold text-purple-900 mt-1">{stats.foodOrdersCount}</p>
              </div>
              <div className="absolute right-3.5 bottom-3.5 h-8 w-8 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center">
                <UtensilsCrossed className="h-4.5 w-4.5" />
              </div>
            </div>

          </div>

          {/* FRONTDESK MAIN DUAL WORKSPACE */}
          <div className="grid grid-cols-12 gap-5">
            
            {/* Left Pane (Col span 12 or 8) - Primary Actions & Active checkout table */}
            <div className="col-span-12 lg:col-span-8 flex flex-col gap-5">
              
              {/* Premium Dashboard Quick Navigation Buttons */}
              <div className="bg-slate-50 border border-slate-150 p-4 rounded-2xl grid grid-cols-1 sm:grid-cols-4 gap-3">
                <button
                  type="button"
                  onClick={() => navigate('billing')}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all shadow-md shadow-indigo-100 border-0 cursor-pointer text-center group"
                >
                  <PlusCircle className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-widest block">Create Guest Bill</span>
                    <span className="text-[9px] text-indigo-200 mt-0.5 block">Establish stay & checkout ledger</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('rooms')}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 p-4 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center group"
                >
                  <Hotel className="w-5 h-5 text-indigo-600 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-widest block text-slate-800">Manage Rooms</span>
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Set statuses, types & inventory</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('foods')}
                  className="bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 p-4 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all cursor-pointer text-center group"
                >
                  <UtensilsCrossed className="w-5 h-5 text-purple-600 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-widest block text-slate-800">Order Food & F&B</span>
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Add kitchen charges to rooms</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => navigate('expenses', 'new')}
                  className="bg-slate-900 hover:bg-slate-850 text-white p-4 rounded-xl flex flex-col items-center justify-center gap-1.5 transition-all shadow-md shadow-slate-900/10 border border-slate-850 cursor-pointer text-center group"
                >
                  <Wallet className="w-5 h-5 text-indigo-400 group-hover:scale-110 transition-transform" />
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-widest block text-white">Record Expense</span>
                    <span className="text-[9px] text-slate-400 mt-0.5 block">Log business spends & outflow</span>
                  </div>
                </button>
              </div>

              {/* Current Active checkouts */}
              <div className="bg-white rounded-2xl border border-slate-200 flex flex-col overflow-hidden shadow-xs">
                <div className="px-5 py-4 border-b border-slate-100 bg-slate-50/30 flex justify-between items-center shrink-0">
                  <div className="flex items-center gap-2">
                    <Receipt className="h-4.5 w-4.5 text-indigo-600 animate-pulse" />
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                      Current frontdesk active checkouts
                    </h3>
                  </div>
                  <div className="flex gap-1.5">
                    <span className="text-[10px] uppercase tracking-wide font-bold bg-emerald-50 border border-emerald-100 text-emerald-800 px-2.5 py-0.5 rounded-full flex items-center gap-1">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                      Live Stay Ledgers ({activeBillsList.filter(b => b.status === 'Active').length})
                    </span>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <table className="w-full text-left font-sans">
                    <thead className="bg-slate-50 border-b border-slate-100 text-[10px] uppercase font-bold text-slate-400">
                      <tr>
                        <th className="px-5 py-3">Guest Profile</th>
                        <th className="px-5 py-3">Rooms Allocation</th>
                        <th className="px-5 py-3">Ledger Balance</th>
                        <th className="px-5 py-3">Status</th>
                        <th className="px-5 py-3 text-right">Terminal Action</th>
                      </tr>
                    </thead>
                    <tbody className="text-xs divide-y divide-slate-100">
                      {activeBillsList.map((bill) => (
                        <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-3">
                              <div className="h-7 w-7 rounded-lg bg-indigo-50 border border-indigo-100 text-indigo-700 font-bold text-[10px] flex items-center justify-center shrink-0">
                                {getGuestInitials(bill.guestDetails.name)}
                              </div>
                              <div>
                                <span className="font-bold text-slate-800 block text-sm">{bill.guestDetails.name}</span>
                                <span className="inline-block text-[10px] text-indigo-600 font-mono font-bold bg-indigo-50/50 px-1.5 py-0.5 rounded mt-0.5">
                                  #{bill.id.substring(0, 12).toUpperCase()}
                                </span>
                              </div>
                            </div>
                          </td>
                          <td className="px-5 py-3.5">
                            <div className="flex flex-wrap gap-1">
                              {bill.roomItems.length === 0 ? (
                                <span className="text-slate-400 italic">No assigned room</span>
                              ) : (
                                bill.roomItems.map((r, itemIdx) => (
                                  <span key={itemIdx} className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50/80 text-blue-700 border border-blue-100 rounded text-[11px] font-bold font-mono">
                                    <Bed className="h-3 w-3 text-blue-500" />
                                    Rm {r.roomNumber}
                                  </span>
                                ))
                              )}
                            </div>
                          </td>
                          <td className="px-5 py-3.5 text-base font-extrabold text-slate-900">
                             Rs. {bill.totalAmount.toLocaleString()}
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center px-2 py-0.5 rounded font-extrabold text-[10px] gap-1 tracking-wide bg-emerald-50 text-emerald-700 border border-emerald-100 uppercase">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              {bill.status}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <button
                              type="button"
                              onClick={() => navigate('billing')}
                              className="py-1 px-3 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-lg text-xs font-bold border-0 cursor-pointer transition-all shadow-2xs"
                            >
                              Settle / POS
                            </button>
                          </td>
                        </tr>
                      ))}
                      {activeBillsList.length === 0 && (
                        <tr>
                          <td colSpan={5} className="text-center py-12 text-slate-450 text-sm">
                            No checking-in operations in progress. Start by creating a guest checkout ledger!
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>



            </div>

            {/* Right Pane (Col span 12 or 4) - organized room statuses visual dashboard */}
            <div className="col-span-12 lg:col-span-4 flex flex-col gap-5">
              
              {/* Dynamic Room Status Map Panel grouped by Floor */}
              <div className="bg-white rounded-2xl border border-slate-200 p-4.5 shadow-xs flex flex-col">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Live Room Visual Map</h3>
                    <p className="text-[10px] text-slate-400 mt-0.5">Organized by floors</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 shrink-0">
                     <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold text-emerald-700 uppercase bg-emerald-50 px-1.5 py-0.5 rounded">
                       <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 block"></span> Available
                     </span>
                     <span className="inline-flex items-center gap-1.5 text-[9px] font-extrabold text-rose-700 uppercase bg-rose-50 px-1.5 py-0.5 rounded mt-0.5">
                       <span className="w-1.5 h-1.5 rounded-full bg-rose-500 block"></span> Occupied
                     </span>
                  </div>
                </div>
                      {/*single,double,triple */}
                {sortedFloors.map((floor) => (
                  <div key={floor} className="mb-4">
                    <h4 className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-2">{floor}</h4>
                    <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                      {floorMap[floor].map((room) => (
                        <button
                          key={room.id}
                          type="button"
                          onClick={() => navigate('rooms', room.id)}
                          className={`p-3 rounded-lg border text-[11px] font-bold transition-all flex flex-col items-center justify-center gap-1 ${
                            room.status === 'Available'
                              ? 'bg-emerald-50 border-emerald-100 text-emerald-700 hover:bg-emerald-100/50'
                              : 'bg-rose-50 border-rose-100 text-rose-700 hover:bg-rose-100/50'
                          }`}
                        >
                          <Bed className={`h-4 w-4 ${room.status === 'Available' ? 'text-emerald-500' : 'text-rose-500'}`} />
                          <span>Rm {room.roomNumber}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                ))}

              
                <p className="mt-4 text-[10px] text-slate-450 text-center italic border-t border-slate-100 pt-3">
                  Click any room brick to verify and configure properties.
                </p>
              </div>

            </div>

          </div>
        </>
      )}

    </div>
  );
};

function daySlug(dateStr: string) {
  try {
    const p = dateStr.split('-');
    return `${p[2]}/${p[1]}`;
  } catch (e) {
    return dateStr;
  }
}
