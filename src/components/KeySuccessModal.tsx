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
    showToastSuccess('Key Copied to Clipboard!');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/85 backdrop-blur-md transition-opacity animate-in fade-in"
      />

      {/* Modal Dialog */}
      <div className="relative w-full max-w-sm bg-[#0d0d14] border border-rose-500/40 rounded-2xl p-5 shadow-2xl shadow-rose-950/60 z-10 animate-in zoom-in-95 duration-200">
        {/* Glow corner */}
        <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-white/5">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <CheckCircle2 className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-sm text-white">PURCHASE SUCCESSFUL</h3>
              <p className="text-[10px] text-emerald-400 font-mono">AUTOMATED INSTANT DELIVERY</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg bg-white/[0.04] text-slate-400 hover:text-white transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Description */}
        <div className="mt-4 text-center">
          <p className="text-xs text-slate-300">
            Your premium license key has been generated and is ready to use in your loader or game panel.
          </p>
          <div className="mt-1 flex items-center justify-center gap-2 text-xs font-semibold text-rose-400">
            <span>{keyData.productName}</span>
            <span>·</span>
            <span className="font-mono">{keyData.durationLabel}</span>
          </div>
        </div>

        {/* Digital Key Box */}
        <div className="mt-4 p-4 rounded-xl bg-gradient-to-r from-rose-950/30 to-red-950/20 border border-rose-500/50 text-center relative overflow-hidden group">
          <div className="text-[10px] font-mono text-slate-400 uppercase tracking-widest">
            DIGITAL KEY CODE
          </div>
          <div className="mt-1 font-mono font-black text-rose-300 text-sm tracking-widest break-all select-all py-1">
            {keyData.keyCode}
          </div>
          <div className="mt-1 flex items-center justify-center gap-1.5 text-[10px] text-slate-400">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Encrypted & Verified</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2">
          <button
            onClick={handleCopy}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40 active:scale-[0.98]"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>Copied to Clipboard!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy Key</span>
              </>
            )}
          </button>

          <button
            onClick={() => {
              onClose();
              onViewKeys();
            }}
            className="w-full py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold transition-all flex items-center justify-center gap-2 border border-white/5"
          >
            <KeyRound className="w-4 h-4 text-slate-400" />
            <span>View My Keys</span>
            <ArrowRight className="w-3.5 h-3.5 text-slate-400" />
          </button>
        </div>
      </div>
    </div>
  );
};
