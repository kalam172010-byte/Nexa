import React, { useState, useEffect, useRef } from 'react';
import {
  X,
  CheckCircle2,
  Copy,
  Check,
  KeyRound,
  ArrowRight,
  ShieldCheck,
  Mail,
  Send,
  RefreshCw,
} from 'lucide-react';
import { triggerConfetti } from '../utils/confetti.js';
import { useToast } from '../context/ToastContext.js';
import { useAuth } from '../context/AuthContext.js';
import { api } from '../services/api.js';

interface KeySuccessModalProps {
  keyData: {
    id?: string;
    orderId?: string;
    keyCode: string;
    productName: string;
    gameName?: string;
    durationLabel: string;
    pricePaid?: number;
    expiresAt?: string;
    assignedAt?: string;
    purchaseSource?: 'API' | 'WEB';
    purchaseSourceLabel?: string;
    receiptEmailSent?: boolean;
    receiptSimulated?: boolean;
    receiptStatusMessage?: string;
    receiptEmailAddress?: string;
  };
  onClose: () => void;
  onViewKeys: () => void;
}

export const KeySuccessModal: React.FC<KeySuccessModalProps> = ({ keyData, onClose, onViewKeys }) => {
  const { user } = useAuth();
  const [copied, setCopied] = useState(false);
  const [isSendingEmail, setIsSendingEmail] = useState(false);
  const [receiptSentTo, setReceiptSentTo] = useState<string>(
    keyData.receiptEmailSent ? keyData.receiptEmailAddress || user?.email || '' : ''
  );
  const [receiptSimulated, setReceiptSimulated] = useState<boolean>(
    Boolean(keyData.receiptSimulated)
  );
  const [customEmail, setCustomEmail] = useState<string>(
    keyData.receiptEmailAddress || user?.email || ''
  );
  const [showEmailInput, setShowEmailInput] = useState(false);
  const autoSentRef = useRef(false);
  const { success: showToastSuccess, error: showToastError } = useToast();

  useEffect(() => {
    try {
      triggerConfetti();
    } catch (e) {}

    // Automatically guarantee email receipt delivery when key is purchased
    if (!autoSentRef.current) {
      autoSentRef.current = true;
      const targetEmail = (keyData.receiptEmailAddress || user?.email || '').trim();
      const isValidRealEmail =
        targetEmail.includes('@') &&
        !targetEmail.endsWith('@user.local') &&
        !targetEmail.endsWith('@firebase.user');

      if (isValidRealEmail && !keyData.receiptEmailSent) {
        api
          .sendKeyReceipt(keyData.id || keyData.orderId || 'receipt', {
            email: targetEmail,
            keyCode: keyData.keyCode,
            orderId: keyData.orderId,
            productName: keyData.productName,
            gameName: keyData.gameName,
            durationLabel: keyData.durationLabel,
            pricePaid: keyData.pricePaid,
            purchaseSourceLabel:
              keyData.purchaseSourceLabel ||
              (keyData.purchaseSource === 'API' ? 'Buy from API' : 'Buy from Website'),
            expiresAt: keyData.expiresAt,
            assignedAt: keyData.assignedAt,
          })
          .then(res => {
            if (res?.sentTo || targetEmail) {
              setReceiptSentTo(res?.sentTo || targetEmail);
              setReceiptSimulated(Boolean(res?.simulated));
            }
          })
          .catch(() => {});
      }
    }
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(keyData.keyCode);
    setCopied(true);
    showToastSuccess('Key copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleSendEmailReceipt = async (targetEmailOverride?: string) => {
    const emailToUse = (targetEmailOverride || customEmail || user?.email || '').trim();
    if (!emailToUse || !emailToUse.includes('@')) {
      showToastError('Invalid Email', 'Please enter a valid email address to receive the receipt.');
      setShowEmailInput(true);
      return;
    }

    setIsSendingEmail(true);
    try {
      const res = await api.sendKeyReceipt(keyData.id || keyData.orderId || 'receipt', {
        email: emailToUse,
        keyCode: keyData.keyCode,
        orderId: keyData.orderId,
        productName: keyData.productName,
        gameName: keyData.gameName,
        durationLabel: keyData.durationLabel,
        pricePaid: keyData.pricePaid,
        purchaseSourceLabel:
          keyData.purchaseSourceLabel ||
          (keyData.purchaseSource === 'API' ? 'Buy from API' : 'Buy from Website'),
        expiresAt: keyData.expiresAt,
        assignedAt: keyData.assignedAt,
      });
      const finalEmail = res.sentTo || emailToUse;
      setReceiptSentTo(finalEmail);
      setReceiptSimulated(Boolean(res.simulated));
      setShowEmailInput(false);
      if (res.simulated) {
        showToastError(
          'SMTP App Password Needed for Live Inbox Delivery',
          res.message || 'Please save your 16-character Google App Password in Admin Panel -> Email & IMAP.'
        );
      } else {
        showToastSuccess('Email Receipt Sent', `Key purchase receipt dispatched to ${finalEmail}`);
      }
    } catch (err: any) {
      showToastError('Receipt Error', err.message || 'Could not send email receipt.');
    } finally {
      setIsSendingEmail(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      <div className="relative w-full max-w-sm bg-gradient-to-b from-[#131626] via-[#0f111d] to-[#090b12] border border-rose-500/30 rounded-3xl p-6 shadow-[0_0_50px_rgba(244,63,94,0.3)] z-10 space-y-4">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.08]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 flex items-center justify-center shadow-[0_0_12px_rgba(16,185,129,0.3)]">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white">License Delivered!</h3>
              <p className="text-xs text-emerald-400 font-semibold">
                {keyData.purchaseSourceLabel ||
                  (keyData.purchaseSource === 'API' ? 'Buy from API' : 'Buy from Website')}
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

        <div className="text-center space-y-1">
          <p className="text-xs text-slate-400">
            Your license key has been generated and is ready for activation.
          </p>
          <div className="flex items-center justify-center gap-2 text-xs font-semibold text-white pt-1">
            <span>{keyData.productName}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-rose-400">{keyData.durationLabel}</span>
          </div>
          <div className="pt-2 flex justify-center">
            <span
              className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-[11px] font-bold uppercase tracking-wider border ${
                keyData.purchaseSource === 'API'
                  ? 'bg-purple-500/15 text-purple-300 border-purple-500/30'
                  : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
              }`}
            >
              {keyData.purchaseSourceLabel ||
                (keyData.purchaseSource === 'API' ? 'Buy from API' : 'Buy from Website')}
            </span>
          </div>
        </div>

        <div className="p-4 rounded-xl bg-[#090a0f] border border-rose-500/30 text-center space-y-1.5">
          <div className="text-xs text-slate-400">
            License Key Code
          </div>
          <div className="font-mono font-bold text-rose-400 text-sm tracking-wider break-all select-all py-1">
            {keyData.keyCode}
          </div>
          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>
              {keyData.purchaseSourceLabel ||
                (keyData.purchaseSource === 'API' ? 'Buy from API' : 'Buy from Website')}
            </span>
          </div>
        </div>

        {/* Email Receipt Confirmation & Resend Box */}
        <div
          className={`p-3 rounded-xl space-y-2 border ${
            receiptSimulated
              ? 'bg-amber-950/25 border-amber-500/35'
              : 'bg-emerald-950/25 border-emerald-500/30'
          }`}
        >
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Mail
                className={`w-4 h-4 shrink-0 ${
                  receiptSimulated ? 'text-amber-400' : 'text-emerald-400'
                }`}
              />
              <div className="text-[11px] text-slate-300 truncate">
                {receiptSentTo && !receiptSimulated ? (
                  <>
                    Receipt sent to{' '}
                    <span className="font-mono font-bold text-emerald-300">{receiptSentTo}</span>
                  </>
                ) : receiptSentTo && receiptSimulated ? (
                  <span className="text-amber-300">
                    Receipt ready for <strong className="font-mono">{receiptSentTo}</strong> (Set App Password in Admin)
                  </span>
                ) : (
                  <span>Send key purchase receipt to your email</span>
                )}
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowEmailInput(prev => !prev)}
              className="text-[10px] font-bold text-cyan-400 hover:text-cyan-300 underline shrink-0 cursor-pointer"
            >
              {showEmailInput ? 'Hide' : 'Change'}
            </button>
          </div>

          {showEmailInput && (
            <div className="flex items-center gap-1.5 pt-1">
              <input
                type="email"
                value={customEmail}
                onChange={e => setCustomEmail(e.target.value)}
                placeholder="Enter email for receipt..."
                className="w-full px-2.5 py-1.5 rounded-lg bg-[#080a10] border border-white/15 text-xs text-white placeholder:text-slate-500 focus:outline-none focus:border-emerald-400"
              />
              <button
                type="button"
                disabled={isSendingEmail}
                onClick={() => handleSendEmailReceipt(customEmail)}
                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1 shrink-0 cursor-pointer disabled:opacity-50"
              >
                {isSendingEmail ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Send className="w-3.5 h-3.5" />
                )}
                <span>Send</span>
              </button>
            </div>
          )}
        </div>

        <div className="space-y-2">
          <button
            onClick={handleCopy}
            className="w-full py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied to Clipboard</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy License Key</span>
              </>
            )}
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              disabled={isSendingEmail}
              onClick={() => handleSendEmailReceipt()}
              className="w-full py-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 border border-emerald-500/30 text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
            >
              {isSendingEmail ? (
                <>
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  <span>Sending...</span>
                </>
              ) : (
                <>
                  <Mail className="w-3.5 h-3.5" />
                  <span>Email Receipt</span>
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => {
                onClose();
                onViewKeys();
              }}
              className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium transition-colors flex items-center justify-center gap-1.5 border border-white/[0.06] cursor-pointer"
            >
              <KeyRound className="w-3.5 h-3.5 text-slate-400" />
              <span>Open My Keys</span>
              <ArrowRight className="w-3 h-3 text-slate-400" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

