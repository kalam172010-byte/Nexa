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
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, color: 'text-rose-400' },
    { id: 'buy', label: 'Buy Key', icon: ShoppingBag, color: 'text-amber-400' },
    { id: 'keys', label: 'My Keys', icon: KeyRound, color: 'text-emerald-400' },
    { id: 'deposit', label: 'Deposit', icon: Wallet, color: 'text-cyan-400' },
    ...(isReseller ? [{ id: 'api', label: 'Developer API', icon: Terminal, color: 'text-violet-400' }] : []),
    { id: 'history', label: 'Transactions', icon: History, color: 'text-sky-400' },
    { id: 'tickets', label: 'Support Desk', icon: LifeBuoy, color: 'text-pink-400' },
    { id: 'refer', label: 'Refer & Earn', icon: Share2, color: 'text-orange-400' },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Content */}
      <div className="relative w-[280px] max-w-[85vw] h-full bg-[#0b0d14] border-r border-white/[0.08] flex flex-col z-10 shadow-2xl">
        {/* Top Header */}
        <div className="h-14 px-4 border-b border-white/[0.06] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500 via-pink-600 to-amber-500 text-white flex items-center justify-center font-display font-bold text-xs shrink-0 overflow-hidden shadow-[0_0_15px_rgba(244,63,94,0.4)]">
              {siteConfig.logoUrl ? (
                <img
                  src={siteConfig.logoUrl}
                  alt={siteConfig.siteTitle || 'Logo'}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                brandInitials
              )}
            </div>
            <div className="font-display font-bold text-sm bg-gradient-to-r from-white via-rose-100 to-amber-200 bg-clip-text text-transparent truncate">
              {siteConfig.siteTitle || 'Nexa Panel'}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-white/[0.08]"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Account Summary */}
        <div className="px-4 py-3.5 bg-gradient-to-r from-rose-950/40 via-[#10121a] to-indigo-950/40 border-b border-white/[0.06] flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              @{user?.username || 'user'}
            </div>
            <div className="text-[11px] text-amber-400 font-medium mt-0.5">
              {role} Account
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-slate-400">Balance</div>
            <div className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
              {siteConfig.currencySymbol || '₹'}{balance.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          <div>
            <div className="px-3 mb-1.5 text-[11px] font-semibold text-slate-500">
              Workspace
            </div>
            <div className="space-y-0.5">
              {mainNav.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                      isActive
                        ? 'bg-gradient-to-r from-rose-500/20 via-pink-500/15 to-amber-500/10 text-white border border-rose-500/35 font-semibold'
                        : 'text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? item.color : `${item.color} opacity-80`
                      }`}
                    />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {isAdmin && (
            <div>
              <div className="px-3 mb-1.5 text-[11px] font-semibold text-slate-500">
                System Control
              </div>
              <div className="space-y-0.5">
                <button
                  onClick={() => handleSelect('admin')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                    currentPage === 'admin'
                      ? 'bg-gradient-to-r from-amber-500/20 to-rose-500/15 text-white border border-amber-500/35 font-semibold'
                      : 'text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                  <span>Admin Console</span>
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="px-3 mb-1.5 text-[11px] font-semibold text-slate-500">
              Account
            </div>
            <div className="space-y-0.5">
              <button
                onClick={() => handleSelect('profile')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 ${
                  currentPage === 'profile'
                    ? 'bg-gradient-to-r from-indigo-500/20 to-cyan-500/15 text-white border border-indigo-500/35 font-semibold'
                    : 'text-slate-300 hover:text-white hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                <User className="w-4 h-4 shrink-0 text-indigo-400" />
                <span>Account Settings</span>
              </button>

              <button
                onClick={() => {
                  logout();
                  onClose();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/[0.08] transition-colors whitespace-nowrap shrink-0"
              >
                <LogOut className="w-4 h-4 shrink-0 text-rose-400/80" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quiet Copyright Footer */}
        <div className="p-3.5 border-t border-white/[0.06] text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} {siteConfig.siteTitle || 'Nexa Panel'}
        </div>
      </div>
    </div>
  );
};
