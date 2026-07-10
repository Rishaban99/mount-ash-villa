'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, UserRole, Expense } from '@/lib/types';
import {
  isStaffActiveForMonth,
  isDeparted,
  joinedInMonth,
  todayISO,
} from '@/lib/staffPayroll';
import {
  Plus,
  Trash2,
  Key,
  Users,
  Shield,
  UserX,
  UserPlus,
  Command,
  Banknote,
  Edit2,
  Check,
  X,
  Calendar,
  Wallet,
  Coins,
  FileSpreadsheet,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { LoadingButton } from '@/components/loading-button';
import { apiFetch } from '@/lib/api';
import { toastCreated, toastUpdated, toastError } from '@/lib/crud-toast';
import { useAuth } from '@/components/auth-provider';
import { hasPermission } from '@/lib/permissions';

export const UsersList: React.FC = () => {
  const { user: currentUser } = useAuth();
  if (!currentUser) return null;
  const [users, setUsers] = useState<User[]>([]);
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [activeTab, setActiveTab] = useState<'access' | 'payroll'>('access');
  const [settings, setSettings] = useState<any>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<UserRole>('receptionist');
  const [password, setPassword] = useState('');
  const [newUserSalary, setNewUserSalary] = useState('35000');
  const [joinDate, setJoinDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [showPasscode, setShowPasscode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [savingSalaryUserId, setSavingSalaryUserId] = useState<string | null>(null);
  const [savingJoinDateUserId, setSavingJoinDateUserId] = useState<string | null>(null);

  // States for inline salary edit
  const [editingUserId, setEditingUserId] = useState<string | null>(null);
  const [tempSalary, setTempSalary] = useState('');

  // States for disburse salary modal
  const [isPayModalOpen, setIsPayModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [payAmount, setPayAmount] = useState('');
  const [payMonth, setPayMonth] = useState('');
  const [payDate, setPayDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('Bank Transfer');
  const [paymentNote, setPaymentNote] = useState('');
  const [paySuccessMessage, setPaySuccessMessage] = useState<string | null>(null);

  const [isLeftModalOpen, setIsLeftModalOpen] = useState(false);
  const [userToMarkLeft, setUserToMarkLeft] = useState<User | null>(null);
  const [leftDate, setLeftDate] = useState(() => todayISO());
  const [editingJoinDateUserId, setEditingJoinDateUserId] = useState<string | null>(null);
  const [tempJoinDate, setTempJoinDate] = useState('');

  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    return new Date().toISOString().substring(0, 7); // Default to current "YYYY-MM"
  });

  const getAvailableMonths = () => {
    const months = new Set<string>();
    expenses.forEach((exp) => {
      if (exp.date) {
        months.add(exp.date.substring(0, 7)); // 'YYYY-MM'
      }
    });

    const now = new Date();
    const currentMon = now.toISOString().substring(0, 7);
    months.add(currentMon);

    const prevDate = new Date();
    prevDate.setMonth(prevDate.getMonth() - 1);
    const prevMon = prevDate.toISOString().substring(0, 7);
    months.add(prevMon);

    // Support showcasing August active staff headcount change as requested by the user
    months.add('2026-08');

    return Array.from(months).sort((a, b) => b.localeCompare(a));
  };

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

  useEffect(() => {
    fetchUsers();
    fetchSalariesHistory();
    
    // Sync system settings
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
        }
      } catch (err) {
        console.error('Failed to sync settings in Users module', err);
      }
    };
    fetchSettings();
  }, []);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      if (res.ok) {
        setUsers(data);
      }
    } catch (e) {
      console.error('Failed to fetch users:', e);
    }
  };

  const fetchSalariesHistory = async () => {
    try {
      const res = await fetch('/api/expenses');
      const data = await res.json();
      if (res.ok) {
        // Filter out items of category 'Salaries' for payroll matching
        const salaries = data.filter((exp: Expense) => exp.category === 'Salaries');
        setExpenses(salaries);
      }
    } catch (e) {
      console.error('Failed to fetch expenses for payroll:', e);
    }
  };

  const canManageUsers = hasPermission(currentUser.role, 'allowManagerUserEdit', settings);
  const canChangeSalary = hasPermission(currentUser.role, 'allowManagerSalaryChange', settings);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !name || !role || !password) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username,
          name,
          role,
          password,
          salary: Number(newUserSalary) ,
          lastPaid: '',
          joinDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to create account.');
      }

      toastCreated('User');
      await fetchUsers();
      setIsModalOpen(false);
      setUsername('');
      setName('');
      setPassword('');
      setNewUserSalary('35000');
      setJoinDate(new Date().toISOString().split('T')[0]);
      setShowPasscode(false);
    } catch (err: any) {
      toastError(err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSalary = async (userId: string, newSalary: number) => {
    if (isNaN(newSalary) || newSalary <= 0) {
      toastError('Please enter a valid salary amount.');
      return;
    }
    setSavingSalaryUserId(userId);
    try {
      const userToUpdate = users.find(u => u.id === userId);
      const existingMonthlySalaries = userToUpdate?.monthlyBaseSalaries || {};
      const updatedMonthlySalaries = {
        ...existingMonthlySalaries,
        [selectedMonth]: newSalary
      };

      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          id: userId, 
          salary: newSalary,
          monthlyBaseSalaries: updatedMonthlySalaries
        }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        toastUpdated('Salary');
        setEditingUserId(null);
        await fetchUsers();
      } else {
        toastError(d.error || 'Failed to update salary');
      }
    } catch (e: any) {
      toastError(e.message || 'Failed to update salary');
    } finally {
      setSavingSalaryUserId(null);
    }
  };

  const handleDisburseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;

    setLoading(true);
    setError(null);

    try {
      const disbursementAmount = Number(payAmount);
      if (isNaN(disbursementAmount) || disbursementAmount <= 0) {
        throw new Error('Please specify a valid pay wage outflow.');
      }

      // 1. Log a real verified outflow item in expenses
      const expenseResponse = await apiFetch('/api/expenses', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: `Salary - ${selectedUser.name} (${payMonth})`,
          amount: disbursementAmount,
          category: 'Salaries',
          date: payDate,
          description: paymentNote || `Monthly payroll disbursement for ${payMonth}. Authorised under Super Admin.`,
          approvedBy: currentUser.name,
          paymentMethod: paymentMethod,
        }),
      });

      if (!expenseResponse.ok) {
        const errorData = await expenseResponse.json();
        throw new Error(errorData.error || 'Failed to record expense log.');
      }

      // 2. Stamps current date as last payment date on the user/staff profile
      const userResponse = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: selectedUser.id,
          lastPaid: payDate,
        }),
      });

      if (!userResponse.ok) {
        throw new Error('Expense registered, but user profile state stamp failed.');
      }

      toastCreated('Payroll disbursement');

      await fetchUsers();
      await fetchSalariesHistory();

      setIsPayModalOpen(false);
      setPaySuccessMessage(null);
      setSelectedUser(null);
      setPaymentNote('');

    } catch (err: any) {
      toastError(err.message || 'Wage disbursement aborted due to a database exception.');
      setError(err.message || 'Wage disbursement aborted due to a database exception.');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAsLeft = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userToMarkLeft) return;

    setLoading(true);
    setError(null);

    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: userToMarkLeft.id,
          leftDate,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to mark employee as left.');
      }

      toastUpdated('Employee status');
      await fetchUsers();
      setIsLeftModalOpen(false);
      setUserToMarkLeft(null);
      setLeftDate(todayISO());
    } catch (err: any) {
      toastError(err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateJoinDate = async (userId: string, newJoinDate: string) => {
    if (!newJoinDate) {
      toastError('Please enter a valid salary start date.');
      return;
    }
    setSavingJoinDateUserId(userId);
    try {
      const res = await apiFetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, joinDate: newJoinDate }),
      });
      const d = await res.json().catch(() => ({}));
      if (res.ok) {
        toastUpdated('Salary start date');
        setEditingJoinDateUserId(null);
        await fetchUsers();
      } else {
        toastError(d.error || 'Failed to update salary start date');
      }
    } catch (e: any) {
      toastError(e.message || 'Failed to update salary start date');
    } finally {
      setSavingJoinDateUserId(null);
    }
  };

  const openMarkAsLeftModal = (user: User) => {
    setUserToMarkLeft(user);
    setLeftDate(todayISO());
    setError(null);
    setIsLeftModalOpen(true);
  };

  // Helper stats calculating payroll summaries
  const totalSalariesPaid = expenses.reduce((acc, exp) => acc + exp.amount, 0);
  const activeStaffForMonth = users.filter((u) => isStaffActiveForMonth(u, selectedMonth));

  const activeStaffCount = activeStaffForMonth.length;
  
  const averageSalary = activeStaffForMonth.length > 0 
    ? Math.round(activeStaffForMonth.reduce((acc, u) => {
        const baseSal = u.monthlyBaseSalaries?.[selectedMonth] !== undefined
          ? u.monthlyBaseSalaries[selectedMonth]
          : (u.salary );
        return acc + baseSal;
      }, 0) / activeStaffForMonth.length)
    : 0;

  const selectedMonthOutflow = expenses
    .filter((exp) => exp.date.startsWith(selectedMonth))
    .reduce((sum, exp) => sum + exp.amount, 0);

  const getPaidThisMonth = (u: User) => {
    const currentYearMonth = selectedMonth;
    return expenses
      .filter((exp) => {
        const matchesUser = exp.title.includes(u.name) || exp.description?.includes(u.name);
        const matchesMonth = exp.date.startsWith(currentYearMonth);
        return matchesUser && matchesMonth;
      })
      .reduce((sum, exp) => sum + exp.amount, 0);
  };

  const getBalanceSalary = (u: User) => {
    const baseSalary = u.monthlyBaseSalaries?.[selectedMonth] !== undefined
      ? u.monthlyBaseSalaries[selectedMonth]
      : (u.salary || 35000);
    const paidThisMonth = getPaidThisMonth(u);
    return Math.max(0, baseSalary - paidThisMonth);
  };

  const pendingPayrollBalance = activeStaffForMonth.reduce((sum, u) => {
    return sum + getBalanceSalary(u);
  }, 0);

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
            <Users className="h-6 w-6 text-indigo-600" />
            Hotel Staff & Payroll Management
          </h1>
          <p className="text-sm text-slate-500">
            Define credential base salaries, disburse monthly wages, and track audited
          </p>
        </div>

        {canManageUsers && (
          <button
            onClick={() => setIsModalOpen(true)}
            className="self-start sm:self-center flex items-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-slate-900 text-white font-medium rounded-xl shadow-xs transition-all text-sm border-0 cursor-pointer"
          >
            <UserPlus className="h-4 w-4" />
            Provision Receptionist
          </button>
        )}
      </div>

      {/* Tabs Layout */}
      <div className="flex border-b border-slate-100" id="staff-payroll-tabs">
        <button
          onClick={() => setActiveTab('access')}
          className={`pb-3 text-sm font-semibold border-b-2 px-4 transition-all border-0 bg-transparent cursor-pointer ${
            activeTab === 'access'
              ? 'border-indigo-605 text-indigo-600 border-indigo-600 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Staff Directory & Access ({activeStaffCount})
        </button>
        <button
          onClick={() => setActiveTab('payroll')}
          className={`pb-3 text-sm font-semibold border-b-2 px-4 transition-all border-0 bg-transparent cursor-pointer ${
            activeTab === 'payroll'
              ? 'border-indigo-605 text-indigo-600 border-indigo-600 font-bold'
              : 'border-transparent text-slate-400 hover:text-slate-600'
          }`}
        >
          Payroll Logs & Wage Outflows ({expenses.length})
        </button>
      </div>

      {activeTab === 'access' ? (
        <div className="space-y-6 animate-fade-in">
          
          {/* Monthly switcher & compact metrics unified card */}
          <div className="bg-white rounded-3xl border border-slate-100 shadow-xs overflow-hidden" id="payroll-period-metrics-unified-card">
            <div className="grid grid-cols-1 lg:grid-cols-12 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">
              
              {/* Left side: Payroll Period switcher */}
              <div className="p-5 lg:col-span-5 bg-indigo-50/5 flex flex-col justify-between gap-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div>
                    <span className="text-[9px] font-bold text-indigo-500 uppercase tracking-widest block">PAYROLL PERIOD</span>
                    <h2 className="text-sm font-bold text-slate-800 mt-1 uppercase flex items-center gap-1.5">
                      📆 {getSelectedMonthName()}
                    </h2>
                  </div>
                  <span className="text-[10px] font-bold text-indigo-650 bg-indigo-50 border border-indigo-100/50 px-2 py-0.5 rounded-md self-start">
                    Active Ledger
                  </span>
                </div>

                <div className="flex items-center gap-1.5 overflow-x-auto pb-1.5 max-w-full scrollbar-thin select-none">
                  {getAvailableMonths().map(m => {
                    const [year, month] = m.split('-');
                    const dateObj = new Date(Number(year), Number(month) - 1, 15);
                    const monthName = dateObj.toLocaleDateString('en-US', { month: 'short' });
                    const isSelected = selectedMonth === m;

                    return (
                      <button
                        key={m}
                        type="button"
                        onClick={() => setSelectedMonth(m)}
                        className={`relative min-w-[76px] h-11 px-2.5 py-1 text-left group cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 rounded-xl border transition-all ${
                          isSelected
                            ? 'border-indigo-500 bg-indigo-50/20 shadow-xs scale-103'
                            : 'bg-white border-slate-200/70 hover:border-slate-350'
                        }`}
                      >
                        <span className="block text-[7px] font-extrabold text-slate-400 uppercase tracking-widest leading-none">{year}</span>
                        <span className="block text-xs font-bold text-slate-700 mt-0.5">{monthName}</span>
                        {/* Active indicator */}
                        <div className={`absolute bottom-0 left-2 right-2 h-[2.5px] rounded-t-full transition-all duration-300 ${
                          isSelected ? 'bg-indigo-600 scale-x-100' : 'bg-transparent scale-x-0'
                        }`} />
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Right side: Key stats of the selected period (compact and professional layout) */}
              <div className="p-5 lg:col-span-7 flex items-center">
                <div className="grid grid-cols-3 gap-2 sm:gap-4 w-full">
                  
                  {/* Metric 1 */}
                  <div className="space-y-1.5 pl-2">
                    <div className="flex items-center gap-1.5">
                      <Users className="h-4 w-4 text-indigo-500 bg-indigo-50 p-0.5 rounded" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Total Staff</span>
                    </div>
                    <p className="text-sm font-extrabold text-slate-800 leading-none">{activeStaffCount} Active</p>
                    {activeStaffForMonth.filter(u => joinedInMonth(u, selectedMonth)).length > 0 ? (
                      <p className="text-[9px] text-indigo-650 font-bold leading-tight uppercase animate-pulse">
                        🆕 New: {activeStaffForMonth.filter(u => joinedInMonth(u, selectedMonth)).map(u => u.name.split(' ')[0]).join(', ')}
                      </p>
                    ) : (
                      <p className="text-[9px] text-slate-400 font-medium leading-none">No recruits this period</p>
                    )}
                  </div>

                  {/* Metric 2: Balance Due (Owed Salary) */}
                  <div className="space-y-1.5 pl-3 sm:pl-4 border-l border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Coins className="h-4 w-4 text-emerald-500 bg-emerald-50 p-0.5 rounded" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Balance Owed</span>
                    </div>
                    <p className="text-sm font-extrabold text-rose-600 leading-none">Rs. {pendingPayrollBalance.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-400 font-medium leading-none">Unpaid wages balance</p>
                  </div>

                  {/* Metric 3 */}
                  <div className="space-y-1.5 pl-3 sm:pl-4 border-l border-slate-100">
                    <div className="flex items-center gap-1.5">
                      <Wallet className="h-4 w-4 text-amber-500 bg-amber-50 p-0.5 rounded" />
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Period Paid</span>
                    </div>
                    <p className="text-sm font-extrabold text-slate-800 leading-none">Rs. {selectedMonthOutflow.toLocaleString()}</p>
                    <p className="text-[9px] text-slate-400 font-bold uppercase text-[7px] tracking-wider leading-none">
                      Rs. {totalSalariesPaid.toLocaleString()} cumulative
                    </p>
                  </div>

                </div>
              </div>

            </div>
          </div>

          {/* Grid of Users */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" id="staff-cards-grid">
            {users.map((u) => {
              const baseSalary = u.monthlyBaseSalaries?.[selectedMonth] !== undefined
                ? u.monthlyBaseSalaries[selectedMonth]
                : (u.salary || 35000);
              const paidThisMonth = getPaidThisMonth(u);
              const balanceSalary = getBalanceSalary(u);
              const payPercentage = Math.min(100, Math.round((paidThisMonth / baseSalary) * 100));

              // Compute initials for the visual avatar
              const initials = u.name
                ? u.name
                    .split(' ')
                    .map((n) => n[0])
                    .join('')
                    .substring(0, 2)
                    .toUpperCase()
                : 'ST';

              // Role styling helper
              const isSuperAdmin = u.role === 'admin';
              const isManager = u.role === 'manager';
              const roleTheme = isSuperAdmin
                ? { bg: 'bg-rose-50 text-rose-700 border-rose-100', dot: 'bg-rose-500', avatar: 'bg-gradient-to-br from-rose-450 from-rose-500 to-amber-400 text-white' }
                : isManager
                ? { bg: 'bg-amber-50 text-amber-700 border-amber-100', dot: 'bg-amber-500', avatar: 'bg-gradient-to-br from-amber-500 to-orange-400 text-white' }
                : { bg: 'bg-indigo-50 text-indigo-700 border-indigo-100', dot: 'bg-indigo-500', avatar: 'bg-gradient-to-br from-indigo-500 to-sky-400 text-white' };

              const departed = isDeparted(u);
              const isJoinedInMonth = isSuperAdmin || isStaffActiveForMonth(u, selectedMonth);
              const hasJoinedExactlyThisMonth = !isSuperAdmin && joinedInMonth(u, selectedMonth);
              const hasSalaryStartDate = !!u.joinDate;

              return (
                <div
                  key={u.id}
                  className={`bg-white rounded-3xl border border-slate-100 shadow-xs hover:shadow-md transition-all duration-300 flex flex-col justify-between relative group/card hover:-translate-y-1 overflow-hidden ${
                    departed ? 'opacity-60' : !isJoinedInMonth ? 'opacity-85' : ''
                  }`}
                >
                  {/* Card Header Top Strip Decorator */}
                  <div className={`h-1.5 w-full ${isSuperAdmin ? 'bg-rose-500' : isManager ? 'bg-amber-500' : 'bg-indigo-500'}`} />

                  <div className="p-6 space-y-5">
                    {/* Role & Actions Bar */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`inline-flex items-center px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider gap-1.5 border ${roleTheme.bg}`}
                      >
                        <Shield className="h-3.5 w-3.5" />
                        {u.role === 'admin' ? 'Super Admin' : u.role}
                      </span>

                      {canManageUsers && u.role !== 'admin' && u.id !== currentUser.id && !departed && (
                        <button
                          onClick={() => openMarkAsLeftModal(u)}
                          className="p-1.5 px-2.5 text-[11px] bg-slate-50 hover:bg-amber-50 text-slate-500 hover:text-amber-700 rounded-xl flex items-center gap-1.5 transition-all outline-none border-0 cursor-pointer"
                          title="Mark this employee as having left"
                        >
                          <UserX className="h-3.5 w-3.5" />
                          <span>Mark as Left</span>
                        </button>
                      )}
                      {departed && (
                        <span className="px-2 py-0.5 text-[9px] font-bold uppercase rounded-md bg-slate-100 text-slate-500 border border-slate-200">
                          Left
                        </span>
                      )}
                    </div>

                    {/* Member Profile Block */}
                    <div className="flex items-center gap-3.5">
                      {/* Generative Profile Glass Avatar */}
                      <div className={`w-12 h-12 rounded-2xl flex items-center justify-center font-display font-black text-sm tracking-wider shadow-sm relative ${roleTheme.avatar}`}>
                        {initials}
                        {!isJoinedInMonth && (
                          <div className="absolute -top-1 -right-1 bg-amber-500 rounded-full p-0.5 border border-white">
                            <Calendar className="h-2.5 w-2.5 text-white" />
                          </div>
                        )}
                      </div>

                      <div className="space-y-0.5">
                        <h3 className="font-display font-bold text-slate-800 text-base">{u.name}</h3>
                        <p className="text-xs text-slate-400 font-mono flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-slate-300"></span>
                          <span>ID: {u.username}</span>
                        </p>
                        <p className="text-[10px] text-slate-400 font-semibold font-sans flex items-center gap-1.5 flex-wrap">
                          <span className="opacity-70">Salary Start:</span>
                          {editingJoinDateUserId === u.id ? (
                            <span className="flex items-center gap-1">
                              <input
                                type="date"
                                value={tempJoinDate}
                                disabled={savingJoinDateUserId === u.id}
                                onChange={(e) => setTempJoinDate(e.target.value)}
                                className="text-[10px] border border-slate-200 rounded-md px-1 py-0.5 disabled:opacity-50"
                              />
                              <button
                                onClick={() => handleUpdateJoinDate(u.id, tempJoinDate)}
                                disabled={savingJoinDateUserId === u.id}
                                className="p-0.5 text-emerald-600 border-0 bg-transparent cursor-pointer disabled:opacity-50"
                                title="Save"
                              >
                                {savingJoinDateUserId === u.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : (
                                  <Check className="h-3 w-3" />
                                )}
                              </button>
                              <button
                                onClick={() => setEditingJoinDateUserId(null)}
                                disabled={savingJoinDateUserId === u.id}
                                className="p-0.5 text-slate-400 border-0 bg-transparent cursor-pointer disabled:opacity-50"
                                title="Cancel"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </span>
                          ) : hasSalaryStartDate ? (
                            <span className="text-indigo-600 font-bold bg-indigo-50/50 px-1.5 py-0.5 rounded-md">
                              {new Date(u.joinDate!).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          ) : (
                            <span className="text-amber-600 font-bold bg-amber-50 px-1.5 py-0.5 rounded-md">Not set</span>
                          )}
                          {!editingJoinDateUserId && canManageUsers && u.role !== 'admin' && (
                            <button
                              onClick={() => {
                                setEditingJoinDateUserId(u.id);
                                setTempJoinDate(u.joinDate || todayISO());
                              }}
                              className="text-slate-400 hover:text-indigo-600 border-0 bg-transparent cursor-pointer p-0"
                              title="Edit salary start date"
                            >
                              <Edit2 className="h-3 w-3" />
                            </button>
                          )}
                          {departed && u.leftDate && (
                            <span className="text-slate-500 font-bold bg-slate-100 px-1.5 py-0.5 rounded-md">
                              Left {new Date(u.leftDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                            </span>
                          )}
                          {hasJoinedExactlyThisMonth && (
                            <span className="animate-pulse bg-emerald-50 text-emerald-705 text-emerald-600/90 border border-emerald-100 font-extrabold text-[8px] px-1.5 py-0.5 rounded-md uppercase">
                              New Staff
                            </span>
                          )}
                        </p>
                      </div>
                    </div>

                    {/* Salary Management Widget */}
                    {u.role !== 'admin' ? (
                      !hasSalaryStartDate ? (
                        <div className="bg-amber-50/30 border border-dashed border-amber-200 rounded-2xl p-4 text-center min-h-[224px] flex flex-col justify-center items-center">
                          <Calendar className="h-5 w-5 text-amber-500 mb-2" />
                          <span className="text-xs font-bold text-amber-900 block uppercase tracking-wider">Salary Start Date Required</span>
                          <p className="text-[10px] text-slate-500 mt-1.5 px-2 leading-relaxed">
                            Set a salary start date to include this employee in payroll calculations.
                          </p>
                        </div>
                      ) : !isJoinedInMonth ? (
                        <div className="bg-amber-50/20 border border-dashed border-amber-100/70 rounded-2xl p-4 text-center min-h-[224px] flex flex-col justify-center items-center">
                          <Calendar className="h-5 w-5 text-amber-500 mb-2 animate-bounce" />
                          <span className="text-xs font-bold text-amber-900 block uppercase tracking-wider">Future Hire Contract</span>
                          <p className="text-[10px] text-slate-500 mt-1.5 px-2 leading-relaxed">
                            Active contract starts on <b>{new Date(u.joinDate!).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })}</b>. Excluded from {getSelectedMonthShortName()} payroll calculations.
                          </p>
                        </div>
                      ) : departed ? (
                        <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-2xl p-4 text-center min-h-[224px] flex flex-col justify-center items-center">
                          <UserX className="h-5 w-5 text-slate-400 mb-2" />
                          <span className="text-xs font-bold text-slate-600 block uppercase tracking-wider">No Longer Employed</span>
                          <p className="text-[10px] text-slate-500 mt-1.5 px-2 leading-relaxed">
                            Left on <b>{u.leftDate ? new Date(u.leftDate).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : '—'}</b>. Excluded from active payroll.
                          </p>
                        </div>
                      ) : (
                        <div className="bg-slate-50/70 rounded-2xl p-4 border border-slate-150/50 space-y-3.5">
                          {/* Dynamic Progress Indicator */}
                          <div className="space-y-1.5">
                            <div className="flex justify-between items-center text-[10px]">
                              <span className="text-slate-400 font-bold uppercase tracking-wider">Payroll Progress</span>
                              <span className={`font-mono font-bold ${payPercentage === 100 ? 'text-emerald-600' : 'text-indigo-600'}`}>
                                {payPercentage}% Cleared
                              </span>
                            </div>
                            <div className="h-1.5 w-full bg-slate-200/60 rounded-full overflow-hidden">
                              <div
                                style={{ width: `${payPercentage}%` }}
                                className={`h-full rounded-full transition-all duration-500 ${
                                  payPercentage === 100
                                    ? 'bg-gradient-to-r from-emerald-500 to-teal-400'
                                    : 'bg-gradient-to-r from-indigo-500 to-sky-400'
                                }`}
                              />
                            </div>
                          </div>

                          {/* Baseline Compensation */}
                          <div className="flex items-center justify-between text-xs pt-1.5 border-t border-slate-100">
                            <span className="text-slate-400 font-semibold font-sans">Monthly Base Salary</span>
                            {editingUserId === u.id ? (
                              <div className="flex items-center gap-1.5 bg-white p-1 border border-slate-200 rounded-xl shadow-xs">
                                <span className="text-slate-400 font-bold pl-1 text-[11px]">Rs.</span>
                                <input
                                  type="number"
                                  value={tempSalary}
                                  disabled={savingSalaryUserId === u.id}
                                  onChange={(e) => setTempSalary(e.target.value)}
                                  className="w-16 text-center outline-none border-0 text-xs font-bold text-slate-800 disabled:opacity-50"
                                  autoFocus
                                />
                                <button
                                  onClick={() => handleUpdateSalary(u.id, Number(tempSalary))}
                                  disabled={savingSalaryUserId === u.id}
                                  className="p-1.5 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors border-0 cursor-pointer flex items-center justify-center disabled:opacity-50"
                                  title="Save base wage"
                                >
                                  {savingSalaryUserId === u.id ? (
                                    <Loader2 className="h-3 w-3 animate-spin" />
                                  ) : (
                                    <Check className="h-3 w-3" />
                                  )}
                                </button>
                                <button
                                  onClick={() => setEditingUserId(null)}
                                  disabled={savingSalaryUserId === u.id}
                                  className="p-1.5 bg-slate-100 text-slate-500 rounded-lg hover:bg-slate-200 transition-colors border-0 cursor-pointer flex items-center justify-center disabled:opacity-50"
                                  title="Cancel and return"
                                >
                                  <X className="h-3 w-3" />
                                </button>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-800 font-bold font-mono text-xs">
                                  Rs. {baseSalary.toLocaleString()}
                                </span>
                                {canChangeSalary && (
                                  <button
                                    onClick={() => {
                                      setEditingUserId(u.id);
                                      setTempSalary(String(baseSalary));
                                    }}
                                    className="text-slate-400 hover:text-indigo-600 hover:scale-110 duration-200 transition-all p-1 bg-slate-100 hover:bg-white border-0 cursor-pointer rounded-md"
                                    title="Edit Monthly Base Salary"
                                  >
                                    <Edit2 className="h-3 w-3" />
                                  </button>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Wages paid so far */}
                          <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                            <span className="text-slate-400 font-semibold font-sans">Paid in {getSelectedMonthShortName()}</span>
                            <span className="text-emerald-600 font-bold font-mono text-xs">
                              Rs. {paidThisMonth.toLocaleString()}
                            </span>
                          </div>

                          {/* Balance due */}
                          <div className="flex items-center justify-between text-xs border-t border-slate-100 pt-2">
                            <span className="text-slate-400 font-semibold font-sans font-medium">Balance Salary</span>
                            <div className="flex items-center gap-1.5">
                              <span className={`font-bold font-mono text-xs ${balanceSalary > 0 ? 'text-amber-600 animate-pulse' : 'text-emerald-600'}`}>
                                Rs. {balanceSalary.toLocaleString()}
                              </span>
                              {balanceSalary === 0 ? (
                                <span className="px-2 py-0.5 text-[8px] font-bold uppercase rounded-md bg-emerald-50 text-emerald-700 border border-emerald-100 leading-none">Paid</span>
                              ) : (
                                <span className="px-2 py-0.5 text-[8px] font-bold uppercase rounded-md bg-amber-50 text-amber-700 border border-amber-100 leading-none">Due</span>
                              )}
                            </div>
                          </div>

                          {/* Footnote timestamp */}
                          <div className="flex items-center justify-between text-[10px] border-t border-slate-100 pt-2 text-slate-400">
                            <span className="font-medium">Last Paid Timestamp:</span>
                            <span className={`font-semibold ${u.lastPaid ? 'text-slate-650 text-slate-605' : 'text-amber-600'}`}>
                              {u.lastPaid ? u.lastPaid : 'Never paid'}
                            </span>
                          </div>
                        </div>
                      )
                    ) : (
                      <div className="bg-slate-50/50 border border-dashed border-slate-200 rounded-3xl p-5 text-center">
                        <p className="text-xs text-slate-400 italic font-semibold">Excluded from corporate payroll wages.</p>
                      </div>
                    )}
                  </div>

                  {/* Actions & Passcode Footer */}
                  <div className="p-6 pt-0 space-y-3">
                    {canChangeSalary && u.role !== 'admin' && (
                      <button
                        disabled={!isJoinedInMonth || departed}
                        onClick={() => {
                          setSelectedUser(u);
                          setPayAmount(String(balanceSalary));
                          setPayMonth(getSelectedMonthName());
                          setPayDate(new Date().toISOString().split('T')[0]);
                          setIsPayModalOpen(true);
                        }}
                        className={`w-full inline-flex items-center justify-center gap-1.5 py-2.5 px-4 font-semibold rounded-2xl text-xs transition-all duration-200 border-0 cursor-pointer shadow-xs active:scale-[0.98] ${
                          isJoinedInMonth && !departed
                            ? 'bg-indigo-50 hover:bg-indigo-600 text-indigo-700 hover:text-white'
                            : 'bg-slate-100 text-slate-400 cursor-not-allowed shadow-none'
                        }`}
                      >
                        <Banknote className="h-4 w-4" />
                        {departed ? 'Employee Has Left' : isJoinedInMonth ? 'Disburse & Pay Salary' : 'Contract Term Pending'}
                      </button>
                    )}
                    <div className="flex items-center gap-1.5 text-slate-400 text-[10px] bg-slate-50 p-2 rounded-xl border border-slate-100">
                      <Key className="h-3 w-3 text-indigo-400" />
                      <span>Cryptographically secure login passcode is active</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in" id="payroll-ledger-tab-view">
          
          {/* Quick Info */}
          <div className="bg-slate-50 rounded-2xl p-4 border border-slate-100 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-full">
                <FileSpreadsheet className="h-6 w-6" />
              </div>
              <div>
                <h3 className="font-semibold text-slate-800 text-sm">Disbursed Wages & Audited Inflows</h3>
                <p className="text-xs text-slate-500">
                  Every wage logged here gets recorded in the main hotel expenses outflow registry for transparency.
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-450 uppercase tracking-widest font-bold block text-slate-400">Total Wages Paid Out</span>
              <span className="text-xl font-black font-mono text-indigo-600">Rs. {totalSalariesPaid.toLocaleString()}</span>
            </div>
          </div>

          {/* Salaries List Table */}
          <div className="bg-white border border-slate-100 rounded-2xl overflow-hidden shadow-xs">
            <div className="p-4 bg-slate-50/50 border-b border-slate-100">
              <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Payroll Outflow Audit Ledger</h3>
            </div>
            {expenses.length === 0 ? (
              <div className="p-12 text-center space-y-3">
                <div className="w-12 h-12 bg-slate-50 text-slate-400 rounded-full flex items-center justify-center mx-auto">
                  <Banknote className="h-6 w-6" />
                </div>
                <div>
                  <h4 className="text-sm font-semibold text-slate-700">No wages recorded in history</h4>
                  <p className="text-xs text-slate-400 max-w-xs mx-auto mt-1">
                    Select a staff receptionist on the Access tab above to disburse their monthly salaries.
                  </p>
                </div>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/30 text-[10px] text-slate-400 font-bold uppercase tracking-wider border-b border-slate-100">
                      <th className="py-3 px-4">Period / Voucher</th>
                      <th className="py-3 px-4">Disbursed Wage</th>
                      <th className="py-3 px-4">Pay Date</th>
                      <th className="py-3 px-4">Payment Method</th>
                      <th className="py-3 px-4">Authorising Officer</th>
                      <th className="py-3 px-4">Ledger Outline / Supporting Notes</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 text-xs">
                    {expenses.map((exp) => (
                      <tr key={exp.id} className="hover:bg-slate-50/40 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-semibold text-slate-800">{exp.title}</div>
                          <div className="text-[10px] text-slate-400 font-mono">ID: {exp.id}</div>
                        </td>
                        <td className="py-3.5 px-4 font-black font-mono text-slate-900">
                          Rs. {exp.amount.toLocaleString()}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-slate-500">
                          {exp.date}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="px-2 py-0.5 rounded-md bg-amber-50 text-amber-700 font-semibold text-[10px]">
                            {exp.paymentMethod || 'Bank Transfer'}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-indigo-700">
                          {exp.approvedBy || 'Active Admin'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400 max-w-xs truncate" title={exp.description}>
                          {exp.description}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

        </div>
      )}

      {/* Add User Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100">
            <h3 className="text-lg font-display font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Command className="h-5 w-5 text-indigo-600" />
              Provision New User Account
            </h3>

            <form onSubmit={handleCreate} className="space-y-4">
              <fieldset disabled={loading} className="space-y-4 border-0 p-0 m-0 min-w-0">
              {error && (
                <div className="p-3 bg-rose-50 text-xs text-rose-600 rounded-xl border border-rose-100">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Full Description Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Thomas receptionist"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all font-sans"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Login Username
                </label>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="e.g. thomas_rep"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Role Permission
                  </label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as UserRole)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all"
                  >
                    <option value="receptionist">Receptionist</option>
                    <option value="manager">Manager</option>
                    <option value="admin">Super Admin</option>
                  </select>
                </div>
                {role !== 'admin' ? (
                  <div>
                    <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                      Monthly Wage (Rs.)
                    </label>
                    <input
                      type="number"
                      required
                      value={newUserSalary}
                      onChange={(e) => setNewUserSalary(e.target.value)}
                      placeholder="e.g. 35000"
                      className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all font-mono"
                    />
                  </div>
                ) : (
                  <div className="flex flex-col justify-center">
                    <span className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mb-2">Wage Exclusion</span>
                    <p className="text-xs text-slate-400 italic leading-snug">
                      Super Admins do not receive corporate payroll wages.
                    </p>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Initial Passcode
                </label>
                <input
                  type={showPasscode ? "text" : "password"}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all font-mono"
                />
                <div className="flex items-center gap-2 mt-2.5 bg-slate-50/50 p-2 rounded-xl border border-slate-100/60 w-fit">
                  <input
                    type="checkbox"
                    id="show-passcode-checkbox"
                    checked={showPasscode}
                    onChange={(e) => setShowPasscode(e.target.checked)}
                    className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 h-4 w-4 cursor-pointer"
                  />
                  <label htmlFor="show-passcode-checkbox" className="text-xs font-semibold text-slate-500 cursor-pointer select-none">
                    Show Passcode
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Salary Start Date
                </label>
                <input
                  type="date"
                  required
                  value={joinDate}
                  onChange={(e) => setJoinDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all font-sans"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all text-sm animate-fade-in border-0 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  loading={loading}
                  loadingLabel="Saving..."
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-slate-900 text-white font-medium rounded-xl transition-all text-sm border-0 cursor-pointer text-center flex items-center justify-center gap-2"
                >
                  Provision User
                </LoadingButton>
              </div>
              </fieldset>
            </form>
          </div>
        </div>
      )}

      {/* Disburse Salary Modal */}
      {isPayModalOpen && selectedUser && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100 relative">
            
            <div className="space-y-4">
                <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                  <h3 className="text-lg font-display font-semibold text-slate-900 flex items-center gap-2">
                    <Banknote className="h-5 w-5 text-indigo-600 animate-pulse" />
                    Record Salary Disbursal
                  </h3>
                  <button
                    onClick={() => setIsPayModalOpen(false)}
                    disabled={loading}
                    className="p-1 px-1.5 hover:bg-slate-50 text-slate-400 hover:text-slate-600 rounded-lg border-0 cursor-pointer bg-transparent disabled:opacity-50"
                    title="Close"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>

                <form onSubmit={handleDisburseSubmit} className="space-y-4">
                  <fieldset disabled={loading} className="space-y-4 border-0 p-0 m-0 min-w-0">
                  {error && (
                    <div className="p-3 bg-rose-50 text-xs text-rose-600 rounded-xl border border-rose-100">
                      {error}
                    </div>
                  )}

                  {/* Employee Name Info */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Staff Beneficiary</label>
                    <input
                      type="text"
                      disabled
                      value={`${selectedUser.name} (${selectedUser.role === 'admin' ? 'Super Admin' : selectedUser.role === 'manager' ? 'Manager' : 'Receptionist'})`}
                      className="w-full px-3 py-2 border border-slate-150 bg-slate-50 rounded-xl text-xs text-slate-500 font-semibold"
                    />
                  </div>

                  {/* Row: Dispatched Wages + Month */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Disbursed Amount (Rs.) *</label>
                      <input
                        type="number"
                        required
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        placeholder="e.g. 35000"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 bg-white"
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Month *</label>
                      <input
                        type="text"
                        required
                        value={payMonth}
                        onChange={(e) => setPayMonth(e.target.value)}
                        placeholder="e.g. June 2026"
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white"
                      />
                    </div>
                  </div>

                  {/* Row: Date + Method */}
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Disbursement Date</label>
                      <div className="w-full px-3 py-2 border border-slate-150 rounded-xl text-xs text-slate-500 bg-slate-50/70 flex items-center gap-1.5 font-bold select-none h-[34px]">
                        <span className="text-sm">📅</span>
                        <span>{new Date(payDate).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' })}</span>
                      </div>
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Payment Method *</label>
                      <select
                        value={paymentMethod}
                        onChange={(e) => setPaymentMethod(e.target.value)}
                        className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs text-slate-700 bg-white"
                      >
                        <option value="Bank Transfer">Bank Transfer</option>
                        <option value="Cash">Cash / Drawer</option>
                        <option value="Cheque">Bank Cheque</option>
                        <option value="Card">Card Account</option>
                      </select>
                    </div>
                  </div>

                  {/* Description Notes */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Disbursement Notes</label>
                    <textarea
                      value={paymentNote}
                      onChange={(e) => setPaymentNote(e.target.value)}
                      placeholder="e.g. Paid full monthly wages, includes Rs. 2,000 performance bonus..."
                      rows={2.5}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs placeholder-slate-400 focus:outline-[#f1f5f9] focus:border-indigo-500 transition-colors resize-none bg-white text-slate-800"
                    />
                  </div>

                  {/* Info Notice card */}
                  <div className="p-3 bg-indigo-50 text-[10px] text-indigo-700 font-medium rounded-xl border border-indigo-100/50 leading-relaxed">
                    🌟 <strong>Audit Notice:</strong> Confirming this payment will instantly record a verified outflow transaction in the main ledger under Category <strong>'Salaries'</strong>. Authorized by <strong>{currentUser.name}</strong>.
                  </div>

                  {/* Submit buttons */}
                  <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                    <button
                      type="button"
                      onClick={() => setIsPayModalOpen(false)}
                      disabled={loading}
                      className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs border-0 cursor-pointer transition-colors disabled:opacity-50"
                    >
                      Cancel Pay
                    </button>
                    <LoadingButton
                      type="submit"
                      loading={loading}
                      loadingLabel="Disbursing..."
                      className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-slate-900 text-white font-semibold rounded-xl text-xs border-0 cursor-pointer transition-colors flex items-center justify-center gap-2"
                    >
                      Disburse Outflow
                    </LoadingButton>
                  </div>
                  </fieldset>
                </form>
              </div>
            
          </div>
        </div>
      )}

      {/* Mark as Left Modal */}
      {isLeftModalOpen && userToMarkLeft && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100">
            <h3 className="text-lg font-display font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <UserX className="h-5 w-5 text-amber-600" />
              Mark Employee as Left
            </h3>

            <form onSubmit={handleMarkAsLeft} className="space-y-4">
              <fieldset disabled={loading} className="space-y-4 border-0 p-0 m-0 min-w-0">
              {error && (
                <div className="p-3 bg-rose-50 text-xs text-rose-600 rounded-xl border border-rose-100">
                  {error}
                </div>
              )}

              <p className="text-sm text-slate-600">
                Mark <strong>{userToMarkLeft.name}</strong> as having left the hotel. They will be excluded from payroll and unable to log in.
              </p>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Last Working Day
                </label>
                <input
                  type="date"
                  required
                  value={leftDate}
                  onChange={(e) => setLeftDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all font-sans"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => {
                    setIsLeftModalOpen(false);
                    setUserToMarkLeft(null);
                    setError(null);
                  }}
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all text-sm border-0 cursor-pointer disabled:opacity-50"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  loading={loading}
                  loadingLabel="Saving..."
                  className="flex-1 py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-medium rounded-xl transition-all text-sm border-0 cursor-pointer flex items-center justify-center gap-2"
                >
                  Confirm Left
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
