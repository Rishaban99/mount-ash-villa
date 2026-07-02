/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { User } from '../types';
import { LogIn, Hotel, Shield, AlertCircle } from 'lucide-react';
import { Logo } from './Logo';
import { apiFetch } from '../utils/api';

interface LoginProps {
  onLoginSuccess: (user: User) => void;
}

export const Login: React.FC<LoginProps> = ({ onLoginSuccess }) => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setError('Please Enter both Username and Password.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiFetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authenication failed. Invalid credentials.');
      }

      onLoginSuccess(data.user);
    } catch (err: any) {
      setError(err.message || 'Server error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      
      {/* Decorative top shape */}
      <div className="absolute top-0 inset-x-0 h-80 bg-linear-to-b from-indigo-100/60 to-transparent pointer-events-none" />

      <div className="max-w-md w-full space-y-8 relative">
        
        {/* Header Branding */}
        <div className="text-center">
          <div className="mx-auto bg-white p-2 rounded-full h-32 w-32 flex items-center justify-center shadow-md border border-slate-100">
            <Logo size={115} className="text-slate-900" />
          </div>
          <h2 className="mt-4 text-center text-3xl font-display font-bold tracking-tight text-slate-950">
            Mount Ash Villa
          </h2>
          <p className="mt-1 text-center text-xs text-slate-500 font-mono tracking-wider uppercase">
            POS & Terminal Manager
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white py-8 px-4 shadow-sm rounded-2xl border border-slate-100 sm:px-10">
          <form className="space-y-6" onSubmit={handleLogin}>
            
            {error && (
              <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl flex items-center gap-2.5 text-sm text-rose-600">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label htmlFor="username" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Username
              </label>
              <input
                id="username"
                name="username"
                type="text"
                autoComplete="username"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter your username"
                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-sans text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-all"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter your password"
                className="block w-full px-4 py-3 bg-slate-50 border border-slate-200 rounded-xl font-sans text-sm text-slate-800 placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-600/20 focus:border-indigo-600 focus:bg-white transition-all"
              />
            </div>

            <div>
              <button
                type="submit"
                disabled={loading}
                className="w-full h-12 flex items-center justify-center gap-2 px-4 bg-indigo-600 hover:bg-indigo-700 text-white font-medium rounded-xl shadow-md shadow-indigo-100 transition-all disabled:opacity-50"
              >
                {loading ? (
                  <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : (
                  <>
                    <LogIn className="h-4 w-4" />
                    Sign In to Portal
                  </>
                )}
              </button>
            </div>

          </form>

          

        </div>

      </div>
    </div>
  );
};
