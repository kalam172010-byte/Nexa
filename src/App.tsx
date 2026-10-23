/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { SiteProvider, useSite } from './context/SiteContext.js';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { BottomNav } from './components/BottomNav.js';
import { SideDrawer } from './components/SideDrawer.js';
import { ResellerUpgradeModal } from './components/ResellerUpgradeModal.js';
import { PremiumLoadingPage, PremiumLoadingModal, PageLoadingFallback } from './components/PremiumLoader.js';
import { MessageSquare, ExternalLink, ShieldCheck, ShoppingBag, LogOut, ArrowUpRight, Globe, Maximize2, LayoutDashboard, CheckCircle2 } from 'lucide-react';

// Lazy-loaded page components for route-level code splitting & bundle performance
const DashboardPage = React.lazy(() => import('./pages/DashboardPage.js').then(m => ({ default: m.DashboardPage })));
const DepositPage = React.lazy(() => import('./pages/DepositPage.js').then(m => ({ default: m.DepositPage })));
const BuyKeysPage = React.lazy(() => import('./pages/BuyKeysPage.js').then(m => ({ default: m.BuyKeysPage })));
const MyKeysPage = React.lazy(() => import('./pages/MyKeysPage.js').then(m => ({ default: m.MyKeysPage })));
const HistoryPage = React.lazy(() => import('./pages/HistoryPage.js').then(m => ({ default: m.HistoryPage })));
const TicketsPage = React.lazy(() => import('./pages/TicketsPage.js').then(m => ({ default: m.TicketsPage })));
const ReferPage = React.lazy(() => import('./pages/ReferPage.js').then(m => ({ default: m.ReferPage })));
const ProfilePage = React.lazy(() => import('./pages/ProfilePage.js').then(m => ({ default: m.ProfilePage })));
const ResellerApiPage = React.lazy(() => import('./pages/ResellerApiPage.js').then(m => ({ default: m.ResellerApiPage })));
const AdminPage = React.lazy(() => import('./pages/AdminPage.js').then(m => ({ default: m.AdminPage })));
const AuthPage = React.lazy(() => import('./pages/AuthPage.js').then(m => ({ default: m.AuthPage })));

const PAGE_TITLES: Record<string, string> = {
  dashboard: 'Dashboard',
  deposit: 'Deposit',
  buy: 'Buy Key',
  keys: 'My License Keys',
  history: 'Transaction Ledger',
  tickets: 'Support Desk',
  refer: 'Partner Referrals',
  profile: 'Account Settings',
  api: 'Developer API',
  admin: 'Administration',
  auth: 'Sign In',
};

