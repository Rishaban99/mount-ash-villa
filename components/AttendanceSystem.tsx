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
  AlertTriangle,
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
  Award,
  ShieldCheck,
  Trophy,
  Trash2,
  Tag,
  FileText,
  Info,
  BarChart2,
  Star,
  BadgeCheck,
  FileDown,
  Eye,
  Loader2,
  User as UserIcon,
} from 'lucide-react';

interface ParsedRemark {
  raw: string;
  category: 'break' | 'punch' | 'overtime' | 'leave' | 'late' | 'general';
  breakIntervals: Array<{ off: string; in: string; minutes: number }>;
  totalBreakMinutes: number;
  tags: string[];
  summaryText: string;
}

const parseRemark = (notes?: string): ParsedRemark => {
  if (!notes || !notes.trim()) {
    return {
      raw: '',
      category: 'general',
      breakIntervals: [],
      totalBreakMinutes: 0,
      tags: [],
      summaryText: '',
    };
  }

  const raw = notes.trim();
  const lower = raw.toLowerCase();
  const breakIntervals: Array<{ off: string; in: string; minutes: number }> = [];
  let totalBreakMinutes = 0;

  // Match "Day Off HH:MM Day In HH:MM" or "Day Off HH:MM Punched Back In HH:MM"
  const regex = /Day\s*Off\s*(\d{1,2}:\d{2})\s*(?:Day\s*In|Punched\s*Back\s*In)\s*(\d{1,2}:\d{2})/gi;
  let match;
  while ((match = regex.exec(raw)) !== null) {
    const offTime = match[1];
    const inTime = match[2];
    const [offH, offM] = offTime.split(':').map(Number);
    const [inH, inM] = inTime.split(':').map(Number);
    let diff = inH * 60 + inM - (offH * 60 + offM);
    if (diff < 0) diff += 24 * 60;
    breakIntervals.push({ off: offTime, in: inTime, minutes: diff });
    totalBreakMinutes += diff;
  }

  const tags: string[] = [];
  let category: ParsedRemark['category'] = 'general';

  if (breakIntervals.length > 0) {
    category = 'break';
    tags.push(`${breakIntervals.length} Break${breakIntervals.length > 1 ? 's' : ''}`);
    if (totalBreakMinutes > 0) {
      if (totalBreakMinutes >= 60) {
        const hrs = (totalBreakMinutes / 60).toFixed(1);
        tags.push(`${hrs}h away`);
      } else {
        tags.push(`${totalBreakMinutes}m away`);
      }
    }
  } else if (lower.includes('day off') || lower.includes('day in') || lower.includes('punched') || lower.includes('clock')) {
    category = 'punch';
    tags.push('Punch Event');
  }

  if (lower.includes('overtime') || lower.includes('ot ') || lower.includes('extra hr') || lower.includes('extra hour')) {
    category = 'overtime';
    tags.push('Overtime');
  }
  if (lower.includes('leave') || lower.includes('sick') || lower.includes('medical') || lower.includes('doctor')) {
    category = 'leave';
    tags.push('Medical / Leave');
  }
  if (lower.includes('late') || lower.includes('delay') || lower.includes('traffic')) {
    category = 'late';
    tags.push('Late Note');
  }

  if (tags.length === 0) {
    tags.push('General Note');
  }

  return {
    raw,
    category,
    breakIntervals,
    totalBreakMinutes,
    tags,
    summaryText: breakIntervals.length > 0
      ? `${breakIntervals.length} break(s) (${totalBreakMinutes}m off-clock)`
      : raw,
  };
};

