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
  const { user, role, balance, promptSignOut } = useAuth();
  const { siteConfig } = useSite();
  const ADMIN_EMAILS = ['kk7953926@gmail.com', 'kalamkalam1234kd@gmail.com', 'kalam172010@gmail.com', 'admin@example.com'];
  const isAdmin =
    role === 'ADMIN' ||
    role === 'SUPER ADMIN' ||
    (user?.email && ADMIN_EMAILS.includes(user.email.toLowerCase())) ||
    (user?.username && ['kalam', 'kalam_admin', 'nexa_admin', 'admin'].includes(user.username.toLowerCase())) ||
    currentPage === 'admin';

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
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'buy', label: 'License Catalog', icon: ShoppingBag },
    { id: 'keys', label: 'My Keys', icon: KeyRound },
    { id: 'deposit', label: 'Add Funds', icon: Wallet },
    { id: 'api', label: isReseller ? 'Developer API' : 'Wholesale API', icon: Terminal },
    { id: 'history', label: 'Transaction Ledger', icon: History },
    { id: 'tickets', label: 'Support Desk', icon: LifeBuoy },
    { id: 'refer', label: 'Partner Referrals', icon: Share2 },
  ];

  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/75 backdrop-blur-sm transition-opacity"
      />

      {/* Drawer Content */}
      <div className="relative w-[280px] max-w-[85vw] h-full bg-[#080a0f] border-r border-white/[0.08] flex flex-col z-10 shadow-2xl">
        {/* Top Header */}
        <div className="h-16 px-4 border-b border-white/[0.08] flex items-center justify-between">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-rose-600 text-white flex items-center justify-center font-display font-bold text-xs shrink-0 overflow-hidden">
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
            <div className="font-display font-bold text-sm text-white truncate">
              {siteConfig.siteTitle || 'Nexa Panel'}
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-9 h-9 rounded-xl bg-[#10131c] hover:bg-[#161a26] text-slate-300 hover:text-white flex items-center justify-center transition-colors border border-white/[0.08] cursor-pointer"
            aria-label="Close menu"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Account Summary */}
        <div className="px-4 py-3.5 bg-[#0c0e14] border-b border-white/[0.08] flex items-center justify-between">
          <div className="min-w-0">
            <div className="text-xs font-semibold text-white truncate">
              @{user?.username || 'user'}
            </div>
            <div className="text-[11px] text-slate-400 font-medium mt-0.5">
              {role} Account
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-slate-500">Balance</div>
            <div className="text-xs font-mono font-bold text-emerald-400 tabular-nums">
              {siteConfig.currencySymbol || '₹'}{balance.toFixed(2)}
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-5">
          <div>
            <div className="px-3 mb-1.5 text-[11px] font-medium text-slate-500">
              Workspace
            </div>
            <div className="space-y-1">
              {mainNav.map(item => {
                const Icon = item.icon;
                const isActive = currentPage === item.id;

                return (
                  <button
                    key={item.id}
                    onClick={() => handleSelect(item.id)}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                      isActive
                        ? 'bg-[#121622] text-white border-white/[0.1] font-semibold'
                        : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border-transparent'
                    }`}
                  >
                    <Icon
                      className={`w-4 h-4 shrink-0 ${
                        isActive ? 'text-rose-500' : 'text-slate-400'
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
              <div className="px-3 mb-1.5 text-[11px] font-medium text-slate-500">
                Administration
              </div>
              <div className="space-y-1">
                <button
                  onClick={() => handleSelect('admin')}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                    currentPage === 'admin'
                      ? 'bg-rose-500/15 text-white border-rose-500/35 font-semibold'
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border-transparent'
                  }`}
                >
                  <ShieldCheck className="w-4 h-4 shrink-0 text-rose-400" />
                  <span>Admin Console</span>
                </button>
              </div>
            </div>
          )}

          <div>
            <div className="px-3 mb-1.5 text-[11px] font-medium text-slate-500">
              Preferences
            </div>
            <div className="space-y-1">
              <button
                onClick={() => handleSelect('profile')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                  currentPage === 'profile'
                    ? 'bg-[#121622] text-white border-white/[0.1] font-semibold'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border-transparent'
                }`}
              >
                <User className="w-4 h-4 shrink-0 text-slate-400" />
                <span>Account Settings</span>
              </button>

              <button
                onClick={() => {
                  onClose();
                  promptSignOut();
                }}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <LogOut className="w-4 h-4 shrink-0" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>

        {/* Quiet Copyright Footer */}
        <div className="p-3.5 border-t border-white/[0.08] text-center text-[11px] text-slate-500">
          © {new Date().getFullYear()} {siteConfig.siteTitle || 'Nexa Panel'}
        </div>
      </div>
    </div>
  );
};
