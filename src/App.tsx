/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, Bill } from './types';
import { Login } from './components/Login';
import { Dashboard } from './components/Dashboard';
import { Rooms } from './components/Rooms';
import { Foods } from './components/Foods';
import { Guests } from './components/Guests';
import { Billing } from './components/Billing';
import { Reports } from './components/Reports';
import { UsersList } from './components/UsersList';
import { Receipt } from './components/Receipt';
import { Expenses } from './components/Expenses';
import { Settings } from './components/Settings';
import { AuditLogs } from './components/AuditLogs';
import { Logo } from './components/Logo';
import {
  Hotel,
  LogOut,
  Users,
  Utensils,
  BookOpen,
  PieChart,
  LayoutDashboard,
  ShoppingCart,
  ShieldAlert,
  Menu,
  X,
  Wallet,
  Sliders,
  ScrollText
} from 'lucide-react';

export default function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<string>('dashboard');
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
  }, [activeTab]);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [expensesAction, setExpensesAction] = useState<string | null>(null);
  
  // Dashboard fresh fetch trigger
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Receipt Overlay
  const [activeReceiptBill, setActiveReceiptBill] = useState<Bill | null>(null);

  // Live Ticker Clock State
  const [currentTime, setCurrentTime] = useState(new Date());

  // Session check on Mount
  useEffect(() => {
    const cached = localStorage.getItem('hotel_pos_user');
    if (cached) {
      try {
        setCurrentUser(JSON.parse(cached));
      } catch (e) {
        localStorage.removeItem('hotel_pos_user');
      }
    }
  }, []);

  // Sync clock ticker every second
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const handleLoginSuccess = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem('hotel_pos_user', JSON.stringify(user));
    setActiveTab('dashboard');
  };

  const handleLogout = () => {
    setCurrentUser(null);
    localStorage.removeItem('hotel_pos_user');
  };

  const handleNavigateTab = (tab: string, param?: string) => {
    setActiveTab(tab);
    if (tab === 'expenses' && param) {
      setExpensesAction(param);
    } else {
      setExpensesAction(null);
    }
    setRefreshTrigger(prev => prev + 1);
  };

  if (!currentUser) {
    return <Login onLoginSuccess={handleLoginSuccess} />;
  }

  const isAdmin = currentUser.role === 'admin' || currentUser.role === 'manager';
  const isAdminOnly = currentUser.role === 'admin';

  // Dynamic capability check based on active role and permission toggles
  const canViewReports = currentUser.role === 'admin' || 
    (currentUser.role === 'manager' && settings?.allowManagerViewReports !== false);
  const canViewUsers = currentUser.role === 'admin' || 
    (currentUser.role === 'manager' && settings?.allowManagerUserEdit !== false);
  const canViewExpenses = currentUser.role === 'admin' || 
    currentUser.role === 'manager' || 
    (currentUser.role === 'receptionist' && settings?.allowReceptionistAddExpenses === true);

  // Format details for live clock
  const formatDateString = (d: Date) => {
    return d.toLocaleDateString(undefined, {
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  const formatTimeString = (d: Date) => {
    return d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
  };

  // Determine active view label for top header
  const getViewTitle = () => {
    switch (activeTab) {
      case 'dashboard': return 'Reception Dashboard';
      case 'billing': return 'Billing & POS Terminal';
      case 'rooms': return 'Room Stock Registry';
      case 'foods': return 'Restaurant Menu Kitchen';
      case 'guests': return 'Guest Registration Database';
      case 'reports': return 'Admin Analytics & Auditing';
      case 'users': return 'Frontdesk Staff Registry';
      case 'expenses': return 'Operating Outflows Ledger';
      case 'settings': return 'System Configurations & Privileges';
      case 'logs': return 'System Audit Logs';
      default: return 'Hotel Terminal Console';
    }
  };

  // Navigation config array for high-density rendering
  const navItems = [
    { id: 'dashboard', label: 'Dash', icon: LayoutDashboard },
    { id: 'billing', label: 'POS', icon: ShoppingCart },
    { id: 'rooms', label: 'Rooms', icon: Hotel },
    { id: 'foods', label: 'Kitchen', icon: Utensils },
    ...(canViewReports ? [
      { id: 'reports', label: 'Reports', icon: PieChart }
    ] : []),
    ...(canViewUsers ? [
      { id: 'users', label: 'Staff', icon: Users }
    ] : []),
    ...(canViewExpenses ? [
      { id: 'expenses', label: 'Expenses', icon: Wallet }
    ] : []),
    ...(isAdminOnly ? [
      { id: 'logs', label: 'Logs', icon: ScrollText },
      { id: 'settings', label: 'Settings', icon: Sliders }
    ] : [])
  ];

  return (
    <div className="h-screen w-screen bg-slate-100 overflow-hidden flex flex-col md:flex-row relative text-slate-850 font-sans">
      
      {/* Mobile Backdrop Overlay */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)}
          className="md:hidden fixed inset-0 bg-slate-950/60 z-30 transition-opacity duration-250 cursor-pointer"
        />
      )}

      {/* Top Mobile Bar */}
      <div className="md:hidden no-print h-14 bg-slate-900 px-4 flex items-center justify-between text-white shrink-0 border-b border-slate-850">
        <div className="flex items-center gap-2">
          <Logo size={24} showText={false} className="text-white bg-slate-800 rounded-full p-0.5 border border-slate-700" />
          <span className="font-display font-semibold tracking-wider text-xs uppercase text-indigo-100">Mount Ash Villa Terminal</span>
        </div>
        <button
          onClick={() => setIsSidebarOpen(!isSidebarOpen)}
          className="p-1.5 hover:bg-slate-800 rounded transition-colors"
        >
          {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
        </button>
      </div>

      {/* COMPACT SIDEBAR NAVIGATION PANEL (High Density: w-16 or w-20) */}
      <aside
        className={`fixed md:sticky top-14 md:top-0 bottom-0 left-0 w-20 bg-slate-900 border-r border-slate-800 text-slate-300 z-40 transition-all duration-250 transform md:transform-none no-print flex flex-col items-center py-3 shrink-0 ${
          isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
        }`}
      >
        
        {/* Brand App Monogram */}
        <div className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-6 shrink-0 transition-transform hover:scale-105 cursor-pointer border border-slate-700/50 shadow-inner" onClick={() => handleNavigateTab('dashboard')}>
          <Logo size={42} showText={false} className="text-slate-950" />
        </div>

        {/* Dynamic Compact Nav Items */}
        <nav className="flex-1 w-full px-2 space-y-3 flex flex-col items-center overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;
            return (
              <button
                key={item.id}
                onClick={() => {
                  handleNavigateTab(item.id);
                  setIsSidebarOpen(false);
                }}
                title={item.label}
                className={`w-14 h-14 flex flex-col items-center justify-center rounded-lg transition-all border-0 ${
                  isActive
                    ? 'bg-slate-800 text-indigo-400 border-l-2 border-indigo-500'
                    : 'text-slate-400 hover:bg-slate-800/60 hover:text-white'
                }`}
              >
                <Icon className="h-5 w-5 shrink-0" />
                <span className="text-[9px] font-bold uppercase tracking-wider block mt-1 leading-none text-center truncate w-full">
                  {item.label}
                </span>
              </button>
            );
          })}
        </nav>

        {/* Foot of sidebar info / Sign out */}
        <div className="w-full px-2 pt-3 border-t border-slate-800 shrink-0 space-y-3">
          {/* Avatar Monogram */}
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700/60 flex items-center justify-center mx-auto text-xs font-bold text-indigo-400" title={`Active operator: ${currentUser.name}`}>
            {currentUser.name.substring(0, 2).toUpperCase()}
          </div>
          
          <button
            onClick={handleLogout}
            title="Sign Out Session"
            className="w-14 h-10 mx-auto flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-md transition-colors border-0"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>

      </aside>

      {/* RICH CONTAINER COLUMN: HEADER + DATA CONTENT VIEWPORT + FOOTER */}
      <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
        
        {/* PREMIUM HIGH-DENSITY HEADER BAR */}
        <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 no-print">
          
          {/* Left Portion of Header: Section Title & Micro Status Tags */}
          <div className="flex items-center gap-4 min-w-0">
            <h1 className="font-display font-bold text-base md:text-lg text-slate-850 truncate">
              {getViewTitle()}
            </h1>
            
            {/* High Density Badging */}
            <div className="flex gap-2 shrink-0">
              <span className="hidden sm:inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-wider border border-emerald-100">
                System Online
              </span>
              <span className="hidden sm:inline-flex px-2 py-0.5 bg-slate-50 text-slate-500 text-[10px] font-bold rounded uppercase tracking-wider italic border border-slate-100">
                v1.0.4 - Developer Edition
              </span>
            </div>
          </div>

          {/* Right Portion of Header: Dynamic Date Clock Ticker */}
          <div className="text-right shrink-0">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">
              {formatDateString(currentTime)}
            </p>
            <p className="text-[10px] text-slate-400 font-mono mt-0.5 font-semibold">
              {formatTimeString(currentTime)}
            </p>
          </div>

        </header>

        {/* CONTENT ENVELOPE SCROLL AREA */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f1f5f9]">
          <div className="max-w-7xl mx-auto h-full">
            
            {activeTab === 'dashboard' && (
              <Dashboard
                currentUser={currentUser}
                onNavigateTab={handleNavigateTab}
                refreshTrigger={refreshTrigger}
              />
            )}

            {activeTab === 'billing' && (
              <Billing
                onShowReceipt={(bill) => setActiveReceiptBill(bill)}
                onRefreshStats={() => setRefreshTrigger(p => p + 1)}
              />
            )}

            {activeTab === 'rooms' && (
              <Rooms
                currentUser={currentUser}
                onRefreshStats={() => setRefreshTrigger(p => p + 1)}
              />
            )}

            {activeTab === 'foods' && (
              <Foods currentUser={currentUser} />
            )}

            {activeTab === 'reports' && canViewReports && (
              <Reports />
            )}

            {activeTab === 'users' && canViewUsers && (
              <UsersList currentUser={currentUser} />
            )}

            {activeTab === 'expenses' && (
              <Expenses
                currentUser={currentUser}
                initialAction={expensesAction}
                onClearAction={() => setExpensesAction(null)}
                onClose={() => handleNavigateTab('dashboard')}
                onNavigateTab={handleNavigateTab}
              />
            )}

            {activeTab === 'settings' && isAdminOnly && (
              <Settings currentUser={currentUser} />
            )}

            {activeTab === 'logs' && isAdminOnly && (
              <AuditLogs />
            )}

          </div>
        </main>

        {/* SYSTEM STATUS FOOTER (High-Density Telemetry Indicator) */}
        <footer className="h-8 bg-slate-100 border-t border-slate-200 flex items-center justify-between px-4 text-[10px] text-slate-500 shrink-0 no-print">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> 
              Frontdesk Printer: Ready
            </span>
            <span className="hidden sm:flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span> 
              SQLite State Sync: Connected
            </span>
          </div>

          <div>
            Client Authentcated: <span className="font-mono font-bold text-slate-700 lowercase">{currentUser.username}</span> 
            <span className="ml-1 text-slate-400 uppercase text-[9px] font-bold">({currentUser.role})</span>
          </div>
        </footer>

      </div>

      {/* THERMAL PRINTER OVERLAY RECEIPT */}
      {activeReceiptBill && (
        <Receipt
          bill={activeReceiptBill}
          onClose={() => {
            setActiveReceiptBill(null);
            setRefreshTrigger(p => p + 1);
          }}
        />
      )}

    </div>
  );
}
