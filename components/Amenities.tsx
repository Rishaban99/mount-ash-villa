'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Amenity, SystemSettings } from '@/lib/types';
import {
  Plus,
  Search,
  Edit2,
  Trash2,
  Sparkles,
  Filter,
  DollarSign,
  Eye,
  EyeOff,
  Wifi,
  Tv,
  Coffee,
  Car,
  Dumbbell,
  Waves,
  Shield,
  Utensils,
  Wind,
  Sun,
  Bath,
  Clock,
  Check,
  X,
  HelpCircle,
  type LucideIcon,
} from 'lucide-react';
import { LoadingButton } from '@/components/loading-button';
import { apiFetch } from '@/lib/api';
import { toastCreated, toastUpdated, toastDeleted, toastError } from '@/lib/crud-toast';
import { useAuth } from '@/components/auth-provider';
import { hasPermission } from '@/lib/permissions';

const ICON_MAP: Record<string, LucideIcon> = {
  Sparkles,
  Wifi,
  Tv,
  Coffee,
  Car,
  Dumbbell,
  Waves,
  Shield,
  Utensils,
  Wind,
  Sun,
  Bath,
  Clock,
};

const CATEGORIES = [
  'General',
  'Connectivity & Tech',
  'Pool & Spa',
  'Fitness & Wellness',
  'Dining & Beverages',
  'Transport & Parking',
  'Room Comforts',
  'Guest Services',
];

