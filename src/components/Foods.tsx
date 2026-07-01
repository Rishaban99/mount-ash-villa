/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Food, User } from '../types';
import { Plus, Search, Edit2, Trash2, Utensils, Filter, DollarSign, Command } from 'lucide-react';
import { apiFetch } from '../utils/api';

interface FoodsProps {
  currentUser: User;
}

export const Foods: React.FC<FoodsProps> = ({ currentUser }) => {
  const [foods, setFoods] = useState<Food[]>([]);
  const [search, setSearch] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Form State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [foodName, setFoodName] = useState('');
  const [category, setCategory] = useState('');
  const [price, setPrice] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const fetchFoods = async () => {
    try {
      const res = await fetch('/api/foods');
      const data = await res.json();
      if (res.ok) {
        setFoods(data);
      }
    } catch (e) {
      console.error('Failed to load foods:', e);
    }
  };

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
  }, []);

  useEffect(() => {
    fetchFoods();
  }, []);

  const canAddFood = currentUser.role === 'admin' || 
    (currentUser.role === 'manager' && settings?.allowManagerAddFoods !== false) ||
    (currentUser.role === 'receptionist' && settings?.allowReceptionistAddFoods === true);

  const canEditFood = currentUser.role === 'admin' || 
    (currentUser.role === 'manager' && settings?.allowManagerEditFoods !== false) ||
    (currentUser.role === 'receptionist' && settings?.allowReceptionistEditFoods === true);

  const canDeleteFood = currentUser.role === 'admin' || 
    (currentUser.role === 'manager' && settings?.allowManagerDeleteFoods !== false) ||
    (currentUser.role === 'receptionist' && settings?.allowReceptionistDeleteFoods === true);

  const isAdmin = canAddFood || canEditFood || canDeleteFood;

  // Extract unique categories for filter
  const categories = ['All', ...Array.from(new Set(foods.map((f) => f.category)))];

  const handleOpenAdd = () => {
    setEditingId(null);
    setFoodName('');
    setCategory('Main Course');
    setPrice('');
    setError(null);
    setIsModalOpen(true);
  };

  const handleOpenEdit = (food: Food) => {
    setEditingId(food.id);
    setFoodName(food.foodName);
    setCategory(food.category);
    setPrice(food.price.toString());
    setError(null);
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName || !category || !price) {
      setError('All fields are required.');
      return;
    }

    setLoading(true);
    setError(null);

    const foodPayload = {
      id: editingId || undefined,
      foodName,
      category,
      price: Number(price),
    };

    try {
      const res = await apiFetch('/api/foods', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(foodPayload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to save food details.');
      }

      await fetchFoods();
      setIsModalOpen(false);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this food item?')) {
      return;
    }

    try {
      const res = await apiFetch(`/api/foods/${id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        await fetchFoods();
      }
    } catch (e) {
      console.error('Failed to delete food:', e);
    }
  };

  const filteredFoods = foods.filter((food) => {
    const matchesSearch = food.foodName.toLowerCase().includes(search.toLowerCase());
    const matchesCategory = filterCategory === 'All' || food.category === filterCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="space-y-6">
      
      {/* Title Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-display font-bold text-slate-900 flex items-center gap-2">
            <Utensils className="h-6 w-6 text-indigo-600" />
            Kitchen Food Menu
          </h1>
          <p className="text-sm text-slate-500">
            {isAdmin ? 'Add, edit, or configure room-service restaurant dishes' : 'Search and view restaurant selection'}
          </p>
        </div>
        {canAddFood && (
          <button
            onClick={handleOpenAdd}
            className="self-start sm:self-center flex items-center gap-2 py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md shadow-indigo-100 transition-all text-sm"
          >
            <Plus className="h-4 w-4" />
            Add Food Item
          </button>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white p-4 rounded-2xl border border-slate-100 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by Food name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-slate-55 border border-slate-200 rounded-xl text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/15 focus:border-indigo-600 transition-all font-sans"
          />
        </div>

        {/* Filters Category pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto py-1">
          <span className="text-xs font-semibold text-slate-400 flex items-center gap-1">
            <Filter className="h-3 w-3" />
            <span>Category:</span>
          </span>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setFilterCategory(cat)}
              className={`py-1.5 px-3 rounded-full text-xs font-medium transition-all duration-150 whitespace-nowrap ${
                filterCategory === cat
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-slate-50 hover:bg-slate-100 text-slate-650'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* Results List (Bento card style) */}
      {filteredFoods.length === 0 ? (
        <div className="bg-white p-12 text-center rounded-2xl border border-slate-100">
          <p className="text-slate-400 text-sm">No food items found matching filters.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredFoods.map((food) => (
            <div
              key={food.id}
              className="bg-white p-5 rounded-2xl border border-slate-100 shadow-xs hover:shadow-md hover:border-slate-200/80 transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between">
                  <span className="inline-flex px-2.5 py-1 bg-indigo-50 text-indigo-700 text-[10px] font-bold uppercase tracking-wider rounded-lg">
                    {food.category}
                  </span>
                  <div className="font-display font-semibold text-slate-800 text-sm">
                    Rs. {food.price.toLocaleString()}
                  </div>
                </div>

                <h3 className="font-display font-semibold text-slate-800 text-base">{food.foodName}</h3>
              </div>

              {/* Action Buttons for Authorized Operators */}
              {(canEditFood || canDeleteFood) && (
                <div className="mt-5 pt-3 border-t border-slate-50 flex items-center justify-end gap-2 text-right">
                  {canEditFood && (
                    <button
                      onClick={() => handleOpenEdit(food)}
                      className="p-1 px-2 text-xs bg-slate-50 hover:bg-indigo-50 text-slate-600 hover:text-indigo-600 rounded-lg flex items-center gap-1.5 transition-all"
                    >
                      <Edit2 className="h-3 w-3" />
                      Edit
                    </button>
                  )}
                  {canDeleteFood && (
                    <button
                      onClick={() => handleDelete(food.id)}
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

      {/* Add / Edit Food Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6 border border-slate-100">
            <h3 className="text-lg font-display font-semibold text-slate-900 mb-4 flex items-center gap-2">
              <Command className="h-5 w-5 text-indigo-600" />
              {editingId ? 'Modify Food Item' : 'Add Food Item to Menu'}
            </h3>

            <form onSubmit={handleSave} className="space-y-4">
              {error && (
                <div className="p-3 bg-rose-50 text-xs text-rose-600 rounded-xl flex items-center gap-2 border border-rose-100">
                  <span>{error}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Food Item Name
                </label>
                <input
                  type="text"
                  required
                  value={foodName}
                  onChange={(e) => setFoodName(e.target.value)}
                  placeholder="e.g. Club Sandwich with Fries"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Category Name
                </label>
                <input
                  type="text"
                  required
                  list="categories-list"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  placeholder="e.g. Snacks, Beverages, Main Course"
                  className="w-full px-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all font-sans"
                />
                <datalist id="categories-list">
                  <option value="Snacks" />
                  <option value="Main Course" />
                  <option value="Desserts" />
                  <option value="Beverages" />
                </datalist>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                  Price (Rs.)
                </label>
                <div className="relative">
                  <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 text-sm">Rs.</span>
                  <input
                    type="number"
                    required
                    value={price}
                    onChange={(e) => setPrice(e.target.value)}
                    placeholder="e.g. 750"
                    className="w-full pl-11 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-hidden focus:ring-2 focus:ring-indigo-600/10 focus:border-indigo-600 transition-all font-sans"
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
                  {loading ? 'Saving...' : 'Add Config'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