export const AttendanceSystem: React.FC = () => {
  const { user: currentUser } = useAuth();
  const router = useRouter();
  if (!currentUser) return null;

  const isAdmin = currentUser.role === 'admin';
  const isManager = currentUser.role === 'manager';
  const canUsePunch = isAdmin || isManager;
  const canAddRemarks = isAdmin || isManager;
  const canEditDeleteRemarks = isAdmin;

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

  // Modal states for Remarks / Editing
  const [editingRecord, setEditingRecord] = useState<Attendance | null>(null);
  const [noteModalOpen, setNoteModalOpen] = useState(false);
  const [tempNotes, setTempNotes] = useState('');
  const [savingRemarkLoading, setSavingRemarkLoading] = useState(false);

  // Add Remark Modal (Admin & Manager)
  const [addRemarkModalOpen, setAddRemarkModalOpen] = useState(false);
  const [newRemarkStaffId, setNewRemarkStaffId] = useState('');
  const [newRemarkDate, setNewRemarkDate] = useState(() => `${new Date().toISOString().substring(0, 7)}-01`);
  const [newRemarkText, setNewRemarkText] = useState('');
  const [addingRemarkLoading, setAddingRemarkLoading] = useState(false);

  // Delete Remark Confirmation Modal (Admin only)
  const [deletingRemarkRecord, setDeletingRemarkRecord] = useState<Attendance | null>(null);
  const [deletingRemarkLoading, setDeletingRemarkLoading] = useState(false);

  // Remarks Table Filtering State
  const [remarksSearch, setRemarksSearch] = useState('');
  const [remarksStaffFilter, setRemarksStaffFilter] = useState('all');
  const [remarksCategoryFilter, setRemarksCategoryFilter] = useState('all');

  // Staff Certificate & Monthly Performance Modal
  const [certificateModalOpen, setCertificateModalOpen] = useState(false);
  const [selectedCertStaffId, setSelectedCertStaffId] = useState<string>('all');
  const [certificateViewTab, setCertificateViewTab] = useState<'certificate' | 'statement' | 'leaderboard' | 'ai-certificate'>('certificate');
  const [aiCertResults, setAiCertResults] = useState<Record<string, import('@/app/api/attendance/ai-evaluation/route').StaffAICertificateResult>>({});
  const [aiCertLoading, setAiCertLoading] = useState(false);

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

  // Monthly Remarks list & parsed data
  const monthlyRemarks = useMemo(() => {
    return attendanceList
      .filter((a) => a.date.startsWith(selectedMonth) && a.notes && a.notes.trim().length > 0)
      .sort((x, y) => x.date.localeCompare(y.date));
  }, [attendanceList, selectedMonth]);

  // Filtered Remarks for the UI Data Grid
  const filteredMonthlyRemarks = useMemo(() => {
    return monthlyRemarks.filter((a) => {
      const parsed = parseRemark(a.notes);
      const matchesSearch =
        a.userName.toLowerCase().includes(remarksSearch.toLowerCase()) ||
        (a.notes || '').toLowerCase().includes(remarksSearch.toLowerCase()) ||
        a.date.includes(remarksSearch);
      const matchesStaff = remarksStaffFilter === 'all' || a.userId === remarksStaffFilter;
      const matchesCategory = remarksCategoryFilter === 'all' || parsed.category === remarksCategoryFilter;
      return matchesSearch && matchesStaff && matchesCategory;
    });
  }, [monthlyRemarks, remarksSearch, remarksStaffFilter, remarksCategoryFilter]);

  // Smart Remarks Executive Analytics Summary
  const remarksAnalytics = useMemo(() => {
    let totalBreaks = 0;
    let totalBreakMinutes = 0;
    let punchEvents = 0;
    let overtimeNotes = 0;
    let leaveNotes = 0;
    const staffBreakCount: Record<string, number> = {};

    monthlyRemarks.forEach((a) => {
      const parsed = parseRemark(a.notes);
      if (parsed.category === 'break') {
        totalBreaks += parsed.breakIntervals.length || 1;
        totalBreakMinutes += parsed.totalBreakMinutes;
        staffBreakCount[a.userName] = (staffBreakCount[a.userName] || 0) + 1;
      } else if (parsed.category === 'punch') {
        punchEvents += 1;
      } else if (parsed.category === 'overtime') {
        overtimeNotes += 1;
      } else if (parsed.category === 'leave') {
        leaveNotes += 1;
      }
    });

    return {
      totalRemarks: monthlyRemarks.length,
      totalBreaks,
      totalBreakMinutes,
      totalBreakHours: (totalBreakMinutes / 60).toFixed(1),
      punchEvents,
      overtimeNotes,
      leaveNotes,
      staffWithRemarks: Object.keys(staffBreakCount).length,
    };
  }, [monthlyRemarks]);

  // Staff Monthly Performance Metrics for Certificates, Statements & Ranking
  const staffMonthlyStats = useMemo(() => {
    const list = matrixUsers.map((u) => {
      const records = attendanceList.filter((a) => a.userId === u.id && a.date.startsWith(selectedMonth));
      const totalPresent = records.filter((r) => r.status === 'Present').length;
      const totalLate = records.filter((r) => r.status === 'Late').length;
      const totalHalfDay = records.filter((r) => r.status === 'Half Day').length;
      const totalAbsent = records.filter((r) => r.status === 'Absent').length;
      const totalLeave = records.filter((r) => r.status === 'On Leave').length;
      const totalExtraLeave = records.filter((r) => (r.status as string) === 'Extra Leave' || r.status === 'Day Off').length;
      const totalHours = records.reduce((s, r) => s + (r.workHours || 0), 0);

      const activeDays = totalPresent + totalLate + totalHalfDay;
      const totalDaysEvaluated = activeDays + totalAbsent;
      
      const punctualityScore = totalDaysEvaluated > 0
        ? Math.max(50, Math.min(100, Math.round(((totalPresent + totalHalfDay * 0.8 - totalLate * 0.3) / Math.max(1, totalDaysEvaluated)) * 100)))
        : 0;

      const userRemarks = records.filter((r) => r.notes && r.notes.trim().length > 0);
      let userBreakMinutes = 0;
      userRemarks.forEach((r) => {
        const parsed = parseRemark(r.notes);
        userBreakMinutes += parsed.totalBreakMinutes;
      });

      let performanceTier: 'Platinum' | 'Gold' | 'Silver' | 'Needs Improvement' = 'Needs Improvement';
      if (punctualityScore >= 95 && totalHours >= 120) {
        performanceTier = 'Platinum';
      } else if (punctualityScore >= 85) {
        performanceTier = 'Gold';
      } else if (punctualityScore >= 70) {
        performanceTier = 'Silver';
      }

      return {
        user: u,
        totalPresent,
        totalLate,
        totalHalfDay,
        totalAbsent,
        totalLeave,
        totalExtraLeave,
        totalHours: Math.round(totalHours * 10) / 10,
        punctualityScore,
        remarksCount: userRemarks.length,
        remarksList: userRemarks,
        totalBreakMinutes: userBreakMinutes,
        performanceTier,
        rank: 1,
      };
    });

    list.sort((a, b) => b.totalHours - a.totalHours || b.punctualityScore - a.punctualityScore);
    list.forEach((item, idx) => {
      item.rank = idx + 1;
    });

    return list;
  }, [matrixUsers, attendanceList, selectedMonth]);

  // ── AI Certificate Generation ─────────────────────────────────────────────
  const generateAICertificates = async (targetUserId?: string) => {
    setAiCertLoading(true);
    try {
      const [year, month] = selectedMonth.split('-');
      const monthName = new Date(`${selectedMonth}-01`).toLocaleString('default', { month: 'long' });

      const staffToEvaluate = targetUserId
        ? staffMonthlyStats.filter((s) => s.user.id === targetUserId)
        : staffMonthlyStats;

      const staffList = staffToEvaluate.map((stats) => {
        const records = attendanceList.filter(
          (a) => a.userId === stats.user.id && a.date.startsWith(selectedMonth)
        );

        const breakRecords: Array<{ date: string; off: string; in: string; minutes: number }> = [];
        const staffRemarksRaw: Array<{ date: string; category: string; notes: string }> = [];
        const overtimeNotes: string[] = [];
        const punctualityRecords: string[] = [];

        records.forEach((r) => {
          if (r.notes && r.notes.trim()) {
            const parsed = parseRemark(r.notes);
            staffRemarksRaw.push({ date: r.date, category: parsed.category, notes: r.notes });
            parsed.breakIntervals.forEach((bi) => {
              breakRecords.push({ date: r.date, off: bi.off, in: bi.in, minutes: bi.minutes });
            });
            if (parsed.category === 'overtime') overtimeNotes.push(`${r.date}: ${r.notes}`);
          }
          if (r.status === 'Late' && r.checkIn) {
            punctualityRecords.push(`${r.date}: Late check-in at ${r.checkIn}`);
          }
        });

        const activeDays = stats.totalPresent + stats.totalLate + stats.totalHalfDay;
        const workingDays = activeDays + stats.totalAbsent;
        const attendancePct = workingDays > 0
          ? Math.round(((activeDays) / workingDays) * 100)
          : 0;

        return {
          userId: stats.user.id,
          name: stats.user.name,
          role: stats.user.role,
          month: monthName,
          year,
          workingDays,
          presentDays: stats.totalPresent,
          approvedLeaveDays: stats.totalLeave,
          unauthorizedAbsentDays: stats.totalAbsent,
          lateDays: stats.totalLate,
          attendancePercentage: attendancePct,
          totalWorkedHours: stats.totalHours,
          additionalApprovedLeave: undefined as string | undefined,
          leaveNotes: undefined as string | undefined,
          breakRecords,
          punctualityRecords,
          overtimeHours: 0,
          overtimeNotes,
          staffRemarks: staffRemarksRaw,
        };
      });

      const res = await apiFetch('/api/attendance/ai-evaluation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ staffList }),
      });

      if (res.ok) {
        const data = await res.json();
        const newResults: Record<string, import('@/app/api/attendance/ai-evaluation/route').StaffAICertificateResult> = { ...aiCertResults };
        if (Array.isArray(data.results)) {
          data.results.forEach((r: import('@/app/api/attendance/ai-evaluation/route').StaffAICertificateResult) => {
            newResults[r.userId] = r;
          });
        }
        setAiCertResults(newResults);
        setCertificateViewTab('ai-certificate');
      } else {
        toastError('AI evaluation failed. Please try again.');
      }
    } catch (e) {
      toastError('Failed to connect to AI evaluation service.');
      console.error(e);
    } finally {
      setAiCertLoading(false);
    }
  };

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
        // allow caller to specify a date in updates (for monthly remarks), fallback to selectedDate
        date: (updates as any).date || selectedDate,
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
          const idx = prev.findIndex((a) => a.userId === userId && a.date === payload.date);
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
                            <div
                              role="button"
                              title={rec?.notes ? rec.notes : `Add remark for ${dateStr}`}
                              onClick={() => {
                                if (rec) {
                                  setEditingRecord(rec);
                                  setTempNotes(rec.notes || '');
                                } else {
                                  const fake: Attendance = {
                                    id: '',
                                    userId: u.id,
                                    userName: u.name,
                                    userRole: u.role,
                                    date: dateStr,
                                    checkIn: '',
                                    checkOut: '',
                                    status: 'Extra Leave' as Attendance['status'],
                                    shift: 'Full Day' as Attendance['shift'],
                                    workHours: 0,
                                    notes: '',
                                    recordedBy: '',
                                    createdAt: '',
                                  } as Attendance;
                                  setEditingRecord(fake);
                                  setTempNotes('');
                                }
                                setNoteModalOpen(true);
                              }}
                              className="cursor-pointer"
                            >
                              <div className="flex items-center justify-center">
                                {getStatusPillLetter(rec?.status)}
                              </div>
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
          

          {/* REMARKS: Modernized Smart Remarks & Break Analytics Section */}
          <div className="p-6 border-t border-slate-200 bg-white space-y-6">
            
            {/* Header & Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-display font-bold text-slate-900 flex items-center gap-2">
                    <FileText className="h-5 w-5 text-indigo-600" />
                    Staff Remarks & Break Analytics
                  </h3>
                  <span className="px-2 py-0.5 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-100">
                    {monthlyRemarks.length} Logged
                  </span>
                </div>
                <p className="text-xs text-slate-500 mt-1">
                  Intelligent parsing of day-off breaks, off-clock intervals, overtime notes, and exceptions for {selectedMonth}
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                {/* Staff Monthly Certificates & Ranking Button */}
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCertStaffId(matrixUsers[0]?.id || 'all');
                    setCertificateViewTab('certificate');
                    setCertificateModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-amber-500 via-amber-600 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  <Award className="h-4 w-4 text-amber-200" />
                  Staff Monthly Certificates & Ranking
                </button>

                {/* Add Remark Button (Manager & Admin only) */}
                {canAddRemarks && (
                  <button
                    type="button"
                    onClick={() => {
                      setNewRemarkStaffId(matrixUsers[0]?.id || '');
                      setNewRemarkDate(`${selectedMonth}-01`);
                      setNewRemarkText('');
                      setAddRemarkModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-xs transition-all cursor-pointer"
                  >
                    <Plus className="h-4 w-4" />
                    Add Staff Remark
                  </button>
                )}
              </div>
            </div>

            {/* Smart Analytics Mini Stat Tiles */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3.5 bg-indigo-50/50 rounded-2xl border border-indigo-100 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Total Remarks</span>
                <span className="text-lg font-black text-slate-900 mt-1">{remarksAnalytics.totalRemarks}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">Across all staff in {selectedMonth}</span>
              </div>

              <div className="p-3.5 bg-amber-50/50 rounded-2xl border border-amber-100 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Off-Clock Breaks</span>
                <span className="text-lg font-black text-slate-900 mt-1">{remarksAnalytics.totalBreaks} Breaks</span>
                <span className="text-[10px] text-amber-700 font-semibold mt-0.5">{remarksAnalytics.totalBreakHours}h total away</span>
              </div>

              <div className="p-3.5 bg-emerald-50/50 rounded-2xl border border-emerald-100 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Punch Events</span>
                <span className="text-lg font-black text-slate-900 mt-1">{remarksAnalytics.punchEvents} Events</span>
                <span className="text-[10px] text-emerald-700 font-semibold mt-0.5">Auto & manual logs</span>
              </div>

              <div className="p-3.5 bg-purple-50/50 rounded-2xl border border-purple-100 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Staff With Remarks</span>
                <span className="text-lg font-black text-slate-900 mt-1">
                  {remarksAnalytics.staffWithRemarks} / {matrixUsers.length}
                </span>
                <span className="text-[10px] text-purple-700 font-semibold mt-0.5">Staff members noted</span>
              </div>
            </div>

            {/* Search & Filter Bar */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-2.5 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              <div className="relative flex-1">
                <Search className="h-3.5 w-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search remarks or staff name..."
                  value={remarksSearch}
                  onChange={(e) => setRemarksSearch(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 bg-white border border-slate-200 rounded-lg text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div className="flex items-center gap-2">
                <select
                  value={remarksStaffFilter}
                  onChange={(e) => setRemarksStaffFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Staff</option>
                  {matrixUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name}
                    </option>
                  ))}
                </select>

                <select
                  value={remarksCategoryFilter}
                  onChange={(e) => setRemarksCategoryFilter(e.target.value)}
                  className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-lg text-xs font-semibold text-slate-700 focus:outline-none"
                >
                  <option value="all">All Remark Types</option>
                  <option value="break">Day Off / Break Intervals</option>
                  <option value="punch">Punch Events</option>
                  <option value="overtime">Overtime</option>
                  <option value="leave">Medical / Leave</option>
                  <option value="late">Late Arrival</option>
                  <option value="general">General Notes</option>
                </select>
              </div>
            </div>

            {/* Remarks Data Grid Table */}
            <div className="overflow-x-auto rounded-xl border border-slate-200">
              {filteredMonthlyRemarks.length === 0 ? (
                <div className="p-8 text-center bg-white space-y-2">
                  <Info className="h-6 w-6 text-slate-400 mx-auto" />
                  <p className="text-xs font-bold text-slate-700">No remarks found for the active filter</p>
                  <p className="text-[11px] text-slate-400">
                    {monthlyRemarks.length === 0
                      ? `No attendance remarks or break notes logged for ${selectedMonth}.`
                      : 'Try adjusting your search query or filters.'}
                  </p>
                </div>
              ) : (
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-100/80 border-b border-slate-200 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      <th className="py-3 px-4">Date</th>
                      <th className="py-3 px-4">Staff Member</th>
                      <th className="py-3 px-4">Categorized Remark & Breakdown</th>
                      <th className="py-3 px-4 text-center">Break Duration</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-sans">
                    {filteredMonthlyRemarks.map((a) => {
                      const parsed = parseRemark(a.notes);
                      const staffInitial = (a.userName || 'S').charAt(0).toUpperCase();

                      return (
                        <tr key={`${a.userId}-${a.date}`} className="hover:bg-slate-50/70 transition-colors">
                          {/* Date */}
                          <td className="py-3 px-4 font-mono font-bold text-slate-700 whitespace-nowrap">
                            {a.date}
                          </td>

                          {/* Staff Member */}
                          <td className="py-3 px-4">
                            <div className="flex items-center gap-2.5">
                              <div className="w-7 h-7 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs shrink-0">
                                {staffInitial}
                              </div>
                              <div>
                                <span className="font-bold text-slate-900 block">{a.userName}</span>
                                <span className="text-[10px] text-slate-400 capitalize">{a.userRole}</span>
                              </div>
                            </div>
                          </td>

                          {/* Remark & Tag Badges */}
                          <td className="py-3 px-4 max-w-md">
                            <div className="space-y-1.5">
                              <p className="text-xs text-slate-800 font-medium leading-relaxed">
                                {a.notes}
                              </p>
                              <div className="flex flex-wrap items-center gap-1.5">
                                {parsed.tags.map((tag, tIdx) => (
                                  <span
                                    key={tIdx}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] font-bold ${
                                      parsed.category === 'break'
                                        ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                        : parsed.category === 'punch'
                                        ? 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                                        : parsed.category === 'overtime'
                                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                                        : parsed.category === 'leave'
                                        ? 'bg-rose-50 text-rose-700 border border-rose-200'
                                        : 'bg-slate-100 text-slate-700 border border-slate-200'
                                    }`}
                                  >
                                    <Tag className="h-2.5 w-2.5" />
                                    {tag}
                                  </span>
                                ))}
                              </div>
                            </div>
                          </td>

                          {/* Break Duration */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            {parsed.totalBreakMinutes > 0 ? (
                              <span className="font-mono text-xs font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg">
                                {parsed.totalBreakMinutes >= 60
                                  ? `${(parsed.totalBreakMinutes / 60).toFixed(1)} hrs`
                                  : `${parsed.totalBreakMinutes} mins`}
                              </span>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">—</span>
                            )}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              {/* Quick Certificate View */}
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedCertStaffId(a.userId);
                                  setCertificateViewTab('certificate');
                                  setCertificateModalOpen(true);
                                }}
                                title="View Monthly Certificate"
                                className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition-colors cursor-pointer"
                              >
                                <Award className="h-4 w-4" />
                              </button>

                              {/* Edit Remark (Admin only) */}
                              {canEditDeleteRemarks && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingRecord(a);
                                    setTempNotes(a.notes || '');
                                    setNoteModalOpen(true);
                                  }}
                                  title="Edit Remark"
                                  className="p-1.5 text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Edit2 className="h-4 w-4" />
                                </button>
                              )}

                              {/* Delete Remark (Admin only) */}
                              {canEditDeleteRemarks && (
                                <button
                                  type="button"
                                  onClick={() => setDeletingRemarkRecord(a)}
                                  title="Delete Remark"
                                  className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>

          </div>
        </div>
      )}

      {/* 1. ADD REMARK MODAL (For Admin & Manager) */}
      {addRemarkModalOpen && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Plus className="h-4 w-4 text-indigo-600" />
                Add Staff Remark / Exception Note
              </h3>
              <button
                onClick={() => setAddRemarkModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Select Staff Member:</label>
                <select
                  value={newRemarkStaffId}
                  onChange={(e) => setNewRemarkStaffId(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                >
                  {matrixUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">Date:</label>
                <input
                  type="date"
                  value={newRemarkDate}
                  onChange={(e) => setNewRemarkDate(e.target.value)}
                  className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>

              <div>
                <label className="text-xs font-semibold text-slate-700 block mb-1">
                  Remark / Exception Details:
                </label>
                <textarea
                  rows={3}
                  value={newRemarkText}
                  onChange={(e) => setNewRemarkText(e.target.value)}
                  placeholder="e.g. Day Off 15:30 Day In 16:15, Overtime 2hrs approved, Medical appointment..."
                  className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setAddRemarkModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={addingRemarkLoading}
                onClick={async () => {
                  if (!newRemarkStaffId || !newRemarkText.trim()) {
                    toastError('Please choose staff and enter remark');
                    return;
                  }
                  const target = matrixUsers.find((u) => u.id === newRemarkStaffId);
                  if (!target) return;
                  setAddingRemarkLoading(true);
                  try {
                    await handleSaveAttendance(target.id, target.name, target.role, {
                      notes: newRemarkText.trim(),
                      date: newRemarkDate,
                    });
                    setAddRemarkModalOpen(false);
                    setNewRemarkText('');
                    toastCreated('Remark saved successfully');
                  } catch (e) {
                    console.error(e);
                  } finally {
                    setAddingRemarkLoading(false);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                {addingRemarkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Save Remark
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. EDIT REMARK MODAL (For Admin Only) */}
      {noteModalOpen && editingRecord && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base flex items-center gap-2">
                <Edit2 className="h-4 w-4 text-indigo-600" />
                Edit Staff Remark - {editingRecord.userName}
              </h3>
              <button
                onClick={() => setNoteModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs text-slate-500">
                <span>Date: <strong className="font-mono text-slate-800">{editingRecord.date}</strong></span>
                <span>Role: <strong className="capitalize text-slate-800">{editingRecord.userRole}</strong></span>
              </div>
              <label className="text-xs font-semibold text-slate-700 block mt-2">Remarks / Exception Notes:</label>
              <textarea
                rows={3}
                value={tempNotes}
                onChange={(e) => setTempNotes(e.target.value)}
                placeholder="Add any remarks or exceptions for this staff member's attendance..."
                className="w-full p-3 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setNoteModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={savingRemarkLoading}
                onClick={async () => {
                  setSavingRemarkLoading(true);
                  try {
                    await handleSaveAttendance(
                      editingRecord.userId,
                      editingRecord.userName,
                      editingRecord.userRole,
                      { notes: tempNotes, date: editingRecord.date }
                    );
                    setNoteModalOpen(false);
                    toastUpdated('Remark updated');
                  } finally {
                    setSavingRemarkLoading(false);
                  }
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                {savingRemarkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Update Remark
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 3. DELETE REMARK CONFIRMATION MODAL (Admin Only) */}
      {deletingRemarkRecord && (
        <div className="fixed inset-0 bg-slate-950/60 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl space-y-4 border border-rose-100">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rose-100 text-rose-600 flex items-center justify-center shrink-0">
                <AlertTriangle className="h-5 w-5" />
              </div>
              <div>
                <h3 className="font-bold text-slate-900 text-base">Delete Staff Remark?</h3>
                <p className="text-xs text-slate-500">This will clear the remark for this record.</p>
              </div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
              <p><strong>Staff:</strong> {deletingRemarkRecord.userName}</p>
              <p><strong>Date:</strong> {deletingRemarkRecord.date}</p>
              <p className="text-slate-600 truncate"><strong>Remark:</strong> "{deletingRemarkRecord.notes}"</p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setDeletingRemarkRecord(null)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingRemarkLoading}
                onClick={async () => {
                  setDeletingRemarkLoading(true);
                  try {
                    await handleSaveAttendance(
                      deletingRemarkRecord.userId,
                      deletingRemarkRecord.userName,
                      deletingRemarkRecord.userRole,
                      { notes: '', date: deletingRemarkRecord.date }
                    );
                    setDeletingRemarkRecord(null);
                    toastUpdated('Remark removed');
                  } finally {
                    setDeletingRemarkLoading(false);
                  }
                }}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
              >
                {deletingRemarkLoading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 4. STAFF MONTHLY CERTIFICATE, STATEMENT & LEADERBOARD MODAL */}
      {certificateModalOpen && (
        <div className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs z-50 flex items-center justify-center p-4 overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-4xl w-full p-6 sm:p-8 shadow-2xl space-y-6 border border-slate-200 my-8 max-h-[90vh] overflow-y-auto">
            
            {/* Modal Header & Navigation */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-100 no-print">
              <div>
                <h2 className="text-xl font-display font-black text-slate-900 flex items-center gap-2">
                  <Award className="h-6 w-6 text-amber-500" />
                  Staff Monthly Certificate & Evaluation
                </h2>
                <p className="text-xs text-slate-500 mt-0.5">
                  Official performance accreditation, punctuality appraisal, and remarks statement for {selectedMonth}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
                >
                  <Printer className="h-3.5 w-3.5" />
                  Print / Save PDF
                </button>
                <button
                  type="button"
                  onClick={() => setCertificateModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Staff Selector & Tab Switcher */}
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-2xl border border-slate-200 no-print">
              <div className="flex items-center gap-2">
                <label className="text-xs font-bold text-slate-700 shrink-0">Staff Member:</label>
                <select
                  value={selectedCertStaffId}
                  onChange={(e) => setSelectedCertStaffId(e.target.value)}
                  className="px-3 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:outline-none"
                >
                  <option value="all">⭐ All Staff (Batch View)</option>
                  {matrixUsers.map((u) => (
                    <option key={u.id} value={u.id}>
                      {u.name} ({u.role})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex flex-wrap gap-1.5 bg-white rounded-xl p-1 border border-slate-200 shadow-2xs">
                <button
                  type="button"
                  onClick={() => setCertificateViewTab('certificate')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    certificateViewTab === 'certificate'
                      ? 'bg-amber-500 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Award className="h-3.5 w-3.5" />
                  Certificate
                </button>

                <button
                  type="button"
                  onClick={() => setCertificateViewTab('statement')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    certificateViewTab === 'statement'
                      ? 'bg-indigo-600 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <FileText className="h-3.5 w-3.5" />
                  Statement
                </button>

                <button
                  type="button"
                  onClick={() => setCertificateViewTab('leaderboard')}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    certificateViewTab === 'leaderboard'
                      ? 'bg-slate-900 text-white shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50'
                  }`}
                >
                  <Trophy className="h-3.5 w-3.5" />
                  Leaderboard
                </button>

                {/* AI Remarks Certificate Tab */}
                <button
                  type="button"
                  onClick={() => {
                    if (Object.keys(aiCertResults).length > 0) {
                      setCertificateViewTab('ai-certificate');
                    } else {
                      generateAICertificates(selectedCertStaffId === 'all' ? undefined : selectedCertStaffId);
                    }
                  }}
                  disabled={aiCertLoading}
                  className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all cursor-pointer flex items-center gap-1.5 ${
                    certificateViewTab === 'ai-certificate'
                      ? 'bg-violet-600 text-white shadow-xs'
                      : 'bg-violet-50 text-violet-700 hover:bg-violet-100 border border-violet-200'
                  } disabled:opacity-60`}
                >
                  {aiCertLoading ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Sparkles className="h-3.5 w-3.5" />
                  )}
                  {aiCertLoading ? 'AI Analysing…' : '✨ AI Remarks'}
                </button>
              </div>
            </div>

            {/* AI Generate Button — visible when not on AI tab */}
            {certificateViewTab !== 'ai-certificate' && (
              <div className="flex justify-end no-print">
                <button
                  type="button"
                  onClick={() => generateAICertificates(selectedCertStaffId === 'all' ? undefined : selectedCertStaffId)}
                  disabled={aiCertLoading}
                  className="px-4 py-2 bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 transition-all shadow-md hover:shadow-lg cursor-pointer disabled:opacity-60"
                >
                  {aiCertLoading ? (
                    <><Loader2 className="h-3.5 w-3.5 animate-spin" /> AI Analysing Remarks…</>
                  ) : (
                    <><Sparkles className="h-3.5 w-3.5" /> Generate AI Remarks Certificate</>
                  )}
                </button>
              </div>
            )}

            {/* TAB: AI REMARKS CERTIFICATE */}
            {certificateViewTab === 'ai-certificate' && (
              <div className="space-y-6">
                {/* AI Regenerate bar */}
                <div className="flex items-center justify-between bg-violet-50 border border-violet-200 rounded-2xl p-3 no-print">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-violet-600" />
                    <span className="text-xs font-bold text-violet-800">AI Remarks Analysis — Evidence-Based Evaluation</span>
                    <span className="text-[10px] bg-violet-100 text-violet-700 px-2 py-0.5 rounded-full font-bold border border-violet-200">Powered by Gemini AI</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => generateAICertificates(selectedCertStaffId === 'all' ? undefined : selectedCertStaffId)}
                    disabled={aiCertLoading}
                    className="px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer transition-colors disabled:opacity-60"
                  >
                    {aiCertLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <RefreshCw className="h-3 w-3" />}
                    Regenerate
                  </button>
                </div>

                {(selectedCertStaffId === 'all'
                  ? staffMonthlyStats
                  : staffMonthlyStats.filter((s) => s.user.id === selectedCertStaffId)
                ).map((stats) => {
                  const cert = aiCertResults[stats.user.id];
                  const certId = `MAV-AI-${selectedMonth.replace('-', '')}-${(stats.user.name || 'STAFF').substring(0, 4).toUpperCase()}`;

                  if (!cert) {
                    return (
                      <div key={stats.user.id} className="p-6 rounded-2xl border-2 border-dashed border-violet-200 bg-violet-50/50 text-center space-y-3">
                        <Sparkles className="h-8 w-8 text-violet-400 mx-auto" />
                        <p className="text-sm font-bold text-violet-700">{stats.user.name}</p>
                        <p className="text-xs text-violet-500">AI evaluation not yet generated for this staff member.</p>
                        <button
                          type="button"
                          onClick={() => generateAICertificates(stats.user.id)}
                          disabled={aiCertLoading}
                          className="px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold cursor-pointer transition-colors disabled:opacity-60"
                        >
                          {aiCertLoading ? 'Generating…' : 'Generate Now'}
                        </button>
                      </div>
                    );
                  }

                  const confidenceColor =
                    cert.confidence === 'High' ? 'emerald' :
                    cert.confidence === 'Medium' ? 'amber' : 'rose';

                  return (
                    <div
                      key={stats.user.id}
                      className="relative rounded-3xl bg-gradient-to-b from-slate-900 via-slate-800 to-slate-900 border-2 border-violet-500/40 shadow-2xl overflow-hidden"
                    >
                      {/* Corner ornaments */}
                      <div className="absolute top-3 left-3 w-10 h-10 border-t-2 border-l-2 border-violet-400/40 pointer-events-none" />
                      <div className="absolute top-3 right-3 w-10 h-10 border-t-2 border-r-2 border-violet-400/40 pointer-events-none" />
                      <div className="absolute bottom-3 left-3 w-10 h-10 border-b-2 border-l-2 border-violet-400/40 pointer-events-none" />
                      <div className="absolute bottom-3 right-3 w-10 h-10 border-b-2 border-r-2 border-violet-400/40 pointer-events-none" />

                      {/* Certificate Header */}
                      <div className="text-center px-8 pt-10 pb-6 space-y-3 border-b border-white/10">
                        <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-gradient-to-br from-violet-500 via-indigo-500 to-purple-600 text-white shadow-lg mx-auto mb-2">
                          <Sparkles className="h-8 w-8 text-white" />
                        </div>
                        <p className="text-[10px] font-bold text-violet-300 uppercase tracking-[0.25em]">
                          Mount Ash Villa · Hospitality Group
                        </p>
                        <h2 className="font-serif text-xl sm:text-2xl font-black text-white uppercase tracking-wide">
                          Monthly Certificate of Attendance,
                          <br />
                          <span className="text-violet-300">Conduct & Excellence</span>
                        </h2>
                        <div className="h-px w-32 bg-gradient-to-r from-transparent via-violet-400 to-transparent mx-auto" />
                        <p className="text-[10px] text-white/50 uppercase tracking-wider">AI Remarks Analysis · Evidence-Based Evaluation</p>
                      </div>

                      {/* Recipient + Award */}
                      <div className="px-8 py-6 space-y-4 text-center border-b border-white/10">
                        <div className="inline-block bg-violet-500/20 border border-violet-400/40 text-violet-200 text-[10px] font-black uppercase tracking-widest px-4 py-1.5 rounded-full">
                          {cert.awardTitle}
                        </div>
                        <p className="text-xs text-white/50 uppercase tracking-widest">This certificate is proudly presented to</p>
                        <h1 className="font-serif text-3xl sm:text-4xl font-black text-white tracking-wide">
                          {stats.user.name}
                        </h1>
                        <p className="text-xs font-bold text-violet-300 capitalize tracking-wide">
                          {stats.user.role} · {selectedMonth}
                        </p>

                        {/* Performance Grade & Score */}
                        <div className="flex flex-wrap justify-center gap-3 pt-2">
                          <div className="px-4 py-2 bg-white/10 rounded-2xl border border-white/20">
                            <span className="text-[10px] text-white/50 block font-bold uppercase tracking-wider">Performance Grade</span>
                            <span className="text-sm font-black text-amber-300">{cert.performanceGrade}</span>
                          </div>
                          <div className="px-4 py-2 bg-white/10 rounded-2xl border border-white/20">
                            <span className="text-[10px] text-white/50 block font-bold uppercase tracking-wider">Overall Score</span>
                            <span className="text-sm font-black text-emerald-300">{cert.score}/100</span>
                          </div>
                          <div className="px-4 py-2 bg-white/10 rounded-2xl border border-white/20">
                            <span className="text-[10px] text-white/50 block font-bold uppercase tracking-wider">Classification</span>
                            <span className="text-sm font-black text-white">{cert.overallClassification}</span>
                          </div>
                          <div className={`px-4 py-2 bg-${confidenceColor}-500/20 rounded-2xl border border-${confidenceColor}-400/40`}>
                            <span className="text-[10px] text-white/50 block font-bold uppercase tracking-wider">AI Confidence</span>
                            <span className={`text-sm font-black text-${confidenceColor}-300`}>{cert.confidence}</span>
                          </div>
                        </div>
                      </div>

                      {/* AI Citation */}
                      <div className="px-8 py-6 border-b border-white/10">
                        <p className="text-[10px] font-bold text-violet-300 uppercase tracking-widest mb-3 flex items-center gap-2">
                          <Sparkles className="h-3 w-3" /> AI-Generated Citation
                        </p>
                        <p className="text-sm text-white/85 leading-relaxed font-serif italic text-center">
                          &ldquo;{cert.aiCitation}&rdquo;
                        </p>
                      </div>

                      {/* Remarks Classification Grid */}
                      <div className="px-8 py-6 border-b border-white/10">
                        <p className="text-[10px] font-bold text-violet-300 uppercase tracking-widest mb-4">Remarks Classification</p>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                          {[
                            { label: 'Attendance', value: cert.remarksClassification.attendance },
                            { label: 'Approved Leave', value: cert.remarksClassification.approvedLeave },
                            { label: 'Punctuality', value: cert.remarksClassification.punctuality },
                            { label: 'Break Discipline', value: cert.remarksClassification.breakDiscipline },
                            { label: 'Overtime', value: cert.remarksClassification.overtime },
                            { label: 'Work Ethic', value: cert.remarksClassification.workEthic },
                            { label: 'Conduct', value: cert.remarksClassification.conduct },
                            { label: 'Overall Remarks', value: cert.remarksClassification.overallRemarks },
                          ].map((item) => (
                            <div key={item.label} className="p-2.5 bg-white/5 rounded-xl border border-white/10 text-center">
                              <span className="text-[9px] font-bold text-white/40 uppercase tracking-wider block mb-1">{item.label}</span>
                              <span className="text-[11px] font-bold text-white/90 leading-tight block">{item.value}</span>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Conduct Assessment + Evidence */}
                      <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/10 border-b border-white/10">
                        {/* Conduct Assessment */}
                        <div className="px-6 py-5">
                          <p className="text-[10px] font-bold text-violet-300 uppercase tracking-widest mb-3">Conduct Assessment</p>
                          <div className="space-y-2">
                            {[
                              { label: 'Punctuality', value: cert.conductAssessment.punctuality },
                              { label: 'Break Discipline', value: cert.conductAssessment.breakDiscipline },
                              { label: 'Reliability', value: cert.conductAssessment.reliability },
                              { label: 'Work Ethic', value: cert.conductAssessment.workEthic },
                              { label: 'Overtime', value: cert.conductAssessment.overtimeContribution },
                            ].map((item) => (
                              <div key={item.label} className="flex items-start justify-between gap-3">
                                <span className="text-[10px] text-white/40 font-bold shrink-0">{item.label}:</span>
                                <span className="text-[10px] text-white/80 font-semibold text-right">{item.value}</span>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Evidence Summary */}
                        <div className="px-6 py-5">
                          <p className="text-[10px] font-bold text-violet-300 uppercase tracking-widest mb-3">Evidence Summary</p>
                          <ul className="space-y-1.5">
                            {cert.evidenceSummary.map((e, i) => (
                              <li key={i} className="flex items-start gap-1.5 text-[10px] text-white/70">
                                <span className="text-violet-400 mt-0.5 shrink-0">•</span>
                                <span>{e}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </div>

                      {/* Remarks Appraisal */}
                      <div className="px-8 py-6 border-b border-white/10">
                        <p className="text-[10px] font-bold text-violet-300 uppercase tracking-widest mb-3">Remarks Appraisal</p>
                        <p className="text-xs text-white/75 leading-relaxed">{cert.remarksAppraisal}</p>
                      </div>

                      {/* Leave Analysis */}
                      <div className="px-8 py-5 border-b border-white/10">
                        <p className="text-[10px] font-bold text-violet-300 uppercase tracking-widest mb-2">Leave Analysis</p>
                        <p className="text-xs text-white/75 leading-relaxed">{cert.leaveAnalysis}</p>
                      </div>

                      {/* Merits & Areas for Attention */}
                      <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x divide-white/10 border-b border-white/10">
                        <div className="px-6 py-5">
                          <p className="text-[10px] font-bold text-emerald-300 uppercase tracking-widest mb-3">✦ Merits Recognised</p>
                          <div className="flex flex-wrap gap-1.5">
                            {cert.merits.map((m, i) => (
                              <span key={i} className="px-2.5 py-1 bg-emerald-500/20 border border-emerald-400/30 text-emerald-200 text-[10px] font-bold rounded-full">
                                {m}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="px-6 py-5">
                          <p className="text-[10px] font-bold text-amber-300 uppercase tracking-widest mb-3">◆ Areas for Attention</p>
                          {cert.areasForAttention.length === 0 ? (
                            <p className="text-[10px] text-white/40 italic">No areas requiring attention identified.</p>
                          ) : (
                            <div className="flex flex-wrap gap-1.5">
                              {cert.areasForAttention.map((a, i) => (
                                <span key={i} className="px-2.5 py-1 bg-amber-500/20 border border-amber-400/30 text-amber-200 text-[10px] font-bold rounded-full">
                                  {a}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Footer: Seal + Manager Note */}
                      <div className="px-8 py-8 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="text-center sm:text-left space-y-1">
                          <p className="text-xs text-white/70 leading-relaxed max-w-sm italic font-serif">&ldquo;{cert.managerClosingNote}&rdquo;</p>
                          <div className="w-40 border-b border-white/30 pt-3 mx-auto sm:mx-0" />
                          <p className="text-[9px] text-white/30 uppercase tracking-widest font-bold">General Manager · Mount Ash Villa</p>
                        </div>

                        {/* Digital Gold Seal */}
                        <div className="flex flex-col items-center gap-2 shrink-0">
                          <div className="w-20 h-20 rounded-full border-2 border-dashed border-violet-400/60 bg-violet-900/40 flex flex-col items-center justify-center text-violet-300 shadow-lg">
                            <BadgeCheck className="h-7 w-7 text-violet-300" />
                            <span className="text-[7px] font-black uppercase tracking-tighter text-violet-400">AI VERIFIED</span>
                          </div>
                          <p className="text-[9px] font-mono font-bold text-white/30">{certId}</p>
                          <p className="text-[9px] text-white/20 uppercase tracking-wider">
                            {new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </p>
                        </div>
                      </div>

                      {/* Print Button */}
                      <div className="px-8 pb-6 flex justify-center no-print">
                        <button
                          type="button"
                          onClick={() => window.print()}
                          className="px-6 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold flex items-center gap-2 cursor-pointer transition-colors shadow-lg"
                        >
                          <Printer className="h-4 w-4" />
                          Print / Save as PDF
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 1: LUXURY CERTIFICATE OF EXCELLENCE */}
            {certificateViewTab === 'certificate' && (
              <div className="space-y-6">
                {(selectedCertStaffId === 'all'
                  ? staffMonthlyStats
                  : staffMonthlyStats.filter((s) => s.user.id === selectedCertStaffId)
                ).map((stats) => {
                  const certId = `MAV-CERT-${selectedMonth.replace('-', '')}-${(stats.user.name || 'STAFF')
                    .substring(0, 4)
                    .toUpperCase()}`;

                  return (
                    <div
                      key={stats.user.id}
                      className="relative p-8 sm:p-12 rounded-3xl bg-gradient-to-b from-amber-50/30 via-white to-amber-50/20 border-4 border-amber-400/60 shadow-xl space-y-6 text-center overflow-hidden"
                    >
                      {/* Luxury Gold Corner Ornaments */}
                      <div className="absolute top-3 left-3 w-10 h-10 border-t-2 border-l-2 border-amber-600/40 pointer-events-none" />
                      <div className="absolute top-3 right-3 w-10 h-10 border-t-2 border-r-2 border-amber-600/40 pointer-events-none" />
                      <div className="absolute bottom-3 left-3 w-10 h-10 border-b-2 border-l-2 border-amber-600/40 pointer-events-none" />
                      <div className="absolute bottom-3 right-3 w-10 h-10 border-b-2 border-r-2 border-amber-600/40 pointer-events-none" />

                      {/* Crest & Hotel Brand */}
                      <div className="space-y-1">
                        <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-gradient-to-br from-amber-400 via-amber-500 to-yellow-600 text-white shadow-md mx-auto mb-2">
                          <Trophy className="h-7 w-7 text-amber-100" />
                        </div>
                        <h4 className="font-serif text-xs font-black tracking-widest text-amber-800 uppercase">
                          Mount Ash Villa • Hospitality Group
                        </h4>
                        <h2 className="font-serif text-xl sm:text-2xl font-black text-slate-900 uppercase tracking-wide">
                          Monthly Certificate of Attendance & Excellence
                        </h2>
                        <div className="h-0.5 w-28 bg-amber-400 mx-auto mt-2 rounded-full" />
                      </div>

                      {/* Recipient & Citation */}
                      <div className="space-y-3 pt-2">
                        <p className="text-xs text-slate-500 uppercase tracking-widest font-sans font-medium">
                          This official certificate is proudly presented to
                        </p>
                        <h1 className="font-serif text-3xl sm:text-4xl font-black text-slate-900 tracking-wide underline decoration-amber-400/60 decoration-2 underline-offset-8">
                          {stats.user.name}
                        </h1>
                        <p className="text-xs font-bold text-indigo-700 capitalize tracking-wide font-sans">
                          {stats.user.role} • Staff Accreditation
                        </p>
                        <p className="text-xs sm:text-sm text-slate-600 max-w-xl mx-auto leading-relaxed pt-2">
                          In recognition of meritorious service, dedicated attendance, and professional conduct at Mount Ash Villa during the operating period of <strong className="text-slate-800">{selectedMonth}</strong>.
                        </p>
                      </div>

                      {/* Performance Metric Badges */}
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 max-w-2xl mx-auto pt-2">
                        <div className="p-3 bg-white/90 rounded-2xl border border-amber-200 shadow-2xs">
                          <span className="text-[9px] font-bold text-amber-700 uppercase tracking-wider block">
                            Total Hours
                          </span>
                          <span className="text-base font-black text-slate-900 mt-0.5 block">
                            {stats.totalHours} hrs
                          </span>
                        </div>

                        <div className="p-3 bg-white/90 rounded-2xl border border-emerald-200 shadow-2xs">
                          <span className="text-[9px] font-bold text-emerald-700 uppercase tracking-wider block">
                            Days Present
                          </span>
                          <span className="text-base font-black text-slate-900 mt-0.5 block">
                            {stats.totalPresent} Days
                          </span>
                        </div>

                        <div className="p-3 bg-white/90 rounded-2xl border border-indigo-200 shadow-2xs">
                          <span className="text-[9px] font-bold text-indigo-700 uppercase tracking-wider block">
                            Punctuality
                          </span>
                          <span className="text-base font-black text-indigo-900 mt-0.5 block">
                            {stats.punctualityScore}%
                          </span>
                        </div>

                        <div className="p-3 bg-white/90 rounded-2xl border border-purple-200 shadow-2xs">
                          <span className="text-[9px] font-bold text-purple-700 uppercase tracking-wider block">
                            Tier Status
                          </span>
                          <span className="text-xs font-black text-purple-900 mt-1 block truncate">
                            {stats.performanceTier}
                          </span>
                        </div>
                      </div>

                      {/* Remarks & Conduct Summary */}
                      <div className="bg-white/80 p-4 rounded-2xl border border-amber-100 max-w-2xl mx-auto text-left space-y-1.5">
                        <div className="flex items-center justify-between text-xs">
                          <span className="font-bold text-slate-800 flex items-center gap-1.5">
                            <ShieldCheck className="h-4 w-4 text-emerald-600" />
                            Attendance & Conduct Summary:
                          </span>
                          <span className="text-[10px] text-slate-500 font-semibold">
                            {stats.remarksCount} Remark Notes Recorded
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-600 leading-relaxed">
                          {stats.remarksCount === 0
                            ? 'Exemplary conduct with zero logged exception remarks or unapproved breaks during the monthly period.'
                            : `Logged ${stats.remarksCount} remarks/exceptions with a total of ${stats.totalBreakMinutes} minutes in off-clock break intervals.`}
                        </p>
                      </div>

                      {/* Certificate Seal & Authorized Signatures */}
                      <div className="pt-6 border-t border-amber-200/80 flex flex-col sm:flex-row items-center justify-between gap-6 max-w-2xl mx-auto">
                        <div className="text-center sm:text-left space-y-1">
                          <div className="w-32 border-b border-slate-400 pb-1 mx-auto sm:mx-0">
                            <span className="font-serif italic text-xs text-slate-700">General Manager</span>
                          </div>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Authorized Hospitality Director
                          </p>
                        </div>

                        {/* Digital Gold Seal */}
                        <div className="w-16 h-16 rounded-full border-2 border-dashed border-amber-500 bg-amber-50 flex flex-col items-center justify-center text-amber-700 shrink-0 shadow-xs">
                          <BadgeCheck className="h-6 w-6 text-amber-600" />
                          <span className="text-[7px] font-black uppercase tracking-tighter">VERIFIED</span>
                        </div>

                        <div className="text-center sm:text-right space-y-1">
                          <p className="text-[10px] font-mono font-bold text-slate-700">{certId}</p>
                          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">
                            Issued: {new Date().toLocaleDateString(undefined, { dateStyle: 'medium' })}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 2: DETAILED MONTHLY ATTENDANCE STATEMENT SLIP */}
            {certificateViewTab === 'statement' && (
              <div className="space-y-4">
                {(selectedCertStaffId === 'all'
                  ? staffMonthlyStats
                  : staffMonthlyStats.filter((s) => s.user.id === selectedCertStaffId)
                ).map((stats) => {
                  const staffRecords = attendanceList
                    .filter((a) => a.userId === stats.user.id && a.date.startsWith(selectedMonth))
                    .sort((x, y) => x.date.localeCompare(y.date));

                  return (
                    <div key={stats.user.id} className="p-6 bg-slate-50 rounded-2xl border border-slate-200 space-y-4">
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-200 gap-2">
                        <div>
                          <h3 className="font-bold text-slate-900 text-base">{stats.user.name}</h3>
                          <p className="text-xs text-slate-500">
                            Monthly Statement Slip • {stats.user.role} • {selectedMonth}
                          </p>
                        </div>
                        <div className="flex items-center gap-3 text-xs font-bold">
                          <span className="text-emerald-700 bg-emerald-100 px-2.5 py-1 rounded-lg">
                            {stats.totalPresent} Days Present
                          </span>
                          <span className="text-slate-800 bg-white border border-slate-200 px-2.5 py-1 rounded-lg">
                            {stats.totalHours} Total Hours
                          </span>
                        </div>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs bg-white rounded-xl border border-slate-200">
                          <thead>
                            <tr className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase">
                              <th className="py-2.5 px-3">Date</th>
                              <th className="py-2.5 px-3">Status</th>
                              <th className="py-2.5 px-3">Check In</th>
                              <th className="py-2.5 px-3">Check Out</th>
                              <th className="py-2.5 px-3 text-center">Hours</th>
                              <th className="py-2.5 px-3">Remarks / Exceptions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                            {staffRecords.map((r) => (
                              <tr key={r.date} className="hover:bg-slate-50/50">
                                <td className="py-2.5 px-3 font-mono font-semibold text-slate-700">{r.date}</td>
                                <td className="py-2.5 px-3">
                                  <span className="font-bold text-slate-800">{r.status}</span>
                                </td>
                                <td className="py-2.5 px-3 font-mono text-slate-600">{r.checkIn || '—'}</td>
                                <td className="py-2.5 px-3 font-mono text-slate-600">{r.checkOut || '—'}</td>
                                <td className="py-2.5 px-3 font-mono font-bold text-center text-slate-900">
                                  {r.workHours ? `${r.workHours}h` : '—'}
                                </td>
                                <td className="py-2.5 px-3 text-slate-700">{r.notes || '—'}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* TAB 3: MONTHLY STAFF LEADERBOARD & RANKING */}
            {certificateViewTab === 'leaderboard' && (
              <div className="space-y-4">
                <div className="p-4 bg-gradient-to-r from-amber-500/10 via-indigo-500/10 to-purple-500/10 rounded-2xl border border-amber-200/60 flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <Trophy className="h-6 w-6 text-amber-500" />
                    <div>
                      <h3 className="font-bold text-slate-900 text-sm">Monthly Attendance & Reliability Leaderboard</h3>
                      <p className="text-xs text-slate-500">Rankings based on total clocked hours, punctuality rating, and conduct for {selectedMonth}</p>
                    </div>
                  </div>
                  <span className="text-xs font-bold text-slate-700 bg-white px-3 py-1.5 rounded-xl border border-slate-200 shadow-2xs">
                    {staffMonthlyStats.length} Staff Evaluated
                  </span>
                </div>

                <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-100 text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                        <th className="py-3 px-4 text-center">Rank</th>
                        <th className="py-3 px-4">Staff Member</th>
                        <th className="py-3 px-4 text-center">Hours Clocked</th>
                        <th className="py-3 px-4 text-center">Days Present</th>
                        <th className="py-3 px-4 text-center">Punctuality Score</th>
                        <th className="py-3 px-4 text-center">Tier Award</th>
                        <th className="py-3 px-4 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-sans">
                      {staffMonthlyStats.map((item) => (
                        <tr key={item.user.id} className="hover:bg-slate-50 transition-colors">
                          <td className="py-3 px-4 text-center">
                            {item.rank === 1 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-500 text-white font-black text-xs shadow-xs">
                                🥇
                              </span>
                            ) : item.rank === 2 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-slate-300 text-slate-800 font-black text-xs shadow-xs">
                                🥈
                              </span>
                            ) : item.rank === 3 ? (
                              <span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-amber-700 text-white font-black text-xs shadow-xs">
                                🥉
                              </span>
                            ) : (
                              <span className="font-mono font-bold text-slate-500">#{item.rank}</span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="font-bold text-slate-900 block">{item.user.name}</span>
                            <span className="text-[10px] text-slate-400 capitalize">{item.user.role}</span>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-center text-slate-900">
                            {item.totalHours} hrs
                          </td>
                          <td className="py-3 px-4 text-center font-bold text-emerald-700">
                            {item.totalPresent}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span className="font-mono font-bold text-indigo-700 bg-indigo-50 border border-indigo-200 px-2 py-0.5 rounded-lg text-xs">
                              {item.punctualityScore}%
                            </span>
                          </td>
                          <td className="py-3 px-4 text-center">
                            <span
                              className={`px-2.5 py-1 rounded-lg text-[10px] font-bold ${
                                item.performanceTier === 'Platinum'
                                  ? 'bg-amber-100 text-amber-800 border border-amber-200'
                                  : item.performanceTier === 'Gold'
                                  ? 'bg-yellow-50 text-yellow-800 border border-yellow-200'
                                  : item.performanceTier === 'Silver'
                                  ? 'bg-slate-100 text-slate-700 border border-slate-200'
                                  : 'bg-rose-50 text-rose-700 border border-rose-200'
                              }`}
                            >
                              {item.performanceTier}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              type="button"
                              onClick={() => {
                                setSelectedCertStaffId(item.user.id);
                                setCertificateViewTab('certificate');
                              }}
                              className="px-2.5 py-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded-lg text-xs font-bold transition-colors cursor-pointer"
                            >
                              View Certificate
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