export const Amenities: React.FC = () => {
  const { user: currentUser } = useAuth();
  if (!currentUser) return null;

  const [amenities, setAmenities] = useState<Amenity[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [category, setCategory] = useState('General');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [isFree, setIsFree] = useState(true);
  const [isAvailable, setIsAvailable] = useState(true);
  const [icon, setIcon] = useState('Sparkles');

  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [togglingId, setTogglingId] = useState<string | null>(null);
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

  const fetchAmenities = async () => {
    try {
      const res = await fetch('/api/amenities');
      if (res.ok) {
        const data = await res.json();
        setAmenities(data);
      }
    } catch (e) {
      console.error('Failed to load amenities:', e);
    }
  };

  useEffect(() => {
    fetchAmenities();
  }, []);

  const canAdd =
    currentUser.role === 'admin' ||
    hasPermission(currentUser.role, 'allowReceptionistAddAmenities', settings) ||
    hasPermission(currentUser.role, 'allowManagerAddAmenities', settings);

  const canEdit =
    currentUser.role === 'admin' ||
    hasPermission(currentUser.role, 'allowReceptionistEditAmenities', settings) ||
    hasPermission(currentUser.role, 'allowManagerEditAmenities', settings);

  const canDelete =
    currentUser.role === 'admin' ||
    hasPermission(currentUser.role, 'allowReceptionistDeleteAmenities', settings) ||
    hasPermission(currentUser.role, 'allowManagerDeleteAmenities', settings);

  const rawCategories = amenities.map((a) => a.category).filter((c) => c && c.trim().toLowerCase() !== 'all');
  const availableCategories = ['All', ...Array.from(new Set(rawCategories))];

  const handleOpenAdd = () => {
    setEditingId(null);
    setName('');
    setCategory('General');
    setDescription('');
    setPrice('');
    setIsFree(true);
    setIsAvailable(true);
    setIcon('Sparkles');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (item: Amenity) => {
    setEditingId(item.id);
    setName(item.name);
    setCategory(item.category);
    setDescription(item.description || '');
    setPrice(item.price !== undefined && item.price !== null ? item.price.toString() : '');
    setIsFree(item.isFree !== false);
    setIsAvailable(item.isAvailable !== false);
    setIcon(item.icon || 'Sparkles');
    setError(null);
    setIsModalOpen(true);
  };

  const handleToggleAvailable = async (item: Amenity) => {
    if (!canEdit || togglingId === item.id) return;
    setTogglingId(item.id);
    const newStatus = !(item.isAvailable !== false);
    try {
      const res = await apiFetch('/api/amenities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...item,
          isAvailable: newStatus,
        }),
      });
      if (res.ok) {
        toastUpdated(`"${item.name}" availability updated to ${newStatus ? 'Available' : 'Unavailable'}.`);
        await fetchAmenities();
      } else {
        toastError('Failed to update amenity status.');
      }
    } catch (e) {
      toastError('Failed to update amenity status.');
    } finally {
      setTogglingId(null);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !category.trim()) {
      setError('Name and Category are required fields.');
      return;
    }

    setLoading(true);
    setError(null);

    const payload = {
      id: editingId || undefined,
      name: name.trim(),
      category: category.trim(),
      description: description.trim(),
      price: isFree ? 0 : parseFloat(price) || 0,
      isFree,
      isAvailable,
      icon,
    };

    try {
      const res = await apiFetch('/api/amenities', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        if (editingId) {
          toastUpdated(`Amenity "${name}" saved.`);
        } else {
          toastCreated(`Amenity "${name}" registered successfully.`);
        }
        setIsModalOpen(false);
        await fetchAmenities();
      } else {
        const errData = await res.json();
        setError(errData.error || 'Failed to save amenity.');
        toastError(errData.error || 'Failed to save amenity.');
      }
    } catch (e) {
      setError('Database connection error.');
      toastError('Database connection error.');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, amenityName: string) => {
    if (!canDelete) return;
    if (!window.confirm(`Are you sure you want to delete amenity "${amenityName}"?`)) return;

    setDeletingId(id);
    try {
      const res = await apiFetch(`/api/amenities/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        toastDeleted(`Amenity "${amenityName}"`);
        await fetchAmenities();
      } else {
        const errData = await res.json();
        toastError(errData.error || 'Failed to delete amenity.');
      }
    } catch (e) {
      toastError('Failed to execute delete call upstream.');
    } finally {
      setDeletingId(null);
    }
  };

  const filteredAmenities = amenities.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(search.toLowerCase()) ||
      item.category.toLowerCase().includes(search.toLowerCase()) ||
      (item.description && item.description.toLowerCase().includes(search.toLowerCase()));
    const matchesCategory = filterCategory === 'All' || item.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6 text-slate-850 animate-fade-in">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white p-6 rounded-3xl border border-slate-200/60 shadow-xs">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="font-display font-bold text-xl text-slate-800">Amenities & Hotel Facilities</h1>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              {amenities.length} Active Items
            </span>
          </div>
          <p className="text-slate-500 text-xs mt-1">
            Manage guest room services, hotel facilities, Wi-Fi, pool/spa amenities, and extra features.
          </p>
        </div>

        {canAdd && (
          <button
            onClick={handleOpenAdd}
            className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-2 shadow-sm cursor-pointer"
          >
            <Plus className="h-4 w-4" />
            Add Amenity / Facility
          </button>
        )}
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200/60 shadow-xs">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search amenity name, category..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-4 py-2 border border-slate-200 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-slate-50/50"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
          <Filter className="h-4 w-4 text-slate-400 shrink-0 ml-1" />
          {availableCategories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                filterCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Amenity Cards Grid */}
      {filteredAmenities.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/60 p-12 text-center text-slate-400 space-y-3">
          <Sparkles className="h-10 w-10 mx-auto text-slate-300 animate-pulse" />
          <p className="text-sm font-semibold">No amenities found.</p>
          <p className="text-xs text-slate-400">Try adjusting your search query or add a new facility item.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredAmenities.map((item) => {
            const IconComp = ICON_MAP[item.icon || 'Sparkles'] || Sparkles;
            const isAvail = item.isAvailable !== false;

            return (
              <div
                key={item.id}
                className={`bg-white rounded-2xl border p-5 transition-all duration-200 hover:shadow-md flex flex-col justify-between space-y-4 relative ${
                  isAvail ? 'border-slate-200/80' : 'border-slate-200 bg-slate-50/40 opacity-75'
                }`}
              >
                <div>
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 rounded-xl bg-indigo-50 text-indigo-600 border border-indigo-100 shadow-xs">
                        <IconComp className="h-5 w-5" />
                      </div>
                      <div>
                        <h3 className="font-display font-bold text-sm text-slate-800 line-clamp-1">{item.name}</h3>
                        <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider block">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${
                        item.isFree
                          ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                          : 'bg-amber-50 text-amber-700 border-amber-200'
                      }`}
                    >
                      {item.isFree ? 'FREE' : `LKR ${item.price}`}
                    </span>
                  </div>

                  {item.description && (
                    <p className="text-slate-500 text-xs line-clamp-2 leading-relaxed bg-slate-50 p-2.5 rounded-xl border border-slate-100/80">
                      {item.description}
                    </p>
                  )}
                </div>

                {/* Footer Controls */}
                <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleToggleAvailable(item)}
                    disabled={!canEdit || togglingId === item.id}
                    title={isAvail ? 'Click to set Unavailable' : 'Click to set Available'}
                    className={`flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                      isAvail
                        ? 'bg-emerald-50/80 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                        : 'bg-slate-100 text-slate-500 border-slate-200 hover:bg-slate-200'
                    }`}
                  >
                    {isAvail ? <Eye className="h-3.5 w-3.5" /> : <EyeOff className="h-3.5 w-3.5" />}
                    {isAvail ? 'Available' : 'Unavailable'}
                  </button>

                  <div className="flex items-center gap-1">
                    {canEdit && (
                      <button
                        onClick={() => handleOpenEdit(item)}
                        className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors cursor-pointer"
                        title="Edit amenity details"
                      >
                        <Edit2 className="h-4 w-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => handleDelete(item.id, item.name)}
                        disabled={deletingId === item.id}
                        className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                        title="Delete amenity"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/50 backdrop-blur-xs z-50 flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-indigo-50 text-indigo-600 rounded-xl">
                  <Sparkles className="h-5 w-5" />
                </div>
                <div>
                  <h2 className="font-display font-bold text-base text-slate-800">
                    {editingId ? 'Edit Amenity Details' : 'Register New Amenity'}
                  </h2>
                  <p className="text-[11px] text-slate-400">Configure facility name, pricing, and guest availability.</p>
                </div>
              </div>

              <button
                onClick={() => setIsModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {error && (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 px-3.5 py-2.5 rounded-xl text-xs font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSave} className="space-y-4">
              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Amenity Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Infinity Swimming Pool, High-Speed Wi-Fi"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Category</label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    {CATEGORIES.map((cat) => (
                      <option key={cat} value={cat}>
                        {cat}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Display Icon</label>
                  <select
                    value={icon}
                    onChange={(e) => setIcon(e.target.value)}
                    className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                  >
                    {Object.keys(ICON_MAP).map((ic) => (
                      <option key={ic} value={ic}>
                        {ic}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Pricing option */}
              <div className="p-3.5 bg-slate-50 border border-slate-100 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-700 flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={isFree}
                      onChange={(e) => setIsFree(e.target.checked)}
                      className="accent-indigo-600 h-4 w-4 rounded"
                    />
                    Complimentary / Free for Guests
                  </label>
                  <span className="text-[10px] text-slate-400">
                    {isFree ? 'Included with room' : 'Paid service'}
                  </span>
                </div>

                {!isFree && (
                  <div className="space-y-1 pt-1">
                    <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">
                      Price (LKR)
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="0.00"
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none bg-white"
                    />
                  </div>
                )}
              </div>

              <div className="space-y-1">
                <label className="text-[11px] font-bold text-slate-600 uppercase tracking-wider">Description (Optional)</label>
                <textarea
                  rows={3}
                  placeholder="Provide brief details about location, operational hours, or access guidelines..."
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full px-3.5 py-2 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-between pt-2">
                <label className="flex items-center gap-2 text-xs font-bold text-slate-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={isAvailable}
                    onChange={(e) => setIsAvailable(e.target.checked)}
                    className="accent-indigo-600 h-4 w-4 rounded"
                  />
                  Active & Visible to Guests
                </label>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setIsModalOpen(false)}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-600 rounded-xl text-xs font-bold transition-all"
                  >
                    Cancel
                  </button>
                  <LoadingButton
                    type="submit"
                    loading={loading}
                    loadingLabel="Saving..."
                    className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold shadow-sm transition-all"
                  >
                    Save Amenity
                  </LoadingButton>
                </div>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
