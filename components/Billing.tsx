'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from "react";
import {
  Bill,
  Guest,
  Room,
  Food,
  RoomItem,
  FoodItem,
  BillStatus,
} from "@/lib/types";
import { dedupeRoomsByNumber } from "@/lib/rooms";
import {
  Plus,
  Search,
  ShoppingCart,
  Printer,
  ChevronRight,
  FolderOpen,
  CheckCircle,
  Clock,
  Trash2,
  Lock,
  ArrowLeft,
  UserCheck,
  Coffee,
  Bed,
  Layers,
  Save,
  TrendingUp,
  History,
} from "lucide-react";
import { Guests } from "@/components/Guests";
import { apiFetch } from "@/lib/api";
import { useAuth } from "@/components/auth-provider";
import { hasPermission } from "@/lib/permissions";
import type { SystemSettings } from "@/lib/types";

interface BillingProps {
  onShowReceipt: (bill: Bill) => void;
}

export const Billing: React.FC<BillingProps> = ({
  onShowReceipt,
}) => {
  const [bills, setBills] = useState<Bill[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [foods, setFoods] = useState<Food[]>([]);

  // Search & List Filters
  const [listStatus, setListStatus] = useState<BillStatus | "All">("All");
  const [term, setTerm] = useState("");

  // Terminal UI Active Mode
  const [isTerminalActive, setIsTerminalActive] = useState(false);
  const [terminalBillId, setTerminalBillId] = useState<string | null>(null);

  // Terminal Form State
  const [selectedGuest, setSelectedGuest] = useState<Guest | null>(null);
  const [isSelectingGuest, setIsSelectingGuest] = useState(false);

  // Customer inline creation fields state
  const [customerInputMode, setCustomerInputMode] = useState<
    "new" | "existing"
  >("new");
  const [newGuestName, setNewGuestName] = useState("");
  const [newGuestPhone, setNewGuestPhone] = useState("");
  const [newGuestNic, setNewGuestNic] = useState("");
  const [newGuestAddress, setNewGuestAddress] = useState("Hotel Guest");
  const [newGuestCheckIn, setNewGuestCheckIn] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [newGuestCheckOut, setNewGuestCheckOut] = useState(
    new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
  );

  const [selectedRooms, setSelectedRooms] = useState<RoomItem[]>([]);
  const [selectedFoods, setSelectedFoods] = useState<FoodItem[]>([]);

  // Helpers for food items adding
  const [addFoodId, setAddFoodId] = useState("");
  const [addFoodQty, setAddFoodQty] = useState(1);

  // Helpers for rooms adding
  const [addRoomId, setAddRoomId] = useState("");
  const [addRoomNights, setAddRoomNights] = useState(1);
  const [addRoomDiscount, setAddRoomDiscount] = useState(0);

  // Quick taps category state
  const [quickTapsTab, setQuickTapsTab] = useState<"rooms" | "food">("rooms");
  const [selectedFoodCategory, setSelectedFoodCategory] = useState<string>("All");

  const { user: currentUser } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  const canDeleteBill = !currentUser || currentUser.role !== 'receptionist' ||
    hasPermission(currentUser.role, 'allowReceptionistDelete', settings);
  const canApplyDiscount = !currentUser || currentUser.role !== 'receptionist' ||
    hasPermission(currentUser.role, 'allowReceptionistDiscount', settings);
  const canModifyPrice = !currentUser || currentUser.role !== 'receptionist' ||
    hasPermission(currentUser.role, 'allowReceptionistModifyPrice', settings);

  const displayRooms = useMemo(() => dedupeRoomsByNumber(rooms), [rooms]);

  useEffect(() => {
    fetchBills();
    fetchRooms();
    fetchFoods();

    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        console.error('Failed to sync settings in Billing module', err);
      }
    };
    fetchSettings();
  }, []);

  const fetchBills = async () => {
    try {
      const res = await fetch("/api/bills");
      const data = await res.json();
      if (res.ok) setBills(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/rooms");
      const data = await res.json();
      if (res.ok) setRooms(data);
    } catch (e) {
      console.error(e);
    }
  };

  const fetchFoods = async () => {
    try {
      const res = await fetch("/api/foods");
      const data = await res.json();
      if (res.ok) setFoods(data);
    } catch (e) {
      console.error(e);
    }
  };

  // Open clean blank billing terminal
  const handleCreateNew = () => {
    setTerminalBillId(null);
    setSelectedGuest(null);
    setSelectedRooms([]);
    setSelectedFoods([]);
    setAddFoodId("");
    setAddFoodQty(1);
    setIsSelectingGuest(false);

    // Clear inline guest credentials field
    setNewGuestName("");
    setNewGuestPhone("");
    setNewGuestNic("");
    setNewGuestAddress("Hotel Guest");
    setNewGuestCheckIn(new Date().toISOString().split("T")[0]);
    setNewGuestCheckOut(
      new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split("T")[0],
    );
    setCustomerInputMode("new");

    setIsTerminalActive(true);
  };

  // Open billing terminal prefilled for resume
  const handleResumeBill = (bill: Bill) => {
    setTerminalBillId(bill.id);
    setSelectedGuest(bill.guestDetails);

    // Convert current room items to editable fields with back-computed values
    const populatedRoomsObj = bill.roomItems.map((ri: any) => {
      const dbRoomMatch = rooms.find((r) => r.id === ri.roomId);
      const originalRate = dbRoomMatch ? dbRoomMatch.price : ri.pricePerNight;
      const discountRecorded = Math.max(0, originalRate - ri.pricePerNight);
      return {
        ...ri,
        originalPricePerNight: originalRate,
        discount: discountRecorded,
      };
    });

    setSelectedRooms(populatedRoomsObj);
    setSelectedFoods(bill.foodItems);

    // Prefill form states in case they want to modify
    setNewGuestName(bill.guestDetails.name);
    setNewGuestPhone(bill.guestDetails.phone);
    setNewGuestNic(bill.guestDetails.nic);
    setNewGuestAddress(bill.guestDetails.address || "Hotel Guest");
    setNewGuestCheckIn(bill.guestDetails.checkInDate.split("T")[0]);
    setNewGuestCheckOut(bill.guestDetails.checkOutDate.split("T")[0]);
    setCustomerInputMode("existing");
    setIsTerminalActive(true);
  };

  // Quick action tap triggers
  const handleQuickTapRoom = (room: Room) => {
    const existingIndex = selectedRooms.findIndex(
      (ri) => ri.roomId === room.id || ri.roomNumber === room.roomNumber,
    );
    if (existingIndex > -1) {
      const updated = [...selectedRooms];
      updated[existingIndex].nights += 1;
      setSelectedRooms(updated);
    } else {
      setSelectedRooms([
        ...selectedRooms,
        {
          roomId: room.id,
          roomNumber: room.roomNumber,
          roomType: room.roomType,
          pricePerNight: room.price,
          nights: 1,
          originalPricePerNight: room.price,
          discount: 0,
        } as any,
      ]);
    }
  };

  const handleQuickTapFood = (food: Food) => {
    const existingIndex = selectedFoods.findIndex(
      (fi) => fi.foodId === food.id,
    );
    if (existingIndex > -1) {
      const updated = [...selectedFoods];
      updated[existingIndex].quantity += 1;
      setSelectedFoods(updated);
    } else {
      setSelectedFoods([
        ...selectedFoods,
        {
          foodId: food.id,
          foodName: food.foodName,
          price: food.price,
          quantity: 1,
        },
      ]);
    }
  };

  const handleAddRoom = () => {
    if (!addRoomId) return;
    const room = rooms.find((r) => r.id === addRoomId);
    if (!room) return;

    const discountAmount = Number(addRoomDiscount) || 0;
    const finalPricePerNight = Math.max(0, room.price - discountAmount);
    if (currentUser?.role === 'receptionist') {
      if (discountAmount > 0 && !canApplyDiscount) return;
      if (finalPricePerNight !== room.price && !canModifyPrice && !canApplyDiscount) return;
    }

    const existingIndex = selectedRooms.findIndex(
      (ri) => ri.roomId === room.id || ri.roomNumber === room.roomNumber,
    );
    if (existingIndex > -1) {
      const updated = [...selectedRooms];
      updated[existingIndex] = {
        ...updated[existingIndex],
        nights: Number(addRoomNights),
        pricePerNight: finalPricePerNight,
        originalPricePerNight: room.price,
        discount: discountAmount,
      } as any;
      setSelectedRooms(updated);
    } else {
      setSelectedRooms([
        ...selectedRooms,
        {
          roomId: room.id,
          roomNumber: room.roomNumber,
          roomType: room.roomType,
          pricePerNight: finalPricePerNight,
          nights: Number(addRoomNights),
          originalPricePerNight: room.price,
          discount: discountAmount,
        } as any,
      ]);
    }
    setAddRoomId("");
    setAddRoomNights(1);
    setAddRoomDiscount(0);
  };

  const handleRemoveRoom = (roomId: string) => {
    setSelectedRooms(selectedRooms.filter((ri) => ri.roomId !== roomId));
  };

  const handleAddFood = () => {
    if (!addFoodId) return;
    const food = foods.find((f) => f.id === addFoodId);
    if (!food) return;

    const existing = selectedFoods.find((fi) => fi.foodId === food.id);
    if (existing) {
      existing.quantity += Number(addFoodQty);
      setSelectedFoods([...selectedFoods]);
    } else {
      setSelectedFoods([
        ...selectedFoods,
        {
          foodId: food.id,
          foodName: food.foodName,
          price: food.price,
          quantity: Number(addFoodQty),
        },
      ]);
    }
    setAddFoodId("");
    setAddFoodQty(1);
  };

  const updateFoodQty = (foodId: string, delta: number) => {
    const updated = selectedFoods.map((fi) => {
      if (fi.foodId === foodId) {
        return { ...fi, quantity: Math.max(1, fi.quantity + delta) };
      }
      return fi;
    });
    setSelectedFoods(updated);
  };

  const handleRemoveFood = (foodId: string) => {
    setSelectedFoods(selectedFoods.filter((fi) => fi.foodId !== foodId));
  };

  // Calculations
  const roomSubtotal = selectedRooms.reduce(
    (acc, ri) => acc + ri.pricePerNight * ri.nights,
    0,
  );
  const totalOriginalRoomCost = selectedRooms.reduce(
    (acc, ri: any) =>
      acc + (ri.originalPricePerNight || ri.pricePerNight) * ri.nights,
    0,
  );
  const totalRoomDiscounts = Math.max(0, totalOriginalRoomCost - roomSubtotal);

  const foodSubtotal = selectedFoods.reduce(
    (acc, fi) => acc + fi.price * fi.quantity,
    0,
  );
  const scPercent = settings?.serviceChargePercent ?? 10;
  const serviceCharge = Math.round(foodSubtotal * (scPercent / 100));
  const grandTotal = roomSubtotal + foodSubtotal + serviceCharge;

  // Primary Transaction save gatekeeper
  const ensureGuestRegistered = async (): Promise<Guest | null> => {
    if (customerInputMode === "existing") {
      if (!selectedGuest) {
        alert("Please select or allocate an existing hotel guest profile.");
        return null;
      }
      return selectedGuest;
    }

    // Inline form mode validations
    if (!newGuestName.trim()) {
      alert("Registration error: Guest Full name is a mandatory field.");
      return null;
    }
    if (!newGuestNic.trim()) {
      alert(
        "Registration error: Guest NIC or Passport identify number is mandatory.",
      );
      return null;
    }

    try {
      const guestPayload = {
        name: newGuestName.trim(),
        phone: newGuestPhone.trim(),
        nic: newGuestNic.trim(),
        address: newGuestAddress || "Hotel Guest Address",
        checkInDate: newGuestCheckIn,
        checkOutDate: newGuestCheckOut,
      };

      const res = await apiFetch("/api/guests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(guestPayload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Autocreate guest endpoint failed.");
      }

      const registeredObj = await res.json();
      return registeredObj;
    } catch (e: any) {
      alert(
        "Critical: Failed to auto-register new customer profile. " + e.message,
      );
      return null;
    }
  };

  const handleSaveBill = async (status: BillStatus) => {
    const activeGuest = await ensureGuestRegistered();
    if (!activeGuest) return;

    // Package stay payload
    const payload = {
      id: terminalBillId || undefined,
      guestId: activeGuest.id,
      guestDetails: activeGuest,
      roomItems: selectedRooms,
      foodItems: selectedFoods,
      status,
    };

    try {
      const res = await apiFetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || "Failed to capture bill state.");
      }

      const savedBill = await res.json();

      await fetchBills();
      await fetchRooms();
      setIsTerminalActive(false);

      // Instantly open the print/receipt roll modal for completed checkouts
      if (status === "Completed") {
        onShowReceipt(savedBill);
      }
    } catch (e: any) {
      alert(e.message);
    }
  };

  const filteredBills = bills
    .filter((b) => {
      const termMatches =
        b.guestDetails.name.toLowerCase().includes(term.toLowerCase()) ||
        b.id.toLowerCase().includes(term.toLowerCase());
      const statusMatches = listStatus === "All" || b.status === listStatus;
      return termMatches && statusMatches;
    })
    .sort((a, b) => {
      // Group Active bills at the top, Completed bills below them
      if (a.status !== b.status) {
        return a.status === "Active" ? -1 : 1;
      }
      // Within the same status, sort descending by updatedAt timestamp (newest first)
      const timeA = new Date(a.updatedAt || a.createdAt).getTime();
      const timeB = new Date(b.updatedAt || b.createdAt).getTime();
      return timeB - timeA;
    });

  // Calculate live statistics for top indicators
  const totalActiveBills = bills.filter((b) => b.status === "Active").length;
  const totalCompletedBills = bills.filter((b) => b.status === "Completed").length;
  
  const totalOutstandingLedger = bills
    .filter((b) => b.status === "Active")
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const totalSettledTurnover = bills
    .filter((b) => b.status === "Completed")
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  // Helper for name initials generator
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

  // 1. Calculate Revenue (Last 7 Days) — Daily total revenue across all categories
  const last7DaysData = Array.from({ length: 7 }).map((_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (6 - i));
    const dateStr = d.toISOString().split("T")[0];

    const dayCompletedBills = bills.filter((b) => {
      if (b.status !== "Completed") return false;
      const billDate = (b.updatedAt || b.createdAt || "").split("T")[0];
      return billDate === dateStr;
    });

    const totalRev = dayCompletedBills.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const roomRev = dayCompletedBills.reduce((sum, b) => sum + (b.roomSubtotal || 0), 0);
    const foodRev = dayCompletedBills.reduce(
      (sum, b) => sum + ((b.foodSubtotal || 0) + (b.serviceCharge || 0)),
      0
    );
    const count = dayCompletedBills.length;

    const dayLabel = d.toLocaleDateString("en-US", { weekday: "short" });
    const dateLabel = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });

    return {
      dateStr,
      dayLabel,
      dateLabel,
      totalRev,
      roomRev,
      foodRev,
      count,
    };
  });

  const maxSevenDayRev = Math.max(...last7DaysData.map((d) => d.totalRev), 5000);

  // 2. Active Folios (current bills held open) sorted by creation date descending
  const activeFolios = bills
    .filter((b) => b.status === "Active")
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  // 3. Summary Bills (Recent 10 closed bills)
  const recentClosedBills = bills
    .filter((b) => b.status === "Completed")
    .sort((a, b) => {
      const dateA = new Date(a.updatedAt || a.createdAt).getTime();
      const dateB = new Date(b.updatedAt || b.createdAt).getTime();
      return dateB - dateA;
    })
    .slice(0, 10);

  return (
    <div className="space-y-6">
      {!isTerminalActive ? (
        /* BILLS DIRECTORY VIEW */
        <div className="space-y-6">
          {/* Header Title Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
                <ShoppingCart className="h-6 w-6 text-indigo-600" />
                Frontdesk Billing Center
              </h1>
              <p className="text-sm text-slate-500">
                Browse active stay ledgers, configure checkouts, and print invoice audits
              </p>
            </div>

            <button
              onClick={handleCreateNew}
              className="flex items-center gap-2 py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-100 transition-all text-sm border-0 cursor-pointer"
            >
              <Plus className="h-4.5 w-4.5" />
              Create New Guest Bill
            </button>
          </div>

          {/* Quick Metrics KPI cards for operator convenience */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="bg-emerald-50/50 border border-emerald-100 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-emerald-800 uppercase tracking-wider">
                  Live Occupancy Ledgers
                </p>
                <p className="text-xl font-extrabold text-slate-900 mt-1">
                  {totalActiveBills} Active
                </p>
              </div>
              <div className="bg-emerald-500/10 text-emerald-800 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                Pending Settle
              </div>
            </div>

            <div className="bg-indigo-50/50 border border-indigo-100 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-indigo-800 uppercase tracking-wider">
                  Outstanding Receivables
                </p>
                <p className="text-xl font-extrabold text-indigo-900 mt-1">
                  Rs. {totalOutstandingLedger.toLocaleString()}
                </p>
              </div>
              <div className="bg-indigo-500/10 text-indigo-800 text-[11px] font-bold px-2.5 py-1 rounded-lg">
                Unbilled Flow
              </div>
            </div>

            <div className="bg-slate-55 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Archived / Settled Receipts
                </p>
                <p className="text-xl font-extrabold text-slate-800 mt-1">
                  {totalCompletedBills} Closed
                </p>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">
                Rs. {totalSettledTurnover.toLocaleString()}
              </span>
            </div>
          </div>          {/* Main Grid: Left side contains searchable list of bills, right side contains widgets */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6" id="billing-main-grid">
            
            {/* LEFT / MAIN COLUMN: DIRECTORY & SEARCH */}
            <div className="lg:col-span-2 space-y-6" id="billing-directory-column">
              {/* Filtering and search rows */}
              <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="relative flex-1 max-w-sm">
                  <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search bills by ID or Guest Name..."
                    value={term}
                    onChange={(e) => setTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600 transition-all font-sans"
                  />
                </div>

                <div className="flex gap-2.5 overflow-x-auto">
                  <button
                    onClick={() => setListStatus("All")}
                    className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold tracking-wide transition-all border-0 cursor-pointer flex items-center gap-1.5 ${
                      listStatus === "All"
                        ? "bg-indigo-600 text-white shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-650"
                    }`}
                  >
                    <span>All Transactions</span>
                    <span className="bg-black/10 text-[9px] px-1.5 py-0.5 rounded-full font-mono">
                      {bills.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setListStatus("Active")}
                    className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold tracking-wide transition-all border-0 cursor-pointer flex items-center gap-1.5 ${
                      listStatus === "Active"
                        ? "bg-emerald-600 text-white shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-650"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                    <span>Active Ledger</span>
                    <span className="bg-black/10 text-[9px] px-1.5 py-0.5 rounded-full font-mono">
                      {totalActiveBills}
                    </span>
                  </button>

                  <button
                    onClick={() => setListStatus("Completed")}
                    className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold tracking-wide transition-all border-0 cursor-pointer flex items-center gap-1.5 ${
                      listStatus === "Completed"
                        ? "bg-slate-700 text-white shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-650"
                    }`}
                  >
                    <span>Completed</span>
                    <span className="bg-black/10 text-[9px] px-1.5 py-0.5 rounded-full font-mono">
                      {totalCompletedBills}
                    </span>
                  </button>
                </div>
              </div>

              {/* Bills Grid / List */}
              {filteredBills.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-100">
                  <p className="text-slate-400 text-sm">
                    No billing records match the selected filters.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Desktop Tabular View (Visible on Medium and larger screens) */}
                  <div className="hidden md:block bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
                    <div className="overflow-x-auto font-sans">
                      <table className="w-full text-left text-sm whitespace-nowrap">
                        <thead>
                          <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                            <th className="py-4 px-6">ID / Created Date</th>
                            <th className="py-4 px-6">Guest Profile</th>
                            <th className="py-4 px-6">Room Details</th>
                            <th className="py-4 px-6">Ledger Balance</th>
                            <th className="py-4 px-6">State Status</th>
                            <th className="py-4 px-6 ">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-50 text-slate-700">
                          {filteredBills.map((bill) => {
                            const isCompleted = bill.status === "Completed";
                            return (
                              <tr
                                key={bill.id}
                                className={`hover:bg-slate-50/50 transition-colors ${
                                  !isCompleted ? "bg-emerald-50/5" : ""
                                }`}
                              >
                                <td className="py-4 px-6">
                                  <span className="font-mono text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                                    #{bill.id.substring(0, 12).toUpperCase()}
                                  </span>
                                  <div className="text-[10px] text-slate-400 mt-1.5 flex items-center gap-1">
                                    <Clock className="h-3 w-3 text-slate-300" />
                                    {new Date(bill.createdAt).toLocaleDateString()}
                                  </div>
                                </td>

                                <td className="py-4 px-6">
                                  <div className="flex items-center gap-3">
                                    <div className={`h-8 w-8 rounded-full flex items-center justify-center font-bold text-xs ${
                                      isCompleted ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-800"
                                    }`}>
                                      {getGuestInitials(bill.guestDetails.name)}
                                    </div>
                                    <div>
                                      <div className="font-semibold text-slate-800">
                                        {bill.guestDetails.name}
                                      </div>
                                      <div className="text-xs text-slate-400 mt-0.5">
                                        NIC: {bill.guestDetails.nic}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-4 px-6 text-xs text-slate-500">
                                  <div className="flex flex-wrap gap-1 max-w-xs">
                                    {bill.roomItems.length === 0 ? (
                                      <span className="text-slate-400 italic">
                                        No rooms allocated
                                      </span>
                                    ) : (
                                      bill.roomItems.map((r, itemIdx) => (
                                        <span
                                          key={itemIdx}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50/70 text-blue-700 border border-blue-100 rounded-md text-[11px] font-semibold"
                                        >
                                          <Bed className="h-3 w-3 text-blue-500" />
                                          Rm {r.roomNumber}
                                        </span>
                                      ))
                                    )}
                                  </div>
                                </td>

                                <td className="py-4 px-6 font-extrabold text-slate-900 text-sm">
                                  Rs. {bill.totalAmount.toLocaleString()}
                                </td>

                                <td className="py-4 px-6">
                                  {!isCompleted ? (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      LIVE STAY
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-[10px] font-bold gap-1 bg-slate-100 text-slate-600 border border-slate-200">
                                      <CheckCircle className="h-3 w-3 text-slate-400" />
                                      CONCLUDED
                                    </span>
                                  )}
                                </td>

                                <td className="py-4 px-6 text-right">
                                  {!isCompleted ? (
                                    <button
                                      onClick={() => handleResumeBill(bill)}
                                      className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-2xs border-0 cursor-pointer"
                                    >
                                      View / Settle
                                    </button>
                                  ) : (
                                    <button
                                      onClick={() => onShowReceipt(bill)}
                                      className="py-1.5 px-3 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 inline-flex border-0 cursor-pointer"
                                    >
                                      <Printer className="h-3.5 w-3.5 text-slate-500" />
                                      Receipt Roll
                                    </button>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Mobile Stacked Card View (Visible on Mobile screens < md) */}
                  <div className="block md:hidden space-y-3">
                    {filteredBills.map((bill) => {
                      const isCompleted = bill.status === "Completed";
                      return (
                        <div
                          key={bill.id}
                          className={`bg-white p-4 rounded-xl border shadow-2xs space-y-3 transition-colors ${
                            !isCompleted ? "border-emerald-100 bg-emerald-50/5" : "border-slate-150"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs text-indigo-600 font-bold bg-indigo-50 px-2 py-0.5 rounded-md">
                              #{bill.id.substring(0, 12).toUpperCase()}
                            </span>
                            {!isCompleted ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold gap-1 bg-emerald-50 text-emerald-750 border border-emerald-200">
                                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                LIVE STAY
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold gap-1 bg-slate-100 text-slate-600 border border-slate-200">
                                <CheckCircle className="h-3 w-3 text-slate-400" />
                                CONCLUDED
                              </span>
                            )}
                          </div>

                          <div className="flex items-start gap-3">
                            <div className={`h-9 w-9 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${
                              isCompleted ? "bg-slate-100 text-slate-600" : "bg-emerald-100 text-emerald-805"
                            }`}>
                              {getGuestInitials(bill.guestDetails.name)}
                            </div>
                            <div className="min-w-0 flex-1">
                              <h4 className="font-bold text-slate-800 text-sm truncate">{bill.guestDetails.name}</h4>
                              <p className="text-[11px] text-slate-400 mt-0.5">NIC: {bill.guestDetails.nic}</p>
                              <p className="text-[10px] text-slate-407 mt-1.5 flex items-center gap-1">
                                <Clock className="h-3.5 w-3.5 text-slate-300" />
                                Created: {new Date(bill.createdAt).toLocaleDateString()}
                              </p>
                            </div>
                          </div>

                          <div className="border-t border-slate-50 pt-2.5 flex justify-between items-center text-xs">
                            <div>
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Room Details</p>
                              <div className="flex flex-wrap gap-1 mt-1">
                                {bill.roomItems.length === 0 ? (
                                  <span className="text-slate-405 italic text-[10px]">None</span>
                                ) : (
                                  bill.roomItems.map((r, itemIdx) => (
                                    <span
                                      key={itemIdx}
                                      className="inline-flex items-center gap-0.5 px-1.5 py-0.2 bg-blue-50/70 text-blue-700 border border-blue-100 rounded-md text-[10px] font-semibold"
                                    >
                                      Rm {r.roomNumber}
                                    </span>
                                  ))
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wide">Ledger Balance</p>
                              <p className="font-extrabold text-slate-900 mt-1 font-mono">
                                Rs. {bill.totalAmount.toLocaleString()}
                              </p>
                            </div>
                          </div>

                          <div className="pt-2 border-t border-slate-50 flex gap-2">
                            {!isCompleted ? (
                              <button
                                onClick={() => handleResumeBill(bill)}
                                className="w-full py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition-all border-0 shadow-2xs cursor-pointer flex items-center justify-center"
                              >
                                View / Settle Bill
                              </button>
                            ) : (
                              <button
                                onClick={() => onShowReceipt(bill)}
                                className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer flex items-center justify-center gap-1.5"
                              >
                                <Printer className="h-3.5 w-3.5 text-slate-500" />
                                View Receipt Roll
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* RIGHT COLUMN: REVENUE DASHBOARD & GENERAL OVERVIEW WIDGETS */}
            <div className="lg:col-span-1 space-y-6" id="billing-sidebar-widgets">
              
              {/* 1. Revenue (Last 7 Days) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4" id="widget-revenue-7days">
                <div>
                  <div className="flex items-center gap-2">
                    <TrendingUp className="h-4.5 w-4.5 text-indigo-600" />
                    <h3 className="font-display font-bold text-slate-800 text-sm">
                      Revenue (Last 7 Days)
                    </h3>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">
                    Daily total revenue across all categories.
                  </p>
                </div>

                <div className="space-y-3 pt-1">
                  {last7DaysData.map((d) => {
                    const percentWidth = Math.min(100, Math.max(2, (d.totalRev / maxSevenDayRev) * 100));
                    const percentRoom = d.totalRev > 0 ? (d.roomRev / d.totalRev) * 100 : 0;
                    const percentFood = d.totalRev > 0 ? (d.foodRev / d.totalRev) * 100 : 0;

                    return (
                      <div key={d.dateStr} className="space-y-1">
                        <div className="flex items-center justify-between text-xs font-medium">
                          <span className="text-slate-500 font-sans" title={d.dateStr}>
                            {d.dayLabel}, {d.dateLabel}
                          </span>
                          <span className="font-mono font-bold text-slate-800">
                            Rs. {d.totalRev.toLocaleString()}
                          </span>
                        </div>
                        {/* Bar Track */}
                        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden flex items-center relative group/bar">
                          {d.totalRev > 0 ? (
                            <div
                              style={{ width: `${percentWidth}%` }}
                              className="h-full rounded-full overflow-hidden flex"
                            >
                              {/* Rooms Portion */}
                              {d.roomRev > 0 && (
                                <div
                                  style={{ width: `${percentRoom}%` }}
                                  className="h-full bg-indigo-500 transition-all hover:opacity-90"
                                  title={`Room Inflow: Rs. ${d.roomRev.toLocaleString()}`}
                                />
                              )}
                              {/* Food / Service Charge Portion */}
                              {d.foodRev > 0 && (
                                <div
                                  style={{ width: `${percentFood}%` }}
                                  className="h-full bg-amber-500 transition-all hover:opacity-90"
                                  title={`Food Selling: Rs. ${d.foodRev.toLocaleString()}`}
                                />
                              )}
                            </div>
                          ) : (
                            <div className="w-1 h-full bg-slate-200" title="No Revenue Captured" />
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Legend bar */}
                <div className="flex items-center gap-4 pt-2 border-t border-slate-50 text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-indigo-500 rounded-sm" />
                    <span>Rooms</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 bg-amber-500 rounded-sm" />
                    <span>Food & S.C.</span>
                  </div>
                </div>
              </div>

              {/* 2. Current Bills (Active Folios) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4" id="widget-active-folios">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <FolderOpen className="h-4.5 w-4.5 text-emerald-600" />
                      <h3 className="font-display font-bold text-slate-800 text-sm">
                        Current Bills (Active Folios)
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      Bills that are currently held open.
                    </p>
                  </div>
                  <span className="bg-emerald-50 text-emerald-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-100 font-mono">
                    {activeFolios.length} Open
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {activeFolios.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-150 rounded-xl">
                      <p className="text-xs text-slate-400 italic">No Active folios open.</p>
                    </div>
                  ) : (
                    activeFolios.map((b) => {
                      const guestInitials = getGuestInitials(b.guestDetails.name);
                      return (
                        <div
                          key={b.id}
                          className="flex items-center justify-between p-2.5 bg-slate-50 hover:bg-slate-100/70 border border-slate-100/50 rounded-xl transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-emerald-100 text-emerald-800 flex items-center justify-center text-[10px] font-extrabold flex-shrink-0">
                              {guestInitials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-bold text-slate-800 truncate" title={b.guestDetails.name}>
                                {b.guestDetails.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                <span className="bg-emerald-50 text-emerald-800 px-1 py-0.2 rounded-sm font-semibold text-[8px] uppercase">Live Stay</span>
                                <span className="truncate">
                                  {b.roomItems.length > 0 ? `Rm ${b.roomItems.map(r => r.roomNumber).join(",")}` : "No Room Info"}
                                </span>
                              </p>
                            </div>
                          </div>
                          
                          <div className="text-right flex-shrink-0 flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-xs font-extrabold text-slate-900">
                                Rs. {b.totalAmount.toLocaleString()}
                              </p>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.2">
                                #{b.id.substring(0, 6).toUpperCase()}
                              </p>
                            </div>
                            <button
                              onClick={() => handleResumeBill(b)}
                              className="p-1 px-1.5 bg-white hover:bg-indigo-600 text-slate-500 hover:text-white rounded-md border border-slate-200 hover:border-indigo-600 font-bold transition-all text-[10px] cursor-pointer"
                              title="Express Settle / View POS"
                            >
                              POS
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* 3. Summary Bills (Recent) */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4" id="widget-recent-summary-bills">
                <div className="flex items-center justify-between pb-1">
                  <div>
                    <div className="flex items-center gap-1.5">
                      <History className="h-4.5 w-4.5 text-slate-600" />
                      <h3 className="font-display font-bold text-slate-800 text-sm">
                        Summary Bills (Recent)
                      </h3>
                    </div>
                    <p className="text-[11px] text-slate-400 mt-1">
                      A summary of the 10 most recently closed bills across the system.
                    </p>
                  </div>
                  <span className="bg-slate-100 text-slate-700 text-[10px] font-bold px-2 py-0.5 rounded-full border border-slate-200 font-mono">
                    {recentClosedBills.length} Settled
                  </span>
                </div>

                <div className="space-y-2.5 max-h-[300px] overflow-y-auto pr-1">
                  {recentClosedBills.length === 0 ? (
                    <div className="text-center py-6 border border-dashed border-slate-150 rounded-xl">
                      <p className="text-xs text-slate-400 italic">No recently completed transactions.</p>
                    </div>
                  ) : (
                    recentClosedBills.map((b) => {
                      const guestInitials = getGuestInitials(b.guestDetails.name);
                      return (
                        <div
                          key={b.id}
                          className="flex items-center justify-between p-2.5 bg-slate-50/50 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className="h-8 w-8 rounded-full bg-slate-200 text-slate-750 flex items-center justify-center text-[10px] font-extrabold flex-shrink-0">
                              {guestInitials}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-700 truncate" title={b.guestDetails.name}>
                                {b.guestDetails.name}
                              </p>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.5 flex items-center gap-1">
                                <span className="bg-slate-200 text-slate-600 px-1 py-0.2 rounded-sm font-semibold text-[8px] uppercase">Settled</span>
                                <span>
                                  {new Date(b.updatedAt || b.createdAt).toLocaleDateString(undefined, {
                                    month: 'short',
                                    day: 'numeric',
                                  })}
                                </span>
                              </p>
                            </div>
                          </div>

                          <div className="text-right flex-shrink-0 flex items-center gap-2">
                            <div className="text-right">
                              <p className="text-xs font-extrabold text-slate-900">
                                Rs. {b.totalAmount.toLocaleString()}
                              </p>
                              <p className="text-[9px] text-slate-400 font-mono mt-0.2">
                                #{b.id.substring(0, 6).toUpperCase()}
                              </p>
                            </div>
                            <button
                              onClick={() => onShowReceipt(b)}
                              className="p-1.5 bg-white hover:bg-slate-100 text-slate-500 hover:text-indigo-600 rounded-md border border-slate-200 font-bold transition-all cursor-pointer flex items-center justify-center"
                              title="Print Receipt"
                            >
                              <Printer className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

            </div>

          </div>
        </div>
      ) : (
        /* BILLING TERMINAL PANEL VIEW (HIGH SPEED MULTI-PANEL SPLIT) */
        <div className="space-y-4">
          {/* Top Panel Back Header */}
          <div className="flex items-center justify-between bg-white px-4 py-3 rounded-xl border border-slate-200">
            <div className="flex items-center gap-3">
              <button
                onClick={() => setIsTerminalActive(false)}
                className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg transition-all text-slate-600"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-base font-bold text-slate-900 font-display">
                  Reception POS Express Terminal
                </h1>
                <p className="text-[11px] text-slate-400">
                  {terminalBillId
                    ? "Modifying Registered Bill"
                    : "New High-Density Stay Entry Sheet"}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-slate-400 uppercase">
                Input profile mode:
              </span>
              <div className="inline-flex rounded-lg bg-slate-100 p-0.5">
                <button
                  type="button"
                  onClick={() => setCustomerInputMode("new")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    customerInputMode === "new"
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-400"
                  }`}
                >
                  New Customer
                </button>
                <button
                  type="button"
                  onClick={() => setCustomerInputMode("existing")}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all ${
                    customerInputMode === "existing"
                      ? "bg-white text-indigo-600 shadow-xs"
                      : "text-slate-400"
                  }`}
                >
                  Select Existing
                </button>
              </div>
            </div>
          </div>

          {/* SPLIT HIGH SPEED CORES: LEFT FORM + MIDDLE SUMMARY COLUMN + RIGHT TAPLAUNCHER */}
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
            {/* COLUMN 1 & Column 2 combined: Left & forms (span 8) */}
            <div className="lg:col-span-8 space-y-4">
              {/* Profile setup: New Customer Form or Select existing */}
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                {customerInputMode === "new" ? (
                  <div className="space-y-3.5">
                    <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-slate-50">
                      <UserCheck className="h-4 w-4 text-emerald-500" />
                      Add Customer Details (Instant Register)
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Guest Full Name *
                        </label>
                        <input
                          type="text"
                          required
                          value={newGuestName}
                          onChange={(e) => setNewGuestName(e.target.value)}
                          placeholder="e.g. David Tennant"
                          className="w-full px-3 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          NIC or Passport No *
                        </label>
                        <input
                          type="text"
                          required
                          value={newGuestNic}
                          onChange={(e) => setNewGuestNic(e.target.value)}
                          placeholder="e.g. 1993049102V"
                          className="w-full px-3 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
                        />
                      </div>
                    </div>

                    <div className="pt-1">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase mb-1">
                          Check-in Date
                        </label>
                        <input
                          type="date"
                          value={newGuestCheckIn}
                          onChange={(e) => setNewGuestCheckIn(e.target.value)}
                          className="w-full px-3 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-lg font-mono"
                        />
                      </div>
                    </div>
                  </div>
                ) : (
                  <div>
                    <div className="flex items-center justify-between pb-2 border-b border-slate-50 mb-3">
                      <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest flex items-center gap-2">
                        <UserCheck className="h-4 w-4 text-indigo-500" />
                        Selected Customer Profile
                      </h3>
                      {!selectedGuest && (
                        <button
                          onClick={() => setIsSelectingGuest(!isSelectingGuest)}
                          className="text-xs font-bold text-indigo-600 hover:underline"
                        >
                          {isSelectingGuest
                            ? "Hide List Selector"
                            : "Browse All Registered Guests"}
                        </button>
                      )}
                    </div>

                    {isSelectingGuest ? (
                      <div className="p-4 bg-slate-50 rounded-lg border border-dashed border-slate-200 max-h-[300px] overflow-y-auto">
                        <p className="text-[10px] font-bold text-slate-400 uppercase mb-3">
                          Single-Tap Select database profile:
                        </p>
                        <Guests
                          onSelectGuest={(guest) => {
                            setSelectedGuest(guest);
                            setIsSelectingGuest(false);
                          }}
                        />
                      </div>
                    ) : selectedGuest ? (
                      <div className="flex items-center justify-between bg-emerald-50 p-3.5 rounded-lg border border-emerald-150">
                        <div>
                          <h4 className="font-bold text-slate-800 text-sm">
                            {selectedGuest.name}
                          </h4>
                          <p className="text-slate-500 text-xs mt-1">
                            NIC: {selectedGuest.nic} | Address:{" "}
                            {selectedGuest.address}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setSelectedGuest(null)}
                          className="text-xs text-rose-500 hover:font-bold hover:underline font-semibold"
                        >
                          De-allocate
                        </button>
                      </div>
                    ) : (
                      <div className="py-6 text-center bg-slate-50 rounded-lg border border-dashed border-slate-200">
                        <p className="text-xs text-slate-500 mb-3">
                          No existing profile chosen from registry ledger.
                        </p>
                        <button
                          type="button"
                          onClick={() => setIsSelectingGuest(true)}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] uppercase rounded-md shadow-xs"
                        >
                          Search guest database
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* MAIN TERMINAL DESK: EXPRESS TAP SELECTOR + INTEGRATED ACTIVE LEDGER SELECTIONS */}
              <div className="bg-slate-900 border border-slate-800 rounded-2xl shadow-lg overflow-hidden ">
                
                {/* LEFT PORTION: ⚡ EXPRESS TAP SELECTOR BOARD (md:col-span-7) */}
                <div className="">
                  <div className="p-4 bg-slate-950 border-b border-slate-850 flex items-center justify-between">
                    <h3 className="text-xs font-black uppercase text-yellow-400 tracking-wider flex items-center gap-1.5">
                      <span>⚡ EXPRESS TAP SELECTOR</span>
                    </h3>
                    <div className="inline-flex rounded-md bg-slate-850 p-0.5 border border-slate-700/60">
                      <button
                        type="button"
                        onClick={() => setQuickTapsTab("rooms")}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-sm transition-all border-0 cursor-pointer ${
                          quickTapsTab === "rooms"
                            ? "bg-indigo-600 text-white font-extrabold"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        Rooms
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickTapsTab("food")}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-sm transition-all border-0 cursor-pointer ${
                          quickTapsTab === "food"
                            ? "bg-indigo-600 text-white font-extrabold"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        Cuisine (Meals)
                      </button>
                    </div>
                  </div>

                  {quickTapsTab === "rooms" ? (
                    <div className="p-4 space-y-2 max-h-[380px] overflow-y-auto">
                      <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold mb-2">
                        Tap Available Room to Allocate (1 Night)
                      </p>
                      <div className="grid grid-cols-4 gap-2">
                        {displayRooms.map((r) => {
                          const isOccupied = r.status === "Occupied";
                          const isAllocated = selectedRooms.some(
                            (sr) => sr.roomId === r.id || sr.roomNumber === r.roomNumber,
                          );
                          return (
                            <button
                              key={r.id}
                              type="button"
                              onClick={() => handleQuickTapRoom(r)}
                              className={`h-12 rounded-xl flex flex-col items-center justify-center transition-all relative border border-transparent cursor-pointer ${
                                isAllocated
                                  ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/50 scale-[1.02]"
                                  : isOccupied
                                    ? "bg-slate-850/50 text-slate-600 line-through opacity-30 cursor-not-allowed"
                                    : "bg-slate-800 hover:bg-slate-755 text-emerald-400 border border-emerald-950/20"
                              }`}
                              disabled={isOccupied && !isAllocated}
                            >
                              <span className={`text-xs font-black block ${
                                isAllocated ? "text-white" : "text-emerald-300"
                              }`}>
                                {r.roomNumber}
                              </span>
                              <span className={`text-[8.5px] font-bold uppercase mt-0.5 tracking-wider ${
                                isAllocated ? "text-indigo-100" : "text-slate-200"
                              }`}>
                                {r.roomType.substring(0, 3)}
                              </span>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ) : (
                    <div className="p-4 space-y-2 max-h-[380px] overflow-y-auto">
                      <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold mb-2">
                        Tap Cuisine item to Append Meal
                      </p>

                      {/* Dynamic Cuisine Category Filter */}
                      <div className="flex flex-wrap gap-1.5 pb-2 border-b border-slate-850/60 mb-3">
                        {["All", ...Array.from(new Set(foods.map((f) => f.category).filter(Boolean)))].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedFoodCategory(cat)}
                            className={`px-3 py-1 text-[9.5px] uppercase font-bold tracking-wider rounded-lg transition-all border-0 cursor-pointer ${
                              selectedFoodCategory === cat
                                ? "bg-amber-600 text-white shadow-xs font-extrabold"
                                : "bg-slate-800 text-slate-200 hover:text-white hover:bg-slate-750"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-2 gap-2">
                        {foods
                          .filter((f) => selectedFoodCategory === "All" || f.category === selectedFoodCategory)
                          .map((f) => {
                            const countSelected =
                              selectedFoods.find((sf) => sf.foodId === f.id)
                                ?.quantity || 0;
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => handleQuickTapFood(f)}
                                className={`p-2.5 rounded-xl text-left transition-all border border-transparent relative flex flex-col justify-between h-14 cursor-pointer ${
                                  countSelected > 0
                                    ? "bg-amber-600 text-white shadow-md scale-[1.01]"
                                    : "bg-slate-800 hover:bg-slate-755 text-slate-200"
                                }`}
                              >
                                <span className={`text-[11px] font-extrabold line-clamp-1 block leading-tight ${
                                  countSelected > 0 ? "text-white" : "text-amber-100"
                                }`}>
                                  {f.foodName}
                                </span>
                                <div className="flex items-center justify-between mt-1 w-full shrink-0">
                                  <span className={`text-[10px] font-mono font-bold ${
                                    countSelected > 0 ? "text-amber-200" : "text-emerald-300"
                                  }`}>
                                    Rs. {f.price}
                                  </span>
                                  {countSelected > 0 && (
                                    <span className="bg-slate-950 text-yellow-400 text-[9.5px] font-extrabold px-1.5 py-0.5 rounded-md">
                                      {countSelected}x
                                    </span>
                                  )}
                                </div>
                              </button>
                            );
                          })}
                      </div>
                    </div>
                  )}
                  <div className="mt-auto px-4 py-2.5 bg-slate-950 border-t border-slate-850 text-[10px] text-slate-500 text-center italic">
                    Quick touch action appends items in half a second!
                  </div>
                </div>

                

              </div>
            </div>

            {/* COLUMN 3: RIGHT PANEL - ⚡ LIVE LEDGER TOTALS & CHECKOUT SCREEN (span 4) */}
            <div className="lg:col-span-4 space-y-4">
                <h3 className="text-xs font-bold text-slate-450 uppercase tracking-widest flex items-center gap-2 pb-2 border-b border-slate-50">
                  <Layers className="h-4 w-4 text-indigo-500" />
                  Terminal Live Totals Sheet
                </h3>

                {/* show BILL*/}
                <div className="bg-slate-50/60 border border-slate-100 rounded-lg p-3.5 space-y-3.5">
                  {terminalBillId && bills.find((b) => b.id === terminalBillId) ? (
                    <div className="space-y-2.5">
                      {(() => {
                        const currentBill = bills.find((b) => b.id === terminalBillId);
                        if (!currentBill) return null;
                        return (
                          <>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Bill ID</span>
                              <span className="text-xs font-mono font-bold text-slate-700">{currentBill.id}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Guest Name</span>
                              <span className="text-xs font-bold text-slate-800">{currentBill.guestDetails.name}</span>
                            </div>
                            <div className="flex items-center justify-between">
                              <span className="text-[10px] font-bold text-slate-500 uppercase">Status</span>
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                                currentBill.status === 'Active' 
                                  ? 'bg-emerald-100 text-emerald-700' 
                                  : 'bg-slate-200 text-slate-700'
                              }`}>
                                {currentBill.status}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-[10px]">
                              <span className="font-bold text-slate-500 uppercase">Created</span>
                              <span className="text-slate-600 font-mono">{new Date(currentBill.createdAt).toLocaleDateString()}</span>
                            </div>
                            
                  {/* RIGHT PORTION: LIVE HIGH-DENSITY SELECTIONS (md:col-span-5) */}
                <div className="bg-white border border-slate-200 p-4 rounded-xl shadow-sm flex flex-col overflow-hidden">
                  <div className="pb-3 mb-3 border-b border-slate-200 flex justify-between items-center shrink-0">
                    <h4 className="text-[11px] font-extrabold uppercase text-slate-700 tracking-widest">
                      Live Terminal Cart
                    </h4>
                    <span className="text-[10px] font-bold font-mono text-indigo-600 bg-indigo-50 px-2 py-1 rounded-md">
                      {selectedRooms.length + selectedFoods.length} items
                    </span>
                  </div>

                  <div className="space-y-4 overflow-y-auto max-h-[380px] pr-1">
                    
                    {/* Selected Rooms Sub-List */}
                    <div className="space-y-2">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                        <Bed className="h-3 w-3 text-blue-500" />
                        Allocated Rooms ({selectedRooms.length})
                      </div>

                      {selectedRooms.map((rm: any) => {
                        const originalPriceTotal =
                          (rm.originalPricePerNight ||
                            rm.pricePerNight + (rm.discount || 0)) * rm.nights;
                        const finalCost = rm.pricePerNight * rm.nights;
                        return (
                          <div
                            key={rm.roomId}
                            className="bg-blue-50 border border-blue-200 p-2.5 rounded-xl space-y-2"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <span className="font-bold text-xs text-slate-900 block">
                                  Room {rm.roomNumber} ({rm.roomType})
                                </span>
                                <span className="text-slate-600 text-[10px] text-slate-405 font-mono">
                                  Stay: {rm.nights || 1} {rm.nights === 1 ? 'night' : 'nights'}
                                </span>
                              </div>
                              
                              {/* Item Delete Button */}
                              <button
                                type="button"
                                onClick={() => handleRemoveRoom(rm.roomId)}
                                disabled={!canDeleteBill}
                                className={`text-slate-400 hover:text-red-600 transition-colors bg-transparent border-0 cursor-pointer p-1 ${
                                  !canDeleteBill
                                    ? "opacity-30 cursor-not-allowed"
                                    : ""
                                }`}
                                title={!canDeleteBill ? "Deletion restricted by Administrator" : "Delete Room stay"}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </button>
                            </div>

                            <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1.5 border-t border-blue-200">
                              {/* Inline Room Discount Amount Setting */}
                              <div className="flex items-center gap-1 bg-white border border-blue-200 p-1 rounded-lg">
                                <span className="text-[8px] uppercase font-extrabold text-slate-500 px-1">
                                  Disc
                                </span>
                                <input
                                  type="number"
                                  value={rm.discount || 0}
                                  min="0"
                                  placeholder="0"
                                  disabled={!canApplyDiscount}
                                  title={!canApplyDiscount ? "Discounts disabled by Admin configuration" : "Set room discount"}
                                  className={`w-14 text-center text-[10px] font-bold bg-blue-50 text-rose-600 border border-blue-200 rounded p-0.5 focus:outline-hidden ${
                                    !canApplyDiscount
                                      ? "opacity-50 cursor-not-allowed"
                                      : ""
                                  }`}
                                  onChange={(e) => {
                                    if (!canApplyDiscount) return;
                                    const discVal = Number(e.target.value) || 0;
                                    const updated = selectedRooms.map((sr: any) => {
                                      if (sr.roomId === rm.roomId) {
                                        const orig =
                                          sr.originalPricePerNight ||
                                          sr.pricePerNight + (sr.discount || 0);
                                        return {
                                          ...sr,
                                          discount: discVal,
                                          pricePerNight: Math.max(
                                            0,
                                            orig - discVal,
                                          ),
                                          originalPricePerNight: orig,
                                        };
                                      }
                                      return sr;
                                    });
                                    setSelectedRooms(updated);
                                  }}
                                />
                              </div>

                              <div className="text-right">
                                {rm.discount > 0 && (
                                  <p className="text-[9px] text-slate-500 line-through">
                                    Rs. {originalPriceTotal}
                                  </p>
                                )}
                                <span className="font-mono font-bold text-slate-900 text-xs">
                                  Rs. {finalCost}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    {/* Selected Cuisine Meals Sub-List */}
                    <div className="space-y-2 pt-2 border-t border-slate-200">
                      <div className="text-[9px] font-bold uppercase tracking-wider text-slate-600 mb-1 flex items-center gap-1">
                        <Coffee className="h-3 w-3 text-amber-600" />
                        Kitchen Meals ({selectedFoods.length})
                      </div>

                      {selectedFoods.map((fd) => (
                        <div
                          key={fd.foodId}
                          className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl flex items-center justify-between gap-2"
                        >
                          <div className="min-w-0 flex-1">
                            <span className="font-bold text-xs text-slate-900 block truncate">
                              {fd.foodName}
                            </span>
                            <span className="text-slate-600 text-[10px] font-mono">
                              Unit: Rs. {fd.price}
                            </span>
                          </div>

                          <div className="flex items-center gap-2.5 shrink-0">
                            {/* Qty Controls */}
                            <div className="flex items-center border border-amber-200 bg-white rounded-lg p-0.5">
                              <button
                                type="button"
                                onClick={() => updateFoodQty(fd.foodId, -1)}
                                className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 hover:bg-amber-100 transition-colors bg-transparent border-0 cursor-pointer"
                              >
                                -
                              </button>
                              <span className="px-2 text-[10px] font-bold font-mono text-slate-700">
                                {fd.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateFoodQty(fd.foodId, 1)}
                                className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 hover:bg-amber-100 transition-colors bg-transparent border-0 cursor-pointer"
                              >
                                +
                              </button>
                            </div>

                            <span className="font-mono font-bold text-slate-900 text-xs w-16 text-right">
                              Rs. {fd.price * fd.quantity}
                            </span>

                            {/* Item Delete Button */}
                            <button
                              type="button"
                              onClick={() => handleRemoveFood(fd.foodId)}
                              disabled={!canDeleteBill}
                              className={`text-slate-400 hover:text-red-600 transition-colors bg-transparent border-0 cursor-pointer p-1 ${
                                !canDeleteBill
                                  ? "opacity-30 cursor-not-allowed"
                                  : ""
                              }`}
                              title={!canDeleteBill ? "Deletion restricted by Administrator" : "Delete food item"}
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>

                    {selectedRooms.length === 0 && selectedFoods.length === 0 && (
                      <p className="text-center py-8 text-[11px] text-slate-500 italic font-sans">
                        Terminal cart is empty. Tap items on the left side to instantly allocate rooms and meals.
                      </p>
                    )}

                  </div>
                </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="py-4 text-center">
                      <p className="text-[11px] text-slate-400 font-sans italic">
                        New bill summary will appear here once customer and items are selected
                      </p>
                    </div>
                  )}
                </div>

                <div className="text-xs font-sans space-y-2.5">
                  <div className="flex justify-between text-slate-550">
                    <span>Food Base Price</span>
                    <span className="font-semibold text-slate-800">
                      Rs. {foodSubtotal.toLocaleString()}
                    </span>
                  </div>

                  {foodSubtotal > 0 && (
                    <div className="flex justify-between text-[11px] text-slate-450 px-2 py-1 bg-yellow-50/60 border border-yellow-100 rounded-sm">
                      <span>Food service charge ({settings?.serviceChargePercent ?? 10}%)</span>
                      <span className="font-bold text-yellow-700">
                        Rs. {serviceCharge.toLocaleString()}
                      </span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-550 pt-1 border-t border-slate-50">
                    <span>Rooms Base Rate</span>
                    <span className="font-semibold text-slate-800">
                      Rs. {totalOriginalRoomCost.toLocaleString()}
                    </span>
                  </div>

                  {totalRoomDiscounts > 0 && (
                    <div className="flex justify-between text-[11px] text-rose-650 px-2 py-1 bg-rose-50 border border-rose-100 rounded-sm font-bold">
                      <span>Room Specific Savings</span>
                      <span>-Rs. {totalRoomDiscounts.toLocaleString()}</span>
                    </div>
                  )}

                  <div className="flex justify-between text-slate-700 font-semibold pt-1 border-t border-slate-50">
                    <span>Rooms Rate after discounts</span>
                    <span className="text-slate-900 font-bold">
                      Rs. {roomSubtotal.toLocaleString()}
                    </span>
                  </div>

                  <div className="border-t border-dashed border-slate-200 mt-3 pt-3 flex justify-between text-slate-900 font-bold text-sm">
                    <span className="font-display">Ledger grand Total</span>
                    <span className="font-display font-black text-indigo-600">
                      Rs. {grandTotal.toLocaleString()}
                    </span>
                  </div>
                </div>

                {/* SAVE BUTTON MATRIX */}
                {((customerInputMode === "new" && newGuestName.trim() && newGuestNic.trim()) ||
                  (customerInputMode === "existing" && selectedGuest)) ? (
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    
                    
                    <button
                      type="button"
                      onClick={() => handleSaveBill("Active")}
                      className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer border-0"
                    >
                      <Clock className="h-4 w-4" />
                      Make Active Check-Stay
                    </button>



                    <button
                      type="button"
                      onClick={() => handleSaveBill("Completed")}
                      className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer border-0"
                    >
                      <Printer className="h-4 w-4" />
                      Complete Stay & Print Bill
                    </button>
                  </div>
                ) : (
                  <div className="pt-3 border-t border-slate-100 text-center">
                    <p className="text-[11px] text-amber-600 bg-amber-50 p-2.5 rounded-lg border border-amber-100 font-sans font-bold">
                      {customerInputMode === "new"
                        ? "Please fill the required field(s) (*) in the (Instant Register) form to unlock the checkout actions."
                        : "Please select an existing customer profile to unlock the checkout actions."}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
  );
};