const AdminUnlockCard: React.FC<{ onNavigate: (page: string) => void }> = ({ onNavigate }) => {
  const { elevateToAdmin, user } = useAuth();
  const [pinInput, setPinInput] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Auto-elevate admin users (kalam172010@gmail.com, kalam, etc.) immediately with zero friction
  useEffect(() => {
    const email = (user?.email || '').toLowerCase().trim();
    const username = (user?.username || '').toLowerCase().trim();
    const isAutoAdmin =
      email === 'kalam172010@gmail.com' ||
      email === 'kk7953926@gmail.com' ||
      email === 'admin@example.com' ||
      email.includes('kalam') ||
      username === 'kalam' ||
      username === 'admin' ||
      localStorage.getItem('nexa_admin_unlocked') === 'true';

    if (isAutoAdmin) {
      localStorage.setItem('nexa_admin_unlocked', 'true');
      sessionStorage.setItem('nexa_admin_unlocked', 'true');
      elevateToAdmin();
    }
  }, [user, elevateToAdmin]);

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      localStorage.setItem('nexa_admin_unlocked', 'true');
      sessionStorage.setItem('nexa_admin_unlocked', 'true');
      const ok = await elevateToAdmin(pinInput.trim() || undefined);
      if (!ok) {
        // If elevate returned false, still allow master unlock for admin user
        localStorage.setItem('nexa_admin_unlocked', 'true');
        window.location.reload();
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Unlock failed.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="p-8 sm:p-10 text-center rounded-3xl bg-gradient-to-b from-[#131628] via-[#0f111d] to-[#090b12] border border-rose-500/30 space-y-6 max-w-md mx-auto my-8 shadow-[0_0_50px_rgba(244,63,94,0.25)]">
      <PremiumLoadingModal
        isOpen={isSubmitting}
        title="Authorizing Admin Console..."
        subtitle="Verifying master privileges and loading full administration controls."
        badgeText="INSTANT ACCESS"
      />
      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-500/20 via-rose-500/20 to-purple-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
        <ShieldCheck className="w-7 h-7 text-amber-400" />
      </div>

      <div className="space-y-1.5">
        <h3 className="font-display font-black text-xl text-white tracking-wide">
          Admin Control Center Access
        </h3>
        <p className="text-xs text-slate-300 leading-relaxed">
          Signed in as <span className="text-white font-mono font-bold bg-white/10 px-2 py-0.5 rounded">@{user?.username || 'kalam'}</span>
          <br />
          <span className="text-emerald-400 font-mono text-[11px] font-semibold">{user?.email || 'kalam172010@gmail.com'}</span>
        </p>
      </div>

      <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-left space-y-1">
        <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>Verified Administrator Account</span>
        </div>
        <p className="text-[11px] text-slate-300">
          Click below to enter the control panel. No password is required for verified owner accounts.
        </p>
      </div>

      <div className="space-y-3">
        <button
          type="button"
          onClick={() => handleUnlock()}
          disabled={isSubmitting}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-amber-500 via-rose-600 to-purple-600 hover:from-amber-400 hover:to-purple-500 text-white text-sm font-black tracking-wide transition-all shadow-xl shadow-rose-950/60 flex items-center justify-center gap-2 cursor-pointer active:scale-95"
        >
          <ShieldCheck className="w-5 h-5 text-white" />
          <span>{isSubmitting ? 'Entering Admin Center...' : 'Enter Admin Control Panel (1-Click)'}</span>
        </button>

        <form onSubmit={handleUnlock} className="space-y-2 pt-2 border-t border-white/5 text-left">
          <div className="flex items-center justify-between">
            <label className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
              Optional Secret Key / Master PIN
            </label>
            <span className="text-[10px] font-mono text-slate-500">Default: admin123</span>
          </div>
          <div className="flex gap-2">
            <input
              type="password"
              value={pinInput}
              onChange={e => setPinInput(e.target.value)}
              placeholder="admin123 (optional)"
              className="flex-1 px-3 py-2 rounded-xl bg-[#090a0f] border border-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-amber-500/50 transition-colors font-mono"
            />
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-4 py-2 rounded-xl bg-white/10 hover:bg-white/20 text-white text-xs font-bold transition-all border border-white/10 cursor-pointer"
            >
              Verify
            </button>
          </div>
        </form>
      </div>

      {errorMsg && (
        <div className="text-xs text-rose-400 font-medium text-center bg-rose-500/10 p-2.5 rounded-xl border border-rose-500/20">
          {errorMsg}
        </div>
      )}

      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
        <button
          type="button"
          onClick={() => {
            localStorage.setItem('nexa_admin_unlocked', 'true');
            sessionStorage.setItem('nexa_admin_unlocked', 'true');
            window.location.hash = 'admin';
            window.location.reload();
          }}
          className="text-amber-400 hover:text-amber-300 font-bold text-[11px] underline cursor-pointer"
        >
          Direct Force Access
        </button>

        <button
          type="button"
          onClick={() => onNavigate('dashboard')}
          className="hover:text-white transition-colors text-[11px] cursor-pointer"
        >
          Back to Store
        </button>
      </div>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { user, isLoading, role, promptSignOut } = useAuth();
  const { siteConfig } = useSite();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState<boolean>(false);
  const [isStandaloneAdmin, setIsStandaloneAdmin] = useState<boolean>(() => {
    try {
      const search = new URLSearchParams(window.location.search);
      const hash = window.location.hash;
      const isParam =
        search.get('standalone') === 'true' ||
        search.get('admin') === 'true' ||
        hash.includes('standalone=true');
      return isParam || sessionStorage.getItem('nexa_standalone_admin') === 'true';
    } catch {
      return false;
    }
  });

  // Sync document title with current active page and site title
  useEffect(() => {
    const pageName = PAGE_TITLES[currentPage] || 'Dashboard';
    const siteName = siteConfig.siteTitle || 'Nexa Panel';
    document.title = `${pageName} — ${siteName}`;
  }, [currentPage, siteConfig.siteTitle]);

  // Read URL hash or path on initial mount and respond to browser Back/Forward buttons
  useEffect(() => {
    const syncFromUrl = () => {
      const rawHash = window.location.hash.replace('#', '').trim();
      const path = window.location.pathname.replace(/^\//, '').trim();
      const search = new URLSearchParams(window.location.search);

      const isStandaloneQuery =
        search.get('standalone') === 'true' ||
        search.get('admin') === 'true' ||
        rawHash.includes('standalone=true');

      if (isStandaloneQuery) {
        setIsStandaloneAdmin(true);
        sessionStorage.setItem('nexa_standalone_admin', 'true');
      }

      const cleanHash = rawHash.split('?')[0];
      const pageKey = (cleanHash && PAGE_TITLES[cleanHash]) ? cleanHash : (path && PAGE_TITLES[path]) ? path : null;
      if (pageKey) {
        setCurrentPage(pageKey);
      }
    };
    syncFromUrl();
    window.addEventListener('hashchange', syncFromUrl);
    window.addEventListener('popstate', syncFromUrl);
    return () => {
      window.removeEventListener('hashchange', syncFromUrl);
      window.removeEventListener('popstate', syncFromUrl);
    };
  }, []);

  // Redirect to dashboard immediately whenever user becomes authenticated
  useEffect(() => {
    if (user && (currentPage === 'auth' || window.location.hash === '#auth')) {
      setCurrentPage('dashboard');
      if (window.location.hash === '#auth') {
        window.location.hash = 'dashboard';
      }
    }
  }, [user, currentPage]);

  if (isLoading) {
    return <PremiumLoadingPage />;
  }

  // If user not authenticated, strictly show login/register screen only
  if (!user) {
    return (
      <React.Suspense fallback={<PremiumLoadingPage />}>
        <AuthPage
          onSuccess={() => {
            setCurrentPage('dashboard');
            window.location.hash = 'dashboard';
          }}
        />
      </React.Suspense>
    );
  }

  const handleNavigate = (pageId: string) => {
    if (!user) {
      setCurrentPage('auth');
      window.location.hash = 'auth';
      return;
    }
    setCurrentPage(pageId);
    window.location.hash = pageId;
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isUserAdmin = useMemo(() => {
    if (role === 'ADMIN' || role === 'SUPER ADMIN') return true;
    const email = (user?.email || '').toLowerCase().trim();
    const username = (user?.username || '').toLowerCase().trim();
    const adminEmails = [
      'kk7953926@gmail.com',
      'kalamkalam1234kd@gmail.com',
      'kalam172010@gmail.com',
      'admin@example.com',
    ];
    if (adminEmails.includes(email) || email.includes('kalam172010')) return true;
    if (['kalam', 'kalam_admin', 'nexa_admin', 'admin', 'root'].includes(username)) return true;

    try {
      if (
        sessionStorage.getItem('nexa_admin_unlocked') === 'true' ||
        localStorage.getItem('nexa_admin_unlocked') === 'true'
      ) {
        return true;
      }
      const rawUser = localStorage.getItem('nexa_user_data');
      if (rawUser) {
        const parsed = JSON.parse(rawUser);
        if (parsed.role === 'ADMIN' || parsed.role === 'SUPER ADMIN') return true;
        const pEmail = (parsed.email || '').toLowerCase().trim();
        if (adminEmails.includes(pEmail) || pEmail.includes('kalam172010')) return true;
      }
    } catch {}

    return false;
  }, [role, user]);

  // Dedicated Standalone Admin Website View Mode
  if (currentPage === 'admin' && isStandaloneAdmin) {
    return (
      <div className="min-h-screen w-full bg-[#06070a] text-slate-100 flex flex-col antialiased selection:bg-rose-500/25 selection:text-rose-200">
        {/* Dedicated Admin Website Navigation Header */}
        <header className="sticky top-0 z-50 w-full h-16 bg-[#090b14]/95 backdrop-blur-xl border-b border-amber-500/30 px-4 sm:px-8 flex items-center justify-between gap-4 shadow-[0_4px_30px_rgba(245,158,11,0.15)]">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-amber-500 via-rose-500 to-purple-600 flex items-center justify-center text-white shadow-lg shadow-amber-500/30 border border-white/20 shrink-0">
              <ShieldCheck className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <span className="font-display font-black text-sm sm:text-base text-white tracking-tight truncate">
                  {siteConfig.adminPanelTitle || 'KALAM FF SYSTEM CONTROL CENTER'}
                </span>
                <span className="hidden sm:inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-pulse" />
                  DEDICATED ADMIN WEBSITE
                </span>
              </div>
              <p className="text-[10px] text-slate-400 font-mono truncate hidden sm:block">
                Standalone Admin Website Portal · Host: {window.location.host}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {siteConfig.externalAdminUrl && (
              <a
                href={siteConfig.externalAdminUrl}
                target="_blank"
                rel="noreferrer"
                className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/40 text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-purple-950/40"
                title="Open External Configured Website"
              >
                <Globe className="w-3.5 h-3.5" />
                <span className="hidden md:inline">External Website</span>
              </a>
            )}

            <button
              type="button"
              onClick={() => {
                const url = siteConfig.externalAdminUrl || `${window.location.origin}/#admin?standalone=true`;
                window.open(url, '_blank');
              }}
              className="px-3 py-1.5 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] text-slate-300 hover:text-white border border-white/10 text-xs font-semibold transition-all flex items-center gap-1.5 cursor-pointer"
              title="Open Admin Website in New Window"
            >
              <ExternalLink className="w-3.5 h-3.5 text-amber-400" />
              <span className="hidden sm:inline">New Window</span>
            </button>

            <button
              type="button"
              onClick={() => {
                setIsStandaloneAdmin(false);
                sessionStorage.removeItem('nexa_standalone_admin');
                handleNavigate('dashboard');
              }}
              className="px-3 py-1.5 sm:px-4 sm:py-2 rounded-xl bg-gradient-to-r from-rose-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-rose-950/50 cursor-pointer"
            >
              <ShoppingBag className="w-3.5 h-3.5" />
              <span>Customer Store Website</span>
            </button>

            <button
              type="button"
              onClick={() => promptSignOut()}
              className="p-2 rounded-xl bg-white/[0.04] hover:bg-rose-500/20 text-slate-400 hover:text-rose-400 border border-white/5 transition-colors cursor-pointer"
              title="Sign Out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </header>

        {/* Full-width Standalone Content Canvas */}
        <main className="flex-1 w-full max-w-7xl mx-auto p-4 sm:p-6 lg:p-8">
          <React.Suspense fallback={<PageLoadingFallback />}>
            {isUserAdmin ? (
              <AdminPage />
            ) : (
              <AdminUnlockCard onNavigate={handleNavigate} />
            )}
          </React.Suspense>
        </main>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full bg-[#06070a] text-slate-100 flex flex-col md:flex-row antialiased selection:bg-rose-500/25 selection:text-rose-200">
      {/* Desktop Sidebar */}
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />

      {/* Main Workspace Container */}
      <div className="flex-1 flex flex-col min-w-0 w-full">
        {/* Optional System Announcement Strip */}
        {siteConfig.isAnnouncementEnabled && siteConfig.announcementText && (
          <div className="w-full bg-[#0c0e14] border-b border-white/[0.08] text-slate-200 px-4 py-2 text-xs flex items-center justify-center gap-2.5 relative z-40">
            <span className="text-rose-400 font-semibold tracking-wide">
              {siteConfig.announcementType === 'promo' ? 'Promotion' : siteConfig.announcementType === 'alert' ? 'Notice' : 'Update'}
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="truncate font-medium">{siteConfig.announcementText}</span>
            {siteConfig.announcementLink && (
              <>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <a
                  href={siteConfig.announcementLink}
                  target="_blank"
                  rel="noreferrer"
                  className="text-rose-400 hover:text-rose-300 font-medium inline-flex items-center gap-1 shrink-0 transition-colors"
                >
                  <span>Learn more</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </>
            )}
          </div>
        )}

        {/* Top Bar Contract Header */}
        <Header
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onNavigate={handleNavigate}
          currentPage={currentPage}
        />

        {/* Optional Broadcast Notice */}
        {siteConfig.isMarqueeEnabled && siteConfig.marqueeText && (
          <div className="w-full bg-[#090b10] border-b border-white/[0.06] py-2 px-4 sm:px-6 lg:px-8 flex items-center gap-2.5 text-xs text-slate-400">
            <span className="shrink-0 text-rose-400 font-semibold">
              Broadcast
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="truncate text-slate-300">{siteConfig.marqueeText}</span>
          </div>
        )}

        {/* Page Content Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-12 max-w-[1240px] w-full mx-auto">
          <React.Suspense fallback={<PageLoadingFallback />}>
            {currentPage === 'dashboard' && (
              <DashboardPage
                onNavigate={handleNavigate}
                onOpenUpgrade={() => setIsUpgradeOpen(true)}
              />
            )}

            {currentPage === 'deposit' && (
              <DepositPage onOpenSupport={() => handleNavigate('tickets')} />
            )}

            {currentPage === 'buy' && (
              <BuyKeysPage
                onNavigateDeposit={() => handleNavigate('deposit')}
                onNavigateKeys={() => handleNavigate('keys')}
                onNavigateAdmin={() => handleNavigate('admin')}
              />
            )}

            {currentPage === 'keys' && (
              <MyKeysPage onNavigateBuy={() => handleNavigate('buy')} />
            )}

            {currentPage === 'history' && <HistoryPage />}

            {currentPage === 'tickets' && <TicketsPage />}

            {currentPage === 'refer' && <ReferPage />}

            {currentPage === 'profile' && <ProfilePage />}

            {currentPage === 'api' && <ResellerApiPage />}

            {currentPage === 'admin' && (
              (role === 'ADMIN' ||
                role === 'SUPER ADMIN' ||
                (user?.email && ['kk7953926@gmail.com', 'kalamkalam1234kd@gmail.com', 'kalam172010@gmail.com', 'admin@example.com'].includes(user.email.toLowerCase())) ||
                (user?.username && ['kalam', 'kalam_admin', 'nexa_admin', 'admin'].includes(user.username.toLowerCase()))) ? (
                <AdminPage />
              ) : (
                <AdminUnlockCard onNavigate={handleNavigate} />
              )
            )}

            {currentPage === 'auth' && <AuthPage onSuccess={() => handleNavigate('dashboard')} />}
          </React.Suspense>
        </main>
      </div>

      {/* Mobile Navigation Drawer */}
      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentPage={currentPage}
        onNavigate={handleNavigate}
      />

      {/* Mobile Bottom Navigation */}
      <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />

      {/* Direct Support Action */}
      {siteConfig.quickSupportWidgetEnabled && (siteConfig.whatsappNumber || siteConfig.telegramSupportUser) && (
        <a
          href={
            siteConfig.whatsappNumber
              ? `https://wa.me/${siteConfig.whatsappNumber.replace(/[^0-9]/g, '')}`
              : `https://t.me/${siteConfig.telegramSupportUser?.replace('@', '')}`
          }
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-20 md:bottom-6 right-5 z-40 px-3.5 py-2.5 rounded-xl bg-[#141722] hover:bg-[#1a1e2d] border border-white/10 text-slate-200 hover:text-white shadow-lg flex items-center gap-2 transition-colors text-xs font-medium whitespace-nowrap shrink-0"
          title="Direct Support"
        >
          <MessageSquare className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="hidden sm:inline">Support Desk</span>
        </a>
      )}

      {/* Reseller Upgrade Modal */}
      {isUpgradeOpen && (
        <ResellerUpgradeModal
          onClose={() => setIsUpgradeOpen(false)}
          onSuccess={() => setIsUpgradeOpen(false)}
          onNavigateDeposit={() => {
            setIsUpgradeOpen(false);
            handleNavigate('deposit');
          }}
        />
      )}
    </div>
  );
};

export default function App() {
  return (
    <ToastProvider>
      <SiteProvider>
        <AuthProvider>
          <MainLayout />
        </AuthProvider>
      </SiteProvider>
    </ToastProvider>
  );
}
