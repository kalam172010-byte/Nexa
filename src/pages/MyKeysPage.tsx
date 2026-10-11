import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Copy,
  Check,
  Search,
  Filter,
  Clock,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  Eye,
  RefreshCw,
} from 'lucide-react';
import { api } from '../services/api.js';
import { DigitalKey } from '../types/index.js';
import { useToast } from '../context/ToastContext.js';

interface MyKeysPageProps {
  onNavigateBuy: () => void;
}

export const MyKeysPage: React.FC<MyKeysPageProps> = ({ onNavigateBuy }) => {
  const { success: showToastSuccess, error: showToastError } = useToast();
  const [keys, setKeys] = useState<DigitalKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'USED'>('ALL');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [viewingKey, setViewingKey] = useState<DigitalKey | null>(null);

  const fetchKeys = async () => {
    try {
      setIsLoading(true);
      const res = await api.getKeys(statusFilter, search);
      if (res?.keys) {
        setKeys(res.keys);
      }
    } catch (err: any) {
      showToastError('Failed to fetch keys', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [statusFilter, search]);

  const handleCopy = (keyCode: string, id: string) => {
    navigator.clipboard.writeText(keyCode);
    setCopiedKeyId(id);
    showToastSuccess('Key Copied to Clipboard!');
    setTimeout(() => setCopiedKeyId(null), 2500);
  };

  const handleMarkUsed = async (keyId: string) => {
    try {
      await api.markKeyUsed(keyId);
      showToastSuccess('Key Marked as Used');
      fetchKeys();
    } catch (err: any) {
      showToastError('Failed to update key status', err.message);
    }
  };

  const tabs: ('ALL' | 'ACTIVE' | 'EXPIRED' | 'USED')[] = ['ALL', 'ACTIVE', 'EXPIRED', 'USED'];

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-5xl mx-auto">
      {/* Top Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-black text-xl sm:text-2xl text-white uppercase tracking-wider">
            MY PURCHASED KEYS
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage your gaming licenses, check expiration, and copy codes for injection.
          </p>
        </div>

        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search key or product..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-[#0d0d14] border border-white/10 rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {tabs.map(tab => (
          <button
            key={tab}
            onClick={() => setStatusFilter(tab)}
            className={`px-4 py-2 rounded-xl text-xs font-bold font-mono transition-all border ${
              statusFilter === tab
                ? 'bg-rose-500/15 border-rose-500 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                : 'bg-[#0d0d14] border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.04]'
            }`}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Keys List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-5 rounded-2xl bg-[#0d0d14] border border-white/5 animate-pulse h-28" />
          ))}
        </div>
      ) : keys.length === 0 ? (
        <div className="p-12 rounded-3xl bg-[#0d0d14] border border-white/5 text-center space-y-3">
          <div className="w-12 h-12 rounded-2xl bg-white/[0.03] text-slate-500 flex items-center justify-center mx-auto">
            <KeyRound className="w-6 h-6" />
          </div>
          <h4 className="font-display font-bold text-base text-white uppercase tracking-wider">
            NO KEYS FOUND
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You haven't purchased any keys yet or no keys match the selected filter.
          </p>
          <button
            onClick={onNavigateBuy}
            className="mt-2 px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider transition-colors inline-flex items-center gap-2 shadow-lg shadow-rose-950/40"
          >
            <span>Browse Products</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {keys.map(key => {
            const isActive = key.status === 'ACTIVE';
            const isUsed = key.status === 'USED';
            const isExpired = key.status === 'EXPIRED';

            return (
              <div
                key={key.id}
                className="p-4 sm:p-5 rounded-2xl bg-[#0d0d14] border border-white/5 hover:border-white/15 transition-all space-y-3 shadow-lg group"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-3">
                    <div
                      className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                        isActive
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : isUsed
                          ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                          : 'bg-slate-800 text-slate-500 border border-white/5'
                      }`}
                    >
                      <KeyRound className="w-4 h-4" />
                    </div>

                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-display font-bold text-sm text-white">{key.productName}</h4>
                        <span className="text-[10px] px-2 py-0.5 rounded bg-white/[0.04] text-slate-300 font-mono font-semibold border border-white/5">
                          {key.durationLabel}
                        </span>
                      </div>
                      <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                        {key.gameName}
                      </div>
                    </div>
                  </div>

                  {/* Status Pill */}
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold px-2.5 py-1 rounded-lg border uppercase tracking-wider ${
                        isActive
                          ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                          : isUsed
                          ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                          : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                      }`}
                    >
                      {key.status}
                    </span>
                  </div>
                </div>

                {/* Key Code Block */}
                <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between gap-3">
                  <div className="font-mono text-xs font-bold text-slate-200 tracking-wider truncate select-all">
                    {key.keyCode}
                  </div>

                  <div className="flex items-center gap-1.5 shrink-0">
                    <button
                      onClick={() => handleCopy(key.keyCode, key.id)}
                      className="px-3 py-1.5 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-400 text-xs font-semibold flex items-center gap-1.5 transition-colors"
                    >
                      {copiedKeyId === key.id ? (
                        <>
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Copied</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>COPY</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setViewingKey(key)}
                      className="px-3 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-white/5"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>VIEW</span>
                    </button>

                    {isActive && (
                      <button
                        onClick={() => handleMarkUsed(key.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-amber-500/20 text-slate-400 hover:text-amber-300 text-[11px] font-mono transition-colors"
                        title="Mark as loaded in game"
                      >
                        Used?
                      </button>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="flex flex-wrap items-center justify-between text-[11px] text-slate-400 font-mono pt-1">
                  <span>Purchased: {new Date(key.assignedAt || 0).toLocaleString()}</span>
                  {key.expiresAt && (
                    <span className={isActive ? 'text-amber-400' : 'text-slate-400'}>
                      Expires: {new Date(key.expiresAt).toLocaleString()}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Details View Modal */}
      {viewingKey && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setViewingKey(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-sm bg-[#0d0d14] border border-white/10 rounded-2xl p-5 shadow-2xl z-10 space-y-4">
            <h3 className="font-display font-bold text-sm text-white">KEY DETAILS</h3>
            <div className="space-y-2 text-xs">
              <div className="p-3 rounded-xl bg-white/[0.03] space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">Product</span>
                <div className="font-bold text-white">{viewingKey.productName}</div>
                <div className="text-slate-400">{viewingKey.gameName} · {viewingKey.durationLabel}</div>
              </div>

              <div className="p-3 rounded-xl bg-rose-950/20 border border-rose-500/30 space-y-1">
                <span className="text-[10px] text-slate-400 uppercase">Decrypted License Key</span>
                <div className="font-mono font-bold text-rose-300 break-all select-all text-sm">
                  {viewingKey.keyCode}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-white/[0.03] space-y-1">
                <div className="flex justify-between">
                  <span className="text-slate-400">Current Status:</span>
                  <span className="font-mono font-bold text-rose-400">{viewingKey.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Purchased:</span>
                  <span className="font-mono text-slate-200">{new Date(viewingKey.assignedAt || 0).toLocaleString()}</span>
                </div>
                {viewingKey.expiresAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-400">Expiration:</span>
                    <span className="font-mono text-amber-300">{new Date(viewingKey.expiresAt).toLocaleString()}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setViewingKey(null)}
              className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.12] text-white text-xs font-semibold transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
