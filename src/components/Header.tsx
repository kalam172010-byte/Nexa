import React from 'react';
import {
  Menu,
  Wallet,
  User as UserIcon,
  LogOut,
  Plus,
  Flame,
  Palette,
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useSite } from '../context/SiteContext.js';

interface HeaderProps {
  onOpenDrawer: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Overview',
  deposit: 'Add Funds',
  buy: 'License Catalog',
  keys: 'My Keys',
  history: 'Ledger',
  tickets: 'Support Desk',
  refer: 'Partner Referrals',
  profile: 'Account Settings',
  api: 'Developer API',
  admin: 'Admin Console',
};

const THEME_OPTIONS = [
  { id: 'crimson', name: 'Crimson Blood', color: 'bg-rose-500', glow: 'shadow-rose-500/50' },
  { id: 'cyan', name: 'Cyber Cyan', color: 'bg-cyan-400', glow: 'shadow-cyan-400/50' },
  { id: 'emerald', name: 'Emerald Venom', color: 'bg-emerald-400', glow: 'shadow-emerald-400/50' },
  { id: 'gold', name: 'Royal Gold', color: 'bg-amber-400', glow: 'shadow-amber-400/50' },
  { id: 'violet', name: 'Cyber Violet', color: 'bg-purple-500', glow: 'shadow-purple-500/50' },
];

