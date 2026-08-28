'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/auth-provider';
import { apiFetch } from '@/lib/api';
import { toastUpdated, toastError, toastCreated } from '@/lib/crud-toast';
import { LoadingButton } from '@/components/loading-button';
import type { AuditLog, FrontdeskMemo } from '@/lib/types';
import {
  User,
  Shield,
  Key,
  Clock,
  Calendar,
  CheckCircle,
  Eye,
  EyeOff,
  UserCheck,
  Award,
  ArrowRight,
  Sliders,
  Activity,
  Laptop,
  LogOut,
  MessageSquare,
  Send,
  RefreshCw,
  FileText,
} from 'lucide-react';

export const ProfilePage: React.FC = () => {
  const { user: currentUser, logout } = useAuth();

  // Password state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [savingPassword, setSavingPassword] = useState(false);

  // Shift Handover Memo state
  const [memoContent, setMemoContent] = useState('');
  const [memoType, setMemoType] = useState<'handover' | 'reminder' | 'maintenance' | 'guest_request'>('handover');
  const [savingMemo, setSavingMemo] = useState(false);

  // Operator Audit Log state
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);

  // Fetch operator audit activity
  const fetchOperatorLogs = async () => {
    if (!currentUser) return;
    setLoadingLogs(true);
    try {
      const res = await apiFetch(`/api/audit-logs?actorUserId=${currentUser.id}&limit=5`);
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setAuditLogs(data);
        }
      }
    } catch (e) {
      console.error('Error fetching operator activity logs:', e);
    } finally {
      setLoadingLogs(false);
    }
  };

  useEffect(() => {
    fetchOperatorLogs();
  }, [currentUser]);

  if (!currentUser) return null;

  const initials = currentUser.name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .substring(0, 2)
    .toUpperCase();

  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentPassword) {
      toastError('Please enter your current password.');
      return;
    }
    if (!newPassword) {
      toastError('Please enter a new password.');
      return;
    }
    if (newPassword !== confirmPassword) {
      toastError('New passwords do not match.');
      return;
    }
    if (newPassword.length < 4) {
      toastError('Password must be at least 4 characters.');
      return;
    }

    setSavingPassword(true);
    try {
      const res = await apiFetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword }),
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Failed to change password.');
      }

      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      toastUpdated('Security Password');
      fetchOperatorLogs();
    } catch (err: any) {
      toastError(err.message || 'Failed to change password.');
    } finally {
      setSavingPassword(false);
    }
  };

  const handlePostMemo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!memoContent.trim()) {
      toastError('Please enter shift handover memo content.');
      return;
    }

    setSavingMemo(true);
    try {
      const newMemo: Partial<FrontdeskMemo> = {
        authorName: currentUser.name,
        authorRole: currentUser.role,
        type: memoType,
        content: memoContent.trim(),
        resolved: false,
        createdAt: new Date().toISOString(),
      };

      const res = await apiFetch('/api/memos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMemo),
      });

      if (!res.ok) {
        throw new Error('Failed to post shift handover note.');
      }

      setMemoContent('');
      toastCreated('Shift Handover Note');
      fetchOperatorLogs();
    } catch (err: any) {
      toastError(err.message || 'Failed to post shift handover note.');
    } finally {
      setSavingMemo(false);
    }
  };

  return (
    <div className="space-y-6 max-w-6xl mx-auto pb-12 font-sans">
      {/* PROFILE HEADER HERO BANNER */}
      <div className="bg-slate-900 rounded-3xl p-6 md:p-8 text-white shadow-xl border border-slate-800 relative overflow-hidden">
        <div className="absolute -right-10 -bottom-10 w-64 h-64 bg-indigo-600/10 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col sm:flex-row items-center gap-6 relative z-10">
          {/* AVATAR BADGE */}
          <div className="relative shrink-0">
            <div className="w-24 h-24 rounded-full bg-slate-950 border-4 border-indigo-500/30 flex items-center justify-center text-2xl font-black text-indigo-400 shadow-2xl tracking-wider">
              {initials}
            </div>
            <span className="absolute bottom-1 right-1 w-5 h-5 rounded-full bg-emerald-500 border-2 border-slate-900 flex items-center justify-center" title="Operator Active">
              <span className="w-2 h-2 rounded-full bg-white animate-ping" />
            </span>
          </div>

          {/* OPERATOR DETAILS */}
          <div className="text-center sm:text-left space-y-1.5 flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2.5">
              <h1 className="text-2xl font-extrabold font-display tracking-tight text-white">
                {currentUser.name}
              </h1>
              <span className="px-3 py-1 bg-indigo-500/20 text-indigo-300 text-[10px] font-extrabold rounded-full uppercase tracking-wider border border-indigo-500/30">
                {currentUser.role}
              </span>
            </div>

            <p className="text-xs text-slate-400 font-mono">
              Username: <span className="text-slate-200 font-semibold">@{currentUser.username}</span> · Operator ID: <span className="text-slate-300">{currentUser.id}</span>
            </p>

            <div className="pt-2 flex flex-wrap items-center justify-center sm:justify-start gap-4 text-[11px] text-slate-400 font-medium">
              <div className="flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-indigo-400" />
                <span>Joined: {currentUser.joinDate || 'Active Operator'}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <Shield className="h-3.5 w-3.5 text-emerald-400" />
                <span>Status: Fully Authenticated Session</span>
              </div>
            </div>
          </div>

          {/* QUICK SHORTCUT */}
          <div className="shrink-0 flex gap-2">
            <Link
              href="/attendance/punch"
              className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl flex items-center gap-2 transition-all shadow-md cursor-pointer border-0"
            >
              <Clock className="h-4 w-4" />
              Punch Terminal
            </Link>
          </div>
        </div>
      </div>

      {/* TWO COLUMN CONTENT LAYOUT */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* LEFT COLUMN: DETAILS, SHIFT HANDOVER MEMO & PASSWORD */}
        <div className="lg:col-span-7 space-y-6">
          {/* GENERAL PROFILE DETAILS (READ-ONLY) */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <UserCheck className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">General Profile Details</h3>
                <p className="text-[11px] text-slate-400">View your operator identity and account information</p>
              </div>
            </div>

            <div className="space-y-3.5">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Display Full Name
                </label>
                <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-extrabold text-slate-800">
                  {currentUser.name}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Account Username
                </label>
                <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold font-mono text-slate-800">
                  @{currentUser.username}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-1">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    System Role Privilege
                  </label>
                  <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-extrabold text-indigo-700 uppercase tracking-wider">
                    {currentUser.role}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Joined Date
                  </label>
                  <div className="px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700">
                    {currentUser.joinDate || 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* NEW FEATURE 1: SHIFT HANDOVER QUICK MEMO */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <MessageSquare className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Shift Handover Quick Memo</h3>
                <p className="text-[11px] text-slate-400">Post a shift note or instructions for the next operator</p>
              </div>
            </div>

            <form onSubmit={handlePostMemo} className="space-y-3.5">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Operator Author
                  </label>
                  <div className="px-3.5 py-2 bg-slate-100 border border-slate-200 rounded-xl text-xs font-bold text-slate-700">
                    {currentUser.name} (@{currentUser.username})
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Memo Category *
                  </label>
                  <select
                    value={memoType}
                    onChange={(e) => setMemoType(e.target.value as 'handover' | 'reminder' | 'maintenance' | 'guest_request')}
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 font-semibold focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all cursor-pointer"
                  >
                    <option value="handover">Shift Handover Note</option>
                    <option value="reminder">Frontdesk Reminder</option>
                    <option value="maintenance">Maintenance Ticket</option>
                    <option value="guest_request">VIP Guest Request</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Shift Instructions / Message *
                </label>
                <textarea
                  required
                  rows={3}
                  value={memoContent}
                  onChange={(e) => setMemoContent(e.target.value)}
                  placeholder="e.g. Guest in Room 201 requested wake-up call at 7:00 AM. Cash drawer verified."
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all resize-none"
                />
              </div>

              <div className="pt-1">
                <LoadingButton
                  type="submit"
                  loading={savingMemo}
                  loadingLabel="Posting Handover Note..."
                  className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border-0 shadow-xs"
                >
                  <Send className="h-4 w-4" />
                  Post Shift Handover Note
                </LoadingButton>
              </div>
            </form>
          </div>

          {/* SECURITY & CHANGE PASSWORD */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Key className="h-5 w-5 text-amber-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Security & Password</h3>
                <p className="text-[11px] text-slate-400">Update your operator account password</p>
              </div>
            </div>

            <form onSubmit={handleUpdatePassword} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  Current Password *
                </label>
                <div className="relative">
                  <input
                    type={showCurrentPassword ? 'text' : 'password'}
                    required
                    value={currentPassword}
                    onChange={(e) => setCurrentPassword(e.target.value)}
                    placeholder="Enter existing password"
                    className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer p-0"
                  >
                    {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    New Password *
                  </label>
                  <div className="relative">
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      required
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Min 4 characters"
                      className="w-full pl-3.5 pr-10 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 border-0 bg-transparent cursor-pointer p-0"
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                    Confirm New Password *
                  </label>
                  <input
                    type="password"
                    required
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Re-enter new password"
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-semibold focus:outline-none focus:ring-2 focus:ring-amber-500/20 focus:border-amber-500 transition-all font-mono"
                  />
                </div>
              </div>

              <div className="pt-2">
                <LoadingButton
                  type="submit"
                  loading={savingPassword}
                  loadingLabel="Updating Password..."
                  className="w-full py-2.5 px-4 bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs rounded-xl uppercase tracking-wider flex items-center justify-center gap-2 transition-all cursor-pointer border-0 shadow-xs"
                >
                  <Key className="h-4 w-4" />
                  Update Security Password
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>

        {/* RIGHT COLUMN: RECENT AUDIT HISTORY, LIVE SESSION SECURITY & SHORTCUTS */}
        <div className="lg:col-span-5 space-y-6">
          {/* NEW FEATURE 2: ACTIVE OPERATOR AUDIT HISTORY */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-indigo-600" />
                <div>
                  <h3 className="text-sm font-bold text-slate-900">Recent Operator Activity</h3>
                  <p className="text-[11px] text-slate-400">Last 5 actions recorded by @{currentUser.username}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={fetchOperatorLogs}
                disabled={loadingLogs}
                className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition-all border-0 cursor-pointer"
                title="Refresh Activity Log"
              >
                <RefreshCw className={`h-4 w-4 ${loadingLogs ? 'animate-spin text-indigo-600' : ''}`} />
              </button>
            </div>

            <div className="space-y-2.5">
              {loadingLogs ? (
                <div className="py-6 text-center text-xs text-slate-400">Loading activity history...</div>
              ) : auditLogs.length === 0 ? (
                <div className="py-6 text-center text-xs text-slate-400">No recent activity recorded.</div>
              ) : (
                auditLogs.map((log) => (
                  <div
                    key={log.id}
                    className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1 hover:border-slate-200 transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className={`inline-flex items-center gap-1 text-[9px] font-extrabold px-2 py-0.5 rounded uppercase tracking-wider ${
                        log.action === 'LOGIN'
                          ? 'bg-emerald-100 text-emerald-800'
                          : log.action === 'CREATE'
                            ? 'bg-blue-100 text-blue-800'
                            : log.action === 'UPDATE'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-rose-100 text-rose-800'
                      }`}>
                        {log.action}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {new Date(log.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs font-semibold text-slate-800 line-clamp-1">
                      {log.summary}
                    </p>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* NEW FEATURE 3: LIVE SESSION SECURITY & DEVICES */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Laptop className="h-5 w-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Live Session & Devices</h3>
                <p className="text-[11px] text-slate-400">Current authenticated terminal details</p>
              </div>
            </div>

            <div className="space-y-3">
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-emerald-800">Device Terminal</span>
                  <span className="text-[10px] font-extrabold bg-emerald-200/80 text-emerald-900 px-2 py-0.5 rounded">Active Session</span>
                </div>
                <p className="text-xs font-bold text-slate-800 flex items-center gap-1.5 pt-0.5">
                  <Laptop className="h-3.5 w-3.5 text-emerald-600" />
                  Client POS Browser Terminal (Windows OS)
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                <span className="text-[10px] font-bold uppercase text-slate-400">Session Security</span>
                <p className="text-xs font-mono font-semibold text-slate-700 flex items-center gap-1.5 pt-0.5">
                  <Shield className="h-3.5 w-3.5 text-indigo-500" />
                  HTTP-Only Encrypted JWT Session
                </p>
              </div>

              <button
                type="button"
                onClick={logout}
                className="w-full py-2.5 px-4 bg-rose-50 hover:bg-rose-600 text-rose-700 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 border border-rose-200 hover:border-rose-600 cursor-pointer shadow-2xs"
              >
                <LogOut className="h-4 w-4" />
                Sign Out Active Session
              </button>
            </div>
          </div>

          {/* PRIVILEGE OVERVIEW CARD */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Award className="h-5 w-5 text-emerald-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Active Role Privileges</h3>
                <p className="text-[11px] text-slate-400">Permissions granted for @{currentUser.username}</p>
              </div>
            </div>

            <div className="space-y-2.5">
              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>Frontdesk Billing POS</span>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Enabled</span>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>Attendance & Punch Terminal</span>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Enabled</span>
              </div>

              <div className="p-3 bg-emerald-50/70 border border-emerald-100 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                  <CheckCircle className="h-4 w-4 text-emerald-600" />
                  <span>Guest Registration</span>
                </div>
                <span className="text-[10px] font-extrabold text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">Enabled</span>
              </div>

              {currentUser.role === 'admin' && (
                <>
                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                      <CheckCircle className="h-4 w-4 text-indigo-600" />
                      <span>Admin Bill Consolidation & Merge</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">Admin Only</span>
                  </div>

                  <div className="p-3 bg-indigo-50/70 border border-indigo-100 rounded-xl flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs font-bold text-indigo-900">
                      <CheckCircle className="h-4 w-4 text-indigo-600" />
                      <span>Completed Bill Editing</span>
                    </div>
                    <span className="text-[10px] font-extrabold text-indigo-700 bg-indigo-100 px-2 py-0.5 rounded">Admin Only</span>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* QUICK TERMINAL SHORTCUTS */}
          <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
            <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
              <Sliders className="h-5 w-5 text-indigo-600" />
              <div>
                <h3 className="text-sm font-bold text-slate-900">Terminal Shortcuts</h3>
                <p className="text-[11px] text-slate-400">Quick access to essential modules</p>
              </div>
            </div>

            <div className="space-y-2">
              <Link
                href="/billing"
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 transition-all flex items-center justify-between text-xs font-bold text-slate-800 hover:text-indigo-700 cursor-pointer"
              >
                <span>Billing POS Express Terminal</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>

              <Link
                href="/attendance"
                className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 transition-all flex items-center justify-between text-xs font-bold text-slate-800 hover:text-indigo-700 cursor-pointer"
              >
                <span>Staff Attendance & Shift Register</span>
                <ArrowRight className="h-4 w-4 text-slate-400" />
              </Link>

              {currentUser.role === 'admin' && (
                <Link
                  href="/settings"
                  className="p-3 rounded-xl border border-slate-200 bg-slate-50 hover:bg-indigo-50 hover:border-indigo-200 transition-all flex items-center justify-between text-xs font-bold text-slate-800 hover:text-indigo-700 cursor-pointer"
                >
                  <span>System Settings & Privileges</span>
                  <ArrowRight className="h-4 w-4 text-slate-400" />
                </Link>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
