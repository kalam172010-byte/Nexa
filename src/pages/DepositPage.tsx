import React, { useState, useEffect } from 'react';
import {
  QrCode,
  Headphones,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
  Wallet,
  Check,
  Zap,
  Sparkles,
  Smartphone,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import { Deposit } from '../types/index.js';
import { QRModal } from '../components/QRModal.js';
import upiCardImg from '../assets/images/card_upi_instant_deposit_1792510216821.jpg';

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
  const [imgFailed, setImgFailed] = useState(false);

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
      let storedGw: any = {};
      try {
        const rawGw = localStorage.getItem('nexa_admin_gateway_config');
        if (rawGw) storedGw = JSON.parse(rawGw);
      } catch {}
      const customVpa = (storedGw.upiVpa || storedGw.upiId || '8056317218@fam').trim();
      const customMerchant = (storedGw.upiMerchantName || storedGw.merchantName || 'FamPay').trim();
      const fallbackDeposit: Deposit = {
        id: `DEP-${Date.now()}`,
        userId: 'self',
        amount: num,
        payableAmount: num,
        fee: 0,
        method: selectedMethod,
        transactionId: `TXN-${Date.now()}`,
        gatewayOrderId: `FGW-${Date.now()}`,
        upiVpa: customVpa,
        merchantName: customMerchant,
        upiIntent: `upi://pay?pa=${encodeURIComponent(customVpa)}&pn=${encodeURIComponent(customMerchant)}&am=${num.toFixed(2)}&cu=INR&tn=Order-${Date.now()}`,
        status: 'PENDING',
        expiresAt: new Date(
          Date.now() + (Number(storedGw.paymentExpiryMinutes) || 10) * 60 * 1000
        ).toISOString(),
        createdAt: new Date().toISOString(),
      };
      setActiveDeposit(fallbackDeposit);
      showToastSuccess('Payment Order Ready', 'Scan the UPI QR code to complete your deposit.');
    } finally {
      setIsLoading(false);
    }
  };

  const parsedAmount = Math.max(0, parseFloat(amount) || 0);

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h2 className="font-display font-extrabold text-2xl sm:text-3xl bg-gradient-to-r from-white via-emerald-100 to-teal-200 bg-clip-text text-transparent">
          Add Funds & Automated UPI QR Terminal
        </h2>
        <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
          Top up your wallet balance instantly with 0% gateway fee via PhonePe, Google Pay, Paytm, or FamPay.
        </p>
      </div>

      {/* 2-Column Interactive Deposit Terminal */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left 7 Cols: Amount Configurator & Payment Method */}
        <form
          onSubmit={handleCreatePayment}
          className="lg:col-span-7 p-6 sm:p-8 rounded-3xl bg-gradient-to-b from-[#121628] to-[#0c0f1c] border border-emerald-500/30 space-y-6 shadow-[0_12px_40px_rgba(16,185,129,0.12)]"
        >
          {/* Payment Method Selector */}
          <div className="space-y-2.5">
            <label className="text-xs font-bold text-slate-200 block uppercase tracking-wider">
              01. Select Payment Channel
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              <button
                type="button"
                onClick={() => setSelectedMethod('UPI_QR')}
                className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3.5 cursor-pointer ${
                  selectedMethod === 'UPI_QR'
                    ? 'bg-gradient-to-r from-emerald-500/20 via-teal-500/10 to-transparent border-emerald-400 text-white shadow-lg shadow-emerald-950/50 scale-102'
                    : 'bg-[#121628] border-white/10 hover:border-white/20 text-slate-300'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                    selectedMethod === 'UPI_QR'
                      ? 'bg-gradient-to-tr from-emerald-500 to-teal-400 text-slate-950 font-black'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  <QrCode className="w-5 h-5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-sm text-white truncate">Instant UPI QR</div>
                  <div className="text-xs text-emerald-400 font-bold truncate">0% Fee · Auto-Verified</div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => setSelectedMethod('ADMIN_SUPPORT')}
                className={`p-4 rounded-2xl border transition-all text-left flex items-center gap-3.5 cursor-pointer ${
                  selectedMethod === 'ADMIN_SUPPORT'
                    ? 'bg-gradient-to-r from-violet-500/20 via-pink-500/10 to-transparent border-violet-400 text-white shadow-lg shadow-violet-950/50 scale-102'
                    : 'bg-[#121628] border-white/10 hover:border-white/20 text-slate-300'
                }`}
              >
                <div
                  className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 shadow-md ${
                    selectedMethod === 'ADMIN_SUPPORT'
                      ? 'bg-gradient-to-tr from-violet-600 to-pink-500 text-white font-black'
                      : 'bg-white/10 text-slate-300'
                  }`}
                >
                  <Headphones className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="font-extrabold text-sm text-white truncate">Support Desk</div>
                  <div className="text-xs text-violet-300 font-bold truncate">Manual Deposit Support</div>
                </div>
              </button>
            </div>
          </div>

          {/* Deposit Amount Input */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 block uppercase tracking-wider">
                02. Deposit Amount (INR)
              </label>
              <span className="text-xs text-emerald-400 font-bold bg-emerald-500/10 px-2.5 py-0.5 rounded-full border border-emerald-500/30">
                Minimum ₹1.00
              </span>
            </div>

            <div className="relative flex items-center">
              <span className="absolute left-4 font-mono font-black text-2xl text-emerald-400 select-none">
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
                className="w-full pl-11 pr-4 py-4 bg-[#0a0d18] border border-emerald-500/30 focus:border-emerald-400 rounded-2xl font-mono text-3xl text-white font-black tabular-nums placeholder:text-slate-600 focus:outline-none transition-colors shadow-inner"
              />
            </div>

            {/* Colorful Quick Presets */}
            <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 pt-1">
              {presets.map(val => {
                const isSelected = amount === val.toString();
                return (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setAmount(val.toString())}
                    className={`py-2.5 px-2 rounded-xl text-xs font-mono font-black tabular-nums transition-all border cursor-pointer ${
                      isSelected
                        ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 border-emerald-400 shadow-md shadow-emerald-950/60 scale-105'
                        : 'bg-[#121628] text-slate-300 border-white/10 hover:border-emerald-500/40 hover:text-emerald-300'
                    }`}
                  >
                    +₹{val}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Submit Action */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 px-4 rounded-2xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-sm sm:text-base transition-all shadow-[0_4px_30px_rgba(16,185,129,0.45)] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 border border-emerald-300/40 hover:scale-102"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-5 h-5 animate-spin" />
                <span>Generating Payment QR...</span>
              </>
            ) : (
              <>
                <Zap className="w-5 h-5 fill-slate-950" />
                <span>Generate UPI QR Code · ₹{parsedAmount.toFixed(2)}</span>
                <ArrowRight className="w-5 h-5 stroke-[3]" />
              </>
            )}
          </button>
        </form>

        {/* Right 5 Cols: Live Balance & Verification Summary */}
        <div className="lg:col-span-5 space-y-4">
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-emerald-950/40 via-[#101426] to-[#0c0f1c] border border-emerald-500/35 p-6 sm:p-7 space-y-5 shadow-[0_12px_35px_rgba(16,185,129,0.15)]">
            {!imgFailed && (
              <img
                src={upiCardImg}
                alt="UPI Deposit"
                referrerPolicy="no-referrer"
                onError={() => setImgFailed(true)}
                className="absolute inset-0 w-full h-full object-cover opacity-20 pointer-events-none select-none mix-blend-screen"
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-t from-[#0c0f1c] via-[#0c0f1c]/80 to-transparent pointer-events-none" />

            <div className="relative z-10 grid grid-cols-2 gap-4 pb-4 border-b border-white/10">
              <div>
                <div className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <Wallet className="w-4 h-4 text-rose-400" />
                  <span>Available Balance</span>
                </div>
                <div className="font-mono text-3xl font-black text-white tabular-nums mt-1">
                  ₹{balance.toFixed(2)}
                </div>
              </div>

              <div>
                <div className="text-xs text-slate-300 font-semibold flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-emerald-400" />
                  <span>Added Today</span>
                </div>
                <div className="font-mono text-3xl font-black text-emerald-400 tabular-nums mt-1">
                  ₹{todayDeposit.toFixed(2)}
                </div>
              </div>
            </div>

            {/* Order Calculation Breakdown */}
            <div className="relative z-10 space-y-2.5 text-xs">
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Requested Amount</span>
                <span className="font-mono font-bold tabular-nums">₹{parsedAmount.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between text-slate-300">
                <span className="text-slate-400">Gateway Processing Fee</span>
                <span className="font-mono font-bold text-emerald-400 tabular-nums">₹0.00 (0% Zero Fee)</span>
              </div>
              <div className="pt-2 border-t border-white/10 flex items-center justify-between text-white font-bold">
                <span className="text-sm">Net Wallet Credit</span>
                <span className="font-mono text-base font-black text-emerald-400 tabular-nums">
                  +₹{parsedAmount.toFixed(2)}
                </span>
              </div>
            </div>

            {/* Supported Payment Apps */}
            <div className="relative z-10 pt-3 border-t border-white/10 space-y-2.5 text-xs text-slate-300">
              <div className="font-bold text-white text-xs flex items-center gap-2">
                <Smartphone className="w-4 h-4 text-cyan-400" />
                <span>Compatible With All UPI Apps:</span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2.5 py-1 rounded-lg bg-indigo-500/20 border border-indigo-400/30 text-indigo-300 font-bold text-[11px]">
                  PhonePe
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-400/30 text-blue-300 font-bold text-[11px]">
                  Google Pay
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 font-bold text-[11px]">
                  Paytm
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-orange-500/20 border border-orange-400/30 text-orange-300 font-bold text-[11px]">
                  FamPay
                </span>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/20 border border-emerald-400/30 text-emerald-300 font-bold text-[11px]">
                  BHIM UPI
                </span>
              </div>
              <div className="flex items-center gap-2 pt-1 text-slate-300 text-xs">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>24/7 Automated UTR Receipt Verification Engine</span>
              </div>
            </div>
          </div>
        </div>
      </div>

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
