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
  Handshake,
  Eye,
  GitMerge,
  Pencil,
  FileText,
  Hotel,
  Calendar,
  Coins,
  Utensils,
} from "lucide-react";
import { Guests } from "@/components/Guests";
import { LoadingButton } from "@/components/loading-button";
import { apiFetch } from "@/lib/api";
import { toastCreated, toastUpdated, toastError } from "@/lib/crud-toast";
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
  const [quickTapsTab, setQuickTapsTab] = useState<"rooms" | "food" | "packages">("rooms");
  const [customVillaPriceInput, setCustomVillaPriceInput] = useState<string>("");
  const [customKitchenFeeInput, setCustomKitchenFeeInput] = useState<string>("5000");
  const [packageNoServiceCharge, setPackageNoServiceCharge] = useState<boolean>(false);
  const [selectedFoodCategory, setSelectedFoodCategory] = useState<string>("All");
  const [savingBill, setSavingBill] = useState(false);
  const [foodSearchQuery, setFoodSearchQuery] = useState("");
  const [applyServiceCharge, setApplyServiceCharge] = useState(true);
  const [dueLaterNote, setDueLaterNote] = useState("");
  const [advanceDepositPaid, setAdvanceDepositPaid] = useState<number>(0);

  // Sorting State
  const [sortField, setSortField] = useState<'default' | 'date' | 'name' | 'amount' | 'status'>('default');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Pagination State
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  

  const { user: currentUser } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);

  // Admin Bill Merge State
  const [isMergeModalOpen, setIsMergeModalOpen] = useState(false);
  const [selectedMergeBillIds, setSelectedMergeBillIds] = useState<string[]>([]);
  const [primaryMergeBillId, setPrimaryMergeBillId] = useState<string | null>(null);
  const [mergeNotes, setMergeNotes] = useState("");
  const [mergingBills, setMergingBills] = useState(false);
  const [mergeSearchTerm, setMergeSearchTerm] = useState("");
  const [mergeStatusFilter, setMergeStatusFilter] = useState<BillStatus | "All">("All");

  const canDeleteBill = !currentUser || currentUser.role !== 'receptionist' ||
    hasPermission(currentUser.role, 'allowReceptionistDelete', settings);
  const canApplyDiscount = !currentUser || currentUser.role !== 'receptionist' ||
    hasPermission(currentUser.role, 'allowReceptionistDiscount', settings);
  const canModifyPrice = !currentUser || currentUser.role !== 'receptionist' ||
    hasPermission(currentUser.role, 'allowReceptionistModifyPrice', settings);

  const displayRooms = useMemo(() => dedupeRoomsByNumber(rooms), [rooms]);
  const currentTerminalBill = terminalBillId
    ? bills.find((b) => b.id === terminalBillId)
    : undefined;
  const isDueLaterFolio = currentTerminalBill?.status === "DueLater";
  const folioLocked = savingBill || isDueLaterFolio;

  // Merge live calculations
  const selectedMergeBills = useMemo(() => {
    return bills.filter((b) => selectedMergeBillIds.includes(b.id));
  }, [bills, selectedMergeBillIds]);

  const targetMergeBill = useMemo(() => {
    return bills.find((b) => b.id === primaryMergeBillId);
  }, [bills, primaryMergeBillId]);

  const sourceMergeBills = useMemo(() => {
    return selectedMergeBills.filter((b) => b.id !== primaryMergeBillId);
  }, [selectedMergeBills, primaryMergeBillId]);

  const mergedPreview = useMemo(() => {
    if (!targetMergeBill || sourceMergeBills.length === 0) return null;

    // Combined Rooms
    const combinedRooms: RoomItem[] = [...(targetMergeBill.roomItems || [])];
    sourceMergeBills.forEach((sb) => {
      if (Array.isArray(sb.roomItems)) {
        combinedRooms.push(...sb.roomItems);
      }
    });

    // Combined Foods
    const foodMap: Record<string, FoodItem> = {};
    const allFoods: FoodItem[] = [...(targetMergeBill.foodItems || [])];
    sourceMergeBills.forEach((sb) => {
      if (Array.isArray(sb.foodItems)) {
        allFoods.push(...sb.foodItems);
      }
    });

    allFoods.forEach((item) => {
      const price = Number(item.price) || 0;
      const qty = Number(item.quantity) || 1;
      const key = `${item.foodId || item.foodName}_${price}`;

      if (!foodMap[key]) {
        foodMap[key] = {
          foodId: item.foodId || '',
          foodName: item.foodName,
          price,
          quantity: qty,
        };
      } else {
        foodMap[key].quantity += qty;
      }
    });

    const combinedFoods = Object.values(foodMap);
    const foodSubtotal = combinedFoods.reduce((acc, item) => acc + item.price * item.quantity, 0);
    const roomSubtotal = combinedRooms.reduce((acc, item) => acc + item.pricePerNight * item.nights, 0);
    const serviceChargePercent = settings?.serviceChargePercent ?? 10;
    const hadServiceCharge = (targetMergeBill.serviceCharge || 0) > 0 || sourceMergeBills.some((sb) => (sb.serviceCharge || 0) > 0);
    const serviceCharge = hadServiceCharge ? Math.round(foodSubtotal * (serviceChargePercent / 100)) : 0;
    const totalAmount = foodSubtotal + serviceCharge + roomSubtotal;

    return {
      combinedRooms,
      combinedFoods,
      foodSubtotal,
      roomSubtotal,
      serviceCharge,
      totalAmount,
    };
  }, [targetMergeBill, sourceMergeBills, settings]);

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
    setDueLaterNote("");
    setAdvanceDepositPaid(0);

    setIsTerminalActive(true);
  };

  // Open billing terminal prefilled for resume
  const handleResumeBill = (bill: Bill) => {
    if (bill.status === "Completed" && currentUser?.role !== "admin") {
      toastError("Access denied. Only system administrators are permitted to edit completed/settled bills.");
      return;
    }
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
    setApplyServiceCharge(bill.foodSubtotal > 0 ? bill.serviceCharge > 0 : true);
    setDueLaterNote(bill.dueLaterNote || "");
    setAdvanceDepositPaid(bill.advancePaidAmount || 0);
    setIsTerminalActive(true);
  };

  // Quick action tap triggers
  const handleQuickTapRoom = (room: Room) => {
    if (isDueLaterFolio) return;
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

  const checkRoomBookedOnDate = (room: Room, targetDate: string) => {
    if (!targetDate) return room.status === "Occupied";

    const matchingBill = bills.find((b) => {
      if (b.id === terminalBillId) return false;
      if (b.status !== "Active" && b.status !== "PreBooked") return false;

      const holdsRoom = b.roomItems.some(
        (ri) => ri.roomId === room.id || ri.roomNumber === room.roomNumber
      );
      if (!holdsRoom) return false;

      const bStart = b.guestDetails?.checkInDate;
      const bEnd = b.guestDetails?.checkOutDate || bStart;

      if (!bStart) return true;

      return targetDate >= bStart && (bEnd ? targetDate <= bEnd : targetDate === bStart);
    });

    return Boolean(matchingBill || (targetDate === new Date().toISOString().split("T")[0] && room.status === "Occupied"));
  };

  const handleSelectFullVilla = (customTotalAmount?: number, removeServiceCharge?: boolean) => {
    if (isDueLaterFolio) return;
    const targetDate = selectedGuest?.checkInDate || newGuestCheckIn || new Date().toISOString().split("T")[0];
    const availableRooms = displayRooms.filter(
      (r) => !checkRoomBookedOnDate(r, targetDate) || selectedRooms.some((sr) => sr.roomId === r.id || sr.roomNumber === r.roomNumber)
    );

    if (availableRooms.length === 0) {
      toastError(`No available rooms found for Full Villa Booking on ${targetDate}.`);
      return;
    }

    let perRoomPrice = 0;
    if (customTotalAmount && customTotalAmount > 0) {
      perRoomPrice = Math.round(customTotalAmount / availableRooms.length);
    }

    const newRooms = availableRooms.map((room) => {
      const existing = selectedRooms.find(
        (sr) => sr.roomId === room.id || sr.roomNumber === room.roomNumber
      );
      const finalPrice = perRoomPrice > 0 ? perRoomPrice : room.price;
      const discountVal = Math.max(0, room.price - finalPrice);

      return {
        roomId: room.id,
        roomNumber: room.roomNumber,
        roomType: room.roomType,
        pricePerNight: finalPrice,
        nights: existing ? existing.nights : 1,
        originalPricePerNight: room.price,
        discount: discountVal,
      } as any;
    });

    setSelectedRooms(newRooms);
    setApplyServiceCharge(false);
    toastCreated(
      customTotalAmount && customTotalAmount > 0
        ? `Full Villa Package Allocated (Rs. ${customTotalAmount.toLocaleString()} - No Service Charge)`
        : `Full Villa Booking (${newRooms.length} Rooms Allocated for ${targetDate})`
    );
  };

  const handleAddKitchenFee = (feeAmount: number) => {
    if (isDueLaterFolio || feeAmount <= 0) return;

    const kitchenFoodId = "kitchen_facility_fee_item";
    const existingIndex = selectedFoods.findIndex((f) => f.foodId === kitchenFoodId);

    if (existingIndex > -1) {
      const updated = [...selectedFoods];
      updated[existingIndex].price = feeAmount;
      setSelectedFoods(updated);
      toastUpdated(`Kitchen Facility Fee updated to Rs. ${feeAmount.toLocaleString()}`);
    } else {
      setSelectedFoods([
        ...selectedFoods,
        {
          foodId: kitchenFoodId,
          foodName: "🍳 Kitchen & Self-Cooking Facility Fee",
          price: feeAmount,
          quantity: 1,
        },
      ]);
      toastCreated(`Kitchen Facility Fee added (Rs. ${feeAmount.toLocaleString()})`);
    }

    setApplyServiceCharge(false);
  };

  const handleQuickTapFood = (food: Food) => {
    if (isDueLaterFolio) return;
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
    if (isDueLaterFolio) return;
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
    if (isDueLaterFolio) return;
    setSelectedRooms(selectedRooms.filter((ri) => ri.roomId !== roomId));
  };

  const handleAddFood = () => {
    if (isDueLaterFolio) return;
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
    if (isDueLaterFolio) return;
    const updated = selectedFoods.map((fi) => {
      if (fi.foodId === foodId) {
        return { ...fi, quantity: Math.max(1, fi.quantity + delta) };
      }
      return fi;
    });
    setSelectedFoods(updated);
  };

  const handleRemoveFood = (foodId: string) => {
    if (isDueLaterFolio) return;
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
  const serviceCharge = applyServiceCharge ? Math.round(foodSubtotal * (scPercent / 100)) : 0;
  const grandTotal = roomSubtotal + foodSubtotal + serviceCharge;

  // Primary Transaction save gatekeeper
  const ensureGuestRegistered = async (): Promise<Guest | null> => {
    if (customerInputMode === "existing") {
      if (!selectedGuest) {
        toastError("Please select or allocate an existing hotel guest profile.");
        return null;
      }
      return selectedGuest;
    }

    // Inline form mode validations
    if (!newGuestName.trim()) {
      toastError("Guest full name is a mandatory field.");
      return null;
    }
    if (!newGuestNic.trim()) {
      toastError("Guest NIC or Passport identification number is mandatory.");
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
      toastError(`Failed to auto-register guest profile. ${e.message}`);
      return null;
    }
  };

  const handlePreviewBill = () => {
    const currentBill = terminalBillId
      ? bills.find((b) => b.id === terminalBillId)
      : null;
    const guest: Guest = selectedGuest || {
      id: currentBill?.guestDetails?.id || "preview_guest",
      name:
        newGuestName.trim() ||
        currentBill?.guestDetails?.name ||
        "Valued Guest",
      phone: newGuestPhone || currentBill?.guestDetails?.phone || "",
      nic: newGuestNic || currentBill?.guestDetails?.nic || "",
      address:
        newGuestAddress ||
        currentBill?.guestDetails?.address ||
        "Hotel Guest Address",
      checkInDate:
        newGuestCheckIn ||
        currentBill?.guestDetails?.checkInDate ||
        new Date().toISOString().split("T")[0],
      checkOutDate:
        newGuestCheckOut ||
        currentBill?.guestDetails?.checkOutDate ||
        new Date().toISOString().split("T")[0],
    };

    const previewBill: Bill = {
      id: terminalBillId || "DRAFT_PREVIEW",
      guestId: guest.id,
      guestDetails: guest,
      roomItems: selectedRooms,
      foodItems: selectedFoods,
      foodSubtotal,
      serviceCharge,
      roomSubtotal,
      totalAmount: grandTotal,
      status: (currentBill?.status || "Active") as BillStatus,
      advancePaidAmount: Number(advanceDepositPaid) || 0,
      createdAt: currentBill?.createdAt || new Date().toISOString(),
      updatedAt: currentBill?.updatedAt || new Date().toISOString(),
    };

    onShowReceipt(previewBill);
  };

  const handleSaveBill = async (status: BillStatus) => {
    if (savingBill) return;

    setSavingBill(true);
    try {
      const activeGuest = await ensureGuestRegistered();
      if (!activeGuest) return;

      const payload = {
        id: terminalBillId || undefined,
        guestId: activeGuest.id,
        guestDetails: activeGuest,
        roomItems: selectedRooms,
        foodItems: selectedFoods,
        applyServiceCharge,
        status,
        dueLaterNote: dueLaterNote.trim() || undefined,
        advancePaidAmount: Number(advanceDepositPaid) || 0,
      };

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

      if (terminalBillId) {
        toastUpdated("Bill");
      } else {
        toastCreated("Bill");
      }

      await fetchBills();
      await fetchRooms();
      setIsTerminalActive(false);

      if (status === "Completed" || status === "DueLater") {
        onShowReceipt(savedBill);
      }
    } catch (e: any) {
      toastError(e.message || "Failed to save bill.");
    } finally {
      setSavingBill(false);
    }
  };

  const handleCheckInPreBooked = async (bill: Bill) => {
    try {
      const res = await apiFetch("/api/bills", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...bill,
          status: "Active",
        }),
      });

      if (!res.ok) {
        throw new Error("Failed to check in pre-booked guest.");
      }

      toastUpdated("Guest Checked-In (Live Stay)");
      await fetchBills();
      await fetchRooms();
    } catch (e: any) {
      toastError(e.message || "Failed to check in guest.");
    }
  };

  const totalActiveBills = useMemo(() => bills.filter((b) => b.status === "Active").length, [bills]);
  const totalPreBookedBills = useMemo(() => bills.filter((b) => b.status === "PreBooked").length, [bills]);
  const totalDueLaterBills = useMemo(() => bills.filter((b) => b.status === "DueLater").length, [bills]);
  const totalCompletedBills = useMemo(() => bills.filter((b) => b.status === "Completed").length, [bills]);

  const sortedBills = useMemo(() => {
    return bills
      .filter((b) => {
        const termMatches =
          b.guestDetails.name.toLowerCase().includes(term.toLowerCase()) ||
          b.id.toLowerCase().includes(term.toLowerCase());
        const statusMatches = listStatus === "All" || b.status === listStatus;
        return termMatches && statusMatches;
      })
      .sort((a, b) => {
        if (sortField === 'default') {
          if (a.status !== b.status) {
            const rank = (s: BillStatus) =>
              s === "Active" ? 0 : s === "PreBooked" ? 1 : s === "DueLater" ? 2 : 3;
            return rank(a.status) - rank(b.status);
          }
          const timeA = new Date(a.updatedAt || a.createdAt).getTime();
          const timeB = new Date(b.updatedAt || b.createdAt).getTime();
          return timeB - timeA;
        }

        let comparison = 0;
        if (sortField === 'date') {
          const timeA = new Date(a.createdAt).getTime();
          const timeB = new Date(b.createdAt).getTime();
          comparison = timeA - timeB;
        } else if (sortField === 'name') {
          comparison = a.guestDetails.name.localeCompare(b.guestDetails.name);
        } else if (sortField === 'amount') {
          comparison = (a.totalAmount || 0) - (b.totalAmount || 0);
        } else if (sortField === 'status') {
          comparison = a.status.localeCompare(b.status);
        }
        return sortOrder === 'asc' ? comparison : -comparison;
      });
  }, [bills, term, listStatus, sortField, sortOrder]);

  const paginatedBills = useMemo(() => {
    const startIndex = (currentPage - 1) * itemsPerPage;
    return sortedBills.slice(startIndex, startIndex + itemsPerPage);
  }, [sortedBills, currentPage]);

  const totalPages = Math.ceil(sortedBills.length / itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [term, listStatus, sortField, sortOrder]);

  const handleSort = (field: 'date' | 'name' | 'amount' | 'status') => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
    }
  };

  const handleExecuteMerge = async () => {
    if (!primaryMergeBillId || selectedMergeBillIds.length < 2) {
      alert("Please select at least 2 bills and designate a primary destination bill to merge.");
      return;
    }

    const sourceIds = selectedMergeBillIds.filter((id) => id !== primaryMergeBillId);
    if (sourceIds.length === 0) {
      alert("Please select at least one additional source bill to merge.");
      return;
    }

    setMergingBills(true);
    try {
      const res = await fetch("/api/bills/merge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targetBillId: primaryMergeBillId,
          sourceBillIds: sourceIds,
          mergeNotes,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || "Failed to merge bills.");
      }

      toastUpdated(`Master Bill ${primaryMergeBillId} (Consolidated ${sourceIds.length} bills)`);
      setIsMergeModalOpen(false);
      setSelectedMergeBillIds([]);
      setPrimaryMergeBillId(null);
      setMergeNotes("");
      await fetchBills();
    } catch (err: any) {
      toastError(err.message || "Could not complete bill merge.");
    } finally {
      setMergingBills(false);
    }
  };

  // Calculate live statistics for top indicators
  
  const totalOutstandingLedger = bills
    .filter((b) => b.status === "Active" || b.status === "DueLater")
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  const totalSettledTurnover = bills
    .filter((b) => b.status === "Completed")
    .reduce((sum, b) => sum + (b.totalAmount || 0), 0);

  // Monthly metrics (defaults to current month YYYY-MM)
  const currentYearMonth = new Date().toISOString().substring(0, 7);

  const monthlyCompletedBills = useMemo(() => {
    return bills.filter((b) => {
      if (b.status !== 'Completed') return false;
      const d = (b.updatedAt || b.createdAt || '');
      return d.startsWith(currentYearMonth);
    }).length;
  }, [bills, currentYearMonth]);

  const monthlySettledTurnover = useMemo(() => {
    return bills
      .filter((b) => b.status === 'Completed')
      .filter((b) => (b.updatedAt || b.createdAt || '').startsWith(currentYearMonth))
      .reduce((sum, b) => sum + (b.totalAmount || 0), 0);
  }, [bills, currentYearMonth]);

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

            <div className="flex items-center gap-3">
              {currentUser?.role === 'admin' && (
                <button
                  type="button"
                  onClick={() => {
                    setIsMergeModalOpen(true);
                    setSelectedMergeBillIds([]);
                    setPrimaryMergeBillId(null);
                    setMergeNotes("");
                    setMergeSearchTerm("");
                    setMergeStatusFilter("All");
                  }}
                  className="flex items-center gap-2 py-2.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-xl shadow-xs transition-all text-sm border-0 cursor-pointer"
                  title="Merge multiple bills into a single master bill (Admin Only)"
                >
                  <GitMerge className="h-4.5 w-4.5 text-amber-400" />
                  <span>Merge Bills</span>
                </button>
              )}

              <button
                onClick={handleCreateNew}
                className="flex items-center gap-2 py-2.5 px-5 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold rounded-xl shadow-md shadow-indigo-100 transition-all text-sm border-0 cursor-pointer"
              >
                <Plus className="h-4.5 w-4.5" />
                Create New Guest Bill
              </button>
            </div>
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
                {totalDueLaterBills} Due Later
              </div>
            </div>

            <div className="bg-slate-55 border border-slate-200 p-4 rounded-2xl flex items-center justify-between">
              <div>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Archived / Settled Receipts (This Month)
                </p>
                <p className="text-xl font-extrabold text-slate-800 mt-1">
                  {monthlyCompletedBills} Closed
                </p>
              </div>
              <span className="text-[10px] font-semibold text-slate-400">
                Rs. {monthlySettledTurnover.toLocaleString()}
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
                    <span>All</span>
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
                    <span>Active</span>
                    <span className="bg-black/10 text-[9px] px-1.5 py-0.5 rounded-full font-mono">
                      {totalActiveBills}
                    </span>
                  </button>

                  <button
                    onClick={() => setListStatus("PreBooked")}
                    className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold tracking-wide transition-all border-0 cursor-pointer flex items-center gap-1.5 ${
                      listStatus === "PreBooked"
                        ? "bg-purple-600 text-white shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-650"
                    }`}
                  >
                    <Calendar className="h-3 w-3" />
                    <span>Booked</span>
                    <span className="bg-black/10 text-[9px] px-1.5 py-0.5 rounded-full font-mono">
                      {totalPreBookedBills}
                    </span>
                  </button>

                  <button
                    onClick={() => setListStatus("DueLater")}
                    className={`py-1.5 px-3.5 rounded-lg text-xs font-semibold tracking-wide transition-all border-0 cursor-pointer flex items-center gap-1.5 ${
                      listStatus === "DueLater"
                        ? "bg-amber-600 text-white shadow-xs"
                        : "bg-slate-50 hover:bg-slate-100 text-slate-650"
                    }`}
                  >
                    <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                    <span>Due Later</span>
                    <span className="bg-black/10 text-[9px] px-1.5 py-0.5 rounded-full font-mono">
                      {totalDueLaterBills}
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
              {paginatedBills.length === 0 ? (
                <div className="bg-white p-12 text-center rounded-2xl border border-slate-100">
                  <p className="text-slate-400 text-sm">
                    No billing records match the selected filters.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  {/* Desktop Tabular View (Visible on Medium and larger screens) */}
                  <div className="hidden md:block bg-white rounded-2xl border border-slate-100 overflow-x-auto shadow-xs">
                    <div className="w-full font-sans">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-800 text-slate-100 text-[10px] font-bold uppercase tracking-wider select-none border-b border-slate-700">
                          <tr>
                            <th 
                              className="py-3.5 px-3 text-center cursor-pointer hover:bg-slate-700 transition-colors"
                              onClick={() => handleSort('date')}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>ID / Date</span>
                                {sortField === 'date' && (sortOrder === 'asc' ? '▲' : '▼')}
                              </div>
                            </th>
                            <th 
                              className="py-3.5 px-3 text-center cursor-pointer hover:bg-slate-700 transition-colors"
                              onClick={() => handleSort('name')}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>Guest Profile</span>
                                {sortField === 'name' && (sortOrder === 'asc' ? '▲' : '▼')}
                              </div>
                            </th>
                            <th className="py-3.5 px-3 text-center">Room Details</th>
                            <th 
                              className="py-3.5 px-3 text-center cursor-pointer hover:bg-slate-700 transition-colors"
                              onClick={() => handleSort('amount')}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>Ledger Balance</span>
                                {sortField === 'amount' && (sortOrder === 'asc' ? '▲' : '▼')}
                              </div>
                            </th>
                            <th 
                              className="py-3.5 px-3 text-center cursor-pointer hover:bg-slate-700 transition-colors"
                              onClick={() => handleSort('status')}
                            >
                              <div className="flex items-center justify-center gap-1">
                                <span>Status</span>
                                {sortField === 'status' && (sortOrder === 'asc' ? '▲' : '▼')}
                              </div>
                            </th>
                            <th className="py-3.5 px-3 text-center">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700">
                          {paginatedBills.map((bill) => {
                            const isCompleted = bill.status === "Completed";
                            const isDueLater = bill.status === "DueLater";
                            const isPreBooked = bill.status === "PreBooked";
                            return (
                              <tr
                                key={bill.id}
                                className={`hover:bg-slate-50/50 transition-colors ${
                                  isDueLater ? "bg-amber-50/20" : isPreBooked ? "bg-purple-50/20" : !isCompleted ? "bg-emerald-50/5" : ""
                                }`}
                              >
                                <td className="py-3 px-3 text-center align-middle">
                                  <div className="flex flex-col gap-0.5 items-center justify-center">
                                    <span className="inline-flex items-center gap-1 font-mono text-[10px] text-indigo-700 font-extrabold bg-indigo-50/80 border border-indigo-100/80 px-2 py-0.5 rounded-md shadow-2xs">
                                      <FileText className="h-3 w-3 text-indigo-500" />
                                      #{bill.id.substring(0, 12).toUpperCase()}
                                    </span>
                                    <div className="text-[10px] font-medium text-slate-400 mt-0.5 flex items-center justify-center gap-1 font-sans">
                                      <Clock className="h-2.5 w-2.5 text-slate-350" />
                                      <span>
                                        {new Date(bill.createdAt).toLocaleDateString("en-GB", {
                                          day: "2-digit",
                                          month: "short",
                                        })}
                                      </span>
                                      <span className="text-slate-300">·</span>
                                      <span className="text-slate-400 font-mono text-[9px]">
                                        {new Date(bill.createdAt).toLocaleTimeString([], {
                                          hour: "2-digit",
                                          minute: "2-digit",
                                        })}
                                      </span>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-3 text-center align-middle">
                                  <div className="flex items-center justify-center gap-2">
                                    <div className={`h-7 w-7 rounded-full flex items-center justify-center font-bold text-[10px] shrink-0 ${
                                      isDueLater
                                        ? "bg-amber-100 text-amber-800"
                                        : isPreBooked
                                          ? "bg-purple-100 text-purple-800"
                                          : isCompleted
                                            ? "bg-slate-100 text-slate-600"
                                            : "bg-emerald-100 text-emerald-800"
                                    }`}>
                                      {getGuestInitials(bill.guestDetails.name)}
                                    </div>
                                    <div className="min-w-0 text-left">
                                      <div className="font-bold text-slate-800 text-xs truncate max-w-[130px]">
                                        {bill.guestDetails.name}
                                      </div>
                                      <div className="text-[10px] text-slate-400 font-mono">
                                        NIC: {bill.guestDetails.nic}
                                      </div>
                                    </div>
                                  </div>
                                </td>

                                <td className="py-3 px-3 text-center align-middle text-xs text-slate-500">
                                  <div className="flex flex-wrap items-center justify-center gap-1 max-w-[220px] mx-auto">
                                    {bill.roomItems.length === 0 ? (
                                      <span className="text-slate-400 italic text-[10px]">
                                        None
                                      </span>
                                    ) : (
                                      bill.roomItems.map((r, itemIdx) => (
                                        <span
                                          key={itemIdx}
                                          className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-50 text-blue-700 border border-blue-200 rounded-md text-[10px] font-bold shadow-2xs"
                                        >
                                          <Bed className="h-3 w-3 text-blue-500 shrink-0" />
                                          <span>Rm {r.roomNumber}</span>
                                        </span>
                                      ))
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-3 text-center align-middle font-mono">
                                  <div className="flex flex-col items-center justify-center gap-0.5">
                                    <span className="text-xs font-black text-slate-900">
                                      Rs. {bill.totalAmount.toLocaleString()}
                                    </span>
                                    {Boolean(bill.advancePaidAmount && bill.advancePaidAmount > 0) && (
                                      <span className="inline-flex items-center gap-1 text-[9px] font-bold text-purple-800 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200 shadow-2xs">
                                        <Coins className="h-2.5 w-2.5 text-purple-600" />
                                        Adv:{bill.advancePaidAmount?.toLocaleString()}
                                      </span>
                                    )}
                                  </div>
                                </td>

                                <td className="py-3 px-3 text-center align-middle">
                                  {isDueLater ? (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[9.5px] font-extrabold gap-1 bg-amber-50 text-amber-800 border border-amber-200/90 shadow-2xs">
                                      <Handshake className="h-3 w-3 text-amber-600" />
                                      DUE LATER
                                    </span>
                                  ) : isPreBooked ? (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[9.5px] font-extrabold gap-1 bg-purple-50 text-purple-800 border border-purple-200/90 shadow-2xs">
                                      <Calendar className="h-3 w-3 text-purple-600" />
                                      BOOKED
                                    </span>
                                  ) : !isCompleted ? (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[9.5px] font-extrabold gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/90 shadow-2xs">
                                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                                      LIVE STAY
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-[9.5px] font-extrabold gap-1 bg-slate-100 text-slate-600 border border-slate-200/90 shadow-2xs">
                                      <CheckCircle className="h-3 w-3 text-slate-400" />
                                      CONCLUDED
                                    </span>
                                  )}
                                </td>

                                <td className="py-3 px-3 text-right align-middle">
                                  {!isCompleted ? (
                                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                      {isPreBooked && (
                                        <>
                                          <button
                                            onClick={() => handleCheckInPreBooked(bill)}
                                            className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-xs font-bold transition-all shadow-2xs border-0 cursor-pointer flex items-center gap-1 shrink-0"
                                            title="Check In Pre-Booked Guest Now"
                                          >
                                            <Clock className="h-3.5 w-3.5" />
                                            <span>Check In</span>
                                          </button>
                                          <button
                                            onClick={() => onShowReceipt(bill)}
                                            className="px-2 py-1 bg-purple-50 hover:bg-purple-100 text-purple-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border border-purple-200 cursor-pointer shadow-2xs shrink-0"
                                            title="Print Advance Deposit Receipt"
                                          >
                                            <Printer className="h-3.5 w-3.5 text-purple-600" />
                                            <span>print</span>
                                          </button>
                                        </>
                                      )}
                                      <button
                                        onClick={() => handleResumeBill(bill)}
                                        className="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-lg text-xs font-bold transition-all shadow-2xs border border-indigo-100 cursor-pointer shrink-0"
                                      >
                                        {isDueLater ? "Record Settlement" : isPreBooked ? "Edit" : " Settle"}
                                      </button>
                                    </div>
                                  ) : (
                                    <div className="flex items-center justify-end gap-1.5 whitespace-nowrap">
                                      {currentUser?.role === 'admin' && (
                                        <button
                                          onClick={() => handleResumeBill(bill)}
                                          className="px-2 py-1 bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white rounded-lg text-xs font-bold transition-all flex items-center gap-1 border-0 cursor-pointer shadow-2xs"
                                          title="Edit Completed Bill (Admin Only)"
                                        >
                                          <Pencil className="h-3.5 w-3.5" />
                                          <span>Edit</span>
                                        </button>
                                      )}
                                      <button
                                        onClick={() => onShowReceipt(bill)}
                                        className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all flex items-center gap-1 border-0 cursor-pointer"
                                      >
                                        <Printer className="h-3.5 w-3.5 text-slate-500" />
                                        <span>Print</span>
                                      </button>
                                    </div>
                                  )}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="bg-slate-50 px-4 py-3 border-t border-slate-100 flex items-center justify-between sm:px-6">
                        <div className="flex-1 flex justify-between sm:hidden">
                          <button
                            onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center px-4 py-2 border border-slate-300 text-xs font-bold rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            Previous
                          </button>
                          <button
                            onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                            disabled={currentPage === totalPages}
                            className="ml-3 relative inline-flex items-center px-4 py-2 border border-slate-300 text-xs font-bold rounded-lg text-slate-700 bg-white hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                          >
                            Next
                          </button>
                        </div>
                        <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                          <div>
                            <p className="text-xs text-slate-500">
                              Showing <span className="font-semibold text-slate-800">{((currentPage - 1) * itemsPerPage) + 1}</span> to{' '}
                              <span className="font-semibold text-slate-800">
                                {Math.min(currentPage * itemsPerPage, sortedBills.length)}
                              </span>{' '}
                              of <span className="font-semibold text-slate-800">{sortedBills.length}</span> entries
                            </p>
                          </div>
                          <div>
                            <nav className="relative z-0 inline-flex rounded-md shadow-2xs -space-x-px" aria-label="Pagination">
                              <button
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center px-2 py-1.5 rounded-l-md border border-slate-200 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                &laquo; Prev
                              </button>
                              {Array.from({ length: totalPages }).map((_, idx) => {
                                const pageNum = idx + 1;
                                const isCurrent = currentPage === pageNum;
                                return (
                                  <button
                                    key={pageNum}
                                    onClick={() => setCurrentPage(pageNum)}
                                    className={`relative inline-flex items-center px-3 py-1.5 border text-xs font-bold cursor-pointer transition-colors ${
                                      isCurrent
                                        ? 'z-10 bg-indigo-600 border-indigo-600 text-white'
                                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                                    }`}
                                  >
                                    {pageNum}
                                  </button>
                                );
                              })}
                              <button
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                                className="relative inline-flex items-center px-2 py-1.5 rounded-r-md border border-slate-200 bg-white text-xs font-medium text-slate-500 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
                              >
                                Next &raquo;
                              </button>
                            </nav>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Mobile Stacked Card View (Visible on Mobile screens < md) */}
                  <div className="block md:hidden space-y-3">
                    {paginatedBills.map((bill) => {
                      const isCompleted = bill.status === "Completed";
                      const isDueLater = bill.status === "DueLater";
                      return (
                        <div
                          key={bill.id}
                          className={`bg-white p-4 rounded-xl border shadow-2xs space-y-3 transition-colors ${
                            isDueLater
                              ? "border-amber-100 bg-amber-50/10"
                              : !isCompleted
                                ? "border-emerald-100 bg-emerald-50/5"
                                : "border-slate-150"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <span className="inline-flex items-center gap-1.5 font-mono text-[11px] text-indigo-700 font-extrabold bg-indigo-50/80 border border-indigo-100/80 px-2.5 py-1 rounded-lg shadow-2xs">
                              <FileText className="h-3 w-3 text-indigo-500" />
                              #{bill.id.substring(0, 12).toUpperCase()}
                            </span>
                            {isDueLater ? (
                              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold gap-1 bg-amber-50 text-amber-800 border border-amber-200">
                                <Handshake className="h-3 w-3 text-amber-600" />
                                DUE LATER
                              </span>
                            ) : !isCompleted ? (
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
                              isDueLater
                                ? "bg-amber-100 text-amber-800"
                                : isCompleted
                                  ? "bg-slate-100 text-slate-600"
                                  : "bg-emerald-100 text-emerald-805"
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
                                {isDueLater ? "Record Settlement" : "View / Settle Bill"}
                              </button>
                            ) : (
                              <div className="w-full flex gap-1.5">
                                {currentUser?.role === 'admin' && (
                                  <button
                                    onClick={() => handleResumeBill(bill)}
                                    className="py-2 px-3 bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white rounded-lg text-xs font-bold transition-all border-0 shadow-2xs cursor-pointer flex items-center justify-center gap-1"
                                    title="Edit Completed Bill (Admin Only)"
                                  >
                                    <Pencil className="h-3.5 w-3.5" />
                                    <span>Edit</span>
                                  </button>
                                )}
                                <button
                                  onClick={() => onShowReceipt(bill)}
                                  className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all border-0 cursor-pointer flex items-center justify-center gap-1.5"
                                >
                                  <Printer className="h-3.5 w-3.5 text-slate-500" />
                                  View print
                                </button>
                              </div>
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
                            {currentUser?.role === 'admin' && (
                              <button
                                onClick={() => handleResumeBill(b)}
                                className="p-1.5 bg-amber-50 hover:bg-amber-600 text-amber-700 hover:text-white rounded-md border border-amber-200 font-bold transition-all cursor-pointer flex items-center justify-center text-[10px]"
                                title="Edit Completed Bill (Admin Only)"
                              >
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                            )}
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
                disabled={savingBill}
                className="p-2 border border-slate-200 bg-white hover:bg-slate-50 rounded-lg transition-all text-slate-600 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <ArrowLeft className="h-4 w-4" />
              </button>
              <div>
                <h1 className="text-base font-bold text-slate-900 font-display">
                  Reception POS Express Terminal
                </h1>
                <p className="text-[11px] text-slate-400">
                  {isDueLaterFolio
                    ? "Trust checkout — folio locked until settlement"
                    : terminalBillId
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
                  disabled={folioLocked}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all disabled:opacity-50 ${
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
                  disabled={folioLocked}
                  className={`px-3 py-1 text-xs font-bold rounded-md transition-all disabled:opacity-50 ${
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

          {currentTerminalBill?.status === 'Completed' && (
            <div className="bg-amber-500 text-slate-950 px-4 py-3 rounded-2xl flex items-center justify-between font-bold text-xs shadow-md border border-amber-400">
              <div className="flex items-center gap-2.5">
                <Pencil className="h-4 w-4 text-slate-950" />
                <span>ADMIN EDIT MODE: You are editing a Settled/Completed Bill ({currentTerminalBill.id})</span>
              </div>
              <span className="bg-slate-950 text-amber-300 text-[10px] uppercase font-extrabold px-2.5 py-1 rounded-lg">
                Admin Privileged
              </span>
            </div>
          )}

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
                          disabled={folioLocked}
                          value={newGuestName}
                          onChange={(e) => {
                                const value = e.target.value.replace(/[^a-zA-Z\s]/g, "");
                            setNewGuestName(value);
                             }}
                          placeholder="e.g. manoj"
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
                          disabled={folioLocked}
                          value={newGuestNic}
                          onChange={(e) => {
                          const value = e.target.value
                             .replace(/[^0-9VvXx]/g, "")
                              .toUpperCase();

                               setNewGuestNic(value);
                            }}
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
                          disabled={folioLocked}
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
                          disabled={folioLocked}
                          className="text-xs font-bold text-indigo-600 hover:underline disabled:opacity-50"
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
                          disabled={folioLocked}
                          className="text-xs text-rose-500 hover:font-bold hover:underline font-semibold disabled:opacity-50"
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
                          disabled={folioLocked}
                          className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[11px] uppercase rounded-md shadow-xs disabled:opacity-50"
                        >
                          Search guest database
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/*services charge checkbock*/}
                  <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs">
                    <label className="flex items-center gap-2 text-[10px] font-bold text-slate-400 cursor-pointer w-fit">
                      <input
                        type="checkbox"
                        checked={applyServiceCharge}
                        onChange={(e) => setApplyServiceCharge(e.target.checked)}
                        disabled={folioLocked}
                        className="form-checkbox h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-slate-300 rounded cursor-pointer"
                      />
                      <span>Services Charge</span>
                    </label>
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
                        disabled={folioLocked}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-sm transition-all border-0 cursor-pointer disabled:opacity-50 ${
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
                        disabled={folioLocked}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-sm transition-all border-0 cursor-pointer disabled:opacity-50 ${
                          quickTapsTab === "food"
                            ? "bg-indigo-600 text-white font-extrabold"
                            : "text-slate-300 hover:text-white"
                        }`}
                      >
                        Cuisine (Meals)
                      </button>
                      <button
                        type="button"
                        onClick={() => setQuickTapsTab("packages")}
                        disabled={folioLocked}
                        className={`px-2.5 py-1 text-[10px] font-bold rounded-sm transition-all border-0 cursor-pointer disabled:opacity-50 ${
                          quickTapsTab === "packages"
                            ? "bg-amber-600 text-white font-extrabold shadow-xs"
                            : "text-amber-400 hover:text-amber-200"
                        }`}
                      >
                        🏰 Villa & Kitchen
                      </button>
                    </div>
                  </div>

                  {quickTapsTab === "rooms" ? (
                    <div className="p-4 space-y-2 max-h-[380px] overflow-y-auto">
                      {(() => {
                        const targetBookingDate =
                          selectedGuest?.checkInDate ||
                          newGuestCheckIn ||
                          new Date().toISOString().split("T")[0];
                        return (
                          <>
                            <div className="flex flex-wrap items-center justify-between gap-2 mb-2">
                              <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold flex items-center gap-1.5">
                                <span>Tap Room to Allocate (1 Night)</span>
                                <span className="bg-indigo-900/80 text-indigo-200 border border-indigo-700/60 px-2 py-0.5 rounded-md text-[9px] font-mono font-extrabold">
                                  Booking Date: {targetBookingDate}
                                </span>
                              </p>
                            </div>
                            <div className="grid grid-cols-4 gap-2">
                              {displayRooms.map((r) => {
                                const isBookedOnDate = checkRoomBookedOnDate(r, targetBookingDate);
                                const isAllocated = selectedRooms.some(
                                  (sr) => sr.roomId === r.id || sr.roomNumber === r.roomNumber,
                                );
                                return (
                                  <button
                                    key={r.id}
                                    type="button"
                                    onClick={() => handleQuickTapRoom(r)}
                                    title={
                                      isAllocated
                                        ? `Room ${r.roomNumber} allocated to current cart`
                                        : isBookedOnDate
                                          ? `Room ${r.roomNumber} is already booked/occupied for ${targetBookingDate}`
                                          : `Room ${r.roomNumber} is available for ${targetBookingDate}`
                                    }
                                    className={`h-12 rounded-xl flex flex-col items-center justify-center transition-all relative border border-transparent cursor-pointer ${
                                      isAllocated
                                        ? "bg-indigo-600 text-white shadow-md shadow-indigo-950/50 scale-[1.02]"
                                        : isBookedOnDate
                                          ? "bg-slate-850/60 text-slate-500 line-through opacity-40 cursor-not-allowed border border-rose-900/30"
                                          : "bg-slate-800 hover:bg-slate-755 text-emerald-400 border border-emerald-950/20"
                                    }`}
                                    disabled={folioLocked || (isBookedOnDate && !isAllocated)}
                                  >
                                    <span className={`text-xs font-black block ${
                                      isAllocated ? "text-white" : isBookedOnDate ? "text-slate-500" : "text-emerald-300"
                                    }`}>
                                      {r.roomNumber}
                                    </span>
                                    <span className={`text-[8.5px] font-bold uppercase mt-0.5 tracking-wider ${
                                      isAllocated
                                        ? "text-indigo-100"
                                        : isBookedOnDate
                                          ? "text-rose-400/80"
                                          : "text-slate-200"
                                    }`}>
                                      {isBookedOnDate && !isAllocated ? "BOOKED" : r.roomType.substring(0, 3)}
                                    </span>
                                  </button>
                                );
                              })}
                            </div>
                          </>
                        );
                      })()}
                    </div>
                  ) : quickTapsTab === "food" ? (
                    <div className="p-4 space-y-2 max-h-[380px] overflow-y-auto">
                      <p className="text-[10px] text-slate-300 uppercase tracking-widest font-bold mb-2">
                        Tap Cuisine item to Append Meal
                      </p>

                      <div className="mb-3">
                        <input
                          type="text"
                          value={foodSearchQuery}
                          onChange={(e) => setFoodSearchQuery(e.target.value)}
                          placeholder="Search by food name or category..."
                          disabled={folioLocked}
                          className="w-full px-3 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500 font-mono"
                        />
                      </div>

                      {/* Food Category Quick Filter Pills */}
                      <div className="flex gap-1.5 overflow-x-auto pb-2 scrollbar-thin">
                        {["All", ...Array.from(new Set(foods.map((f) => f.category).filter(Boolean)))].map((cat) => (
                          <button
                            key={cat}
                            type="button"
                            onClick={() => setSelectedFoodCategory(cat)}
                            disabled={folioLocked}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-bold transition-all border whitespace-nowrap cursor-pointer disabled:opacity-50 ${
                              selectedFoodCategory === cat
                                ? "bg-amber-600 text-white border-amber-500 shadow-2xs"
                                : "bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700"
                            }`}
                          >
                            {cat}
                          </button>
                        ))}
                      </div>

                      <div className="grid grid-cols-3 gap-2">
                        {foods
                          .filter((f) => selectedFoodCategory === "All" || f.category === selectedFoodCategory)
                          .filter((f) => {
                            if (!foodSearchQuery.trim()) return true;
                            const query = foodSearchQuery.toLowerCase();
                            return (
                              f.foodName.toLowerCase().includes(query) ||
                              (f.category && f.category.toLowerCase().includes(query))
                            );
                          })
                          .map((f) => {
                            const countSelected =
                              selectedFoods.find((sf) => sf.foodId === f.id)
                                ?.quantity || 0;
                            return (
                              <button
                                key={f.id}
                                type="button"
                                onClick={() => handleQuickTapFood(f)}
                                disabled={folioLocked}
                                className={`p-2.5 rounded-xl text-left transition-all border border-transparent relative flex flex-col justify-between h-14 cursor-pointer disabled:opacity-50 ${
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
                  ) : (
                    /* PACKAGES & KITCHEN CONSOLE */
                    <div className="p-4 space-y-4 max-h-[380px] overflow-y-auto">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] text-amber-400 uppercase tracking-widest font-black flex items-center gap-1.5">
                          <Hotel className="h-3.5 w-3.5 text-amber-400" />
                          <span>Villa Packages & Self-Cooking Add-ons</span>
                        </p>
                      </div>

                      {/* PACKAGE CARD 1: FULL VILLA BOOKING WITH CUSTOM AMOUNT */}
                      <div className="p-3.5 bg-slate-850 border border-slate-700/80 rounded-xl space-y-2.5 shadow-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-black text-amber-300 flex items-center gap-1.5">
                              <Hotel className="h-4 w-4 text-amber-400" />
                              Full Villa Package Booking
                            </h4>
                            <p className="text-[9.5px] text-slate-400">Allocate all available rooms at once with custom rate option</p>
                          </div>
                          <span className="text-[10px] font-mono font-bold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2 py-0.5 rounded">
                            {displayRooms.filter(r => !checkRoomBookedOnDate(r, selectedGuest?.checkInDate || newGuestCheckIn || new Date().toISOString().split("T")[0])).length} Rooms Free
                          </span>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400">Rs.</span>
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={customVillaPriceInput}
                              onChange={(e) => setCustomVillaPriceInput(e.target.value)}
                              placeholder="Custom Villa Amount (e.g. 30000)"
                              disabled={folioLocked}
                              className="w-full pl-8 pr-2 py-1.5 text-xs font-mono font-bold bg-slate-900 text-amber-200 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-amber-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const amount = Number(customVillaPriceInput) || 0;
                              handleSelectFullVilla(amount);
                            }}
                            disabled={folioLocked}
                            className="px-3.5 py-1.5 bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-[11px] uppercase tracking-wider rounded-lg border-0 cursor-pointer shadow-md transition-all shrink-0"
                          >
                            Allocate Full Villa
                          </button>
                        </div>

                        {/* Preset Quick Buttons */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Presets:</span>
                          {[20000, 25000, 30000, 35000, 40000].map((presetAmt) => (
                            <button
                              key={presetAmt}
                              type="button"
                              onClick={() => {
                                setCustomVillaPriceInput(presetAmt.toString());
                                handleSelectFullVilla(presetAmt);
                              }}
                              disabled={folioLocked}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[9.5px] font-mono font-bold cursor-pointer"
                            >
                              Rs. {presetAmt.toLocaleString()}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* PACKAGE CARD 2: KITCHEN & SELF-COOKING FACILITY ADD-ON */}
                      <div className="p-3.5 bg-slate-850 border border-slate-700/80 rounded-xl space-y-2.5 shadow-md">
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-xs font-black text-emerald-300 flex items-center gap-1.5">
                              <Utensils className="h-4 w-4 text-emerald-400" />
                              Kitchen & Self-Cooking Facility Fee
                            </h4>
                            <p className="text-[9.5px] text-slate-400">Add kitchen usage fee with customizable amount option</p>
                          </div>
                        </div>

                        <div className="flex items-center gap-2 pt-1">
                          <div className="relative flex-1">
                            <span className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[10px] font-mono font-bold text-slate-400">Rs.</span>
                            <input
                              type="number"
                              min="0"
                              step="500"
                              value={customKitchenFeeInput}
                              onChange={(e) => setCustomKitchenFeeInput(e.target.value)}
                              placeholder="Kitchen Amount (e.g. 5000)"
                              disabled={folioLocked}
                              className="w-full pl-8 pr-2 py-1.5 text-xs font-mono font-bold bg-slate-900 text-emerald-200 border border-slate-700 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                            />
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              const amount = Number(customKitchenFeeInput) || 5000;
                              handleAddKitchenFee(amount);
                            }}
                            disabled={folioLocked}
                            className="px-3.5 py-1.5 bg-emerald-600 hover:bg-emerald-500 text-white font-black text-[11px] uppercase tracking-wider rounded-lg border-0 cursor-pointer shadow-md transition-all shrink-0"
                          >
                            + Add Kitchen Fee
                          </button>
                        </div>

                        {/* Preset Quick Buttons for Kitchen */}
                        <div className="flex items-center gap-1.5 flex-wrap pt-1">
                          <span className="text-[9px] font-bold text-slate-400 uppercase">Presets:</span>
                          {[2500, 5000, 7500, 10000].map((presetAmt) => (
                            <button
                              key={presetAmt}
                              type="button"
                              onClick={() => {
                                setCustomKitchenFeeInput(presetAmt.toString());
                                handleAddKitchenFee(presetAmt);
                              }}
                              disabled={folioLocked}
                              className="px-2 py-0.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded text-[9.5px] font-mono font-bold cursor-pointer"
                            >
                              Rs. {presetAmt.toLocaleString()}
                            </button>
                          ))}
                        </div>
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
              <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest flex items-center gap-2">
                  <Layers className="h-4 w-4 text-indigo-500" />
                  Terminal Live Totals Sheet
                </h3>
                {isDueLaterFolio && (
                  <button
                    type="button"
                    onClick={handlePreviewBill}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 font-bold text-xs rounded-xl border border-amber-200/90 shadow-xs transition-all cursor-pointer"
                    title="Preview printable Due Later bill invoice"
                  >
                    <Eye className="h-3.5 w-3.5 text-amber-600" />
                    <span>Bill Preview</span>
                  </button>
                )}
              </div>

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
                                  : currentBill.status === 'DueLater'
                                    ? 'bg-amber-100 text-amber-800'
                                    : 'bg-slate-200 text-slate-700'
                              }`}>
                                {currentBill.status === 'DueLater' ? 'Due Later' : currentBill.status}
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
                                disabled={folioLocked || !canDeleteBill}
                                className={`text-slate-400 hover:text-red-600 transition-colors bg-transparent border-0 cursor-pointer p-1 disabled:opacity-50 ${
                                  !canDeleteBill || isDueLaterFolio
                                    ? "opacity-30 cursor-not-allowed"
                                    : ""
                                }`}
                                title={isDueLaterFolio ? "Folio locked after trust checkout" : !canDeleteBill ? "Deletion restricted by Administrator" : "Delete Room stay"}
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
                                  disabled={folioLocked || !canApplyDiscount}
                                  title={!canApplyDiscount ? "Discounts disabled by Admin configuration" : "Set room discount"}
                                  className={`w-14 text-center text-[10px] font-bold bg-blue-50 text-rose-600 border border-blue-200 rounded p-0.5 focus:outline-hidden ${
                                    !canApplyDiscount
                                      ? "opacity-50 cursor-not-allowed"
                                      : ""
                                  }`}
                                  onChange={(e) => {
                                    if (isDueLaterFolio || !canApplyDiscount) return;
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
                                disabled={folioLocked}
                                className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 hover:bg-amber-100 transition-colors bg-transparent border-0 cursor-pointer disabled:opacity-50"
                              >
                                -
                              </button>
                              <span className="px-2 text-[10px] font-bold font-mono text-slate-700">
                                {fd.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => updateFoodQty(fd.foodId, 1)}
                                disabled={folioLocked}
                                className="px-1.5 py-0.5 text-[10px] font-bold text-slate-600 hover:text-slate-900 hover:bg-amber-100 transition-colors bg-transparent border-0 cursor-pointer disabled:opacity-50"
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
                              disabled={folioLocked || !canDeleteBill}
                              className={`text-slate-400 hover:text-red-600 transition-colors bg-transparent border-0 cursor-pointer p-1 disabled:opacity-50 ${
                                !canDeleteBill || isDueLaterFolio
                                  ? "opacity-30 cursor-not-allowed"
                                  : ""
                              }`}
                              title={isDueLaterFolio ? "Folio locked after trust checkout" : !canDeleteBill ? "Deletion restricted by Administrator" : "Delete food item"}
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

                  {/* ADVANCE DEPOSIT PAID SECTION */}
                  <div className="pt-2 space-y-1.5 border-t border-slate-100">
                    <div className="flex items-center justify-between text-xs font-bold text-purple-900">
                      <span className="flex items-center gap-1.5">
                        <Coins className="h-3.5 w-3.5 text-purple-600" />
                        Advance Deposit Paid (Rs.)
                      </span>
                      <input
                        type="number"
                        min="0"
                        max={grandTotal}
                        value={advanceDepositPaid || ""}
                        onChange={(e) => setAdvanceDepositPaid(Math.max(0, Number(e.target.value) || 0))}
                        disabled={savingBill || isDueLaterFolio}
                        placeholder="0"
                        className="w-28 px-2.5 py-1 text-right text-xs font-mono font-extrabold bg-purple-50 text-purple-900 border border-purple-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-purple-500"
                      />
                    </div>
                    {advanceDepositPaid > 0 && (
                      <div className="flex justify-between text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-1 rounded-md border border-emerald-100 font-mono">
                        <span>Balance Due at Check-In:</span>
                        <span>Rs. {Math.max(0, grandTotal - advanceDepositPaid).toLocaleString()}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* SAVE BUTTON MATRIX */}
                {((customerInputMode === "new" && newGuestName.trim() && newGuestNic.trim()) ||
                  (customerInputMode === "existing" && selectedGuest)) ? (
                  <div className="space-y-2 pt-3 border-t border-slate-100">
                    {isDueLaterFolio ? (
                      <>
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-100 text-[11px] text-amber-800 font-semibold">
                          Guest checked out on trust. Rooms are free. Record settlement when payment is received.
                        </div>
                        <label className="block text-[10px] font-bold text-slate-400 uppercase">
                          Trust note (optional)
                        </label>
                        <textarea
                          value={dueLaterNote}
                          onChange={(e) => setDueLaterNote(e.target.value)}
                          disabled={savingBill}
                          rows={2}
                          placeholder="Who authorized, promised date, or other note"
                          className="w-full px-3 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                        />
                        <LoadingButton
                          type="button"
                          onClick={() => handleSaveBill("Completed")}
                          loading={savingBill}
                          loadingLabel="Saving..."
                          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer border-0"
                        >
                          <Printer className="h-4 w-4" />
                          Record Settlement & Print
                        </LoadingButton>
                      </>
                    ) : currentTerminalBill?.status === 'Completed' ? (
                      <>
                        <div className="p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-[11px] text-amber-900 font-semibold flex items-center gap-2">
                          <Pencil className="h-4 w-4 text-amber-600 shrink-0" />
                          <span>Admin Edit Mode: Save changes to update this completed bill.</span>
                        </div>
                        <LoadingButton
                          type="button"
                          onClick={() => handleSaveBill("Completed")}
                          loading={savingBill}
                          loadingLabel="Saving Updates..."
                          className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-lg uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer border-0 shadow-md"
                        >
                          <Save className="h-4 w-4" />
                          Save Admin Edits & Print Bill
                        </LoadingButton>
                      </>
                    ) : (
                      <>
                        <LoadingButton
                          type="button"
                          onClick={() => handleSaveBill("Active")}
                          loading={savingBill}
                          loadingLabel="Saving..."
                          className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-[10px] rounded-lg uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer border-0"
                        >
                          <Clock className="h-4 w-4" />
                          Make Active Check-Stay
                        </LoadingButton>

                        <LoadingButton
                          type="button"
                          onClick={() => handleSaveBill("PreBooked")}
                          loading={savingBill}
                          loadingLabel="Saving Pre-Booking..."
                          className="w-full py-2.5 px-4 bg-purple-600 hover:bg-purple-700 text-white font-bold text-[10px] rounded-lg uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer border-0 shadow-xs"
                        >
                          <Calendar className="h-4 w-4" />
                          Save Pre-Booking (Advance Reservation)
                        </LoadingButton>

                        <LoadingButton
                          type="button"
                          onClick={() => handleSaveBill("Completed")}
                          loading={savingBill}
                          loadingLabel="Saving..."
                          className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-[10px] rounded-lg uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer border-0"
                        >
                          <Printer className="h-4 w-4" />
                          Complete Stay & Print Bill
                        </LoadingButton>

                        {terminalBillId && (
                          <>
                            <label className="block text-[10px] font-bold text-slate-400 uppercase pt-1">
                              Trust note (optional)
                            </label>
                            <textarea
                              value={dueLaterNote}
                              onChange={(e) => setDueLaterNote(e.target.value)}
                              disabled={savingBill}
                              rows={2}
                              placeholder="Who authorized, promised date, or other note"
                              className="w-full px-3 py-2 text-xs bg-slate-50/50 border border-slate-200 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-amber-500"
                            />
                            <LoadingButton
                              type="button"
                              onClick={() => handleSaveBill("DueLater")}
                              loading={savingBill}
                              loadingLabel="Saving..."
                              className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-[10px] rounded-lg uppercase tracking-widest flex items-center justify-center gap-2 transition-all cursor-pointer border-0"
                            >
                              <Handshake className="h-4 w-4" />
                              Checkout on Trust
                            </LoadingButton>
                          </>
                        )}
                      </>
                    )}
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

      {/* ADMIN BILL MERGE STUDIO MODAL */}
      {isMergeModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 z-50 animate-fade-in no-print">
          <div className="bg-white w-full max-w-4xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[92vh]">
            
            {/* Modal Header */}
            <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-indigo-500/20 border border-indigo-400/30 text-indigo-300">
                  <GitMerge className="h-6 w-6 text-indigo-400" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="font-display font-bold text-lg text-white">
                      Admin Bill Merge Studio
                    </h3>
                    <span className="text-[10px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 border border-amber-400/30 uppercase tracking-wide">
                      Admin Privileged
                    </span>
                  </div>
                  <p className="text-xs text-slate-300 mt-0.5">
                    Combine multiple guest folios into a single master bill with aggregated rooms, food items, and charges.
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                disabled={mergingBills}
                className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer disabled:opacity-50"
              >
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto grow space-y-6">
              
              {/* Step 1: Select Bills to Merge */}
              <div className="space-y-3">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">1</span>
                      Select Bills to Merge ({selectedMergeBillIds.length} Selected)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Choose at least 2 folios (Active, Due-Later, or Completed) to consolidate.
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    {/* Status Pill Filters */}
                    <div className="flex gap-1 bg-slate-100 p-1 rounded-xl">
                      {(["All", "Active", "DueLater", "Completed"] as const).map((st) => {
                        const count = st === "All"
                          ? bills.length
                          : bills.filter((b) => b.status === st).length;
                        return (
                          <button
                            key={st}
                            type="button"
                            onClick={() => setMergeStatusFilter(st)}
                            className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold transition-all border-0 cursor-pointer flex items-center gap-1.5 ${
                              mergeStatusFilter === st
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-slate-600 hover:text-slate-900 hover:bg-slate-200/60"
                            }`}
                          >
                            <span>{st === "DueLater" ? "Due Later" : st}</span>
                            <span className="text-[9px] opacity-75 font-mono">({count})</span>
                          </button>
                        );
                      })}
                    </div>

                    {/* Search Input */}
                    <div className="relative min-w-[180px]">
                      <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="Search bill ID or guest..."
                        value={mergeSearchTerm}
                        onChange={(e) => setMergeSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all font-sans"
                      />
                    </div>
                  </div>
                </div>

                <div className="border border-slate-200 rounded-2xl overflow-hidden max-h-[250px] overflow-y-auto divide-y divide-slate-100">
                  {bills
                    .filter((b) => {
                      if (mergeStatusFilter !== "All" && b.status !== mergeStatusFilter) return false;
                      return true;
                    })
                    .filter((b) => {
                      if (!mergeSearchTerm.trim()) return true;
                      const q = mergeSearchTerm.toLowerCase();
                      return (
                        b.id.toLowerCase().includes(q) ||
                        b.guestDetails.name.toLowerCase().includes(q) ||
                        (b.roomItems || []).some((r) => r.roomNumber.toLowerCase().includes(q))
                      );
                    })
                    .map((b) => {
                      const isSelected = selectedMergeBillIds.includes(b.id);
                      const isPrimary = primaryMergeBillId === b.id;
                      const roomNums = (b.roomItems || []).map((r) => `Room ${r.roomNumber}`).join(", ") || "No rooms";
                      const foodCount = (b.foodItems || []).reduce((sum, f) => sum + (f.quantity || 1), 0);

                      return (
                        <div
                          key={b.id}
                          onClick={() => {
                            if (isSelected) {
                              const newSelected = selectedMergeBillIds.filter((id) => id !== b.id);
                              setSelectedMergeBillIds(newSelected);
                              if (primaryMergeBillId === b.id) {
                                setPrimaryMergeBillId(newSelected[0] || null);
                              }
                            } else {
                              const newSelected = [...selectedMergeBillIds, b.id];
                              setSelectedMergeBillIds(newSelected);
                              if (!primaryMergeBillId) {
                                setPrimaryMergeBillId(b.id);
                              }
                            }
                          }}
                          className={`p-3.5 flex items-center justify-between gap-3 cursor-pointer transition-colors ${
                            isSelected ? "bg-indigo-50/50 hover:bg-indigo-50" : "hover:bg-slate-50"
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="checkbox"
                              checked={isSelected}
                              onChange={() => {}}
                              className="h-4 w-4 text-indigo-600 rounded border-slate-300 pointer-events-none"
                            />
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-xs text-indigo-700">{b.id}</span>
                                <span className="font-bold text-slate-800 text-xs">{b.guestDetails.name}</span>
                                <span className={`text-[9px] font-extrabold px-2 py-0.5 rounded-full ${
                                  b.status === "Active"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : b.status === "DueLater"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-indigo-100 text-indigo-700"
                                }`}>
                                  {b.status === "DueLater" ? "Due Later" : b.status}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-0.5 font-sans">
                                <span>🛏️ {roomNums}</span>
                                <span>🍲 {foodCount} food item(s)</span>
                                {b.guestDetails.phone && <span>📞 {b.guestDetails.phone}</span>}
                              </div>
                            </div>
                          </div>

                          <div className="text-right">
                            <span className="font-mono font-bold text-sm text-slate-900 block">
                              Rs. {b.totalAmount.toLocaleString()}
                            </span>
                            {isSelected && isPrimary && (
                              <span className="text-[9px] font-bold text-indigo-600 bg-indigo-100 px-2 py-0.5 rounded-md uppercase tracking-wider inline-block mt-0.5">
                                Master Destination
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}

                  {bills.length === 0 && (
                    <div className="p-8 text-center text-slate-400 text-xs italic">
                      No bills available in the system.
                    </div>
                  )}
                </div>
              </div>

              {/* Step 2: Select Primary Destination Bill */}
              {selectedMergeBillIds.length >= 2 && (
                <div className="space-y-3 pt-2">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-indigo-600 text-white flex items-center justify-center text-[10px]">2</span>
                      Choose Master Destination Bill (Primary Guest & Folio)
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      The chosen bill will retain its Invoice ID and Guest profile. All other selected bills will be merged into it and closed.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedMergeBills.map((b) => {
                      const isPrimary = primaryMergeBillId === b.id;
                      return (
                        <div
                          key={b.id}
                          onClick={() => setPrimaryMergeBillId(b.id)}
                          className={`p-4 rounded-2xl border cursor-pointer transition-all ${
                            isPrimary
                              ? "border-indigo-600 bg-indigo-50/60 shadow-xs ring-2 ring-indigo-500/20"
                              : "border-slate-200 hover:border-slate-300 bg-white"
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <input
                                type="radio"
                                name="primaryBill"
                                checked={isPrimary}
                                onChange={() => setPrimaryMergeBillId(b.id)}
                                className="h-4 w-4 text-indigo-600 pointer-events-none"
                              />
                              <span className="font-mono font-bold text-xs text-indigo-700">{b.id}</span>
                            </div>
                            <span className="font-bold text-slate-900 text-xs font-mono">
                              Rs. {b.totalAmount.toLocaleString()}
                            </span>
                          </div>
                          <p className="font-bold text-slate-800 text-sm mt-2">{b.guestDetails.name}</p>
                          <p className="text-[11px] text-slate-400 mt-0.5">
                            NIC: {b.guestDetails.nic || 'N/A'} | Phone: {b.guestDetails.phone || 'N/A'}
                          </p>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Step 3: Live Consolidated Merge Preview */}
              {mergedPreview && targetMergeBill && (
                <div className="space-y-4 pt-2">
                  <div>
                    <h4 className="text-xs font-extrabold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                      <span className="w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center text-[10px]">3</span>
                      Live Consolidated Bill Preview
                    </h4>
                  </div>

                  <div className="bg-slate-50 p-4 sm:p-5 rounded-2xl border border-slate-200 space-y-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-slate-200">
                      <div>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Master Guest Folio</span>
                        <p className="text-sm font-bold text-slate-800">
                          {targetMergeBill.guestDetails.name} <span className="font-mono text-indigo-600">({targetMergeBill.id})</span>
                        </p>
                      </div>
                      <div className="text-left sm:text-right">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest block">Merged Total Balance</span>
                        <p className="text-xl font-bold font-mono text-emerald-700">
                          Rs. {mergedPreview.totalAmount.toLocaleString()}
                        </p>
                      </div>
                    </div>

                    {/* Breakdown columns */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {/* Combined Rooms */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                          <Bed className="h-3.5 w-3.5 text-emerald-500" />
                          Consolidated Room Stays ({mergedPreview.combinedRooms.length})
                        </span>
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto text-xs">
                          {mergedPreview.combinedRooms.map((rm, idx) => (
                            <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                              <div>
                                <span className="font-bold text-slate-800">Room {rm.roomNumber}</span>
                                <span className="text-[10px] text-slate-400 block">{rm.roomType} • {rm.nights} night(s)</span>
                              </div>
                              <span className="font-mono font-semibold text-slate-700">
                                Rs. {(rm.pricePerNight * rm.nights).toLocaleString()}
                              </span>
                            </div>
                          ))}
                          {mergedPreview.combinedRooms.length === 0 && (
                            <p className="text-[11px] text-slate-400 italic">No room stays</p>
                          )}
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-xs">
                          <span>Room Subtotal:</span>
                          <span className="font-mono text-slate-900">Rs. {mergedPreview.roomSubtotal.toLocaleString()}</span>
                        </div>
                      </div>

                      {/* Combined Foods */}
                      <div className="bg-white p-3.5 rounded-xl border border-slate-200 space-y-2">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block flex items-center gap-1.5">
                          <Coffee className="h-3.5 w-3.5 text-amber-500" />
                          Consolidated Food & Beverages ({mergedPreview.combinedFoods.length})
                        </span>
                        <div className="space-y-1.5 max-h-[140px] overflow-y-auto text-xs">
                          {mergedPreview.combinedFoods.map((fi, idx) => (
                            <div key={idx} className="flex items-center justify-between py-1 border-b border-slate-50 last:border-0">
                              <div>
                                <span className="font-bold text-slate-800">{fi.foodName}</span>
                                <span className="text-[10px] text-slate-400 block">{fi.quantity}x @ Rs. {fi.price}</span>
                              </div>
                              <span className="font-mono font-semibold text-slate-700">
                                Rs. {(fi.price * fi.quantity).toLocaleString()}
                              </span>
                            </div>
                          ))}
                          {mergedPreview.combinedFoods.length === 0 && (
                            <p className="text-[11px] text-slate-400 italic">No food items</p>
                          )}
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex justify-between font-bold text-xs">
                          <span>Food Subtotal:</span>
                          <span className="font-mono text-slate-900">Rs. {mergedPreview.foodSubtotal.toLocaleString()}</span>
                        </div>
                      </div>
                    </div>

                    {/* Merge notes input */}
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Admin Merge Remarks / Authorization Note (Optional)
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. Merged guest group per customer request at frontdesk"
                        value={mergeNotes}
                        onChange={(e) => setMergeNotes(e.target.value)}
                        className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 font-sans"
                      />
                    </div>
                  </div>
                </div>
              )}

            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
              <button
                type="button"
                onClick={() => setIsMergeModalOpen(false)}
                disabled={mergingBills}
                className="px-4 py-2.5 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold transition-all cursor-pointer disabled:opacity-50"
              >
                Cancel
              </button>

              <button
                type="button"
                onClick={handleExecuteMerge}
                disabled={mergingBills || selectedMergeBillIds.length < 2 || !primaryMergeBillId}
                className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-md shadow-indigo-200 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <GitMerge className="h-4 w-4" />
                {mergingBills ? "Merging Bills..." : `Confirm & Merge ${selectedMergeBillIds.length} Bills`}
              </button>
            </div>

          </div>
        </div>
      )}
      </div>
  );
};
