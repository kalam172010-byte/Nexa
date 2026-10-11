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
  ChevronRight,
  Palette,
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

  const isReseller = role === 'RESELLER' || role === 'ADMIN' || role === 'SUPER ADMIN';

  const mainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'deposit', label: 'Deposit', icon: Wallet },
    { id: 'buy', label: 'Buy Keys', icon: ShoppingBag },
    { id: 'keys', label: 'My Keys', icon: KeyRound },
    ...(isReseller ? [{ id: 'api', label: 'Reseller API', icon: Terminal }] : []),
    { id: 'history', label: 'History', icon: History },
    { id: 'tickets', label: 'Support Ticket', icon: LifeBuoy },
    { id: 'refer', label: 'Refer & Earn', icon: Share2 },
  ];

  const isAdmin = role === 'ADMIN' || role === 'SUPER ADMIN';

  return (
    <aside className="hidden md:flex flex-col w-64 bg-[#0a0a0f] border-r border-white/5 h-screen sticky top-0 shrink-0 z-30 select-none">
      {/* Brand header */}
      <div className="p-5 border-b border-white/5 flex items-center justify-between">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 text-left focus:outline-none group"
        >
          <div className="relative flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-br from-rose-500/20 to-red-600/30 border border-rose-500/40 text-rose-400 group-hover:border-rose-400 transition-all shadow-[0_0_15px_rgba(244,63,94,0.35)] overflow-hidden">
            {siteConfig.logoUrl ? (
              <img src={siteConfig.logoUrl} alt="Logo" className="w-full h-full object-cover" />
            ) : (
              <span className="font-extrabold text-sm tracking-tighter">{brandInitials}</span>
            )}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-emerald-500 ring-2 ring-[#0a0a0f]" />
          </div>
          <div>
            <h1 className="font-display font-black text-base tracking-wider text-white group-hover:text-rose-400 transition-colors uppercase truncate max-w-[140px]">
              {siteConfig.siteTitle || 'NEXA PANEL'}
            </h1>
            <span className="text-[10px] text-slate-400 font-mono tracking-wider truncate block max-w-[140px] uppercase">
              {siteConfig.siteTagline || 'GAMING RESELLER'}
            </span>
          </div>
        </button>
      </div>

      {/* Navigation links */}
      <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            MAIN
          </div>
          <nav className="space-y-1">
            {mainNav.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/40 shadow-[0_0_20px_-3px_rgba(244,63,94,0.3)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <Icon
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      isActive ? 'text-rose-400 stroke-[2.5]' : 'text-slate-400'
                    }`}
                  />
                  <span>{item.label}</span>
                  {isActive && <ChevronRight className="w-3.5 h-3.5 ml-auto text-rose-400" />}
                </button>
              );
            })}
          </nav>
        </div>

        {isAdmin && (
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-rose-400/90 flex items-center justify-between">
              <span>ADMINISTRATION</span>
              <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => onNavigate('admin')}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  currentPage === 'admin'
                    ? 'bg-rose-600/20 text-rose-300 border border-rose-500/50 shadow-[0_0_20px_-3px_rgba(244,63,94,0.35)]'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                }`}
              >
                <ShieldCheck
                  className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                    currentPage === 'admin' ? 'text-rose-400 stroke-[2.5]' : 'text-rose-400/70'
                  }`}
                />
                <span>Admin Panel</span>
                {currentPage === 'admin' && <ChevronRight className="w-3.5 h-3.5 ml-auto text-rose-400" />}
              </button>
            </nav>
          </div>
        )}

        <div>
          <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
            SETTINGS
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => onNavigate('profile')}
              className={`w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                currentPage === 'profile'
                  ? 'bg-rose-500/15 text-rose-400 border border-rose-500/40 shadow-[0_0_20px_-3px_rgba(244,63,94,0.3)]'
                  : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <User
                className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                  currentPage === 'profile' ? 'text-rose-400 stroke-[2.5]' : 'text-slate-400'
                }`}
              />
              <span>My Profile</span>
            </button>

            <button
              onClick={logout}
              className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all group"
            >
              <LogOut className="w-4 h-4 transition-transform group-hover:scale-110 text-slate-400 group-hover:text-rose-400" />
              <span>Logout</span>
            </button>
          </nav>
        </div>
      </div>

      {/* User profile card & wallet indicator */}
      <div className="p-3 border-t border-white/5 bg-black/40">
        <div className="p-3 rounded-xl bg-white/[0.03] border border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500/20 to-slate-800 border border-rose-500/30 flex items-center justify-center font-display font-bold text-xs text-rose-400 shrink-0">
              {user?.username ? user.username.slice(0, 2).toUpperCase() : 'NX'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">@{user?.username || 'user'}</div>
              <div className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                <span className="text-emerald-400 font-bold">₹{balance.toFixed(2)}</span>
                <span>·</span>
                <span className="text-rose-400 font-medium">{role}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </aside>
  );
};
