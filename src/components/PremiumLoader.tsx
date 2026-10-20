import React, { useEffect, useState } from 'react';
import { ShieldCheck, Lock, Zap } from 'lucide-react';

interface PremiumLoadingPageProps {
  siteTitle?: string;
  logoUrl?: string;
  subtitle?: string;
}

export const PremiumLoadingPage: React.FC<PremiumLoadingPageProps> = ({
  siteTitle = 'KALAM FF PANEL',
  logoUrl,
  subtitle = 'Initializing VIP License Infrastructure',
}) => {
  const [progress, setProgress] = useState(18);
  const [stepIndex, setStepIndex] = useState(0);

  const steps = [
    'Connecting to encrypted license vault...',
    'Synchronizing real-time product catalog...',
    'Verifying reseller & wallet credentials...',
    'Launching Kalam VIP workspace...',
  ];

  useEffect(() => {
    const progInterval = setInterval(() => {
      setProgress(prev => (prev < 96 ? prev + Math.floor(Math.random() * 14) + 5 : 98));
    }, 180);

    const stepInterval = setInterval(() => {
      setStepIndex(prev => (prev + 1) % steps.length);
    }, 450);

    return () => {
      clearInterval(progInterval);
      clearInterval(stepInterval);
    };
  }, []);

  const monogram = siteTitle ? siteTitle.slice(0, 2).toUpperCase() : 'KF';

  return (
    <div className="fixed inset-0 z-[100] bg-[#06070b] flex flex-col items-center justify-center p-6 overflow-hidden select-none">
      {/* Ambient Radial Illumination */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[480px] h-[480px] bg-rose-600/15 rounded-full blur-[130px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[280px] h-[280px] bg-amber-500/10 rounded-full blur-[90px] pointer-events-none" />

      {/* Central Luxury Loading Card */}
      <div className="relative z-10 w-full max-w-md rounded-3xl bg-gradient-to-b from-[#121521]/95 to-[#0b0d14]/95 border border-white/[0.08] p-8 sm:p-10 shadow-[0_25px_80px_rgba(0,0,0,0.85)] backdrop-blur-xl flex flex-col items-center text-center space-y-7">
        {/* Top Accent Line */}
        <div className="absolute top-0 inset-x-10 h-[1px] bg-gradient-to-r from-transparent via-rose-500/70 to-transparent" />

        {/* Orbital Emblem Assembly */}
        <div className="relative w-24 h-24 flex items-center justify-center">
          {/* Outer Rotating Ring */}
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-rose-500 border-r-amber-400/70 animate-spin" />
          {/* Middle Counter-Rotating Ring */}
          <div
            className="absolute inset-2 rounded-full border border-transparent border-b-cyan-400/70 border-l-rose-400/50 animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '2.4s' }}
          />
          {/* Inner Pulse Glow */}
          <div className="absolute inset-4 rounded-2xl bg-gradient-to-br from-rose-600/25 via-rose-500/15 to-amber-500/20 blur-md animate-pulse" />

          {/* Core Brand Emblem */}
          <div className="relative w-14 h-14 rounded-2xl bg-gradient-to-br from-rose-600 via-pink-600 to-amber-500 p-[1px] shadow-[0_0_30px_rgba(244,63,94,0.45)]">
            <div className="w-full h-full rounded-[15px] bg-[#0b0d14] flex items-center justify-center overflow-hidden">
              {logoUrl ? (
                <img src={logoUrl} alt={siteTitle} className="w-full h-full object-cover" />
              ) : (
                <span className="font-display font-black text-lg bg-gradient-to-br from-white via-rose-100 to-amber-200 bg-clip-text text-transparent tracking-wider">
                  {monogram}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Title & Status Copy */}
        <div className="space-y-2">
          <div className="flex items-center justify-center gap-2 text-[11px] font-semibold tracking-widest uppercase text-rose-400">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>VIP Cloud Infrastructure</span>
          </div>
          <h1 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-tight">
            {siteTitle}
          </h1>
          <p className="text-xs text-slate-400 max-w-xs mx-auto leading-relaxed">
            {subtitle}
          </p>
        </div>

        {/* Precision Progress Bar & Telemetry */}
        <div className="w-full space-y-2.5">
          <div className="flex items-center justify-between text-xs">
            <span className="text-slate-300 font-medium truncate pr-2">
              {steps[stepIndex]}
            </span>
            <span className="font-mono font-bold text-amber-300 tabular-nums shrink-0">
              {Math.min(100, progress)}%
            </span>
          </div>

          <div className="w-full h-2 rounded-full bg-[#07080d] border border-white/[0.06] overflow-hidden p-0.5">
            <div
              className="h-full rounded-full bg-gradient-to-r from-rose-600 via-pink-500 to-amber-400 transition-all duration-200 shadow-[0_0_12px_rgba(244,63,94,0.6)]"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>

        {/* Unboxed Footer Metadata */}
        <div className="pt-2 border-t border-white/[0.06] w-full flex items-center justify-center gap-2 text-[11px] text-slate-400">
          <span className="inline-flex items-center gap-1 text-emerald-400 font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Verified Safe</span>
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span className="inline-flex items-center gap-1">
            <Lock className="w-3 h-3 text-slate-400" />
            <span>256-Bit SSL</span>
          </span>
          <span aria-hidden="true" className="text-slate-600">·</span>
          <span>24/7 Instant Delivery</span>
        </div>
      </div>
    </div>
  );
};

interface PremiumLoadingModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  badgeText?: string;
}

export const PremiumLoadingModal: React.FC<PremiumLoadingModalProps> = ({
  isOpen,
  title = 'Processing Request...',
  subtitle = 'Synchronizing encrypted data with live cloud servers. Please wait a moment.',
  badgeText = 'LIVE CLOUD SYNC',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 select-none">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-black/80 backdrop-blur-md transition-opacity" />

      {/* Modal Card */}
      <div className="relative z-10 w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#141826] to-[#0b0d15] border border-rose-500/30 p-7 shadow-[0_20px_70px_rgba(244,63,94,0.22)] text-center space-y-5 overflow-hidden">
        {/* Top Highlight Line */}
        <div className="absolute top-0 inset-x-8 h-[1px] bg-gradient-to-r from-transparent via-rose-400 to-transparent" />

        {/* Ambient Glow */}
        <div className="absolute -top-16 left-1/2 -translate-x-1/2 w-40 h-40 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Dual Orbital Spinner */}
        <div className="relative w-16 h-16 mx-auto flex items-center justify-center">
          <div className="absolute inset-0 rounded-full border-2 border-transparent border-t-rose-500 border-r-amber-400 animate-spin" />
          <div
            className="absolute inset-2 rounded-full border border-transparent border-b-emerald-400 border-l-cyan-400 animate-spin"
            style={{ animationDirection: 'reverse', animationDuration: '1.8s' }}
          />
          <div className="w-8 h-8 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-rose-400 animate-pulse" />
          </div>
        </div>

        {/* Text Hierarchy */}
        <div className="space-y-1.5 relative z-10">
          <div className="text-[10px] font-bold uppercase tracking-widest text-amber-400">
            {badgeText}
          </div>
          <h3 className="font-display font-bold text-base sm:text-lg text-white">
            {title}
          </h3>
          <p className="text-xs text-slate-400 leading-relaxed max-w-xs mx-auto">
            {subtitle}
          </p>
        </div>

        {/* Indeterminate Shimmer Progress Bar */}
        <div className="w-full h-1.5 rounded-full bg-[#07080d] border border-white/[0.06] overflow-hidden p-[1px]">
          <div className="h-full w-2/3 rounded-full bg-gradient-to-r from-rose-600 via-amber-400 to-emerald-400 animate-pulse" />
        </div>
      </div>
    </div>
  );
};