export const Header: React.FC<HeaderProps> = ({ onOpenDrawer, onNavigate, currentPage }) => {
  const { user, balance, promptSignOut } = useAuth();
  const { siteConfig, updateSiteConfigLocally } = useSite();

  const activeLabel = PAGE_LABELS[currentPage] || 'Overview';
  const currentTheme = siteConfig.accentTheme || 'crimson';

  const handleSetTheme = (themeId: any) => {
    updateSiteConfigLocally({ accentTheme: themeId });
    document.documentElement.setAttribute('data-theme', themeId);
  };

  return (
    <header className="sticky top-0 z-30 w-full h-16 bg-[#090b14]/95 backdrop-blur-xl border-b border-rose-500/20 px-3 sm:px-6 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 md:gap-6 shadow-[0_4px_24px_rgba(0,0,0,0.5)]">
      {/* Zone 1: Brand Wordmark & Contextual Section Name - Always Visible */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          onClick={onOpenDrawer}
          className="md:hidden w-9 h-9 shrink-0 flex items-center justify-center rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-600/20 hover:from-rose-500/30 hover:to-purple-600/30 text-rose-400 transition-colors border border-rose-500/30 cursor-pointer shadow-md"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2 sm:gap-2.5 min-w-0">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 hover:opacity-90 transition-opacity min-w-0 focus:outline-none cursor-pointer text-left"
            title={siteConfig.siteTitle || 'KALAM FF PANEL'}
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 flex items-center justify-center text-white overflow-hidden shadow-md shadow-rose-600/40 border border-white/20 shrink-0">
              {siteConfig.logoUrl ? (
                <img
                  src={siteConfig.logoUrl}
                  alt={siteConfig.siteTitle || 'Logo'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <Flame className="w-4 h-4 fill-white animate-pulse" />
              )}
            </div>
            <div className="min-w-0 flex flex-col justify-center">
              <span className="font-display font-black text-sm sm:text-base text-white tracking-tight truncate drop-shadow-sm max-w-[130px] xs:max-w-[170px] sm:max-w-[240px]">
                {siteConfig.siteTitle || 'KALAM FF PANEL'}
              </span>
              <span className="text-[10px] text-rose-400 font-bold uppercase tracking-wider sm:hidden truncate">
                {activeLabel}
              </span>
            </div>
          </button>

          <span aria-hidden="true" className="text-slate-600 select-none hidden sm:inline">/</span>
          <span className="hidden sm:inline-flex items-center px-2 py-0.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-bold tracking-wide shrink-0">
            {activeLabel}
          </span>
        </div>
      </div>

      {/* Zone 2: Colorful Quick Navigation Links (Large Displays) */}
      <nav className="hidden lg:flex items-center gap-6 xl:gap-7 text-xs font-semibold text-slate-400 shrink-0">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`hover:text-white transition-all whitespace-nowrap shrink-0 py-1 cursor-pointer ${
            currentPage === 'dashboard'
              ? 'text-rose-400 font-bold underline underline-offset-8 decoration-rose-500 decoration-2 drop-shadow-[0_0_8px_rgba(244,63,94,0.5)]'
              : ''
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => onNavigate('buy')}
          className={`hover:text-white transition-all whitespace-nowrap shrink-0 py-1 cursor-pointer ${
            currentPage === 'buy'
              ? 'text-pink-400 font-bold underline underline-offset-8 decoration-pink-500 decoration-2 drop-shadow-[0_0_8px_rgba(244,114,182,0.5)]'
              : ''
          }`}
        >
          Buy Keys
        </button>
        <button
          onClick={() => onNavigate('keys')}
          className={`hover:text-white transition-all whitespace-nowrap shrink-0 py-1 cursor-pointer ${
            currentPage === 'keys'
              ? 'text-amber-400 font-bold underline underline-offset-8 decoration-amber-500 decoration-2 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]'
              : ''
          }`}
        >
          My Keys
        </button>
        <button
          onClick={() => onNavigate('deposit')}
          className={`hover:text-white transition-all whitespace-nowrap shrink-0 py-1 cursor-pointer ${
            currentPage === 'deposit'
              ? 'text-emerald-400 font-bold underline underline-offset-8 decoration-emerald-500 decoration-2 drop-shadow-[0_0_8px_rgba(16,185,129,0.5)]'
              : ''
          }`}
        >
          Deposit
        </button>
        <button
          onClick={() => onNavigate('history')}
          className={`hover:text-white transition-all whitespace-nowrap shrink-0 py-1 cursor-pointer ${
            currentPage === 'history'
              ? 'text-cyan-400 font-bold underline underline-offset-8 decoration-cyan-500 decoration-2 drop-shadow-[0_0_8px_rgba(6,182,212,0.5)]'
              : ''
          }`}
        >
          Ledger
        </button>
      </nav>

      {/* Zone 3: Live Theme Jewels + Primary Wallet Action + Profile + Sign Out */}
      <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
        {/* Instant Color Theme Switcher */}
        <div className="hidden sm:flex items-center gap-1.5 p-1 rounded-full bg-[#121625] border border-white/10 shadow-inner mr-0.5" title="Change Color Palette">
          <Palette className="w-3.5 h-3.5 text-slate-400 ml-1 mr-0.5" />
          {THEME_OPTIONS.map(t => (
            <button
              key={t.id}
              type="button"
              onClick={() => handleSetTheme(t.id)}
              title={t.name}
              className={`w-3.5 h-3.5 rounded-full ${t.color} transition-all transform cursor-pointer ${
                currentTheme === t.id
                  ? `scale-125 ring-2 ring-white shadow-lg ${t.glow}`
                  : 'opacity-50 hover:opacity-100 hover:scale-110'
              }`}
            />
          ))}
        </div>

        {/* Admin Console Quick Access Button */}
        {(() => {
          const ADMIN_EMAILS = ['kk7953926@gmail.com', 'kalamkalam1234kd@gmail.com', 'kalam172010@gmail.com', 'admin@example.com'];
          const isAdmin =
            user?.role === 'ADMIN' ||
            user?.role === 'SUPER ADMIN' ||
            (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) ||
            (user?.username && ['kalam', 'kalam_admin', 'nexa_admin', 'admin'].includes(user.username.toLowerCase()));

          if (!isAdmin) return null;

          return (
            <button
              type="button"
              onClick={() => onNavigate('admin')}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer border ${
                currentPage === 'admin'
                  ? 'bg-amber-500 text-slate-950 border-amber-300 shadow-md shadow-amber-500/30'
                  : 'bg-amber-500/15 hover:bg-amber-500/25 text-amber-300 border-amber-500/35'
              }`}
              title="Open Admin Control Panel"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span className="hidden lg:inline">Admin Panel</span>
            </button>
          );
        })()}

        {/* Vibrant Wallet Deposit Button */}
        <button
          onClick={() => onNavigate('deposit')}
          className="px-2.5 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 text-xs font-extrabold transition-all shadow-[0_0_20px_rgba(16,185,129,0.35)] flex items-center gap-1.5 sm:gap-2 whitespace-nowrap shrink-0 cursor-pointer border border-emerald-300/30 hover:scale-105"
        >
          <Wallet className="w-4 h-4 stroke-[2.5]" />
          <span className="font-mono tabular-nums font-black text-xs sm:text-xs">
            {siteConfig.currencySymbol || '₹'}{balance.toFixed(2)}
          </span>
          <span aria-hidden="true" className="opacity-50 hidden md:inline">·</span>
          <span className="hidden md:inline font-bold">Add Funds</span>
          <Plus className="w-3.5 h-3.5 sm:hidden shrink-0 stroke-[3]" />
        </button>

        {/* Profile Button */}
        <button
          onClick={() => onNavigate('profile')}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-purple-600/20 hover:from-rose-500/30 hover:to-purple-600/30 border border-rose-500/30 hover:border-rose-500/50 flex items-center justify-center text-rose-300 hover:text-white transition-all shrink-0 cursor-pointer shadow-md shadow-rose-950/40"
          aria-label="Account Settings"
          title={user?.username ? `@${user.username}` : 'Profile'}
        >
          {user?.username ? (
            <span className="font-display font-bold text-xs uppercase text-rose-300">
              {user.username.slice(0, 2)}
            </span>
          ) : (
            <UserIcon className="w-4 h-4 text-rose-300" />
          )}
        </button>

        {/* Sign Out with Confirm & Cancel Modal */}
        <button
          type="button"
          onClick={() => promptSignOut()}
          className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 border border-white/10 hover:border-rose-500/35 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors shrink-0 cursor-pointer"
          aria-label="Sign Out"
          title="Sign Out"
        >
          <LogOut className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
