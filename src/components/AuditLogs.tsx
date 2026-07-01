/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useCallback } from 'react';
import { AuditLog } from '../types';
import { apiFetch } from '../utils/api';
import {
  ScrollText,
  Search,
  Filter,
  ChevronDown,
  ChevronUp,
  RefreshCw,
  User,
  Clock,
  Loader2,
} from 'lucide-react';

const ENTITY_TYPES = [
  { value: '', label: 'All Entities' },
  { value: 'user', label: 'Users' },
  { value: 'room', label: 'Rooms' },
  { value: 'food', label: 'Food' },
  { value: 'guest', label: 'Guests' },
  { value: 'bill', label: 'Bills' },
  { value: 'expense', label: 'Expenses' },
  { value: 'settings', label: 'Settings' },
  { value: 'memo', label: 'Memos' },
  { value: 'closed_month', label: 'Closed Months' },
  { value: 'auth', label: 'Auth' },
];

const ACTION_STYLES: Record<string, string> = {
  CREATE: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  UPDATE: 'bg-blue-100 text-blue-800 border-blue-200',
  DELETE: 'bg-rose-100 text-rose-800 border-rose-200',
  LOGIN: 'bg-slate-100 text-slate-700 border-slate-200',
};

const PAGE_SIZE = 50;

export const AuditLogs: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [entityType, setEntityType] = useState('');
  const [fromDate, setFromDate] = useState('');
  const [toDate, setToDate] = useState('');
  const [actorSearch, setActorSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

  const fetchLogs = useCallback(async (reset = false) => {
    setLoading(true);
    setError(null);
    const currentOffset = reset ? 0 : offset;
    try {
      const params = new URLSearchParams({
        limit: String(PAGE_SIZE),
        offset: String(currentOffset),
      });
      if (entityType) params.set('entityType', entityType);
      if (fromDate) params.set('from', fromDate);
      if (toDate) params.set('to', toDate);

      const res = await apiFetch(`/api/audit-logs?${params.toString()}`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || 'Failed to load audit logs');
      }
      const data: AuditLog[] = await res.json();
      if (reset) {
        setLogs(data);
        setOffset(PAGE_SIZE);
      } else {
        setLogs((prev) => [...prev, ...data]);
        setOffset((prev) => prev + PAGE_SIZE);
      }
      setHasMore(data.length === PAGE_SIZE);
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  }, [entityType, fromDate, toDate, offset]);

  useEffect(() => {
    setOffset(0);
    fetchLogs(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entityType, fromDate, toDate]);

  const filteredLogs = actorSearch.trim()
    ? logs.filter(
        (log) =>
          log.actorName.toLowerCase().includes(actorSearch.toLowerCase()) ||
          log.actorRole.toLowerCase().includes(actorSearch.toLowerCase())
      )
    : logs;

  const formatTimestamp = (ts: string) => {
    try {
      const d = new Date(ts);
      return d.toLocaleString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
      });
    } catch {
      return ts;
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 md:p-5">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 flex items-center justify-center">
            <ScrollText className="h-5 w-5 text-indigo-600" />
          </div>
          <div>
            <h2 className="font-display font-bold text-slate-850 text-lg">System Audit Trail</h2>
            <p className="text-xs text-slate-500">Chronological record of all create, update, and delete operations</p>
          </div>
          <button
            onClick={() => fetchLogs(true)}
            disabled={loading}
            className="ml-auto flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            Refresh
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <select
              value={entityType}
              onChange={(e) => setEntityType(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            >
              {ENTITY_TYPES.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            placeholder="From date"
          />
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full px-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            placeholder="To date"
          />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={actorSearch}
              onChange={(e) => setActorSearch(e.target.value)}
              placeholder="Search by actor name..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg bg-slate-50 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
            />
          </div>
        </div>
      </div>

      {error && (
        <div className="bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg px-4 py-3">
          {error}
        </div>
      )}

      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        {loading && logs.length === 0 ? (
          <div className="flex items-center justify-center py-16 text-slate-400">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            Loading audit logs...
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-sm">No audit log entries found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-left">
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    <span className="flex items-center gap-1"><Clock className="h-3.5 w-3.5" /> When</span>
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">
                    <span className="flex items-center gap-1"><User className="h-3.5 w-3.5" /> Who</span>
                  </th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Action</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Entity</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider">Summary</th>
                  <th className="px-4 py-3 font-semibold text-slate-600 text-xs uppercase tracking-wider w-16">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLogs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-4 py-3 text-slate-600 whitespace-nowrap font-mono text-xs">
                        {formatTimestamp(log.timestamp)}
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-medium text-slate-800">{log.actorName}</div>
                        <div className="text-[10px] text-slate-400 uppercase font-bold">{log.actorRole}</div>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider border ${
                            ACTION_STYLES[log.action] ?? 'bg-slate-100 text-slate-600'
                          }`}
                        >
                          {log.action}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="text-slate-700 capitalize">{log.entityType.replace('_', ' ')}</div>
                        {log.entityLabel && (
                          <div className="text-[10px] text-slate-400 truncate max-w-[140px]">{log.entityLabel}</div>
                        )}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate" title={log.summary}>
                        {log.summary}
                      </td>
                      <td className="px-4 py-3">
                        {log.details && Object.keys(log.details).length > 0 ? (
                          <button
                            onClick={() => setExpandedId(expandedId === log.id ? null : log.id)}
                            className="p-1 rounded hover:bg-slate-100 text-slate-400 hover:text-indigo-600 transition-colors"
                          >
                            {expandedId === log.id ? (
                              <ChevronUp className="h-4 w-4" />
                            ) : (
                              <ChevronDown className="h-4 w-4" />
                            )}
                          </button>
                        ) : (
                          <span className="text-slate-300">—</span>
                        )}
                      </td>
                    </tr>
                    {expandedId === log.id && log.details && (
                      <tr>
                        <td colSpan={6} className="px-4 py-3 bg-slate-50">
                          <pre className="text-xs font-mono text-slate-600 overflow-x-auto whitespace-pre-wrap">
                            {JSON.stringify(log.details, null, 2)}
                          </pre>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {hasMore && !loading && (
          <div className="border-t border-slate-100 p-4 text-center">
            <button
              onClick={() => fetchLogs(false)}
              disabled={loading}
              className="px-4 py-2 text-sm font-semibold text-indigo-600 bg-indigo-50 border border-indigo-100 rounded-lg hover:bg-indigo-100 transition-colors"
            >
              {loading ? 'Loading...' : 'Load More'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
