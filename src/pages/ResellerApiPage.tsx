import React, { useState, useEffect } from 'react';
import {
  Terminal,
  KeyRound,
  Copy,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
  Code,
  Zap,
  Globe,
  Send,
  Database,
  ArrowRight,
  Eye,
  EyeOff,
  Search,
  Wallet,
  Sparkles,
  ShieldCheck,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { useSite } from '../context/SiteContext.js';

export const ResellerApiPage: React.FC = () => {
  const { user, role, balance, refreshUser, updateBalanceLocally } = useAuth();
  const { siteConfig } = useSite();
  const { success: showToastSuccess, error: showToastError } = useToast();

  const isReseller = role === 'RESELLER' || role === 'ADMIN' || role === 'SUPER ADMIN';
  const [isUpgrading, setIsUpgrading] = useState(false);
  const upgradePrice = siteConfig.resellerUpgradePrice || 299.0;
  const hasBalance = balance >= upgradePrice;

  const [creds, setCreds] = useState<any>(null);
  const [loadingCreds, setLoadingCreds] = useState(false);
  const [showKey, setShowKey] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Test console state
  const [selectedProductId, setSelectedProductId] = useState('');
  const [selectedDuration, setSelectedDuration] = useState('1 Hours');
  const [quantity, setQuantity] = useState(1);
  const [testLoading, setTestLoading] = useState(false);
  const [testResult, setTestResult] = useState<any>(null);

  const fetchCreds = async () => {
    if (!isReseller) return;
    setLoadingCreds(true);
    try {
      const data = await api.getResellerApiCredentials();
      setCreds(data);
      if (data?.productReferenceTable && data.productReferenceTable.length > 0) {
        const firstProd = data.productReferenceTable[0];
        const firstVar = firstProd.variants?.[0];
        if (firstVar) {
          setSelectedProductId(firstProd.externalPid);
          setSelectedDuration(firstVar.durationLabel);
        }
      }
    } catch (err: any) {
      showToastError('Failed to load API credentials', err.message);
    } finally {
      setLoadingCreds(false);
    }
  };

  useEffect(() => {
    if (isReseller) {
      fetchCreds();
    }
  }, [isReseller]);

  const handleRegenerateKey = async () => {
    try {
      const res = await api.regenerateResellerApiKey();
      setCreds((prev: any) => ({ ...prev, apiKey: res.apiKey }));
      showToastSuccess('API Key Regenerated', res.message);
    } catch (err: any) {
      showToastError('Failed to regenerate API key', err.message);
    }
  };

  const handleTestApiCall = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!creds?.apiKey) return;

    setTestLoading(true);
    setTestResult(null);

    try {
      const response = await fetch('/api/v1/reseller/buy', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          api_key: creds.apiKey,
          action: 'buy',
          product_id: selectedProductId,
          duration: selectedDuration,
          quantity: quantity,
        }),
      });

      const data = await response.json();
      setTestResult({
        status: response.status,
        ok: response.ok,
        data,
      });

      if (response.ok) {
        showToastSuccess('Key Generated Successfully!', `Generated ${quantity}x keys`);
        await refreshUser();
      } else {
        showToastError('API Request Failed', data.message || 'Unknown error');
      }
    } catch (err: any) {
      setTestResult({
        status: 500,
        ok: false,
        data: { message: err.message },
      });
      showToastError('Network Error', err.message);
    } finally {
      setTestLoading(false);
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
      showToastSuccess('Upgraded to Reseller!', 'VIP reseller features and API access are now unlocked.');
    } catch (err: any) {
      showToastError('Upgrade Failed', err.message || 'Could not upgrade account.');
    } finally {
      setIsUpgrading(false);
    }
  };

  // IF USER IS A REGULAR USER (NOT UPGRADED TO RESELLER YET)
  if (!isReseller) {
    return (
      <div className="max-w-2xl mx-auto py-8 px-4 space-y-6 animate-in fade-in zoom-in-95 duration-200">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#181308] via-[#100e07] to-[#0a0a0f] border border-amber-500/40 p-6 sm:p-8 shadow-2xl shadow-amber-950/40 space-y-6">
          <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

          {/* Badge & Lock Header */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <KeyRound className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-extrabold uppercase tracking-wider">
                  🔒 RESELLER PRIVILEGES REQUIRED
                </span>
                <span className="text-[10px] text-slate-400 font-mono">STANDARD ACCOUNT</span>
              </div>
              <h2 className="font-display font-black text-xl text-white uppercase tracking-wider mt-1">
                UNLOCK RESELLER API ACCESS
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            The Outbound Reseller API system is exclusively available for upgraded Resellers. Connect your external website or bot to buy keys automatically using your wallet balance at wholesale VIP rates.
          </p>

          {/* Price Box */}
          <div className="p-4 rounded-2xl bg-black/50 border border-amber-500/30 flex items-center justify-between">
            <div>
              <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block">
                One-Time Lifetime Upgrade
              </span>
              <span className="text-2xl font-mono font-black text-white">₹{upgradePrice.toFixed(2)}</span>
            </div>
            <div className="text-right">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Your Balance</span>
              <span className={`text-base font-mono font-bold ${hasBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
                ₹{balance.toFixed(2)}
              </span>
            </div>
          </div>

          {/* Feature Highlights */}
          <div className="space-y-2 pt-1 text-xs">
            <div className="font-mono text-[10px] font-bold uppercase tracking-wider text-slate-400">
              What You Unlock With Reseller Status:
            </div>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Personal API Key &amp; Secure Token</strong> for instant cURL &amp; PHP website integration</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>VIP Wholesale Pricing</strong> on all product durations with automatic wallet deduction</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Bulk Key Generation (1-100 keys)</strong> with live stock mapping and numeric PIDs</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong>Priority Reseller Support Desk</strong> &amp; dedicated admin assistance</span>
              </li>
            </ul>
          </div>

          {/* Upgrade Button */}
          <div className="pt-2">
            {hasBalance ? (
              <button
                type="button"
                disabled={isUpgrading}
                onClick={handleUpgradeAccount}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-xl shadow-amber-950/50 flex items-center justify-center gap-2 cursor-pointer"
              >
                {isUpgrading ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-950" />
                ) : (
                  <>
                    <Zap className="w-4 h-4 text-slate-950" />
                    <span>UPGRADE TO RESELLER NOW (₹{upgradePrice.toFixed(0)})</span>
                  </>
                )}
              </button>
            ) : (
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    window.location.hash = '#deposit';
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                  }}
                  className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Wallet className="w-4 h-4" />
                  <span>DEPOSIT ₹{(upgradePrice - balance).toFixed(0)} TO UPGRADE</span>
                </button>
                <p className="text-[11px] text-center text-slate-400 font-mono">
                  Wallet balance insufficient. Deposit funds to complete lifetime reseller activation.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  // IF USER IS ALREADY AN UPGRADED RESELLER OR ADMIN
  const filteredProducts = (creds?.productReferenceTable || []).filter((p: any) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.game.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(p.externalPid).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-5xl mx-auto">
      {/* 1. RESELLER API AUTHENTICATION CARD */}
      <div className="p-6 sm:p-7 rounded-3xl bg-[#0d0d14] border border-amber-500/30 shadow-2xl relative overflow-hidden space-y-6">
        <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center gap-3 pb-4 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center">
            <KeyRound className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-display font-black text-lg text-white uppercase tracking-wider">
              RESELLER API AUTHENTICATION
            </h2>
            <p className="text-xs text-slate-400">Use your secure token / API key to authenticate external API purchase requests.</p>
          </div>
        </div>

        <div className="space-y-3">
          <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
            ACTIVE API ACCESS TOKEN
          </label>
          <div className="flex items-center gap-2">
            <input
              type={showKey ? 'text' : 'password'}
              readOnly
              value={creds?.apiKey || 'Loading...'}
              className="w-full px-4 py-3 bg-black/70 border border-white/10 rounded-2xl text-amber-300 font-mono text-xs select-all tracking-widest"
            />
            <button
              type="button"
              onClick={() => setShowKey(!showKey)}
              className="px-3.5 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white transition-colors border border-white/10"
              title={showKey ? 'Hide Token' : 'Show Token'}
            >
              {showKey ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(creds?.apiKey || '');
                showToastSuccess('Copied API Token');
              }}
              className="px-4 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 font-mono text-xs font-bold transition-colors border border-white/10 flex items-center gap-1.5"
            >
              <Copy className="w-3.5 h-3.5" />
              <span>Copy</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleRegenerateKey}
            className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-mono font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-amber-950/30"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>RE-GENERATE SECURE TOKEN</span>
          </button>
        </div>

        {/* Quick Integration Guide Box */}
        <div className="p-4 rounded-2xl bg-black/50 border border-white/5 space-y-2 text-xs">
          <div className="font-mono font-bold text-slate-300 uppercase">QUICK INTEGRATION ENDPOINT:</div>
          <div className="flex items-center gap-2">
            <input
              type="text"
              readOnly
              value={creds?.apiUrl || 'https://.../api/v1/reseller/buy'}
              className="w-full px-3 py-2 bg-black/80 border border-white/10 rounded-xl text-emerald-400 font-mono text-xs select-all"
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard.writeText(creds?.apiUrl || '');
                showToastSuccess('Copied Endpoint URL');
              }}
              className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 font-mono text-xs"
            >
              Copy
            </button>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
            Send POST request with: <code className="text-amber-300">api_key</code>, <code className="text-amber-300">action</code> ('buy'), <code className="text-amber-300">product_id</code> (2 or 3-digit numeric PID), <code className="text-amber-300">duration</code> (Duration plan label), <code className="text-amber-300">quantity</code> (1-100). Bulk success response returns <code className="text-emerald-400">keys[]</code>, <code className="text-emerald-400">quantity</code>, and <code className="text-emerald-400">total_price</code>.
          </p>
        </div>
      </div>

      {/* 2. RESELLER API CODE (PHP cURL SNIPPET) */}
      <div className="p-6 rounded-3xl bg-[#0d0d14] border border-white/5 shadow-xl space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <Code className="w-5 h-5 text-sky-400" />
            <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
              RESELLER API CODE (PHP cURL)
            </h3>
          </div>

          <button
            type="button"
            onClick={() => {
              const codeSnippet = `$data = [
    'api_key'    => '${creds?.apiKey || 'YOUR_API_KEY'}',
    'action'     => 'buy',
    'product_id' => '155',
    'duration'   => '1 Hours',
    'quantity'   => 1
];
$ch = curl_init('${creds?.apiUrl || 'https://your-domain.com/api/v1/reseller/buy'}');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$response = curl_exec($ch);
curl_close($ch);
print_r(json_decode($response, true));`;
              navigator.clipboard.writeText(codeSnippet);
              showToastSuccess('Copied PHP Code Snippet');
            }}
            className="px-3.5 py-1.5 rounded-xl bg-sky-500/20 hover:bg-sky-500/30 text-sky-300 border border-sky-500/40 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Code</span>
          </button>
        </div>

        <pre className="p-4 rounded-2xl bg-[#070709] border border-white/10 font-mono text-[11px] text-sky-300 overflow-x-auto select-all leading-relaxed">
{`$data = [
    'api_key'    => '${creds?.apiKey || 'YOUR_API_KEY'}',
    'action'     => 'buy',
    'product_id' => '155',
    'duration'   => '1 Hours',
    'quantity'   => 1
];

$ch = curl_init('${creds?.apiUrl || 'https://your-domain.com/api/v1/reseller/buy'}');
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
curl_setopt($ch, CURLOPT_POST, true);
curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
curl_setopt($ch, CURLOPT_HTTPHEADER, ['Content-Type: application/json']);
$response = curl_exec($ch);
curl_close($ch);
$result = json_decode($response, true);
print_r($result);`}
        </pre>
      </div>

      {/* 3. PRODUCT REFERENCE TABLE (NUMERIC PID & AUTO-MAPPED DURATIONS) */}
      <div className="p-6 rounded-3xl bg-[#0d0d14] border border-white/5 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-base text-white uppercase tracking-wider">
                PRODUCT REFERENCE TABLE (NUMERIC PIDS &amp; DURATIONS)
              </h3>
              <p className="text-xs text-slate-400">
                2 or 3-digit numeric PIDs with auto-mapped plan durations &amp; VIP reseller prices. Click to copy!
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search product name or PID..."
              className="w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0a0a0f]">
          <table className="w-full text-left text-xs">
            <thead className="bg-white/[0.02] border-b border-white/5 text-[10px] font-mono text-slate-400 uppercase">
              <tr>
                <th className="p-3.5">Product Name</th>
                <th className="p-3.5">2-3 Digit Numeric PID</th>
                <th className="p-3.5">Duration Plans, VIP Prices &amp; Live Stock</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/5">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500 font-mono">
                    No products found in the reference catalog.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p: any) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-3.5 font-bold text-white">
                      <div className="truncate max-w-[200px]">{p.name}</div>
                      <span className="text-[10px] text-slate-400 font-mono uppercase">{p.game}</span>
                    </td>
                    <td className="p-3.5 font-mono">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(String(p.externalPid));
                          setSelectedProductId(p.externalPid);
                          showToastSuccess('Copied PID', `Product PID "${p.externalPid}" copied to clipboard!`);
                        }}
                        className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 font-black transition-all inline-flex items-center gap-1.5 shadow-sm text-sm active:scale-95 cursor-pointer group"
                        title="Click to copy Product PID"
                      >
                        <span className="font-mono">{p.externalPid}</span>
                        <Copy className="w-3.5 h-3.5 text-amber-400/80 group-hover:text-amber-300" />
                      </button>
                    </td>
                    <td className="p-3.5">
                      <div className="flex flex-wrap gap-2">
                        {(p.variants || []).map((v: any) => (
                          <div
                            key={v.variantId}
                            onClick={() => {
                              navigator.clipboard.writeText(v.durationLabel);
                              setSelectedProductId(p.externalPid);
                              setSelectedDuration(v.durationLabel);
                              showToastSuccess('Copied Duration', `Duration "${v.durationLabel}" copied to clipboard!`);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-mono font-bold hover:bg-emerald-500/20 hover:border-emerald-400 transition-all cursor-pointer inline-flex items-center gap-2 text-xs group active:scale-95 shadow-sm"
                            title="Click to copy duration label & select in test console"
                          >
                            <span className="text-white group-hover:text-amber-300 transition-colors flex items-center gap-1">
                              <span>{v.durationLabel}</span>
                              <Copy className="w-3 h-3 text-slate-500 group-hover:text-amber-300 transition-colors" />
                            </span>
                            <span className="text-amber-400 font-extrabold">₹{v.resellerPrice}</span>
                            <span className="px-1.5 py-0.5 rounded bg-black/50 text-[10px] text-slate-300">
                              Stock: {v.stockCount}
                            </span>
                          </div>
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

      {/* 4. LIVE TEST CONSOLE */}
      <div className="p-6 rounded-3xl bg-[#0d0d14] border border-white/5 shadow-xl space-y-4">
        <div className="flex items-center gap-3 pb-3 border-b border-white/5">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-display font-black text-base text-white uppercase tracking-wider">
              LIVE API TEST CONSOLE (BULK QUANTITY SUPPORT)
            </h3>
            <p className="text-xs text-slate-400">Test purchasing keys via your API using your wallet balance.</p>
          </div>
        </div>

        <form onSubmit={handleTestApiCall} className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              PRODUCT PID (NUMERIC)
            </label>
            <input
              type="text"
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              placeholder="e.g. 155"
              className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              DURATION PLAN
            </label>
            <input
              type="text"
              value={selectedDuration}
              onChange={e => setSelectedDuration(e.target.value)}
              placeholder="e.g. 1 Hours"
              className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
              required
            />
          </div>

          <div>
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              QUANTITY (1-100)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
              required
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={testLoading}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-emerald-950/40 flex items-center justify-center gap-2"
            >
              {testLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Send Test Request</span>
                </>
              )}
            </button>
          </div>
        </form>

        {testResult && (
          <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className={testResult.ok ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                HTTP {testResult.status} {testResult.ok ? 'SUCCESS' : 'ERROR'}
              </span>
              <span className="text-slate-400">{new Date().toLocaleTimeString()}</span>
            </div>
            <pre className="p-3 rounded-2xl bg-[#070709] font-mono text-[11px] text-emerald-300 overflow-x-auto select-all leading-relaxed">
              {JSON.stringify(testResult.data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};
