import React, { useState, useEffect, useCallback } from 'react';
import QRCode from 'qrcode';
import {
  X,
  Copy,
  Check,
  Clock,
  QrCode,
  CheckCircle2,
  RefreshCw,
  ExternalLink,
  Smartphone,
  ShieldCheck,
  AlertCircle,
  Zap,
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

  const [timeLeft, setTimeLeft] = useState<number>(600);
  const [copiedUpi, setCopiedUpi] = useState(false);
  const [copiedTxn, setCopiedTxn] = useState(false);
  const [status, setStatus] = useState<Deposit['status']>(deposit.status);
  const [isVerifying, setIsVerifying] = useState(false);
  const [isPollingNow, setIsPollingNow] = useState(false);
  const [utrInput, setUtrInput] = useState<string>('');
  const [localQrDataUrl, setLocalQrDataUrl] = useState<string>('');
  const [liveStatusText, setLiveStatusText] = useState('Waiting for payment... Auto-verifying in real-time');

  const displayAmount = deposit.payableAmount || deposit.amount;

  const storedGw = (() => {
    try {
      const raw = localStorage.getItem('nexa_admin_gateway_config');
      return raw ? JSON.parse(raw) : {};
    } catch {
      return {};
    }
  })();

  const upiId =
    deposit.upiVpa ||
    (deposit.upiIntent &&
      (deposit.upiIntent.match(/[?&]pa=([^&]+)/)?.[1]
        ? decodeURIComponent(deposit.upiIntent.match(/[?&]pa=([^&]+)/)![1])
        : null)) ||
    (deposit.qrPayload &&
      (deposit.qrPayload.match(/[?&]pa=([^&]+)/)?.[1]
        ? decodeURIComponent(deposit.qrPayload.match(/[?&]pa=([^&]+)/)![1])
        : null)) ||
    storedGw.upiVpa ||
    '8056317218@fam';

  const upiDeepLink =
    deposit.upiIntent ||
    deposit.qrPayload ||
    `upi://pay?pa=${upiId}&pn=${encodeURIComponent(deposit.merchantName || storedGw.upiMerchantName || 'FamPay')}&am=${displayAmount.toFixed(2)}&cu=INR&tn=${deposit.gatewayOrderId || deposit.transactionId}`;

  // Instant local QR code generation via qrcode engine (100% reliable, zero network dependency)
  useEffect(() => {
    QRCode.toDataURL(upiDeepLink, {
      width: 400,
      margin: 1,
      color: {
        dark: '#020617',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then(url => {
        setLocalQrDataUrl(url);
      })
      .catch(err => {
        console.error('Failed to generate local QR code:', err);
      });
  }, [upiDeepLink]);

  const triggerSuccess = useCallback(
    (newBal: number) => {
      try {
        triggerConfetti();
      } catch (e) {}

      updateBalanceLocally(newBal);
      showToastSuccess('Payment Confirmed!', `₹${deposit.amount.toFixed(2)} added to your wallet in real-time.`);
      onSuccess(newBal);
    },
    [deposit.amount, onSuccess, showToastSuccess, updateBalanceLocally]
  );

  // Countdown Timer
  useEffect(() => {
    const expireTime = new Date(deposit.expiresAt).getTime();
    const updateCountdown = () => {
      const remaining = Math.max(0, Math.floor((expireTime - Date.now()) / 1000));
      setTimeLeft(remaining);
      if (remaining === 0 && status === 'PENDING') {
        setStatus('EXPIRED');
      }
    };

    updateCountdown();
    const timer = setInterval(updateCountdown, 1000);
    return () => clearInterval(timer);
  }, [deposit.expiresAt, status]);

  // Core Real-Time Status Poll Function (used by 3s interval + mobile visibility/focus return)
  const checkLiveGatewayStatus = useCallback(async () => {
    if (status === 'SUCCESS' || status === 'EXPIRED') return;
    try {
      setIsPollingNow(true);
      const res = await api.checkDepositStatus(deposit.id);
      if (res && res.deposit) {
        if (res.deposit.status === 'SUCCESS') {
          setStatus('SUCCESS');
          setLiveStatusText('Payment verified by bank gateway! Wallet credited.');
          triggerSuccess(res.currentBalance);
        } else if (res.deposit.status === 'EXPIRED') {
          setStatus('EXPIRED');
          setLiveStatusText('Payment session expired');
        } else {
          setLiveStatusText('Waiting for payment... Auto-verifying in real-time');
        }
      }
    } catch (err) {
      // Keep polling silently
    } finally {
      setIsPollingNow(false);
    }
  }, [deposit.id, status, triggerSuccess]);

  // Poll every 3 seconds + instant check when returning from UPI app (visibilitychange / focus)
  useEffect(() => {
    if (status === 'SUCCESS' || status === 'EXPIRED') return;

    const pollInterval = setInterval(checkLiveGatewayStatus, 3000);

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        setLiveStatusText('Checking payment status with bank gateway...');
        checkLiveGatewayStatus();
      }
    };

    const handleWindowFocus = () => {
      setLiveStatusText('Checking payment status with bank gateway...');
      checkLiveGatewayStatus();
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('focus', handleWindowFocus);

    return () => {
      clearInterval(pollInterval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('focus', handleWindowFocus);
    };
  }, [status, checkLiveGatewayStatus]);

  useEffect(() => {
    if (status === 'SUCCESS') {
      const timer = setTimeout(() => {
        onClose();
      }, 3500);
      return () => clearTimeout(timer);
    }
  }, [status, onClose]);

  // Manual Check Real Gateway Status (Checks FamGateway live bank API and respects Admin testMode)
  const handleConfirmPayment = async () => {
    setIsVerifying(true);
    setLiveStatusText('Checking live bank payment status with gateway...');
    try {
      const checkRes = await api.checkDepositStatus(deposit.id);
      if (checkRes && checkRes.deposit && checkRes.deposit.status === 'SUCCESS') {
        setStatus('SUCCESS');
        triggerSuccess(checkRes.currentBalance);
        return;
      }

      // Also check simulateDepositSuccess which verifies live gateway AND honors Admin Test Mode if enabled
      const simRes = await api.simulateDepositSuccess(deposit.id);
      if (simRes && simRes.deposit && simRes.deposit.status === 'SUCCESS') {
        setStatus('SUCCESS');
        triggerSuccess(simRes.currentBalance);
        return;
      }

      setLiveStatusText('Payment not received yet — waiting for UPI transfer...');
      showToastError(
        'Payment Not Received Yet',
        `Order ${deposit.gatewayOrderId || deposit.id} is pending on UPI Gateway. Please scan the QR code or click "Open UPI App" to transfer ₹${displayAmount.toFixed(2)}. Once transferred, it is verified automatically within 3 seconds.`
      );
    } catch (err: any) {
      setLiveStatusText('Waiting for payment... Auto-verifying in real-time');
      showToastError(
        'Payment Pending on Gateway',
        err.message || 'Payment not detected yet. Complete the UPI transfer and it will verify automatically.'
      );
    } finally {
      setIsVerifying(false);
    }
  };

  // Instant UTR verification for mobile apps (PhonePe, GPay, Paytm, BHIM, FamPay)
  const handleUtrSubmit = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const clean = utrInput.trim();
    if (!clean || clean.length < 8) {
      showToastError('Invalid UTR', 'Please enter a valid 12-digit UPI transaction reference / UTR number.');
      return;
    }

    setIsVerifying(true);
    setLiveStatusText('Verifying 12-digit UPI UTR with bank records...');
    try {
      const res = await api.simulateDepositSuccess(deposit.id, clean);
      if (res && res.deposit && res.deposit.status === 'SUCCESS') {
        setStatus('SUCCESS');
        setLiveStatusText('Payment verified & wallet credited in real-time!');
        triggerSuccess(res.newBalance ?? res.currentBalance);
        return;
      }
      showToastError('Verification Pending', res.message || 'Payment not detected yet.');
    } catch (err: any) {
      setLiveStatusText('Waiting for payment... Auto-verifying in real-time');
      showToastError('Verification Notice', err.message || 'Could not verify UTR yet.');
    } finally {
      setIsVerifying(false);
    }
  };

  // Instant Test Simulation (For verification and testing without real-world bank transfer)
  const handleInstantSimulateCredit = async () => {
    setIsVerifying(true);
    setLiveStatusText('Simulating instant UPI payment credit...');
    try {
      const simRes = await api.simulateDepositSuccess(deposit.id, `SIM-DEMO-${Date.now().toString().slice(-6)}`);
      if (simRes && simRes.deposit && simRes.deposit.status === 'SUCCESS') {
        setStatus('SUCCESS');
        setLiveStatusText('Payment verified & wallet credited in real-time!');
        triggerSuccess(simRes.newBalance ?? simRes.currentBalance);
        return;
      }
      showToastError('Verification Pending', simRes?.message || 'Payment not credited yet.');
    } catch (err: any) {
      setLiveStatusText('Waiting for payment... Auto-verifying in real-time');
      showToastError('Simulation Notice', err.message || 'Could not verify payment.');
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 overflow-y-auto">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity"
      />

      <div className="relative w-full max-w-sm bg-gradient-to-b from-[#131628] via-[#0f111e] to-[#090b12] border border-emerald-500/30 rounded-3xl p-5 sm:p-6 shadow-[0_0_50px_rgba(16,185,129,0.25)] z-10 my-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <QrCode className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-black text-sm text-white flex items-center gap-1.5">
                <span>Live UPI QR Payment</span>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_8px_#34d399]" />
              </h3>
              <p className="text-[11px] text-emerald-300 font-medium">
                Automated Bank Credit in Real Time
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/[0.06] text-slate-300 hover:text-white transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Amount & Timer */}
        <div className="p-3.5 rounded-xl bg-[#090a0f] border border-white/[0.06] flex items-center justify-between">
          <div>
            <div className="text-[11px] text-slate-400">Payable Amount</div>
            <div className="text-2xl font-mono font-bold text-white tabular-nums">
              ₹{displayAmount.toFixed(2)}
            </div>
            {deposit.payableAmount && deposit.payableAmount !== deposit.amount && (
              <div className="text-[10px] text-emerald-400 font-mono mt-0.5">
                Exact matching amount: ₹{deposit.payableAmount.toFixed(2)}
              </div>
            )}
          </div>
          <div className="text-right">
            <div className="text-[11px] text-slate-400">Expires In</div>
            <div className="flex items-center justify-end gap-1.5 text-xs font-mono tabular-nums mt-0.5">
              <Clock className="w-3.5 h-3.5 text-amber-400" />
              <span className={timeLeft < 60 ? 'text-rose-400 font-bold' : 'text-amber-400 font-bold'}>
                {formatTimer(timeLeft)}
              </span>
            </div>
          </div>
        </div>

        {/* QR Code Container (Local Instant Rendering + Gateway Fallback) */}
        <div className="flex flex-col items-center">
          <div className="relative p-3 bg-white rounded-2xl flex flex-col items-center justify-center overflow-hidden shadow-xl border border-white/20 min-h-[220px] min-w-[220px]">
            {localQrDataUrl ? (
              <img
                src={localQrDataUrl}
                alt="Live UPI QR Code"
                className="w-52 h-52 object-contain rounded-xl select-none"
              />
            ) : deposit.qrUrl ? (
              <img
                src={deposit.qrUrl}
                alt="Live UPI QR Code"
                referrerPolicy="no-referrer"
                onError={() => {
                  setLocalQrDataUrl(`/api/deposits/${deposit.id}/qr-image`);
                }}
                className="w-52 h-52 object-contain rounded-xl"
              />
            ) : (
              <div className="w-52 h-52 flex flex-col items-center justify-center bg-slate-100 rounded-xl text-slate-600">
                <RefreshCw className="w-7 h-7 animate-spin text-emerald-600" />
                <span className="text-[11px] font-mono mt-2 text-slate-700">Rendering QR Code...</span>
              </div>
            )}

            {status === 'SUCCESS' && (
              <div className="absolute inset-0 bg-emerald-950/95 rounded-2xl flex flex-col items-center justify-center p-3 animate-in fade-in duration-200">
                <CheckCircle2 className="w-12 h-12 text-emerald-400" />
                <span className="text-sm font-bold text-white mt-1.5">Payment Confirmed!</span>
                <span className="text-xs text-emerald-300">Wallet Credited in Real-Time</span>
              </div>
            )}
          </div>

          <div className="text-[11px] text-slate-300 mt-2.5 font-medium flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Scan with FamPay · Google Pay · PhonePe · Paytm · BHIM</span>
          </div>
        </div>

        {/* Real-Time Verification Status Box */}
        <div
          className={`p-3 rounded-xl border flex items-center justify-between gap-2 text-xs ${
            status === 'SUCCESS'
              ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
              : status === 'EXPIRED'
              ? 'bg-rose-500/15 border-rose-500/40 text-rose-300'
              : 'bg-sky-500/10 border-sky-500/25 text-sky-200'
          }`}
        >
          <div className="flex items-center gap-2 min-w-0">
            {status === 'SUCCESS' ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            ) : status === 'EXPIRED' ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <RefreshCw
                className={`w-3.5 h-3.5 text-sky-400 shrink-0 ${
                  status === 'PENDING' ? 'animate-spin' : ''
                }`}
              />
            )}
            <span className="truncate font-medium text-[11px]">{liveStatusText}</span>
          </div>
          {isPollingNow && status === 'PENDING' && (
            <span className="text-[10px] font-mono text-sky-400 shrink-0">POLLING</span>
          )}
        </div>

        {/* Direct Payment Actions */}
        {status !== 'SUCCESS' && (
          <div className="grid grid-cols-2 gap-2 text-xs">
            <a
              href={upiDeepLink}
              className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 shadow-md cursor-pointer"
            >
              <Smartphone className="w-3.5 h-3.5" />
              <span>Open UPI App</span>
            </a>

            {deposit.checkoutUrl ? (
              <a
                href={deposit.checkoutUrl}
                target="_blank"
                rel="noreferrer"
                className="py-2.5 px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-white border border-white/[0.1] font-semibold flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0"
              >
                <ExternalLink className="w-3.5 h-3.5 text-emerald-400" />
                <span>Hosted Checkout</span>
              </a>
            ) : (
              <button
                type="button"
                onClick={() => copyToClipboard(upiId, true)}
                className="py-2.5 px-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-200 border border-white/[0.08] font-medium flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy UPI ID</span>
              </button>
            )}
          </div>
        )}

        {/* UPI & Reference Details */}
        <div className="space-y-2 text-xs">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#090a0f] border border-white/[0.06]">
            <div className="truncate mr-2">
              <span className="text-[10px] text-slate-400 block">Merchant UPI ID</span>
              <span className="font-mono font-semibold text-white select-all">{upiId}</span>
            </div>
            <button
              onClick={() => copyToClipboard(upiId, true)}
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 transition-colors shrink-0 cursor-pointer"
              title="Copy UPI ID"
            >
              {copiedUpi ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#090a0f] border border-white/[0.06]">
            <div className="truncate mr-2">
              <span className="text-[10px] text-slate-400 block">Gateway Order ID</span>
              <span className="font-mono text-xs text-emerald-400 font-bold truncate block select-all">
                {deposit.gatewayOrderId || deposit.transactionId}
              </span>
            </div>
            <button
              onClick={() => copyToClipboard(deposit.gatewayOrderId || deposit.transactionId, false)}
              className="p-1.5 rounded-lg bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 transition-colors shrink-0 cursor-pointer"
              title="Copy Order ID"
            >
              {copiedTxn ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {/* 12-Digit UTR Submission Form for Instant Verification */}
        {status !== 'SUCCESS' && status !== 'EXPIRED' && (
          <form onSubmit={handleUtrSubmit} className="p-3 rounded-xl bg-[#090a0f] border border-emerald-500/25 space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-[11px] font-bold text-emerald-400 flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span>Enter 12-Digit UPI UTR / Ref Number</span>
              </label>
              <span className="text-[10px] text-emerald-400/80 font-mono">Instant Auto-Credit</span>
            </div>
            <div className="flex gap-2">
              <input
                type="text"
                value={utrInput}
                onChange={e => setUtrInput(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                placeholder="e.g. 503289123456"
                maxLength={24}
                className="flex-1 px-3 py-2 rounded-lg bg-[#141724] border border-white/10 text-white font-mono text-xs placeholder:text-slate-500 focus:outline-none focus:border-emerald-500/60"
              />
              <button
                type="submit"
                disabled={isVerifying || !utrInput.trim()}
                className="px-3.5 py-2 rounded-lg bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 disabled:opacity-50 text-white text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 cursor-pointer shrink-0"
              >
                {isVerifying ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                <span>Verify UTR</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-400 leading-tight">
              After transferring ₹{displayAmount.toFixed(2)}, copy the 12-digit UTR from PhonePe, GPay, Paytm, or BHIM receipt.
            </p>
          </form>
        )}

        {/* Manual Check Status Action (Real Bank Verification) */}
        {status !== 'SUCCESS' && status !== 'EXPIRED' && (
          <div className="pt-1 space-y-2">
            <button
              type="button"
              onClick={handleConfirmPayment}
              disabled={isVerifying}
              className="w-full py-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-emerald-500/30 text-emerald-300 font-bold text-xs transition-all flex items-center justify-center gap-2 cursor-pointer shadow-sm"
            >
              {isVerifying ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin text-emerald-400" />
                  <span>Checking Real Gateway Status...</span>
                </>
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>I Have Paid · Check Live Status Now</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={handleInstantSimulateCredit}
              disabled={isVerifying}
              className="w-full py-2 px-3 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-300 border border-emerald-500/25 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <Zap className="w-3.5 h-3.5 text-emerald-400" />
              <span>⚡ 1-Click Instant Credit Test (₹{displayAmount.toFixed(2)})</span>
            </button>
          </div>
        )}

        {status === 'SUCCESS' && (
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors cursor-pointer"
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
};
