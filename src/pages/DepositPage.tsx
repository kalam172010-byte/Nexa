import React, { useState, useEffect } from 'react';
import {
  Wallet,
  QrCode,
  Headphones,
  CheckCircle2,
  AlertCircle,
  Clock,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Zap,
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

  // Quick preset amounts
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
        showToastSuccess('Payment Order Created', 'Please scan the UPI QR code to complete payment.');
      }
    } catch (err: any) {
      showToastError('Deposit Error', err.message || 'Failed to initiate deposit.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-2xl mx-auto">
      {/* Top Banner Cards */}
      <div className="grid grid-cols-2 gap-3 sm:gap-4">
        {/* CURRENT BALANCE */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0d0d14] border border-rose-500/30 relative overflow-hidden shadow-xl">
          <div className="text-[10px] font-bold uppercase tracking-wider text-rose-400">
            CURRENT BALANCE
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-rose-500">₹</span>
            <span className="font-mono text-2xl sm:text-3xl font-black text-white tabular-nums">
              {balance.toFixed(2)}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">Available for orders</div>
        </div>

        {/* TODAY DEPOSIT */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0d0d14] border border-white/5 relative overflow-hidden shadow-xl">
          <div className="text-[10px] font-bold uppercase tracking-wider text-emerald-400">
            TODAY DEPOSIT
          </div>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-xl sm:text-2xl font-black text-emerald-500">₹</span>
            <span className="font-mono text-2xl sm:text-3xl font-black text-white tabular-nums">
              {todayDeposit.toFixed(2)}
            </span>
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">Instant auto credit</div>
        </div>
      </div>

      {/* Payment Channel Selector Buttons */}
      <div className="space-y-2">
        <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block">
          SELECT PAYMENT METHOD
        </label>
        <div className="grid grid-cols-2 gap-3">
          <button
            type="button"
            onClick={() => setSelectedMethod('UPI_QR')}
            className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3 relative ${
              selectedMethod === 'UPI_QR'
                ? 'bg-rose-500/15 border-rose-500/50 shadow-[0_0_20px_-3px_rgba(244,63,94,0.3)] text-white'
                : 'bg-[#0d0d14] border-white/5 hover:border-white/10 text-slate-300'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                selectedMethod === 'UPI_QR'
                  ? 'bg-rose-500 text-white'
                  : 'bg-white/[0.04] text-slate-400'
              }`}
            >
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs uppercase tracking-wide">QR CODE UPI</div>
              <div className="text-[10px] text-slate-400 font-mono">Zero Fee · Instant</div>
            </div>
            {selectedMethod === 'UPI_QR' && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500" />
            )}
          </button>

          <button
            type="button"
            onClick={() => setSelectedMethod('ADMIN_SUPPORT')}
            className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3 relative ${
              selectedMethod === 'ADMIN_SUPPORT'
                ? 'bg-rose-500/15 border-rose-500/50 shadow-[0_0_20px_-3px_rgba(244,63,94,0.3)] text-white'
                : 'bg-[#0d0d14] border-white/5 hover:border-white/10 text-slate-300'
            }`}
          >
            <div
              className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${
                selectedMethod === 'ADMIN_SUPPORT'
                  ? 'bg-cyan-500 text-white'
                  : 'bg-white/[0.04] text-slate-400'
              }`}
            >
              <Headphones className="w-5 h-5" />
            </div>
            <div>
              <div className="font-bold text-xs uppercase tracking-wide">ADMIN SUPPORT</div>
              <div className="text-[10px] text-slate-400 font-mono">Manual Topup Desk</div>
            </div>
            {selectedMethod === 'ADMIN_SUPPORT' && (
              <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-cyan-400" />
            )}
          </button>
        </div>
      </div>

      {/* Deposit Form */}
      <form onSubmit={handleCreatePayment} className="p-5 sm:p-6 rounded-3xl bg-[#0d0d14] border border-white/5 shadow-2xl space-y-5">
        <div>
          <label className="text-xs font-bold uppercase tracking-wider text-slate-400 block mb-2">
            ENTER DEPOSIT AMOUNT
          </label>
          <div className="relative flex items-center">
            <span className="absolute left-4 font-mono font-bold text-xl text-rose-500 select-none">
              ₹
            </span>
            <input
              type="number"
              min="1"
              step="any"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              placeholder="Enter amount"
              required
              className="w-full pl-10 pr-4 py-3.5 bg-white/[0.03] border border-white/10 focus:border-rose-500 rounded-2xl font-mono text-xl text-white font-bold placeholder:text-slate-600 focus:outline-none focus:ring-1 focus:ring-rose-500 transition-all"
            />
          </div>
          <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono mt-1.5 px-1">
            <span>Minimum deposit: ₹1</span>
            <span className="text-emerald-400">Gateway Fee: 0%</span>
          </div>
        </div>

        {/* Amount Quick Presets */}
        <div>
          <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-2">
            QUICK PRESETS
          </label>
          <div className="grid grid-cols-3 sm:grid-cols-6 gap-2">
            {presets.map(val => (
              <button
                key={val}
                type="button"
                onClick={() => setAmount(val.toString())}
                className={`py-2 px-1 rounded-xl text-xs font-mono font-bold transition-all border ${
                  amount === val.toString()
                    ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-950/40'
                    : 'bg-white/[0.03] text-slate-300 border-white/5 hover:border-white/20'
                }`}
              >
                +₹{val}
              </button>
            ))}
          </div>
        </div>

        {/* Security / Instant Guarantee Notice */}
        <div className="p-3.5 rounded-xl bg-white/[0.02] border border-white/5 flex items-start gap-3 text-xs text-slate-400">
          <ShieldCheck className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
          <div className="space-y-0.5 leading-relaxed">
            <span className="text-slate-200 font-semibold block">Instant Automated Verification</span>
            <span>
              Your balance will update immediately after payment confirmation. All UPI apps (Google Pay, PhonePe, Paytm, BHIM) supported.
            </span>
          </div>
        </div>

        {/* Create Payment Button */}
        <button
          type="submit"
          disabled={isLoading}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-[0.99] text-white font-extrabold text-sm uppercase tracking-wider transition-all shadow-xl shadow-rose-950/50 flex items-center justify-center gap-2"
        >
          {isLoading ? (
            <>
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>GENERATING PAYMENT QR...</span>
            </>
          ) : (
            <>
              <span>CREATE PAYMENT</span>
              <ArrowRight className="w-4 h-4" />
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
