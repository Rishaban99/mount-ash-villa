'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { DailyNote, UserRole } from '@/lib/types';
import {
  Calendar as CalendarIcon,
  BookOpen,
  Plus,
  CheckCircle2,
  Circle,
  Trash2,
  Tag,
  Clock,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  User,
  Sparkles,
  Search,
  Filter,
  Check,
  Edit2,
  X,
  RefreshCw,
  StickyNote
} from 'lucide-react';
import { useAuth } from '@/components/auth-provider';

interface DayCalendarNotebookProps {
  initialDate?: string; // YYYY-MM-DD
}

export const DayCalendarNotebook: React.FC<DayCalendarNotebookProps> = ({ initialDate }) => {
  const { user: currentUser } = useAuth();
  
  // Selected date state (defaults to today YYYY-MM-DD)
  const getTodayStr = () => {
    const d = new Date();
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const [selectedDate, setSelectedDate] = useState<string>(initialDate || getTodayStr());
  const [currentMonthDate, setCurrentMonthDate] = useState<Date>(new Date(selectedDate));
  
  const [notes, setNotes] = useState<DailyNote[]>([]);
  const [allNotesDates, setAllNotesDates] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState<boolean>(true);
  const [saving, setSaving] = useState<boolean>(false);

  // Form states
  const [isAdding, setIsAdding] = useState<boolean>(false);
  const [newTitle, setNewTitle] = useState<string>('');
  const [newContent, setNewContent] = useState<string>('');
  const [newCategory, setNewCategory] = useState<DailyNote['category']>('Frontdesk');
  const [newPriority, setNewPriority] = useState<DailyNote['priority']>('Medium');

  // Edit states
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState<string>('');
  const [editContent, setEditContent] = useState<string>('');
  const [editCategory, setEditCategory] = useState<DailyNote['category']>('Frontdesk');
  const [editPriority, setEditPriority] = useState<DailyNote['priority']>('Medium');

  // Filter state
  const [filterTab, setFilterTab] = useState<'all' | 'pending' | 'completed'>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Fetch notes from DB API
  const fetchNotes = async (dateStr?: string) => {
    setLoading(true);
    try {
      // Fetch notes for selected date
      const res = await fetch(`/api/notes${dateStr ? `?date=${dateStr}` : ''}`);
      if (res.ok) {
        const data: DailyNote[] = await res.json();
        setNotes(data);
      }

      // Fetch all notes summary to know which calendar days have notes stored in DB
      const allRes = await fetch('/api/notes');
      if (allRes.ok) {
        const allData: DailyNote[] = await allRes.json();
        const dateMap: Record<string, number> = {};
        allData.forEach(n => {
          dateMap[n.date] = (dateMap[n.date] || 0) + 1;
        });
        setAllNotesDates(dateMap);
      }
    } catch (err) {
      console.error('Error loading notebook DB notes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchNotes(selectedDate);
  }, [selectedDate]);

  // Handle Note Creation into DB
  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() && !newContent.trim()) return;

    setSaving(true);
    try {
      const payload: Partial<DailyNote> = {
        date: selectedDate,
        title: newTitle.trim() || 'Frontdesk Note',
        content: newContent.trim(),
        category: newCategory,
        priority: newPriority,
        isCompleted: false,
        authorName: currentUser?.name || 'Super Admin',
        authorRole: currentUser?.role || 'admin',
      };

      const res = await fetch('/api/notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        const created: DailyNote = await res.json();
        setNotes(prev => [created, ...prev]);
        setAllNotesDates(prev => ({
          ...prev,
          [selectedDate]: (prev[selectedDate] || 0) + 1
        }));
        setNewTitle('');
        setNewContent('');
        setIsAdding(false);
      }
    } catch (err) {
      console.error('Failed to create daily note in DB:', err);
    } finally {
      setSaving(false);
    }
  };

  // Toggle Completion Status in DB
  const handleToggleComplete = async (note: DailyNote) => {
    const updatedStatus = !note.isCompleted;
    setNotes(prev => prev.map(n => n.id === note.id ? { ...n, isCompleted: updatedStatus } : n));

    try {
      await fetch(`/api/notes/${note.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isCompleted: updatedStatus }),
      });
    } catch (err) {
      console.error('Failed to update note status in DB:', err);
      // Revert on error
      setNotes(prev => prev.map(n => n.id === note.id ? { ...n, isCompleted: !updatedStatus } : n));
    }
  };

  // Delete Note from DB
  const handleDeleteNote = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this notebook entry from the database?')) return;

    setNotes(prev => prev.filter(n => n.id !== id));
    setAllNotesDates(prev => {
      const updated = { ...prev };
      if (updated[selectedDate] > 1) {
        updated[selectedDate] -= 1;
      } else {
        delete updated[selectedDate];
      }
      return updated;
    });

    try {
      await fetch(`/api/notes/${id}`, { method: 'DELETE' });
    } catch (err) {
      console.error('Failed to delete note from DB:', err);
      fetchNotes(selectedDate);
    }
  };

  // Start Edit Mode
  const startEditing = (note: DailyNote) => {
    setEditingId(note.id);
    setEditTitle(note.title);
    setEditContent(note.content);
    setEditCategory(note.category || 'Frontdesk');
    setEditPriority(note.priority || 'Medium');
  };

  // Save Edit to DB
  const handleSaveEdit = async (id: string) => {
    try {
      const updates = {
        title: editTitle,
        content: editContent,
        category: editCategory,
        priority: editPriority,
      };

      setNotes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
      setEditingId(null);

      await fetch(`/api/notes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
    } catch (err) {
      console.error('Failed to update note in DB:', err);
    }
  };

  // Calendar Math & Helpers
  const year = currentMonthDate.getFullYear();
  const month = currentMonthDate.getMonth();

  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDayOfWeek = new Date(year, month, 1).getDay();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentMonthDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonthDate(new Date(year, month + 1, 1));
  };

  const formatDateString = (d: number) => {
    const mStr = String(month + 1).padStart(2, '0');
    const dStr = String(d).padStart(2, '0');
    return `${year}-${mStr}-${dStr}`;
  };

  // Day of year calculation for Day Counter
  const getDayOfYear = (dateStr: string) => {
    const d = new Date(dateStr);
    const start = new Date(d.getFullYear(), 0, 0);
    const diff = d.getTime() - start.getTime();
    const oneDay = 1000 * 60 * 60 * 24;
    return Math.floor(diff / oneDay);
  };

  const formatReadableDate = (dateStr: string) => {
    const d = new Date(dateStr + 'T00:00:00');
    return d.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  // Filter notes
  const filteredNotes = notes.filter(note => {
    if (filterTab === 'pending' && note.isCompleted) return false;
    if (filterTab === 'completed' && !note.isCompleted) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        note.title.toLowerCase().includes(q) ||
        note.content.toLowerCase().includes(q) ||
        (note.category && note.category.toLowerCase().includes(q)) ||
        note.authorName.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const getPriorityBadgeClass = (priority?: string) => {
    switch (priority) {
      case 'Urgent':
        return 'bg-red-500/10 text-red-600 border-red-200 font-bold';
      case 'High':
        return 'bg-amber-500/10 text-amber-600 border-amber-200 font-bold';
      case 'Low':
        return 'bg-slate-500/10 text-slate-600 border-slate-200 font-medium';
      default:
        return 'bg-indigo-500/10 text-indigo-600 border-indigo-200 font-medium';
    }
  };

  const getCategoryColor = (cat?: string) => {
    switch (cat) {
      case 'Reminder':
        return 'bg-purple-100 text-purple-700 border-purple-200';
      case 'Maintenance':
        return 'bg-amber-100 text-amber-700 border-amber-200';
      case 'VIP Guest':
        return 'bg-rose-100 text-rose-700 border-rose-200';
      case 'Frontdesk':
        return 'bg-blue-100 text-blue-700 border-blue-200';
      default:
        return 'bg-slate-100 text-slate-700 border-slate-200';
    }
  };

  const todayStr = getTodayStr();
  const dayOfYear = getDayOfYear(selectedDate);

  return (
    <div className="w-full bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 text-slate-100 rounded-2xl border-2 border-indigo-500/40 shadow-xl overflow-hidden my-4 relative">
      
      {/* RED LINE AREA DECORATIVE BANNER INDICATOR */}
      <div className="bg-rose-600 text-white px-4 py-1.5 text-[11px] font-extrabold uppercase tracking-widest flex items-center justify-between shadow-sm">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full bg-white animate-pulse" />
          <span>Frontdesk Operations Area & Daily Calendar Notebook (Stored in DB)</span>
        </div>
        <div className="flex items-center gap-3 text-[10px] font-mono opacity-90">
          <span>Day {dayOfYear} of {year}</span>
          <span>•</span>
          <span>Date: {selectedDate}</span>
        </div>
      </div>

      <div className="p-5 grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: DAY CALENDAR & COUNTER (5 cols) */}
        <div className="lg:col-span-5 bg-slate-950/70 p-4 rounded-xl border border-indigo-900/50 flex flex-col justify-between backdrop-blur-sm shadow-inner">
          <div>
            {/* Calendar Header Controls */}
            <div className="flex items-center justify-between mb-4 pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-indigo-600/30 border border-indigo-500/40 flex items-center justify-center text-indigo-400">
                  <CalendarIcon className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="font-bold text-sm text-white">
                    {monthNames[month]} {year}
                  </h3>
                  <p className="text-[10px] text-indigo-300 font-medium">Interactive Day Counter</p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handlePrevMonth}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-indigo-900/50 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Previous Month"
                >
                  <ChevronLeft className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const today = getTodayStr();
                    setSelectedDate(today);
                    setCurrentMonthDate(new Date(today));
                  }}
                  className="px-2 py-1 rounded-lg bg-indigo-600/30 hover:bg-indigo-600/50 border border-indigo-500/40 text-[11px] font-semibold text-indigo-200 transition cursor-pointer"
                >
                  Today
                </button>
                <button
                  type="button"
                  onClick={handleNextMonth}
                  className="p-1.5 rounded-lg bg-slate-900 hover:bg-indigo-900/50 border border-slate-800 text-slate-300 hover:text-white transition cursor-pointer"
                  title="Next Month"
                >
                  <ChevronRight className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day, idx) => (
                <span key={day} className={`text-[10px] font-bold uppercase tracking-wider ${idx === 0 || idx === 6 ? 'text-rose-400/80' : 'text-slate-400'}`}>
                  {day}
                </span>
              ))}
            </div>

            {/* Calendar Days Grid */}
            <div className="grid grid-cols-7 gap-1 text-center">
              {/* Empty padding cells for start of month */}
              {Array.from({ length: firstDayOfWeek }).map((_, idx) => (
                <div key={`empty-${idx}`} className="h-8 rounded-lg bg-transparent" />
              ))}

              {/* Day cells */}
              {Array.from({ length: daysInMonth }).map((_, idx) => {
                const dayNum = idx + 1;
                const dateStr = formatDateString(dayNum);
                const isSelected = dateStr === selectedDate;
                const isToday = dateStr === todayStr;
                const noteCount = allNotesDates[dateStr] || 0;

                return (
                  <button
                    key={dateStr}
                    type="button"
                    onClick={() => setSelectedDate(dateStr)}
                    className={`h-9 rounded-lg flex flex-col items-center justify-center relative transition-all cursor-pointer font-semibold text-xs border ${
                      isSelected
                        ? 'bg-indigo-600 text-white border-indigo-400 shadow-md shadow-indigo-600/40 scale-105 z-10'
                        : isToday
                        ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 font-bold'
                        : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border-slate-800/80'
                    }`}
                  >
                    <span>{dayNum}</span>

                    {/* DB Notes indicator dot */}
                    {noteCount > 0 && (
                      <span className={`absolute bottom-1 h-1.5 w-1.5 rounded-full ${isSelected ? 'bg-white' : 'bg-emerald-400'}`} />
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Selected Day Stats & Day Counter Bar */}
          <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded bg-indigo-900/50 border border-indigo-700/50 text-indigo-300 font-mono text-[11px]">
                Day Counter: #{dayOfYear}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-medium">
              <span className="text-emerald-400 font-bold">{allNotesDates[selectedDate] || 0}</span> notes saved in DB
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: NOTEBOOK STORE FOR DB NOTES (7 cols) */}
        <div className="lg:col-span-7 flex flex-col justify-between">
          
          <div>
            {/* Header for Notebook area */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
              <div>
                <div className="flex items-center gap-2 text-xs font-bold text-indigo-300 uppercase tracking-wider">
                  <BookOpen className="h-4 w-4 text-indigo-400" />
                  <span>Frontdesk Notebook Ledger</span>
                </div>
                <h2 className="text-base font-bold text-white mt-0.5 flex items-center gap-2">
                  <span>{formatReadableDate(selectedDate)}</span>
                  {selectedDate === todayStr && (
                    <span className="px-2 py-0.5 text-[10px] bg-rose-500/20 text-rose-300 border border-rose-500/40 rounded-full font-extrabold uppercase">
                      Today
                    </span>
                  )}
                </h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsAdding(!isAdding)}
                  className="px-3 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-indigo-900/40 transition cursor-pointer"
                >
                  {isAdding ? <X className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  <span>{isAdding ? 'Cancel' : 'Add Note to DB'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => fetchNotes(selectedDate)}
                  className="p-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 transition cursor-pointer"
                  title="Refresh Notes from Database"
                >
                  <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
                </button>
              </div>
            </div>

            {/* ADD NOTE FORM INLINE */}
            {isAdding && (
              <form onSubmit={handleAddNote} className="mb-4 bg-slate-950 p-4 rounded-xl border border-indigo-500/30 shadow-lg space-y-3 animate-fade-in">
                <div className="flex items-center justify-between text-xs font-bold text-indigo-300">
                  <span className="flex items-center gap-1">
                    <StickyNote className="h-3.5 w-3.5 text-indigo-400" />
                    <span>New Notebook Record (Saving to Database)</span>
                  </span>
                  <span className="text-[10px] text-slate-400">Date: {selectedDate}</span>
                </div>

                <input
                  type="text"
                  placeholder="Note Title / Summary (e.g. VIP Guest Check-in Note, Shift Handover)..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
                  required
                />

                <textarea
                  placeholder="Type note details here..."
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 resize-none"
                  required
                />

                <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
                  <div className="flex items-center gap-3 text-xs">
                    {/* Category Selector */}
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1 font-bold">Category</span>
                      <select
                        value={newCategory}
                        onChange={(e) => setNewCategory(e.target.value as any)}
                        className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Frontdesk">Frontdesk</option>
                        <option value="Reminder">Reminder</option>
                        <option value="Maintenance">Maintenance</option>
                        <option value="VIP Guest">VIP Guest</option>
                        <option value="General">General</option>
                      </select>
                    </div>

                    {/* Priority Selector */}
                    <div>
                      <span className="text-[10px] text-slate-400 block mb-1 font-bold">Priority</span>
                      <select
                        value={newPriority}
                        onChange={(e) => setNewPriority(e.target.value as any)}
                        className="bg-slate-900 border border-slate-700 text-xs rounded-lg px-2.5 py-1 text-slate-200 focus:outline-none focus:border-indigo-500"
                      >
                        <option value="Low">Low</option>
                        <option value="Medium">Medium</option>
                        <option value="High">High</option>
                        <option value="Urgent">Urgent</option>
                      </select>
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={saving}
                    className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow transition cursor-pointer"
                  >
                    <Check className="h-3.5 w-3.5" />
                    <span>{saving ? 'Storing in DB...' : 'Save Note to DB'}</span>
                  </button>
                </div>
              </form>
            )}

            {/* Filter Tabs & Search Bar */}
            <div className="flex items-center justify-between gap-2 mb-3">
              <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-[11px]">
                <button
                  type="button"
                  onClick={() => setFilterTab('all')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    filterTab === 'all' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  All ({notes.length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('pending')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    filterTab === 'pending' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Pending ({notes.filter(n => !n.isCompleted).length})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterTab('completed')}
                  className={`px-2.5 py-1 rounded-lg font-semibold transition cursor-pointer ${
                    filterTab === 'completed' ? 'bg-indigo-600 text-white' : 'text-slate-400 hover:text-white'
                  }`}
                >
                  Done ({notes.filter(n => n.isCompleted).length})
                </button>
              </div>

              <div className="relative">
                <Search className="h-3.5 w-3.5 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  placeholder="Search notes..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 pr-3 py-1 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 w-36 sm:w-48"
                />
              </div>
            </div>

            {/* NOTES LIST */}
            {loading ? (
              <div className="py-12 text-center text-slate-400 text-xs flex items-center justify-center gap-2">
                <RefreshCw className="h-4 w-4 animate-spin text-indigo-400" />
                <span>Fetching notebook records from database...</span>
              </div>
            ) : filteredNotes.length === 0 ? (
              <div className="bg-slate-950/50 border border-dashed border-slate-800 rounded-xl p-8 text-center text-slate-400">
                <BookOpen className="h-8 w-8 text-indigo-400/50 mx-auto mb-2" />
                <p className="text-xs font-semibold text-slate-300">No notebook entries for {selectedDate}</p>
                <p className="text-[11px] text-slate-500 mt-1">
                  Click "Add Note to DB" above to store frontdesk handovers, guest notes or daily reminders in MongoDB.
                </p>
              </div>
            ) : (
              <div className="space-y-2.5 max-h-[340px] overflow-y-auto pr-1">
                {filteredNotes.map((note) => {
                  const isEditing = editingId === note.id;

                  return (
                    <div
                      key={note.id}
                      className={`p-3.5 rounded-xl border transition-all ${
                        note.isCompleted
                          ? 'bg-slate-950/40 border-slate-800/80 opacity-70'
                          : 'bg-slate-950/90 border-slate-800 hover:border-indigo-800'
                      }`}
                    >
                      {isEditing ? (
                        <div className="space-y-2">
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                          />
                          <textarea
                            value={editContent}
                            onChange={(e) => setEditContent(e.target.value)}
                            rows={2}
                            className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded text-xs text-white"
                          />
                          <div className="flex items-center justify-end gap-2">
                            <button
                              type="button"
                              onClick={() => setEditingId(null)}
                              className="px-2.5 py-1 bg-slate-800 text-slate-300 rounded text-[11px]"
                            >
                              Cancel
                            </button>
                            <button
                              type="button"
                              onClick={() => handleSaveEdit(note.id)}
                              className="px-2.5 py-1 bg-indigo-600 text-white font-bold rounded text-[11px]"
                            >
                              Save Changes
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start gap-3">
                          {/* Complete Checkbox */}
                          <button
                            type="button"
                            onClick={() => handleToggleComplete(note)}
                            className="mt-0.5 text-slate-400 hover:text-emerald-400 transition cursor-pointer"
                            title={note.isCompleted ? 'Mark Pending' : 'Mark Completed'}
                          >
                            {note.isCompleted ? (
                              <CheckCircle2 className="h-4 w-4 text-emerald-400" />
                            ) : (
                              <Circle className="h-4 w-4" />
                            )}
                          </button>

                          {/* Content */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center justify-between gap-2 mb-1">
                              <h4 className={`text-xs font-bold ${note.isCompleted ? 'line-through text-slate-400' : 'text-white'}`}>
                                {note.title}
                              </h4>

                              <div className="flex items-center gap-1.5 shrink-0">
                                <span className={`px-2 py-0.5 rounded text-[9px] border font-bold uppercase ${getCategoryColor(note.category)}`}>
                                  {note.category || 'General'}
                                </span>
                                <span className={`px-2 py-0.5 rounded text-[9px] border ${getPriorityBadgeClass(note.priority)}`}>
                                  {note.priority || 'Medium'}
                                </span>
                              </div>
                            </div>

                            <p className={`text-xs ${note.isCompleted ? 'line-through text-slate-500' : 'text-slate-300'} whitespace-pre-wrap leading-relaxed`}>
                              {note.content}
                            </p>

                            <div className="flex items-center justify-between mt-2 pt-2 border-t border-slate-900 text-[10px] text-slate-450">
                              <div className="flex items-center gap-2 text-slate-400">
                                <span className="flex items-center gap-1">
                                  <User className="h-3 w-3 text-indigo-400" />
                                  <span>{note.authorName}</span>
                                </span>
                                <span>•</span>
                                <span className="flex items-center gap-1">
                                  <Clock className="h-3 w-3 text-slate-500" />
                                  <span>{new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                </span>
                              </div>

                              <div className="flex items-center gap-2">
                                <button
                                  type="button"
                                  onClick={() => startEditing(note)}
                                  className="text-slate-400 hover:text-indigo-300 transition cursor-pointer"
                                  title="Edit Note"
                                >
                                  <Edit2 className="h-3 w-3" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteNote(note.id)}
                                  className="text-slate-400 hover:text-rose-400 transition cursor-pointer"
                                  title="Delete Note from DB"
                                >
                                  <Trash2 className="h-3 w-3" />
                                </button>
                              </div>
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

      </div>
    </div>
  );
};
