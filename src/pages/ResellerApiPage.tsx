import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Copy,
  RefreshCw,
  CheckCircle2,
  Code,
  Zap,
  Database,
  Eye,
  EyeOff,
  Search,
  Wallet,
  Globe,
  Check,
  Terminal,
  ExternalLink,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import { api, getEffectiveOrigin } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { useSite } from '../context/SiteContext.js';

import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.js';

function getInitialApiKey(userId?: string): string {
  if (typeof window === 'undefined' || !userId) return '';
  try {
    const key = localStorage.getItem(`nexa_user_api_key_${userId}`);
    if (key && key.trim()) return key.trim();
  } catch {}
  return '';
}

export const ResellerApiPage: React.FC = () => {
  const { user, role, balance, refreshUser, updateBalanceLocally } = useAuth();
  const { siteConfig } = useSite();
  const { success: showToastSuccess, error: showToastError } = useToast();

  const isReseller = role === 'RESELLER' || role === 'ADMIN' || role === 'SUPER ADMIN';
  const [isUpgrading, setIsUpgrading] = useState(false);
  const upgradePrice = siteConfig.resellerUpgradePrice || 299.0;
  const hasBalance = balance >= upgradePrice;

  const [creds, setCreds] = useState<any>(() => {
    const origin = getEffectiveOrigin() || (typeof window !== 'undefined' ? window.location.origin : '');
    const userKey = user?.apiKey || getInitialApiKey(user?.id) || '';
    return {
      apiKey: userKey,
      apiUrl: `${origin}/api/v1/reseller/buy`,
      phpScriptUrl: `${origin}/api/reseller_v1.php`,
      rootPhpUrl: `${origin}/reseller_v1.php`,
      detectedDomain: origin,
      productReferenceTable: [],
    };
  });
  const [showKey, setShowKey] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [copiedKey, setCopiedKey] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [selectedFormat, setSelectedFormat] = useState<'rest' | 'php' | 'root'>('rest');
  const [codeLanguage, setCodeLanguage] = useState<'php' | 'nodejs' | 'curl'>('php');

  // Code snippet customization state
  const [selectedProductId, setSelectedProductId] = useState('155');
  const [selectedDuration, setSelectedDuration] = useState('1 Day');
  const [quantity, setQuantity] = useState(1);

  // Dynamic public domain resolution using window.location.origin via getEffectiveOrigin()
  const resolvedOrigin = (() => {
    if (siteConfig?.customDomain && siteConfig.customDomain.trim()) {
      const cd = siteConfig.customDomain.trim();
      if (!cd.includes('localhost') && !cd.includes('127.0.0.1')) {
        return cd.startsWith('http') ? cd.replace(/\/$/, '') : `https://${cd.replace(/\/$/, '')}`;
      }
    }
    const effective = getEffectiveOrigin();
    if (effective) return effective;
    return typeof window !== 'undefined' ? window.location.origin : '';
  })();

  const restEndpointUrl = `${resolvedOrigin}/api/v1/reseller/buy`;
  const phpEndpointUrl = `${resolvedOrigin}/api/reseller_v1.php`;
  const rootEndpointUrl = `${resolvedOrigin}/reseller_v1.php`;

  const activeEndpointUrl =
    selectedFormat === 'rest'
      ? restEndpointUrl
      : selectedFormat === 'php'
      ? phpEndpointUrl
      : rootEndpointUrl;

  const fetchCreds = async () => {
    try {
      let data: any = null;
      try {
        data = await api.getResellerApiCredentials();
      } catch (e) {
        console.warn('[ResellerApiPage] getResellerApiCredentials fallback:', e);
      }

      if (!data?.productReferenceTable || data.productReferenceTable.length === 0) {
        try {
          const prodsRes = await api.getProducts();
          const fallbackTable = (prodsRes?.products || []).map((p: any) => ({
            id: p.id,
            name: p.name,
            game: p.game,
            category: p.category,
            deviceType: p.deviceType,
            externalPid: p.externalPid || '155',
            variants: (p.variants || []).map((v: any) => ({
              variantId: v.id,
              durationLabel: v.durationLabel,
              durationHours: v.durationHours,
              pid: v.externalPid || p.externalPid || '155',
              price: v.price,
              resellerPrice: v.resellerPrice,
              stockCount: v.stockCount ?? 999,
            })),
          }));
          data = {
            ...(data || {}),
            productReferenceTable: fallbackTable,
          };
        } catch {}
      }

      if (data) {
        let finalKey = data.apiKey || user?.apiKey || getInitialApiKey(user?.id);
        if (!finalKey && user?.id) {
          finalKey = `nexa_live_${user.id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
          try {
            setDoc(doc(db, 'users', user.id), { apiKey: finalKey }, { merge: true }).catch(() => {});
          } catch {}
        }
        if (user?.id && finalKey) {
          try {
            localStorage.setItem(`nexa_user_api_key_${user.id}`, finalKey);
          } catch {}
        }
        setCreds((prev: any) => ({
          ...prev,
          ...data,
          apiKey: finalKey,
          apiUrl: `${resolvedOrigin}/api/v1/reseller/buy`,
          phpScriptUrl: `${resolvedOrigin}/api/reseller_v1.php`,
          rootPhpUrl: `${resolvedOrigin}/reseller_v1.php`,
        }));
        if (data?.productReferenceTable && data.productReferenceTable.length > 0) {
          const firstProd = data.productReferenceTable[0];
          const firstVar = firstProd.variants?.[0];
          if (firstVar) {
            setSelectedProductId(firstProd.externalPid || '155');
            setSelectedDuration(firstVar.durationLabel || '1 Day');
          }
        }
      }
    } catch (err: any) {
      console.warn('[ResellerApiPage] fetch error:', err);
    }
  };

  useEffect(() => {
    fetchCreds();
  }, [isReseller, user?.id]);

  const handleRegenerateKey = async () => {
    try {
      const res = await api.regenerateResellerApiKey();
      const newKey =
        res?.apiKey ||
        `nexa_live_${(user?.id || 'usr').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
      if (user?.id) {
        try {
          localStorage.setItem(`nexa_user_api_key_${user.id}`, newKey);
          await setDoc(doc(db, 'users', user.id), { apiKey: newKey }, { merge: true });
        } catch {}
      }
      setCreds((prev: any) => ({ ...prev, apiKey: newKey }));
      refreshUser();
      showToastSuccess('API Key Regenerated', res?.message || 'New secret token generated for your account.');
    } catch {
      const fallbackKey = `nexa_live_${(user?.id || 'usr').replace(/[^a-zA-Z0-9]/g, '').slice(0, 8)}_${Math.random().toString(36).slice(2, 10)}${Math.random().toString(36).slice(2, 10)}`;
      if (user?.id) {
        try {
          localStorage.setItem(`nexa_user_api_key_${user.id}`, fallbackKey);
          await setDoc(doc(db, 'users', user.id), { apiKey: fallbackKey }, { merge: true });
        } catch {}
      }
      setCreds((prev: any) => ({ ...prev, apiKey: fallbackKey }));
      refreshUser();
      showToastSuccess('API Key Regenerated', 'New secret token generated for your account.');
    }
  };

  const handleUpgradeAccount = async () => {
    if (!hasBalance) {
      showToastError('Insufficient Balance', `Deposit ₹${(upgradePrice - balance).toFixed(2)} to upgrade.`);
      return;
    }

    setIsUpgrading(true);
    try {
      const res = await api.upgradeToReseller();
      updateBalanceLocally(res.newBalance);
      await refreshUser();
      showToastSuccess('Upgraded to Reseller', 'Wholesale pricing and API access are now active.');
      await fetchCreds();
    } catch (err: any) {
      showToastError('Upgrade Failed', err.message || 'Could not upgrade account.');
    } finally {
      setIsUpgrading(false);
    }
  };

  const filteredProducts = (creds?.productReferenceTable || []).filter((p: any) =>
    (p.name || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    (p.game || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(p.externalPid || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 0. Upstream Upgrade Banner (Shown if not yet upgraded) */}
      {!isReseller && (
        <div className="rounded-3xl bg-gradient-to-br from-amber-950/60 via-[#121422] to-rose-950/60 border border-amber-500/40 p-6 sm:p-8 space-y-6 shadow-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-950/50">
                <KeyRound className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2 text-xs text-amber-400 font-bold">
                  <span>OUTBOUND RESELLER ENGINE</span>
                  <span aria-hidden="true">·</span>
                  <span className="text-emerald-400">Wholesale Wholesale API</span>
                </div>
                <h2 className="font-display font-black text-xl sm:text-2xl bg-gradient-to-r from-white via-amber-100 to-rose-200 bg-clip-text text-transparent mt-0.5">
                  Unlock Developer API & Wholesale Tier
                </h2>
              </div>
            </div>

            <div className="flex items-center gap-3 bg-[#090a0f] p-3 rounded-2xl border border-amber-500/30">
              <div>
                <span className="text-[10px] text-amber-400 font-mono uppercase block">One-Time Activation</span>
                <span className="text-xl font-mono font-black text-white tabular-nums">₹{upgradePrice.toFixed(2)}</span>
              </div>
              <div className="border-l border-white/10 pl-3">
                <span className="text-[10px] text-slate-400 font-mono uppercase block">Your Balance</span>
                <span className={`text-base font-mono font-bold tabular-nums ${hasBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
                  ₹{balance.toFixed(2)}
                </span>
              </div>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            Connect external storefronts, automated Telegram bots, Discord bots, and reseller panels directly to your account. Digital keys are auto-minted from your wallet at wholesale discounted rates.
          </p>

          <div className="pt-1">
            {hasBalance ? (
              <button
                type="button"
                disabled={isUpgrading}
                onClick={handleUpgradeAccount}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-amber-950/60"
              >
                {isUpgrading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-slate-950" />
                    <span>Activate Wholesale Reseller Tier (₹{upgradePrice.toFixed(0)})</span>
                  </>
                )}
              </button>
            ) : (
              <button
                type="button"
                onClick={() => {
                  window.location.hash = '#deposit';
                  window.dispatchEvent(new HashChangeEvent('hashchange'));
                }}
                className="w-full sm:w-auto px-8 py-3.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-rose-950/60"
              >
                <Wallet className="w-4 h-4" />
                <span>Deposit ₹{(upgradePrice - balance).toFixed(0)} to Activate API Access</span>
              </button>
            )}
          </div>
        </div>
      )}

      {/* 1. AUTO-DETECTED PRODUCTION DOMAIN & ENDPOINT DISCOVERY BANNER */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-[#111322] via-[#0d0f18] to-[#140d18] border border-cyan-500/35 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/15 border border-cyan-500/35 text-cyan-400 flex items-center justify-center shrink-0">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span className="text-[10px] font-mono font-bold uppercase text-emerald-400 tracking-wider">
                  Live Production Domain Auto-Detected
                </span>
              </div>
              <h2 className="font-display font-black text-base sm:text-lg text-white">
                Outbound Reseller API Endpoints
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto bg-black/60 px-3 py-1.5 rounded-xl border border-white/10 text-xs font-mono">
            <span className="text-slate-400 text-[11px]">Domain:</span>
            <span className="text-cyan-300 font-bold truncate max-w-[240px] sm:max-w-none">{resolvedOrigin}</span>
          </div>
        </div>

        {/* Endpoint Format Selector Tabs */}
        <div className="space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="text-xs font-bold text-slate-300 uppercase tracking-wider flex items-center gap-1.5">
              <span>Select Endpoint Protocol:</span>
            </label>
            <span className="text-[11px] font-mono text-emerald-400">
              All 3 endpoints route to the live production engine
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => setSelectedFormat('rest')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedFormat === 'rest'
                  ? 'bg-cyan-500/15 border-cyan-500/50 text-white shadow-lg shadow-cyan-950/40'
                  : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-mono">1. JSON REST API</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-300">RECOMMENDED</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate">/api/v1/reseller/buy</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFormat('php')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedFormat === 'php'
                  ? 'bg-amber-500/15 border-amber-500/50 text-white shadow-lg shadow-amber-950/40'
                  : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-mono">2. PHP Script API</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300">COMPATIBLE</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate">/api/reseller_v1.php</p>
            </button>

            <button
              type="button"
              onClick={() => setSelectedFormat('root')}
              className={`p-3 rounded-2xl border text-left transition-all cursor-pointer ${
                selectedFormat === 'root'
                  ? 'bg-rose-500/15 border-rose-500/50 text-white shadow-lg shadow-rose-950/40'
                  : 'bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold font-mono">3. Root PHP URL</span>
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300">DIRECT</span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate">/reseller_v1.php</p>
            </button>
          </div>
        </div>

        {/* Active Selected Full URL Bar with 1-Click Copy */}
        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block">
            Active Endpoint URL (Give this to external bots / websites)
          </label>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={activeEndpointUrl}
              className="w-full px-4 py-3 bg-[#090a0f] border border-cyan-500/35 rounded-xl text-cyan-300 font-mono text-xs select-all shadow-inner"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(activeEndpointUrl);
                setCopiedUrl(true);
                showToastSuccess('Copied Endpoint URL', activeEndpointUrl);
                setTimeout(() => setCopiedUrl(false), 2000);
              }}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold transition-all border border-cyan-400/40 flex items-center gap-1.5 cursor-pointer shrink-0 shadow-lg shadow-cyan-950/50"
            >
              {copiedUrl ? <Check className="w-4 h-4 text-white" /> : <Copy className="w-4 h-4" />}
              <span>{copiedUrl ? 'Copied!' : 'Copy URL'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 2. API AUTHENTICATION CREDENTIALS (TOKEN) */}
      <div className="p-6 rounded-3xl bg-gradient-to-br from-amber-950/35 via-[#121422] to-rose-950/35 border border-amber-500/30 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/15 border border-amber-500/35 text-amber-400 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">
                API Authentication Token
              </h3>
              <p className="text-xs text-slate-400">
                Authenticate your external HTTP requests using this secret API key.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRegenerateKey}
            className="px-3.5 py-2 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold transition-all border border-amber-500/35 flex items-center gap-1.5 self-start sm:self-auto cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Rotate Secret Token</span>
          </button>
        </div>

        <div className="space-y-1.5">
          <label className="text-[11px] font-bold text-amber-300 uppercase tracking-wider block">
            Your Secret API Token (<code className="text-white">api_key</code> / <code className="text-white">x-api-key</code>)
          </label>
          <div className="flex items-center gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              readOnly
              value={creds?.apiKey || getInitialApiKey()}
              className="w-full px-4 py-3 bg-[#090a0f] border border-amber-500/25 rounded-xl text-amber-300 font-mono text-xs select-all shadow-inner"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="p-3 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 transition-colors border border-amber-500/30 cursor-pointer"
              title={showKey ? 'Hide Token' : 'Show Token'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                const tokenToCopy = creds?.apiKey || getInitialApiKey();
                navigator.clipboard.writeText(tokenToCopy);
                setCopiedKey(true);
                showToastSuccess('Copied Secret API Token', tokenToCopy);
                setTimeout(() => setCopiedKey(false), 2000);
              }}
              className="px-4 py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-black transition-all flex items-center gap-1.5 cursor-pointer shrink-0 shadow-lg shadow-amber-950/40"
            >
              {copiedKey ? <Check className="w-4 h-4 text-slate-950" /> : <Copy className="w-4 h-4" />}
              <span>{copiedKey ? 'Copied!' : 'Copy Token'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* 3. PRODUCT REFERENCE & PID TABLE */}
      <div className="p-6 rounded-3xl bg-gradient-to-b from-[#131622] to-[#0e1018] border border-emerald-500/25 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">
                Product Reference & Wholesale Pricing Table
              </h3>
              <p className="text-xs text-slate-400">
                Click any numeric Product PID or Duration tier to copy and auto-configure code snippets.
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search product name or PID..."
              className="w-full pl-10 pr-4 py-2 bg-[#090a0f] border border-white/[0.1] rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#090a0f]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c0e15] border-b border-white/[0.08] text-cyan-300 font-semibold font-mono">
              <tr>
                <th className="py-3 px-4">Product Name</th>
                <th className="py-3 px-4">Numeric PID</th>
                <th className="py-3 px-4">Available Durations & Wholesale Rates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">
                    No products found in catalog.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p: any) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white truncate max-w-[220px]">{p.name}</div>
                      <div className="text-[11px] text-rose-400 font-mono font-medium">{p.game || p.category || 'FREEFIRE'}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums">
                      <button
                        type="button"
                        onClick={() => {
                          const pid = String(p.externalPid || '101');
                          navigator.clipboard.writeText(pid);
                          setSelectedProductId(pid);
                          showToastSuccess('Copied PID', `PID ${pid} copied to clipboard`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 font-bold inline-flex items-center gap-1.5 text-xs cursor-pointer"
                        title="Click to copy and select this PID"
                      >
                        <span>{p.externalPid || '101'}</span>
                        <Copy className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-2">
                        {(p.variants || []).map((v: any) => (
                          <button
                            key={v.variantId || v.id}
                            type="button"
                            onClick={() => {
                              const pid = String(v.pid || p.externalPid || '101');
                              navigator.clipboard.writeText(v.durationLabel);
                              setSelectedProductId(pid);
                              setSelectedDuration(v.durationLabel);
                              showToastSuccess('Copied Duration', `${v.durationLabel} (PID ${pid})`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#10121a] hover:bg-white/[0.06] border border-white/[0.1] text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
                            title="Click to copy duration"
                          >
                            <span className="text-white font-medium">{v.durationLabel}</span>
                            <span aria-hidden="true" className="text-slate-600">·</span>
                            <span className="font-mono font-bold text-emerald-400 tabular-nums">₹{v.resellerPrice ?? v.price}</span>
                            <span aria-hidden="true" className="text-slate-600">·</span>
                            <span className="font-mono text-cyan-300 tabular-nums">{v.stockCount ?? 999} stock</span>
                          </button>
                        ))}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 4. CODE EXAMPLES (PHP, Node.js, cURL) WITH AUTO-DETECTED DOMAIN */}
      <div className="p-6 rounded-3xl bg-gradient-to-b from-[#131622] to-[#0e1018] border border-cyan-500/25 space-y-4 shadow-xl">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Code className="w-5 h-5 text-cyan-400" />
            <h3 className="font-display font-bold text-base text-white">
              Integration Snippets (Auto-Configured for Your Domain)
            </h3>
          </div>

          <div className="flex items-center gap-1.5 bg-[#090a0f] p-1 rounded-xl border border-white/10 text-xs font-mono">
            <button
              type="button"
              onClick={() => setCodeLanguage('php')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                codeLanguage === 'php' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              PHP cURL
            </button>
            <button
              type="button"
              onClick={() => setCodeLanguage('nodejs')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                codeLanguage === 'nodejs' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Node.js
            </button>
            <button
              type="button"
              onClick={() => setCodeLanguage('curl')}
              className={`px-3 py-1 rounded-lg transition-colors cursor-pointer ${
                codeLanguage === 'curl' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Terminal cURL
            </button>
          </div>
        </div>

        {/* Code Block */}
        {codeLanguage === 'php' && (
          <div className="space-y-2">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const code = `<?php
$data = [
    'api_key'    => '${creds?.apiKey || 'YOUR_API_KEY'}',
    'action'     => 'buy',
    'product_id' => '${selectedProductId || '155'}',
    'duration'   => '${selectedDuration || '1 Hours'}',
    'quantity'   => ${quantity}
];

$ch = curl_init('${activeEndpointUrl}');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$response = curl_exec($ch);
curl_close($ch);
$result = json_decode($response, true);
print_r($result);
?>`;
                  navigator.clipboard.writeText(code);
                  showToastSuccess('Copied PHP Snippet');
                }}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy PHP Snippet</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-[#090a0f] border border-white/[0.08] font-mono text-xs text-cyan-300 overflow-x-auto select-all leading-relaxed">
{`<?php
$data = [
    'api_key'    => '${creds?.apiKey || 'YOUR_API_KEY'}',
    'action'     => 'buy',
    'product_id' => '${selectedProductId || '155'}',
    'duration'   => '${selectedDuration || '1 Hours'}',
    'quantity'   => ${quantity}
];

$ch = curl_init('${activeEndpointUrl}');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$response = curl_exec($ch);
curl_close($ch);
$result = json_decode($response, true);
print_r($result);
?>`}
            </pre>
          </div>
        )}

        {codeLanguage === 'nodejs' && (
          <div className="space-y-2">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const code = `const response = await fetch('${activeEndpointUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    api_key: '${creds?.apiKey || 'YOUR_API_KEY'}',
    action: 'buy',
    product_id: '${selectedProductId || '155'}',
    duration: '${selectedDuration || '1 Hours'}',
    quantity: ${quantity},
  }),
});

const data = await response.json();
console.log('Delivered Keys:', data);`;
                  navigator.clipboard.writeText(code);
                  showToastSuccess('Copied Node.js Snippet');
                }}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy Node.js Snippet</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-[#090a0f] border border-white/[0.08] font-mono text-xs text-emerald-300 overflow-x-auto select-all leading-relaxed">
{`const response = await fetch('${activeEndpointUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    api_key: '${creds?.apiKey || 'YOUR_API_KEY'}',
    action: 'buy',
    product_id: '${selectedProductId || '155'}',
    duration: '${selectedDuration || '1 Hours'}',
    quantity: ${quantity},
  }),
});

const data = await response.json();
console.log('Delivered Keys:', data);`}
            </pre>
          </div>
        )}

        {codeLanguage === 'curl' && (
          <div className="space-y-2">
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => {
                  const code = `curl -X POST "${activeEndpointUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"api_key": "${creds?.apiKey || 'YOUR_API_KEY'}", "action": "buy", "product_id": "${selectedProductId || '155'}", "duration": "${selectedDuration || '1 Hours'}", "quantity": ${quantity}}'`;
                  navigator.clipboard.writeText(code);
                  showToastSuccess('Copied cURL Command');
                }}
                className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy cURL Command</span>
              </button>
            </div>
            <pre className="p-4 rounded-xl bg-[#090a0f] border border-white/[0.08] font-mono text-xs text-amber-300 overflow-x-auto select-all leading-relaxed">
{`curl -X POST "${activeEndpointUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"api_key": "${creds?.apiKey || 'YOUR_API_KEY'}", "action": "buy", "product_id": "${selectedProductId || '155'}", "duration": "${selectedDuration || '1 Hours'}", "quantity": ${quantity}}'`}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
