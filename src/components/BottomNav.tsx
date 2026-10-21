import React from 'react';
import { Home, Wallet, ShoppingBag, KeyRound, Terminal, History } from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';

interface BottomNavProps {
  currentPage: string;
  onNavigate: (page: string) => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({ currentPage, onNavigate }) => {
  const { role } = useAuth();
  const isReseller = role === 'RESELLER' || role === 'ADMIN' || role === 'SUPER ADMIN';

  const navItems = [
    { id: 'dashboard', label: 'Overview', icon: Home },
    { id: 'buy', label: 'Catalog', icon: ShoppingBag },
    { id: 'keys', label: 'My Keys', icon: KeyRound },
    { id: 'deposit', label: 'Deposit', icon: Wallet },
    isReseller
      ? { id: 'api', label: 'API', icon: Terminal }
      : { id: 'history', label: 'Ledger', icon: History },
  ];

  const getItemColor = (id: string, active: boolean) => {
    if (!active) return { text: 'text-slate-400 group-hover:text-slate-200', bar: '', glow: '' };
    switch (id) {
      case 'dashboard':
        return { text: 'text-rose-400', bar: 'bg-rose-500 shadow-[0_0_10px_#f43f5e]', glow: 'drop-shadow-[0_0_8px_rgba(244,63,94,0.6)]' };
      case 'buy':
        return { text: 'text-cyan-400', bar: 'bg-cyan-400 shadow-[0_0_10px_#22d3ee]', glow: 'drop-shadow-[0_0_8px_rgba(6,182,212,0.6)]' };
      case 'keys':
        return { text: 'text-emerald-400', bar: 'bg-emerald-400 shadow-[0_0_10px_#34d399]', glow: 'drop-shadow-[0_0_8px_rgba(16,185,129,0.6)]' };
      case 'deposit':
        return { text: 'text-amber-400', bar: 'bg-amber-400 shadow-[0_0_10px_#fbbf24]', glow: 'drop-shadow-[0_0_8px_rgba(245,158,11,0.6)]' };
      case 'api':
      case 'history':
      default:
        return { text: 'text-purple-400', bar: 'bg-purple-500 shadow-[0_0_10px_#a855f7]', glow: 'drop-shadow-[0_0_8px_rgba(168,85,247,0.6)]' };
    }
  };

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#070910]/95 backdrop-blur-2xl border-t border-white/[0.1] pb-[env(safe-area-inset-bottom)] shadow-[0_-10px_30px_rgba(0,0,0,0.8)]">
      <div className="grid grid-cols-5 items-center h-14 px-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;
          const styling = getItemColor(item.id, isActive);

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="relative flex flex-col items-center justify-center h-full min-h-[44px] py-1 transition-all group focus:outline-none cursor-pointer"
            >
              {isActive && (
                <div className={`absolute top-0 w-8 h-[2.5px] rounded-full transition-all ${styling.bar}`} />
              )}

              <Icon
                className={`w-4 h-4 transition-all ${styling.text} ${styling.glow} ${
                  isActive ? 'scale-110' : 'group-hover:scale-105'
                }`}
              />

              <span
                className={`text-[10px] tracking-tight mt-1 whitespace-nowrap truncate ${
                  isActive ? `${styling.text} font-bold` : 'text-slate-400 font-medium'
                }`}
              >
                {item.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
