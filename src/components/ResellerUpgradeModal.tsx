import React, { useState } from 'react';
import { X, ShieldCheck, Check, Sparkles, AlertTriangle, ArrowRight, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useSite } from '../context/SiteContext.js';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';

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
  const { balance, updateBalanceLocally, refreshUser } = useAuth();
  const { siteConfig } = useSite();
  const { success: showToastSuccess, error: showToastError } = useToast();
  const [isUpgrading, setIsUpgrading] = useState(false);

  const upgradePrice = Number(siteConfig.resellerUpgradePrice) || 299.0;
  const currencySymbol = siteConfig.currencySymbol || '₹';
  const hasBalance = balance >= upgradePrice;

  const benefits = [
    'Access exclusive VIP reseller discounted prices (up to 30% off)',
    'Sell products to your own customers at custom markup rates',
    'Manage your customer orders with automatic instant key delivery',
    'Higher daily transaction and deposit limits',
    'Advanced real-time sales & referral statistics',
    'Priority 24/7 dedicated admin desk support',
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
      await refreshUser();
      showToastSuccess('Upgraded to Reseller!', 'VIP reseller features are now unlocked on your account.');
      onSuccess();
    } catch (err: any) {
      showToastError('Upgrade Failed', err.message || 'Could not upgrade account.');
    } finally {
      setIsUpgrading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-[#0d0d14] border border-amber-500/40 rounded-2xl p-5 sm:p-6 shadow-2xl shadow-amber-950/40 z-10 animate-in zoom-in-95 duration-200">
        {/* Glow */}
        <div className="absolute top-0 right-0 w-36 h-36 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-500/30 border border-amber-500/40 text-amber-400 flex items-center justify-center">
              <Sparkles className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                UPGRADE TO RESELLER
              </h3>
              <p className="text-[10px] text-amber-400 font-mono">UNLOCK VIP RESELLER PRIVILEGES</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-white/[0.04] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Price Card */}
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-amber-500/10 via-orange-500/5 to-transparent border border-amber-500/30 flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider">
              One-Time Lifetime License
            </span>
            <div className="text-2xl font-mono font-black text-white">{currencySymbol}{upgradePrice.toFixed(2)}</div>
          </div>
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block">Your Wallet</span>
            <span
              className={`font-mono text-sm font-bold ${
                hasBalance ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              {currencySymbol}{balance.toFixed(2)}
            </span>
          </div>
        </div>

        {/* Benefits list */}
        <div className="mt-4 space-y-2">
          <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
            Reseller Tier Benefits:
          </div>
          <ul className="space-y-2">
            {benefits.map((b, idx) => (
              <li key={idx} className="flex items-start gap-2 text-xs text-slate-300">
                <Check className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <span>{b}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Insufficient balance message */}
        {!hasBalance && (
          <div className="mt-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div>
              <span>Insufficient balance. Deposit ₹{(upgradePrice - balance).toFixed(2)} more.</span>
              <button
                onClick={() => {
                  onClose();
                  onNavigateDeposit();
                }}
                className="mt-1 text-xs font-bold text-rose-300 hover:text-white underline block"
              >
                Go to Deposit Page &rarr;
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-5 flex items-center gap-2">
          <button
            onClick={onClose}
            className="w-1/3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            onClick={handleUpgrade}
            disabled={!hasBalance || isUpgrading}
            className={`w-2/3 py-2.5 rounded-xl text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
              hasBalance && !isUpgrading
                ? 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 shadow-amber-950/40 active:scale-[0.98]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
          >
            {isUpgrading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Activating Reseller...</span>
              </>
            ) : (
              <span>Upgrade Now</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
