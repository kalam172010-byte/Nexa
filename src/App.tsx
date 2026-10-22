/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext.js';
import { ToastProvider } from './context/ToastContext.js';
import { SiteProvider, useSite } from './context/SiteContext.js';
import { Header } from './components/Header.js';
import { Sidebar } from './components/Sidebar.js';
import { BottomNav } from './components/BottomNav.js';
import { SideDrawer } from './components/SideDrawer.js';
import { ResellerUpgradeModal } from './components/ResellerUpgradeModal.js';
import { PremiumLoadingPage, PremiumLoadingModal } from './components/PremiumLoader.js';
import { MessageSquare, ExternalLink, ShieldCheck } from 'lucide-react';

// Pages
import { DashboardPage } from './pages/DashboardPage.js';
import { DepositPage } from './pages/DepositPage.js';
import { BuyKeysPage } from './pages/BuyKeysPage.js';
import { MyKeysPage } from './pages/MyKeysPage.js';
import { HistoryPage } from './pages/HistoryPage.js';
import { TicketsPage } from './pages/TicketsPage.js';
import { ReferPage } from './pages/ReferPage.js';
import { ProfilePage } from './pages/ProfilePage.js';
import { ResellerApiPage } from './pages/ResellerApiPage.js';
import { AdminPage } from './pages/AdminPage.js';
import { AuthPage } from './pages/AuthPage.js';

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

  const handleUnlock = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    try {
      const ok = await elevateToAdmin(pinInput.trim() || undefined);
      if (!ok) {
        setErrorMsg('Invalid master key or password.');
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
        title="Verifying Admin Credentials..."
        subtitle="Authenticating master privileges and unlocking system control panel."
        badgeText="SECURITY VERIFICATION"
      />
      <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/20 to-amber-500/20 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto shadow-md">
        <ShieldCheck className="w-6 h-6 text-rose-400" />
      </div>

      <div className="space-y-1.5">
        <h3 className="font-display font-bold text-lg text-white">Administrator Access Control</h3>
        <p className="text-xs text-slate-400 leading-relaxed">
          Signed in as <span className="text-white font-mono font-semibold">@{user?.username || 'user'}</span> ({user?.email || 'No Email'})
        </p>
      </div>

      <form onSubmit={handleUnlock} className="space-y-3.5 text-left">
        <div>
          <label className="block text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">
            Admin Master Password / Secret PIN
          </label>
          <input
            type="password"
            value={pinInput}
            onChange={e => setPinInput(e.target.value)}
            placeholder="Enter admin password or key (e.g. admin123)"
            className="w-full px-3.5 py-2.5 rounded-xl bg-[#090a0f] border border-white/10 text-white text-xs placeholder:text-slate-600 focus:outline-none focus:border-rose-500/50 transition-colors font-mono"
          />
        </div>

        {errorMsg && (
          <div className="text-xs text-rose-400 font-medium text-center bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
            {errorMsg}
          </div>
        )}

        <button
          type="submit"
          disabled={isSubmitting}
          className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 hover:from-rose-500 hover:to-amber-500 text-white text-xs font-bold transition-all shadow-md shadow-rose-950/50 flex items-center justify-center gap-2 cursor-pointer"
        >
          <ShieldCheck className="w-4 h-4" />
          <span>{isSubmitting ? 'Unlocking Admin Console...' : 'Unlock Admin Console Now'}</span>
        </button>
      </form>

      <div className="pt-2 border-t border-white/[0.06] flex items-center justify-between text-xs text-slate-400">
        <button
          type="button"
          onClick={() => handleUnlock()}
          className="text-rose-400 hover:text-rose-300 font-medium text-[11px] underline cursor-pointer"
        >
          Auto-Elevate Admin Account
        </button>

        <button
          type="button"
          onClick={() => onNavigate('auth')}
          className="hover:text-white transition-colors text-[11px] cursor-pointer"
        >
          Switch User Account
        </button>
      </div>
    </div>
  );
};

const MainLayout: React.FC = () => {
  const { user, isLoading, role } = useAuth();
  const { siteConfig } = useSite();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState<boolean>(false);

  // Sync document title with current active page and site title
  useEffect(() => {
    const pageName = PAGE_TITLES[currentPage] || 'Dashboard';
    const siteName = siteConfig.siteTitle || 'Nexa Panel';
    document.title = `${pageName} — ${siteName}`;
  }, [currentPage, siteConfig.siteTitle]);

  // Read URL hash or path on initial mount and respond to browser Back/Forward buttons
  useEffect(() => {
    const syncFromUrl = () => {
      const hash = window.location.hash.replace('#', '').trim();
      const path = window.location.pathname.replace(/^\//, '').trim();
      const pageKey = (hash && PAGE_TITLES[hash]) ? hash : (path && PAGE_TITLES[path]) ? path : null;
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
      <AuthPage
        onSuccess={() => {
          setCurrentPage('dashboard');
          window.location.hash = 'dashboard';
        }}
      />
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

  return (
    <div className="min-h-screen w-full max-w-[100vw] overflow-x-hidden bg-[#06070a] text-slate-100 flex flex-col md:flex-row antialiased selection:bg-rose-500/25 selection:text-rose-200">
      {/* Desktop Sidebar */}
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />

      {/* Main Workspace Container */}
      <div className="flex-1 flex flex-col min-w-0 max-w-full overflow-x-hidden">
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
