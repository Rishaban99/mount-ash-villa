'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Expense, User, Bill } from '@/lib/types';
import { isStaffActiveForMonth } from '@/lib/staffPayroll';
import { 
  Plus, 
  Search, 
  Edit2, 
  Trash2, 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  FileText, 
  Filter, 
  Wallet, 
  Calendar,
  X,
  CreditCard,
  Building,
  Wrench,
  UtensilsCrossed,
  Sparkles,
  Command,
  TrendingUpIcon,
  Zap,
  Droplet,
  Phone,
  Check,
  Loader2
} from 'lucide-react';
import { LoadingButton } from '@/components/loading-button';
import { apiFetch } from '@/lib/api';
import { toastCreated, toastUpdated, toastDeleted, toastError } from '@/lib/crud-toast';
import { useAuth } from '@/components/auth-provider';
import { hasPermission } from '@/lib/permissions';
import type { SystemSettings } from '@/lib/types';
import { useRouter, useSearchParams } from 'next/navigation';

export const Expenses: React.FC = () => {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const initialAction = searchParams.get('action');

  if (!currentUser) return null;

  const onClose = () => router.push('/dashboard');
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState('All');
  const [filterPayment, setFilterPayment] = useState('All');
  const [filterDateRange, setFilterDateRange] = useState('All');
  const [subTab, setSubTab] = useState<'individual' | 'daily'>('daily');
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mon}`;
  });

  const getSelectedMonthName = () => {
    if (!selectedMonth || selectedMonth === 'All') {
      return new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
    }
    const [year, month] = selectedMonth.split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, 15);
    return dateObj.toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  };

  const getSelectedMonthShortName = () => {
    if (!selectedMonth || selectedMonth === 'All') {
      return new Date().toLocaleDateString('en-US', { month: 'short' });
    }
    const [year, month] = selectedMonth.split('-');
    const dateObj = new Date(Number(year), Number(month) - 1, 15);
    return dateObj.toLocaleDateString('en-US', { month: 'short' });
  };

  const getTodayShortStr = () => {
    return new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const getYesterdayShortStr = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    return yesterday.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  // Staff salaries details toggle and selection
  const [showStaffSalaries, setShowStaffSalaries] = useState(false);
  const [showUtilityTracker, setShowUtilityTracker] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUserForPay, setSelectedUserForPay] = useState<User | null>(null);

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState('');
  const [category, setCategory] = useState('Utilities');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [description, setDescription] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Cash');
  const [approvedBy, setApprovedBy] = useState(currentUser.name);

  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const [settings, setSettings] = useState<any>(null);

  useEffect(() => {
    const cached = localStorage.getItem('system_settings_cache');
    if (cached) {
      try {
        setSettings(JSON.parse(cached));
      } catch (e) {}
    }
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          localStorage.setItem('system_settings_cache', JSON.stringify(data));
        }
      } catch (err) {}
    };
    fetchSettings();
  }, []);

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';

  const canDeleteExpense = hasPermission(currentUser.role, 'allowManagerDeleteExpenses', settings);

  // Fetch all expenses
  const fetchExpenses = async () => {
    try {
      const res = await fetch('/api/expenses');
      if (res.ok) {
        const data = await res.json();
        setExpenses(data);
      }
    } catch (e) {
      console.error('Failed to fetch expenses:', e);
    }
  };

  // Fetch bills to calculate Total Revenue/Cashflow
  const fetchBills = async () => {
    try {
      const res = await fetch('/api/bills');
      if (res.ok) {
        const data = await res.json();
        setBills(data);
      }
    } catch (e) {
      console.error('Failed to fetch bills:', e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    } catch (e) {
      console.error('Failed to fetch users at Expenses:', e);
    }
  };

  useEffect(() => {
    fetchExpenses();
    fetchBills();
    fetchUsers();
  }, []);

  useEffect(() => {
    if (initialAction === 'new') {
      handleOpenAdd();
      router.replace('/expenses');
    }
  }, [initialAction]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setTitle('');
    setAmount('');
    setCategory('Utilities');
    setDate(new Date().toISOString().split('T')[0]);
    setDescription('');
    setPaymentMethod('Cash');
    setApprovedBy(currentUser.name);
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (exp: Expense) => {
    setEditingId(exp.id);
    setTitle(exp.title);
    setAmount(exp.amount.toString());
    setCategory(exp.category);
    setDate(exp.date);
    setDescription(exp.description);
    setPaymentMethod(exp.paymentMethod);
    setApprovedBy(exp.approvedBy || currentUser.name);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !amount || !date) {
      setError('Title, Amount, and Date are required.');
      return;
    }

    if (isNaN(Number(amount)) || Number(amount) <= 0) {
      setError('Please provide a valid expense amount greater than 0.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      id: editingId || undefined,
      title,
      amount: Number(amount),
      category,
      date,
      description,
      approvedBy,
      paymentMethod,
    };

    try {
      const res = await apiFetch('/api/expenses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to record expense.');
      }

      if (selectedUserForPay) {
        try {
          await apiFetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              id: selectedUserForPay.id,
              lastPaid: date,
            }),
          });
        } catch (e) {
          console.error('Failed to stamp lastPaid logic:', e);
        }
        setSelectedUserForPay(null);
      }

      if (editingId) {
        toastUpdated('Expense');
      } else {
        toastCreated('Expense');
      }

      if (isAdmin) {
        setIsModalOpen(false);
      } else {
        handleOpenAdd();
      }
      await fetchExpenses();
      await fetchUsers();
    } catch (err: any) {
      toastError(err.message || 'An error occurred while saving.');
      setError(err.message || 'An error occurred while saving.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!isAdmin) {
      toastError('Only administrative accounts can delete expense ledgers.');
      return;
    }

    if (!window.confirm('Are you sure you want to permanently delete this expense ledger? This cannot be undone.')) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/expenses/${id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toastDeleted('Expense');
        await fetchExpenses();
      } else {
        toastError(data.error || 'Failed to delete expense.');
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to delete expense.');
    } finally {
      setDeletingId(null);
    }
  };

  // Helper styles for Category Pills
  const getCategoryStyle = (cat: string) => {
    switch (cat) {
      case 'Utilities':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Salaries':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Food & Supplies':
        return 'bg-amber-50 text-amber-700 border-amber-100';
      case 'Maintenance':
        return 'bg-rose-50 text-rose-700 border-rose-100';
      case 'Marketing':
        return 'bg-indigo-50 text-indigo-700 border-indigo-100';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const getAvailableMonths = () => {
    const monthsSet = new Set<string>();
    bills.forEach(b => {
      const dateStr = b.updatedAt || b.createdAt;
      if (dateStr) {
        monthsSet.add(dateStr.substring(0, 7)); // 'YYYY-MM'
      }
    });
    expenses.forEach(e => {
      if (e.date) {
        monthsSet.add(e.date.substring(0, 7)); // 'YYYY-MM'
      }
    });
    const d = new Date();
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    monthsSet.add(`${d.getFullYear()}-${mon}`);

    return Array.from(monthsSet).sort().reverse();
  };

  const filteredBillsForStats = selectedMonth === 'All'
    ? bills
    : bills.filter(b => (b.updatedAt || b.createdAt || '').startsWith(selectedMonth));

  const filteredExpensesForStats = selectedMonth === 'All'
    ? expenses
    : expenses.filter(e => (e.date || '').startsWith(selectedMonth));

  const getPaidThisMonth = (u: User) => {
    const currentYearMonth = selectedMonth !== 'All' ? selectedMonth : new Date().toISOString().substring(0, 7); // "2026-06"
    return expenses
      .filter((exp) => {
        const isSalary = exp.category === 'Salaries';
        const matchesUser = exp.title.includes(u.name) || exp.description?.includes(u.name);
        const matchesMonth = exp.date.startsWith(currentYearMonth);
        return isSalary && matchesUser && matchesMonth;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  const getBalanceSalary = (u: User) => {
    const activeMonth = selectedMonth !== 'All' ? selectedMonth : new Date().toISOString().substring(0, 7);
    const baseSalary = u.monthlyBaseSalaries?.[activeMonth] !== undefined
      ? u.monthlyBaseSalaries[activeMonth]
      : (u.salary || 35000);
    const paidThisMonth = getPaidThisMonth(u);
    return Math.max(0, baseSalary - paidThisMonth);
  };

  const payrollMonth = selectedMonth !== 'All' ? selectedMonth : new Date().toISOString().substring(0, 7);
  const payrollEligibleStaff = users.filter((u) => isStaffActiveForMonth(u, payrollMonth));

  const getCEBSpentThisMonth = () => {
    const currentYearMonth = selectedMonth !== 'All' ? selectedMonth : new Date().toISOString().substring(0, 7); // "2026-06"
    return expenses
      .filter((exp) => {
        const isUtility = exp.category === 'Utilities';
        const titleLower = exp.title.toLowerCase();
        const descLower = (exp.description || '').toLowerCase();
        const matchesQuery = 
          titleLower.includes('ceb') || 
          titleLower.includes('electricity') ||
          titleLower.includes('electric') ||
          titleLower.includes('power') ||
          descLower.includes('ceb') ||
          descLower.includes('electricity');
        const matchesMonth = exp.date.startsWith(currentYearMonth);
        return isUtility && matchesQuery && matchesMonth;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  const getWaterSpentThisMonth = () => {
    const currentYearMonth = selectedMonth !== 'All' ? selectedMonth : new Date().toISOString().substring(0, 7); // "2026-06"
    return expenses
      .filter((exp) => {
        const isUtility = exp.category === 'Utilities';
        const titleLower = exp.title.toLowerCase();
        const descLower = (exp.description || '').toLowerCase();
        const matchesQuery = 
          titleLower.includes('water') || 
          titleLower.includes('watar') ||
          descLower.includes('water') ||
          descLower.includes('watar');
        const matchesMonth = exp.date.startsWith(currentYearMonth);
        return isUtility && matchesQuery && matchesMonth;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  const getPhoneSpentThisMonth = () => {
    const currentYearMonth = selectedMonth !== 'All' ? selectedMonth : new Date().toISOString().substring(0, 7); // "2026-06"
    return expenses
      .filter((exp) => {
        const isUtility = exp.category === 'Utilities';
        const titleLower = exp.title.toLowerCase();
        const descLower = (exp.description || '').toLowerCase();
        const matchesQuery = 
          titleLower.includes('phone') || 
          titleLower.includes('telecom') || 
          titleLower.includes('internet') || 
          titleLower.includes('wifi') || 
          titleLower.includes('dialog') || 
          titleLower.includes('slt') ||
          titleLower.includes('mobitel') ||
          descLower.includes('phone') ||
          descLower.includes('telecom') ||
          descLower.includes('internet') ||
          descLower.includes('wifi');
        const matchesMonth = exp.date.startsWith(currentYearMonth);
        return isUtility && matchesQuery && matchesMonth;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  // Filter Logic
  const filteredExpenses = expenses.filter(exp => {
    const matchesSearch = 
      exp.title.toLowerCase().includes(search.toLowerCase()) || 
      exp.description.toLowerCase().includes(search.toLowerCase()) ||
      (exp.approvedBy && exp.approvedBy.toLowerCase().includes(search.toLowerCase()));

    const matchesCategory = filterCategory === 'All' || exp.category === filterCategory;
    const matchesPayment = filterPayment === 'All' || exp.paymentMethod === filterPayment;

    let matchesDate = true;
    if (filterDateRange !== 'All') {
      const expDate = new Date(exp.date);
      const today = new Date();
      
      const getLocalDateStr = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      if (filterDateRange === 'Today') {
        matchesDate = exp.date === getLocalDateStr(today);
      } else if (filterDateRange === 'Yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        matchesDate = exp.date === getLocalDateStr(yesterday);
      } else if (filterDateRange === 'Last5Days') {
        const last5DaysList: string[] = [];
        for (let i = 0; i < 5; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          last5DaysList.push(getLocalDateStr(d));
        }
        matchesDate = last5DaysList.includes(exp.date);
      } else if (filterDateRange === 'ThisMonth') {
        matchesDate = expDate.getMonth() === today.getMonth() && expDate.getFullYear() === today.getFullYear();
      } else if (filterDateRange === 'Last30Days') {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = expDate >= thirtyDaysAgo;
      }
    } else if (selectedMonth !== 'All') {
      matchesDate = exp.date.startsWith(selectedMonth);
    }

    return matchesSearch && matchesCategory && matchesPayment && matchesDate;
  });

  // Calculations for Aggregate Cards
  const totalCompletedRevenue = filteredBillsForStats
    .filter(b => b.status === 'Completed')
    .reduce((acc, b) => acc + (b.totalAmount || 0), 0);

  const grandTotalExpenses = filteredExpensesForStats.reduce((acc, exp) => acc + exp.amount, 0);
  const netEarnings = totalCompletedRevenue - grandTotalExpenses;

  const utilitiesTotal = filteredExpensesForStats.filter(exp => exp.category === 'Utilities').reduce((acc, exp) => acc + exp.amount, 0);
  const salariesTotal = filteredExpensesForStats.filter(exp => exp.category === 'Salaries').reduce((acc, exp) => acc + exp.amount, 0);
  const maintenanceTotal = filteredExpensesForStats.filter(exp => exp.category === 'Maintenance').reduce((acc, exp) => acc + exp.amount, 0);
  const foodSuppliesTotal = filteredExpensesForStats.filter(exp => exp.category === 'Food & Supplies').reduce((acc, exp) => acc + exp.amount, 0);
  const marketingTotal = filteredExpensesForStats.filter(exp => exp.category === 'Marketing').reduce((acc, exp) => acc + exp.amount, 0);
  const otherTotal = filteredExpensesForStats.filter(exp => exp.category === 'Other').reduce((acc, exp) => acc + exp.amount, 0);
  const RoomCommison = filteredExpensesForStats.filter(exp => exp.category === 'Room Commission').reduce((acc, exp) => acc + exp.amount, 0);
  const Tranport = filteredExpensesForStats.filter(exp => exp.category === 'Transport').reduce((acc, exp) => acc + exp.amount, 0);

  // Category breakdown for progress bar insight widget
  const categoriesBreakdown = [
    { name: 'Utilities', amount: utilitiesTotal, color: 'bg-purple-500', pct: grandTotalExpenses > 0 ? (utilitiesTotal / grandTotalExpenses) * 100 : 0 },
    { name: 'Salaries', amount: salariesTotal, color: 'bg-emerald-500', pct: grandTotalExpenses > 0 ? (salariesTotal / grandTotalExpenses) * 100 : 0 },
    { name: 'Food & Supplies', amount: foodSuppliesTotal, color: 'bg-amber-500', pct: grandTotalExpenses > 0 ? (foodSuppliesTotal / grandTotalExpenses) * 100 : 0 },
    { name: 'Maintenance', amount: maintenanceTotal, color: 'bg-rose-500', pct: grandTotalExpenses > 0 ? (maintenanceTotal / grandTotalExpenses) * 100 : 0 },
    { name: 'Marketing', amount: marketingTotal, color: 'bg-indigo-500', pct: grandTotalExpenses > 0 ? (marketingTotal / grandTotalExpenses) * 100 : 0 },
    { name: 'Other', amount: otherTotal, color: 'bg-slate-500', pct: grandTotalExpenses > 0 ? (otherTotal / grandTotalExpenses) * 100 : 0 },
    { name: 'Room Commission', amount: RoomCommison, color: 'bg-cyan-500', pct: grandTotalExpenses > 0 ? (RoomCommison / grandTotalExpenses) * 100 : 0 },
    { name: 'Transport', amount: Tranport, color: 'bg-blue-500', pct: grandTotalExpenses > 0 ? (Tranport / grandTotalExpenses) * 100 : 0 },
  ].sort((a, b) => b.amount - a.amount);

  // Helper to format date string to YYYY-MM-DD format based on local/system timezone safely
  const formatDateString = (isoString?: string) => {
    if (!isoString) return '';
    try {
      const d = new Date(isoString);
      if (isNaN(d.getTime())) return '';
      const year = d.getFullYear();
      const month = String(d.getMonth() + 1).padStart(2, '0');
      const day = String(d.getDate()).padStart(2, '0');
      return `${year}-${month}-${day}`;
    } catch (e) {
      return '';
    }
  };

  // Group by day for both Income and Expenses
  const dailyMap: { [key: string]: { date: string; income: number; expenses: number } } = {};

  // 1. Process all completed bills (income)
  bills.forEach(bill => {
    if (bill.status === 'Completed') {
      const dateStr = formatDateString(bill.createdAt);
      if (dateStr) {
        if (!dailyMap[dateStr]) {
          dailyMap[dateStr] = { date: dateStr, income: 0, expenses: 0 };
        }
        dailyMap[dateStr].income += bill.totalAmount || 0;
      }
    }
  });

  // 2. Process all expenses (outflows)
  expenses.forEach(exp => {
    const dateStr = exp.date; // already YYYY-MM-DD
    if (dateStr) {
      if (!dailyMap[dateStr]) {
        dailyMap[dateStr] = { date: dateStr, income: 0, expenses: 0 };
      }
      dailyMap[dateStr].expenses += exp.amount || 0;
    }
  });

  const dailyEntries = Object.values(dailyMap).sort((a, b) => a.date.localeCompare(b.date));

  // Compute rolling closing cash balance
  let runningBalAccumulator = 0;
  const computedDailyLedger = dailyEntries.map(entry => {
    runningBalAccumulator += (entry.income - entry.expenses);
    return {
      ...entry,
      net: entry.income - entry.expenses,
      balance: runningBalAccumulator,
    };
  });

  // Filter daily cashbook
  const filteredDailyLedger = computedDailyLedger.filter(item => {
    // Search can match exact or partial date (e.g. YYYY-MM-DD)
    const matchesSearch = search === '' || item.date.includes(search);

    let matchesDate = true;
    if (filterDateRange !== 'All') {
      const entryDate = new Date(item.date);
      const today = new Date();
      
      const getLocalDateStr = (d: Date) => {
        const year = d.getFullYear();
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const day = String(d.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
      };

      if (filterDateRange === 'Today') {
        matchesDate = item.date === getLocalDateStr(today);
      } else if (filterDateRange === 'Yesterday') {
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        matchesDate = item.date === getLocalDateStr(yesterday);
      } else if (filterDateRange === 'Last5Days') {
        const last5DaysList: string[] = [];
        for (let i = 0; i < 5; i++) {
          const d = new Date(today);
          d.setDate(today.getDate() - i);
          last5DaysList.push(getLocalDateStr(d));
        }
        matchesDate = last5DaysList.includes(item.date);
      } else if (filterDateRange === 'ThisMonth') {
        matchesDate = entryDate.getMonth() === today.getMonth() && entryDate.getFullYear() === today.getFullYear();
      } else if (filterDateRange === 'Last30Days') {
        const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
        matchesDate = entryDate >= thirtyDaysAgo;
      }
    } else if (selectedMonth !== 'All') {
      matchesDate = item.date.startsWith(selectedMonth);
    }

    return matchesSearch && matchesDate;
  }).sort((a, b) => b.date.localeCompare(a.date)); // Sort descending for display (latest first)

  if (!isAdmin) {
    return (
      <div className="max-w-xl mx-auto space-y-6 py-4 relative">
        {/* Simple visual header */}
        <div className="text-center space-y-1 relative px-8">
          {(
            <button
              type="button"
              onClick={onClose}
              className="absolute right-0 top-1 p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-full transition-all border-0 cursor-pointer flex items-center justify-center shadow-xs"
              title="Close and return to Dashboard"
              id="receptionist-close-header-btn"
            >
              <X className="h-4 w-4" />
            </button>
          )}
          <div className="inline-flex p-3 bg-indigo-50 text-indigo-600 rounded-full mb-2">
            <Wallet className="h-6 w-6" />
          </div>
          <h2 className="text-xl font-bold font-display text-slate-800">Record New Hotel Expense</h2>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            Log outbound values for utilities, purchases, dining provisions, or miscellaneous maintenance.
          </p>
        </div>

        <div className="bg-white border border-slate-100 rounded-2xl shadow-xs p-6" id="receptionist-form-container">
            <form onSubmit={handleSave} className="space-y-4">
              <fieldset disabled={loading} className="space-y-4 border-0 p-0 m-0 min-w-0">
              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg border border-rose-100">
                  {error}
                </div>
              )}

              {/* Title input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expense Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Water Bill May 2026, Fresh Produce purchase..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors bg-white text-slate-850"
                />
              </div>

              {category === 'Salaries' && (
                <div className="space-y-1 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/60 animate-fade-in text-slate-850">
                  <label className="text-[10px] font-bold text-indigo-750 uppercase tracking-wider block">Beneficiary Staff (Auto-fill)</label>
                  <select
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) {
                        setSelectedUserForPay(null);
                        return;
                      }
                      const staff = users.find(u => u.id === selectedId);
                      if (staff) {
                        const bal = getBalanceSalary(staff);
                        const activeMonth = selectedMonth !== 'All' ? selectedMonth : new Date().toISOString().substring(0, 7);
                        const staffMonthSalary = staff.monthlyBaseSalaries?.[activeMonth] !== undefined
                          ? staff.monthlyBaseSalaries[activeMonth]
                          : (staff.salary || 35000);
                        setTitle(`Salary - ${staff.name} (${getSelectedMonthName()})`);
                        setAmount(String(bal > 0 ? bal : staffMonthSalary));
                        setDescription(`Salary payout to ${staff.name} for ${getSelectedMonthName()}.`);
                        setSelectedUserForPay(staff);
                      }
                    }}
                    value={selectedUserForPay?.id || ''}
                    className="w-full px-2.5 py-1.5 border border-indigo-200 rounded-lg text-xs text-slate-705 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-550 focus:border-indigo-500"
                  >
                    <option value="">-- Choose employee to auto-fill --</option>
                    {payrollEligibleStaff.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role === 'manager' ? 'Manager' : 'Receptionist'} - Balance Due: Rs. {getBalanceSalary(u).toLocaleString()})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {category === 'Utilities' && (
                <div className="space-y-1 bg-purple-50/40 p-3 rounded-xl border border-purple-100/60 animate-fade-in text-slate-850">
                  <label className="text-[10px] font-bold text-purple-750 uppercase tracking-wider block mb-1">Quick Utilities Presets (Auto-fill)</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const currentMonthName = getSelectedMonthName();
                        setTitle(`CEB Electricity Bill - ${currentMonthName}`);
                        setDescription(`Monthly Ceylon Electricity Board grid utility charge for ${currentMonthName}.`);
                      }}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold rounded-lg border border-amber-200 cursor-pointer transition-all flex items-center gap-1 leading-none uppercase"
                    >
                      ⚡ CEB Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const currentMonthName = getSelectedMonthName();
                        setTitle(`Water Bill - ${currentMonthName}`);
                        setDescription(`Monthly city water supply board consumption charge for ${currentMonthName}.`);
                      }}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-[10px] font-bold rounded-lg border border-blue-200 cursor-pointer transition-all flex items-center gap-1 leading-none uppercase"
                    >
                      💧 Water Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const currentMonthName = getSelectedMonthName();
                        setTitle(`Phone Bill - ${currentMonthName}`);
                        setDescription(`Monthly hotel internet and telephone line rental for ${currentMonthName}.`);
                      }}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-lg border border-indigo-200 cursor-pointer transition-all flex items-center gap-1 leading-none uppercase"
                    >
                      📞 Phone Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const currentMonthName = getSelectedMonthName();
                        setTitle(`ASK Cable Bill - ${currentMonthName}`);
                        setDescription(`Monthly ASK cable TV subscription charge for ${currentMonthName}.`);
                      }}
                      className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 text-[10px] font-bold rounded-lg border border-purple-200 cursor-pointer transition-all flex items-center gap-1 leading-none uppercase"
                    >
                      📺 ASK Cable
                    </button>
                  </div>
                </div>
              )}

              {/* Row: Amount + Category */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Flow Amount (Rs.) *</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g., 2500"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-[#f1f5f9] focus:border-indigo-500 transition-colors bg-white text-slate-850"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors bg-white"
                  >
                    <option value="Utilities">Utilities</option>
                    <option value="Salaries">Salaries</option>
                    <option value="Food & Supplies">Food & Supplies</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Room Commission">Room Commission</option>
                    <option value="Transport">Transport</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Row: Date + Method */}
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Date</label>
                  <div className="w-full px-3 py-2 border border-slate-150 rounded-xl text-xs text-slate-500 bg-slate-50/70 flex items-center gap-1.5 font-bold select-none h-[34px]">
                    <span className="text-sm">📅</span>
                    <span>{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors bg-white"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>
              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Description / Notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide supporting ledger context..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-[#f1f5f9] focus:border-indigo-500 transition-colors resize-none bg-white text-slate-850"
                />
              </div>

              {/* Approver Tag */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Officer Approver</label>
                <input
                  type="text"
                  disabled
                  value={approvedBy}
                  className="w-full px-3 py-2 border border-slate-100 bg-slate-50/50 rounded-xl text-xs text-slate-455 focus:outline-none"
                />
              </div>

              {/* Submit & Cancel Row */}
              <div className="pt-2 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold border-0 cursor-pointer transition-colors disabled:opacity-50"
                >
                  Cancel & Close
                </button>
                <LoadingButton
                  type="submit"
                  loading={loading}
                  loadingLabel="Processing..."
                  className="flex-1 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-sm border-0 cursor-pointer transition-colors flex items-center justify-center gap-2"
                >
                  Save Outflow Ledger
                </LoadingButton>
              </div>
              </fieldset>
            </form>
          </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      
      {/* Top Banner with Action Button */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold font-display text-slate-800">Hotel Spends & Operating Expenses</h2>
          <p className="text-xs text-slate-500 mt-1">Audit, register, and analyze internal outflows, utilities, payroll, and maintenance ledgers</p>
        </div>
        <div className="flex flex-wrap items-center gap-3 self-stretch md:self-auto justify-between md:justify-end min-w-0">
          <div className="flex items-center gap-2 overflow-x-auto py-1 px-0.5 max-w-full md:max-w-[420px] lg:max-w-[550px] scrollbar-thin shrink-0">
            {getAvailableMonths().map(m => {
              const [year, month] = m.split('-');
              const dateObj = new Date(Number(year), Number(month) - 1, 15);
              const monthName = dateObj.toLocaleDateString(undefined, { month: 'short' });
              const isSelected = selectedMonth === m;

              return (
                <button
                  key={m}
                  onClick={() => setSelectedMonth(m)}
                  className={`relative min-w-[90px] h-11 px-3 py-1.5 bg-white rounded-xl border transition-all text-left group cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/5 shadow-xs'
                      : 'border-slate-200/60 hover:border-slate-300'
                  }`}
                >
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">{year}</span>
                  <span className="block text-[11px] font-bold text-slate-700 mt-1">{monthName}</span>
                  {/* Active bottom line */}
                  <div className={`absolute bottom-0 left-2.5 right-2.5 h-[2px] rounded-t-full transition-all duration-300 ${
                    isSelected ? 'bg-indigo-600 scale-x-100' : 'bg-transparent scale-x-0 group-hover:bg-slate-200 group-hover:scale-x-50'
                  }`} />
                </button>
              );
            })}
          </div>

          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white font-semibold px-4 py-2 rounded-xl text-xs shadow-sm transition-all border-0 cursor-pointer h-11 shrink-0"
          >
            <Plus className="h-4 w-4" />
            Record New Expense
          </button>
        </div>
      </div>

      {/* Aggregate Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        
        {/* Total Revenue (+) Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest">Total Revenue (+)</p>
            <p className="text-2xl font-display font-bold text-slate-800 mt-2">Rs. {totalCompletedRevenue.toLocaleString()}</p>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
              <span>Concluded POS & Room sales</span>
            </div>
          </div>
          <div className="p-3 bg-emerald-50 rounded-xl text-emerald-600 shrink-0">
            <TrendingUp className="h-5 w-5" />
          </div>
        </div>

        {/* Total Expenses Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-rose-500 uppercase tracking-widest">Total Expenses (-)</p>
            <p className="text-2xl font-display font-bold text-slate-800 mt-2">Rs. {grandTotalExpenses.toLocaleString()}</p>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
              <span>Outbound capital ledger sum</span>
            </div>
          </div>
          <div className="p-3 bg-red-50 rounded-xl text-rose-500 shrink-0">
            <Wallet className="h-5 w-5" />
          </div>
        </div>

        {/* Operating Balance / Profit Card */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">Net Liquid State</p>
            <p className={`text-2xl font-display font-bold mt-2 ${netEarnings >= 0 ? 'text-emerald-600' : 'text-rose-600'}`}>
              Rs. {netEarnings.toLocaleString()}
            </p>
            <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1">
              {netEarnings >= 0 ? (
                <>
                  <TrendingUp className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="text-emerald-600 font-semibold">Net Operating Profit</span>
                </>
              ) : (
                <>
                  <TrendingDown className="h-3.5 w-3.5 text-rose-500" />
                  <span className="text-rose-600 font-semibold">Operating Deficit</span>
                </>
              )}
            </div>
          </div>
          <div className={`p-3 rounded-xl shrink-0 ${netEarnings >= 0 ? 'bg-indigo-50 text-indigo-600' : 'bg-rose-50 text-rose-600'}`}>
            <DollarSign className="h-5 w-5" />
          </div>
        </div>

        {/* Utilities & Salaries Breakdown (Interactive Staff Salaries trigger) */}
        <div 
          onClick={() => {
            setShowStaffSalaries(!showStaffSalaries);
            setShowUtilityTracker(false);
          }}
          className={`p-5 rounded-2xl border shadow-xs flex items-start justify-between cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
            showStaffSalaries 
              ? 'bg-indigo-50/50 border-indigo-200 ring-2 ring-indigo-500/10' 
              : 'bg-white border-slate-100 hover:border-indigo-150'
          }`}
          title="Click to view staff-wise breakdown and pay wages"
        >
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest flex items-center gap-1">
              <span>Staff Salaries</span>
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse"></span>
            </p>
            <p className="text-2xl font-display font-bold text-slate-800 mt-2">Rs. {salariesTotal.toLocaleString()}</p>
            <div className="text-[10px] text-indigo-500 font-semibold mt-1">
              {showStaffSalaries ? 'Click to hide list' : 'Click to show / pay'}
            </div>
          </div>
          <div className="p-3 bg-indigo-50 rounded-xl text-indigo-500 shrink-0">
            <Building className="h-5 w-5" />
          </div>
        </div>

        {/* Utilities & Operating Bills Tracker (Interactive Utility Bills trigger) */}
        <div 
          onClick={() => {
            setShowUtilityTracker(!showUtilityTracker);
            setShowStaffSalaries(false);
          }}
          className={`p-5 rounded-2xl border shadow-xs flex items-start justify-between cursor-pointer transition-all hover:scale-[1.02] active:scale-[0.98] ${
            showUtilityTracker 
              ? 'bg-purple-50/50 border-purple-200 ring-2 ring-purple-500/10' 
              : 'bg-white border-slate-100 hover:border-purple-150'
          }`}
          title="Click to view ceb, water, and phone bill status and record fast"
        >
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-purple-600 uppercase tracking-widest flex items-center gap-1">
              <span>Utility Bills</span>
              <span className="w-1.5 h-1.5 rounded-full bg-purple-600 animate-pulse"></span>
            </p>
            <p className="text-2xl font-display font-bold text-slate-800 mt-2">Rs. {utilitiesTotal.toLocaleString()}</p>
            <div className="text-[10px] text-purple-500 font-semibold mt-1">
              {showUtilityTracker ? 'Click to hide tracker' : 'Click to register spends'}
            </div>
          </div>
          <div className="p-3 bg-purple-50 rounded-xl text-purple-500 shrink-0">
            <Zap className="h-5 w-5" />
          </div>
        </div>

        {/* Maintenance & Supplies Breakdown */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex items-start justify-between">
          <div className="space-y-1">
            <p className="text-[11px] font-bold text-amber-500 uppercase tracking-widest">Maintenance</p>
            <p className="text-2xl font-display font-bold text-slate-800 mt-2">Rs. {maintenanceTotal.toLocaleString()}</p>
            <div className="text-[10px] text-slate-400 mt-1">
              F&B: Rs. {foodSuppliesTotal.toLocaleString()}
            </div>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl text-amber-600 shrink-0">
            <Wrench className="h-5 w-5" />
          </div>
        </div>

      </div>

      {/* Click-to-show Staff Salaries Breakdown and Quick Pay */}
      {showStaffSalaries && (
        <div className="bg-white p-6 rounded-2xl border border-indigo-150 shadow-xs space-y-4 animate-fade-in" id="staff-salaries-breakdown">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h3 className="font-display font-medium text-sm text-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-indigo-600 animate-pulse inline-block"></span>
                Active Staff Payroll & Balance Tracker
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Real-time tracking of staff base salaries, amount paid this month, and pending due balance
              </p>
            </div>
            <button
              onClick={() => setShowStaffSalaries(false)}
              className="sm:self-center px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-colors border-0 cursor-pointer text-[10px] uppercase align-middle"
              type="button"
            >
              Hide Staff List
            </button>
          </div>

          {/* Monthly indicator and switcher cards */}
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-indigo-50/20 p-4 rounded-xl border border-indigo-100/40">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Payroll Period:</span>
              <span className="px-2.5 py-1 bg-indigo-150 text-indigo-700 rounded-lg text-xs font-bold uppercase tracking-wide">
                📆 {getSelectedMonthName()}
              </span>
            </div>
            <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-thin select-none">
              {getAvailableMonths().map(m => {
                const [year, month] = m.split('-');
                const dateObj = new Date(Number(year), Number(month) - 1, 15);
                const monthName = dateObj.toLocaleDateString(undefined, { month: 'short' });
                const isSelected = selectedMonth === m;

                return (
                  <button
                    key={m}
                    onClick={() => setSelectedMonth(m)}
                    className={`relative min-w-[80px] h-10 px-2 py-1.5 bg-white rounded-xl border transition-all text-left group cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-50/5 shadow-xs'
                        : 'border-slate-200/60 hover:border-slate-300'
                    }`}
                  >
                    <span className="block text-[7px] font-bold text-slate-400 uppercase tracking-wider leading-none">{year}</span>
                    <span className="block text-[10px] font-bold text-slate-700 mt-0.5">{monthName}</span>
                    {/* Active bottom line */}
                    <div className={`absolute bottom-0 left-2 right-2 h-[2px] rounded-t-full transition-all duration-300 ${
                      isSelected ? 'bg-indigo-600 scale-x-100' : 'bg-transparent scale-x-0 group-hover:bg-slate-200 group-hover:scale-x-50'
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {payrollEligibleStaff.map((u) => {
                const paid = getPaidThisMonth(u);
                const balance = getBalanceSalary(u);
                const activeMonth = selectedMonth !== 'All' ? selectedMonth : new Date().toISOString().substring(0, 7);
                const baseSalary = u.monthlyBaseSalaries?.[activeMonth] !== undefined
                  ? u.monthlyBaseSalaries[activeMonth]
                  : (u.salary || 35000);
                const payPercentage = Math.min(100, Math.round((paid / baseSalary) * 100));

                const initials = u.name
                  ? u.name
                      .split(' ')
                      .map((n) => n[0])
                      .join('')
                      .substring(0, 2)
                      .toUpperCase()
                  : 'ST';

                const isManager = u.role === 'manager';
                const avatarBg = isManager
                  ? 'bg-gradient-to-br from-amber-500 to-orange-450 text-white'
                  : 'bg-gradient-to-br from-indigo-505 from-indigo-500 to-sky-455 to-sky-400 text-white';

                return (
                  <div key={u.id} className="bg-slate-50/70 border border-slate-150/60 p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:bg-slate-50 hover:shadow-xs transition-all duration-200">
                    {/* Header profile row */}
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-display font-extrabold text-xs tracking-wider shadow-sm ${avatarBg}`}>
                        {initials}
                      </div>
                      <div>
                        <h4 className="font-bold text-slate-800 text-xs">{u.name}</h4>
                        <span className="text-[8px] px-1.5 py-0.5 bg-slate-200/80 text-slate-600 font-bold rounded-md uppercase tracking-wider mt-0.5 inline-block">
                          {isManager ? 'Hotel Manager' : 'Receptionist'}
                        </span>
                      </div>
                    </div>

                    {/* Progress slider bar */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[9px]">
                        <span className="text-slate-400 font-bold uppercase tracking-wider">Payroll Progress</span>
                        <span className="font-mono font-bold text-slate-600">{payPercentage}%</span>
                      </div>
                      <div className="h-1 w-full bg-slate-200 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${payPercentage}%` }}
                          className={`h-full rounded-full transition-all duration-300 ${
                            payPercentage === 100 ? 'bg-emerald-500' : 'bg-indigo-500'
                          }`}
                        />
                      </div>
                    </div>

                    <div className="space-y-2 border-t border-slate-100 pt-2.5">
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400 font-semibold font-sans">Monthly Base Wage</span>
                        <span className="text-slate-700 font-bold font-mono text-xs">Rs. {baseSalary.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs">
                        <span className="text-slate-400 font-semibold font-sans">Paid This Month</span>
                        <span className="text-emerald-600 font-bold font-mono text-xs">Rs. {paid.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between text-xs border-t border-slate-100/60 pt-1.5">
                        <span className="text-slate-500 font-medium font-sans">Balance Salary Due</span>
                        <div className="flex items-center gap-1">
                          <span className={`font-bold font-mono text-xs ${balance > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                            Rs. {balance.toLocaleString()}
                          </span>
                          {balance === 0 ? (
                            <span className="px-1.5 py-0.5 text-[7px] font-bold uppercase rounded bg-emerald-50 text-emerald-700 leading-none">Paid</span>
                          ) : (
                            <span className="px-1.5 py-0.5 text-[7px] font-bold uppercase rounded bg-amber-50 text-amber-500 leading-none">Due</span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2">
                      {balance > 0 ? (
                        <button
                          type="button"
                          onClick={() => {
                            // Preset the record expense modal
                            setEditingId(null);
                            setTitle(`Salary - ${u.name} (${getSelectedMonthName()})`);
                            setAmount(String(balance));
                            setCategory('Salaries');
                            setDate(new Date().toISOString().split('T')[0]);
                            setDescription(`Salary payout of Rs. ${balance.toLocaleString()} to ${u.name} for ${getSelectedMonthName()}.`);
                            setPaymentMethod('Bank Transfer');
                            setApprovedBy(currentUser.name);
                            setSelectedUserForPay(u); // keep track so we update their profile timestamp after saving
                            setError(null);
                            setIsModalOpen(true);
                          }}
                          className="w-full py-2 bg-indigo-600 hover:bg-slate-900 text-white text-[10px] font-bold uppercase rounded-lg shadow-xs transition-all border-0 cursor-pointer text-center flex items-center justify-center gap-1"
                        >
                          💸 Pay Balance Salary
                        </button>
                      ) : (
                        <div className="w-full py-1.5 bg-emerald-50 border border-emerald-100/10 text-emerald-700 text-[9px] font-bold uppercase rounded-lg text-center font-sans tracking-wide">
                          ✓ Settled for {getSelectedMonthShortName()}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
          </div>
        </div>
      )}

      {/* Click-to-show Utility Bills Tracker */}
      {showUtilityTracker && (
        <div className="bg-white p-6 rounded-2xl border border-purple-200 shadow-sm space-y-4 animate-fade-in" id="utilities-bill-tracker">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div>
              <h3 className="font-display font-medium text-sm text-slate-800 flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-purple-600 animate-pulse inline-block"></span>
                Monthly Operational Utility Bills Center
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Register and keep track of repeating utility spends for {new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
              </p>
            </div>
            <button
              onClick={() => setShowUtilityTracker(false)}
              className="sm:self-center px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold rounded-lg transition-colors border-0 cursor-pointer text-[10px] uppercase align-middle"
              type="button"
            >
              Hide Tracker
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            
            {/* 1. CEB Bill */}
            {(() => {
              const cebPaid = getCEBSpentThisMonth();
              const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              return (
                <div className="bg-slate-50/70 border border-slate-150/60 p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:bg-slate-50 hover:shadow-xs transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-amber-500 text-white shadow-sm shrink-0">
                      <Zap className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">CEB Electricity Bill</h4>
                      <span className="text-[8px] px-1.5 py-0.5 bg-amber-100 text-amber-800 font-bold rounded-md uppercase tracking-wider mt-0.5 inline-block">
                        Ceylon Electricity Board
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-semibold font-sans">Billing Period</span>
                      <span className="text-slate-700 font-bold font-mono text-xs">{currentMonthName}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-slate-100/40 pt-1.5">
                      <span className="text-slate-500 font-medium font-sans font-semibold">Payment Status</span>
                      {cebPaid > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className="font-bold font-mono text-xs text-emerald-600">
                            Paid
                          </span>
                          <span className="px-1.5 py-0.5 text-[7px] font-bold uppercase rounded bg-emerald-55 bg-emerald-50 text-emerald-700 leading-none">Settled</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="font-bold font-mono text-xs text-rose-500">
                            Pending
                          </span>
                          <span className="px-1.5 py-0.5 text-[7px] font-bold uppercase rounded bg-rose-50 text-rose-500 leading-none">Unpaid</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    {cebPaid > 0 ? (
                      <div className="w-full py-2 bg-emerald-50/45 border border-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-lg text-center font-sans tracking-wide">
                        ✓ Settled (Rs. {cebPaid.toLocaleString()})
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setTitle(`CEB Electricity Bill - ${currentMonthName}`);
                          setAmount('');
                          setCategory('Utilities');
                          setDate(new Date().toISOString().split('T')[0]);
                          setDescription(`Monthly Ceylon Electricity Board grid utility charge for ${currentMonthName}.`);
                          setPaymentMethod('Cash');
                          setApprovedBy(currentUser.name);
                          setError(null);
                          setIsModalOpen(true);
                        }}
                        className="w-full py-2 bg-purple-600 hover:bg-slate-900 text-white text-[10px] font-bold uppercase rounded-lg shadow-xs transition-all border-0 cursor-pointer text-center flex items-center justify-center gap-1"
                      >
                        ⚡ Record CEB Bill Payment
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 2. Water Bill */}
            {(() => {
              const waterPaid = getWaterSpentThisMonth();
              const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              return (
                <div className="bg-slate-50/70 border border-slate-150/60 p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:bg-slate-50 hover:shadow-xs transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-blue-500 text-white shadow-sm shrink-0">
                      <Droplet className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">Water Board Bill</h4>
                      <span className="text-[8px] px-1.5 py-0.5 bg-blue-100 text-blue-800 font-bold rounded-md uppercase tracking-wider mt-0.5 inline-block">
                        Water Board Utility
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-semibold font-sans">Billing Period</span>
                      <span className="text-slate-700 font-bold font-mono text-xs">{currentMonthName}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-slate-100/40 pt-1.5">
                      <span className="text-slate-500 font-medium font-sans font-semibold">Payment Status</span>
                      {waterPaid > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className="font-bold font-mono text-xs text-emerald-600">
                            Paid
                          </span>
                          <span className="px-1.5 py-0.5 text-[7px] font-bold uppercase rounded bg-emerald-55 bg-emerald-50 text-emerald-700 leading-none">Settled</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="font-bold font-mono text-xs text-rose-500">
                            Pending
                          </span>
                          <span className="px-1.5 py-0.5 text-[7px] font-bold uppercase rounded bg-rose-50 text-rose-500 leading-none">Unpaid</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    {waterPaid > 0 ? (
                      <div className="w-full py-2 bg-emerald-50/45 border border-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-lg text-center font-sans tracking-wide">
                        ✓ Settled (Rs. {waterPaid.toLocaleString()})
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setTitle(`Water Bill - ${currentMonthName}`);
                          setAmount('');
                          setCategory('Utilities');
                          setDate(new Date().toISOString().split('T')[0]);
                          setDescription(`Monthly city water supply board consumption charge for ${currentMonthName}.`);
                          setPaymentMethod('Cash');
                          setApprovedBy(currentUser.name);
                          setError(null);
                          setIsModalOpen(true);
                        }}
                        className="w-full py-2 bg-purple-600 hover:bg-slate-900 text-white text-[10px] font-bold uppercase rounded-lg shadow-xs transition-all border-0 cursor-pointer text-center flex items-center justify-center gap-1"
                      >
                        💧 Record Water Bill Payment
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

            {/* 3. Phone Bill */}
            {(() => {
              const phonePaid = getPhoneSpentThisMonth();
              const currentMonthName = new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
              return (
                <div className="bg-slate-50/70 border border-slate-150/60 p-5 rounded-2xl flex flex-col justify-between space-y-4 hover:bg-slate-50 hover:shadow-xs transition-all duration-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-indigo-500 text-white shadow-sm shrink-0">
                      <Phone className="h-5 w-5" />
                    </div>
                    <div>
                      <h4 className="font-bold text-slate-800 text-xs">Telecom Phone Bill</h4>
                      <span className="text-[8px] px-1.5 py-0.5 bg-indigo-100 text-indigo-800 font-bold rounded-md uppercase tracking-wider mt-0.5 inline-block">
                        Dialog / SLT/ Mobitel
                      </span>
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-slate-100 pt-2.5">
                    <div className="flex justify-between text-xs">
                      <span className="text-slate-400 font-semibold font-sans">Billing Period</span>
                      <span className="text-slate-700 font-bold font-mono text-xs">{currentMonthName}</span>
                    </div>
                    <div className="flex justify-between text-xs border-t border-slate-100/40 pt-1.5">
                      <span className="text-slate-500 font-medium font-sans font-semibold">Payment Status</span>
                      {phonePaid > 0 ? (
                        <div className="flex items-center gap-1">
                          <span className="font-bold font-mono text-xs text-emerald-600">
                            Paid
                          </span>
                          <span className="px-1.5 py-0.5 text-[7px] font-bold uppercase rounded bg-emerald-55 bg-emerald-50 text-emerald-700 leading-none">Settled</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <span className="font-bold font-mono text-xs text-rose-500">
                            Pending
                          </span>
                          <span className="px-1.5 py-0.5 text-[7px] font-bold uppercase rounded bg-rose-50 text-rose-500 leading-none">Unpaid</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2">
                    {phonePaid > 0 ? (
                      <div className="w-full py-2 bg-emerald-50/45 border border-emerald-100 text-emerald-700 text-[10px] font-bold uppercase rounded-lg text-center font-sans tracking-wide">
                        ✓ Settled (Rs. {phonePaid.toLocaleString()})
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          setEditingId(null);
                          setTitle(`Phone Bill - ${currentMonthName}`);
                          setAmount('');
                          setCategory('Utilities');
                          setDate(new Date().toISOString().split('T')[0]);
                          setDescription(`Monthly hotel internet and telephone line rental for ${currentMonthName}.`);
                          setPaymentMethod('Cash');
                          setApprovedBy(currentUser.name);
                          setError(null);
                          setIsModalOpen(true);
                        }}
                        className="w-full py-2 bg-purple-600 hover:bg-slate-900 text-white text-[10px] font-bold uppercase rounded-lg shadow-xs transition-all border-0 cursor-pointer text-center flex items-center justify-center gap-1"
                      >
                        📞 Record Phone Bill Payment
                      </button>
                    )}
                  </div>
                </div>
              );
            })()}

          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Ledger & Master Table - Spans 2 Columns */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-xs lg:col-span-2 overflow-hidden flex flex-col">
          
          {/* Header & Search */}
          <div className="p-5 border-b border-slate-100 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => setSubTab('daily')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all border-0 cursor-pointer ${
                    subTab === 'daily' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Daily Cashbook
                </button>
                <button
                  type="button"
                  onClick={() => setSubTab('individual')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold uppercase transition-all border-0 cursor-pointer ${
                    subTab === 'individual' ? 'bg-white text-slate-800 shadow-xs' : 'text-slate-500 hover:text-slate-800'
                  }`}
                >
                  Outflows Ledger
                </button>
              </div>
              <span className="text-[10px] bg-indigo-50 text-indigo-600 px-2 py-0.5 font-bold rounded uppercase tracking-wider self-start sm:self-center border border-indigo-100">
                {subTab === 'daily' ? `${filteredDailyLedger.length} Days Logged` : `${filteredExpenses.length} Expense Records`}
              </span>
            </div>

            {/* Filter controls row */}
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-2">
              
              {/* Search */}
              <div className="sm:col-span-2 relative">
                <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
                <input
                  type="text"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder={subTab === 'daily' ? "Query specific date YYYY-MM-DD..." : "Query expense, category, approver..."}
                  className="w-full pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {/* Category Filter */}
              <select
                disabled={subTab === 'daily'}
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {subTab === 'daily' ? (
                  <option>All Outflows Consolidated</option>
                ) : (
                  <>
                    <option value="All">All Categories</option>
                    <option value="Utilities">Utilities</option>
                    <option value="Salaries">Salaries</option>
                    <option value="Food & Supplies">Food & Supplies</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Room Commission">Room Commission</option>
                    <option value="Transport">Transport</option>
                    <option value="Other">Other</option>
                  </>
                )}
              </select>

              {/* Payment Filter */}
              <select
                disabled={subTab === 'daily'}
                value={filterPayment}
                onChange={(e) => setFilterPayment(e.target.value)}
                className="w-full px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-slate-100"
              >
                {subTab === 'daily' ? (
                  <option>All Payments Included</option>
                ) : (
                  <>
                    <option value="All">All Payments</option>
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </>
                )}
              </select>

            </div>

            {/* Date Quick Range Filter Tabs */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-indigo-50/15 p-4 rounded-xl border border-indigo-100/40">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold text-indigo-500 uppercase tracking-wider">Duration:</span>
              </div>
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full scrollbar-thin select-none">
                {[
                  { key: 'All', meta: 'FULL HISTORY', label: 'All Time' },
                  { key: 'Today', meta: 'TODAY', label: getTodayShortStr() },
                  { key: 'Yesterday', meta: 'YESTERDAY', label: getYesterdayShortStr() },
                  { key: 'Last5Days', meta: '5 DAYS', label: 'Last 5 Days' },
                ].map(item => {
                  const isSelected = filterDateRange === item.key;

                  return (
                    <button
                      key={item.key}
                      onClick={() => setFilterDateRange(item.key)}
                      className={`relative min-w-[100px] h-11 px-3 py-1.5 bg-white rounded-xl border transition-all text-left group cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 ${
                        isSelected
                          ? 'border-indigo-500 bg-indigo-50/5 shadow-xs'
                          : 'border-slate-200/60 hover:border-slate-300'
                      }`}
                    >
                      <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">{item.meta}</span>
                      <span className="block text-[11px] font-bold text-slate-700 mt-1">{item.label}</span>
                      {/* Active bottom line */}
                      <div className={`absolute bottom-0 left-2.5 right-2.5 h-[2px] rounded-t-full transition-all duration-300 ${
                        isSelected ? 'bg-indigo-600 scale-x-100' : 'bg-transparent scale-x-0 group-hover:bg-slate-200 group-hover:scale-x-50'
                      }`} />
                    </button>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Table Container */}
          <div className="overflow-x-auto">
            {subTab === 'daily' ? (
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="py-3.5 px-4 font-semibold">Date & Day</th>
                    <th className="py-3.5 px-4 text-right font-semibold">Inflow / Revenue (+)</th>
                    <th className="py-3.5 px-4 text-right font-semibold">Outflow Spends (-)</th>
                    <th className="py-3.5 px-4 text-right font-semibold">Net Cash Flow</th>
                    <th className="py-3.5 px-4 text-right font-semibold">Closing Balance</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredDailyLedger.map((row) => {
                    let dayName = '';
                    try {
                      dayName = new Date(row.date).toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric', year: 'numeric' });
                    } catch (e) {
                      dayName = 'Unknown day';
                    }
                    return (
                      <tr key={row.date} className="hover:bg-slate-50/50 transition-all">
                        
                        <td className="py-4 px-4 min-w-[150px]">
                          <div className="font-semibold text-slate-800 font-mono">{row.date}</div>
                          <div className="text-[10px] text-slate-400 mt-0.5">{dayName}</div>
                        </td>

                        <td className="py-4 px-4 text-right">
                          {row.income > 0 ? (
                            <span className="font-bold text-emerald-600 font-mono">
                              + Rs. {row.income.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-300 font-mono">-</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right font-mono">
                          {row.expenses > 0 ? (
                            <span className="font-semibold text-rose-500">
                              - Rs. {row.expenses.toLocaleString()}
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>

                        <td className="py-4 px-4 text-right">
                          <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold font-mono border ${
                            row.net >= 0 
                              ? 'bg-emerald-50 text-emerald-700 border-emerald-100' 
                              : 'bg-rose-50 text-rose-700 border-rose-100'
                          }`}>
                            {row.net >= 0 ? '+' : ''} Rs. {row.net.toLocaleString()}
                          </span>
                        </td>

                        <td className="py-4 px-4 text-right font-bold font-mono text-slate-800">
                          Rs. {row.balance.toLocaleString()}
                        </td>

                      </tr>
                    );
                  })}
                  
                  {filteredDailyLedger.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 italic">
                        No day-by-day cash book entries found. Try adjusting duration filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            ) : (
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="py-3.5 px-4">Expense Details</th>
                    <th className="py-3.5 px-4 text-center">Category</th>
                    <th className="py-3.5 px-4 text-right">Invoice Sum</th>
                    <th className="py-3.5 px-4 text-center">Method</th>
                    <th className="py-3.5 px-4">Authorized By</th>
                    {canDeleteExpense && <th className="py-3.5 px-4 text-center border-0 font-bold uppercase tracking-widest text-[10px]">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredExpenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-slate-50/50 transition-all">
                      
                      {/* Title + Description + Date */}
                      <td className="py-3 px-4 min-w-[200px]">
                        <div className="font-semibold text-slate-800">{exp.title}</div>
                        {exp.description && (
                          <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">{exp.description}</div>
                        )}
                        <div className="text-[10px] text-slate-400 font-mono mt-1 flex items-center gap-1">
                          <Calendar className="h-3 w-3 text-slate-300" />
                          <span>{exp.date}</span>
                        </div>
                      </td>

                      {/* Category */}
                      <td className="py-3 px-4 text-center">
                        <span className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${getCategoryStyle(exp.category)}`}>
                          {exp.category}
                        </span>
                      </td>

                      {/* Amount */}
                      <td className="py-3 px-4 text-right font-bold text-slate-800 font-mono">
                        Rs. {exp.amount.toLocaleString()}
                      </td>

                      {/* Payment Method Badge */}
                      <td className="py-3 px-4 text-center">
                        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-100">
                          {exp.paymentMethod === 'Cash' && <Sparkles className="h-2.5 w-2.5 text-amber-500" />}
                          {exp.paymentMethod === 'Card' && <CreditCard className="h-2.5 w-2.5 text-purple-500" />}
                          {exp.paymentMethod === 'Bank Transfer' && <Building className="h-2.5 w-2.5 text-blue-500" />}
                          {exp.paymentMethod === 'Cheque' && <FileText className="h-2.5 w-2.5 text-slate-500" />}
                          {exp.paymentMethod}
                        </span>
                      </td>

                      {/* Approved By */}
                      <td className="py-3 px-4">
                        <div className="text-slate-700 font-medium">{exp.approvedBy || 'Admin Approval'}</div>
                        <span className="text-[9px] text-slate-400 block uppercase tracking-tight">Active Officer</span>
                      </td>

                      {/* Action buttons */}
                      {canDeleteExpense && (
                        <td className="py-3 px-4 text-center no-print">
                          <div className="flex items-center justify-center gap-1">
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(exp)}
                              title="Edit Outbound entry"
                              className="p-1.5 hover:bg-slate-100 hover:text-indigo-600 rounded-md transition-colors text-slate-400 border-0 cursor-pointer"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDelete(exp.id)}
                              disabled={deletingId === exp.id}
                              title="Delete Outbound entry"
                              className="p-1.5 rounded-md transition-colors border-0 cursor-pointer text-slate-400 hover:bg-rose-50 hover:text-rose-600 disabled:opacity-50"
                            >
                              {deletingId === exp.id ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : (
                                <Trash2 className="h-3.5 w-3.5" />
                              )}
                            </button>
                          </div>
                        </td>
                      )}

                    </tr>
                  ))}
                  
                  {filteredExpenses.length === 0 && (
                    <tr>
                      <td colSpan={canDeleteExpense ? 6 : 5} className="py-12 text-center text-slate-400 italic">
                        No expense records match the specified filters. Try Adjusting filters.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            )}
          </div>

        </div>

        {/* Insights Area - Spans 1 Column */}
        <div className="space-y-6">
          
          {/* Spend Category Breakdown Widget */}
          <div className="bg-white p-5 rounded-2xl border border-slate-200/80 shadow-xs space-y-4">
            <h3 className="font-display font-bold text-sm text-slate-800">Spends Outflow Analysis</h3>
            <p className="text-xs text-slate-400">Percentage distribution of company capital expenditures by critical operational node</p>

            <div className="space-y-3.5 pt-2">
              {categoriesBreakdown.map((item, idx) => (
                <div key={item.name} className="space-y-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-slate-700">{item.name}</span>
                    <span className="font-bold text-slate-800 font-mono">
                      Rs. {item.amount.toLocaleString()} <span className="text-slate-400 font-normal text-[10px]">({Math.round(item.pct)}%)</span>
                    </span>
                  </div>
                  
                  {/* Custom Progress bar gauge */}
                  <div className="w-full h-2 bg-slate-100 rounded-full overflow-hidden">
                    <div 
                      className={`h-full ${item.color} rounded-full transition-all duration-500`}
                      style={{ width: `${item.pct}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-3 border-t border-slate-100 text-center">
              <span className="text-[10px] text-slate-400 uppercase tracking-widest font-bold">
                Total outflows: Rs. {grandTotalExpenses.toLocaleString()}
              </span>
            </div>
          </div>

          {/* Hotel Cashflow Comparative Health check */}
          <div className="bg-slate-900 text-slate-200 p-5 rounded-2xl border border-slate-800 shadow-sm space-y-4 relative overflow-hidden">
            <div className="absolute right-0 top-0 -mr-6 -mt-6 w-24 h-24 bg-white/5 rounded-full blur-xl pointer-events-none" />
            <h3 className="font-display font-bold text-sm text-indigo-300 flex items-center gap-1.5">
              <Command className="h-4 w-4 text-indigo-400" />
              Operational Cashflow
            </h3>
            
            <p className="text-xs text-slate-400">Comparison of capital generated via completed room and restaurant invoicing against operating expenditures.</p>

            <div className="space-y-3 pt-2 font-mono">
              
              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-450 font-sans">Total Revenue (+)</span>
                <span className="text-emerald-400 font-bold">Rs. {totalCompletedRevenue.toLocaleString()}</span>
              </div>

              <div className="flex justify-between items-center text-xs">
                <span className="text-slate-450 font-sans">Total Expenses (-)</span>
                <span className="text-rose-400 font-bold">Rs. {grandTotalExpenses.toLocaleString()}</span>
              </div>

              <div className="h-px bg-slate-800 my-2" />

              <div className="flex justify-between items-center">
                <span className="text-xs text-white font-sans font-semibold">Net Liquid State</span>
                <span className={`text-sm font-bold ${netEarnings >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Rs. {netEarnings.toLocaleString()}
                </span>
              </div>

            </div>

            <div className={`p-2.5 rounded-xl text-[11px] ${netEarnings >= 0 ? 'bg-emerald-950/30 text-emerald-300' : 'bg-rose-950/30 text-rose-300'} border border-slate-800 mt-2`}>
              {netEarnings >= 0 ? (
                <span><strong>Stable Status:</strong> The hotel operation is maintaining a liquid cash surplus. Re-allocate as required.</span>
              ) : (
                <span><strong>Deficit Warning:</strong> Internal spends exceed processed room & Restaurant revenue. Streamline Utilities & maintenance.</span>
              )}
            </div>

          </div>

        </div>

      </div>

      {/* Record & Edit Modal Drawer Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 z-50 flex items-center justify-center p-4 backdrop-blur-xs no-print">
          
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 max-w-md w-full overflow-hidden flex flex-col">
            
            {/* Modal Header */}
            <div className="bg-slate-900 text-white px-5 py-4 flex items-center justify-between">
              <div>
                <h4 className="font-display font-semibold text-sm">
                  {editingId ? 'Modify Expense Outflow' : 'Record New Hotel Expense'}
                </h4>
                <p className="text-[10px] text-slate-400 mt-0.5">Define outbound values for financial auditing</p>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white p-1 hover:bg-slate-800 rounded transition-colors border-0 cursor-pointer"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSave} className="p-5 space-y-4">
              <fieldset disabled={loading} className="space-y-4 border-0 p-0 m-0 min-w-0">
              
              {error && (
                <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-lg border border-rose-100">
                  {error}
                </div>
              )}

              {/* Title input */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Expense Title *</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g., Water Bill May 2026, Fresh Produce purchase..."
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-none focus:border-indigo-500 transition-colors"
                />
              </div>

              {category === 'Salaries' && (
                <div className="space-y-1 bg-indigo-50/40 p-3 rounded-xl border border-indigo-100/60 animate-fade-in text-slate-850">
                  <label className="text-[10px] font-bold text-indigo-750 uppercase tracking-wider block">Beneficiary Staff (Auto-fill)</label>
                  <select
                    onChange={(e) => {
                      const selectedId = e.target.value;
                      if (!selectedId) {
                        setSelectedUserForPay(null);
                        return;
                      }
                      const staff = users.find(u => u.id === selectedId);
                      if (staff) {
                        const bal = getBalanceSalary(staff);
                        const activeMonth = selectedMonth !== 'All' ? selectedMonth : new Date().toISOString().substring(0, 7);
                        const staffMonthSalary = staff.monthlyBaseSalaries?.[activeMonth] !== undefined
                          ? staff.monthlyBaseSalaries[activeMonth]
                          : (staff.salary || 35000);
                        setTitle(`Salary - ${staff.name} (${getSelectedMonthName()})`);
                        setAmount(String(bal > 0 ? bal : staffMonthSalary));
                        setDescription(`Salary payout to ${staff.name} for ${getSelectedMonthName()}.`);
                        setSelectedUserForPay(staff);
                      }
                    }}
                    value={selectedUserForPay?.id || ''}
                    className="w-full px-2.5 py-1.5 border border-indigo-200 rounded-lg text-xs text-slate-705 bg-white focus:outline-none focus:ring-1 focus:ring-indigo-550 focus:border-indigo-500"
                  >
                    <option value="">-- Choose employee to auto-fill --</option>
                    {payrollEligibleStaff.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.role === 'manager' ? 'Manager' : 'Receptionist'} - Balance Due: Rs. {getBalanceSalary(u).toLocaleString()})
                        </option>
                      ))}
                  </select>
                </div>
              )}

              {category === 'Utilities' && (
                <div className="space-y-1 bg-purple-50/40 p-3 rounded-xl border border-purple-100/60 animate-fade-in">
                  <label className="text-[10px] font-bold text-purple-750 uppercase tracking-wider block mb-1">Quick Utilities Presets (Auto-fill)</label>
                  <div className="flex flex-wrap gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        const currentMonthName = getSelectedMonthName();
                        setTitle(`CEB Electricity Bill - ${currentMonthName}`);
                        setDescription(`Monthly Ceylon Electricity Board grid utility charge for ${currentMonthName}.`);
                      }}
                      className="px-2.5 py-1.5 bg-amber-50 hover:bg-amber-100 text-amber-800 text-[10px] font-bold rounded-lg border border-amber-200 cursor-pointer transition-all flex items-center gap-1 leading-none uppercase"
                    >
                      ⚡ CEB Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const currentMonthName = getSelectedMonthName();
                        setTitle(`Water Bill - ${currentMonthName}`);
                        setDescription(`Monthly city water supply board consumption charge for ${currentMonthName}.`);
                      }}
                      className="px-2.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-blue-800 text-[10px] font-bold rounded-lg border border-blue-200 cursor-pointer transition-all flex items-center gap-1 leading-none uppercase"
                    >
                      💧 Water Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const currentMonthName = getSelectedMonthName();
                        setTitle(`Phone Bill - ${currentMonthName}`);
                        setDescription(`Monthly hotel internet and telephone line rental for ${currentMonthName}.`);
                      }}
                      className="px-2.5 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-800 text-[10px] font-bold rounded-lg border border-indigo-200 cursor-pointer transition-all flex items-center gap-1 leading-none uppercase"
                    >
                      📞 Phone Bill
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const currentMonthName = getSelectedMonthName();
                        setTitle(`ASK Cable Bill - ${currentMonthName}`);
                        setDescription(`Monthly ASK cable TV subscription charge for ${currentMonthName}.`);
                      }}
                      className="px-2.5 py-1.5 bg-purple-50 hover:bg-purple-100 text-purple-800 text-[10px] font-bold rounded-lg border border-purple-200 cursor-pointer transition-all flex items-center gap-1 leading-none uppercase"
                    >
                      📺 ASK Cable
                    </button>
                  </div>
                </div>
              )}

              {/* Row: Amount + Category */}
              <div className="grid grid-cols-2 gap-3">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Flow Amount (Rs.) *</label>
                  <input
                    type="number"
                    required
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="e.g., 2500"
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-[#f1f5f9] focus:border-indigo-500 transition-colors"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Category *</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="Utilities">Utilities</option>
                    <option value="Salaries">Salaries</option>
                    <option value="Food & Supplies">Food & Supplies</option>
                    <option value="Maintenance">Maintenance</option>
                    <option value="Marketing">Marketing</option>
                    <option value="Room Commission">Room Commission</option>
                    <option value="Transport">Transport</option>
                    <option value="Other">Other</option>
                  </select>
                </div>

              </div>

              {/* Row: Date + Method */}
              <div className="grid grid-cols-2 gap-3">
                
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Date</label>
                  <div className="w-full px-3 py-2 border border-slate-150 rounded-xl text-xs text-slate-500 bg-slate-50/70 flex items-center gap-1.5 font-bold select-none h-[34px]">
                    <span className="text-sm">📅</span>
                    <span>{new Date(date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Method *</label>
                  <select
                    value={paymentMethod}
                    onChange={(e) => setPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-600 focus:outline-none focus:border-indigo-500 transition-colors"
                  >
                    <option value="Cash">Cash</option>
                    <option value="Card">Card</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Cheque">Cheque</option>
                  </select>
                </div>

              </div>

              {/* Description */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Description / Notes</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide supporting ledger context..."
                  rows={2}
                  className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-[#f1f5f9] focus:border-indigo-500 transition-colors resize-none"
                />
              </div>

              {/* Approver Tag */}
              <div className="space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Active Officer Approver</label>
                <input
                  type="text"
                  disabled
                  value={approvedBy}
                  className="w-full px-3 py-2 border border-slate-100 bg-slate-50/50 rounded-xl text-xs text-slate-450 focus:outline-none"
                />
              </div>

              {/* Buttons */}
              <div className="flex gap-2 pt-2 justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={loading}
                  className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-xl text-xs font-semibold border-0 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  loading={loading}
                  loadingLabel="Processing..."
                  className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold shadow-xs border-0 cursor-pointer hover:shadow-sm flex items-center justify-center gap-2"
                >
                  Save Outflow Ledger
                </LoadingButton>
              </div>
              </fieldset>

            </form>

          </div>

        </div>
      )}

    </div>
  );
};
