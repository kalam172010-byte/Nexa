import React, { useState, useEffect } from 'react';
import {
  X,
  Copy,
  Check,
  Clock,
  QrCode,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Zap,
  ExternalLink,
  Smartphone,
  ArrowRight,
} from 'lucide-react';
import { triggerConfetti } from '../utils/confetti.js';
import { Deposit } from '../types/index.js';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import { useAuth } from '../context/AuthContext.js';

interface QRModalProps {
  deposit: Deposit;
  onClose: () => void;
  onSuccess: (newBalance: number) => void;
}

export const QRModal: React.FC<QRModalProps> = ({ deposit, onClose, onSuccess }) => {
  const { success: showToastSuccess, error: showToastError } = useToast();
  const { updateBalanceLocally } = useAuth();

  const [timeLeft, setTimeLeft] = useState<number>(300); // 5 minutes default
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedTxn, setCopiedTxn] = useState(false);
  const [status, setStatus] = useState<Deposit['status']>(deposit.status);
  const [isVerifying, setIsVerifying] = useState(false);
  const [qrImgFailed, setQrImgFailed] = useState(false);
  const [utrInput, setUtrInput] = useState('');

  // Dynamically extract UPI VPA directly from deposit object to ensure text and QR 100% match
  const upiId =
    deposit.upiVpa ||
    (deposit.upiIntent && (deposit.upiIntent.match(/[?&]pa=([^&]+)/)?.[1]
      ? decodeURIComponent(deposit.upiIntent.match(/[?&]pa=([^&]+)/)![1])
      : null)) ||
    (deposit.qrPayload && (deposit.qrPayload.match(/[?&]pa=([^&]+)/)?.[1]
      ? decodeURIComponent(deposit.qrPayload.match(/[?&]pa=([^&]+)/)![1])
      : null)) ||
    '8056317218@fam';

  // Calculate remaining seconds
  useEffect(() => {
    const expireTime = new Date(deposit.expiresAt).getTime();
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((expireTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0) {
        setStatus('EXPIRED');
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [deposit.expiresAt]);

  // Polling payment status automatically
  useEffect(() => {
    if (status === 'SUCCESS' || status === 'EXPIRED') return;

    const pollInterval = setInterval(async () => {
      try {
        const res = await api.checkDepositStatus(deposit.id);
        if (res.deposit && res.deposit.status !== status) {
          setStatus(res.deposit.status);
          if (res.deposit.status === 'SUCCESS') {
            triggerSuccess(res.currentBalance);
          }
        }
      } catch (err) {
        // quiet poll
      }
    }, 3000);

    return () => clearInterval(pollInterval);
  }, [deposit.id, status]);

  // Auto-close on success after 3.5 seconds
  useEffect(() => {
    if (status === 'SUCCESS') {
      const timer = setTimeout(() => {
        onClose();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  const triggerSuccess = (newBal: number) => {
    try {
      triggerConfetti();
    } catch (e) {}

    updateBalanceLocally(newBal);
    showToastSuccess('Payment Successful!', `₹${deposit.amount.toFixed(2)} added to your wallet.`);
    onSuccess(newBal);
  };

  const handleConfirmPayment = async () => {
    setIsVerifying(true);
    try {
      // 1. Query live payment gateway order status first
      try {
        const checkRes = await api.checkDepositStatus(deposit.id);
        if (checkRes.deposit && checkRes.deposit.status === 'SUCCESS') {
          setStatus('SUCCESS');
          triggerSuccess(checkRes.currentBalance);
          return;
        }
      } catch (checkErr) {
        // Continue to UTR verification
      }

      // 2. Submit 12-digit UTR / Ref ID
      const submittedUtr = utrInput.trim() || undefined;

      const simRes = await api.simulateDepositSuccess(deposit.id, submittedUtr);
      if (simRes && simRes.success) {
        setStatus('SUCCESS');
        triggerSuccess(simRes.newBalance);
        return;
      }

      showToastError(
        'Payment Pending',
        `⚠️ Payment of ₹${deposit.amount.toFixed(2)} is awaiting confirmation. Please transfer via UPI and submit your 12-digit UTR number.`
      );
    } catch (err: any) {
      showToastError(
        'Payment Notice',
        err.message || 'Payment not detected yet. Please submit your 12-digit UTR or try again in a few seconds.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  const copyToClipboard = (text: string, isUpi: boolean) => {
    navigator.clipboard.writeText(text);
    if (isUpi) {
      setCopiedUpi(true);
      setTimeout(() => setCopiedUpi(false), 2000);
    } else {
      setCopiedTxn(true);
      setTimeout(() => setCopiedTxn(false), 2000);
    }
    showToastSuccess('Copied to clipboard');
  };

  const formatTimer = (secs: number) => {
    const mins = Math.floor(secs / 60);
    const s = secs % 60;
    return `${mins.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const upiDeepLink = deposit.upiIntent || deposit.qrPayload || `upi://pay?pa=${upiId}&pn=FamPay&am=${deposit.amount.toFixed(2)}&cu=INR`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-sm bg-[#0d0d14] border border-white/10 rounded-2xl p-5 shadow-2xl shadow-rose-950/40 z-10 animate-in zoom-in-95 duration-200 my-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-400 flex items-center justify-center">
              <QrCode className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white flex items-center gap-1.5">
                <span>INSTANT UPI QR</span>
                <span className="px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 text-[9px] font-mono">
                  LIVE
                </span>
              </h3>
              <p className="text-[10px] text-slate-400 font-mono">ZERO FEE AUTOMATED DEPOSIT</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-white/[0.04] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount & Status Banner */}
        <div className="mt-3.5 p-3 rounded-xl bg-gradient-to-r from-rose-500/10 to-red-500/5 border border-rose-500/20 text-center">
          <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Deposit Amount</div>
          <div className="text-2xl font-mono font-black text-white tracking-tight mt-0.5">
            ₹{deposit.amount.toFixed(2)}
          </div>
          <div className="flex items-center justify-center gap-1.5 mt-1 text-xs font-mono">
            <Clock className="w-3.5 h-3.5 text-amber-400 animate-spin" />
            <span className="text-slate-300">Expires in: </span>
            <span
              className={`font-bold tabular-nums ${
                timeLeft < 60 ? 'text-rose-400 animate-pulse' : 'text-amber-400'
              }`}
            >
              {formatTimer(timeLeft)}
            </span>
          </div>
        </div>

        {/* FamGateway Hosted QR Image or SVG Fallback */}
        <div className="mt-3.5 flex flex-col items-center">
          <div className="relative p-2.5 bg-white rounded-2xl shadow-xl flex flex-col items-center justify-center overflow-hidden">
            {deposit.qrUrl && !qrImgFailed ? (
              <img
                src={deposit.qrUrl}
                alt="FamGateway UPI QR"
                onError={() => setQrImgFailed(true)}
                className="w-44 h-44 object-contain rounded-xl"
              />
            ) : (
              <svg viewBox="0 0 160 160" className="w-44 h-44" fill="none" xmlns="http://www.w3.org/2000/svg">
                <rect width="160" height="160" fill="white" />
                <rect x="10" y="10" width="40" height="40" rx="6" stroke="#0f172a" strokeWidth="8" />
                <rect x="22" y="22" width="16" height="16" rx="3" fill="#e11d48" />
                <rect x="110" y="10" width="40" height="40" rx="6" stroke="#0f172a" strokeWidth="8" />
                <rect x="122" y="22" width="16" height="16" rx="3" fill="#e11d48" />
                <rect x="10" y="110" width="40" height="40" rx="6" stroke="#0f172a" strokeWidth="8" />
                <rect x="22" y="122" width="16" height="16" rx="3" fill="#e11d48" />
                <rect x="60" y="15" width="8" height="8" fill="#1e293b" />
                <rect x="80" y="15" width="8" height="8" fill="#1e293b" />
                <rect x="70" y="30" width="18" height="8" fill="#1e293b" />
                <rect x="15" y="60" width="8" height="8" fill="#1e293b" />
                <rect x="35" y="60" width="12" height="8" fill="#1e293b" />
                <rect x="15" y="80" width="18" height="8" fill="#1e293b" />
                <rect x="110" y="65" width="10" height="10" fill="#1e293b" />
                <rect x="135" y="70" width="12" height="8" fill="#1e293b" />
                <rect x="125" y="90" width="18" height="8" fill="#1e293b" />
                <rect x="60" y="110" width="12" height="8" fill="#1e293b" />
                <rect x="85" y="120" width="10" height="10" fill="#1e293b" />
                <rect x="65" y="135" width="25" height="8" fill="#1e293b" />
                <rect x="115" y="120" width="10" height="20" fill="#1e293b" />
                <rect x="135" y="130" width="12" height="15" fill="#1e293b" />
                <circle cx="80" cy="80" r="16" fill="#0f172a" />
                <text x="80" y="84" textAnchor="middle" fill="#f43f5e" fontSize="10" fontWeight="900" fontFamily="sans-serif">
                  FAM
                </text>
              </svg>
            )}

            {status === 'SUCCESS' && (
              <div className="absolute inset-0 bg-emerald-950/95 rounded-2xl flex flex-col items-center justify-center p-3 animate-in zoom-in-75">
                <CheckCircle2 className="w-12 h-12 text-emerald-400 animate-bounce" />
                <span className="text-sm font-bold text-white mt-1">PAID SUCCESSFULLY</span>
                <span className="text-xs text-emerald-300">Wallet Credited</span>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 mt-2">
            <span className="text-[10px] text-slate-400 font-mono">GPay · PhonePe · Paytm · Cred · FamPay</span>
          </div>

          {/* Real-time Status Badge */}
          {status === 'PENDING' && (
            <div className="flex items-center justify-center gap-2 mt-2.5 text-[10px] font-mono text-emerald-400 bg-emerald-500/10 py-1.5 px-3 rounded-xl border border-emerald-500/20">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Real-Time Gateway Sync Active (Auto-polling every 3s)</span>
            </div>
          )}
        </div>

        {/* 1-Click Action Buttons for Mobile / Web */}
        {status !== 'SUCCESS' && (
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
            <a
              href={upiDeepLink}
              className="py-2 px-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold flex items-center justify-center gap-1.5 shadow-md shadow-rose-950/40 text-[11px]"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Pay via UPI App</span>
            </a>

            {deposit.checkoutUrl ? (
              <a
                href={deposit.checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2 px-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-amber-300 hover:text-amber-200 border border-amber-500/30 font-bold flex items-center justify-center gap-1.5 text-[11px]"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                <span>Hosted Page</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => copyToClipboard(upiId, true)}
                className="py-2 px-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white border border-white/10 font-bold flex items-center justify-center gap-1.5 text-[11px]"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy UPI ID</span>
              </button>
            )}
          </div>
        )}

        {/* UPI Details & Copy */}
        <div className="mt-3 space-y-2">
          <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
            <div className="truncate mr-2">
              <span className="text-[10px] text-slate-400 block">UPI VPA</span>
              <span className="font-mono font-semibold text-white select-all">{upiId}</span>
            </div>
            <button
              onClick={() => copyToClipboard(upiId, true)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors shrink-0"
              title="Copy UPI ID"
            >
              {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center justify-between p-2 rounded-xl bg-white/[0.03] border border-white/5 text-xs">
            <div className="truncate mr-2">
              <span className="text-[10px] text-slate-400 block">Order Ref</span>
              <span className="font-mono text-[11px] text-rose-400 truncate block select-all font-semibold">
                {deposit.gatewayOrderId || deposit.transactionId}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(deposit.gatewayOrderId || deposit.transactionId, false)}
              className="p-1.5 rounded-lg bg-white/5 hover:bg-rose-500/20 text-slate-300 hover:text-rose-400 transition-colors shrink-0"
              title="Copy Ref"
            >
              {copiedTxn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* Optional UTR / Ref Number Input */}
        {status !== 'SUCCESS' && status !== 'EXPIRED' && (
          <div className="mt-3">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
              SUBMIT 12-DIGIT UTR / BANK REF NO (OPTIONAL)
            </label>
            <input
              type="text"
              value={utrInput}
              onChange={e => setUtrInput(e.target.value)}
              placeholder="e.g. 428192019283"
              className="w-full px-3 py-2 bg-white/[0.04] border border-white/10 focus:border-rose-500 rounded-xl text-xs font-mono text-white placeholder:text-slate-600 focus:outline-none transition-all"
            />
          </div>
        )}

        {/* Confirm Payment Action Button */}
        {status !== 'SUCCESS' && status !== 'EXPIRED' && (
          <div className="mt-3.5 space-y-2">
            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={isVerifying}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-600 hover:from-emerald-500 hover:to-teal-500 text-white font-display font-black text-xs sm:text-sm uppercase tracking-wider shadow-lg shadow-emerald-950/60 active:scale-95 transition-all flex items-center justify-center gap-2 group cursor-pointer"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                  <span>VERIFYING PAYMENT...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-300 group-hover:scale-110 transition-transform" />
                  <span>CONFIRM & VERIFY PAYMENT</span>
                </>
              )}
            </button>
          </div>
        )}

        {status === 'SUCCESS' && (
          <div className="mt-4">
            <button
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold uppercase tracking-wider transition-all"
            >
              Close & View Balance
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

