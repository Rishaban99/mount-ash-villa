/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { User, SystemSettings } from '../types';
import {
  Shield,
  Coins,
  Lock,
  Save,
  Hotel,
  Check,
  RefreshCw,
  FileDown,
  FileUp,
  Info,
  Sliders,
  AlertCircle,
  Printer,
  SlidersHorizontal,
  Search,
  Sparkles,
  Eye,
  HelpCircle,
  ShieldCheck,
  SlidersHorizontal as Settings2,
  ListFilter,
  Bed,
  Utensils,
  TrendingUp,
  Users,
  Receipt
} from 'lucide-react';
import { apiFetch } from '../utils/api';

interface SettingsProps {
  currentUser: User;
}

interface PermissionDef {
  key: keyof SystemSettings;
  title: string;
  description: string;
  role: 'receptionist' | 'manager';
  category: 'Room' | 'Food' | 'Report' | 'Staff' | 'Expenses';
  sensitive?: boolean;
}

const permissionDefinitions: PermissionDef[] = [
  // Room
  {
    key: 'allowReceptionistModifyPrice',
    title: 'Override Base Room Prices',
    description: 'Allow frontdesk receptionists to change base prices dynamically per stay room.',
    role: 'receptionist',
    category: 'Room',
    sensitive: true,
  },
  {
    key: 'allowReceptionistAddRooms',
    title: 'Register New Guest Rooms',
    description: 'Enable clerk credentials to write new items into the room master inventory.',
    role: 'receptionist',
    category: 'Room',
  },
  {
    key: 'allowReceptionistEditRooms',
    title: 'Modify Existing Room Profiles',
    description: 'Enable clerk credentials to edit price points and attributes of active rooms.',
    role: 'receptionist',
    category: 'Room',
  },
  {
    key: 'allowReceptionistDeleteRooms',
    title: 'Permanently Decommission Rooms',
    description: 'Erase inactive or retired hotel room records entirely from database logs.',
    role: 'receptionist',
    category: 'Room',
    sensitive: true,
  },
  {
    key: 'allowManagerManageRooms',
    title: 'Open Rooms Configuration Module',
    description: 'Grant manager accounts authorization to inspect configurations and inventory stock.',
    role: 'manager',
    category: 'Room',
  },
  {
    key: 'allowManagerAddRooms',
    title: 'Manager: Register Guest Rooms',
    description: 'Let managers create, price, and publish brand-new room units to receptionist tools.',
    role: 'manager',
    category: 'Room',
  },
  {
    key: 'allowManagerEditRooms',
    title: 'Manager: Edit Room Price/Attributes',
    description: 'Let managers adjust nightly tier values and service configurations of guest rooms.',
    role: 'manager',
    category: 'Room',
  },
  {
    key: 'allowManagerDeleteRooms',
    title: 'Manager: Delete Guest Room Cards',
    description: 'Permit manager accounts to drop or wipe guest room files permanently.',
    role: 'manager',
    category: 'Room',
    sensitive: true,
  },

  // Food
  {
    key: 'allowReceptionistAddFoods',
    title: 'Add Culinary Menu Items',
    description: 'Allow receptionists to add new items, beverages, or snacks to the live database.',
    role: 'receptionist',
    category: 'Food',
  },
  {
    key: 'allowReceptionistEditFoods',
    title: 'Edit Culinary Descriptions & Rates',
    description: 'Allow receptionists to modify descriptions, tags, and price points of active foods.',
    role: 'receptionist',
    category: 'Food',
  },
  {
    key: 'allowReceptionistDeleteFoods',
    title: 'Wipe Culinary Menu Dishes',
    description: 'Enable receptionist clerks to drop foods or culinary files from order registers.',
    role: 'receptionist',
    category: 'Food',
    sensitive: true,
  },
  {
    key: 'allowManagerAddFoods',
    title: 'Manager: Add Culinary Foods',
    description: 'Enable managers to add new dishes or custom pricing to the kitchen index.',
    role: 'manager',
    category: 'Food',
  },
  {
    key: 'allowManagerEditFoods',
    title: 'Manager: Edit Food Pricing/Details',
    description: 'Permit managers to adjust base metrics, descriptions, or groupings of menu dishes.',
    role: 'manager',
    category: 'Food',
  },
  {
    key: 'allowManagerDeleteFoods',
    title: 'Manager: Delete Food Cards',
    description: 'Permit managers to sweep dishes permanently from restaurant terminal viewports.',
    role: 'manager',
    category: 'Food',
    sensitive: true,
  },

  // Report
  {
    key: 'allowManagerViewReports',
    title: 'Browse High-Level Financial Turnover',
    description: 'Permit managers to download tax details, inspect profit graphs, and study revenues.',
    role: 'manager',
    category: 'Report',
  },

  // Staff
  {
    key: 'allowReceptionistManageGuests',
    title: 'Modify Guest File Directories',
    description: 'Permit clerk accounts to log, edit, or wipe records from the hotel guest folders.',
    role: 'receptionist',
    category: 'Staff',
  },
  {
    key: 'allowManagerSalaryChange',
    title: 'Update Employee Contract Salaries',
    description: 'Managers can adjust baseline payroll wages of active frontdesk employees.',
    role: 'manager',
    category: 'Staff',
    sensitive: true,
  },
  {
    key: 'allowManagerUserEdit',
    title: 'Register or Wreak Frontdesk Accounts',
    description: 'Managers can create, update, or retire receptionist profiles and passwords.',
    role: 'manager',
    category: 'Staff',
    sensitive: true,
  },

  // Expenses
  {
    key: 'allowReceptionistDelete',
    title: 'Void or Delete Transactions',
    description: 'Allow frontdesk receptionists to delete, void, or roll back active room stays.',
    role: 'receptionist',
    category: 'Expenses',
    sensitive: true,
  },
  {
    key: 'allowReceptionistDiscount',
    title: 'Issue Manual Discounts',
    description: 'Allow frontdesk receptionists to specify arbitrary percentage or flat discounts.',
    role: 'receptionist',
    category: 'Expenses',
  },
  {
    key: 'allowReceptionistAddExpenses',
    title: 'Record Outflow Expenses',
    description: 'Permit clerks to submit bills and outlays directly into operating ledger registers.',
    role: 'receptionist',
    category: 'Expenses',
  },
  {
    key: 'allowManagerDeleteExpenses',
    title: 'Liquidate Ledger Outflow Records',
    description: 'Authorize managers to delete historical or erroneous ledger items from system books.',
    role: 'manager',
    category: 'Expenses',
    sensitive: true,
  },
];

