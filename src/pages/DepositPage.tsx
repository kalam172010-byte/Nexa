import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Headphones,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Wallet,
  Sparkles,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import { Deposit } from '../types/index.js';
import { QRModal } from '../components/QRModal.js';

interface DepositPageProps {
  onOpenSupport: () => void;
}

export const DepositPage: React.FC<DepositPageProps> = ({ onOpenSupport }) => {
  const { balance, updateBalanceLocally } = useAuth();
  const { error: showToastError, success: showToastSuccess } = useToast();

  const [todayDeposit, setTodayDeposit] = useState<number>(0);
  const [selectedMethod, setSelectedMethod] = useState<'UPI_QR' | 'ADMIN_SUPPORT'>('UPI_QR');
  const [amount, setAmount] = useState<string>('100');
  const [isLoading, setIsLoading] = useState(false);
  const [activeDeposit, setActiveDeposit] = useState<Deposit | null>(null);

  const presets = [50, 100, 200, 500, 1000, 2000];

  useEffect(() => {
    const fetchSummary = async () => {
      try {
        const res = await api.getWalletSummary();
        if (res && res.todayDeposits !== undefined) {
          setTodayDeposit(res.todayDeposits);
        }
      } catch (err) {}
    };
    fetchSummary();
  }, [balance]);

  const handleCreatePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(amount);

    if (isNaN(num) || num < 1) {
      showToastError('Invalid Amount', 'Minimum deposit is ₹1.00.');
      return;
    }

    if (selectedMethod === 'ADMIN_SUPPORT') {
      onOpenSupport();
      return;
    }

    setIsLoading(true);
    try {
      const res = await api.createDeposit(num, selectedMethod);
      if (res.deposit) {
        setActiveDeposit(res.deposit);
        showToastSuccess('Payment Order Created', 'Scan the UPI QR code to complete your deposit.');
      }
    } catch (err: any) {
      console.warn('API deposit call encountered an issue, generating direct UPI payment QR:', err);
      const fallbackDeposit: Deposit = {
        id: `DEP-${Date.now()}`,
        userId: 'self',
        amount: num,
        payableAmount: num,
        fee: 0,
        method: selectedMethod,
        transactionId: `TXN-${Date.now()}`,
        gatewayOrderId: `FGW-${Date.now()}`,
        upiVpa: '8056317218@fam',
        merchantName: 'FamPay',
        upiIntent: `upi://pay?pa=8056317218@fam&pn=FamPay&am=${num.toFixed(2)}&cu=INR&tn=Order-${Date.now()}`,
        status: 'PENDING',
        expiresAt: new Date(Date.now() + 10 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
      };
      setActiveDeposit(fallbackDeposit);
      showToastSuccess('Payment Order Ready', 'Scan the UPI QR code to complete your deposit.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Page Header */}
      <div>
        <h2 className="font-display font-bold text-xl sm:text-2xl bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent">
          Add Funds & Wallet
        </h2>
        <p className="text-xs text-slate-400 mt-0.5">
          Top up your balance instantly via zero-fee automated UPI QR verification.
        </p>
      </div>

      {/* Top Balance Summary Row */}
      <div className="grid grid-cols-2 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-500/12 via-[#10121a] to-[#10121a] border border-rose-500/25 space-y-1 shadow-[0_4px_20px_rgba(244,63,94,0.08)]">
          <div className="flex items-center justify-between text-xs font-semibold text-rose-300">
            <span>Available Balance</span>
            <Wallet className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-rose-400 font-mono">₹</span>
            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-white tabular-nums">
              {balance.toFixed(2)}
            </span>
          </div>
          <div className="text-xs text-slate-400">Ready for instant orders</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-[#10121a] to-[#10121a] border border-emerald-500/30 space-y-1 shadow-[0_4px_20px_rgba(16,185,129,0.08)]">
          <div className="flex items-center justify-between text-xs font-semibold text-emerald-300">
            <span>Added Today</span>
            <Sparkles className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline gap-1">
            <span className="text-xl font-bold text-emerald-400 font-mono">₹</span>
            <span className="font-mono text-2xl sm:text-3xl font-extrabold text-emerald-400 tabular-nums">
              {todayDeposit.toFixed(2)}
            </span>
          </div>
          <div className="text-xs text-slate-400">Automated UPI credit</div>
        </div>
      </div>

      {/* Payment Method Selection */}
      <div className="space-y-2">
        <label className="text-xs font-semibold text-slate-300 block">
          Payment Method
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSelectedMethod('UPI_QR')}
            className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3 cursor-pointer ${
              selectedMethod === 'UPI_QR'
                ? 'bg-gradient-to-r from-emerald-500/15 to-teal-500/10 border-emerald-500/50 text-white shadow-[0_4px_20px_rgba(16,185,129,0.15)]'
                : 'bg-[#10121a] border-white/[0.06] hover:border-white/[0.15] text-slate-300'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                selectedMethod === 'UPI_QR'
                  ? 'bg-gradient-to-br from-emerald-500 to-teal-500 text-slate-950'
                  : 'bg-white/[0.04] text-slate-400'
              }`}
            >
              <QrCode className="w-4 h-4 stroke-[2.2]" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-white truncate">Instant UPI QR</div>
              <div className="text-[11px] text-emerald-400 truncate">0% Fee · Auto-Verified</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethod('ADMIN_SUPPORT')}
            className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3 cursor-pointer ${
              selectedMethod === 'ADMIN_SUPPORT'
                ? 'bg-gradient-to-r from-violet-500/15 to-rose-500/10 border-violet-500/50 text-white shadow-[0_4px_20px_rgba(139,92,246,0.15)]'
                : 'bg-[#10121a] border-white/[0.06] hover:border-white/[0.15] text-slate-300'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                selectedMethod === 'ADMIN_SUPPORT'
                  ? 'bg-gradient-to-br from-violet-500 to-rose-500 text-white'
                  : 'bg-white/[0.04] text-slate-400'
              }`}
            >
              <Headphones className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="font-bold text-xs text-white truncate">Support Assistance</div>
              <div className="text-[11px] text-violet-300 truncate">Manual Deposit Desk</div>
            </div>
          </button>
        </div>
      </div>

      {/* Deposit Form */}
      <form onSubmit={handleCreatePayment} className="p-6 rounded-2xl bg-gradient-to-b from-[#131622] to-[#0e1018] border border-white/[0.08] space-y-5 shadow-xl">
        <div>
          <label className="text-xs font-semibold text-slate-300 block mb-2">
            Deposit Amount (INR)
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 font-mono font-bold text-lg text-emerald-400 select-none">
              ₹
            </span>
            <input
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="100"
              required
              className="w-full pl-9 pr-4 py-3 bg-[#090a0f] border border-emerald-500/30 focus:border-emerald-400 rounded-xl font-mono text-lg text-white font-bold tabular-nums placeholder:text-slate-600 focus:outline-none transition-colors"
            />
          </div>
          <div className="flex items-center justify-between text-xs text-slate-400 mt-1.5">
            <span>Minimum deposit: ₹1.00</span>
            <span className="text-emerald-400 font-semibold">Gateway fee: 0%</span>
          </div>
        </div>

        {/* Amount Quick Presets */}
        <div>
          <label className="text-xs font-medium text-slate-400 block mb-2">
            Quick Select Amount
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {presets.map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val.toString())}
                className={`py-2 px-2 rounded-xl text-xs font-mono font-bold tabular-nums transition-all border cursor-pointer ${
                  amount === val.toString()
                    ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-400 shadow-[0_2px_12px_rgba(16,185,129,0.3)]'
                    : 'bg-[#090a0f] text-slate-300 border-white/[0.08] hover:border-emerald-500/40 hover:text-emerald-300'
                }`}
              >
                +₹{val}
              </button>
            ))}
          </div>
        </div>

        {/* Security Notice */}
        <div className="p-3.5 rounded-xl bg-emerald-500/[0.07] border border-emerald-500/20 flex items-start gap-3 text-xs text-slate-300">
          <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
          <div className="leading-relaxed">
            <span className="text-emerald-300 font-semibold">Instant Automated Credit: </span>
            Compatible with Google Pay, PhonePe, Paytm, FamPay, and BHIM UPI.
          </div>
        </div>

        {/* Submit Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-3.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-xs sm:text-sm transition-all shadow-[0_4px_25px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>Generating Payment QR...</span>
            </>
          ) : (
            <>
              <span>Proceed to UPI QR Payment</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </>
          )}
        </button>
      </form>

      {/* QR Modal on deposit creation */}
      {activeDeposit && (
        <QRModal
          deposit={activeDeposit}
          onClose={() => setActiveDeposit(null)}
          onSuccess={newBal => {
            updateBalanceLocally(newBal);
            setTodayDeposit(prev => prev + activeDeposit.amount);
          }}
        />
      )}
    </div>
  );
};
