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
  ArrowUpRight,
  Flame,
  Palette,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useSite } from '../context/SiteContext.js';

interface SidebarProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

const THEME_OPTIONS = [
  { id: 'crimson', name: 'Crimson', color: 'bg-rose-500' },
  { id: 'cyan', name: 'Cyber Cyan', color: 'bg-cyan-400' },
  { id: 'emerald', name: 'Emerald', color: 'bg-emerald-400' },
  { id: 'gold', name: 'Royal Gold', color: 'bg-amber-400' },
  { id: 'violet', name: 'Violet', color: 'bg-purple-500' },
];

export const Sidebar: React.FC<SidebarProps> = ({ currentPage, onNavigate }) => {
  const { user, role, balance, promptSignOut } = useAuth();
  const { siteConfig, updateSiteConfigLocally } = useSite();

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

  const currentTheme = siteConfig.accentTheme || 'crimson';

  const primaryNav = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard, color: 'text-rose-400', activeBg: 'from-rose-500/25 via-pink-500/10 to-transparent border-rose-500' },
    { id: 'buy', label: 'Buy Keys', icon: ShoppingBag, color: 'text-pink-400', activeBg: 'from-pink-500/25 via-rose-500/10 to-transparent border-pink-500' },
    { id: 'keys', label: 'My Keys', icon: KeyRound, color: 'text-amber-400', activeBg: 'from-amber-500/25 via-orange-500/10 to-transparent border-amber-500' },
    { id: 'deposit', label: 'Add Funds', icon: Wallet, color: 'text-emerald-400', activeBg: 'from-emerald-500/25 via-teal-500/10 to-transparent border-emerald-500' },
  ];

  const operationsNav = [
    { id: 'api', label: isReseller ? 'Developer API' : 'Reseller API & VIP', icon: Terminal, color: 'text-cyan-400', activeBg: 'from-cyan-500/25 via-blue-500/10 to-transparent border-cyan-500' },
    { id: 'history', label: 'Transactions', icon: History, color: 'text-sky-400', activeBg: 'from-sky-500/25 via-indigo-500/10 to-transparent border-sky-500' },
    { id: 'refer', label: 'Refer & Earn', icon: Share2, color: 'text-fuchsia-400', activeBg: 'from-fuchsia-500/25 via-pink-500/10 to-transparent border-fuchsia-500' },
    { id: 'tickets', label: 'Support Desk', icon: LifeBuoy, color: 'text-violet-400', activeBg: 'from-violet-500/25 via-indigo-500/10 to-transparent border-violet-500' },
  ];

  const handleSetTheme = (themeId: any) => {
    updateSiteConfigLocally({ accentTheme: themeId });
    document.documentElement.setAttribute('data-theme', themeId);
  };

  return (
    <aside className="hidden md:flex flex-col w-[264px] bg-[#090b14] border-r border-rose-500/15 h-screen sticky top-0 shrink-0 z-30 select-none shadow-[4px_0_24px_rgba(0,0,0,0.5)]">
      {/* Brand Lockup */}
      <div className="h-16 px-5 border-b border-white/[0.08] flex items-center justify-between">
        <button
          onClick={() => onNavigate('dashboard')}
          className="flex items-center gap-3 text-left focus:outline-none group min-w-0 cursor-pointer"
        >
          <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-gradient-to-tr from-rose-600 via-pink-600 to-amber-500 text-white shadow-md shadow-rose-600/40 border border-white/20 shrink-0 overflow-hidden group-hover:scale-105 transition-transform">
            {siteConfig.logoUrl ? (
              <img
                src={siteConfig.logoUrl}
                alt={siteConfig.siteTitle || 'Brand Logo'}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
            ) : (
              <Flame className="w-4 h-4 fill-white" />
            )}
          </div>
          <div className="min-w-0">
            <div className="font-display font-extrabold text-sm tracking-tight bg-gradient-to-r from-white via-rose-100 to-amber-200 bg-clip-text text-transparent truncate whitespace-nowrap">
              {siteConfig.siteTitle || 'KALAM FF PANEL'}
            </div>
            <div className="text-[10px] font-semibold text-rose-400/80 truncate tracking-wide uppercase">
              VIP License Portal
            </div>
          </div>
        </button>
      </div>

      {/* Navigation Sections */}
      <div className="flex-1 overflow-y-auto px-3.5 py-5 space-y-6">
        {/* Core Workspace */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold text-rose-400/80 uppercase tracking-wider">
            Core Workspace
          </div>
          <nav className="space-y-1">
            {primaryNav.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                    isActive
                      ? `bg-gradient-to-r ${item.activeBg} text-white font-bold border-l-2 shadow-lg shadow-rose-950/40`
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border-transparent font-medium'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? item.color : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Operations & Support */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold text-cyan-400/80 uppercase tracking-wider">
            Operations & Records
          </div>
          <nav className="space-y-1">
            {operationsNav.map(item => {
              const Icon = item.icon;
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onNavigate(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                    isActive
                      ? `bg-gradient-to-r ${item.activeBg} text-white font-bold border-l-2 shadow-lg shadow-cyan-950/40`
                      : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border-transparent font-medium'
                  }`}
                >
                  <Icon className={`w-4 h-4 shrink-0 ${isActive ? item.color : 'text-slate-400'}`} />
                  <span className="truncate">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* System Administration */}
        {isAdmin && (
          <div>
            <div className="px-3 mb-2 text-[10px] font-bold text-amber-400/80 uppercase tracking-wider">
              Administration
            </div>
            <nav className="space-y-1">
              <button
                onClick={() => onNavigate('admin')}
                className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                  currentPage === 'admin'
                    ? 'bg-gradient-to-r from-amber-500/25 via-rose-500/10 to-transparent text-white border-l-2 border-amber-500 font-bold shadow-lg shadow-amber-950/40'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border-transparent font-medium'
                }`}
              >
                <ShieldCheck className="w-4 h-4 shrink-0 text-amber-400" />
                <span className="truncate">Admin Console</span>
              </button>
            </nav>
          </div>
        )}

        {/* Account Settings */}
        <div>
          <div className="px-3 mb-2 text-[10px] font-bold text-violet-400/80 uppercase tracking-wider">
            Preferences
          </div>
          <nav className="space-y-1">
            <button
              onClick={() => onNavigate('profile')}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs transition-all whitespace-nowrap shrink-0 cursor-pointer border ${
                currentPage === 'profile'
                  ? 'bg-gradient-to-r from-violet-500/25 via-pink-500/10 to-transparent text-white border-l-2 border-violet-500 font-bold shadow-lg shadow-violet-950/40'
                  : 'text-slate-400 hover:text-white hover:bg-white/[0.04] border-transparent font-medium'
              }`}
            >
              <User className="w-4 h-4 shrink-0 text-violet-400" />
              <span className="truncate">Account Settings</span>
            </button>

            <button
              onClick={() => promptSignOut()}
              className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-xs font-medium text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-4 h-4 shrink-0 text-rose-400/80" />
              <span>Sign Out</span>
            </button>
          </nav>
        </div>
      </div>

      {/* Theme Picker & Bottom Wallet Card */}
      <div className="p-3.5 border-t border-white/[0.08] bg-[#070910] space-y-3">
        {/* Color Palette Switcher */}
        <div className="flex items-center justify-between px-2">
          <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-medium">
            <Palette className="w-3.5 h-3.5 text-rose-400" />
            <span>Theme Accent:</span>
          </div>
          <div className="flex items-center gap-1.5">
            {THEME_OPTIONS.map(t => (
              <button
                key={t.id}
                type="button"
                onClick={() => handleSetTheme(t.id)}
                title={t.name}
                className={`w-3.5 h-3.5 rounded-full ${t.color} transition-all cursor-pointer ${
                  currentTheme === t.id ? 'ring-2 ring-white scale-125' : 'opacity-60 hover:opacity-100'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Futuristic Glowing Wallet Card */}
        <div className="p-3.5 rounded-xl bg-gradient-to-br from-rose-950/40 via-[#101424] to-indigo-950/40 border border-rose-500/30 space-y-3 shadow-lg shadow-rose-950/30">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-rose-600 to-purple-600 flex items-center justify-center font-display font-bold text-xs text-white shrink-0 shadow-md">
                {user?.username ? user.username.slice(0, 2).toUpperCase() : 'NX'}
              </div>
              <div className="min-w-0">
                <div className="text-xs font-bold text-white truncate">
                  @{user?.username || 'user'}
                </div>
                <div className="text-[10px] text-amber-400 font-semibold truncate">
                  {role} TIER
                </div>
              </div>
            </div>
            <button
              onClick={() => onNavigate('profile')}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors cursor-pointer"
              title="Account Settings"
            >
              <ArrowUpRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="pt-2 border-t border-white/[0.08] flex items-center justify-between">
            <div>
              <div className="text-[10px] text-slate-400 font-medium">Balance</div>
              <div className="text-sm font-mono font-extrabold text-emerald-400 tabular-nums">
                {siteConfig.currencySymbol || '₹'}{balance.toFixed(2)}
              </div>
            </div>
            <button
              onClick={() => onNavigate('deposit')}
              className="px-3 py-1 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-[11px] font-extrabold transition-all cursor-pointer whitespace-nowrap shrink-0 shadow-md shadow-emerald-950/40"
            >
              + Deposit
            </button>
          </div>
        </div>
      </div>
    </aside>
  );
};
