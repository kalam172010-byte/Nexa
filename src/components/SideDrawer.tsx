import React from 'react';
import {
  X,
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
  ShieldAlert,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useSite } from '../context/SiteContext.js';

interface SideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const SideDrawer: React.FC<SideDrawerProps> = ({ isOpen, onClose, currentPage, onNavigate }) => {
  const { user, role, balance, logout } = useAuth();
  const { siteConfig } = useSite();
  const isAdmin = role === 'ADMIN' || role === 'SUPER ADMIN';

  if (!isOpen) return null;

  const handleSelect = (pageId: string) => {
    onNavigate(pageId);
    onClose();
  };

  const brandInitials = siteConfig.siteTitle
    ? siteConfig.siteTitle.replace(/[^a-zA-Z0-9]/g, '').slice(0, 2).toUpperCase()
    : 'NX';

  const isReseller = role === 'RESELLER' || role === 'ADMIN' || role === 'SUPER ADMIN';

  const mainNav = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'deposit', label: 'Deposit', icon: Wallet },
    { id: 'buy', label: 'Buy Keys', icon: ShoppingBag },
    { id: 'keys', label: 'My Keys', icon: KeyRound },
    ...(isReseller ? [{ id: 'api', label: 'Reseller API System', icon: Terminal }] : []),
    { id: 'history', label: 'History', icon: History },
    { id: 'tickets', label: 'Support Ticket', icon: LifeBuoy },
    { id: 'refer', label: 'Refer & Earn', icon: Share2 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Dark transparent backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-sm transition-opacity animate-in fade-in duration-200"
      />

      {/* Drawer content sliding from left */}
      <div className="relative w-[280px] max-w-[85vw] h-full bg-[#0a0a0f] border-r border-white/10 flex flex-col z-10 shadow-2xl shadow-rose-950/20 animate-in slide-in-from-left duration-300">
        {/* Top header with close button */}
        <div className="p-4 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500/20 to-red-600/30 border border-rose-500/40 text-rose-400 flex items-center justify-center font-display font-extrabold text-sm shadow-[0_0_12px_rgba(244,63,94,0.35)] overflow-hidden">
              {siteConfig.logoUrl ? (
                <img src={siteConfig.logoUrl} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                brandInitials
              )}
            </div>
            <div>
              <div className="font-display font-black text-sm tracking-wider text-white uppercase truncate max-w-[140px]">
                {siteConfig.siteTitle || 'NEXA PANEL'}
              </div>
              <div className="text-[10px] text-slate-400 font-mono uppercase truncate max-w-[140px]">
                {siteConfig.siteTagline || 'GAMING RESELLER'}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-400 hover:text-white flex items-center justify-center transition-colors border border-white/5"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* User preview snippet */}
        <div className="px-4 py-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
          <div>
            <div className="text-xs font-bold text-white truncate max-w-[140px]">
              @{user?.username || 'user'}
            </div>
            <div className="text-[10px] text-rose-400 font-semibold tracking-wider uppercase mt-0.5">
              {role} ACCOUNT
            </div>
          </div>
          <div className="text-right">
            <div className="text-[9px] text-slate-400 uppercase">Wallet</div>
            <div className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
              {siteConfig.currencySymbol || '₹'}{balance.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Navigation list */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          {/* MAIN */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              MAIN
            </div>
            <div className="space-y-1">
              {mainNav.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                      isActive
                        ? 'bg-rose-500/15 text-rose-400 border border-rose-500/40 shadow-[0_0_15px_-2px_rgba(244,63,94,0.3)]'
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
            </div>
          </div>

          {/* ADMIN */}
          {isAdmin && (
            <div>
              <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-rose-400/90 flex items-center justify-between">
                <span>ADMINISTRATION</span>
                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 animate-pulse" />
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => handleSelect('admin')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    currentPage === 'admin'
                      ? 'bg-rose-600/20 text-rose-300 border border-rose-500/50 shadow-[0_0_15px_-2px_rgba(244,63,94,0.35)]'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.04]'
                  }`}
                >
                  <ShieldCheck
                    className={`w-4 h-4 transition-transform group-hover:scale-110 ${
                      currentPage === 'admin' ? 'text-rose-400 stroke-[2.5]' : 'text-rose-400/80'
                    }`}
                  />
                  <span>Admin Panel</span>
                  {currentPage === 'admin' && <ChevronRight className="w-3.5 h-3.5 ml-auto text-rose-400" />}
                </button>
              </div>
            </div>
          )}

          {/* SETTINGS */}
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
              SETTINGS
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleSelect('profile')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                  currentPage === 'profile'
                    ? 'bg-rose-500/15 text-rose-400 border border-rose-500/40 shadow-[0_0_15px_-2px_rgba(244,63,94,0.3)]'
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
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-semibold text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-all group"
              >
                <LogOut className="w-4 h-4 transition-transform group-hover:scale-110 text-slate-400 group-hover:text-rose-400" />
                <span>Logout</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-white/5 text-center text-[10px] text-slate-400 font-mono">
          NEXA PANEL v2.4 · SECURE RESELLER
        </div>
      </div>
    </div>
  );
};
