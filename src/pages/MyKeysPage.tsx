import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Copy,
  Check,
  Search,
  CheckCircle2,
  Clock,
  AlertCircle,
  Eye,
  ShoppingBag,
} from 'lucide-react';
import { api } from '../services/api.js';
import { DigitalKey } from '../types/index.js';
import { useToast } from '../context/ToastContext.js';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../context/AuthContext.js';

interface MyKeysPageProps {
  onNavigateBuy: () => void;
}

export const MyKeysPage: React.FC<MyKeysPageProps> = ({ onNavigateBuy }) => {
  const { user } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();
  const [keys, setKeys] = useState<DigitalKey[]>(() => api.getCachedKeysSync());
  const [isLoading, setIsLoading] = useState<boolean>(() => api.getCachedKeysSync().length === 0);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'USED'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'WEB' | 'API'>('ALL');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [viewingKey, setViewingKey] = useState<DigitalKey | null>(null);

  const fetchKeys = async (silent = false) => {
    try {
      const cachedNow = api.getCachedKeysSync();
      if (cachedNow.length > 0) {
        setKeys(prev => {
          const map = new Map<string, DigitalKey>();
          for (const k of cachedNow) map.set(k.id, k);
          for (const k of prev) {
            if (!map.has(k.id)) map.set(k.id, k);
          }
          return Array.from(map.values()).sort((a, b) => {
            const timeA = new Date(a.assignedAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.assignedAt || b.createdAt || 0).getTime();
            return timeB - timeA;
          });
        });
      }
      if (!silent && cachedNow.length === 0 && keys.length === 0) setIsLoading(true);
      const res = await api.getKeys('ALL', '');
      if (res?.keys) {
        setKeys(prev => {
          const map = new Map<string, DigitalKey>();
          for (const k of res.keys) {
            map.set(k.id, k);
          }
          for (const k of prev) {
            if (!map.has(k.id)) {
              map.set(k.id, k);
            }
          }
          return Array.from(map.values()).sort((a, b) => {
            const timeA = new Date(a.assignedAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.assignedAt || b.createdAt || 0).getTime();
            return timeB - timeA;
          });
        });
      }
    } catch (err: any) {
      if (!silent) {
        showToastError('Failed to fetch keys', err.message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys(keys.length > 0);

    const handleKeysUpdated = () => {
      const updated = api.getCachedKeysSync();
      if (updated.length > 0) {
        setKeys(prev => {
          const map = new Map<string, DigitalKey>();
          for (const k of updated) map.set(k.id, k);
          for (const k of prev) {
            if (!map.has(k.id)) map.set(k.id, k);
          }
          return Array.from(map.values()).sort((a, b) => {
            const timeA = new Date(a.assignedAt || a.createdAt || 0).getTime();
            const timeB = new Date(b.assignedAt || b.createdAt || 0).getTime();
            return timeB - timeA;
          });
        });
        setIsLoading(false);
      }
    };

    window.addEventListener('nexa_keys_updated', handleKeysUpdated);
    window.addEventListener('storage', handleKeysUpdated);
    return () => {
      window.removeEventListener('nexa_keys_updated', handleKeysUpdated);
      window.removeEventListener('storage', handleKeysUpdated);
    };
  }, []);

  useEffect(() => {
    if (!user?.id && !user?.email) return;

    const myId = (user?.id || '').trim();
    const myEmail = (user?.email || '').trim().toLowerCase();
    const myApiKey = (
      user?.apiKey ||
      localStorage.getItem(`nexa_user_api_key_${myId}`) ||
      localStorage.getItem('nexa_user_outbound_api_key') ||
      ''
    ).trim();

    let unsubscribe: (() => void) | undefined;
    try {
      const colRef = collection(db, 'digitalKeys');

      unsubscribe = onSnapshot(
        colRef,
        snapshot => {
          const fsKeys: DigitalKey[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data() as any;
            const docUserId = String(data.assignedUserId || '').trim();
            const docEmail = String(data.assignedUserEmail || '').trim().toLowerCase();
            const docApiKey = String(data.assignedApiKey || '').trim();

            const belongsToUser =
              (myId && docUserId === myId) ||
              (myEmail && docEmail && docEmail === myEmail) ||
              (myApiKey && docApiKey && docApiKey === myApiKey) ||
              ((myEmail === 'kalam172010@gmail.com' ||
                user?.role === 'ADMIN' ||
                user?.role === 'SUPER ADMIN') &&
                (docUserId === 'USR-KALAM-172010' ||
                  docUserId === 'tnqy7LYfgwgzYpoQGqljC4H6bKc2'));

            if (!belongsToUser) return;

            const isApi =
              data.purchaseSource === 'API' ||
              String(data.assignedOrderId || '').startsWith('API-ORD-') ||
              String(docSnap.id).includes('EXT') ||
              String(docSnap.id).includes('API');

            fsKeys.push({
              id: docSnap.id,
              keyCode: data.keyCode || '',
              productId: data.productId || '',
              variantId: data.variantId || '',
              productName: data.productName || 'Gaming Panel',
              gameName: data.gameName || 'Free Fire',
              durationLabel: data.durationLabel || '1 Day',
              assignedUserId: data.assignedUserId,
              assignedOrderId: data.assignedOrderId,
              assignedAt: data.assignedAt || data.createdAt,
              expiresAt: data.expiresAt,
              status: data.status || 'ACTIVE',
              isUsed: Boolean(data.isUsed),
              purchaseSource: isApi ? 'API' : 'WEB',
              purchaseSourceLabel: isApi ? 'Buy from API' : 'Buy from Website',
              createdAt: data.createdAt,
            });
          });

          if (fsKeys.length > 0) {
            setKeys(prev => {
              const map = new Map<string, DigitalKey>();
              for (const k of fsKeys) {
                map.set(k.id, k);
              }
              for (const k of prev) {
                if (!map.has(k.id)) {
                  map.set(k.id, k);
                }
              }
              return Array.from(map.values()).sort((a, b) => {
                const timeA = new Date(a.assignedAt || a.createdAt || 0).getTime();
                const timeB = new Date(b.assignedAt || b.createdAt || 0).getTime();
                return timeB - timeA;
              });
            });
          }
        },
        () => {}
      );
    } catch (err) {
      console.warn('[MyKeysPage] Listener attach error:', err);
    }

    const pollTimer = setInterval(() => {
      fetchKeys(true);
    }, 2500);

    return () => {
      if (unsubscribe) unsubscribe();
      clearInterval(pollTimer);
    };
  }, [user?.id, user?.email, user?.apiKey]);

  const handleCopy = (keyCode: string, id: string) => {
    navigator.clipboard.writeText(keyCode);
    setCopiedKeyId(id);
    showToastSuccess('Key copied to clipboard');
    setTimeout(() => setCopiedKeyId(null), 2500);
  };

  const handleMarkUsed = async (keyId: string) => {
    try {
      await api.markKeyUsed(keyId);
      showToastSuccess('Key marked as used');
      fetchKeys();
    } catch (err: any) {
      showToastError('Failed to update key status', err.message);
    }
  };

  const tabs: ('ALL' | 'ACTIVE' | 'EXPIRED' | 'USED')[] = ['ALL', 'ACTIVE', 'EXPIRED', 'USED'];
  const filteredKeys = keys.filter(k => {
    const src = k.purchaseSource === 'API' ? 'API' : 'WEB';
    if (sourceFilter !== 'ALL' && src !== sourceFilter) return false;
    if (statusFilter !== 'ALL' && k.status !== statusFilter) return false;
    if (search.trim()) {
      const q = search.trim().toLowerCase();
      const matchCode = (k.keyCode || '').toLowerCase().includes(q);
      const matchProd = (k.productName || '').toLowerCase().includes(q);
      const matchGame = (k.gameName || '').toLowerCase().includes(q);
      if (!matchCode && !matchProd && !matchGame) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl sm:text-2xl text-white">
            My License Keys
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage delivered software licenses, inspect purchase channel, and copy credentials.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search key code or product..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#0c0e14] border border-white/[0.08] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>
      </div>

      {/* Quick Summary Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-cyan-500/15 via-[#0e111a] to-[#0c0e14] border border-cyan-500/30 space-y-1">
          <div className="text-[11px] font-semibold text-cyan-300">Total Keys</div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-cyan-400 tabular-nums">
            {keys.length}
          </div>
        </div>
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-[#0e111a] to-[#0c0e14] border border-emerald-500/30 space-y-1">
          <div className="text-[11px] font-semibold text-emerald-300">Active Keys</div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-emerald-400 tabular-nums">
            {keys.filter(k => k.status === 'ACTIVE').length}
          </div>
        </div>
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-amber-500/15 via-[#0e111a] to-[#0c0e14] border border-amber-500/30 space-y-1">
          <div className="text-[11px] font-semibold text-amber-300">Used Keys</div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-amber-400 tabular-nums">
            {keys.filter(k => k.status === 'USED').length}
          </div>
        </div>
        <div className="p-3.5 sm:p-4 rounded-2xl bg-gradient-to-br from-rose-500/15 via-[#0e111a] to-[#0c0e14] border border-rose-500/30 space-y-1">
          <div className="text-[11px] font-semibold text-rose-300">Expired Keys</div>
          <div className="text-xl sm:text-2xl font-mono font-bold text-rose-400 tabular-nums">
            {keys.filter(k => k.status === 'EXPIRED').length}
          </div>
        </div>
      </div>

      {/* Segmented Status & Purchase Source Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 p-1 bg-[#0c0e14] border border-white/[0.08] rounded-xl w-fit max-w-full overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === tab
                  ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 text-white font-bold shadow-[0_2px_12px_rgba(244,63,94,0.4)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'ALL' ? 'All Keys' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1 p-1 bg-[#0c0e14] border border-white/[0.08] rounded-xl w-fit">
          {(['ALL', 'WEB', 'API'] as const).map(src => (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer whitespace-nowrap shrink-0 ${
                sourceFilter === src
                  ? 'bg-cyan-500/20 text-cyan-300 font-bold border border-cyan-500/40 shadow-[0_0_10px_rgba(6,182,212,0.2)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {src === 'ALL' ? 'All Sources' : src === 'API' ? '⚡ Buy from API' : '🌐 Buy from Website'}
            </button>
          ))}
        </div>
      </div>

      {/* Keys List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div
              key={i}
              className="p-5 rounded-2xl bg-[#0c0e14] border border-white/[0.08] animate-pulse h-28"
            />
          ))}
        </div>
      ) : filteredKeys.length === 0 ? (
        <div className="p-12 rounded-2xl bg-gradient-to-b from-[#10131d] to-[#0a0c12] border border-rose-500/20 text-center space-y-3 shadow-lg">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-md">
            <KeyRound className="w-6 h-6" />
          </div>
          <h4 className="font-display font-bold text-base text-white">No License Keys Found</h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You have not purchased any licenses yet, or no keys match the active filter.
          </p>
          <button
            onClick={onNavigateBuy}
            className="mt-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer shadow-[0_4px_16px_rgba(244,63,94,0.35)]"
          >
            <ShoppingBag className="w-3.5 h-3.5" />
            <span>Browse License Catalog</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3.5">
          {filteredKeys.map(key => {
            const isActive = key.status === 'ACTIVE';
            const isUsed = key.status === 'USED';
            const isApiPurchase = key.purchaseSource === 'API';
            const sourceLabel =
              key.purchaseSourceLabel || (isApiPurchase ? 'Buy from API' : 'Buy from Website');

            return (
              <div
                key={key.id}
                className={`p-5 rounded-2xl border transition-all space-y-3.5 relative overflow-hidden ${
                  isActive
                    ? 'border-l-4 border-l-emerald-400 bg-gradient-to-r from-emerald-950/20 via-[#0e111a] to-[#0a0c12] border-emerald-500/25 shadow-[0_4px_20px_rgba(16,185,129,0.06)]'
                    : isUsed
                    ? 'border-l-4 border-l-amber-400 bg-gradient-to-r from-amber-950/20 via-[#0e111a] to-[#0a0c12] border-amber-500/25'
                    : 'border-l-4 border-l-rose-500 bg-gradient-to-r from-rose-950/20 via-[#0e111a] to-[#0a0c12] border-rose-500/25'
                }`}
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <h4 className="font-display font-bold text-sm sm:text-base text-white">
                      {key.productName}
                    </h4>
                    {/* Vibrant Metadata tags */}
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-rose-400 font-bold bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
                        {key.gameName}
                      </span>
                      <span className="text-cyan-300 font-medium bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
                        {key.durationLabel}
                      </span>
                      <span
                        className={`font-semibold px-2 py-0.5 rounded-md border ${
                          isApiPurchase
                            ? 'text-cyan-300 bg-cyan-500/15 border-cyan-500/30'
                            : 'text-emerald-300 bg-emerald-500/15 border-emerald-500/30'
                        }`}
                      >
                        {sourceLabel}
                      </span>
                    </div>
                  </div>

                  {/* Semantic Status with Icon + Glowing Label */}
                  <div className="flex items-center gap-1.5 text-xs font-bold">
                    {isActive ? (
                      <span className="text-emerald-400 bg-emerald-500/15 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5 shadow-[0_0_10px_rgba(16,185,129,0.2)]">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active License</span>
                      </span>
                    ) : isUsed ? (
                      <span className="text-amber-400 bg-amber-500/15 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Used</span>
                      </span>
                    ) : (
                      <span className="text-rose-400 bg-rose-500/15 border border-rose-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Expired</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Key Code Block with Glowing Cyber Look */}
                <div className="p-3.5 rounded-xl bg-[#06080d] border border-white/[0.1] flex items-center justify-between gap-3 shadow-inner">
                  <div className="font-mono text-xs sm:text-sm font-bold text-emerald-300 tracking-wider truncate select-all">
                    {key.keyCode}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopy(key.keyCode, key.id)}
                      className="px-3.5 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer shadow-[0_2px_10px_rgba(244,63,94,0.3)]"
                    >
                      {copiedKeyId === key.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3.5 h-3.5" />
                          <span>Copy Key</span>
                        </>
                      )}
                    </button>

                    <button
                      onClick={() => setViewingKey(key)}
                      className="px-3 py-1.5 rounded-lg bg-[#141824] hover:bg-[#1a2030] text-slate-200 text-xs font-medium flex items-center gap-1.5 transition-colors border border-white/[0.1] whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5 text-cyan-400" />
                      <span>Details</span>
                    </button>

                    {isActive && (
                      <button
                        onClick={() => handleMarkUsed(key.id)}
                        className="px-2.5 py-1.5 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white text-xs transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        title="Mark key as used"
                      >
                        Mark Used
                      </button>
                    )}
                  </div>
                </div>

                {/* Timestamps */}
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono tabular-nums pt-1">
                  <span>Delivered: {new Date(key.assignedAt || 0).toLocaleString()}</span>
                  {key.expiresAt && (
                    <span className={isActive ? 'text-emerald-300 font-medium' : 'text-slate-500'}>
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
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-sm bg-[#0c0e14] border border-white/[0.12] rounded-2xl p-6 shadow-2xl z-10 space-y-4">
            <h3 className="font-display font-bold text-base text-white">License Details</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#080a0f] border border-white/[0.08] space-y-1">
                <span className="text-slate-400">Product</span>
                <div className="font-semibold text-white text-sm">{viewingKey.productName}</div>
                <div className="text-slate-300">
                  {viewingKey.gameName} · {viewingKey.durationLabel}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#080a0f] border border-white/[0.08] space-y-1">
                <span className="text-slate-400">License Key Code</span>
                <div className="font-mono font-bold text-emerald-400 break-all select-all text-sm">
                  {viewingKey.keyCode}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#080a0f] border border-white/[0.08] space-y-1.5 font-mono tabular-nums">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Purchase Source</span>
                  <span className="font-sans font-semibold text-white">
                    {viewingKey.purchaseSourceLabel ||
                      (viewingKey.purchaseSource === 'API' ? 'Buy from API' : 'Buy from Website')}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Status</span>
                  <span className="font-bold text-emerald-400">{viewingKey.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400 font-sans">Purchased</span>
                  <span className="text-slate-300">
                    {new Date(viewingKey.assignedAt || 0).toLocaleString()}
                  </span>
                </div>
                {viewingKey.expiresAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Expires</span>
                    <span className="text-amber-300">
                      {new Date(viewingKey.expiresAt).toLocaleString()}
                    </span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => setViewingKey(null)}
              className="w-full py-2.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-semibold transition-colors cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