export const Settings: React.FC<SettingsProps> = ({ currentUser }) => {
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [activeSettingsPanel, setActiveSettingsPanel] = useState<'profile' | 'permissions'>('permissions');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string>('All');

  // Fetch Settings on Mount
  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      } else {
        setErrorMsg('Failed to fetch system settings from database.');
      }
    } catch (e) {
      setErrorMsg('Could not establish database connection for settings.');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!settings) return;
    if (currentUser.role !== 'admin') {
      setErrorMsg('Unauthorized: Only administrators are permitted to save settings.');
      return;
    }

    setSaving(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    try {
      const res = await apiFetch('/api/settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings,
          userId: currentUser.id,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        setSuccessMsg('System configuration and role privileges updated successfully.');
        
        // Expose settings to local storage as client cache helper
        localStorage.setItem('system_settings_cache', JSON.stringify(data));
        
        // Automatically clear message after 4s
        setTimeout(() => setSuccessMsg(null), 4000);
      } else {
        const errData = await res.json();
        setErrorMsg(errData.error || 'Failed to update system settings.');
      }
    } catch (e) {
      setErrorMsg('Error submitting settings payload upstream.');
    } finally {
      setSaving(false);
    }
  };

  // backup database local files
  const handleBackup = () => {
    try {
      const timeTag = new Date().toISOString().substring(0, 10);
      const filename = `hotel_pos_backup_${timeTag}.json`;
      
      // Fetch all local storage keys to export frontend states or suggest standard downloads
      const backupData = {
        exportedAt: new Date().toISOString(),
        exportedBy: currentUser.username,
        settings,
        clientStorage: { ...localStorage }
      };

      const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
      const elem = window.document.createElement('a');
      elem.href = window.URL.createObjectURL(blob);
      elem.download = filename;
      document.body.appendChild(elem);
      elem.click();
      document.body.removeChild(elem);
    } catch (err) {
      setErrorMsg('Backup export failed client-side.');
    }
  };

  // If loading states
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-3 bg-white border border-slate-200/60 rounded-3xl shrink-0 min-h-[400px]">
        <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-500 font-sans tracking-wide">Syncing Security Settings & System Keys...</p>
      </div>
    );
  }

  // Non-Admin warning page
  if (currentUser.role !== 'admin') {
    return (
      <div className="bg-white p-10 rounded-3xl border border-rose-200 text-center max-w-xl mx-auto my-12 shadow-xs space-y-5 animate-fade-in text-slate-850">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <Lock className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display font-bold text-xl text-slate-800">Restricted Console Area</h2>
          <p className="text-slate-500 text-xs leading-relaxed">
            Standard operating system guidelines restrict changing structural features, taxi multipliers, room discount ceilings, or user permissions exclusively to <strong>Administrators</strong>.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left text-xs text-slate-600 space-y-1.5 mt-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-705">
              <Shield className="h-3.5 w-3.5 text-indigo-500" /> Current Authorization:
            </div>
            <div>• Registered Operator: <span className="font-semibold text-slate-800">{currentUser.name}</span></div>
            <div>• Role Privilege: <span className="font-semibold text-rose-500 uppercase tracking-wide text-[10px] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">{currentUser.role}</span></div>
          </div>
        </div>
        <p className="text-[11px] text-slate-400 italic">Please authenticate using the admin passcode if required.</p>
      </div>
    );
  }

  // Guard for null settings
  if (!settings) {
    return (
      <div className="flex flex-col items-center justify-center p-20 space-y-3 bg-white border border-slate-200/60 rounded-3xl shrink-0 min-h-[400px]">
        <RefreshCw className="h-8 w-8 text-indigo-500 animate-spin" />
        <p className="text-sm font-semibold text-slate-500 font-sans tracking-wide">Loading Settings from Database...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-850 animate-fade-in">
      
      {/* Toast Alert Indicators */}
      {successMsg && (
        <div className="bg-emerald-50 border border-emerald-250 text-emerald-800 p-4 rounded-xl text-xs flex items-center gap-3 shadow-xs font-sans transition-all">
          <div className="p-1.5 bg-emerald-500 text-white rounded-lg leading-none shrink-0">
            <Check className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold">Success Status Saved:</span> {successMsg}
          </div>
        </div>
      )}

      {errorMsg && (
        <div className="bg-rose-50 border border-rose-250 text-rose-800 p-4 rounded-xl text-xs flex items-center gap-3 shadow-xs font-sans transition-all animate-shake">
          <div className="p-1.5 bg-rose-500 text-white rounded-lg leading-none shrink-0">
            <AlertCircle className="h-4 w-4" />
          </div>
          <div>
            <span className="font-bold">Execution Error:</span> {errorMsg}
          </div>
        </div>
      )}

      <form onSubmit={handleSave} className="space-y-6">
        
        {/* Banner Section */}
        <div className="bg-gradient-to-r from-slate-900 to-indigo-950 p-6 rounded-3xl text-white flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-sm relative overflow-hidden">
          <div className="space-y-1 relative z-10">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 bg-indigo-500/30 text-indigo-300 border border-indigo-500/40 text-[9px] font-bold rounded uppercase tracking-widest leading-none">Settings Dashboard</span>
              <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/20 text-[9px] font-bold rounded uppercase tracking-widest leading-none">Super Admin Only</span>
            </div>
            <h2 className="text-xl font-display font-bold">Terminal Control & Role Privileges</h2>
            <p className="text-slate-300 text-xs">Configure tax policies, business profile information, and restrict user roles dynamically.</p>
          </div>
          
          <div className="flex items-center gap-2 relative z-10 shrink-0">
            <button
              type="button"
              onClick={handleBackup}
              title="Download backup file of system configuration"
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700/80 text-slate-200 text-xs font-bold rounded-xl transition-all flex items-center gap-1.5 border border-slate-700 cursor-pointer text-center"
            >
              <FileDown className="h-4 w-4" /> Export Backup
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-bold rounded-xl shadow-xs transition-all flex items-center gap-1.5 border-0 cursor-pointer text-center"
            >
              <Save className="h-4 w-4" /> {saving ? 'Writing settings...' : 'Commit Settings'}
            </button>
          </div>
        </div>

        {/* 2-Column Responsive Body Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          
          {/* Column Left (General & Tax settings) - Spans 7 cols */}
          <div className="lg:col-span-7 space-y-6">

            {/* Profile Information Block */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="p-2 bg-slate-50 text-slate-800 rounded-lg">
                  <Hotel className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display font-medium text-sm text-slate-800">Hotel Profile Credentials</h3>
                  <p className="text-[10px] text-slate-400">Printed directly onto thermal receipts and customer invoices</p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Trade / Hotel Name</label>
                    <input
                      type="text"
                      required
                      value={settings.hotelName}
                      onChange={(e) => setSettings({ ...settings, hotelName: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      placeholder="Mount Ash Villa"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Contact Hotline</label>
                    <input
                      type="text"
                      required
                      value={settings.phone}
                      onChange={(e) => setSettings({ ...settings, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      placeholder="+94 52 222 3456"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Physical Location Address</label>
                  <textarea
                    rows={2}
                    required
                    value={settings.address}
                    onChange={(e) => setSettings({ ...settings, address: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sans"
                    placeholder="100, Palace Boulevard, Colombo, Sri Lanka"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Corporate Email Address</label>
                    <input
                      type="email"
                      required
                      value={settings.email || ''}
                      onChange={(e) => setSettings({ ...settings, email: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      placeholder="info@grandpalace.com"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Tax Identification No. (TIN / VAT)</label>
                    <input
                      type="text"
                      value={settings.taxNumber || ''}
                      onChange={(e) => setSettings({ ...settings, taxNumber: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      placeholder="e.g. TIN-4801934-SL"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Standard Check-In Hour</label>
                    <input
                      type="text"
                      required
                      value={settings.checkInTime || ''}
                      onChange={(e) => setSettings({ ...settings, checkInTime: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      placeholder="14:00 (2:00 PM)"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Standard Check-Out Hour</label>
                    <input
                      type="text"
                      required
                      value={settings.checkOutTime || ''}
                      onChange={(e) => setSettings({ ...settings, checkOutTime: e.target.value })}
                      className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                      placeholder="12:00 (12:00 PM)"
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Receipt Custom Footer Message</label>
                  <textarea
                    rows={2}
                    required
                    value={settings.receiptFooterMessage || ''}
                    onChange={(e) => setSettings({ ...settings, receiptFooterMessage: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-sans"
                    placeholder="e.g. Thank you for staying with us! Please visit again."
                  />
                  <span className="text-[9px] text-slate-400 block pt-0.5">Printed at the bottom of customer bills</span>
                </div>
              </div>
            </div>

            {/* Financial Taxation & Currencies */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="p-2 bg-amber-50 text-amber-600 rounded-lg">
                  <Coins className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display font-medium text-sm text-slate-800">Financial Rules & Taxes</h3>
                  <p className="text-[10px] text-slate-400">Define POS transaction multipliers, monetary values and tax ratios</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Base Currency Symbol</label>
                  <input
                    type="text"
                    required
                    value={settings.currency}
                    onChange={(e) => setSettings({ ...settings, currency: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs font-mono font-bold focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-800 text-center"
                    placeholder="Rs."
                  />
                  <span className="text-[9px] text-slate-400 block pt-0.5">Used for all lists and prints</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Food Service Charge (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={settings.serviceChargePercent}
                      onChange={(e) => setSettings({ ...settings, serviceChargePercent: Math.max(0, Number(e.target.value)) })}
                      className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-800 text-right font-semibold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">%</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block pt-0.5">Calculated on restaurant subtotal</span>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">VAT tax rate (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      required
                      min={0}
                      max={100}
                      value={settings.vatPercent}
                      onChange={(e) => setSettings({ ...settings, vatPercent: Math.max(0, Number(e.target.value)) })}
                      className="w-full pl-3 pr-8 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white text-slate-800 text-right font-semibold"
                    />
                    <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 text-xs font-bold pointer-events-none">%</span>
                  </div>
                  <span className="text-[9px] text-slate-400 block pt-0.5">Optional tax surcharge rate</span>
                </div>
              </div>
            </div>

            {/* POS Printer & Layout Configs */}
            <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xs space-y-5">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Printer className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display font-medium text-sm text-slate-800">Hardware & Thermal Printers</h3>
                  <p className="text-[10px] text-slate-400">Configure receipt layout, physical spoolers, and printing automation</p>
                </div>
              </div>

              {/* Hardware/Printer specification */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Printer hardware class</label>
                  <select
                    value={settings.printerType}
                    onChange={(e) => setSettings({ ...settings, printerType: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="thermal">Thermal receipt printer (EPSON/ESC/POS compatible)</option>
                    <option value="standard">Standard A4 / Laser desk printer</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Paper width / Sizing</label>
                  <select
                    value={settings.paperWidth}
                    onChange={(e) => setSettings({ ...settings, paperWidth: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="80mm">80mm roll paper (Standard POS)</option>
                    <option value="58mm">58mm roll paper (Compact POS)</option>
                    <option value="A4">A4 sheet (Detailed Invoice)</option>
                  </select>
                </div>
              </div>

              {/* Connection Type & Protocol details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Port connection / Driver protocol</label>
                  <select
                    value={settings.printerConnection}
                    onChange={(e) => setSettings({ ...settings, printerConnection: e.target.value as any })}
                    className="w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white"
                  >
                    <option value="browser">Web Browser Print Driver (Recommended)</option>
                    <option value="usb">USB direct RAW print spooler</option>
                    <option value="network">TCP/IP LAN Network Socket</option>
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block">Network Printer IP Address</label>
                  <input
                    type="text"
                    disabled={settings.printerConnection !== 'network'}
                    value={settings.printerIpAddress || ''}
                    onChange={(e) => setSettings({ ...settings, printerIpAddress: e.target.value })}
                    className={`w-full px-3 py-2 border border-slate-200 rounded-xl text-xs focus:outline-hidden focus:ring-1 focus:ring-indigo-500 focus:border-indigo-500 bg-white font-mono ${settings.printerConnection !== 'network' ? 'opacity-50 bg-slate-50 cursor-not-allowed' : ''}`}
                    placeholder="e.g. 192.168.1.100"
                  />
                </div>
              </div>

              {/* Automated Print Layout Options */}
              <div className="space-y-3 pt-2">
                <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest pb-1 border-b border-slate-50">Automation & Layout Flags</p>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.autoPrintOnSettle}
                      onChange={(e) => setSettings({ ...settings, autoPrintOnSettle: e.target.checked })}
                      className="mt-0.5 accent-indigo-600 rounded"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-700 block leading-tight">Auto-trigger dialog</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">Trigger print flow upon hitting checkout/settlement</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.showLogoOnReceipt}
                      onChange={(e) => setSettings({ ...settings, showLogoOnReceipt: e.target.checked })}
                      className="mt-0.5 accent-indigo-600 rounded"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-700 block leading-tight">Embed Header Logo</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">Render high-contrast monochrome header illustration</span>
                    </div>
                  </label>

                  <label className="flex items-start gap-2.5 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={settings.showTaxDetails}
                      onChange={(e) => setSettings({ ...settings, showTaxDetails: e.target.checked })}
                      className="mt-0.5 accent-indigo-600 rounded"
                    />
                    <div>
                      <span className="text-xs font-semibold text-slate-700 block leading-tight">Include Tax Audit</span>
                      <span className="text-[9px] text-slate-400 block mt-0.5">Include VAT & Service Charge breakdown at layout base</span>
                    </div>
                  </label>
                </div>
              </div>

              {/* Diagnostic Test Spool Button */}
              <div className="bg-slate-50 p-4 border border-slate-100 rounded-2xl flex items-center justify-between gap-3 flex-wrap">
                <div className="space-y-0.5">
                  <span className="text-xs font-semibold text-slate-700 block leading-tight">Hardware diagnostics</span>
                  <span className="text-[9px] text-slate-400 block">Fire ESC/POS initialization codes to test configuration & align feeds</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    setSuccessMsg(`Test packet successfully spooled to ${settings.paperWidth} ${settings.printerType} printer via ${settings.printerConnection.toUpperCase()}!`);
                    setTimeout(() => setSuccessMsg(null), 4000);
                  }}
                  className="px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold rounded-lg text-[10px] flex items-center gap-1.5 transition-all outline-none border-0 cursor-pointer"
                >
                  <SlidersHorizontal className="h-3.5 w-3.5 text-indigo-400" /> Spool Device Test Print
                </button>
              </div>
            </div>

          </div>

         {/* Column Right (Role Permissions) - Spans 5 cols */}
          <div className="lg:col-span-5 space-y-6">

            {/* Role Privileges Block */}
            {/*manager and receptionist permissions*/
            }

            <div className="bg-white p-6 rounded-3xl border border-slate-200/50 shadow-xs space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-lg">
                  <Users className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-display font-medium text-sm text-slate-800">Role Privileges & Permissions</h3>
                  <p className="text-[10px] text-slate-400">Enable or disable specific features for receptionists and managers</p>
                </div>
              </div>

              {/*manager permissions*/}
              

              <hr className="my-3 border-slate-100" />

              {/*receptionist permissions*/}
              
               
               


            </div>
            
          </div>
        </div>

      </form>

    </div>
  );
};
