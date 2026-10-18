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

  // Read URL hash on initial mount and respond to browser Back/Forward buttons
  useEffect(() => {
    const syncFromHash = () => {
      const hash = window.location.hash.replace('#', '').trim();
      if (hash && PAGE_TITLES[hash]) {
        setCurrentPage(hash);
      }
    };
    syncFromHash();
    window.addEventListener('hashchange', syncFromHash);
    return () => window.removeEventListener('hashchange', syncFromHash);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#090a0f] flex flex-col items-center justify-center space-y-3">
        <div className="w-10 h-10 rounded-xl bg-[#10121a] border border-white/10 text-rose-500 flex items-center justify-center font-display font-bold text-base">
          {siteConfig.siteTitle ? siteConfig.siteTitle.slice(0, 2).toUpperCase() : 'NX'}
        </div>
        <div className="text-xs text-slate-400 font-medium tracking-wide">
          Loading workspace...
        </div>
      </div>
    );
  }

  // If user not authenticated, strictly show login/register screen only
  if (!user) {
    return (
      <AuthPage
        onSuccess={() => {
          console.log('[MainLayout] AuthPage onSuccess callback invoked. Setting active page to dashboard...');
          setCurrentPage('dashboard');
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
    <div className="min-h-screen bg-[#090a0f] text-slate-100 flex flex-col md:flex-row antialiased selection:bg-rose-500/25 selection:text-rose-200">
      {/* Desktop Sidebar */}
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />

      {/* Main Workspace Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Optional System Announcement Strip */}
        {siteConfig.isAnnouncementEnabled && siteConfig.announcementText && (
          <div className="w-full bg-[#12141f] border-b border-white/[0.06] text-slate-200 px-4 py-2 text-xs flex items-center justify-center gap-2.5 relative z-40">
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
          <div className="w-full bg-[#0c0e16] border-b border-white/[0.05] py-2 px-4 sm:px-6 lg:px-8 flex items-center gap-2.5 text-xs text-slate-400">
            <span className="shrink-0 text-slate-300 font-semibold">
              Broadcast
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="truncate text-slate-300">{siteConfig.marqueeText}</span>
          </div>
        )}

        {/* Page Content Viewport */}
        <main className="flex-1 px-4 sm:px-6 lg:px-8 py-6 sm:py-8 pb-24 md:pb-10 max-w-[1200px] w-full mx-auto">
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
            role === 'ADMIN' || role === 'SUPER ADMIN' ? (
              <AdminPage />
            ) : (
              <div className="p-8 sm:p-10 text-center rounded-2xl bg-[#10121a] border border-white/[0.06] space-y-4 max-w-md mx-auto my-8">
                <div className="w-11 h-11 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <div className="space-y-1">
                  <h3 className="font-display font-bold text-base text-white">Administrator Access Required</h3>
                  <p className="text-xs text-slate-400 leading-relaxed">
                    You must be signed in with an authorized administrator account to view system controls.
                  </p>
                </div>
                <button
                  onClick={() => handleNavigate('auth')}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold transition-colors whitespace-nowrap shrink-0"
                >
                  Switch Account
                </button>
              </div>
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
