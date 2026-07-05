'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Room, RoomType, RoomStatus, User } from '@/lib/types';
import { Plus, Search, Edit2, Trash2, Hotel, Tag, DollarSign, Command, Sparkles, Filter } from 'lucide-react';
import { apiFetch } from '@/lib/api';
import { useAuth } from '@/components/auth-provider';
import { dedupeRoomsByNumber } from '@/lib/rooms';
import { hasPermission } from '@/lib/permissions';
import type { SystemSettings } from '@/lib/types';

export const Rooms: React.FC = () => {
  const { user: currentUser } = useAuth();
  if (!currentUser) return null;
  const [rooms, setRooms] = useState<Room[]>([]);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState<string>('All');
  const [filterStatus, setFilterStatus] = useState<string>('All');
  
  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [roomNumber, setRoomNumber] = useState('');
  const [roomType, setRoomType] = useState<RoomType>('Single');
  const [price, setPrice] = useState('');
  const [status, setStatus] = useState<RoomStatus>('Available');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchRooms = async () => {
    try {
      const res = await fetch('/api/rooms');
      const data = await res.json();
      if (res.ok) {
        setRooms(dedupeRoomsByNumber(data));
      }
    } catch (e) {
      console.error('Failed to load rooms:', e);
    }
  };

  const [settings, setSettings] = useState<SystemSettings | null>(null);

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
  }, []);

  useEffect(() => {
    fetchRooms();
  }, []);

  const canAddRoom = hasPermission(currentUser.role, 'allowReceptionistAddRooms', settings) ||
    hasPermission(currentUser.role, 'allowManagerAddRooms', settings);

  const canEditRoom = hasPermission(currentUser.role, 'allowReceptionistEditRooms', settings) ||
    hasPermission(currentUser.role, 'allowManagerEditRooms', settings);

  const canDeleteRoom = hasPermission(currentUser.role, 'allowReceptionistDeleteRooms', settings) ||
    hasPermission(currentUser.role, 'allowManagerDeleteRooms', settings);

  const isAdmin = canAddRoom || canEditRoom || canDeleteRoom;

  const handleOpenAdd = () => {
    setEditingId(null);
    setRoomNumber('');
    setRoomType('Single');
    setPrice('');
    setStatus('Available');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (room: Room) => {
    setEditingId(room.id);
    setRoomNumber(room.roomNumber);
    setRoomType(room.roomType);
    setPrice(room.price.toString());
    setStatus(room.status);
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!roomNumber || !price) {
      setError('Please provide room number and price.');
      return;
    }

    setLoading(true);
    setError(null);

    const roomPayload = {
      id: editingId || undefined,
      roomNumber,
      roomType,
      price: Number(price),
      status,
    };

    try {
      const res = await apiFetch('/api/rooms', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(roomPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save room details.');
      }

      await fetchRooms();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this room? This action is irreversible.')) {
      return;
    }

    try {
      const res = await apiFetch(`/api/rooms/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchRooms();
      }
    } catch (e) {
      console.error('Failed to delete room:', e);
    }
  };

  const filteredRooms = rooms.filter((room) => {
    const matchesSearch = room.roomNumber.toLowerCase().includes(search.toLowerCase());
    const matchesType = filterType === 'All' || room.roomType === filterType;
    const matchesStatus = filterStatus === 'All' || room.status === filterStatus;
    return matchesSearch && matchesType && matchesStatus;
  });

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
            <Hotel className="h-6 w-6 text-indigo-600" />
            Room Inventory Matrix
          </h1>
          <p className="text-sm text-slate-500">
            {isAdmin ? 'Add, edit, or configure hotel guest rooms' : 'Search and view active room status'}
          </p>
        </div>
        {canAddRoom && (
          <button
            onClick={handleOpenAdd}
            className="self-start sm:self-center flex items-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md shadow-indigo-100 transition-all text-sm"
          >
            <Plus className="h-4 w-4" />
            Add New Room
          </button>
        )}
      </div>

      {/* Stats Quick Readout */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">Total Rooms</div>
          <div className="text-2xl font-display font-semibold text-slate-800 mt-1">{rooms.length}</div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="text-[11px] font-semibold text-emerald-500 uppercase tracking-wider">Available</div>
          <div className="text-2xl font-display font-semibold text-slate-800 mt-1">
            {rooms.filter(r => r.status === 'Available').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="text-[11px] font-semibold text-rose-500 uppercase tracking-wider">Occupied</div>
          <div className="text-2xl font-display font-semibold text-slate-800 mt-1">
            {rooms.filter(r => r.status === 'Occupied').length}
          </div>
        </div>
        <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs">
          <div className="text-[11px] font-semibold text-indigo-500 uppercase tracking-wider">Avg Price</div>
          <div className="text-2xl font-display font-semibold text-slate-800 mt-1">
            Rs. {rooms.length ? Math.round(rooms.reduce((acc, r) => acc + r.price, 0) / rooms.length) : 0}
          </div>
        </div>
      </div>

      {/* Filters & Search Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Room number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600 transition-all font-sans"
          />
        </div>

        {/* Filters */}
        <div className="flex items-center gap-3 self-stretch md:self-auto overflow-x-auto">
          <div className="flex items-center gap-1.5 shrink-0 text-slate-500 text-xs font-semibold">
            <Filter className="h-3.5 w-3.5" />
            <span>Filters:</span>
          </div>
          
          <select
            value={filterType}
            onChange={(e) => setFilterType(e.target.value)}
            className="py-1.5 px-3 bg-slate-55 border border-slate-200 text-xs text-slate-600 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          >
            <option value="All">All Types</option>
            <option value="Single">Single</option>
            <option value="Double">Double</option>
            <option value="Triple">Triple</option>
          </select>

          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="py-1.5 px-3 bg-slate-55 border border-slate-200 text-xs text-slate-600 rounded-lg focus:outline-hidden focus:ring-1 focus:ring-indigo-500"
          >
            <option value="All">All Statuses</option>
            <option value="Available">Available</option>
            <option value="Occupied">Occupied</option>
          </select>
        </div>
      </div>

      {/* Results Grid */}
      {filteredRooms.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-100">
          <p className="text-slate-400 text-sm">No rooms found matching your search options.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredRooms.map((room) => (
            <div
              key={room.id}
              className="group bg-white rounded-2xl border border-slate-100 shadow-xs hover:shadow-md hover:border-slate-200/80 transition-all p-5 flex flex-col justify-between"
            >
              <div>
                <div className="flex items-start justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="h-10 w-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center font-display font-bold text-sm tracking-wide">
                      {room.roomNumber}
                    </div>
                    <div>
                      <div className="text-sm font-semibold text-slate-800">Room {room.roomNumber}</div>
                      <div className="text-[10px] uppercase font-bold text-indigo-500 tracking-wider">
                        {room.roomType} Room
                      </div>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold gap-1.5 ${
                      room.status === 'Available'
                        ? 'bg-emerald-50 text-emerald-700 border border-emerald-100'
                        : 'bg-amber-50 text-amber-700 border border-amber-100'
                    }`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${room.status === 'Available' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
                    {room.status}
                  </span>
                </div>

                <div className="mt-6 flex items-baseline gap-1 text-slate-900 border-t border-slate-50 pt-4">
                  <span className="text-sm text-slate-400 font-sans">Rs.</span>
                  <span className="text-lg font-display font-semibold">{room.price.toLocaleString()}</span>
                  <span className="text-xs text-slate-400 ml-1 font-sans">/ Night</span>
                </div>
              </div>

              {/* Action Buttons for Authorized Operators */}
              {(canEditRoom || canDeleteRoom) && (
                <div className="mt-5 pt-3 border-t border-slate-50 flex items-center justify-end gap-2 shrink-0">
                  {canEditRoom && (
                    <button
                      onClick={() => handleOpenEdit(room)}
                      className="p-1 px-2 text-xs bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg flex items-center gap-1.5 transition-all"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </button>
                  )}
                  {canDeleteRoom && (
                    <button
                      onClick={() => handleDelete(room.id)}
                      className="p-1 px-2 text-xs bg-slate-50 hover:bg-rose-50 text-slate-600 hover:text-rose-600 rounded-lg flex items-center gap-1.5 transition-all"
                    >
                      <Trash2 className="h-3 w-3" />
                      Delete
                    </button>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Room Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100">
            <h3 className="text-lg font-display font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Command className="h-5 w-5 text-indigo-600" />
              {editingId ? 'Modify Room Configurations' : 'Register New Hotel Room'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 text-xs text-rose-600 rounded-xl flex items-center gap-2 border border-rose-100">
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Room Number
                </label>
                <input
                  type="text"
                  required
                  value={roomNumber}
                  onChange={(e) => setRoomNumber(e.target.value)}
                  placeholder="e.g. 104"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Room Type
                  </label>
                  <select
                    value={roomType}
                    onChange={(e) => setRoomType(e.target.value as RoomType)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all"
                  >
                    <option value="Single">Single</option>
                    <option value="Double">Double</option>
                    <option value="Triple">Triple</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Status Code
                  </label>
                  <select
                    value={status}
                    onChange={(e) => setStatus(e.target.value as RoomStatus)}
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all"
                  >
                    <option value="Available">Available</option>
                    <option value="Occupied">Occupied</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Price Per Night (Rs.)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rs.</span>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 3500"
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all"
                  />
                </div>
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 py-2.5 px-4 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all text-sm"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all text-sm disabled:opacity-50"
                >
                  {loading ? 'Saving...' : 'Save Config'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
