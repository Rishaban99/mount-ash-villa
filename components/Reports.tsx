'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  FileDown,
  Calendar,
  Receipt,
  DollarSign,
  Award,
  CheckCircle2,
  Trash2,
  BarChart2,
  TrendingUp,
  TrendingDown,
  BookOpen,
  Lock,
  Unlock,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  Check,
  User,
  Wallet,
  Coins,
  ChevronDown,
  ChevronUp,
  Loader2,
  Sparkles,
  Layers,
  Percent,
  Activity,
  Image as ImageIcon,
  HelpCircle,
  X,
  FileText,
  AlertTriangle,
  Lightbulb,
  Zap,
} from 'lucide-react';
import { LoadingButton } from '@/components/loading-button';
import { useAuth } from '@/components/auth-provider';
import { ClosedMonth } from '@/lib/types';
import { apiFetch } from '@/lib/api';
import { toastCreated, toastDeleted, toastError } from '@/lib/crud-toast';
import { hasPermission } from '@/lib/permissions';

interface ReportDetails {
  date?: string;
  month?: string;
  revenue: number;
  foodRevenue: number;
  serviceCharge?: number;
  roomRevenue: number;
  billsCount: number;
  expenses?: number;
  netProfit?: number;
}




export const Reports: React.FC = () => {
  
  const [dailyData, setDailyData] = useState<ReportDetails[]>([]);
  const [monthlyData, setMonthlyData] = useState<ReportDetails[]>([]);
  const [completedBills, setCompletedBills] = useState<any[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { user: currentUser } = useAuth();

  // Daily Cashbook & Reports Core States
  const [activeTab, setActiveTab] = useState<'analytics' | 'cashbook'>('analytics');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [closedMonths, setClosedMonths] = useState<ClosedMonth[]>([]);
  const [cashbookMonth, setCashbookMonth] = useState<string>('all');
  const [settings, setSettings] = useState<any>(null);
  
  // Selection states for Month-End Closer Form
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mon}`;
  });
  const [ownerTakeaway, setOwnerTakeaway] = useState<number>(0);
  const [closerNotes, setCloserNotes] = useState<string>('');
  const [closingLoading, setClosingLoading] = useState<boolean>(false);
  const [deletingBillId, setDeletingBillId] = useState<string | null>(null);
  const [deletingMonthId, setDeletingMonthId] = useState<string | null>(null);

  // Folding accordions for daily cashbook listing
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Chart Interactive State Managers
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [activeSeries, setActiveSeries] = useState<'revenue' | 'roomRevenue' | 'foodRevenue' | 'serviceCharge' | 'expenses' | 'netProfit' | 'all'>('revenue');
  const [chartRange, setChartRange] = useState<number>(30);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  // AI Settlement Intelligence State
  const [aiModalOpen, setAiModalOpen] = useState<boolean>(false);
  const [aiLoading, setAiLoading] = useState<boolean>(false);
  const [aiInsights, setAiInsights] = useState<any>(null);
  const [aiError, setAiError] = useState<string | null>(null);

  const fetchReports = async () => {
    try {
      const [reportsRes, billsRes, expensesRes, closedRes] = await Promise.all([
        fetch('/api/reports'),
        fetch('/api/bills'),
        fetch('/api/expenses'),
        fetch('/api/closed-months')
      ]);

      if (reportsRes.ok) {
        const data = await reportsRes.json();
        setDailyData(data.dailySummary || []);
        setMonthlyData(data.monthlySummary || []);
      }

      if (billsRes.ok) {
        const billsData = await billsRes.json();
        setCompletedBills(billsData.filter((b: any) => b.status === 'Completed'));
      }

      if (expensesRes && expensesRes.ok) {
        const expensesData = await expensesRes.json();
        setExpenses(expensesData);
      }

      if (closedRes && closedRes.ok) {
        const closedData = await closedRes.json();
        setClosedMonths(closedData);
      }
    } catch (e) {
      console.error('Failed to load report analytics:', e);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteBill = async (billId: string) => {
    setDeletingBillId(billId);
    try {
      const res = await apiFetch(`/api/bills/${billId}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toastDeleted('Bill');
        setDeleteConfirmId(null);
        fetchReports();
      } else {
        toastError(data.error || 'Failed to delete bill.');
      }
    } catch (error: any) {
      toastError(error.message || 'Failed to delete bill.');
    } finally {
      setDeletingBillId(null);
    }
  };

  // Dynamically calculate metrics for Selected Month in Month-End Closer
  const getSelectedMonthMetrics = () => {
    const filteredBillsInMonth = completedBills.filter(b => {
      const dateStr = b.updatedAt || b.createdAt;
      if (!dateStr) return false;
      return dateStr.startsWith(selectedMonth);
    });

    const filteredExpensesInMonth = expenses.filter(e => {
      return e.date && e.date.startsWith(selectedMonth);
    });

    const totalRev = filteredBillsInMonth.reduce((sum, b) => sum + (b.totalAmount || 0), 0);
    const roomRev = filteredBillsInMonth.reduce((sum, b) => sum + (b.roomSubtotal || 0), 0);
    const foodRev = filteredBillsInMonth.reduce((sum, b) => sum + (b.foodSubtotal || 0), 0);
    const scRev = filteredBillsInMonth.reduce((sum, b) => sum + (b.serviceCharge || 0), 0);
    
    const totalExp = filteredExpensesInMonth.reduce((sum, e) => sum + (e.amount || 0), 0);
    const netProf = totalRev - totalExp;

    return {
      filteredBills: filteredBillsInMonth,
      filteredExpenses: filteredExpensesInMonth,
      totalRevenue: totalRev,
      roomRevenue: roomRev,
      foodRevenue: foodRev,
      serviceCharge: scRev,
      totalExpenses: totalExp,
      netProfit: netProf
    };
  };

  const monthMetrics = getSelectedMonthMetrics();
  
  // Set default owner takeaway value as calculated net profit
  useEffect(() => {
    if (monthMetrics.netProfit > 0) {
      setOwnerTakeaway(monthMetrics.netProfit);
    } else {
      setOwnerTakeaway(0);
    }
  }, [selectedMonth, completedBills.length, expenses.length]);

  const handleCloseMonth = async (e: React.FormEvent) => {
    e.preventDefault();

    const alreadyClosed = closedMonths.some(m => m.month === selectedMonth);
    if (alreadyClosed) {
      toastError('This month has already been closed and verified!');
      return;
    }

    const { totalRevenue, totalExpenses, netProfit } = getSelectedMonthMetrics();

    const payload: Partial<ClosedMonth> = {
      month: selectedMonth,
      totalRevenue,
      totalExpenses,
      netProfit,
      ownerTakeaway: Number(ownerTakeaway),
      retainedEarnings: netProfit - Number(ownerTakeaway),
      closedAt: new Date().toISOString(),
      closedBy: 'Owner / Administrator',
      notes: closerNotes.trim() || undefined
    };

    setClosingLoading(true);
    try {
      const res = await apiFetch('/api/closed-months', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        toastCreated('Month closure');
        setCloserNotes('');
        const closedRes = await fetch('/api/closed-months');
        if (closedRes.ok) {
          const list = await closedRes.json();
          setClosedMonths(list);
        }
      } else {
        const errData = await res.json();
        toastError(errData.error || 'Failed to complete month-end closer');
      }
    } catch (err: any) {
      toastError(err.message || 'Network error occurred while closing the month.');
    } finally {
      setClosingLoading(false);
    }
  };

  const handleDeleteClosedMonth = async (id: string) => {
    setDeletingMonthId(id);
    try {
      const res = await apiFetch(`/api/closed-months/${id}`, {
        method: 'DELETE'
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) {
        toastDeleted('Month closure');
        setClosedMonths(closedMonths.filter(m => m.id !== id));
      } else {
        toastError(data.error || 'Failed to reopen month');
      }
    } catch (err: any) {
      toastError(err.message || 'Failed to reopen month');
    } finally {
      setDeletingMonthId(null);
    }
  };


  useEffect(() => {
    fetchReports();
  }, []);


  const canDeleteSettledBills = hasPermission(currentUser.role, 'allowManagerDeleteSettledBills', settings);


  // Compute total aggregates
  const totalRevenue = monthlyData.reduce((acc, item) => acc + item.revenue, 0);
  const totalFoodSales = monthlyData.reduce((acc, item) => acc + item.foodRevenue, 0);
  const totalServiceCharge = monthlyData.reduce((acc, item) => acc + (item.serviceCharge || 0), 0);
  const totalRoomRevenue = monthlyData.reduce((acc, item) => acc + item.roomRevenue, 0);
  const totalBillsCheckedOut = monthlyData.reduce((acc, item) => acc + item.billsCount, 0);

  // Compute current month aggregates
  const curMonthStr = (() => {
    const d = new Date();
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mon}`;
  })();
  const selectedMonthData = monthlyData.find(m => m.month === selectedMonth);
  const thisMonthRevenue = selectedMonthData ? selectedMonthData.revenue : 0;
  const thisMonthRoomRevenue = selectedMonthData ? selectedMonthData.roomRevenue : 0;
  const thisMonthFoodSales = selectedMonthData ? selectedMonthData.foodRevenue : 0;
  const thisMonthServiceCharge = selectedMonthData ? (selectedMonthData.serviceCharge || 0) : 0;
  const thisMonthBills = selectedMonthData ? selectedMonthData.billsCount : 0;
  const curMonthLabel = selectedMonth
    ? new Date(`${selectedMonth}-01`).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })
    : new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

  // Daily Cashbook aggregate listings and math
  const getDailyCashbookData = () => {
    const cashbookMap: Record<string, {
      date: string;
      inflow: number;
      outflow: number;
      balance: number;
      bills: any[];
      expenses: any[];
    }> = {};

    completedBills.forEach(b => {
      const dateStr = b.updatedAt || b.createdAt;
      if (!dateStr) return;
      const day = dateStr.split('T')[0];
      if (!cashbookMap[day]) {
        cashbookMap[day] = { date: day, inflow: 0, outflow: 0, balance: 0, bills: [], expenses: [] };
      }
      cashbookMap[day].inflow += b.totalAmount || 0;
      cashbookMap[day].bills.push(b);
    });

    expenses.forEach(e => {
      if (!e.date) return;
      const day = e.date.split('T')[0];
      if (!cashbookMap[day]) {
        cashbookMap[day] = { date: day, inflow: 0, outflow: 0, balance: 0, bills: [], expenses: [] };
      }
      cashbookMap[day].outflow += e.amount || 0;
      cashbookMap[day].expenses.push(e);
    });

    return Object.values(cashbookMap).map(day => {
      day.balance = day.inflow - day.outflow;
      return day;
    }).sort((a, b) => b.date.localeCompare(a.date));
  };

  const cashbookDays = getDailyCashbookData();

  const getAvailableMonths = () => {
    const monthsSet = new Set<string>();
    completedBills.forEach(b => {
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
    // Add current month in case it's empty
    const d = new Date();
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    monthsSet.add(`${d.getFullYear()}-${mon}`);

    return Array.from(monthsSet).sort().reverse();
  };

  const filteredCashbookBills = cashbookMonth === 'all'
    ? completedBills
    : completedBills.filter(b => (b.updatedAt || b.createdAt || '').startsWith(cashbookMonth));

  const filteredCashbookExpenses = cashbookMonth === 'all'
    ? expenses
    : expenses.filter(e => (e.date || '').startsWith(cashbookMonth));

  const cbTotalInflow = completedBills.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const cbTotalOutflow = expenses.reduce((s, e) => s + (e.amount || 0), 0);
  const cbNetBalance = cbTotalInflow - cbTotalOutflow;

  const cbTotalInflowFiltered = filteredCashbookBills.reduce((s, b) => s + (b.totalAmount || 0), 0);
  const cbTotalOutflowFiltered = filteredCashbookExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const cbNetBalanceFiltered = cbTotalInflowFiltered - cbTotalOutflowFiltered;

  const filteredCompletedBills = completedBills.filter(b => {
    const dateStr = b.updatedAt || b.createdAt || '';
    return dateStr.startsWith(selectedMonth);
  });

  const cashbookDaysFiltered = cashbookDays.filter(day => {
    if (cashbookMonth === 'all') return true;
    return day.date.startsWith(cashbookMonth);
  });

  // CSV Export for Daily Report
  const exportDailyCSV = () => {
    const headers = ['Date', 'Total Revenue (Rs.)', 'Room Revenue (Rs.)', 'Food Revenue (Rs.)', 'Service Charge (Rs.)', 'Expenses (Rs.)', 'Net Profit (Rs.)', 'Invoices Settled'];
    const rows = enrichedDailyAnalytics.map(item => [
      item.date,
      item.revenue,
      item.roomRevenue,
      item.foodRevenue,
      item.serviceCharge || 0,
      item.expenses || 0,
      item.netProfit || 0,
      item.billsCount
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Daily_Revenue_Report_${selectedMonth || new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export for Monthly Report
  const exportMonthlyCSV = () => {
    const headers = ['Month', 'Total Revenue (Rs.)', 'Room Revenue (Rs.)', 'Food Revenue (Rs.)', 'Service Charge (Rs.)', 'Completed Billings'];
    const rows = filteredMonthlyAnalytics.map(item => [
      item.month,
      item.revenue,
      item.roomRevenue,
      item.foodRevenue,
      item.serviceCharge || 0,
      item.billsCount
    ]);

    const csvContent = "data:text/csv;charset=utf-8," 
      + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `Monthly_Revenue_Summary_${new Date().getFullYear()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const exportCashbookCSV = () => {
    const headers = ['Date', 'Type', 'Description', 'Amount (Rs.)', 'Net Balance (Rs.)'];

    const rows: Array<Array<string | number>> = [];

    cashbookDaysFiltered.forEach((day) => {
      const date = day.date || '';

      // Summary row for the day
      rows.push([
        date,
        'Summary',
        `Invoices: ${day.bills?.length || 0} | Expenses: ${day.expenses?.length || 0}`,
        (day.inflow || 0) - (day.outflow || 0),
        day.balance ?? ''
      ]);

      // Individual invoices (credits)
      (day.bills || []).forEach((b: any) => {
        const desc = `Invoice #${b.id}${b.guestDetails?.name ? ` - ${b.guestDetails.name}` : ''}`;
        rows.push([date, 'Invoice', desc, b.totalAmount || 0, '']);
      });

      // Individual expenses (debits)
      (day.expenses || []).forEach((e: any) => {
        const desc = e.description || e.note || e.title || `Expense ${e.id || ''}`;
        rows.push([date, 'Expense', desc, -(e.amount || 0), '']);
      });
    });

    // Escape and join CSV lines (wrap fields in quotes and escape inner quotes)
    const escapeField = (v: any) => `"${String(v ?? '').replace(/"/g, '""')}"`;
    const csvLines = [headers.join(','), ...rows.map(r => r.map(escapeField).join(','))].join('\n');
    const csvContent = 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvLines);

    const link = document.createElement('a');
    link.setAttribute('href', csvContent);
    link.setAttribute('download', `Chronological_Cash_Register_${cashbookMonth || 'all'}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handlePrintPDFSummary = () => {
    window.print();
  };

  const dailyExpensesMap = React.useMemo(() => {
    const map: Record<string, number> = {};
    (expenses || []).forEach((e: any) => {
      if (e.date) {
        map[e.date] = (map[e.date] || 0) + (e.amount || 0);
      }
    });
    return map;
  }, [expenses]);

  const formatAxisDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length < 3) return dateStr;
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthIdx = parseInt(parts[1], 10) - 1;
    const day = parts[2];
    return `${monthNames[monthIdx] || parts[1]} ${day}`;
  };

  const formatFullDate = (dateStr?: string) => {
    if (!dateStr) return '';
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const dateObj = new Date(y, m - 1, d);
    return dateObj.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric' });
  };

  // Complete contiguous calendar day sequence (including 0 revenue days e.g. Aug 06, 10, 11, 12, 17)
  const enrichedDailyAnalytics = React.useMemo(() => {
    if (!selectedMonth) return [];

    const dailyMap = new Map<string, ReportDetails>();
    (dailyData || []).forEach((d) => {
      if (d.date) dailyMap.set(d.date, d);
    });

    const [yearStr, monthStr] = selectedMonth.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);
    if (!year || !month) return [];

    const daysInMonth = new Date(year, month, 0).getDate();

    const now = new Date();
    const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    const isCurrentMonth = selectedMonth === currentMonthStr;

    let maxRecordedDay = 0;
    (dailyData || []).forEach((d) => {
      if (d.date && d.date.startsWith(selectedMonth)) {
        const dayNum = parseInt(d.date.split('-')[2], 10);
        if (dayNum > maxRecordedDay) maxRecordedDay = dayNum;
      }
    });
    (expenses || []).forEach((e) => {
      if (e.date && e.date.startsWith(selectedMonth)) {
        const dayNum = parseInt(e.date.split('-')[2], 10);
        if (dayNum > maxRecordedDay) maxRecordedDay = dayNum;
      }
    });

    const endDay = isCurrentMonth
      ? Math.min(daysInMonth, Math.max(now.getDate(), maxRecordedDay, 1))
      : daysInMonth;

    const result: ReportDetails[] = [];
    for (let day = 1; day <= endDay; day++) {
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${selectedMonth}-${dayStr}`;
      const existing = dailyMap.get(dateKey);
      const exp = dailyExpensesMap[dateKey] || 0;

      if (existing) {
        result.push({
          date: dateKey,
          revenue: existing.revenue,
          roomRevenue: existing.roomRevenue,
          foodRevenue: existing.foodRevenue,
          serviceCharge: existing.serviceCharge || 0,
          billsCount: existing.billsCount,
          expenses: exp,
          netProfit: existing.revenue - exp,
        });
      } else {
        // Zero-revenue day representation
        result.push({
          date: dateKey,
          revenue: 0,
          roomRevenue: 0,
          foodRevenue: 0,
          serviceCharge: 0,
          billsCount: 0,
          expenses: exp,
          netProfit: 0 - exp,
        });
      }
    }

    return result;
  }, [selectedMonth, dailyData, dailyExpensesMap, expenses]);

  const filteredMonthlyAnalytics = monthlyData.filter((m) => m.month === selectedMonth);

  const maxVal = Math.max(...enrichedDailyAnalytics.map(d => d.revenue), 1);

  // Chronological Left-to-Right data window (oldest on left -> newest on right)
  const chartData = React.useMemo(() => {
    if (chartRange === 0 || chartRange >= enrichedDailyAnalytics.length) {
      return enrichedDailyAnalytics;
    }
    return enrichedDailyAnalytics.slice(-chartRange);
  }, [enrichedDailyAnalytics, chartRange]);

  // Executive Range Performance Statistics
  const rangeStats = React.useMemo(() => {
    if (chartData.length === 0) {
      return {
        totalRevenue: 0,
        totalExpenses: 0,
        netProfit: 0,
        roomRevenue: 0,
        foodRevenue: 0,
        serviceCharge: 0,
        totalBills: 0,
        avgDailyRevenue: 0,
        peakDay: null as { date: string; amount: number } | null,
        marginPct: 0,
      };
    }

    let totalRevenue = 0;
    let totalExpenses = 0;
    let roomRevenue = 0;
    let foodRevenue = 0;
    let serviceCharge = 0;
    let totalBills = 0;
    let peakDay: { date: string; amount: number } | null = null;

    chartData.forEach((d) => {
      totalRevenue += d.revenue;
      totalExpenses += (d.expenses || 0);
      roomRevenue += d.roomRevenue;
      foodRevenue += d.foodRevenue;
      serviceCharge += (d.serviceCharge || 0);
      totalBills += d.billsCount;

      if (!peakDay || d.revenue > peakDay.amount) {
        peakDay = { date: d.date || '', amount: d.revenue };
      }
    });

    const netProfit = totalRevenue - totalExpenses;
    const avgDailyRevenue = chartData.length > 0 ? totalRevenue / chartData.length : 0;
    const marginPct = totalRevenue > 0 ? Math.round((netProfit / totalRevenue) * 100) : 0;

    return {
      totalRevenue,
      totalExpenses,
      netProfit,
      roomRevenue,
      foodRevenue,
      serviceCharge,
      totalBills,
      avgDailyRevenue,
      peakDay,
      marginPct,
    };
  }, [chartData]);

  // SVG Smooth Bezier curve generator (Catmull-Rom spline approximation)
  const getSvgSmoothPath = (pts: { x: number; y: number }[]): string => {
    if (pts.length === 0) return '';
    if (pts.length === 1) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    if (pts.length === 2) return `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)} L ${pts[1].x.toFixed(1)} ${pts[1].y.toFixed(1)}`;

    let path = `M ${pts[0].x.toFixed(1)} ${pts[0].y.toFixed(1)}`;
    for (let i = 0; i < pts.length - 1; i++) {
      const p0 = i > 0 ? pts[i - 1] : pts[i];
      const p1 = pts[i];
      const p2 = pts[i + 1];
      const p3 = i < pts.length - 2 ? pts[i + 2] : p2;

      const cp1x = p1.x + (p2.x - p0.x) / 6;
      const cp1y = p1.y + (p2.y - p0.y) / 6;
      const cp2x = p2.x - (p3.x - p1.x) / 6;
      const cp2y = p2.y - (p3.y - p1.y) / 6;

      path += ` C ${cp1x.toFixed(1)} ${cp1y.toFixed(1)}, ${cp2x.toFixed(1)} ${cp2y.toFixed(1)}, ${p2.x.toFixed(1)} ${p2.y.toFixed(1)}`;
    }
    return path;
  };

  const maxSeriesValue = Math.max(
    ...chartData.map((d) => {
      if (activeSeries === 'revenue') return d.revenue;
      if (activeSeries === 'roomRevenue') return d.roomRevenue;
      if (activeSeries === 'foodRevenue') return d.foodRevenue;
      if (activeSeries === 'serviceCharge') return d.serviceCharge || 0;
      if (activeSeries === 'expenses') return d.expenses || 0;
      if (activeSeries === 'netProfit') return Math.max(0, d.netProfit || 0);
      return Math.max(d.revenue, d.roomRevenue, d.foodRevenue, d.expenses || 0);
    }),
    1000
  );

  const svgWidth = 1000;
  const svgHeight = 280;
  const paddingLeft = 70;
  const paddingRight = 30;
  const paddingTop = 28;
  const paddingBottom = 46;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Single series coordinate points
  const points = chartData.map((day, i) => {
    const x = paddingLeft + (chartData.length > 1 ? (i / (chartData.length - 1)) * chartWidth : chartWidth / 2);
    const value =
      activeSeries === 'revenue' ? day.revenue :
      activeSeries === 'roomRevenue' ? day.roomRevenue :
      activeSeries === 'foodRevenue' ? day.foodRevenue :
      activeSeries === 'serviceCharge' ? (day.serviceCharge || 0) :
      activeSeries === 'expenses' ? (day.expenses || 0) :
      activeSeries === 'netProfit' ? (day.netProfit || 0) :
      day.revenue;
    const y = paddingTop + chartHeight - (Math.max(0, value) / maxSeriesValue) * chartHeight;
    return { x, y, value, raw: day, index: i };
  });

  // Multi-Series curves for 'all' mode
  const multiSeries = React.useMemo(() => {
    if (activeSeries !== 'all' || chartData.length === 0) return null;
    const getPts = (getVal: (d: any) => number) => {
      return chartData.map((day, i) => {
        const x = paddingLeft + (chartData.length > 1 ? (i / (chartData.length - 1)) * chartWidth : chartWidth / 2);
        const val = Math.max(0, getVal(day));
        const y = paddingTop + chartHeight - (val / maxSeriesValue) * chartHeight;
        return { x, y, value: val, raw: day, index: i };
      });
    };
    const revPts = getPts((d) => d.revenue);
    const roomPts = getPts((d) => d.roomRevenue);
    const foodPts = getPts((d) => d.foodRevenue);
    const expPts = getPts((d) => d.expenses || 0);

    return {
      revPts,
      roomPts,
      foodPts,
      expPts,
      revPath: getSvgSmoothPath(revPts),
      roomPath: getSvgSmoothPath(roomPts),
      foodPath: getSvgSmoothPath(foodPts),
      expPath: getSvgSmoothPath(expPts),
    };
  }, [activeSeries, chartData, chartWidth, chartHeight, maxSeriesValue, paddingLeft, paddingTop]);

  const seriesColor =
    activeSeries === 'revenue' ? '#4f46e5' :
    activeSeries === 'roomRevenue' ? '#10b981' :
    activeSeries === 'foodRevenue' ? '#f59e0b' :
    activeSeries === 'serviceCharge' ? '#a855f7' :
    activeSeries === 'expenses' ? '#f43f5e' :
    activeSeries === 'netProfit' ? '#06b6d4' : '#4f46e5';

  const singleLinePath = points.length > 0 ? getSvgSmoothPath(points) : '';
  const singleAreaPath = points.length > 0
    ? `${singleLinePath} L ${points[points.length - 1].x.toFixed(1)} ${paddingTop + chartHeight} L ${points[0].x.toFixed(1)} ${paddingTop + chartHeight} Z`
    : '';

  const hoveredPt = hoveredIdx !== null && points[hoveredIdx] ? points[hoveredIdx] : null;
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

  // Daily Average Benchmark Line
  const avgRevenueVal = rangeStats.avgDailyRevenue;
  const avgLineY = paddingTop + chartHeight - (Math.max(0, avgRevenueVal) / maxSeriesValue) * chartHeight;

  // Chart Image Snapshot Export
  const exportChartPNG = () => {
    const svgEl = document.getElementById('daily-settlement-svg') as unknown as SVGSVGElement | null;
    if (!svgEl) return;
    try {
      const svgString = new XMLSerializer().serializeToString(svgEl);
      const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
      const url = URL.createObjectURL(svgBlob);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = (svgEl.clientWidth || 720) * 2;
        canvas.height = (svgEl.clientHeight || 260) * 2;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = '#ffffff';
          ctx.fillRect(0, 0, canvas.width, canvas.height);
          ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
          const pngUrl = canvas.toDataURL('image/png');
          const dlLink = document.createElement('a');
          dlLink.download = `Settlement_Telemetry_${selectedMonth}_${chartRange}D.png`;
          dlLink.href = pngUrl;
          dlLink.click();
        }
        URL.revokeObjectURL(url);
      };
      img.src = url;
    } catch (e) {
      console.error('Failed to export chart PNG', e);
    }
  };

  // AI Insights Briefing Handler
  const handleFetchAiInsights = async () => {
    setAiModalOpen(true);
    setAiLoading(true);
    setAiError(null);
    try {
      const res = await apiFetch('/api/reports/ai-insights', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: selectedMonth,
          rangeDays: chartRange,
          periodSummary: rangeStats,
          dailyData: chartData,
        }),
      });
      if (res.ok) {
        const json = await res.json();
        setAiInsights(json.data);
      } else {
        const err = await res.json().catch(() => ({}));
        setAiError(err.error || 'Failed to generate AI insights.');
      }
    } catch (err: any) {
      setAiError(err.message || 'Network error fetching AI insights.');
    } finally {
      setAiLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 no-print border-b border-slate-100 pb-2">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
            <Award className="h-6 w-6 text-indigo-600" />
            Financial Audit & Analytics Reports
          </h1>
          <p className="text-sm text-slate-500">
            Overview of cash receipts, room revenues, daily cashbook ledger, and month-end period closes
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handlePrintPDFSummary}
            className="flex items-center gap-2 py-2 px-3.5 bg-slate-100 hover:bg-slate-200 text-slate-705 rounded-xl text-xs font-bold transition-all"
          >
            <FileDown className="h-4 w-4" />
            Print PDF Summary
          </button>
        </div>

      </div>


      <div className="overflow-x-auto pb-2 no-print">
        <div className="flex items-center justify-between gap-2 py-2 px-1 w-full">
          <button
            type="button"
            className="inline-flex items-center gap-2 min-w-[180px] h-10 px-3 py-1.5 bg-white rounded-2xl border border-slate-200 text-slate-700 font-bold text-xs shadow-sm transition-all hover:border-slate-300"
          >
            <Calendar className="h-4 w-4 text-indigo-500" />
            {selectedMonth ? new Date(`${selectedMonth}-01`).toLocaleDateString(undefined, { month: 'short', year: 'numeric' }) : 'Select Month'}
          </button>

          <div className="flex gap-2 overflow-x-auto">
            {getAvailableMonths().map(m => {
              const [year, month] = m.split('-');
              const dateObj = new Date(Number(year), Number(month) - 1, 15);
              const monthName = dateObj.toLocaleDateString(undefined, { month: 'short' });
              const isSelected = selectedMonth === m;

              return (
                <button
                  key={m}
                  type="button"
                  onClick={() => {
                    setSelectedMonth(m);
                    setCashbookMonth(m);
                  }}
                  className={`relative min-w-[88px] h-10 px-3 py-1.5 bg-white rounded-2xl border transition-all text-left group cursor-pointer shrink-0 focus:outline-none focus:ring-2 focus:ring-indigo-500/10 ${
                    isSelected
                      ? 'border-indigo-500 bg-indigo-50/70 shadow-xs'
                      : 'border-slate-200/60 hover:border-slate-300'
                  }`}
                >
                  <span className="block text-[8px] font-bold text-slate-400 uppercase tracking-wider leading-none">{year}</span>
                  <span className="block text-[11px] font-bold text-slate-700 mt-0.5">{monthName}</span>
                  <div className={`absolute bottom-0 left-3 right-3 h-[2px] rounded-t-full transition-all duration-300 ${
                    isSelected ? 'bg-indigo-600 scale-x-100' : 'bg-transparent scale-x-0 group-hover:bg-slate-200 group-hover:scale-x-50'
                  }`} />
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      {!loading && (
        <div className="flex flex-wrap border-b border-slate-200 gap-1 no-print">
          <button
            type="button"
            onClick={() => setActiveTab('analytics')}
            className={`pb-3 px-5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer border-x-0 border-t-0 bg-transparent ${
              activeTab === 'analytics'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BarChart2 className="h-4 w-4" />
            Revenue Analytics & Charts
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('cashbook')}
            className={`pb-3 px-5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer border-x-0 border-t-0 bg-transparent ${
              activeTab === 'cashbook'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            Daily Cashbook Ledger
          </button>
        </div>
      )}

      {loading ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-100">
          <p className="text-slate-400 text-sm">Loading statistical registers...</p>
        </div>
      ) : (
        <div className="space-y-6">
          {activeTab === 'analytics' && (
            <>
              {/* Aggregate stats cards */}
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
                
                <div className="bg-white p-5 rounded-2xl border border-indigo-200 bg-indigo-50/5 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 left-0 h-1 w-full bg-indigo-500"></div>
                  <p className="text-[11px] font-bold text-indigo-650 uppercase tracking-widest font-sans font-semibold">This Month's Revenue</p>
                  <p className="text-2xl font-display font-bold text-slate-900 mt-2">Rs. {thisMonthRevenue.toLocaleString()}</p>
                  <div className="text-[10px] text-indigo-500 mt-1 font-medium">{curMonthLabel}</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden">
                  <div className="absolute top-0 left-0 h-1 w-full bg-emerald-500"></div>
                  <p className="text-[11px] font-bold text-emerald-650 uppercase tracking-widest font-sans font-semibold">Room Revenue</p>
                  <p className="text-2xl font-display font-bold text-slate-800 mt-2">Rs. {thisMonthRoomRevenue.toLocaleString()}</p>
                  <div className="text-[10px] text-slate-400 mt-1">This month's stay revenue</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs font-semibold relative overflow-hidden">
                  <div className="absolute top-0 left-0 h-1 w-full bg-amber-500"></div>
                  <p className="text-[11px] font-bold text-amber-650 uppercase tracking-widest font-sans font-semibold">Food Sales</p>
                  <p className="text-2xl font-display font-bold text-slate-800 mt-2">Rs. {thisMonthFoodSales.toLocaleString()}</p>
                  <div className="text-[10px] text-slate-400 mt-1">This month's dining/orders</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs font-semibold font-sans relative overflow-hidden">
                  <div className="absolute top-0 left-0 h-1 w-full bg-purple-500"></div>
                  <p className="text-[11px] font-bold text-purple-650 uppercase tracking-widest font-serif font-semibold">Service Charge</p>
                  <p className="text-2xl font-display font-bold text-slate-800 mt-2">Rs. {thisMonthServiceCharge.toLocaleString()}</p>
                  <div className="text-[10px] text-slate-400 mt-1">This month's 10% fee charges</div>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs col-span-2 lg:col-span-1 font-semibold relative overflow-hidden">
                  <div className="absolute top-0 left-0 h-1 w-full bg-slate-400"></div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest font-sans font-semibold">Checkout Volume</p>
                  <p className="text-2xl font-display font-bold text-slate-800 mt-2">{thisMonthBills} Bills</p>
                  <div className="text-[10px] text-slate-400 mt-1">This month's settled checkouts</div>
                </div>

              </div>

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          
          {/* DAILY CHART & DATA LISTING (Full Width 12 columns) */}
          <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-5">
            
            {/* CARD TOP HEADER */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-100 gap-2 no-print">
              <div>
                <h3 className="font-display font-bold text-slate-900 flex items-center gap-2 text-base">
                  <Calendar className="h-4.5 w-4.5 text-indigo-600" />
                  Daily Settlement Telemetry & Trends
                </h3>
                <p className="text-[11px] text-slate-400">Chronological daily receipts, F&B orders, and net operational yield</p>
              </div>

              <div className="flex items-center gap-2">
                {/* AI Executive Briefing Trigger Button */}
                <button
                  type="button"
                  onClick={handleFetchAiInsights}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 hover:from-indigo-700 hover:to-purple-800 text-white rounded-xl text-xs font-bold shadow-xs hover:shadow-md transition-all cursor-pointer"
                >
                  <Sparkles className="h-3.5 w-3.5 text-amber-300 animate-pulse" />
                  AI Insights
                </button>

                {/* PNG Chart Snapshot Button */}
                <button
                  type="button"
                  onClick={exportChartPNG}
                  title="Export Chart as PNG Image"
                  className="p-1.5 bg-slate-50 hover:bg-slate-100 text-slate-600 border border-slate-200 rounded-xl text-xs font-semibold transition-all cursor-pointer flex items-center gap-1"
                >
                  <ImageIcon className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden md:inline text-[11px]">PNG</span>
                </button>

                {/* CSV Export Button */}
                <button
                  type="button"
                  onClick={exportDailyCSV}
                  className="p-1.5 px-2.5 bg-slate-50 hover:bg-indigo-50 text-indigo-600 border border-indigo-100 rounded-xl text-[11px] font-bold transition-all cursor-pointer flex items-center gap-1"
                >
                  <FileSpreadsheet className="h-3.5 w-3.5" />
                  CSV
                </button>
              </div>
            </div>

            {/* EXECUTIVE MINI STAT CARDS ROW */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 no-print">
              <div className="p-3 bg-indigo-50/40 rounded-xl border border-indigo-100/60 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-wider">Settled Total</span>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-1">Rs. {rangeStats.totalRevenue.toLocaleString()}</span>
                <span className="text-[10px] text-slate-400 mt-0.5">{rangeStats.totalBills} folios settled</span>
              </div>

              <div className="p-3 bg-emerald-50/40 rounded-xl border border-emerald-100/60 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-emerald-600 uppercase tracking-wider">Daily Average</span>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-1">Rs. {Math.round(rangeStats.avgDailyRevenue).toLocaleString()}</span>
                <span className="text-[10px] text-emerald-600/90 mt-0.5">per active day</span>
              </div>

              <div className="p-3 bg-amber-50/40 rounded-xl border border-amber-100/60 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-amber-600 uppercase tracking-wider">Peak Record</span>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-1">
                  {rangeStats.peakDay ? `Rs. ${rangeStats.peakDay.amount.toLocaleString()}` : 'Rs. 0'}
                </span>
                <span className="text-[10px] text-slate-400 mt-0.5">
                  {rangeStats.peakDay ? formatAxisDate(rangeStats.peakDay.date) : 'N/A'}
                </span>
              </div>

              <div className="p-3 bg-purple-50/40 rounded-xl border border-purple-100/60 flex flex-col justify-between">
                <span className="text-[10px] font-bold text-purple-600 uppercase tracking-wider">Net Profit & Yield</span>
                <span className="text-sm sm:text-base font-extrabold text-slate-900 mt-1">Rs. {rangeStats.netProfit.toLocaleString()}</span>
                <span className="text-[10px] font-semibold text-purple-700 mt-0.5">{rangeStats.marginPct}% profit margin</span>
              </div>
            </div>

            {/* INTERACTIVE CONTROLS ROW */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col lg:flex-row justify-between gap-3 no-print">
              {/* Metric Selectors */}
              <div className="flex flex-wrap items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setActiveSeries('revenue')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    activeSeries === 'revenue'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${activeSeries === 'revenue' ? 'bg-white' : 'bg-indigo-500'}`} />
                    Total Revenue
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSeries('roomRevenue')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    activeSeries === 'roomRevenue'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${activeSeries === 'roomRevenue' ? 'bg-white' : 'bg-emerald-500'}`} />
                    Rooms
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSeries('foodRevenue')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    activeSeries === 'foodRevenue'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${activeSeries === 'foodRevenue' ? 'bg-white' : 'bg-amber-500'}`} />
                    Food Sales
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSeries('serviceCharge')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    activeSeries === 'serviceCharge'
                      ? 'bg-purple-600 text-white border-purple-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${activeSeries === 'serviceCharge' ? 'bg-white' : 'bg-purple-500'}`} />
                    S.C.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSeries('expenses')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    activeSeries === 'expenses'
                      ? 'bg-rose-600 text-white border-rose-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${activeSeries === 'expenses' ? 'bg-white' : 'bg-rose-500'}`} />
                    Expenses
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSeries('netProfit')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    activeSeries === 'netProfit'
                      ? 'bg-cyan-600 text-white border-cyan-600 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${activeSeries === 'netProfit' ? 'bg-white' : 'bg-cyan-500'}`} />
                    Net Profit
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSeries('all')}
                  className={`px-2.5 py-1.5 rounded-lg text-[11px] font-bold border transition-all cursor-pointer ${
                    activeSeries === 'all'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <Layers className="h-3 w-3" />
                    Multi-Series
                  </span>
                </button>
              </div>

              {/* View options */}
              <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                {/* Type toggle */}
                <div className="flex bg-white rounded-lg border border-slate-200 p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setChartType('area')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      chartType === 'area'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <TrendingUp className="h-3 w-3" />
                    Trend
                  </button>
                  <button
                    type="button"
                    onClick={() => setChartType('bar')}
                    className={`px-2.5 py-1 text-[10px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
                      chartType === 'bar'
                        ? 'bg-indigo-50 text-indigo-700'
                        : 'text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <BarChart2 className="h-3 w-3" />
                    Bar
                  </button>
                </div>
              </div>
            </div>

            {/* DYNAMIC INTERACTIVE CHART MODULE */}
            {chartData.length > 0 ? (
              <div className="relative p-5 bg-gradient-to-b from-slate-50/30 to-white rounded-2xl border border-slate-100 no-print">
                
                {/* Floating telemetry details card on hover */}
                {hoveredPt ? (
                  <div className="absolute top-3 right-4 bg-slate-900/95 backdrop-blur-md text-white p-3 rounded-xl shadow-xl border border-slate-800 flex items-center gap-3.5 animate-fade-in z-20">
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Date</p>
                      <p className="font-mono text-xs font-bold text-slate-200">{formatFullDate(hoveredPt.raw.date)}</p>
                    </div>
                    <div className="h-7 w-px bg-slate-700/60" />
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-wider">Revenue</p>
                      <p className="font-sans text-xs font-black text-white">Rs. {hoveredPt.raw.revenue.toLocaleString()}</p>
                    </div>
                    <div className="h-7 w-px bg-slate-700/60" />
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Room / Food / Exp</p>
                      <p className="font-mono text-[10px] text-slate-300">
                        {hoveredPt.raw.roomRevenue.toLocaleString()} / {hoveredPt.raw.foodRevenue.toLocaleString()} / {(hoveredPt.raw.expenses || 0).toLocaleString()}
                      </p>
                    </div>
                    <div className="h-7 w-px bg-slate-700/60" />
                    <div className="space-y-0.5">
                      <p className="text-[9px] font-bold text-emerald-400 uppercase tracking-wider">Net Profit</p>
                      <p className="font-mono text-xs font-bold text-emerald-300">
                        Rs. {(hoveredPt.raw.netProfit || (hoveredPt.raw.revenue - (hoveredPt.raw.expenses || 0))).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="absolute top-3 right-4 flex items-center gap-2 text-[10px] text-slate-400 font-medium">
                    <Activity className="h-3 w-3 text-indigo-500 animate-pulse" />
                    <span>Hover data nodes for telemetry breakdown</span>
                  </div>
                )}

                {/* Multi-series legend if active */}
                {activeSeries === 'all' && (
                  <div className="flex items-center gap-4 text-[10px] font-bold mb-2 pb-1 border-b border-slate-100">
                    <span className="flex items-center gap-1 text-indigo-600">
                      <span className="w-2.5 h-1 bg-indigo-600 rounded-full" /> Total Revenue
                    </span>
                    <span className="flex items-center gap-1 text-emerald-600">
                      <span className="w-2.5 h-1 bg-emerald-600 rounded-full" /> Room Stay
                    </span>
                    <span className="flex items-center gap-1 text-amber-600">
                      <span className="w-2.5 h-1 bg-amber-600 rounded-full" /> Food & Beverage
                    </span>
                    <span className="flex items-center gap-1 text-rose-600">
                      <span className="w-2.5 h-1 bg-rose-600 rounded-full" /> Expenses
                    </span>
                  </div>
                )}

                <div className="w-full overflow-hidden">
                  <svg 
                    id="daily-settlement-svg"
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                    className="w-full h-auto select-none overflow-visible"
                  >
                    {/* Background Gradients Definitions */}
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.00" />
                      </linearGradient>
                      <linearGradient id="chartRoomGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                      </linearGradient>
                      <linearGradient id="chartFoodGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.00" />
                      </linearGradient>
                      <linearGradient id="chartServiceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0.00" />
                      </linearGradient>
                      <linearGradient id="chartExpenseGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.00" />
                      </linearGradient>
                      <linearGradient id="chartProfitGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#06b6d4" stopOpacity="0.22" />
                        <stop offset="100%" stopColor="#06b6d4" stopOpacity="0.00" />
                      </linearGradient>
                    </defs>

                    {/* Y-Axis Gridlines and Labels */}
                    {yTicks.map((tick, idx) => {
                      const yVal = paddingTop + chartHeight - (tick * chartHeight);
                      const labelVal = Math.round(tick * maxSeriesValue);
                      return (
                        <g key={idx}>
                          <line 
                            x1={paddingLeft} 
                            y1={yVal} 
                            x2={svgWidth - paddingRight} 
                            y2={yVal} 
                            stroke="#EEF2F6" 
                            strokeWidth="1" 
                            strokeDasharray={idx === 0 ? "0" : "3,3"} 
                          />
                          <text 
                            x={paddingLeft - 10} 
                            y={yVal + 3.5} 
                            textAnchor="end" 
                            className="fill-slate-400 font-mono text-[9px] font-bold"
                          >
                            {labelVal >= 1000 ? `Rs. ${(labelVal / 1000).toFixed(0)}k` : `Rs. ${labelVal}`}
                          </text>
                        </g>
                      );
                    })}

                    {/* Daily Average Benchmark Line */}
                    {avgRevenueVal > 0 && avgLineY >= paddingTop && avgLineY <= paddingTop + chartHeight && (
                      <g className="opacity-75">
                        <line 
                          x1={paddingLeft} 
                          y1={avgLineY} 
                          x2={svgWidth - paddingRight} 
                          y2={avgLineY} 
                          stroke="#6366f1" 
                          strokeWidth="1.2" 
                          strokeDasharray="4,4" 
                        />
                        <text
                          x={svgWidth - paddingRight + 4}
                          y={avgLineY + 3}
                          className="fill-indigo-500 font-mono text-[8px] font-bold"
                        >
                          Avg: Rs. {avgRevenueVal >= 1000 ? `${(avgRevenueVal / 1000).toFixed(1)}k` : Math.round(avgRevenueVal)}
                        </text>
                      </g>
                    )}

                    {/* MULTI SERIES RENDER */}
                    {activeSeries === 'all' && multiSeries ? (
                      <>
                        {/* Revenue line */}
                        <path d={multiSeries.revPath} fill="none" stroke="#4f46e5" strokeWidth="3" strokeLinecap="round" />
                        {/* Room stay line */}
                        <path d={multiSeries.roomPath} fill="none" stroke="#10b981" strokeWidth="2.5" strokeLinecap="round" />
                        {/* Food sales line */}
                        <path d={multiSeries.foodPath} fill="none" stroke="#f59e0b" strokeWidth="2.5" strokeLinecap="round" />
                        {/* Expense line */}
                        <path d={multiSeries.expPath} fill="none" stroke="#f43f5e" strokeWidth="2" strokeDasharray="3,3" strokeLinecap="round" />

                        {multiSeries.revPts.map((p, idx) => (
                          <circle 
                            key={idx} 
                            cx={p.x} 
                            cy={p.y} 
                            r="3.5" 
                            fill="#4f46e5" 
                            stroke="#ffffff" 
                            strokeWidth="1.5" 
                          />
                        ))}
                      </>
                    ) : chartType === 'area' ? (
                      <>
                        {/* Shaded Area fill path */}
                        <path 
                          d={singleAreaPath} 
                          fill={`url(#${
                            activeSeries === 'revenue' ? 'chartGradient' : 
                            activeSeries === 'roomRevenue' ? 'chartRoomGradient' : 
                            activeSeries === 'foodRevenue' ? 'chartFoodGradient' : 
                            activeSeries === 'serviceCharge' ? 'chartServiceGradient' :
                            activeSeries === 'expenses' ? 'chartExpenseGradient' : 'chartProfitGradient'
                          })`}
                          className="transition-all duration-350"
                        />
                        {/* Smooth Catmull-Rom Bezier Stroke */}
                        <path 
                          d={singleLinePath} 
                          fill="none" 
                          stroke={seriesColor} 
                          strokeWidth="3.2" 
                          strokeLinecap="round" 
                          strokeLinejoin="round"
                          className="transition-all duration-355"
                        />
                        
                        {/* Connecting point nodes */}
                        {points.map((p, idx) => (
                          <g key={idx}>
                            <circle 
                              cx={p.x} 
                              cy={p.y} 
                              r={hoveredIdx === idx ? "5.5" : "4"} 
                              fill={seriesColor} 
                              stroke="#ffffff" 
                              strokeWidth="2" 
                              className="transition-all duration-200 cursor-pointer" 
                            />
                            {hoveredIdx === idx && (
                              <circle 
                                cx={p.x} 
                                cy={p.y} 
                                r="9" 
                                fill="none" 
                                stroke={seriesColor} 
                                strokeWidth="1.5" 
                                className="animate-ping" 
                              />
                            )}
                          </g>
                        ))}
                      </>
                    ) : (
                      <>
                        {/* Render vertical bars */}
                        {points.map((p, idx) => {
                          const barWidth = Math.min(26, (chartWidth / chartData.length) * 0.48);
                          const rectX = p.x - barWidth / 2;
                          const rectY = p.y;
                          const rectHeight = Math.max(4, paddingTop + chartHeight - p.y);
                          const isHovered = hoveredIdx === idx;
                          return (
                            <rect
                              key={idx}
                              x={rectX}
                              y={rectY}
                              width={barWidth}
                              height={rectHeight}
                              rx="4"
                              fill={seriesColor}
                              opacity={isHovered ? 1 : 0.88}
                              className="transition-all duration-200 cursor-pointer"
                            />
                          );
                        })}
                      </>
                    )}

                    {/* Dotted vertical reference rule line on cursor hover */}
                    {hoveredPt && (
                      <line 
                        x1={hoveredPt.x} 
                        y1={paddingTop} 
                        x2={hoveredPt.x} 
                        y2={paddingTop + chartHeight} 
                        stroke={seriesColor} 
                        strokeWidth="1.5" 
                        strokeDasharray="3,3" 
                        className="pointer-events-none"
                      />
                    )}

                    {/* Horizontal Date labels on the X axis (Chronological Left to Right) */}
                    {points.map((p, idx) => (
                      <text
                        key={idx}
                        x={p.x}
                        y={paddingTop + chartHeight + 18}
                        textAnchor="middle"
                        className={`font-mono text-[9px] font-bold transition-all ${
                          hoveredIdx === idx ? 'fill-indigo-600 font-extrabold text-[10px]' : 'fill-slate-400'
                        }`}
                      >
                        {formatAxisDate(p.raw.date)}
                      </text>
                    ))}

                    {/* Invisible responsive hover trigger panels across date segments */}
                    {points.map((p, idx) => {
                      const colWidth = chartWidth / Math.max(1, chartData.length - 1 || 1);
                      const triggerWidth = chartData.length > 1 ? colWidth : chartWidth;
                      const triggerX = p.x - triggerWidth / 2;
                      return (
                        <rect
                          key={idx}
                          x={triggerX}
                          y={paddingTop}
                          width={triggerWidth}
                          height={chartHeight + 20}
                          fill="transparent"
                          className="cursor-pointer"
                          onMouseEnter={() => setHoveredIdx(idx)}
                          onMouseLeave={() => setHoveredIdx(null)}
                        />
                      );
                    })}
                  </svg>
                </div>
              </div>
            ) : (
              <div className="py-12 bg-slate-50 border border-dashed border-slate-200 text-center rounded-2xl">
                <p className="text-slate-400 text-sm">No transaction statements available to compile chart telemetry</p>
              </div>
            )}

            {/* MODERNIZED SETTLEMENT DATA GRID TABLE */}
            <div className="overflow-x-auto rounded-xl border border-slate-100">
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Room Revenue</th>
                    <th className="py-3 px-4">Food Sales</th>
                    <th className="py-3 px-4">Service Charge</th>
                    <th className="py-3 px-4">Expenses</th>
                    <th className="py-3 px-4 font-bold text-slate-800">Total Settled</th>
                    <th className="py-3 px-4 text-emerald-600 font-bold">Net Margin</th>
                    <th className="py-3 px-4 text-center">Folios</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-sans">
                  {enrichedDailyAnalytics.map((day, idx) => {
                    const margin = day.revenue > 0 ? Math.round(((day.netProfit || 0) / day.revenue) * 100) : 0;
                    return (
                      <tr key={idx} className="hover:bg-slate-50/70 transition-colors group">
                        <td className="py-3 px-4 font-mono font-semibold text-slate-800">
                          <span className="font-bold text-slate-900">{formatAxisDate(day.date)}</span>
                          <span className="text-[10px] text-slate-400 block">{day.date}</span>
                        </td>
                        <td className="py-3 px-4 text-slate-600">Rs. {day.roomRevenue.toLocaleString()}</td>
                        <td className="py-3 px-4 text-slate-600">Rs. {day.foodRevenue.toLocaleString()}</td>
                        <td className="py-3 px-4 text-slate-500">Rs. {(day.serviceCharge || 0).toLocaleString()}</td>
                        <td className="py-3 px-4 text-rose-500 font-mono">
                          {(day.expenses || 0) > 0 ? `-Rs. ${(day.expenses || 0).toLocaleString()}` : '—'}
                        </td>
                        <td className="py-3 px-4 font-bold text-indigo-600 font-sans">Rs. {day.revenue.toLocaleString()}</td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            (day.netProfit || 0) >= 0 ? 'bg-emerald-50 text-emerald-700' : 'bg-rose-50 text-rose-700'
                          }`}>
                            Rs. {(day.netProfit || 0).toLocaleString()} ({margin}%)
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span className="px-2 py-0.5 bg-slate-100 group-hover:bg-indigo-50 group-hover:text-indigo-600 rounded font-mono font-bold text-[11px] text-slate-600 transition-colors">
                            {day.billsCount}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {enrichedDailyAnalytics.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400">
                        No checked-out receipt data available for {curMonthLabel}.
                      </td>
                    </tr>
                  )}
                </tbody>
                {enrichedDailyAnalytics.length > 0 && (
                  <tfoot className="bg-slate-50/80 font-bold border-t border-slate-200 text-slate-800 text-xs">
                    <tr>
                      <td className="py-3 px-4">Total ({enrichedDailyAnalytics.length} Days)</td>
                      <td className="py-3 px-4 text-slate-700">
                        Rs. {enrichedDailyAnalytics.reduce((s, d) => s + d.roomRevenue, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        Rs. {enrichedDailyAnalytics.reduce((s, d) => s + d.foodRevenue, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-700">
                        Rs. {enrichedDailyAnalytics.reduce((s, d) => s + (d.serviceCharge || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-rose-600">
                        Rs. {enrichedDailyAnalytics.reduce((s, d) => s + (d.expenses || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-indigo-700 font-extrabold text-sm">
                        Rs. {enrichedDailyAnalytics.reduce((s, d) => s + d.revenue, 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-emerald-700 font-extrabold">
                        Rs. {enrichedDailyAnalytics.reduce((s, d) => s + (d.netProfit || 0), 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-center font-mono font-bold">
                        {enrichedDailyAnalytics.reduce((s, d) => s + d.billsCount, 0)}
                      </td>
                    </tr>
                  </tfoot>
                )}
              </table>
            </div>

          </div>

          {/* AI EXECUTIVE BRIEFING MODAL */}
          {aiModalOpen && (
            <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fade-in no-print">
              <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-100 overflow-hidden flex flex-col max-h-[90vh]">
                {/* Modal Header */}
                <div className="p-5 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="p-2 bg-indigo-500/20 rounded-xl border border-indigo-400/30 text-amber-300">
                      <Sparkles className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
                        AI Settlement Executive Intelligence
                      </h3>
                      <p className="text-xs text-indigo-200">
                        Analytical synthesis for {curMonthLabel} ({chartRange === 0 ? 'Full Month' : `${chartRange} Days Range`})
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setAiModalOpen(false)}
                    className="p-1.5 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Modal Body */}
                <div className="p-6 overflow-y-auto space-y-5 text-slate-700">
                  {aiLoading ? (
                    <div className="py-16 text-center space-y-3">
                      <Loader2 className="h-8 w-8 text-indigo-600 animate-spin mx-auto" />
                      <p className="font-bold text-sm text-slate-800">Synthesizing settlement telemetry & revenue velocity...</p>
                      <p className="text-xs text-slate-400">Evaluating room attachment rates, food sales, and cost health...</p>
                    </div>
                  ) : aiError ? (
                    <div className="p-4 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 flex items-start gap-3">
                      <AlertTriangle className="h-5 w-5 shrink-0 mt-0.5" />
                      <div>
                        <p className="font-bold text-xs uppercase tracking-wider">Analysis Failed</p>
                        <p className="text-xs mt-1">{aiError}</p>
                      </div>
                    </div>
                  ) : aiInsights ? (
                    <div className="space-y-5">
                      {/* Health Score & Performance Tier */}
                      <div className="flex items-center justify-between p-4 bg-indigo-50/60 rounded-2xl border border-indigo-100">
                        <div className="flex items-center gap-3">
                          <div className="h-12 w-12 rounded-2xl bg-indigo-600 text-white font-extrabold text-lg flex items-center justify-center shadow-xs">
                            {aiInsights.healthScore || 85}
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">Property Health Rating</span>
                            <h4 className="font-bold text-slate-900 text-base">{aiInsights.performanceTier || 'Healthy Performance'}</h4>
                          </div>
                        </div>
                        <span className="px-3 py-1 bg-white text-indigo-700 rounded-xl text-xs font-bold shadow-2xs border border-indigo-100">
                          {rangeStats.marginPct}% Operating Margin
                        </span>
                      </div>

                      {/* Executive Summary */}
                      <div className="space-y-1.5">
                        <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                          <Activity className="h-3.5 w-3.5 text-indigo-600" /> Executive Overview
                        </h4>
                        <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-3.5 rounded-xl border border-slate-100">
                          {aiInsights.executiveSummary}
                        </p>
                      </div>

                      {/* Key Highlights */}
                      {aiInsights.keyHighlights && aiInsights.keyHighlights.length > 0 && (
                        <div className="space-y-2">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Zap className="h-3.5 w-3.5 text-amber-500" /> Telemetry Highlights
                          </h4>
                          <div className="grid grid-cols-1 gap-2">
                            {aiInsights.keyHighlights.map((hl: string, idx: number) => (
                              <div key={idx} className="flex items-start gap-2 text-xs bg-slate-50/80 p-2.5 rounded-lg border border-slate-100">
                                <Check className="h-4 w-4 text-emerald-500 shrink-0 mt-0.5" />
                                <span className="text-slate-700">{hl}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Food vs Room & Margin Breakdown */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-3.5 bg-amber-50/40 rounded-xl border border-amber-100/60 space-y-1">
                          <span className="font-bold text-amber-800 uppercase text-[10px] tracking-wider">F&B vs Lodging Dynamics</span>
                          <p className="text-slate-600 text-[11px] leading-relaxed">{aiInsights.foodToRoomAnalysis}</p>
                        </div>
                        <div className="p-3.5 bg-purple-50/40 rounded-xl border border-purple-100/60 space-y-1">
                          <span className="font-bold text-purple-800 uppercase text-[10px] tracking-wider">Cost & Margin Telemetry</span>
                          <p className="text-slate-600 text-[11px] leading-relaxed">{aiInsights.marginAnalysis}</p>
                        </div>
                      </div>

                      {/* Tactical Recommendations */}
                      {aiInsights.recommendations && aiInsights.recommendations.length > 0 && (
                        <div className="space-y-2 pt-2 border-t border-slate-100">
                          <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider flex items-center gap-1.5">
                            <Lightbulb className="h-3.5 w-3.5 text-amber-500" /> Strategic Action Items
                          </h4>
                          <div className="space-y-2">
                            {aiInsights.recommendations.map((rec: any, idx: number) => (
                              <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 flex items-start justify-between gap-3">
                                <div className="space-y-0.5">
                                  <p className="text-xs font-bold text-slate-800">{rec.title}</p>
                                  <p className="text-[11px] text-slate-500">{rec.description}</p>
                                </div>
                                <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold uppercase shrink-0 ${
                                  rec.impact === 'High' ? 'bg-rose-100 text-rose-700' :
                                  rec.impact === 'Medium' ? 'bg-amber-100 text-amber-700' : 'bg-emerald-100 text-emerald-700'
                                }`}>
                                  {rec.impact}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>

                {/* Modal Footer */}
                <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[10px] text-slate-400">Powered by Gemini AI & Mount Ash Intelligence</span>
                  <button
                    type="button"
                    onClick={() => setAiModalOpen(false)}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-bold transition-all cursor-pointer"
                  >
                    Close Briefing
                  </button>
                </div>
              </div>
            </div>
          )}

         

          {/* COMPLETED BILLS DETAIL AUDIT REGISTER SECTION */}
          <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-50 no-print">
              <h3 className="font-display font-bold text-slate-800 flex items-center gap-1.5 text-base">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Settled Bills Audit Register
              </h3>
              <span className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                {filteredCompletedBills.length} completed transactions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-705">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="py-3 px-4">Invoice ID</th>
                    <th className="py-3 px-4">Guest Details</th>
                    <th className="py-3 px-4">Settled On</th>
                    <th className="py-3 px-4">Rooms Rev</th>
                    <th className="py-3 px-4">Food Rev</th>
                    <th className="py-3 px-4">S.C. Rev</th>
                    <th className="py-3 px-4 font-bold text-slate-800">Total Settled</th>
                    {canDeleteSettledBills && (
                      <th className="py-3 px-4 text-center no-print">Actions</th>
                    )}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-sans">
                  {filteredCompletedBills.map((bill) => (
                    <tr key={bill.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-indigo-600">
                        {bill.id}
                      </td>
                      <td className="py-3 px-4">
                        <p className="font-semibold text-slate-800">{bill.guestDetails?.name || 'N/A'}</p>
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">NIC: {bill.guestDetails?.nic || ''}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono">
                        {bill.updatedAt ? new Date(bill.updatedAt).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) : 'N/A'}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium font-mono">
                        Rs. {(bill.roomSubtotal || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium font-mono">
                        Rs. {(bill.foodSubtotal || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-medium font-mono">
                        Rs. {(bill.serviceCharge || 0).toLocaleString()}
                      </td>
                      <td className="py-3 px-4 font-bold text-slate-900 font-mono">
                        Rs. {bill.totalAmount?.toLocaleString()}
                      </td>
                      {canDeleteSettledBills && (
                      <td className="py-3 px-4 shrink-0 no-print">
                        <div className="flex justify-center">
                          {deleteConfirmId === bill.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDeleteBill(bill.id)}
                                disabled={deletingBillId === bill.id}
                                className="px-2.5 py-1 bg-red-650 hover:bg-red-700 text-white font-bold text-[9px] uppercase tracking-wide rounded-md border-0 cursor-pointer shadow-xs disabled:opacity-50 flex items-center gap-1"
                              >
                                {deletingBillId === bill.id ? (
                                  <Loader2 className="h-3 w-3 animate-spin" />
                                ) : null}
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                disabled={deletingBillId === bill.id}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-605 font-bold text-[9px] uppercase tracking-wide rounded-md border-0 cursor-pointer disabled:opacity-50"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(bill.id)}
                              disabled={deletingBillId !== null}
                              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-sm hover:bg-red-50 border-y-0 border-x-0 cursor-pointer disabled:opacity-50"
                              title="Delete ledger record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                      )}
                    </tr>
                  ))}
                  {filteredCompletedBills.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                        No checked-out receipts to view for {curMonthLabel}.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
      </>
    )}

          {/* TAB 2: DAILY CASHBOOK LEDGER (DYNAMIC RECONCILIATION) */}
          {activeTab === 'cashbook' && (
            <div className="space-y-6">
              

              {/* KPI Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
                  <p className="text-[11px] font-bold text-emerald-600 uppercase tracking-widest font-sans flex items-center gap-1">
                    <ArrowUpRight className="h-4 w-4 shrink-0 text-emerald-500" />
                    Total Revenue (+)
                  </p>
                  <p className="text-2xl font-display font-extrabold text-slate-800 mt-2 font-mono">
                    Rs. {cbTotalInflowFiltered.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Concluded billings and invoices turnover</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs">
                  <p className="text-[11px] font-bold text-rose-500 uppercase tracking-widest font-sans flex items-center gap-1">
                    <ArrowDownRight className="h-4 w-4 shrink-0 text-rose-500" />
                    Total Expenses (-)
                  </p>
                  <p className="text-2xl font-display font-extrabold text-slate-800 mt-2 font-mono">
                    Rs. {cbTotalOutflowFiltered.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Disbursements paid out of drawer</p>
                </div>

                <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs relative overflow-hidden bg-gradient-to-br from-indigo-50/20 to-transparent">
                  <p className="text-[11px] font-bold text-indigo-600 uppercase tracking-widest font-sans">
                    Net Liquid State
                  </p>
                  <p className={`text-2xl font-display font-extrabold mt-2 font-mono ${cbNetBalanceFiltered >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                    Rs. {cbNetBalanceFiltered.toLocaleString()}
                  </p>
                  <p className="text-[10px] text-slate-400 mt-1">Available cash (Revenue minus Expenses)</p>
                </div>
              </div>

              {/* Day-by-Day Accordions */}
              <div>
                <div className="mb-4 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chronological Cash Register</h4>
                  <button
                    onClick={exportCashbookCSV}
                    className="px-3 py-2 bg-slate-800 hover:bg-slate-900 text-white rounded-xl text-xs font-semibold flex items-center gap-2 shadow-xs"
                  >
                    <FileSpreadsheet className="h-3.5 w-3.5 text-emerald-400" />
                    Export CSV
                  </button>
                </div>

                {cashbookDaysFiltered.length === 0 ? (
                  <div className="bg-white p-12 text-center rounded-2xl border border-slate-150 py-16">
                    <BookOpen className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                    <p className="text-slate-500 text-sm font-semibold">No transactions compiled for month ({cashbookMonth})</p>
                    <p className="text-slate-400 text-xs mt-1">Conclude visual checkouts or register paid expenses to populate the cashbook.</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {cashbookDaysFiltered.map((day) => {
                      const isExpanded = !!expandedDays[day.date];
                      return (
                        <div key={day.date} className="bg-white rounded-xl border border-slate-100 shadow-2xs overflow-hidden transition-all duration-200">
                          {/* Inner Row Header */}
                          <div 
                            onClick={() => setExpandedDays(prev => ({ ...prev, [day.date]: !prev[day.date] }))}
                            className="p-4 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/40 select-none"
                          >
                            <div className="flex items-center gap-3">
                              <div className="bg-slate-100 h-9 w-9 rounded-lg flex items-center justify-center text-slate-605 shrink-0">
                                <CalendarDays className="h-4.5 w-4.5 text-indigo-500" />
                              </div>
                              <div>
                                <h4 className="font-bold text-slate-800 text-xs sm:text-sm">
                                  {new Date(day.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                </h4>
                                <span className="text-[10px] text-slate-400 font-mono font-bold tracking-wide uppercase mt-0.5 inline-block">
                                  {day.bills.length} Credits In • {day.expenses.length} Debits Out
                                </span>
                              </div>
                            </div>

                            <div className="flex items-center gap-4 self-end sm:self-auto">
                              <div className="text-right flex items-center gap-4 sm:gap-6">
                                <div className="hidden md:block">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Inflow</p>
                                  <p className="text-xs font-semibold text-emerald-600 font-mono mt-0.5">
                                    +Rs. {day.inflow.toLocaleString()}
                                  </p>
                                </div>
                                <div className="hidden md:block">
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Outflow</p>
                                  <p className="text-xs font-semibold text-rose-500 font-mono mt-0.5">
                                    -Rs. {day.outflow.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest text-right">Day Balance</p>
                                  <p className={`text-xs sm:text-sm font-bold font-mono mt-0.5 ${day.balance >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                                    {day.balance >= 0 ? '+' : ''}Rs. {day.balance.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              {isExpanded ? (
                                <ChevronUp className="h-4.5 w-4.5 text-slate-400" />
                              ) : (
                                <ChevronDown className="h-4.5 w-4.5 text-slate-400" />
                              )}
                            </div>
                          </div>

                          {/* Collapsed view expanded */}
                          {isExpanded && (
                            <div className="border-t border-slate-50 bg-slate-50/30 p-4 transition-all">
                              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                
                                {/* Inflow items list */}
                                <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-3">
                                  <div className="border-b border-slate-50 pb-2">
                                    <p className="text-[10px] font-extrabold text-emerald-600 uppercase tracking-wider flex items-center gap-1.5">
                                      <ArrowUpRight className="h-4 w-4" />
                                      Billing Receipts (+Rs. {day.inflow.toLocaleString()})
                                    </p>
                                  </div>
                                  {day.bills.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic py-4 text-center">No checkouts completed on this date.</p>
                                  ) : (
                                    <div className="divide-y divide-slate-50 max-h-60 overflow-y-auto pr-1">
                                      {day.bills.map((b: any) => (
                                        <div key={b.id} className="py-2.5 flex justify-between items-center text-xs">
                                          <div>
                                            <p className="font-bold text-slate-800">{b.guestDetails?.name || 'Mount Ash Guest'}</p>
                                            <p className="text-[9px] text-slate-400 font-mono mt-0.5">
                                              Ledger ID: #{b.id} ({b.roomItems?.map((r: any) => `Rm ${r.roomNumber}`).join(', ') || 'Only Food'})
                                            </p>
                                          </div>
                                          <span className="font-bold text-emerald-600 font-mono">Rs. {b.totalAmount.toLocaleString()}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                                {/* Outflow items list */}
                                <div className="bg-white p-4 rounded-xl border border-slate-100 space-y-3">
                                  <div className="border-b border-slate-50 pb-2">
                                    <p className="text-[10px] font-extrabold text-rose-500 uppercase tracking-wider flex items-center gap-1.5">
                                      <ArrowDownRight className="h-4 w-4" />
                                      Corporate Disbursements (-Rs. {day.outflow.toLocaleString()})
                                    </p>
                                  </div>
                                  {day.expenses.length === 0 ? (
                                    <p className="text-xs text-slate-400 italic py-4 text-center">No cash expenditures logged on this date.</p>
                                  ) : (
                                    <div className="divide-y divide-slate-50 max-h-60 overflow-y-auto pr-1">
                                      {day.expenses.map((e: any) => (
                                        <div key={e.id} className="py-2.5 flex justify-between items-center text-xs">
                                          <div>
                                            <p className="font-bold text-slate-800">{e.title}</p>
                                            <p className="text-[9px] text-slate-400 mt-0.5">
                                              Category: {e.category} • Method: <span className="font-medium text-slate-500">{e.paymentMethod}</span>
                                            </p>
                                          </div>
                                          <span className="font-bold text-rose-600 font-mono">-Rs. {e.amount.toLocaleString()}</span>
                                        </div>
                                      ))}
                                    </div>
                                  )}
                                </div>

                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* PRINT-ONLY AUDIT SUMMARY SHEET FOR BROWSER PRINT ACTION */}
      <div className="print-only p-10 font-mono space-y-8 text-black" id="print-audit-record">
        <div className="text-center space-y-2">
          <h2 className="text-2xl font-bold tracking-tight">MOUNT ASH VILLA</h2>
          <p className="text-sm">FINANCIAL AUDIT STATEMENT - SUMMARY SHEET</p>
          <p className="text-xs">Generated date / time: {new Date().toLocaleString()}</p>
        </div>

        <div className="border-b border-dotted border-black my-4" />

        <div className="space-y-2 text-sm">
          <p className="font-bold uppercase">1. CUMULATIVE BALANCES AUDIT:</p>
          <div className="flex justify-between">
            <span>Cumulative Sales:</span>
            <span>Rs. {totalRevenue}</span>
          </div>
          <div className="flex justify-between">
            <span>Room Booking Proceeds:</span>
            <span>Rs. {totalRoomRevenue}</span>
          </div>
          <div className="flex justify-between">
            <span>Food Sales Revenue:</span>
            <span>Rs. {totalFoodSales}</span>
          </div>
          <div className="flex justify-between">
            <span>Service Charge Proceeds:</span>
            <span>Rs. {totalServiceCharge}</span>
          </div>
          <div className="flex justify-between">
            <span>Allocated Settlements:</span>
            <span>{totalBillsCheckedOut}</span>
          </div>
        </div>

        <div className="border-b border-dotted border-black my-4" />

        <p className="text-center font-semibold text-xs mt-8">=== END OF REVENUE DIRECTORY STATEMENT ===</p>
      </div>

    </div>
  );
};

