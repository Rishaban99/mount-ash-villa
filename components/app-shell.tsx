'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Hotel,
  LogOut,
  Users,
  Utensils,
  PieChart,
  LayoutDashboard,
  ShoppingCart,
  Menu,
  X,
  Wallet,
  Sliders,
  ScrollText,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import { useAuth } from '@/components/auth-provider';
import { ReceiptProvider } from '@/components/receipt-provider';
import { hasPermission } from '@/lib/permissions';
import type { SystemSettings } from '@/lib/types';

const viewTitles: Record<string, string> = {
  dashboard: 'Reception Dashboard',
  billing: 'Billing & POS Terminal',
  rooms: 'Room Stock Registry',
  foods: 'Restaurant Menu Kitchen',
  guests: 'Guest Registration Database',
  reports: 'Admin Analytics & Auditing',
  users: 'Frontdesk Staff Registry',
  expenses: 'Operating Outflows Ledger',
  settings: 'System Configurations & Privileges',
  logs: 'System Audit Logs',
};

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { user: currentUser, loading, logout } = useAuth();
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  const activeTab = pathname.split('/')[1] || 'dashboard';

  useEffect(() => {
    const cached = localStorage.getItem('system_settings_cache');
    if (cached) {
      try {
        setSettings(JSON.parse(cached));
      } catch {}
    }
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings', { credentials: 'include' });
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          localStorage.setItem('system_settings_cache', JSON.stringify(data));
        }
      } catch {}
    };
    fetchSettings();
  }, [pathname]);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  if (loading || !currentUser) {
    return (
      <div className="h-screen w-screen flex items-center justify-center bg-slate-100">
        <div className="w-8 h-8 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
      </div>
    );
  }

  const isAdminOnly = currentUser.role === 'admin';
  const canViewReports = hasPermission(currentUser.role, 'allowManagerViewReports', settings);
  const canViewUsers = hasPermission(currentUser.role, 'allowManagerUserEdit', settings);
  const canViewExpenses =
    currentUser.role === 'admin' ||
    currentUser.role === 'manager' ||
    hasPermission(currentUser.role, 'allowReceptionistAddExpenses', settings);
  const canViewRooms =
    currentUser.role === 'admin' ||
    currentUser.role === 'receptionist' ||
    hasPermission(currentUser.role, 'allowManagerManageRooms', settings);

  const formatDateString = (d: Date) =>
    d.toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });

  const formatTimeString = (d: Date) =>
    d.toLocaleTimeString(undefined, {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });

  const navItems = [
    { id: 'dashboard', label: 'Dash', icon: LayoutDashboard },
    { id: 'billing', label: 'POS', icon: ShoppingCart },
    ...(canViewRooms ? [{ id: 'rooms', label: 'Rooms', icon: Hotel }] : []),
    { id: 'foods', label: 'Kitchen', icon: Utensils },
    ...(canViewReports ? [{ id: 'reports', label: 'Reports', icon: PieChart }] : []),
    ...(canViewUsers ? [{ id: 'users', label: 'Staff', icon: Users }] : []),
    ...(canViewExpenses ? [{ id: 'expenses', label: 'Expenses', icon: Wallet }] : []),
    ...(isAdminOnly
      ? [
          { id: 'logs', label: 'Logs', icon: ScrollText },
          { id: 'settings', label: 'Settings', icon: Sliders },
        ]
      : []),
  ];

  return (
    <ReceiptProvider>
      <div className="h-screen w-screen bg-slate-100 overflow-hidden flex flex-col md:flex-row relative text-slate-850 font-sans">
        {isSidebarOpen && (
          <div
            onClick={() => setIsSidebarOpen(false)}
            className="md:hidden fixed inset-0 bg-slate-950/60 z-30 transition-opacity duration-250 cursor-pointer"
          />
        )}

        <div className="md:hidden no-print h-14 bg-slate-900 px-4 flex items-center justify-between text-white shrink-0 border-b border-slate-850">
          <div className="flex items-center gap-2">
            <Logo size={24} showText={false} className="text-white bg-slate-800 rounded-full p-0.5 border border-slate-700" />
            <span className="font-display font-semibold tracking-wider text-xs uppercase text-indigo-100">
              Mount Ash Villa Terminal
            </span>
          </div>
          <button
            onClick={() => setIsSidebarOpen(!isSidebarOpen)}
            className="p-1.5 hover:bg-slate-800 rounded transition-colors"
          >
            {isSidebarOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>

        <aside
          className={`fixed md:sticky top-14 md:top-0 bottom-0 left-0 w-20 bg-slate-900 border-r border-slate-800 text-slate-300 z-40 transition-all duration-250 transform md:transform-none no-print flex flex-col items-center py-3 shrink-0 ${
            isSidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'
          }`}
        >
          <Link
            href="/dashboard"
            className="w-12 h-12 bg-white rounded-full flex items-center justify-center mb-6 shrink-0 transition-transform hover:scale-105 cursor-pointer border border-slate-700/50 shadow-inner"
          >
            <Logo size={42} showText={false} className="text-slate-950" />
          </Link>

          <nav className="flex-1 w-full px-2 space-y-3 flex flex-col items-center overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              const isActive = activeTab === item.id;
              return (
                <Link
                  key={item.id}
                  href={`/${item.id}`}
                  onClick={() => setIsSidebarOpen(false)}
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
                </Link>
              );
            })}
          </nav>

          <div className="w-full px-2 pt-3 border-t border-slate-800 shrink-0 space-y-3">
            <div
              className="w-10 h-10 rounded-full bg-slate-800 border border-slate-700/60 flex items-center justify-center mx-auto text-xs font-bold text-indigo-400"
              title={`Active operator: ${currentUser.name}`}
            >
              {currentUser.name.substring(0, 2).toUpperCase()}
            </div>
            <button
              onClick={logout}
              title="Sign Out Session"
              className="w-14 h-10 mx-auto flex items-center justify-center text-slate-400 hover:text-rose-400 hover:bg-rose-950/20 rounded-md transition-colors border-0"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </aside>

        <div className="flex-1 min-w-0 flex flex-col overflow-hidden">
          <header className="h-14 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shrink-0 no-print">
            <div className="flex items-center gap-4 min-w-0">
              <h1 className="font-display font-bold text-base md:text-lg text-slate-850 truncate">
                {viewTitles[activeTab] || 'Hotel Terminal Console'}
              </h1>
              <div className="flex gap-2 shrink-0">
                <span className="hidden sm:inline-flex px-2 py-0.5 bg-emerald-50 text-emerald-700 text-[10px] font-bold rounded uppercase tracking-wider border border-emerald-100">
                  System Online
                </span>
              </div>
            </div>
            <div className="text-right shrink-0">
              <p className="text-xs font-bold text-slate-700 uppercase tracking-tight">
                {formatDateString(currentTime)}
              </p>
              <p className="text-[10px] text-slate-400 font-mono mt-0.5 font-semibold">
                {formatTimeString(currentTime)}
              </p>
            </div>
          </header>

          <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-[#f1f5f9]">
            <div className="max-w-7xl mx-auto h-full">{children}</div>
          </main>

          <footer className="h-8 bg-slate-100 border-t border-slate-200 flex items-center justify-between px-4 text-[10px] text-slate-500 shrink-0 no-print">
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                Frontdesk Printer: Ready
              </span>
              <span className="hidden sm:flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
                MongoDB State Sync: Connected
              </span>
            </div>
            <div>
              Client Authenticated:{' '}
              <span className="font-mono font-bold text-slate-700 lowercase">{currentUser.username}</span>
              <span className="ml-1 text-slate-400 uppercase text-[9px] font-bold">({currentUser.role})</span>
            </div>
          </footer>
        </div>
      </div>
    </ReceiptProvider>
  );
}
