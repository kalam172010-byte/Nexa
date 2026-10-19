import React from 'react';
import {
  Menu,
  Wallet,
  User as UserIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useSite } from '../context/SiteContext.js';

interface HeaderProps {
  onOpenDrawer: () => void;
  onNavigate: (page: string) => void;
  currentPage: string;
}

const PAGE_LABELS: Record<string, string> = {
  dashboard: 'Dashboard',
  deposit: 'Deposit',
  buy: 'Buy Key',
  keys: 'My Keys',
  history: 'History',
  tickets: 'Support',
  refer: 'Refer & Earn',
  profile: 'Profile',
  api: 'Developer API',
  admin: 'Administration',
};

export const Header: React.FC<HeaderProps> = ({ onOpenDrawer, onNavigate, currentPage }) => {
  const { user, balance } = useAuth();
  const { siteConfig } = useSite();

  const activeLabel = PAGE_LABELS[currentPage] || 'Dashboard';

  return (
    <header className="sticky top-0 z-30 w-full h-14 bg-[#0b0d16]/90 backdrop-blur-xl border-b border-rose-500/20 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-8 shadow-[0_4px_24px_rgba(0,0,0,0.4)]">
      {/* Zone 1: Brand Wordmark & Contextual Breadcrumb */}
      <div className="flex items-center gap-3 min-w-0">
        <button
          onClick={onOpenDrawer}
          className="md:hidden w-10 h-10 shrink-0 flex items-center justify-center rounded-xl bg-rose-500/15 hover:bg-rose-500/25 text-rose-400 transition-colors border border-rose-500/30"
          aria-label="Open Navigation Menu"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="flex items-center gap-2.5 min-w-0 text-sm">
          <button
            onClick={() => onNavigate('dashboard')}
            className="flex items-center gap-2 font-display font-bold tracking-tight hover:opacity-90 transition-opacity whitespace-nowrap shrink-0 focus:outline-none cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 flex items-center justify-center text-white overflow-hidden shadow-sm shadow-rose-950/60 shrink-0">
              {siteConfig.logoUrl ? (
                <img
                  src={siteConfig.logoUrl}
                  alt={siteConfig.siteTitle || 'Logo'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="font-display font-bold text-[10px] tracking-tight">
                  {siteConfig.siteTitle ? siteConfig.siteTitle.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase() : 'NX'}
                </span>
              )}
            </div>
            <span className="bg-gradient-to-r from-white via-rose-200 to-amber-200 bg-clip-text text-transparent">
              {siteConfig.siteTitle || 'Nexa Panel'}
            </span>
          </button>
          <span aria-hidden="true" className="text-slate-600 select-none">/</span>
          <span className="font-semibold text-rose-400 truncate whitespace-nowrap">
            {activeLabel}
          </span>
        </div>
      </div>

      {/* Zone 2: Quick Navigation Links (Desktop) */}
      <nav className="hidden lg:flex items-center gap-6 text-xs font-medium text-slate-400">
        <button
          onClick={() => onNavigate('dashboard')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
            currentPage === 'dashboard' ? 'text-rose-400 font-semibold underline underline-offset-8 decoration-rose-500 decoration-2' : ''
          }`}
        >
          Overview
        </button>
        <button
          onClick={() => onNavigate('buy')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
            currentPage === 'buy' ? 'text-rose-400 font-semibold underline underline-offset-8 decoration-rose-500 decoration-2' : ''
          }`}
        >
          Buy Key
        </button>
        <button
          onClick={() => onNavigate('keys')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
            currentPage === 'keys' ? 'text-amber-400 font-semibold underline underline-offset-8 decoration-amber-500 decoration-2' : ''
          }`}
        >
          My Keys
        </button>
        <button
          onClick={() => onNavigate('deposit')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
            currentPage === 'deposit' ? 'text-emerald-400 font-semibold underline underline-offset-8 decoration-emerald-500 decoration-2' : ''
          }`}
        >
          Deposit
        </button>
        <button
          onClick={() => onNavigate('history')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
            currentPage === 'history' ? 'text-sky-400 font-semibold underline underline-offset-8 decoration-sky-500 decoration-2' : ''
          }`}
        >
          Ledger
        </button>
        <button
          onClick={() => onNavigate('tickets')}
          className={`hover:text-white transition-colors whitespace-nowrap shrink-0 py-1 cursor-pointer ${
            currentPage === 'tickets' ? 'text-violet-400 font-semibold underline underline-offset-8 decoration-violet-500 decoration-2' : ''
          }`}
        >
          Support
        </button>
      </nav>

      {/* Zone 3: Primary Wallet Action + Profile */}
      <div className="flex items-center gap-2.5 shrink-0">
        <button
          onClick={() => onNavigate('deposit')}
          className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-semibold transition-all shadow-md shadow-rose-950/50 flex items-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Wallet className="w-3.5 h-3.5 shrink-0" />
          <span className="font-mono tabular-nums font-bold">
            {siteConfig.currencySymbol || '₹'}{balance.toFixed(2)}
          </span>
          <span className="text-rose-100 hidden sm:inline">· Deposit</span>
        </button>

        <button
          onClick={() => onNavigate('profile')}
          className="w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-violet-600/20 hover:from-rose-500/30 hover:to-violet-600/30 border border-rose-500/30 flex items-center justify-center text-rose-300 hover:text-white transition-colors shrink-0 cursor-pointer"
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
      </div>
    </header>
  );
};
