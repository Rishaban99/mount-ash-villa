'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { User, Attendance, AttendanceStatus, ShiftType } from '@/lib/types';
import { useAuth } from '@/components/auth-provider';
import { apiFetch } from '@/lib/api';
import { toastCreated, toastUpdated, toastError } from '@/lib/crud-toast';
import { LoadingButton } from '@/components/loading-button';
import {
  Clock,
  Calendar,
  UserCheck,
  UserX,
  AlertCircle,
  CheckCircle2,
  FileSpreadsheet,
  Printer,
  Search,
  Edit2,
  Filter,
  Check,
  X,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Users,
  Sun,
  Moon,
  Coffee,
  Briefcase,
  HelpCircle,
  Plus,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';

export const AttendanceSystem: React.FC = () => {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const canUsePunch = isAdmin || currentUser.role === 'manager';

  // View Mode: 'daily' | 'monthly'
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>(isAdmin ? 'daily' : 'monthly');

  // Dates
  const [selectedDate, setSelectedDate] = useState(() => new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().substring(0, 7));

  // Data
  const [users, setUsers] = useState<User[]>([]);
  const [attendanceList, setAttendanceList] = useState<Attendance[]>([]);
  const [loading, setLoading] = useState(false);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [batchSaving, setBatchSaving] = useState(false);

  // Search & Filters
  const [searchQuery, setSearchQuery] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  // Modal states for Notes / Editing
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [tempNotes, setTempNotes] = useState('');

  useEffect(() => {
    if (!isAdmin && viewMode !== 'monthly') {
      setViewMode('monthly');
    }
  }, [isAdmin, viewMode]);

  // Fetch Users
  const fetchUsers = async () => {
    try {
      const res = await apiFetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setUsers(data.filter((u: User) => u.role !== 'admin' && (!u.leftDate || u.leftDate >= selectedDate)));
        }
      }
    } catch (e) {
      console.error('Failed to fetch users', e);
    }
  };

  // Fetch Attendance Records
  const fetchAttendance = async () => {
    setLoading(true);
    try {
      let url = '/api/attendance';
      if (viewMode === 'monthly') {
        url += `?month=${selectedMonth}`;
      } else {
        url += `?date=${selectedDate}`;
      }
      const res = await apiFetch(url);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAttendanceList(data);
        }
      }
    } catch (e) {
      console.error('Failed to fetch attendance', e);
      toastError('Failed to load attendance records');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [selectedDate]);

  useEffect(() => {
    fetchAttendance();
  }, [selectedDate, selectedMonth, viewMode]);

  // Combine Active Users with existing attendance records for the selected date
  const dailyRows = useMemo(() => {
    return users.map((user) => {
      const existing = attendanceList.find((a) => a.userId === user.id && a.date === selectedDate);
      return {
        user,
        record: existing || {
          id: '',
          userId: user.id,
          userName: user.name,
          userRole: user.role,
          date: selectedDate,
          checkIn: '',
          checkOut: '',
          status: 'Extra Leave' as AttendanceStatus,
          shift: 'Full Day' as ShiftType,
          workHours: 0,
          notes: '',
          recordedBy: '',
          createdAt: '',
        },
        hasRecord: !!existing,
      };
    });
  }, [users, attendanceList, selectedDate]);

  // Fallback staff list from attendance records when /api/users is unavailable (non-admin)
  const matrixUsers = useMemo(() => {
    if (users.length > 0) return users;
    const byId = new Map<string, User>();
    attendanceList.forEach((a) => {
      if (!byId.has(a.userId) && a.userRole !== 'admin') {
        byId.set(a.userId, {
          id: a.userId,
          name: a.userName,
          username: '',
          role: a.userRole as User['role'],
        });
      }
    });
    return Array.from(byId.values());
  }, [users, attendanceList]);

  // Filtered daily rows
  const filteredDailyRows = useMemo(() => {
    return dailyRows.filter(({ user, record }) => {
      const matchesSearch =
        user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.username.toLowerCase().includes(searchQuery.toLowerCase());
      const matchesRole = roleFilter === 'all' || user.role === roleFilter;
      const matchesStatus = statusFilter === 'all' || record.status === statusFilter;
      return matchesSearch && matchesRole && matchesStatus;
    });
  }, [dailyRows, searchQuery, roleFilter, statusFilter]);

  // Summary Metrics for the Daily View
  const dailyStats = useMemo(() => {
    const totalStaff = dailyRows.length;
    const present = dailyRows.filter((r) => r.hasRecord && (r.record.status === 'Present' || r.record.status === 'Late' || r.record.status === 'Half Day')).length;
    const late = dailyRows.filter((r) => r.hasRecord && r.record.status === 'Late').length;
    const absent = dailyRows.filter((r) => r.hasRecord && r.record.status === 'Absent').length;
    const onLeave = dailyRows.filter((r) => r.hasRecord && r.record.status === 'On Leave').length;
    const unrecorded = dailyRows.filter((r) => !r.hasRecord).length;

    let totalHours = 0;
    dailyRows.forEach((r) => {
      if (r.hasRecord && r.record.workHours) {
        totalHours += r.record.workHours;
      }
    });

    return { totalStaff, present, late, absent, onLeave, unrecorded, totalHours };
  }, [dailyRows]);

  // Handle Save / Update single user attendance
  const handleSaveAttendance = async (
    userId: string,
    userName: string,
    userRole: string,
    updates: Partial<Attendance>
  ) => {
    setSavingUserId(userId);
    try {
      const payload = {
        userId,
        userName,
        userRole,
        date: selectedDate,
        ...updates,
      };
      const res = await apiFetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const saved: Attendance = await res.json();
        setAttendanceList((prev) => {
          const idx = prev.findIndex((a) => a.userId === userId && a.date === selectedDate);
          if (idx >= 0) {
            const next = [...prev];
            next[idx] = saved;
            return next;
          }
          return [...prev, saved];
        });
        toastUpdated('Attendance recorded');
      }
    } catch (e) {
      console.error(e);
      toastError('Failed to save attendance');
    } finally {
      setSavingUserId(null);
    }
  };

  // Quick Clock In
  const handleQuickClockIn = async (user: User) => {
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const existing = attendanceList.find((a) => a.userId === user.id && a.date === selectedDate);
    const status: AttendanceStatus = existing?.status && existing.status !== 'Absent' ? existing.status : 'Present';
    await handleSaveAttendance(user.id, user.name, user.role, {
      checkIn: nowTime,
      status,
    });
  };

  // Quick Clock Out
  const handleQuickClockOut = async (user: User) => {
    const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
    const existing = attendanceList.find((a) => a.userId === user.id && a.date === selectedDate);
    let workHours = existing?.workHours;

    if (existing?.checkIn) {
      try {
        const [inH, inM] = existing.checkIn.split(':').map(Number);
        const [outH, outM] = nowTime.split(':').map(Number);
        let diffMinutes = outH * 60 + outM - (inH * 60 + inM);
        if (diffMinutes < 0) diffMinutes += 24 * 60;
        workHours = Math.round((diffMinutes / 60) * 10) / 10;
      } catch {}
    }

    await handleSaveAttendance(user.id, user.name, user.role, {
      checkOut: nowTime,
      workHours,
    });
  };

  // Batch Mark Unrecorded as Present
  const handleBatchMarkPresent = async () => {
    const unrecordedRows = dailyRows.filter((r) => !r.hasRecord);
    if (unrecordedRows.length === 0) {
      toastUpdated('All staff already have attendance logged for today.');
      return;
    }

    setBatchSaving(true);
    try {
      const nowTime = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      const payload = unrecordedRows.map((r) => ({
        userId: r.user.id,
        userName: r.user.name,
        userRole: r.user.role,
        date: selectedDate,
        checkIn: '08:00',
        status: 'Present' as AttendanceStatus,
        shift: 'Full Day' as ShiftType,
      }));

      const res = await apiFetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          fetchAttendance();
          toastCreated(`Logged ${data.length} staff members as Present`);
        }
      }
    } catch (e) {
      console.error(e);
      toastError('Failed batch attendance');
    } finally {
      setBatchSaving(false);
    }
  };

  // Date Navigation Helpers
  const changeDate = (days: number) => {
    const cur = new Date(selectedDate);
    cur.setDate(cur.getDate() + days);
    setSelectedDate(cur.toISOString().split('T')[0]);
  };

  // Monthly Days List (1..daysInMonth)
  const monthlyDays = useMemo(() => {
    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    const daysCount = new Date(year, month, 0).getDate();
    return Array.from({ length: daysCount }, (_, i) => i + 1);
  }, [selectedMonth]);

  // Export Daily / Monthly CSV
  const handleExportCSV = () => {
    let csvContent = 'data:text/csv;charset=utf-8,';
    if (viewMode === 'monthly') {
      const headers = ['Staff Name', 'Username', 'Role', ...monthlyDays.map((d) => `Day ${d}`), 'Total Present', 'Total Hours'];
      csvContent += headers.join(',') + '\n';

      matrixUsers.forEach((u) => {
        let presentCount = 0;
        let totalHrs = 0;
        const dayStatuses = monthlyDays.map((dayNum) => {
          const dateStr = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
          const rec = attendanceList.find((a) => a.userId === u.id && a.date === dateStr);
          if (rec) {
            if (rec.status === 'Present' || rec.status === 'Late') presentCount++;
            if (rec.workHours) totalHrs += rec.workHours;
            return rec.status.substring(0, 1);
          }
          return '-';
        });

        const row = [`"${u.name}"`, `"${u.username}"`, `"${u.role}"`, ...dayStatuses, presentCount, totalHrs.toFixed(1)];
        csvContent += row.join(',') + '\n';
      });
    } else {
      const headers = ['Staff Name', 'Username', 'Role', 'Date', 'Status', 'Shift', 'Check-In', 'Check-Out', 'Work Hours', 'Notes'];
      csvContent += headers.join(',') + '\n';

      dailyRows.forEach(({ user, record, hasRecord }) => {
        const row = [
          `"${user.name}"`,
          `"${user.username}"`,
          `"${user.role}"`,
          selectedDate,
          hasRecord ? `"${record.status}"` : '"Unrecorded"',
          `"${record.shift || 'Full Day'}"`,
          `"${record.checkIn || '-'}"`,
          `"${record.checkOut || '-'}"`,
          record.workHours || 0,
          `"${record.notes || ''}"`,
        ];
        csvContent += row.join(',') + '\n';
      });
    }

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `Attendance_${viewMode}_${selectedDate || selectedMonth}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Helper for Status Badge Styling
  const getStatusBadge = (status: AttendanceStatus | 'Unrecorded') => {
    switch (status) {
      case 'Present':
        return 'bg-emerald-100 text-emerald-800 border-emerald-300';
      case 'Late':
        return 'bg-amber-100 text-amber-800 border-amber-300';
      case 'Absent':
        return 'bg-rose-100 text-rose-800 border-rose-300';
      case 'Half Day':
        return 'bg-orange-100 text-orange-800 border-orange-300';
      case 'On Leave':
        return 'bg-sky-100 text-sky-800 border-sky-300';
      case 'Day Off':
        return 'bg-purple-100 text-purple-800 border-purple-300';
      default:
        return 'bg-slate-100 text-slate-500 border-slate-200';
    }
  };

  const getStatusPillLetter = (status?: AttendanceStatus) => {
    switch (status) {
      case 'Present':
        return <span className="w-5 h-5 rounded-full bg-emerald-500 text-white font-bold text-[10px] flex items-center justify-center shadow-xs" title="Present">P</span>;
      case 'Late':
        return <span className="w-5 h-5 rounded-full bg-amber-500 text-white font-bold text-[10px] flex items-center justify-center shadow-xs" title="Late">L</span>;
      case 'Absent':
        return <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-bold text-[10px] flex items-center justify-center shadow-xs" title="Extra Leave">E</span>;
      case 'Half Day':
        return <span className="w-5 h-5 rounded-full bg-orange-500 text-white font-bold text-[10px] flex items-center justify-center shadow-xs" title="Half Day">H</span>;
      case 'On Leave':
        return <span className="w-5 h-5 rounded-full bg-sky-500 text-white font-bold text-[10px] flex items-center justify-center shadow-xs" title="On Leave">O</span>;
      case 'Day Off':
        return <span className="w-5 h-5 rounded-full bg-purple-600 text-white font-bold text-[8px] flex items-center justify-center shadow-xs" title="Day Off">OFF</span>;
      
      default:
        return <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-400 font-bold text-[10px] flex items-center justify-center" title="Unrecorded">-</span>;
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* HEADER BAR */}
      <div className="bg-white p-5 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-indigo-600 text-white flex items-center justify-center shadow-md shadow-indigo-200 shrink-0">
            <Clock className="h-6 w-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              Staff Attendance & Shift Register
              <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100 font-semibold">
                Live Module
              </span>
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Track check-in, check-out times, shifts, and monthly attendance rosters.
            </p>
          </div>
        </div>

        {/* View Mode Controls & Quick Actions */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-end">
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200">
            {isAdmin && (
              <button
                onClick={() => setViewMode('daily')}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                  viewMode === 'daily'
                    ? 'bg-white text-indigo-600 shadow-xs border border-slate-200'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                <Calendar className="h-3.5 w-3.5" /> Daily Roster
              </button>
            )}

            <button
              onClick={() => setViewMode('monthly')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 ${
                viewMode === 'monthly'
                  ? 'bg-white text-indigo-600 shadow-xs border border-slate-200'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <TrendingUp className="h-3.5 w-3.5" /> Monthly Matrix
            </button>

            {canUsePunch && (
              <button
                onClick={() => router.push('/attendance/punch')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1.5 text-slate-600 hover:text-slate-900"
              >
                <Clock className="h-3.5 w-3.5 text-indigo-500 animate-pulse" /> Punch Terminal
              </button>
            )}
          </div>

          {isAdmin && (
            <>
              <button
                onClick={handleExportCSV}
                className="px-3 py-1.5 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs"
                title="Export CSV"
              >
                <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" /> Export CSV
              </button>

              <button
                onClick={() => window.print()}
                className="px-3 py-1.5 bg-white border border-slate-200 text-slate-700 hover:bg-slate-50 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-xs no-print"
                title="Print Attendance"
              >
                <Printer className="h-3.5 w-3.5" /> Print
              </button>
            </>
          )}
        </div>
      </div>

      {/* KPI SUMMARY CARDS — admin only */}
      {isAdmin && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Staff</span>
              <Users className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-slate-850">{dailyStats.totalStaff}</p>
            <p className="text-[10px] text-slate-400 mt-1">Active registered staff</p>
          </div>

          <div className="bg-emerald-50/60 p-4 rounded-xl border border-emerald-200 shadow-xs">
            <div className="flex items-center justify-between text-emerald-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Present</span>
              <UserCheck className="h-4 w-4 text-emerald-600" />
            </div>
            <p className="text-2xl font-black text-emerald-800">{dailyStats.present}</p>
            <p className="text-[10px] text-emerald-600 mt-1">Checked in today</p>
          </div>

          <div className="bg-amber-50/60 p-4 rounded-xl border border-amber-200 shadow-xs">
            <div className="flex items-center justify-between text-amber-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Late Arrivals</span>
              <Clock className="h-4 w-4 text-amber-600" />
            </div>
            <p className="text-2xl font-black text-amber-800">{dailyStats.late}</p>
            <p className="text-[10px] text-amber-600 mt-1">Arrived past shift</p>
          </div>

          <div className="bg-rose-50/60 p-4 rounded-xl border border-rose-200 shadow-xs">
            <div className="flex items-center justify-between text-rose-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Absent</span>
              <UserX className="h-4 w-4 text-rose-600" />
            </div>
            <p className="text-2xl font-black text-rose-800">{dailyStats.absent}</p>
            <p className="text-[10px] text-rose-600 mt-1">Not in attendance</p>
          </div>

          <div className="bg-sky-50/60 p-4 rounded-xl border border-sky-200 shadow-xs">
            <div className="flex items-center justify-between text-sky-700 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">On Leave</span>
              <Coffee className="h-4 w-4 text-sky-600" />
            </div>
            <p className="text-2xl font-black text-sky-800">{dailyStats.onLeave}</p>
            <p className="text-[10px] text-sky-600 mt-1">Approved time off</p>
          </div>

          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex items-center justify-between text-slate-500 mb-1">
              <span className="text-[11px] font-bold uppercase tracking-wider">Total Work Hrs</span>
              <Briefcase className="h-4 w-4 text-indigo-500" />
            </div>
            <p className="text-2xl font-black text-indigo-900">{dailyStats.totalHours.toFixed(1)} <span className="text-xs font-normal text-slate-500">hrs</span></p>
            <p className="text-[10px] text-slate-400 mt-1">Accumulated today</p>
          </div>
        </div>
      )}

      {/* VIEW MODE 1: DAILY ROSTER — admin only */}
      {isAdmin && viewMode === 'daily' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-0">
          {/* Controls toolbar */}
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white rounded-xl border border-slate-300 shadow-xs">
                <button
                  onClick={() => changeDate(-1)}
                  className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-l-xl transition-colors"
                  title="Previous Day"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-transparent border-x border-slate-200 focus:outline-none"
                />
                <button
                  onClick={() => changeDate(1)}
                  className="p-2 text-slate-600 hover:text-indigo-600 hover:bg-slate-50 rounded-r-xl transition-colors"
                  title="Next Day"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>

              <button
                onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                className="px-3 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-bold rounded-xl border border-indigo-200 transition-colors"
              >
                Today
              </button>

              <button
                onClick={fetchAttendance}
                className="p-2 bg-white hover:bg-slate-100 text-slate-600 rounded-xl border border-slate-200 transition-colors"
                title="Refresh Roster"
              >
                <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            </div>

            {/* Search and Filters */}
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative min-w-[200px]">
                <Search className="h-3.5 w-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search staff name..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500"
                />
              </div>

              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="all">All Roles</option>
                <option value="receptionist">Receptionist</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
              </select>

              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="Present">Present</option>
                <option value="Late">Late</option>
                <option value="Absent">Extra Leave</option>
                <option value="Half Day">Half Day</option>
                <option value="On Leave">On Leave</option>
                <option value="Day Off">Day Off</option>
                
              </select>

              <button
                onClick={handleBatchMarkPresent}
                disabled={batchSaving}
                className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-xs transition-colors disabled:opacity-50"
              >
                <Sparkles className="h-3.5 w-3.5" />
                {batchSaving ? 'Processing...' : 'Mark Unrecorded Present'}
              </button>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/80 border-b border-slate-200 text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-3 px-4">Staff Member</th>
                  <th className="py-3 px-3">Role</th>
                  <th className="py-3 px-3 text-center">Status</th>
                  <th className="py-3 px-3">Shift</th>
                  <th className="py-3 px-3 text-center">Check-In</th>
                  <th className="py-3 px-3 text-center">Check-Out</th>
                  <th className="py-3 px-3 text-center">Hours</th>
                  <th className="py-3 px-3">Notes</th>
                  <th className="py-3 px-4 text-right">Quick Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200/80 text-xs">
                {filteredDailyRows.length === 0 ? (
                  <tr>
                    <td colSpan={9} className="py-12 text-center text-slate-400">
                      No staff members match the selected filters for {selectedDate}.
                    </td>
                  </tr>
                ) : (
                  filteredDailyRows.map(({ user, record, hasRecord }) => {
                    const isSaving = savingUserId === user.id;

                    return (
                      <tr key={user.id} className="hover:bg-slate-50/80 transition-colors">
                        {/* Name */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <div className="w-8 h-8 rounded-full bg-slate-900 text-indigo-300 font-bold flex items-center justify-center text-xs shrink-0">
                              {user.name.substring(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-bold text-slate-900">{user.name}</p>
                              <p className="text-[10px] text-slate-400 font-mono">@{user.username}</p>
                            </div>
                          </div>
                        </td>

                        {/* Role */}
                        <td className="py-3 px-3">
                          <span className="capitalize font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded text-[10px]">
                            {user.role}
                          </span>
                        </td>

                        {/* Status dropdown */}
                        <td className="py-3 px-3 text-center">
                          <select
                            value={hasRecord ? record.status : 'Absent'}
                            onChange={(e) =>
                              handleSaveAttendance(user.id, user.name, user.role, {
                                status: e.target.value as AttendanceStatus,
                              })
                            }
                            className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors focus:outline-none cursor-pointer ${getStatusBadge(
                              hasRecord ? record.status : 'Unrecorded'
                            )}`}
                          >
                            <option value="Present">Present</option>
                            <option value="Late">Late</option>
                            <option value="Absent">Extra Leave</option>
                            <option value="Half Day">Half Day</option>
                            <option value="On Leave">On Leave</option>
                            <option value="Day Off">Day Off</option>
                            
                          </select>
                        </td>

                        {/* Shift */}
                        <td className="py-3 px-3">
                          <select
                            value={record.shift || 'Full Day'}
                            onChange={(e) =>
                              handleSaveAttendance(user.id, user.name, user.role, {
                                shift: e.target.value as ShiftType,
                              })
                            }
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs text-slate-700 font-medium focus:outline-none"
                          >
                            <option value="Full Day">Full Day</option>
                            <option value="Morning">Morning Shift</option>
                            <option value="Evening">Evening Shift</option>
                            <option value="Night">Night Shift</option>
                          </select>
                        </td>

                        {/* Check-In time */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="time"
                            value={record.checkIn || ''}
                            onChange={(e) =>
                              handleSaveAttendance(user.id, user.name, user.role, {
                                checkIn: e.target.value,
                              })
                            }
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 text-center focus:outline-none focus:border-indigo-500"
                          />
                        </td>

                        {/* Check-Out time */}
                        <td className="py-3 px-3 text-center">
                          <input
                            type="time"
                            value={record.checkOut || ''}
                            onChange={(e) =>
                              handleSaveAttendance(user.id, user.name, user.role, {
                                checkOut: e.target.value,
                              })
                            }
                            className="px-2 py-1 bg-white border border-slate-200 rounded-lg text-xs font-mono text-slate-800 text-center focus:outline-none focus:border-indigo-500"
                          />
                        </td>

                        {/* Work Hours */}
                        <td className="py-3 px-3 text-center">
                          <div className="font-mono text-slate-800 font-bold">
                            {record.workHours ? `${record.workHours}h` : '-'}
                          </div>
                        </td>

                        {/* Notes */}
                        <td className="py-3 px-3">
                          <button
                            onClick={() => {
                              setEditingRecord(record);
                              setTempNotes(record.notes || '');
                              setNoteModalOpen(true);
                            }}
                            className={`p-1.5 rounded-lg text-xs flex items-center gap-1 transition-colors border ${
                              record.notes
                                ? 'bg-amber-50 text-amber-800 border-amber-200 font-semibold'
                                : 'bg-slate-50 text-slate-400 hover:text-slate-700 border-slate-200'
                            }`}
                            title={record.notes || 'Add Notes'}
                          >
                            <Edit2 className="h-3 w-3" />
                            <span className="truncate max-w-[80px]">
                              {record.notes || 'Notes'}
                            </span>
                          </button>
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              onClick={() => handleQuickClockIn(user)}
                              disabled={isSaving}
                              className="px-2 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-lg text-[10px] font-bold transition-colors"
                              title="Clock In Now"
                            >
                              In
                            </button>

                            <button
                              onClick={() => handleQuickClockOut(user)}
                              disabled={isSaving}
                              className="px-2 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 rounded-lg text-[10px] font-bold transition-colors"
                              title="Clock Out Now"
                            >
                              Out
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* VIEW MODE 2: MONTHLY MATRIX */}
      {viewMode === 'monthly' && (
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 overflow-hidden space-y-0">
          <div className="p-4 bg-slate-50/70 border-b border-slate-200 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <label className="text-xs font-bold text-slate-700">Select Month:</label>
              <input
                type="month"
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="px-3 py-1.5 text-xs font-bold text-slate-800 bg-white border border-slate-300 rounded-xl focus:outline-none"
              />
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span> Present (P)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-amber-500"></span> Late (L)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-rose-500"></span> Extra Leave (E)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-sky-500"></span> Leave (O)
              </div>
              <div className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full bg-purple-600"></span> Day Off (OFF)
              </div>
              
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-100/90 border-b border-slate-200 text-[10px] font-bold text-slate-600 uppercase tracking-wider">
                  <th className="py-2.5 px-3 sticky left-0 bg-slate-100 z-10 shadow-xs">Staff Member</th>
                  {monthlyDays.map((d) => (
                    <th key={d} className="py-2.5 px-1 text-center min-w-[28px]">
                      {d}
                    </th>
                  ))}
                  <th className="py-2.5 px-3 text-center bg-slate-50">Present</th>
                  <th className="py-2.5 px-3 text-center bg-slate-50">Hours</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-xs">
                {matrixUsers.map((u) => {
                  let presentCount = 0;
                  let totalHrs = 0;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50 transition-colors">
                      <td className="py-2.5 px-3 font-bold text-slate-900 sticky left-0 bg-white z-10 border-r border-slate-100 shadow-xs truncate max-w-[150px]">
                        {u.name}
                        <span className="block text-[9px] text-slate-400 font-normal capitalize">{u.role}</span>
                      </td>

                      {monthlyDays.map((dayNum) => {
                        const dateStr = `${selectedMonth}-${String(dayNum).padStart(2, '0')}`;
                        const rec = attendanceList.find((a) => a.userId === u.id && a.date === dateStr);
                        if (rec) {
                          if (rec.status === 'Present' || rec.status === 'Late') presentCount++;
                          if (rec.status === 'Half Day') presentCount += 0.5;
                          if (rec.workHours) totalHrs += rec.workHours;
                        }

                        return (
                          <td key={dayNum} className="py-2.5 px-1 text-center">
                            <div className="flex items-center justify-center">
                              {getStatusPillLetter(rec?.status)}
                            </div>
                          </td>
                        );
                      })}

                      <td className="py-2.5 px-3 text-center font-bold text-emerald-700 bg-emerald-50/30">
                        {presentCount}
                      </td>
                      <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-800 bg-slate-50/50">
                        {totalHrs.toFixed(1)}h
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* NOTES MODAL */}
      {noteModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-indigo-600" />
                Attendance Remarks - {editingRecord.userName}
              </h3>
              <button
                onClick={() => setNoteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <label className="text-xs font-semibold text-slate-700">Remarks / Exception Notes:</label>
              <textarea
                rows={3}
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                placeholder="E.g. Approved half day leave, medical reason, shift swap..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setNoteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  await handleSaveAttendance(
                    editingRecord.userId,
                    editingRecord.userName,
                    editingRecord.userRole,
                    { notes: tempNotes }
                  );
                  setNoteModalOpen(false);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-semibold"
              >
                Save Notes
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
