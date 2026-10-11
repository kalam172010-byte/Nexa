import React from 'react';
import { Menu, Wallet, User as UserIcon, Shield, Sparkles } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useSite } from '../context/SiteContext.js';

interface HeaderProps {
  onOpenDrawer: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

export const Header: React.FC<HeaderProps> = ({ onOpenDrawer, onNavigate }) => {
  const { user, balance, role } = useAuth();
  const { siteConfig } = useSite();

  const brandInitials = siteConfig.siteTitle
    ? siteConfig.siteTitle.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase()
    : 'NX';

  return (
    <header className="sticky top-0 z-30 w-full h-14 bg-[#0a0a0f]/90 backdrop-blur-md border-b border-white/5 px-3 sm:px-6 flex items-center justify-between">
      {/* Left zone: Hamburger menu + Brand emblem & status dot */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenDrawer}
          className="w-10 h-10 flex items-center justify-center rounded-xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-slate-300 hover:text-white transition-all border border-white/5"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5 text-rose-500" />
        </button>

        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-2 text-left group focus:outline-none"
        >
          <div className="relative flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500/20 to-red-600/30 border border-rose-500/40 text-rose-400 group-hover:border-rose-400 transition-all shadow-[0_0_12px_rgba(244,63,94,0.3)] overflow-hidden">
            {siteConfig.logoUrl ? (
              <img src={siteConfig.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="font-extrabold text-sm tracking-tighter">{brandInitials}</span>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 ring-2 ring-[#070709] animate-pulse" />
          </div>

          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="font-display font-black tracking-wider text-base text-white group-hover:text-rose-400 transition-colors uppercase">
                {siteConfig.siteTitle || 'NEXA PANEL'}
              </span>
              {role === 'RESELLER' && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-amber-500/10 text-amber-400 border border-amber-500/30 font-semibold tracking-wider uppercase">
                  VIP
                </span>
              )}
              {role === 'ADMIN' && (
                <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/15 text-rose-400 border border-rose-500/30 font-semibold tracking-wider uppercase">
                  ADMIN
                </span>
              )}
            </div>
          </div>
        </button>
      </div>

      {/* Right zone: Live wallet balance & profile avatar */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Dynamic Balance Indicator */}
        <button
          onClick={() => onNavigate('deposit')}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500/10 via-rose-500/5 to-transparent border border-rose-500/30 hover:border-rose-500/60 transition-all active:scale-95 group shadow-[0_0_15px_-3px_rgba(244,63,94,0.15)]"
        >
          <Wallet className="w-3.5 h-3.5 text-rose-400 group-hover:text-rose-300 transition-colors" />
          <div className="flex items-baseline gap-0.5">
            <span className="text-xs text-rose-400 font-bold">{siteConfig.currencySymbol || '₹'}</span>
            <span className="font-mono text-sm font-bold text-white tabular-nums tracking-tight">
              {balance.toFixed(2)}
            </span>
          </div>
          <span className="text-[10px] text-rose-400/80 font-medium ml-1 hidden xs:inline">+ Add</span>
        </button>

        {/* Profile Avatar */}
        <button
          onClick={() => onNavigate('profile')}
          className="w-9 h-9 rounded-full bg-gradient-to-br from-slate-800 to-slate-900 border border-white/10 hover:border-rose-500/50 flex items-center justify-center text-slate-300 hover:text-white transition-all active:scale-95 overflow-hidden"
          aria-label="User Profile"
        >
          {user?.username ? (
            <span className="font-display font-bold text-xs uppercase text-rose-400">
              {user.username.slice(0, 2)}
            </span>
          ) : (
            <UserIcon className="w-4 h-4 text-slate-300" />
          )}
        </button>
      </div>
    </header>
  );
};
