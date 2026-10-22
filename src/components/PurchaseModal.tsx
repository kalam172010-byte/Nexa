import React, { useState } from 'react';
import {
  X,
  ShoppingBag,
  Wallet,
  AlertTriangle,
  CheckCircle2,
  RefreshCw,
  ArrowRight,
  Sparkles,
  ShieldCheck,
  Zap,
  KeyRound,
  Layers,
} from 'lucide-react';
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
  const isReseller = role === 'RESELLER';
  const price = isReseller && variant.resellerPrice ? variant.resellerPrice : variant.price;
  const hasEnoughBalance = balance >= price;
  const remainingBalance = balance - price;

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
      const res = await api.createOrder(variant.id);
      updateBalanceLocally(res.newBalance);
      onSuccess(res.key, res.newBalance);
    } catch (err: any) {
      showToastError('Order Failed', err.message || 'Could not complete key purchase.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={!isSubmitting ? onClose : undefined}
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-md bg-gradient-to-b from-[#13172c] via-[#0e1122] to-[#080a14] border border-cyan-500/40 rounded-3xl p-5 sm:p-6 shadow-[0_0_60px_rgba(6,182,212,0.25),0_10px_40px_rgba(0,0,0,0.8)] z-10 animate-in zoom-in-95 duration-200 space-y-4">
        {/* Holographic Header */}
        <div className="flex items-center justify-between pb-3.5 border-b border-white/[0.08]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500 via-rose-500 to-amber-500 text-white flex items-center justify-center shadow-[0_0_16px_rgba(6,182,212,0.4)] border border-white/20">
              <KeyRound className="w-5 h-5 text-white" />
            </div>
            <div>
              <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-cyan-400">
                <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse shadow-[0_0_8px_#22d3ee]" />
                <span>SECURE LICENSE DISPATCH</span>
              </div>
              <h3 className="font-display font-black text-base sm:text-lg text-white tracking-wide">
                Confirm Key Order
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            disabled={isSubmitting}
            className="p-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white transition-colors cursor-pointer border border-white/10"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Product Details HUD Card */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-[#161a32]/80 to-[#0e1224]/80 border border-white/10 space-y-3 shadow-inner">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30 uppercase">
                  {product.game || 'FREE FIRE'}
                </span>
                <span className="text-[10px] font-bold px-2 py-0.5 rounded-md bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 uppercase">
                  {product.deviceType || 'NON-ROOT'}
                </span>
              </div>
              <h4 className="font-display font-black text-base text-white tracking-tight">
                {product.name}
              </h4>
            </div>

            <span className="px-3 py-1 rounded-xl bg-gradient-to-r from-amber-500/20 to-rose-500/20 border border-amber-500/40 text-amber-300 text-xs font-mono font-extrabold shadow-sm shrink-0">
              {variant.durationLabel}
            </span>
          </div>

          <div className="pt-2 border-t border-white/[0.08] grid grid-cols-2 gap-2 text-xs">
            <div className="flex items-center gap-1.5 text-slate-300">
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
              <span className="text-[11px]">100% Anti-Ban Bypass</span>
            </div>
            <div className="flex items-center gap-1.5 text-slate-300">
              <Zap className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
              <span className="text-[11px]">Instant Key Activation</span>
            </div>
          </div>
        </div>

        {/* 3-Tile Financial Breakdown */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-2.5 rounded-xl bg-cyan-950/30 border border-cyan-500/30 text-center space-y-0.5">
            <span className="text-[9px] uppercase font-bold text-cyan-400 tracking-wider">Balance</span>
            <div className="font-mono font-black text-xs sm:text-sm text-white tabular-nums">
              ₹{balance.toFixed(2)}
            </div>
          </div>

          <div className="p-2.5 rounded-xl bg-amber-950/30 border border-amber-500/30 text-center space-y-0.5">
            <span className="text-[9px] uppercase font-bold text-amber-400 tracking-wider">
              Price {isReseller && '(VIP)'}
            </span>
            <div className="font-mono font-black text-xs sm:text-sm text-amber-300 tabular-nums">
              ₹{price.toFixed(2)}
            </div>
          </div>

          <div
            className={`p-2.5 rounded-xl border text-center space-y-0.5 ${
              hasEnoughBalance
                ? 'bg-emerald-950/30 border-emerald-500/30'
                : 'bg-rose-950/30 border-rose-500/30'
            }`}
          >
            <span
              className={`text-[9px] uppercase font-bold tracking-wider ${
                hasEnoughBalance ? 'text-emerald-400' : 'text-rose-400'
              }`}
            >
              After Order
            </span>
            <div
              className={`font-mono font-black text-xs sm:text-sm tabular-nums ${
                hasEnoughBalance ? 'text-emerald-300' : 'text-rose-400'
              }`}
            >
              ₹{hasEnoughBalance ? remainingBalance.toFixed(2) : '0.00'}
            </div>
          </div>
        </div>

        {/* Insufficient Balance Alert */}
        {!hasEnoughBalance && (
          <div className="p-3.5 rounded-2xl bg-gradient-to-r from-rose-950/60 to-red-950/40 border border-rose-500/40 space-y-2">
            <div className="flex items-start gap-2 text-xs text-rose-300">
              <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-bold block text-white">Insufficient Wallet Balance</span>
                <span className="text-[11px] text-rose-200">
                  You need ₹{(price - balance).toFixed(2)} more to place this order.
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                onClose();
                onNavigateDeposit();
              }}
              className="w-full py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-lg shadow-emerald-950/50"
            >
              <Wallet className="w-4 h-4 text-slate-950" />
              <span>+ Top Up Wallet via UPI QR</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Action Buttons */}
        <div className="pt-1 flex items-center gap-3">
          <button
            type="button"
            disabled={isSubmitting}
            onClick={onClose}
            className="w-1/3 py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white text-xs font-bold transition-colors cursor-pointer border border-white/10"
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleConfirm}
            disabled={!hasEnoughBalance || isSubmitting}
            className={`w-2/3 py-3 rounded-xl text-white text-xs sm:text-sm font-black uppercase tracking-wider transition-all flex items-center justify-center gap-2 cursor-pointer shadow-lg ${
              hasEnoughBalance && !isSubmitting
                ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 shadow-[0_0_25px_rgba(244,63,94,0.4)] active:scale-[0.98]'
                : 'bg-slate-800/80 text-slate-500 cursor-not-allowed border border-white/5'
            }`}
          >
            {isSubmitting ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin text-white" />
                <span>Allocating Key...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300 fill-amber-300" />
                <span>CONFIRM & GET KEY</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
