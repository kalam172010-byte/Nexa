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
} from 'lucide-react';
import { api } from '../services/api.js';
import { DigitalKey } from '../types/index.js';
import { useToast } from '../context/ToastContext.js';

import { collection, query, where, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.js';
import { useAuth } from '../context/AuthContext.js';

interface MyKeysPageProps {
  onNavigateBuy: () => void;
}

export const MyKeysPage: React.FC<MyKeysPageProps> = ({ onNavigateBuy }) => {
  const { user } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();
  const [keys, setKeys] = useState<DigitalKey[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'EXPIRED' | 'USED'>('ALL');
  const [sourceFilter, setSourceFilter] = useState<'ALL' | 'WEB' | 'API'>('ALL');
  const [copiedKeyId, setCopiedKeyId] = useState<string | null>(null);
  const [viewingKey, setViewingKey] = useState<DigitalKey | null>(null);

  const fetchKeys = async (silent = false) => {
    try {
      if (!silent) setIsLoading(true);
      const res = await api.getKeys(statusFilter, search);
      if (res?.keys) {
        setKeys(prev => {
          // Merge preserving any live keys from Firestore
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
      if (!silent) setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchKeys();
  }, [statusFilter, search]);

  // Real-time Firestore onSnapshot listener for instant key delivery (matches by ID, Email, or API Key)
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

    try {
      const colRef = collection(db, 'digitalKeys');

      const unsubscribe = onSnapshot(
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
              (myApiKey && docApiKey && docApiKey === myApiKey);

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
        err => {
          console.warn('[MyKeysPage] Firestore keys snapshot notice:', err);
        }
      );

      // Periodic live polling every 2.5s to ensure backend sync
      const pollTimer = setInterval(() => {
        fetchKeys(true);
      }, 2500);

      return () => {
        unsubscribe();
        clearInterval(pollTimer);
      };
    } catch (err) {
      console.warn('[MyKeysPage] Listener attach error:', err);
    }
  }, [user?.id, user?.email, user?.apiKey, statusFilter, search]);

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
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Top Header & Search */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl sm:text-2xl bg-gradient-to-r from-white via-amber-100 to-rose-200 bg-clip-text text-transparent">
            My License Keys
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            View delivered software licenses, check whether each key was Buyed by Web or Buyed by API, and copy keys.
          </p>
        </div>

        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search key or product..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#10121a] border border-white/[0.1] rounded-xl text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
          />
        </div>
      </div>

      {/* Segmented Status & Purchase Source Filters */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1.5 p-1 bg-[#10121a] border border-white/[0.08] rounded-xl w-fit max-w-full overflow-x-auto no-scrollbar">
          {tabs.map(tab => (
            <button
              key={tab}
              onClick={() => setStatusFilter(tab)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                statusFilter === tab
                  ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold shadow-[0_2px_10px_rgba(244,63,94,0.3)]'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {tab === 'ALL' ? 'All Keys' : tab.charAt(0) + tab.slice(1).toLowerCase()}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5 p-1 bg-[#10121a] border border-white/[0.08] rounded-xl w-fit">
          {(['ALL', 'WEB', 'API'] as const).map(src => (
            <button
              key={src}
              onClick={() => setSourceFilter(src)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                sourceFilter === src
                  ? src === 'API'
                    ? 'bg-purple-600 text-white shadow'
                    : src === 'WEB'
                    ? 'bg-emerald-600 text-white shadow'
                    : 'bg-white/10 text-white'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              {src === 'ALL' ? 'All Sources' : src === 'API' ? 'Buy from API' : 'Buy from Website'}
            </button>
          ))}
        </div>
      </div>

      {/* Keys List */}
      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map(i => (
            <div key={i} className="p-5 rounded-2xl bg-[#10121a] border border-white/[0.06] animate-pulse h-28" />
          ))}
        </div>
      ) : filteredKeys.length === 0 ? (
        <div className="p-12 rounded-2xl bg-[#10121a] border border-white/[0.08] text-center space-y-3">
          <div className="w-11 h-11 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center mx-auto">
            <KeyRound className="w-5 h-5" />
          </div>
          <h4 className="font-display font-bold text-base text-white">
            No License Keys Found
          </h4>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            You have not purchased any licenses yet, or no keys match the active filter.
          </p>
          <button
            onClick={onNavigateBuy}
            className="mt-1 px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white text-xs font-bold transition-all inline-flex items-center gap-2 cursor-pointer"
          >
            <span>Buy Key</span>
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredKeys.map(key => {
            const isActive = key.status === 'ACTIVE';
            const isUsed = key.status === 'USED';
            const isApiPurchase = key.purchaseSource === 'API';
            const sourceLabel =
              key.purchaseSourceLabel || (isApiPurchase ? 'Buy from API' : 'Buy from Website');

            return (
              <div
                key={key.id}
                className="p-5 rounded-2xl bg-gradient-to-b from-[#131622] to-[#0f111a] border border-white/[0.08] hover:border-rose-500/30 transition-all space-y-3 shadow-md"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <h4 className="font-display font-bold text-sm text-white">{key.productName}</h4>
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-md text-[11px] font-bold tracking-wide border ${
                          isApiPurchase
                            ? 'bg-purple-500/15 text-purple-300 border-purple-500/35'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/35'
                        }`}
                      >
                        {sourceLabel}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 text-xs">
                      <span className="text-cyan-400 font-semibold">{key.gameName}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-amber-300 font-medium">{key.durationLabel}</span>
                    </div>
                  </div>

                  {/* Semantic Status with Icon + Label */}
                  <div className="flex items-center gap-1.5 text-xs font-semibold">
                    {isActive ? (
                      <span className="text-emerald-400 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Active</span>
                      </span>
                    ) : isUsed ? (
                      <span className="text-amber-400 flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" />
                        <span>Used</span>
                      </span>
                    ) : (
                      <span className="text-rose-400 flex items-center gap-1">
                        <AlertCircle className="w-3.5 h-3.5" />
                        <span>Expired</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Key Code Block */}
                <div className="p-3 rounded-xl bg-[#090a0f] border border-emerald-500/25 flex items-center justify-between gap-3">
                  <div className="font-mono text-xs font-bold text-emerald-300 tracking-wider truncate select-all">
                    {key.keyCode}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => handleCopy(key.keyCode, key.id)}
                      className="px-3 py-1.5 rounded-lg bg-gradient-to-r from-rose-600 to-pink-600 hover:from-rose-500 hover:to-pink-500 text-white text-xs font-bold flex items-center gap-1.5 transition-all whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      {copiedKeyId === key.id ? (
                        <>
                          <Check className="w-3.5 h-3.5" />
                          <span>Copied</span>
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
                      className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 text-cyan-300 text-xs font-semibold flex items-center gap-1.5 transition-colors border border-cyan-500/30 whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Eye className="w-3.5 h-3.5" />
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
                <div className="flex flex-wrap items-center justify-between text-xs text-slate-400 font-mono tabular-nums pt-0.5">
                  <span>Delivered: {new Date(key.assignedAt || 0).toLocaleString()}</span>
                  {key.expiresAt && (
                    <span className={isActive ? 'text-amber-300' : 'text-slate-500'}>
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
          <div className="relative w-full max-w-sm bg-[#10121a] border border-cyan-500/30 rounded-2xl p-6 shadow-2xl z-10 space-y-4">
            <h3 className="font-display font-bold text-base text-white">License Details</h3>
            <div className="space-y-3 text-xs">
              <div className="p-3.5 rounded-xl bg-[#090a0f] border border-white/[0.06] space-y-1">
                <span className="text-slate-400">Product</span>
                <div className="font-semibold text-white text-sm">{viewingKey.productName}</div>
                <div className="text-cyan-400 font-medium">{viewingKey.gameName} · {viewingKey.durationLabel}</div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#090a0f] border border-emerald-500/30 space-y-1">
                <span className="text-slate-400">License Key Code</span>
                <div className="font-mono font-bold text-emerald-400 break-all select-all text-sm">
                  {viewingKey.keyCode}
                </div>
              </div>

              <div className="p-3.5 rounded-xl bg-[#090a0f] border border-white/[0.06] space-y-1.5 font-mono tabular-nums">
                <div className="flex justify-between items-center">
                  <span className="text-slate-400 font-sans">Purchase Source</span>
                  <span
                    className={`font-sans font-bold px-2 py-0.5 rounded text-[11px] ${
                      viewingKey.purchaseSource === 'API'
                        ? 'bg-purple-500/15 text-purple-300 border border-purple-500/30'
                        : 'bg-emerald-500/15 text-emerald-300 border border-emerald-500/30'
                    }`}
                  >
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
                  <span className="text-slate-300">{new Date(viewingKey.assignedAt || 0).toLocaleString()}</span>
                </div>
                {viewingKey.expiresAt && (
                  <div className="flex justify-between">
                    <span className="text-slate-400 font-sans">Expires</span>
                    <span className="text-amber-300">{new Date(viewingKey.expiresAt).toLocaleString()}</span>
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
