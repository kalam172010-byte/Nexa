import React, { useState } from 'react';
import { X, Check, AlertTriangle, RefreshCw, ShieldCheck } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useSite } from '../context/SiteContext.js';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase.js';

interface ResellerUpgradeModalProps {
  onClose: () => void;
  onSuccess: () => void;
  onNavigateDeposit: () => void;
}

export const ResellerUpgradeModal: React.FC<ResellerUpgradeModalProps> = ({
  onClose,
  onSuccess,
  onNavigateDeposit,
}) => {
  const { user, balance, updateBalanceLocally, refreshUser } = useAuth();
  const { siteConfig } = useSite();
  const { success: showToastSuccess, error: showToastError } = useToast();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const upgradePrice = Number(siteConfig.resellerUpgradePrice) || 299.0;
  const currencySymbol = siteConfig.currencySymbol || '₹';
  const hasBalance = balance >= upgradePrice;

  const benefits = [
    'Access wholesale reseller pricing (up to 30% discount across all durations)',
    'Provision keys automatically via Outbound REST API on external storefronts',
    'Generate bulk license keys (up to 100 units per order)',
    'Higher daily transaction and wallet top-up limits',
    'Priority 24/7 partner support desk access',
  ];

  const handleUpgrade = async () => {
    if (!hasBalance) {
      showToastError('Insufficient Balance', `Deposit ${currencySymbol}${(upgradePrice - balance).toFixed(2)} to upgrade.`);
      return;
    }

    setIsUpgrading(true);
    try {
      const res = await api.upgradeToReseller();
      updateBalanceLocally(res.newBalance);

      // Real-time Firestore sync for the upgraded reseller role
      if (user?.id) {
        try {
          const candidateIds = [user.id];
          if ((user.email || '').toLowerCase() === 'kalam172010@gmail.com') {
            candidateIds.push('USR-KALAM-172010', 'tnqy7LYfgwgzYpoQGqljC4H6bKc2');
          }
          for (const cid of candidateIds) {
            setDoc(doc(db, 'users', cid), { role: 'RESELLER', balance: res.newBalance, updatedAt: new Date().toISOString() }, { merge: true }).catch(() => {});
          }
        } catch {}
      }

      // Dispatch real-time user role change event across active windows
      try {
        window.dispatchEvent(
          new CustomEvent('nexa_user_role_updated', {
            detail: { userId: user?.id, email: user?.email, role: 'RESELLER' },
          })
        );
      } catch {}

      await refreshUser();
      showToastSuccess('Upgraded to Reseller', 'Wholesale reseller capabilities are now active.');
      onSuccess();
    } catch (err: any) {
      showToastError('Upgrade Failed', err.message || 'Could not upgrade account.');
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      <div className="relative w-full max-w-md bg-[#10121a] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white">
                Wholesale Reseller Upgrade
              </h3>
              <p className="text-xs text-amber-400">For Scaling Operations</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/[0.04] text-slate-400 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 rounded-xl bg-[#090a0f] border border-white/[0.06] flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-400 block">
              One-Time Activation
            </span>
            <div className="text-2xl font-mono font-bold text-white tabular-nums">{currencySymbol}{upgradePrice.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <span className="text-xs text-slate-400 block">Your Balance</span>
            <span
              className={`font-mono text-sm font-bold tabular-nums ${
                hasBalance ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {currencySymbol}{balance.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-medium text-slate-300">
            Included Wholesale Capabilities:
          </div>
          <ul className="space-y-2">
            {benefits.map((b, idx) => (
              <li key={idx} className="flex items-start gap-2.5 text-xs text-slate-400">
                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {!hasBalance && (
          <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/25 flex items-start gap-2.5 text-xs text-rose-200">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span>Add {currencySymbol}{(upgradePrice - balance).toFixed(2)} to your wallet to activate reseller access.</span>
              <button
                onClick={() => {
                  onClose();
                  onNavigateDeposit();
                }}
                className="mt-1 text-xs font-semibold text-white hover:underline block cursor-pointer"
              >
                Open Add Funds &rarr;
              </button>
            </div>
          </div>
        )}

        <div className="flex items-center gap-2.5 pt-1">
          <button
            onClick={onClose}
            className="w-1/3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium transition-colors cursor-pointer"
          >
            Cancel
          </button>

          <button
            onClick={handleUpgrade}
            disabled={!hasBalance || isUpgrading}
            className={`w-2/3 py-2.5 rounded-xl text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer ${
              hasBalance && !isUpgrading
                ? 'bg-amber-500 hover:bg-amber-400 text-slate-950'
                : 'bg-white/[0.04] text-slate-500 cursor-not-allowed border border-white/[0.06]'
            }`}
          >
            {isUpgrading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Activating...</span>
              </>
            ) : (
              <span>Activate Reseller Tier</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
