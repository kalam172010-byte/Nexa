import React from 'react';

interface PremiumLoadingModalProps {
  isOpen: boolean;
  title?: string;
  subtitle?: string;
  badgeText?: string;
}

export const PremiumLoadingModal: React.FC<PremiumLoadingModalProps> = ({
  isOpen,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[200] flex items-center justify-center bg-[#06070d]/80 backdrop-blur-md p-4 select-none">
      <div className="flex flex-col items-center justify-center gap-3.5">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-[3px] border-white/10 border-t-rose-500 animate-spin" />
        </div>
        <span className="font-display font-black text-xs tracking-[0.24em] text-white uppercase">
          FF PANEL
        </span>
      </div>
    </div>
  );
};

interface PremiumLoadingPageProps {
  message?: string;
  siteTitle?: string;
  logoUrl?: string;
  subtitle?: string;
}

export const PremiumLoadingPage: React.FC<PremiumLoadingPageProps> = () => {
  return (
    <div className="min-h-screen w-full bg-[#06070d] flex flex-col items-center justify-center p-4 select-none overflow-hidden">
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div className="w-12 h-12 rounded-full border-[3px] border-white/10 border-t-rose-500 animate-spin" />
        </div>
        <span className="font-display font-black text-xs sm:text-sm tracking-[0.26em] text-white uppercase">
          FF PANEL
        </span>
      </div>
    </div>
  );
};
