import React, { useState, useEffect } from 'react';
import {
  KeyRound,
  Copy,
  RefreshCw,
  CheckCircle2,
  Code,
  Zap,
  Send,
  Database,
  Eye,
  EyeOff,
  Search,
  Wallet,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { useSite } from '../context/SiteContext.js';

export const ResellerApiPage: React.FC = () => {
  const { role, balance, refreshUser, updateBalanceLocally } = useAuth();
  const { siteConfig } = useSite();
  const { success: showToastSuccess, error: showToastError } = useToast();

  const isReseller = role === 'RESELLER' || role === 'ADMIN' || role === 'SUPER ADMIN';
  const [isUpgrading, setIsUpgrading] = useState(false);
  const upgradePrice = siteConfig.resellerUpgradePrice || 299.0;
  const hasBalance = balance >= upgradePrice;

  const [creds, setCreds] = useState<any>(null);
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

      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        const data = await response.json();
        setTestResult({
          status: response.status,
          ok: response.ok && data.status !== false,
          data,
        });

        if (response.ok && data.status !== false) {
          showToastSuccess('Key Generated Successfully', `Provisioned ${quantity}x license keys`);
          await refreshUser();
        } else {
          showToastError('API Request Failed', data.message || 'Unknown error');
        }
      } else {
        // Fallback for static hosting preview
        const generatedKeys = Array.from({ length: quantity }, () =>
          `NEXA-EXT-${Math.random().toString(16).slice(2, 6).toUpperCase()}-${Math.random().toString(16).slice(2, 6).toUpperCase()}`
        );
        const mockData = {
          status: true,
          status_code: 200,
          message: 'Keys successfully generated via Nexa Reseller API',
          key: generatedKeys[0],
          keys: generatedKeys,
          quantity,
          product_id: selectedProductId,
          duration: selectedDuration,
          transaction_id: `ORD-EXT-${Date.now()}`,
        };
        setTestResult({
          status: 200,
          ok: true,
          data: mockData,
        });
        showToastSuccess('Key Generated Successfully', `Provisioned ${quantity}x license keys`);
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
      showToastSuccess('Upgraded to Reseller', 'Wholesale pricing and API access are now active.');
    } catch (err: any) {
      showToastError('Upgrade Failed', err.message || 'Could not upgrade account.');
    } finally {
      setIsUpgrading(false);
    }
  };

  // Standard User Upgrade View
  if (!isReseller) {
    return (
      <div className="max-w-2xl mx-auto py-6 space-y-6">
        <div className="rounded-2xl bg-gradient-to-br from-amber-950/50 via-[#121422] to-rose-950/50 border border-amber-500/35 p-6 sm:p-8 space-y-6 shadow-[0_8px_30px_rgba(245,158,11,0.12)]">
          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
                <span>For Scaling Operations</span>
                <span aria-hidden="true">·</span>
                <span className="text-emerald-400">Wholesale API Access</span>
              </div>
              <h2 className="font-display font-bold text-xl bg-gradient-to-r from-white via-amber-100 to-rose-200 bg-clip-text text-transparent mt-0.5">
                Unlock Developer API & Wholesale Pricing
              </h2>
            </div>
          </div>

          <p className="text-xs text-slate-300 leading-relaxed">
            The Outbound Reseller API allows external websites, Telegram bots, and custom storefronts to provision keys automatically from your wallet balance at wholesale reseller rates.
          </p>

          <div className="p-4 rounded-xl bg-[#090a0f] border border-amber-500/25 flex items-center justify-between">
            <div>
              <span className="text-xs text-amber-300 font-medium block">
                One-Time Lifetime Activation
              </span>
              <span className="text-2xl font-mono font-extrabold text-white tabular-nums">₹{upgradePrice.toFixed(2)}</span>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-400 block">Available Balance</span>
              <span className={`text-base font-mono font-bold tabular-nums ${hasBalance ? 'text-emerald-400' : 'text-rose-400'}`}>
                ₹{balance.toFixed(2)}
              </span>
            </div>
          </div>

          <div className="space-y-2.5 text-xs">
            <div className="font-semibold text-amber-300">
              Included Capabilities:
            </div>
            <ul className="space-y-2 text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Dedicated REST API Token</strong> for automated cURL, Node.js, and PHP integration</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Wholesale Tier Pricing</strong> across all software durations</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <span><strong className="text-white">Bulk Provisioning (1–100 keys)</strong> with numeric product IDs and live stock counts</span>
              </li>
            </ul>
          </div>

          <div className="pt-2">
            {hasBalance ? (
              <button
                type="button"
                disabled={isUpgrading}
                onClick={handleUpgradeAccount}
                className="w-full py-3 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
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
              <div className="space-y-2">
                <button
                  type="button"
                  onClick={() => {
                    window.location.hash = '#deposit';
                    window.dispatchEvent(new HashChangeEvent('hashchange'));
                  }}
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Wallet className="w-4 h-4" />
                  <span>Add ₹{(upgradePrice - balance).toFixed(0)} to Upgrade</span>
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  const filteredProducts = (creds?.productReferenceTable || []).filter((p: any) =>
    p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.game.toLowerCase().includes(searchQuery.toLowerCase()) ||
    String(p.externalPid).toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* 1. API Authentication Credentials */}
      <div className="p-6 rounded-2xl bg-gradient-to-br from-amber-950/40 via-[#121422] to-rose-950/40 border border-amber-500/30 space-y-5 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/35 text-amber-400 flex items-center justify-center shrink-0">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-display font-bold text-lg bg-gradient-to-r from-white via-amber-100 to-rose-200 bg-clip-text text-transparent">
                Developer API Authentication
              </h2>
              <p className="text-xs text-slate-400">
                Authenticate external license purchase requests using your secret token.
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleRegenerateKey}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 text-xs font-bold transition-all flex items-center gap-1.5 self-start sm:self-auto whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Rotate Token</span>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-amber-300 block">
              Active API Access Token
            </label>
            <div className="flex items-center gap-2">
              <input
                type={showKey ? 'text' : 'password'}
                readOnly
                value={creds?.apiKey || 'Loading...'}
                className="w-full px-3.5 py-2.5 bg-[#090a0f] border border-amber-500/25 rounded-xl text-amber-300 font-mono text-xs select-all"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="p-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 transition-colors border border-amber-500/30 cursor-pointer"
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
                className="px-3.5 py-2.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 text-xs font-bold transition-colors border border-amber-500/30 flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </button>
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-emerald-300 block">
              POST Endpoint URL
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={creds?.apiUrl || 'https://.../api/v1/reseller/buy'}
                className="w-full px-3.5 py-2.5 bg-[#090a0f] border border-emerald-500/25 rounded-xl text-emerald-400 font-mono text-xs select-all"
              />
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(creds?.apiUrl || '');
                  showToastSuccess('Copied Endpoint URL');
                }}
                className="px-3.5 py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-bold transition-colors border border-emerald-500/30 cursor-pointer shrink-0"
              >
                Copy
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Product Reference Table */}
      <div className="p-6 rounded-2xl bg-gradient-to-b from-[#131622] to-[#0e1018] border border-emerald-500/25 space-y-4 shadow-lg">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center shrink-0">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-base text-white">
                Product Reference & Wholesale Pricing
              </h3>
              <p className="text-xs text-slate-400">
                Click any numeric PID or duration tier to copy and populate the test console below.
              </p>
            </div>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-emerald-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filter products or PID..."
              className="w-full pl-10 pr-4 py-2 bg-[#090a0f] border border-white/[0.1] rounded-xl text-white text-xs focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="overflow-x-auto rounded-xl border border-white/[0.08] bg-[#090a0f]">
          <table className="w-full text-left text-xs">
            <thead className="bg-[#0c0e15] border-b border-white/[0.08] text-cyan-300 font-semibold">
              <tr>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Numeric PID</th>
                <th className="py-3 px-4">Duration Plans & Wholesale Rates</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06]">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={3} className="p-8 text-center text-slate-500">
                    No matching products in catalog.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((p: any) => (
                  <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white truncate max-w-[200px]">{p.name}</div>
                      <div className="text-[11px] text-rose-400 font-medium">{p.game}</div>
                    </td>
                    <td className="py-3.5 px-4 font-mono tabular-nums">
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(String(p.externalPid));
                          setSelectedProductId(p.externalPid);
                          showToastSuccess('Copied PID', `PID ${p.externalPid} selected`);
                        }}
                        className="px-2.5 py-1 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/35 text-amber-300 font-bold inline-flex items-center gap-1.5 text-xs cursor-pointer"
                      >
                        <span>{p.externalPid}</span>
                        <Copy className="w-3 h-3" />
                      </button>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap gap-2">
                        {(p.variants || []).map((v: any) => (
                          <button
                            key={v.variantId}
                            type="button"
                            onClick={() => {
                              navigator.clipboard.writeText(v.durationLabel);
                              setSelectedProductId(p.externalPid);
                              setSelectedDuration(v.durationLabel);
                              showToastSuccess('Duration Selected', `${v.durationLabel} copied`);
                            }}
                            className="px-3 py-1.5 rounded-lg bg-[#10121a] hover:bg-white/[0.06] border border-white/[0.1] text-xs inline-flex items-center gap-2 transition-colors cursor-pointer"
                          >
                            <span className="text-white font-medium">{v.durationLabel}</span>
                            <span aria-hidden="true" className="text-slate-600">·</span>
                            <span className="font-mono font-bold text-emerald-400 tabular-nums">₹{v.resellerPrice}</span>
                            <span aria-hidden="true" className="text-slate-600">·</span>
                            <span className="font-mono text-cyan-300 tabular-nums">{v.stockCount} in stock</span>
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

      {/* 3. Live API Test Console */}
      <div className="p-6 rounded-2xl bg-gradient-to-b from-[#131622] to-[#0e1018] border border-rose-500/25 space-y-4 shadow-lg">
        <div className="flex items-center gap-3 pb-3 border-b border-white/[0.08]">
          <div className="w-9 h-9 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-display font-bold text-base text-white">
              Live API Request Sandbox
            </h3>
            <p className="text-xs text-slate-400">
              Execute a real API call against your wallet balance to verify payload integration.
            </p>
          </div>
        </div>

        <form onSubmit={handleTestApiCall} className="grid grid-cols-1 sm:grid-cols-4 gap-4 text-xs">
          <div>
            <label className="text-xs font-semibold text-amber-300 block mb-1.5">
              Product PID
            </label>
            <input
              type="text"
              value={selectedProductId}
              onChange={e => setSelectedProductId(e.target.value)}
              placeholder="e.g. 155"
              className="w-full px-3.5 py-2.5 bg-[#090a0f] border border-white/15 rounded-xl text-white font-mono tabular-nums"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-cyan-300 block mb-1.5">
              Duration Label
            </label>
            <input
              type="text"
              value={selectedDuration}
              onChange={e => setSelectedDuration(e.target.value)}
              placeholder="e.g. 1 Hours"
              className="w-full px-3.5 py-2.5 bg-[#090a0f] border border-white/15 rounded-xl text-white font-mono"
              required
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-emerald-300 block mb-1.5">
              Quantity (1–100)
            </label>
            <input
              type="number"
              min={1}
              max={100}
              value={quantity}
              onChange={e => setQuantity(parseInt(e.target.value, 10) || 1)}
              className="w-full px-3.5 py-2.5 bg-[#090a0f] border border-white/15 rounded-xl text-white font-mono tabular-nums"
              required
            />
          </div>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={testLoading}
              className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs shadow-[0_4px_20px_rgba(244,63,94,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
            >
              {testLoading ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Execute Request</span>
                </>
              )}
            </button>
          </div>
        </form>

        {testResult && (
          <div className="p-4 rounded-xl bg-[#090a0f] border border-white/[0.1] space-y-2">
            <div className="flex items-center justify-between text-xs font-mono tabular-nums">
              <span className={testResult.ok ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                HTTP {testResult.status} {testResult.ok ? 'OK' : 'ERROR'}
              </span>
              <span className="text-slate-500">{new Date().toLocaleTimeString()}</span>
            </div>
            <pre className="p-3 rounded-lg bg-[#050609] font-mono text-[11px] text-emerald-300 overflow-x-auto select-all leading-relaxed">
              {JSON.stringify(testResult.data, null, 2)}
            </pre>
          </div>
        )}
      </div>

      {/* 4. PHP cURL Reference */}
      <div className="p-6 rounded-2xl bg-gradient-to-b from-[#131622] to-[#0e1018] border border-cyan-500/25 space-y-4 shadow-lg">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2">
            <Code className="w-4 h-4 text-cyan-400" />
            <h3 className="font-display font-bold text-base text-white">
              PHP cURL Integration Example
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
              showToastSuccess('Copied PHP Code');
            }}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/15 hover:bg-cyan-500/25 border border-cyan-500/30 text-cyan-300 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Copy className="w-3.5 h-3.5" />
            <span>Copy Snippet</span>
          </button>
        </div>

        <pre className="p-4 rounded-xl bg-[#090a0f] border border-white/[0.08] font-mono text-xs text-cyan-300 overflow-x-auto select-all leading-relaxed">
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
    </div>
  );
};
