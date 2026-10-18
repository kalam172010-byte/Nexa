import React from 'react';
import {
  LayoutDashboard,
  Wallet,
  ShoppingBag,
  KeyRound,
  History,
  LifeBuoy,
  Share2,
  ShieldCheck,
  User,
  LogOut,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useSite } from '../context/SiteContext.js';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { user, role, balance, logout } = useAuth();
  const { siteConfig } = useSite();

  const brandInitials = siteConfig.siteTitle
    ? siteConfig.siteTitle.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase()
    : 'NX';

  const ADMIN_EMAILS = ['kk7953926@gmail.com', 'kalamkalam1234kd@gmail.com', 'kalam172010@gmail.com', 'admin@example.com'];
  const isReseller = role === 'RESELLER' || role === 'ADMIN' || role === 'SUPER ADMIN';
  const isAdmin =
    role === 'ADMIN' ||
    role === 'SUPER ADMIN' ||
    (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) ||
    (user?.username && ['kalam', 'kalam_admin', 'nexa_admin', 'admin'].includes(user.username.toLowerCase())) ||
    currentPage === 'admin';

  const mainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-rose-400', activeBg: 'bg-gradient-to-r from-rose-500/20 to-red-500/5 border-rose-500/35 text-white' },
    { id: 'buy', label: 'Buy Key', icon: ShoppingBag, color: 'text-pink-400', activeBg: 'bg-gradient-to-r from-pink-500/20 to-rose-500/5 border-pink-500/35 text-white' },
    { id: 'keys', label: 'My Keys', icon: KeyRound, color: 'text-amber-400', activeBg: 'bg-gradient-to-r from-amber-500/20 to-orange-500/5 border-amber-500/35 text-white' },
    { id: 'deposit', label: 'Deposit', icon: Wallet, color: 'text-emerald-400', activeBg: 'bg-gradient-to-r from-emerald-500/20 to-teal-500/5 border-emerald-500/35 text-white' },
    ...(isReseller ? [{ id: 'api', label: 'Developer API', icon: Terminal, color: 'text-cyan-400', activeBg: 'bg-gradient-to-r from-cyan-500/20 to-sky-500/5 border-cyan-500/35 text-white' }] : []),
    { id: 'history', label: 'Transactions', icon: History, color: 'text-sky-400', activeBg: 'bg-gradient-to-r from-sky-500/20 to-blue-500/5 border-sky-500/35 text-white' },
    { id: 'tickets', label: 'Support Desk', icon: LifeBuoy, color: 'text-violet-400', activeBg: 'bg-gradient-to-r from-violet-500/20 to-indigo-500/5 border-violet-500/35 text-white' },
    { id: 'refer', label: 'Refer & Earn', icon: Share2, color: 'text-fuchsia-400', activeBg: 'bg-gradient-to-r from-fuchsia-500/20 to-pink-500/5 border-fuchsia-500/35 text-white' },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0b0d16] border-r border-white/[0.07] h-screen sticky top-0 shrink-0 z-30 select-none">
      {/* Brand Header */}
      <div className="h-14 px-5 border-b border-white/[0.07] flex items-center">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 text-left focus:outline-none group min-w-0 cursor-pointer"
        >
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-red-600 text-white shadow-md shadow-rose-950/50 shrink-0 overflow-hidden">
            {siteConfig.logoUrl ? (
              <img
                src={siteConfig.logoUrl}
                alt={siteConfig.siteTitle || 'Brand Logo'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="font-display font-bold text-xs tracking-tight">{brandInitials}</span>
            )}
          </div>
          <span className="font-display font-bold text-sm tracking-tight bg-gradient-to-r from-white via-rose-100 to-rose-300 bg-clip-text text-transparent truncate whitespace-nowrap">
            {siteConfig.siteTitle || 'Nexa Panel'}
          </span>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 overflow-y-auto px-3 py-5 space-y-6">
        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold text-rose-400/80">
            Workspace
          </div>
          <nav className="space-y-1">
            {mainNav.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                    isActive
                      ? `${item.activeBg} font-semibold shadow-sm`
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.04] border-transparent'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${item.color}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {isAdmin && (
          <div>
            <div className="px-3 mb-2 text-[11px] font-semibold text-amber-400/80">
              System Control
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => onNavigate('admin')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                  currentPage === 'admin'
                    ? 'bg-gradient-to-r from-rose-600/25 to-amber-500/10 text-white border-rose-500/40 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04] border-transparent'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0 text-rose-400" />
                <span className="truncate">Admin Console</span>
              </button>
            </nav>
          </div>
        )}

        <div>
          <div className="px-3 mb-2 text-[11px] font-semibold text-sky-400/80">
            Account
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => onNavigate('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                currentPage === 'profile'
                  ? 'bg-gradient-to-r from-violet-500/20 to-rose-500/10 text-white border-violet-500/35 font-semibold'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.04] border-transparent'
              }`}
            >
              <User className="w-4 h-4 shrink-0 text-violet-400" />
              <span className="truncate">Account Settings</span>
            </button>

            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0 text-rose-400/80" />
              <span>Sign Out</span>
            </button>
          </nav>
        </div>
      </div>

      {/* User Account Footer */}
      <div className="p-3.5 border-t border-white/[0.07]">
        <button
          onClick={() => onNavigate('profile')}
          className="w-full p-2.5 rounded-xl bg-gradient-to-r from-rose-950/30 via-[#121521] to-indigo-950/30 hover:from-rose-950/40 border border-rose-500/20 flex items-center justify-between transition-all text-left cursor-pointer"
        >
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 to-violet-600 flex items-center justify-center font-display font-bold text-xs text-white shrink-0">
              {user?.username ? user.username.slice(0, 2).toUpperCase() : 'NX'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-semibold text-white truncate">@{user?.username || 'user'}</div>
              <div className="text-[11px] flex items-center gap-1.5 font-mono tabular-nums">
                <span className="text-emerald-400 font-bold">{siteConfig.currencySymbol || '₹'}{balance.toFixed(2)}</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-amber-400 font-sans font-medium text-[10px]">{role}</span>
              </div>
            </div>
          </div>
        </button>
      </div>
    </aside>
  );
};
