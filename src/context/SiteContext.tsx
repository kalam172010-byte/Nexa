import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { SiteCustomizationConfig } from '../types/index.js';
import { api } from '../services/api.js';

interface SiteContextType {
  siteConfig: SiteCustomizationConfig;
  isLoading: boolean;
  updateSiteConfigLocally: (config: Partial<SiteCustomizationConfig>) => void;
  reloadSiteConfig: () => Promise<void>;
}

const DEFAULT_SITE_CONFIG: SiteCustomizationConfig = {
  siteTitle: 'Nexa Panel',
  siteTagline: 'Gaming Digital Reseller Platform',
  logoUrl: '',
  faviconUrl: '',
  currencySymbol: '₹',
  currencyCode: 'INR',
  footerText: 'The premier automated digital keys and panels reseller infrastructure.',
  copyrightText: '© 2026 Nexa Gaming Systems. All rights reserved.',
  accentTheme: 'crimson',
  backgroundStyle: 'deep-slate',
  glowIntensity: 'vibrant',
  borderRadius: 'rounded',
  fontStyle: 'ultra-bold',
  isAnnouncementEnabled: true,
  announcementText: '🔥 OB55 UPDATE ACTIVE! Automated Instant Digital Key Delivery 24/7 with Live Reseller API',
  announcementType: 'promo',
  announcementLink: '',
  isMarqueeEnabled: true,
  marqueeText: '⚡ Fast UPI Auto Deposit | Instant Digital Key Delivery | Non-Root & iOS Supported | 100% Anti-Ban Menus | 24/7 Live Support',
  heroTitle: 'DOMINATE THE GAME WITH PRO DIGITAL PANELS',
  heroSubtitle: 'Instant Key Delivery · Automated Wallet Deposits · Wholesale VIP Pricing for Resellers',
  heroBadgeText: 'OFFICIAL GAMING RESELLER PLATFORM',
  telegramChannelUrl: 'https://t.me/nexa_gaming_official',
  telegramSupportUser: '@nexa_support_admin',
  whatsappNumber: '+918056317218',
  youtubeChannelUrl: '',
  discordInviteUrl: '',
  contactEmail: 'support@nexapanel.com',
  quickSupportWidgetEnabled: true,
  minDepositAmount: 1,
  resellerUpgradePrice: 299,
  referralCommissionPct: 5,
  accountSafetyBalanceText: 'Keep ₹500+ balance for account safety.',
  adminPanelTitle: 'NEXA SYSTEM CONTROL PANEL',
  adminHeaderNotice: 'SUPER ADMIN LIVE REALTIME SESSION ACTIVE',
  adminAccentColor: '#e11d48',
  adminStatusBadge: 'SUPER PRIVILEGES',
  adminThemePreset: 'crimson-admin',
  adminShortcutsEnabled: true,
};

const SiteContext = createContext<SiteContextType | undefined>(undefined);

export const SiteProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [siteConfig, setSiteConfig] = useState<SiteCustomizationConfig>(DEFAULT_SITE_CONFIG);
  const [isLoading, setIsLoading] = useState(true);

  const reloadSiteConfig = async () => {
    try {
      const res = await api.getPublicSiteSettings();
      if (res?.config) {
        setSiteConfig(prev => ({ ...prev, ...res.config }));
      }
    } catch (err) {
      console.warn('Could not load remote site settings, using defaults');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    reloadSiteConfig();
    const interval = setInterval(() => {
      reloadSiteConfig();
    }, 3000);
    return () => clearInterval(interval);
  }, []);

  // Sync site title, favicon & theme variables on DOM
  useEffect(() => {
    if (siteConfig.siteTitle) {
      document.title = `${siteConfig.siteTitle} - ${siteConfig.siteTagline || 'Gaming Digital Reseller Platform'}`;
    }

    if (siteConfig.faviconUrl) {
      let link: HTMLLinkElement | null = document.querySelector("link[rel*='icon']");
      if (!link) {
        link = document.createElement('link');
        link.rel = 'shortcut icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = siteConfig.faviconUrl;
    }

    const root = document.documentElement;

    // Apply Theme Attributes
    root.setAttribute('data-theme', siteConfig.accentTheme || 'crimson');
    root.setAttribute('data-bg', siteConfig.backgroundStyle || 'deep-slate');
    root.setAttribute('data-glow', siteConfig.glowIntensity || 'vibrant');
    root.setAttribute('data-radius', siteConfig.borderRadius || 'rounded');
    root.setAttribute('data-admin-theme', siteConfig.adminThemePreset || 'crimson-admin');
  }, [siteConfig]);

  const updateSiteConfigLocally = (config: Partial<SiteCustomizationConfig>) => {
    setSiteConfig(prev => ({ ...prev, ...config }));
  };

  return (
    <SiteContext.Provider
      value={{
        siteConfig,
        isLoading,
        updateSiteConfigLocally,
        reloadSiteConfig,
      }}
    >
      {children}
    </SiteContext.Provider>
  );
};

export const useSite = (): SiteContextType => {
  const context = useContext(SiteContext);
  if (!context) {
    throw new Error('useSite must be used within a SiteProvider');
  }
  return context;
};
