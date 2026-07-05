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
  BookOpen,
  Lock,
  Unlock,
  ArrowUpRight,
  ArrowDownRight,
  CalendarDays,
  Check,
  User,
  Wallet,
  Coins,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import { ClosedMonth } from '@/lib/types';
import { apiFetch } from '@/lib/api';

interface ReportDetails {
  date?: string;
  month?: string;
  revenue: number;
  foodRevenue: number;
  serviceCharge?: number;
  roomRevenue: number;
  billsCount: number;
}

export const Reports: React.FC = () => {
  const [dailyData, setDailyData] = useState<ReportDetails[]>([]);
  const [monthlyData, setMonthlyData] = useState<ReportDetails[]>([]);
  const [completedBills, setCompletedBills] = useState<any[]>([]);
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Daily Cashbook & Monthly Closer Core States
  const [activeTab, setActiveTab] = useState<'analytics' | 'cashbook' | 'closer'>('analytics');
  const [expenses, setExpenses] = useState<any[]>([]);
  const [closedMonths, setClosedMonths] = useState<ClosedMonth[]>([]);
  const [cashbookMonth, setCashbookMonth] = useState<string>('all');

  // Selection states for Month-End Closer Form
  const [selectedMonth, setSelectedMonth] = useState<string>(() => {
    const d = new Date();
    const mon = String(d.getMonth() + 1).padStart(2, '0');
    return `${d.getFullYear()}-${mon}`;
  });
  const [ownerTakeaway, setOwnerTakeaway] = useState<number>(0);
  const [closerNotes, setCloserNotes] = useState<string>('');
  const [closingLoading, setClosingLoading] = useState<boolean>(false);
  const [successMsg, setSuccessMsg] = useState<string>('');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // Folding accordions for daily cashbook listing
  const [expandedDays, setExpandedDays] = useState<Record<string, boolean>>({});

  // Chart Interactive State Managers
  const [chartType, setChartType] = useState<'area' | 'bar'>('area');
  const [activeSeries, setActiveSeries] = useState<'revenue' | 'roomRevenue' | 'foodRevenue' | 'serviceCharge'>('revenue');
  const [chartRange, setChartRange] = useState<number>(7);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

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
    try {
      const res = await apiFetch(`/api/bills/${billId}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        setDeleteConfirmId(null);
        fetchReports();
      } else {
        console.error('Failed to delete invoice');
      }
    } catch (error) {
      console.error('Failed to delete bill:', error);
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
    setSuccessMsg('');
    setErrorMsg('');

    // Check if already closed
    const alreadyClosed = closedMonths.some(m => m.month === selectedMonth);
    if (alreadyClosed) {
      setErrorMsg('This month has already been closed and verified!');
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
        setSuccessMsg(`✓ Month ${selectedMonth} closed successfully! Net profit of Rs. ${Number(ownerTakeaway).toLocaleString()} distributed to owner.`);
        setCloserNotes('');
        // Reload closed months
        const closedRes = await fetch('/api/closed-months');
        if (closedRes.ok) {
          const list = await closedRes.json();
          setClosedMonths(list);
        }
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to complete month-end closer');
      }
    } catch (err) {
      console.error(err);
      setErrorMsg('Network error occurred while closing the month.');
    } finally {
      setClosingLoading(false);
    }
  };

  const handleDeleteClosedMonth = async (id: string) => {
    try {
      const res = await apiFetch(`/api/closed-months/${id}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        setClosedMonths(closedMonths.filter(m => m.id !== id));
      }
    } catch (err) {
      console.error('Failed to reopen month', err);
    }
  };


  useEffect(() => {
    fetchReports();
  }, []);

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
  const currentMonthData = monthlyData.find(m => m.month === curMonthStr);
  const thisMonthRevenue = currentMonthData ? currentMonthData.revenue : 0;
  const thisMonthRoomRevenue = currentMonthData ? currentMonthData.roomRevenue : 0;
  const thisMonthFoodSales = currentMonthData ? currentMonthData.foodRevenue : 0;
  const thisMonthServiceCharge = currentMonthData ? (currentMonthData.serviceCharge || 0) : 0;
  const thisMonthBills = currentMonthData ? currentMonthData.billsCount : 0;
  const curMonthLabel = new Date().toLocaleDateString(undefined, { month: 'long', year: 'numeric' });

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

  const cashbookDaysFiltered = cashbookDays.filter(day => {
    if (cashbookMonth === 'all') return true;
    return day.date.startsWith(cashbookMonth);
  });

  // CSV Export for Daily Report
  const exportDailyCSV = () => {
    const headers = ['Date', 'Total Revenue (Rs.)', 'Room Revenue (Rs.)', 'Food Revenue (Rs.)', 'Service Charge (Rs.)', 'Invoices Settled'];
    const rows = dailyData.map(item => [
      item.date,
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
    link.setAttribute("download", `Daily_Revenue_Report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Export for Monthly Report
  const exportMonthlyCSV = () => {
    const headers = ['Month', 'Total Revenue (Rs.)', 'Room Revenue (Rs.)', 'Food Revenue (Rs.)', 'Service Charge (Rs.)', 'Completed Billings'];
    const rows = monthlyData.map(item => [
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

  const handlePrintPDFSummary = () => {
    window.print();
  };

  const maxVal = Math.max(...dailyData.map(d => d.revenue), 1);

  // Prepare chart series math based on active state parameters
  const chartData = dailyData.slice(0, chartRange).reverse();
  const maxSeriesValue = Math.max(...chartData.map(d => {
    if (activeSeries === 'revenue') return d.revenue;
    if (activeSeries === 'roomRevenue') return d.roomRevenue;
    if (activeSeries === 'foodRevenue') return d.foodRevenue;
    return d.serviceCharge || 0;
  }), 1000);

  const svgWidth = 640;
  const svgHeight = 240;
  const paddingLeft = 60;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 40;

  const chartWidth = svgWidth - paddingLeft - paddingRight;
  const chartHeight = svgHeight - paddingTop - paddingBottom;

  // Coordinate arrays mapping
  const points = chartData.map((day, i) => {
    const x = paddingLeft + (chartData.length > 1 ? (i / (chartData.length - 1)) * chartWidth : chartWidth / 2);
    const value = 
      activeSeries === 'revenue' ? day.revenue : 
      activeSeries === 'roomRevenue' ? day.roomRevenue : 
      activeSeries === 'foodRevenue' ? day.foodRevenue : 
      (day.serviceCharge || 0);
    const y = paddingTop + chartHeight - (value / maxSeriesValue) * chartHeight;
    return { x, y, value, raw: day, index: i };
  });

  // SVG Line and Area path computations
  let linePath = "";
  let areaPath = "";
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y} ` + points.slice(1).map(p => `L ${p.x} ${p.y}`).join(" ");
    areaPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + chartHeight} L ${points[0].x} ${paddingTop + chartHeight} Z`;
  }

  const seriesColor = 
    activeSeries === "revenue" ? "#4f46e5" :
    activeSeries === "roomRevenue" ? "#10b981" :
    activeSeries === "foodRevenue" ? "#f59e0b" : "#a855f7";

  const hoveredPt = hoveredIdx !== null ? points[hoveredIdx] : null;
  const yTicks = [0, 0.25, 0.5, 0.75, 1];

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

          <button
            type="button"
            onClick={() => setActiveTab('closer')}
            className={`pb-3 px-5 text-xs sm:text-sm font-bold border-b-2 transition-all flex items-center gap-1.5 cursor-pointer border-x-0 border-t-0 bg-transparent ${
              activeTab === 'closer'
                ? 'border-indigo-600 text-indigo-600'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <Wallet className="h-4 w-4" />
            Month-End Closer & Net Profit
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
          
          {/* DAILY CHART & DATA LISTING (Left 8 columns) */}
          <div className="lg:col-span-8 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-50 no-print">
              <h3 className="font-display font-bold text-slate-800 flex items-center gap-1.5 text-base">
                <Calendar className="h-4 w-4 text-indigo-500" />
                Daily Settlement Records
              </h3>
              <button
                onClick={exportDailyCSV}
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                Export Excel Sheet CSV
              </button>
            </div>

            {/* INTERACTIVE CONTROLS ROW */}
            <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 flex flex-col md:flex-row justify-between gap-3 no-print">
              {/* Metric Selectors */}
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setActiveSeries('revenue')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    activeSeries === 'revenue'
                      ? 'bg-indigo-600 text-white border-indigo-600 shadow-sm'
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    activeSeries === 'roomRevenue'
                      ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${activeSeries === 'roomRevenue' ? 'bg-white' : 'bg-emerald-500'}`} />
                    Rooms Booking
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveSeries('foodRevenue')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    activeSeries === 'foodRevenue'
                      ? 'bg-amber-600 text-white border-amber-600 shadow-sm'
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
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all cursor-pointer ${
                    activeSeries === 'serviceCharge'
                      ? 'bg-purple-650 text-white border-purple-600 shadow-sm'
                      : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <span className="flex items-center gap-1.5">
                    <span className={`w-1.5 h-1.5 rounded-full ${activeSeries === 'serviceCharge' ? 'bg-white' : 'bg-purple-500'}`} />
                    Service Charge
                  </span>
                </button>
              </div>

              {/* View options */}
              <div className="flex items-center gap-3 shrink-0">
                {/* Range Selectors */}
                <div className="flex bg-white rounded-lg border border-slate-200 p-0.5 shadow-2xs">
                  {[7, 15, 30].map((days) => (
                    <button
                      key={days}
                      type="button"
                      onClick={() => { setChartRange(days); setHoveredIdx(null); }}
                      className={`px-2 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer ${
                        chartRange === days
                          ? 'bg-slate-800 text-white'
                          : 'text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {days}D
                    </button>
                  ))}
                </div>

                {/* Type toggle */}
                <div className="flex bg-white rounded-lg border border-slate-200 p-0.5 shadow-2xs">
                  <button
                    type="button"
                    onClick={() => setChartType('area')}
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
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
                    className={`px-2.5 py-1 text-[11px] font-bold rounded-md transition-all cursor-pointer flex items-center gap-1 ${
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
              <div className="relative p-5 bg-white rounded-2xl border border-slate-100 no-print">
                
                {/* Floating details card on hover */}
                {hoveredPt ? (
                  <div className="absolute top-4 right-4 bg-slate-900 text-white p-3 rounded-xl shadow-lg border border-slate-800 flex items-center gap-4 animate-fade-in z-10">
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Date</p>
                      <p className="font-mono text-xs font-extrabold">{hoveredPt.raw.date}</p>
                    </div>
                    <div className="h-6 w-px bg-slate-850" />
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Revenue</p>
                      <p className="font-sans text-xs font-black text-indigo-400">Rs. {hoveredPt.raw.revenue.toLocaleString()}</p>
                    </div>
                    <div className="h-6 w-px bg-slate-850" />
                    <div className="space-y-0.5">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Room / Food / SC</p>
                      <p className="font-mono text-[10px] text-slate-300">
                        {hoveredPt.raw.roomRevenue.toLocaleString()} / {hoveredPt.raw.foodRevenue.toLocaleString()} / {(hoveredPt.raw.serviceCharge || 0).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ) : (
                  <div className="absolute top-4 right-4 text-[10px] text-slate-400 font-medium italic">
                    Hover data points for detailed telemetry
                  </div>
                )}

                <div className="w-full overflow-hidden">
                  <svg 
                    viewBox={`0 0 ${svgWidth} ${svgHeight}`} 
                    className="w-full h-auto select-none overflow-visible"
                  >
                    {/* Background Gradients Definitions */}
                    <defs>
                      <linearGradient id="chartGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#4f46e5" stopOpacity="0.16" />
                        <stop offset="100%" stopColor="#4f46e5" stopOpacity="0.00" />
                      </linearGradient>
                      <linearGradient id="chartRoomGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#10b981" stopOpacity="0.16" />
                        <stop offset="100%" stopColor="#10b981" stopOpacity="0.00" />
                      </linearGradient>
                      <linearGradient id="chartFoodGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.16" />
                        <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.00" />
                      </linearGradient>
                      <linearGradient id="chartServiceGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#a855f7" stopOpacity="0.16" />
                        <stop offset="100%" stopColor="#a855f7" stopOpacity="0.00" />
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
                            stroke="#F8FAFC" 
                            strokeWidth="1.5" 
                            strokeDasharray={idx === 0 ? "0" : "4,4"} 
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

                    {/* Render visual elements depending on selected chartType */}
                    {chartType === 'area' ? (
                      <>
                        {/* Shaded Area fill path */}
                        <path 
                          d={areaPath} 
                          fill={`url(#${
                            activeSeries === 'revenue' ? 'chartGradient' : 
                            activeSeries === 'roomRevenue' ? 'chartRoomGradient' : 
                            activeSeries === 'foodRevenue' ? 'chartFoodGradient' : 'chartServiceGradient'
                          })`}
                          className="transition-all duration-350"
                        />
                        {/* Bold Stroke line path */}
                        <path 
                          d={linePath} 
                          fill="none" 
                          stroke={seriesColor} 
                          strokeWidth="3.5" 
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
                              r="4.5" 
                              fill={seriesColor} 
                              stroke="#ffffff" 
                              strokeWidth="2" 
                              className="transition-all duration-200" 
                            />
                            {hoveredIdx === idx && (
                              <circle 
                                cx={p.x} 
                                cy={p.y} 
                                r="8" 
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
                          const barWidth = Math.min(26, (chartWidth / chartData.length) * 0.45);
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
                              opacity={isHovered ? 1 : 0.85}
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

                    {/* Horizontal Date labels on the X axis */}
                    {points.map((p, idx) => (
                      <text
                        key={idx}
                        x={p.x}
                        y={paddingTop + chartHeight + 16}
                        textAnchor="middle"
                        className={`fill-slate-400 font-mono font-bold text-[9px] transition-all ${
                          hoveredIdx === idx ? 'fill-indigo-600 font-extrabold text-[10px]' : ''
                        }`}
                      >
                        {p.raw.date ? `${p.raw.date.substring(5, 7)}/${p.raw.date.substring(8, 10)}` : ''}
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
                          height={chartHeight}
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

            {/* TABLE */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-slate-700">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-bold text-slate-400 uppercase tracking-widest">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Room Revenue</th>
                    <th className="py-3 px-4">Food Sales</th>
                    <th className="py-3 px-4">Service Charge</th>
                    <th className="py-3 px-4 font-bold text-slate-800">Total Settled</th>
                    <th className="py-3 px-4 text-center">Checkout Count</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-sans">
                  {dailyData.map((day, idx) => (
                    <tr key={idx} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 px-4 font-mono font-semibold text-slate-800">{day.date}</td>
                      <td className="py-3 px-4 text-slate-500">Rs. {day.roomRevenue.toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-500">Rs. {day.foodRevenue.toLocaleString()}</td>
                      <td className="py-3 px-4 text-slate-500">Rs. {(day.serviceCharge || 0).toLocaleString()}</td>
                      <td className="py-3 px-4 font-semibold text-indigo-600 font-sans">Rs. {day.revenue.toLocaleString()}</td>
                      <td className="py-3 px-4 text-center font-mono font-semibold">{day.billsCount}</td>
                    </tr>
                  ))}
                  {dailyData.length === 0 && (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-slate-400">
                        No checked-out receipt data available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

          </div>

          {/* MONTHLY SUMMARY CARD (Right 4 columns) */}
          <div className="lg:col-span-4 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-50 no-print">
              <h3 className="font-display font-bold text-slate-800 flex items-center gap-1.5 text-base">
                <Receipt className="h-4 w-4 text-indigo-500" />
                Monthly Revenue Logs
              </h3>
              <button
                onClick={exportMonthlyCSV}
                className="text-xs text-indigo-600 font-bold hover:underline"
              >
                CSV
              </button>
            </div>

            <div className="space-y-4">
              {monthlyData.map((m, idx) => (
                <div key={idx} className="p-3 bg-slate-50 rounded-xl border border-slate-100 space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="font-mono text-xs font-bold text-slate-700">{m.month} (Settlements)</span>
                    <span className="text-[10px] font-semibold text-indigo-600">{m.billsCount} settled</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-slate-100 text-slate-500">
                    <div className="space-y-0.5">
                      <div>Room: Rs. {m.roomRevenue.toLocaleString()}</div>
                      <div>Food: Rs. {m.foodRevenue.toLocaleString()}</div>
                      <div>S.C.: Rs. {(m.serviceCharge || 0).toLocaleString()}</div>
                    </div>
                    <div className="text-right self-end font-semibold text-slate-800">
                      Rs. {m.revenue.toLocaleString()}
                    </div>
                  </div>
                </div>
              ))}

              {monthlyData.length === 0 && (
                <p className="text-center py-6 text-xs text-slate-400">No monthly aggregates compiled yet.</p>
              )}
            </div>

          </div>

          {/* COMPLETED BILLS DETAIL AUDIT REGISTER SECTION */}
          <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-50 no-print">
              <h3 className="font-display font-bold text-slate-800 flex items-center gap-1.5 text-base">
                <CheckCircle2 className="h-4 w-4 text-emerald-500" />
                Settled Bills Audit Register
              </h3>
              <span className="text-xs font-semibold text-slate-400 bg-slate-50 border border-slate-100 px-2 py-0.5 rounded">
                {completedBills.length} completed transactions
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
                    <th className="py-3 px-4 text-center no-print">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-sans">
                  {completedBills.map((bill) => (
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
                      <td className="py-3 px-4 shrink-0 no-print">
                        <div className="flex justify-center">
                          {deleteConfirmId === bill.id ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                onClick={() => handleDeleteBill(bill.id)}
                                className="px-2.5 py-1 bg-red-650 hover:bg-red-700 text-white font-bold text-[9px] uppercase tracking-wide rounded-md border-0 cursor-pointer shadow-xs"
                              >
                                Confirm
                              </button>
                              <button
                                type="button"
                                onClick={() => setDeleteConfirmId(null)}
                                className="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-605 font-bold text-[9px] uppercase tracking-wide rounded-md border-0 cursor-pointer"
                              >
                                Cancel
                              </button>
                            </div>
                          ) : (
                            <button
                              type="button"
                              onClick={() => setDeleteConfirmId(bill.id)}
                              className="p-1.5 text-slate-400 hover:text-red-500 transition-colors rounded-sm hover:bg-red-50 border-y-0 border-x-0 cursor-pointer"
                              title="Delete ledger record"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {completedBills.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 italic">
                        No checked-out receipts to view.
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
              {/* Cashbook Intro and cumulative balance cards */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
                <div>
                  <h3 className="text-lg font-display font-extrabold text-slate-800 flex items-center gap-2">
                    <BookOpen className="h-5 w-5 text-indigo-600" />
                    Operational Cashflow Ledger
                  </h3>
                  <p className="text-xs text-slate-450 mt-1">
                    Comparison of capital generated via completed room and restaurant invoicing against operating expenditures.
                  </p>
                </div>
                
                <div className="flex items-center gap-2 shrink-0">
                  <label htmlFor="cashbookMonthSelect" className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Filter Month:</label>
                  <select
                    id="cashbookMonthSelect"
                    value={cashbookMonth}
                    onChange={(e) => setCashbookMonth(e.target.value)}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-sans text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="all">All Cashbook History</option>
                    {getAvailableMonths().map(m => {
                      const [year, month] = m.split('-');
                      const dateObj = new Date(Number(year), Number(month) - 1, 15);
                      const formattedLabel = dateObj.toLocaleDateString(undefined, { year: 'numeric', month: 'long' });
                      return (
                        <option key={m} value={m}>
                          {formattedLabel} ({m})
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>

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
                <div className="mb-4">
                  <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Chronological Cash Register</h4>
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

          {/* TAB 3: MONTH-END CLOSER & OWNER'S PROFIT DISTRIBUTION */}
          {activeTab === 'closer' && (
            <div className="space-y-6">
              
              {/* Top Selector row */}
              <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs flex flex-col md:flex-row justify-between items-stretch md:items-center gap-4">
                <div className="space-y-1">
                  <h3 className="text-base font-display font-extrabold text-slate-800 flex items-center gap-2">
                    <Wallet className="h-5 w-5 text-indigo-600" />
                    Month-End Period Closer
                  </h3>
                  <p className="text-xs text-slate-400">
                    Settle operating accounts, finalize net monthly profits, and distribute owner takeaway payouts.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <label className="text-xs font-bold text-slate-500 uppercase tracking-wider shrink-0">Select Closed Period:</label>
                  <input
                    type="month"
                    value={selectedMonth}
                    onChange={(e) => {
                      setSelectedMonth(e.target.value);
                      setSuccessMsg('');
                      setErrorMsg('');
                    }}
                    className="px-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-sans text-slate-700 outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all cursor-pointer"
                  />
                </div>
              </div>

              {/* Dynamic current closure variables */}
              {(() => {
                const isClosed = closedMonths.some(m => m.month === selectedMonth);
                const currentCloserObj = closedMonths.find(m => m.month === selectedMonth);

                return (
                  <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                    
                    {/* LEFT 7 COLS: MONTHLY METRICS AUDIT REPORT SHEET */}
                    <div className="lg:col-span-7 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-6">
                      <div className="border-b border-slate-50 pb-3">
                        <h4 className="font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-1.5">
                          <Coins className="h-4 w-4 text-emerald-500" />
                          Pre-Closure Audit Sheet: {selectedMonth}
                        </h4>
                      </div>

                      {/* Live financial summaries indicators */}
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-sans">Gross Revenues</p>
                          <p className="text-lg font-extrabold text-slate-850 mt-1.5 font-mono">
                            Rs. {monthMetrics.totalRevenue.toLocaleString()}
                          </p>
                          <div className="text-[9px] text-slate-400 mt-1.5 space-y-0.5 font-sans">
                            <div>Rooms: Rs. {monthMetrics.roomRevenue.toLocaleString()}</div>
                            <div>Food & S.C: Rs. {(monthMetrics.foodRevenue + monthMetrics.serviceCharge).toLocaleString()}</div>
                          </div>
                        </div>

                        <div className="bg-slate-50/50 p-4 rounded-xl border border-slate-100">
                          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Total Expenditures</p>
                          <p className="text-lg font-extrabold text-rose-600 mt-1.5 font-mono">
                            Rs. {monthMetrics.totalExpenses.toLocaleString()}
                          </p>
                          <span className="text-[9px] text-slate-400 mt-1.5 inline-block">
                            {monthMetrics.filteredExpenses.length} corporate receipts registered
                          </span>
                        </div>

                        <div className="bg-indigo-50/20 p-4 rounded-xl border border-indigo-100">
                          <p className="text-[10px] font-bold text-indigo-500 uppercase tracking-widest">Net Operating Profit</p>
                          <p className={`text-lg font-extrabold mt-1.5 font-mono ${monthMetrics.netProfit >= 0 ? 'text-indigo-600' : 'text-rose-600'}`}>
                            Rs. {monthMetrics.netProfit.toLocaleString()}
                          </p>
                          <span className="text-[9px] text-slate-400 mt-1.5 inline-block font-sans">
                            {monthMetrics.filteredBills.length} guest checkouts concluded
                          </span>
                        </div>
                      </div>

                      {/* Side by side transaction sub-journals */}
                      <div className="space-y-4 pt-2">
                        <h5 className="text-[10px] font-extrabold text-slate-450 uppercase tracking-wide">Closing Checklist Journal</h5>
                        
                        <div className="divide-y divide-slate-50 max-h-72 overflow-y-auto border border-slate-100 rounded-xl px-3 bg-slate-50/10">
                          {monthMetrics.filteredBills.length === 0 && monthMetrics.filteredExpenses.length === 0 ? (
                            <p className="text-center py-10 text-xs text-slate-400 italic">No ledger transaction activities recorded in {selectedMonth}.</p>
                          ) : (
                            <>
                              {monthMetrics.filteredBills.map((b: any) => (
                                <div key={b.id} className="py-2.5 flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 shrink-0" />
                                    <div>
                                      <p className="font-bold text-slate-800">{b.guestDetails?.name || 'Walk-in Guest'}</p>
                                      <p className="text-[9px] text-slate-400 font-mono">Receipt #{b.id} • checkout</p>
                                    </div>
                                  </div>
                                  <span className="font-semibold text-emerald-600 font-mono">Rs. {b.totalAmount.toLocaleString()}</span>
                                </div>
                              ))}

                              {monthMetrics.filteredExpenses.map((e: any) => (
                                <div key={e.id} className="py-2.5 flex justify-between items-center text-xs">
                                  <div className="flex items-center gap-2">
                                    <span className="h-1.5 w-1.5 rounded-full bg-rose-500 shrink-0" />
                                    <div>
                                      <p className="font-bold text-slate-800">{e.title}</p>
                                      <p className="text-[9px] text-slate-400">Expense ({e.category}) • {e.paymentMethod}</p>
                                    </div>
                                  </div>
                                  <span className="font-semibold text-rose-500 font-mono">-Rs. {e.amount.toLocaleString()}</span>
                                </div>
                              ))}
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* RIGHT 5 COLS: CLOSER ACTIONS PANEL */}
                    <div className="lg:col-span-5 space-y-6">
                      
                      {isClosed && currentCloserObj ? (
                        /* CLOSED STATE COMPLETED BOX VIEW */
                        <div className="bg-emerald-50/20 border-2 border-emerald-500/25 p-5 rounded-2xl space-y-4">
                          <div className="flex items-center gap-2 text-emerald-700">
                            <Lock className="h-5 w-5 shrink-0" />
                            <h4 className="font-bold text-sm uppercase tracking-wider">Verified Month Closed</h4>
                          </div>

                          <p className="text-xs text-slate-600 leading-relaxed">
                            This month is archived. Ledger books are finalized, and owner takeaways have been committed. Reopening the month removes the closure register.
                          </p>

                          <div className="p-3 bg-white rounded-xl border border-slate-100 divide-y divide-slate-100 text-xs">
                            <div className="py-2 flex justify-between">
                              <span className="text-slate-400">Locked Profit Net:</span>
                              <span className="font-bold text-slate-850 font-mono">Rs. {currentCloserObj.netProfit.toLocaleString()}</span>
                            </div>
                            <div className="py-2 flex justify-between">
                              <span className="text-emerald-600 font-medium">Owner Profit Takeaway:</span>
                              <span className="font-mono font-extrabold text-emerald-600">Rs. {currentCloserObj.ownerTakeaway.toLocaleString()}</span>
                            </div>
                            <div className="py-2 flex justify-between">
                              <span className="text-slate-400">Retained Drawer Reserves:</span>
                              <span className="font-bold text-slate-700 font-mono">Rs. {currentCloserObj.retainedEarnings.toLocaleString()}</span>
                            </div>
                            <div className="py-2 flex justify-between">
                              <span className="text-slate-400">Locked At:</span>
                              <span className="text-slate-500 font-mono">{new Date(currentCloserObj.closedAt).toLocaleDateString()}</span>
                            </div>
                            <div className="py-2 flex justify-between">
                              <span className="text-slate-400">Audit Remarks:</span>
                              <span className="text-slate-600 italic font-medium">{currentCloserObj.notes || 'No remarks recorded'}</span>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={() => handleDeleteClosedMonth(currentCloserObj.id)}
                            className="w-full py-2.5 px-4 bg-slate-850 hover:bg-slate-900 hover:text-red-400 text-white font-bold text-[10px] rounded-lg tracking-widest uppercase cursor-pointer transition-all border-0 shadow-xs flex items-center justify-center gap-1.5"
                          >
                            <Unlock className="h-4 w-4" />
                            Reopen Accounts & Unseal Month
                          </button>
                        </div>
                      ) : (
                        /* UNCLOSED MONTH CLOSURE FORM PANEL */
                        <form onSubmit={handleCloseMonth} className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                          <div className="flex items-center gap-2 text-slate-800">
                            <Unlock className="h-5 w-5 text-indigo-500" />
                            <h4 className="font-bold text-sm uppercase tracking-wider">Unsealed Month Balance</h4>
                          </div>

                          <p className="text-xs text-slate-400">
                            Perform physical cash drawer balancing checks, count bank reserves, then finalize owner profit withdrawal details below.
                          </p>

                          {/* Live profit calculations */}
                          <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-100 space-y-1 text-center">
                            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest">Calculated Net Operating Profit</span>
                            <h3 className={`text-xl font-extrabold tracking-tight font-mono ${monthMetrics.netProfit >= 0 ? 'text-slate-800' : 'text-rose-600'}`}>
                              Rs. {monthMetrics.netProfit.toLocaleString()}
                            </h3>
                          </div>

                          {/* Owner Takeaway Payout calculation input */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                              Owner Profit Takeaway (Payout):
                            </span>
                            <div className="relative">
                              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-bold text-xs text-slate-400 font-mono">Rs.</span>
                              <input
                                type="number"
                                required
                                min="0"
                                max={Math.max(monthMetrics.netProfit, 0) || 10000000}
                                value={ownerTakeaway}
                                onChange={(e) => setOwnerTakeaway(Number(e.target.value))}
                                className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold font-mono focus:outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all text-slate-800"
                              />
                            </div>
                            <span className="text-[10px] text-slate-400 mt-1 inline-block">
                              How much net cash profit is being paid to/withdrawn by the hotel owner.
                            </span>
                          </div>

                          {/* Retained dynamic earnings display */}
                          <div className="p-3 bg-indigo-50/10 rounded-xl border border-indigo-100 text-xs flex justify-between items-center">
                            <div>
                              <p className="font-bold text-indigo-650">Retained Business Capital</p>
                              <p className="text-[9px] text-slate-400">Kept for utility bills & startup drawer reserves.</p>
                            </div>
                            <span className="font-mono font-extrabold text-sm text-indigo-600">
                              Rs. {(monthMetrics.netProfit - ownerTakeaway).toLocaleString()}
                            </span>
                          </div>

                          {/* Remarks notes */}
                          <div className="space-y-1.5">
                            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wide block">
                              Closure Audit Remarks:
                            </span>
                            <textarea
                              rows={3}
                              value={closerNotes}
                              onChange={(e) => setCloserNotes(e.target.value)}
                              placeholder="e.g. Owner payout completed via cash drawer withdrawal. Excess cash kept to fund July electricity bills and room amenities reserves."
                              className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs outline-none focus:ring-2 focus:ring-indigo-500/10 focus:border-indigo-500 transition-all font-sans"
                            />
                          </div>

                          {successMsg && (
                            <p className="text-xs bg-emerald-50 border border-emerald-100 text-emerald-800 font-semibold p-3 rounded-lg text-center font-sans tracking-wide">
                              {successMsg}
                            </p>
                          )}

                          {errorMsg && (
                            <p className="text-xs bg-red-50 border border-red-100 text-red-750 font-semibold p-3 rounded-lg text-center font-sans">
                              {errorMsg}
                            </p>
                          )}

                          <button
                            type="submit"
                            disabled={closingLoading || monthMetrics.netProfit <= 0 && ownerTakeaway <= 0}
                            className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:bg-slate-200 disabled:text-slate-400 text-white font-bold text-[10px] rounded-lg tracking-widest uppercase cursor-pointer transition-all border-0 shadow-xs flex items-center justify-center gap-1"
                          >
                            <Lock className="h-4 w-4" />
                            {closingLoading ? 'Closing and finalizing...' : 'Seall Accounts & Lock Period'}
                          </button>
                        </form>
                      )}

                    </div>

                    {/* HISTORY LIST DIRECTORY CARD (Full width underneath) */}
                    <div className="lg:col-span-12 bg-white p-6 rounded-2xl border border-slate-100 shadow-xs space-y-4">
                      <div className="border-b border-slate-50 pb-3 flex justify-between items-center">
                        <h4 className="font-bold text-slate-800 text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2">
                          <Coins className="h-4 w-4 text-emerald-500" />
                          Historically Sealed Monthly Registers
                        </h4>
                        <span className="bg-slate-50 border border-slate-100 text-slate-400 text-[10px] font-bold px-2.5 py-1 rounded">
                          {closedMonths.length} cycles archived
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-left text-xs text-slate-705">
                          <thead>
                            <tr className="bg-slate-50 border-b border-slate-100 text-[9px] font-semibold text-slate-400 uppercase tracking-wider">
                              <th className="py-3 px-4">Calendar Month</th>
                              <th className="py-3 px-4">Month Sealed On</th>
                              <th className="py-3 px-4 font-bold text-slate-800">Total Revenue</th>
                              <th className="py-3 px-4 font-bold text-slate-800">Company Expenses</th>
                              <th className="py-3 px-4 font-bold text-slate-600">Operating Net Profit</th>
                              <th className="py-3 px-4 font-extrabold text-indigo-650">Owner Takeaway</th>
                              <th className="py-3 px-4 font-bold text-slate-500">Retained Ledger</th>
                              <th className="py-3 px-4 text-center">Unseal Account</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-50 font-sans">
                            {closedMonths.map((m) => (
                              <tr key={m.id} className="hover:bg-slate-50/20 transition-colors">
                                <td className="py-3.5 px-4 font-mono font-extrabold text-indigo-600">{m.month}</td>
                                <td className="py-3.5 px-4 text-slate-500">{new Date(m.closedAt).toLocaleDateString()}</td>
                                <td className="py-3.5 px-4 font-mono text-slate-650">Rs. {m.totalRevenue.toLocaleString()}</td>
                                <td className="py-3.5 px-4 font-mono text-slate-650">Rs. {m.totalExpenses.toLocaleString()}</td>
                                <td className="py-3.5 px-4 font-mono font-bold text-slate-850">Rs. {m.netProfit.toLocaleString()}</td>
                                <td className="py-3.5 px-4 font-mono font-bold text-emerald-600 bg-emerald-50/10">Rs. {m.ownerTakeaway.toLocaleString()}</td>
                                <td className="py-3.5 px-4 font-mono text-slate-500">Rs. {m.retainedEarnings.toLocaleString()}</td>
                                <td className="py-3.5 px-4 text-center">
                                  <button
                                    type="button"
                                    onClick={() => handleDeleteClosedMonth(m.id)}
                                    className="p-1 px-2.5 bg-slate-105 rounded hover:bg-red-50 hover:text-red-500 text-slate-400 font-bold border-0 text-[10px] uppercase transition-colors tracking-wide cursor-pointer"
                                  >
                                    Reopen
                                  </button>
                                </td>
                              </tr>
                            ))}
                            {closedMonths.length === 0 && (
                              <tr>
                                <td colSpan={8} className="py-12 text-center text-slate-400 italic">No business period closures finalized yet. Fill the closer details form above.</td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                  </div>
                );
              })()}
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
