'use client';

/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Guest } from '@/lib/types';
import { Plus, Search, Calendar, Phone, FileText, UserPlus, Home, User, Command } from 'lucide-react';
import { LoadingButton } from '@/components/loading-button';
import { apiFetch } from '@/lib/api';
import { toastCreated, toastError } from '@/lib/crud-toast';
import { useAuth } from '@/components/auth-provider';
import { hasPermission } from '@/lib/permissions';
import type { SystemSettings } from '@/lib/types';

interface GuestsProps {
  onSelectGuest?: (guest: Guest) => void; 
}

export const Guests: React.FC<GuestsProps> = ({ onSelectGuest }) => {
  const { user: currentUser } = useAuth();
  const [guests, setGuests] = useState<Guest[]>([]);
  const [search, setSearch] = useState('');
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  
  // Registration Form
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [nic, setNic] = useState('');
  const [address, setAddress] = useState('');
  const [checkInDate, setCheckInDate] = useState(new Date().toISOString().split('T')[0]);
  
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchGuests = async () => {
    try {
      const res = await fetch('/api/guests');
      const data = await res.json();
      if (res.ok) {
        setGuests(data);
      }
    } catch (e) {
      console.error('Failed to load guests:', e);
    }
  };

  useEffect(() => {
    fetchGuests();
    const cached = localStorage.getItem('system_settings_cache');
    if (cached) {
      try {
        setSettings(JSON.parse(cached));
      } catch {}
    }
    const fetchSettings = async () => {
      try {
        const res = await fetch('/api/settings');
        if (res.ok) {
          const data = await res.json();
          setSettings(data);
          localStorage.setItem('system_settings_cache', JSON.stringify(data));
        }
      } catch {}
    };
    fetchSettings();
  }, []);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !nic || !checkInDate) {
      setError('Please fill in all mandatory fields (Name, Identification, and Check-In Date).');
      return;
    }

    setLoading(true);
    setError(null);

    const guestPayload = {
      name,
      phone,
      nic,
      address,
      checkInDate,
      checkOutDate: '',
    };

    try {
      const res = await apiFetch('/api/guests', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(guestPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to register guest details.');
      }

      toastCreated('Guest');

      // Refresh guest database
      await fetchGuests();
      setIsFormOpen(false);
      
      // Auto-trigger selection if helper callback is attached
      if (onSelectGuest) {
        onSelectGuest(data);
      }

      // Reset
      setName('');
      setPhone('');
      setNic('');
      setAddress('');
    } catch (err: any) {
      toastError(err.message);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const canManageGuests =
    !currentUser ||
    currentUser.role === 'admin' ||
    currentUser.role === 'manager' ||
    hasPermission(currentUser.role, 'allowReceptionistManageGuests', settings);

  const filteredGuests = guests.filter((guest) => {
    const term = search.toLowerCase();
    return (
      guest.name.toLowerCase().includes(term) ||
      guest.nic.toLowerCase().includes(term)
    );
  });

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
            <User className="h-6 w-6 text-indigo-600" />
            Guest Registry Manager
          </h1>
          <p className="text-sm text-slate-500">
            Register arriving hotel guests and manage profile databases
          </p>
        </div>
        
        {canManageGuests && (
        <button
          onClick={() => setIsFormOpen(true)}
          className="self-start sm:self-center flex items-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md shadow-indigo-100 transition-all text-sm"
        >
          <UserPlus className="h-4 w-4" />
          Register New Guest
        </button>
        )}
      </div>

      {/* Toolbar Search */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 relative">
        <div className="relative">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Name, NIC/Passport number, or Mobile..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600 transition-all font-sans"
          />
        </div>
      </div>

      {/* Guests table layout */}
      {filteredGuests.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-100">
          <p className="text-slate-400 text-sm">No registered guests match search query.</p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="bg-slate-50/70 border-b border-slate-100 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                  <th className="py-4 px-6">Guest Details</th>
                  <th className="py-4 px-6">NIC / Passport</th>
                  <th className="py-4 px-6">Address</th>
                  <th className="py-4 px-6">Check-in Date</th>
                  {onSelectGuest && <th className="py-4 px-6 text-right">Actions</th>}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {filteredGuests.map((guest) => (
                  <tr key={guest.id} className="hover:bg-slate-50/50 transition-colors">
                    
                    <td className="py-4 px-6">
                      <div className="font-semibold text-slate-800 text-sm">{guest.name}</div>
                    </td>

                    <td className="py-4 px-6 font-mono text-xs text-slate-600">
                      {guest.nic}
                    </td>

                    <td className="py-4 px-6 text-slate-500 text-xs max-w-xs truncate">
                      {guest.address}
                    </td>

                    <td className="py-4 px-6">
                      <div className="flex items-center gap-2.5 text-xs">
                        <div className="flex items-center gap-1 text-slate-500">
                          <span className="font-bold text-[9px] uppercase text-emerald-500 tracking-wider">In:</span>
                          <span>{guest.checkInDate}</span>
                        </div>
                      </div>
                    </td>

                    {onSelectGuest && (
                      <td className="py-4 px-6 text-right">
                        <button
                          onClick={() => onSelectGuest(guest)}
                          className="py-1.5 px-3 bg-indigo-50 hover:bg-indigo-600 text-indigo-600 hover:text-white rounded-lg text-xs font-semibold transition-all shadow-xs"
                        >
                          Select Bill Guest
                        </button>
                      </td>
                    )}

                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Guest registration dialog */}
      {isFormOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg p-6 border border-slate-100">
            <h3 className="text-lg font-display font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Command className="h-5 w-5 text-indigo-600" />
              Arriving Guest Registration
            </h3>

            <form onSubmit={handleRegister} className="space-y-4 font-sans">
              
              {error && (
                <div className="p-3 bg-rose-50 text-xs text-rose-600 rounded-xl border border-rose-100">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Guest Full Name
                </label>
                <input
                  type="text"
                  required
                  disabled={loading}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. John Doe"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all font-sans"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    NIC / Passport No.
                  </label>
                  <input
                    type="text"
                    required
                    disabled={loading}
                    value={nic}
                    onChange={(e) => setNic(e.target.value)}
                    placeholder="e.g. 1995029302V"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                    Address
                  </label>
                  <input
                    type="text"
                    disabled={loading}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                    placeholder="e.g. 45, Galle Rd, Colombo"
                    className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Check-in Date
                </label>
                <input
                  type="date"
                  required
                  disabled={loading}
                  value={checkInDate}
                  onChange={(e) => setCheckInDate(e.target.value)}
                  className="w-full px-4 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all font-sans"
                />
              </div>

              <div className="flex items-center gap-3 pt-4 border-t border-slate-50">
                <button
                  type="button"
                  onClick={() => setIsFormOpen(false)}
                  disabled={loading}
                  className="flex-1 py-1 px-4 h-11 bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium rounded-xl transition-all text-sm disabled:opacity-50"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  loading={loading}
                  loadingLabel="Processing..."
                  className="flex-1 py-1 px-4 h-11 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl transition-all text-sm flex items-center justify-center gap-2"
                >
                  Register Profile
                </LoadingButton>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
