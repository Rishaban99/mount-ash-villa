'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Link from 'next/link';
import { User, Attendance } from '@/lib/types';
import { useAuth } from '@/components/auth-provider';
import { apiFetch } from '@/lib/api';
import { toastUpdated, toastError } from '@/lib/crud-toast';
import {
  ArrowLeft,
  Clock,
  Coffee,
  Lock,
  LogIn,
  LogOut,
  Shield,
  UserCheck,
} from 'lucide-react';

type PunchState = 'not_in' | 'working' | 'on_break' | 'finished';

function todayDateStr() {
  return new Date().toISOString().split('T')[0];
}

function nowTimeStr() {
  return new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}

function appendNote(existing: string | undefined, line: string) {
  const trimmed = (existing || '').trim();
  return trimmed ? `${trimmed}\n${line}` : line;
}

function computeWorkHours(checkIn: string, checkOut: string): number | undefined {
  try {
    const [inH, inM] = checkIn.split(':').map(Number);
    const [outH, outM] = checkOut.split(':').map(Number);
    let diffMinutes = outH * 60 + outM - (inH * 60 + inM);
    if (diffMinutes < 0) diffMinutes += 24 * 60;
    return Math.round((diffMinutes / 60) * 10) / 10;
  } catch {
    return undefined;
  }
}

function resolvePunchState(record?: Attendance | null): PunchState {
  if (!record?.checkIn) return 'not_in';
  if (record.checkOut) return 'finished';
  if (record.status === 'Day Off') return 'on_break';
  return 'working';
}

/** Latest matching `Day Off HH:MM` / `Day In HH:MM` line from notes. */
function parseLatestNoteTime(notes: string | undefined, prefix: 'Day Off' | 'Day In'): string | null {
  if (!notes) return null;
  const pattern = new RegExp(`^${prefix}\\s+(\\d{1,2}:\\d{2})\\s*$`, 'gim');
  let match: RegExpExecArray | null;
  let latest: string | null = null;
  while ((match = pattern.exec(notes)) !== null) {
    latest = match[1];
  }
  return latest;
}

function parseBreakTimes(notes: string | undefined): { breakStart: string | null; breakEnd: string | null } {
  return {
    breakStart: parseLatestNoteTime(notes, 'Day Off'),
    breakEnd: parseLatestNoteTime(notes, 'Day In'),
  };
}

