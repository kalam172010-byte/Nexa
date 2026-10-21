import React, { useState } from 'react';
import { X, ShoppingBag, Wallet, AlertTriangle, CheckCircle, RefreshCw, ArrowRight, Smartphone, Sparkles } from 'lucide-react';
import { Product, ProductVariant } from '../types/index';
import { useAuth } from '../context/AuthContext';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';

interface PurchaseModalProps {
  product: Product;
  variant: ProductVariant;
  onClose: () => void;
  onSuccess: (deliveredKey: any, newBalance: number) => void;
  onNavigateDeposit: () => void;
}

export const PurchaseModal: React.FC<PurchaseModalProps> = ({
  product,
  variant,
  onClose,
  onSuccess,
  onNavigateDeposit,
}) => {
  const { user, balance, role, updateBalanceLocally } = useAuth();
  const { error: showToastError } = useToast();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [androidId, setAndroidId] = useState<string>('0b9b969bc2e7997b');

  const price = role === 'RESELLER' ? variant.resellerPrice : variant.price;
  const hasEnoughBalance = balance >= price;
  const remainingBalance = balance - price;

  const handleRandomizeAndroidId = () => {
    const chars = '0123456789abcdef';
    let res = '';
    for (let i = 0; i < 16; i++) {
      res += chars[Math.floor(Math.random() * chars.length)];
    }
    setAndroidId(res);
  };

  const handleConfirm = async () => {
    if (!user) {
      showToastError('Authentication required', 'Please log in to purchase digital keys.');
      return;
    }

    if (!hasEnoughBalance) {
      showToastError(
        'Insufficient Balance',
        `You need ₹${(price - balance).toFixed(2)} more to purchase this key.`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const res = await api.createOrder(variant.id, androidId.trim() || undefined);
      updateBalanceLocally(res.newBalance);
      onSuccess(res.key, res.newBalance);
    } catch (err: any) {
      showToastError('Order Failed', err.message || 'Could not complete key purchase.');
    } finally {
      setIsSubmitting(false);
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
      <div className="relative w-full max-w-sm bg-gradient-to-b from-[#131628] via-[#0f111e] to-[#090b12] border border-rose-500/30 rounded-3xl p-5 shadow-[0_0_50px_rgba(244,63,94,0.3)] z-10 animate-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500 to-amber-500 text-white flex items-center justify-center shadow-[0_0_12px_rgba(244,63,94,0.4)]">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-black text-sm text-white tracking-wide">CONFIRM ORDER</h3>
              <p className="text-[10px] text-emerald-400 font-mono font-bold">● INSTANT KEY DELIVERY READY</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/[0.06] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product Details Card */}
        <div className="mt-4 p-3.5 rounded-xl bg-white/[0.03] border border-white/5 space-y-2.5">
          <div className="flex justify-between items-start">
            <div>
              <span className="text-[10px] font-mono uppercase text-slate-400">{product.game}</span>
              <h4 className="font-display font-bold text-sm text-white">{product.name}</h4>
            </div>
            <span className="px-2 py-0.5 rounded bg-rose-500/20 border border-rose-500/40 text-rose-400 text-xs font-mono font-bold">
              {variant.durationLabel}
            </span>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-400">Duration ID:</span>
            <span className="font-mono text-slate-300">{variant.id}</span>
          </div>
          {variant.externalPid && (
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400">Upstream Product PID:</span>
              <span className="font-mono text-rose-400 font-bold">{variant.externalPid}</span>
            </div>
          )}
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Stock Availability:</span>
            <span className="text-emerald-400 font-semibold flex items-center gap-1">
              <CheckCircle className="w-3 h-3" /> Ready for Delivery
            </span>
          </div>
        </div>

        {/* Android Device ID Input (Device-bound / V1 support) */}
        <div className="mt-3 p-3 rounded-xl bg-white/[0.02] border border-white/5 space-y-1.5">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
              <Smartphone className="w-3 h-3 text-rose-400" />
              <span>Android Device ID</span>
            </label>
            <button
              type="button"
              onClick={handleRandomizeAndroidId}
              className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-0.5 font-mono"
            >
              <Sparkles className="w-2.5 h-2.5" />
              <span>Randomize</span>
            </button>
          </div>
          <input
            type="text"
            value={androidId}
            onChange={e => setAndroidId(e.target.value)}
            placeholder="0b9b969bc2e7997b"
            className="w-full px-3 py-1.5 bg-black/40 border border-white/10 rounded-lg text-xs font-mono text-slate-200 focus:outline-none focus:border-rose-500"
          />
          <div className="text-[9px] text-slate-400 leading-tight">
            Required ONLY for Device-Bound / V1 panels. Optional for V2 keys.
          </div>
        </div>

        {/* Financial Breakdown */}
        <div className="mt-3 p-3.5 rounded-xl bg-gradient-to-br from-white/[0.02] to-rose-500/[0.03] border border-white/5 space-y-2">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">Current Balance:</span>
            <span className="font-mono font-semibold text-white">₹{balance.toFixed(2)}</span>
          </div>

          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-400">
              Key Price {role === 'RESELLER' && <span className="text-amber-400 font-bold">(VIP)</span>}:
            </span>
            <span className="font-mono font-bold text-rose-400 text-sm">₹{price.toFixed(2)}</span>
          </div>

          <div className="pt-2 border-t border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium">Remaining Balance:</span>
            <span
              className={`font-mono font-bold ${
                hasEnoughBalance ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              ₹{hasEnoughBalance ? remainingBalance.toFixed(2) : '0.00'}
            </span>
          </div>
        </div>

        {/* Insufficient Balance Alert */}
        {!hasEnoughBalance && (
          <div className="mt-3 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 flex items-start gap-2.5 text-xs text-rose-300">
            <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-semibold block">Insufficient Wallet Balance</span>
              <span>Need ₹{(price - balance).toFixed(2)} more to place this order.</span>
              <button
                onClick={() => {
                  onClose();
                  onNavigateDeposit();
                }}
                className="mt-2 flex items-center gap-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-500 px-3 py-1.5 rounded-lg transition-colors"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Deposit Now</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="mt-4 flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            className="w-1/3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold transition-colors"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!hasEnoughBalance || isSubmitting}
            className={`w-2/3 py-2.5 rounded-xl text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg ${
              hasEnoughBalance && !isSubmitting
                ? 'bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 shadow-rose-950/50 active:scale-[0.98]'
                : 'bg-slate-800 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating Key...</span>
              </>
            ) : (
              <span>Confirm Purchase</span>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

