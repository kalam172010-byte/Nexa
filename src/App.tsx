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
import { Megaphone, MessageSquare, ExternalLink, Sparkles, ChevronRight, LayoutDashboard } from 'lucide-react';

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
  deposit: 'Add Funds & Wallet',
  buy: 'Buy Free Fire Keys',
  keys: 'My License Keys',
  history: 'Order History',
  tickets: 'Support Tickets',
  refer: 'Refer & Earn',
  profile: 'My Account & Profile',
  api: 'Reseller API Documentation',
  admin: 'Admin Control Panel',
  auth: 'Login & Register',
};

const MainLayout: React.FC = () => {
  const { user, isLoading, role } = useAuth();
  const { siteConfig } = useSite();
  const [currentPage, setCurrentPage] = useState<string>('dashboard');
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);
  const [isUpgradeOpen, setIsUpgradeOpen] = useState<boolean>(false);

  // Sync document title with current active page and site title (e.g. Dashboard • KALAM FF PANEL)
  useEffect(() => {
    const pageName = PAGE_TITLES[currentPage] || 'Dashboard';
    const siteName = siteConfig.siteTitle || 'KALAM FF PANEL';
    document.title = `${pageName} • ${siteName}`;
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
      <div className="min-h-screen bg-[#070709] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-rose-500/20 to-red-600/30 border border-rose-500/40 text-rose-400 flex items-center justify-center font-display font-black text-xl animate-pulse shadow-[0_0_25px_rgba(244,63,94,0.4)]">
          {siteConfig.siteTitle ? siteConfig.siteTitle.slice(0, 2).toUpperCase() : 'KF'}
        </div>
        <div className="font-mono text-xs text-slate-400 tracking-widest uppercase animate-pulse">
          INITIALIZING {siteConfig.siteTitle.toUpperCase()}...
        </div>
      </div>
    );
  }

  // If user not authenticated, strictly show login/register screen only
  if (!user) {
    return <AuthPage onSuccess={() => setCurrentPage('dashboard')} />;
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
    <div className="min-h-screen bg-[#070709] text-slate-100 flex flex-col md:flex-row antialiased selection:bg-rose-500/30 selection:text-rose-200">
      {/* Desktop Sidebar (replaces bottom nav on desktop screens) */}
      <Sidebar currentPage={currentPage} onNavigate={handleNavigate} />

      {/* Main App Container */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Customizable Announcement Bar */}
        {siteConfig.isAnnouncementEnabled && siteConfig.announcementText && (
          <div className="w-full bg-gradient-to-r from-rose-600/90 via-red-600/90 to-amber-600/90 text-white px-3 py-1.5 text-xs font-bold flex items-center justify-center gap-2 shadow-md relative z-40">
            <span className="px-1.5 py-0.5 rounded bg-black/40 text-[9px] font-mono font-black uppercase tracking-wider">
              {siteConfig.announcementType === 'promo' ? '🔥 PROMO' : siteConfig.announcementType === 'alert' ? '⚠️ NOTICE' : '🚀 UPDATE'}
            </span>
            <span className="truncate">{siteConfig.announcementText}</span>
            {siteConfig.announcementLink && (
              <a
                href={siteConfig.announcementLink}
                target="_blank"
                rel="noreferrer"
                className="underline text-[11px] font-mono flex items-center gap-0.5 hover:text-white/80 shrink-0"
              >
                <span>Details</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        )}

        {/* Mobile & Tablet Sticky Header */}
        <Header
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onNavigate={handleNavigate}
          currentPage={currentPage}
        />

        {/* Live News Smooth Ticker */}
        {siteConfig.isMarqueeEnabled && siteConfig.marqueeText && (
          <div className="w-full bg-[#0d0d14] border-b border-white/5 py-1.5 px-3 overflow-hidden flex items-center gap-2.5 text-[11px] font-mono font-bold text-slate-300 select-none">
            <span className="shrink-0 text-rose-400 font-extrabold flex items-center gap-1 uppercase text-[10px] bg-rose-500/10 border border-rose-500/20 px-2 py-0.5 rounded-md">
              <Sparkles className="w-3 h-3 text-rose-400" />
              <span>LIVE</span>
            </span>
            <div className="overflow-hidden whitespace-nowrap flex-1">
              <div className="animate-smooth-ticker flex gap-8 items-center cursor-default">
                <span>{siteConfig.marqueeText}</span>
                <span className="text-rose-500 font-black">·</span>
                <span>{siteConfig.marqueeText}</span>
                <span className="text-rose-500 font-black">·</span>
              </div>
            </div>
          </div>
        )}

        {/* Interactive Breadcrumb & Active Page Bar */}
        <div className="w-full bg-[#08080d]/85 border-b border-white/5 px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between text-xs backdrop-blur-md">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-0.5">
            <button
              onClick={() => handleNavigate('dashboard')}
              className="text-slate-400 hover:text-rose-400 transition-colors flex items-center gap-1.5 font-mono text-[11px] shrink-0 group"
              title="Return to Dashboard"
            >
              <LayoutDashboard className="w-3.5 h-3.5 text-rose-500 group-hover:scale-110 transition-transform" />
              <span>{siteConfig.siteTitle || 'KALAM FF PANEL'}</span>
            </button>
            <ChevronRight className="w-3 h-3 text-slate-600 shrink-0" />
            <div className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-md bg-rose-500/15 border border-rose-500/30 text-rose-300 font-display font-bold uppercase tracking-wider text-[11px] shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>{PAGE_TITLES[currentPage] || currentPage.toUpperCase()}</span>
            </div>
          </div>
          <div className="hidden sm:flex items-center gap-2 text-[11px] font-mono text-slate-400 shrink-0">
            <span className="text-slate-400">ACTIVE:</span>
            <span className="text-rose-300 font-bold bg-white/[0.04] border border-white/10 px-2 py-0.5 rounded text-[10px] uppercase tracking-wider">
              #{currentPage}
            </span>
          </div>
        </div>

        {/* Page Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 pb-24 md:pb-8 max-w-7xl w-full mx-auto">
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
              <div className="p-12 text-center rounded-3xl bg-[#0d0d14] border border-white/5 space-y-4 max-w-md mx-auto">
                <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
                  {siteConfig.siteTitle ? siteConfig.siteTitle.slice(0, 2).toUpperCase() : 'NX'}
                </div>
                <h3 className="font-display font-bold text-base text-white">ADMIN PERMISSION REQUIRED</h3>
                <p className="text-xs text-slate-400">
                  You must be authenticated with an Administrator account to access the control panel.
                </p>
                <button
                  onClick={() => handleNavigate('auth')}
                  className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase transition-colors"
                >
                  Sign In with Admin Account
                </button>
              </div>
            )
          )}

          {currentPage === 'auth' && <AuthPage onSuccess={() => handleNavigate('dashboard')} />}
        </main>
      </div>

      {/* Mobile Animated Left Drawer */}
      <SideDrawer
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        currentPage={currentPage}
        onNavigate={handleNavigate}
      />

      {/* Mobile Fixed Bottom Navigation Bar */}
      <BottomNav currentPage={currentPage} onNavigate={handleNavigate} />

      {/* Floating WhatsApp / Telegram Quick Support Widget */}
      {siteConfig.quickSupportWidgetEnabled && (siteConfig.whatsappNumber || siteConfig.telegramSupportUser) && (
        <a
          href={
            siteConfig.whatsappNumber
              ? `https://wa.me/${siteConfig.whatsappNumber.replace(/[^0-9]/g, '')}`
              : `https://t.me/${siteConfig.telegramSupportUser?.replace('@', '')}`
          }
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-20 md:bottom-6 right-5 z-40 p-3.5 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-white shadow-2xl shadow-emerald-950/80 flex items-center justify-center transition-all hover:scale-110 active:scale-95 group"
          title="Direct WhatsApp Support"
        >
          <MessageSquare className="w-5 h-5 group-hover:animate-bounce" />
          <span className="max-w-0 overflow-hidden whitespace-nowrap group-hover:max-w-xs transition-all duration-300 ease-in-out text-xs font-bold pl-0 group-hover:pl-2">
            24/7 Live Support
          </span>
        </a>
      )}

      {/* Promotional Reseller Upgrade Modal */}
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