export const AttendancePunchPage: React.FC = () => {
  const { user: currentUser } = useAuth();
  const [currentTime, setCurrentTime] = useState(new Date());
  const [staff, setStaff] = useState<User[]>([]);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [attendance, setAttendance] = useState<Attendance | null>(null);
  const [loadingStaff, setLoadingStaff] = useState(true);
  const [loadingAttendance, setLoadingAttendance] = useState(false);
  const [saving, setSaving] = useState(false);

  const today = todayDateStr();

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  const fetchStaff = useCallback(async () => {
    setLoadingStaff(true);
    try {
      const res = await apiFetch('/api/users');
      if (res.ok) {
        const data = await res.json();
        if (Array.isArray(data)) {
          setStaff(
            data.filter(
              (u: User) => u.role !== 'admin' && (!u.leftDate || u.leftDate >= today)
            )
          );
        }
      } else {
        toastError('Could not load staff list');
      }
    } catch {
      toastError('Could not load staff list');
    } finally {
      setLoadingStaff(false);
    }
  }, [today]);

  const fetchAttendanceForUser = useCallback(
    async (userId: string) => {
      if (!userId) {
        setAttendance(null);
        return;
      }
      setLoadingAttendance(true);
      try {
        const res = await apiFetch(`/api/attendance?date=${today}&userId=${userId}`);
        if (res.ok) {
          const data = await res.json();
          const list = Array.isArray(data) ? data : [];
          setAttendance(list.find((a: Attendance) => a.userId === userId) || null);
        } else {
          setAttendance(null);
        }
      } catch {
        setAttendance(null);
        toastError('Could not load attendance');
      } finally {
        setLoadingAttendance(false);
      }
    },
    [today]
  );

  const canUsePunch =
    currentUser?.role === 'admin' || currentUser?.role === 'manager';

  useEffect(() => {
    if (canUsePunch) {
      fetchStaff();
    }
  }, [canUsePunch, fetchStaff]);

  useEffect(() => {
    if (selectedUserId) {
      fetchAttendanceForUser(selectedUserId);
    } else {
      setAttendance(null);
    }
  }, [selectedUserId, fetchAttendanceForUser]);

  const selectedUser = useMemo(
    () => staff.find((u) => u.id === selectedUserId) || null,
    [staff, selectedUserId]
  );

  const punchState = resolvePunchState(attendance);
  const { breakStart, breakEnd } = useMemo(
    () => parseBreakTimes(attendance?.notes),
    [attendance?.notes]
  );

  const statusLabel = useMemo(() => {
    switch (punchState) {
      case 'not_in':
        return 'Not checked in';
      case 'working':
        return 'Working';
      case 'on_break':
        return 'On Day Off (break)';
      case 'finished':
        return 'Finished for today';
      default:
        return 'Unknown';
    }
  }, [punchState]);

  const savePunch = async (updates: Partial<Attendance>, successMessage: string) => {
    if (!selectedUser) return;
    setSaving(true);
    try {
      const res = await apiFetch('/api/attendance', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: selectedUser.id,
          userName: selectedUser.name,
          userRole: selectedUser.role,
          date: today,
          ...updates,
        }),
      });

      if (res.ok) {
        const saved: Attendance = await res.json();
        setAttendance(saved);
        toastUpdated(successMessage);
      } else {
        toastError('Could not save punch');
      }
    } catch {
      toastError('Could not save punch');
    } finally {
      setSaving(false);
    }
  };

  const handleClockIn = () => {
    const now = nowTimeStr();
    return savePunch({ checkIn: now, status: 'Present' }, `${selectedUser?.name} clocked in`);
  };

  const handleClockOut = () => {
    const now = nowTimeStr();
    const workHours = attendance?.checkIn
      ? computeWorkHours(attendance.checkIn, now)
      : undefined;
    return savePunch(
      { checkOut: now, workHours, status: attendance?.status === 'Day In' ? 'Day In' : 'Present' },
      `${selectedUser?.name} clocked out`
    );
  };

  const handleDayOff = () => {
    const now = nowTimeStr();
    return savePunch(
      {
        status: 'Day Off',
        notes: appendNote(attendance?.notes, `Day Off ${now}`),
      },
      `${selectedUser?.name} started Day Off`
    );
  };

  const handleClockBackIn = () => {
    const now = nowTimeStr();
    return savePunch(
      {
        status: 'Present',
        notes: appendNote(attendance?.notes, `Punched Back In ${now}`),
      },
      `${selectedUser?.name} clocked back in`
    );
  };

  if (!currentUser) return null;

  if (!canUsePunch) {
    return (
      <div className="bg-white p-10 rounded-3xl border border-rose-200 text-center max-w-xl mx-auto my-12 shadow-xs space-y-5 text-slate-850">
        <div className="w-16 h-16 bg-rose-50 text-rose-600 rounded-2xl flex items-center justify-center mx-auto shadow-sm">
          <Lock className="h-7 w-7" />
        </div>
        <div className="space-y-2">
          <h2 className="font-display font-bold text-xl text-slate-800">Restricted Area</h2>
          <p className="text-slate-500 text-sm leading-relaxed">
            The punch terminal is only available to <strong>Administrators</strong> and{' '}
            <strong>Managers</strong>.
          </p>
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-100 text-left text-xs text-slate-600 space-y-1.5 mt-2">
            <div className="flex items-center gap-1.5 font-bold text-slate-700">
              <Shield className="h-3.5 w-3.5 text-indigo-500" /> Current Authorization:
            </div>
            <div>
              • Registered Operator:{' '}
              <span className="font-semibold text-slate-800">{currentUser.name}</span>
            </div>
            <div>
              • Role Privilege:{' '}
              <span className="font-semibold text-rose-500 uppercase tracking-wide text-[10px] bg-rose-50 px-1.5 py-0.5 rounded border border-rose-100">
                {currentUser.role}
              </span>
            </div>
          </div>
        </div>
        <Link
          href="/attendance"
          className="inline-flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-semibold"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back to Attendance
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto space-y-3 pb-6">
      <div className="flex items-center justify-between">
        <Link
          href="/attendance"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900"
        >
          <ArrowLeft className="h-3.5 w-3.5" /> Back
        </Link>
      </div>

      <div className="bg-white rounded-2xl shadow-md border border-slate-200 overflow-hidden">
        <div className="px-5 py-4 bg-slate-900 text-white text-center">
          <p className="text-[10px] font-semibold uppercase tracking-widest text-indigo-300 mb-1">
            Punch Terminal
          </p>
          <p className="text-3xl font-black font-mono tracking-wider text-white tabular-nums">
            {currentTime.toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
              second: '2-digit',
            })}
          </p>
          <p className="text-slate-400 text-xs font-medium mt-1">
            {currentTime.toLocaleDateString(undefined, {
              weekday: 'long',
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </p>
        </div>

        <div className="p-4 space-y-3">
          <div className="space-y-1.5">
            <label htmlFor="punch-employee" className="block text-sm font-bold text-slate-800">
              Who is punching?
            </label>
            <select
              id="punch-employee"
              value={selectedUserId}
              onChange={(e) => setSelectedUserId(e.target.value)}
              disabled={loadingStaff || saving}
              className="w-full text-sm font-semibold px-3 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 focus:outline-none focus:border-indigo-500 disabled:opacity-60"
            >
              <option value="">
                {loadingStaff ? 'Loading staff…' : '— Select employee —'}
              </option>
              {staff.map((u) => (
                <option key={u.id} value={u.id}>
                  {u.name} ({u.role})
                </option>
              ))}
            </select>
          </div>

          {selectedUser && (
            <>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5 text-center">
                <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
                  Status · {selectedUser.name}
                </p>
                <p className="text-lg font-black text-slate-900">
                  {loadingAttendance ? 'Loading…' : statusLabel}
                </p>
              </div>

              <div className="space-y-2">
                <div className="grid grid-cols-2 gap-2">
                  <div className="px-3 py-2.5 bg-emerald-50 rounded-xl border border-emerald-200 text-center">
                    <span className="text-[10px] font-bold text-emerald-800 uppercase block">
                      Clock In
                    </span>
                    <p className="text-lg font-bold font-mono text-emerald-950">
                      {attendance?.checkIn || '--:--'}
                    </p>
                  </div>
                  <div className="px-3 py-2.5 bg-slate-100 rounded-xl border border-slate-200 text-center">
                    <span className="text-[10px] font-bold text-slate-700 uppercase block">
                      Clock Out
                    </span>
                    <p className="text-lg font-bold font-mono text-slate-900">
                      {attendance?.checkOut || '--:--'}
                    </p>
                  </div>
                </div>

                {breakStart && (
                  <div className={`grid gap-2 ${breakEnd ? 'grid-cols-2' : 'grid-cols-1'}`}>
                    <div className="px-3 py-2.5 bg-purple-50 rounded-xl border border-purple-200 text-center">
                      <span className="text-[10px] font-bold text-purple-800 uppercase block">
                        Break
                      </span>
                      <p className="text-lg font-bold font-mono text-purple-950">{breakStart}</p>
                    </div>
                    {breakEnd && (
                      <div className="px-3 py-2.5 bg-indigo-50 rounded-xl border border-indigo-200 text-center">
                        <span className="text-[10px] font-bold text-indigo-800 uppercase block">
                          Back In
                        </span>
                        <p className="text-lg font-bold font-mono text-indigo-950">{breakEnd}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {!loadingAttendance && (
                <div className="space-y-2">
                  {punchState === 'not_in' && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleClockIn}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-lg font-black rounded-xl shadow-sm flex items-center justify-center gap-2"
                    >
                      <LogIn className="h-5 w-5" />
                      Clock In
                    </button>
                  )}

                  {punchState === 'working' && (
                    <>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={handleClockOut}
                        className="w-full py-3.5 bg-slate-800 hover:bg-slate-900 disabled:opacity-60 text-white text-lg font-black rounded-xl shadow-sm flex items-center justify-center gap-2"
                      >
                        <LogOut className="h-5 w-5" />
                        Clock Out
                      </button>
                      <button
                        type="button"
                        disabled={saving}
                        onClick={handleDayOff}
                        className="w-full py-2.5 bg-white hover:bg-purple-50 disabled:opacity-60 text-purple-700 text-sm font-bold rounded-xl border border-purple-200 flex items-center justify-center gap-2"
                      >
                        <Coffee className="h-4 w-4" />
                        Day Off (Break)
                      </button>
                    </>
                  )}

                  {punchState === 'on_break' && (
                    <button
                      type="button"
                      disabled={saving}
                      onClick={handleClockBackIn}
                      className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-lg font-black rounded-xl shadow-sm flex items-center justify-center gap-2"
                    >
                      <UserCheck className="h-5 w-5" />
                      Clock Back In
                    </button>
                  )}

                  {punchState === 'finished' && (
                    <div className="w-full py-3 bg-slate-100 border border-slate-200 text-slate-700 text-base font-bold rounded-xl text-center flex items-center justify-center gap-2">
                      <Clock className="h-5 w-5 text-slate-500" />
                      Done for today
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {!selectedUser && !loadingStaff && (
            <p className="text-center text-slate-500 text-sm py-2">
              Select an employee above to clock in or out.
            </p>
          )}
        </div>
      </div>
    </div>
  );
};
