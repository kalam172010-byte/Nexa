import React, { useState, useEffect } from 'react';
import { X, CheckCircle2, Copy, Check, KeyRound, ArrowRight, ShieldCheck } from 'lucide-react';
import { triggerConfetti } from '../utils/confetti.js';
import { useToast } from '../context/ToastContext.js';

interface KeySuccessModalProps {
  keyData: {
    keyCode: string;
    productName: string;
    durationLabel: string;
    expiresAt?: string;
  };
  onClose: () => void;
  onViewKeys: () => void;
}

export const KeySuccessModal: React.FC<KeySuccessModalProps> = ({ keyData, onClose, onViewKeys }) => {
  const [copied, setCopied] = useState(false);
  const { success: showToastSuccess } = useToast();

  useEffect(() => {
    try {
      triggerConfetti();
    } catch (e) {}
  }, []);

  const handleCopy = () => {
    navigator.clipboard.writeText(keyData.keyCode);
    setCopied(true);
    showToastSuccess('Key copied to clipboard');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      <div className="relative w-full max-w-sm bg-[#10121a] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 space-y-5">
        <div className="flex items-center justify-between pb-3 border-b border-white/[0.06]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-display font-bold text-sm text-white">License Delivered</h3>
              <p className="text-xs text-emerald-400">Instant Automated Provisioning</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg bg-white/[0.04] text-slate-400 hover:text-white transition-colors cursor-pointer"
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
            <span>Verified & Encrypted</span>
          </div>
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

          <button
            onClick={() => {
              onClose();
              onViewKeys();
            }}
            className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-medium transition-colors flex items-center justify-center gap-2 border border-white/[0.06] cursor-pointer"
          >
            <KeyRound className="w-4 h-4 text-slate-400" />
            <span>Open My Keys</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
