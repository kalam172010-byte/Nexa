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
    { id: 'dashboard', label: 'Overview', icon: Home, color: 'text-rose-400' },
    { id: 'buy', label: 'Buy Key', icon: ShoppingBag, color: 'text-amber-400' },
    { id: 'keys', label: 'My Keys', icon: KeyRound, color: 'text-emerald-400' },
    { id: 'deposit', label: 'Deposit', icon: Wallet, color: 'text-cyan-400' },
    isReseller
      ? { id: 'api', label: 'API', icon: Terminal, color: 'text-violet-400' }
      : { id: 'history', label: 'Ledger', icon: History, color: 'text-sky-400' },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0b0d14]/95 backdrop-blur-xl border-t border-white/[0.08] pb-[env(safe-area-inset-bottom)]">
      <div className="grid grid-cols-5 items-center h-14 px-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="relative flex flex-col items-center justify-center h-full min-h-[44px] py-1 transition-colors group focus:outline-none cursor-pointer"
            >
              {isActive && (
                <div className="absolute top-0 w-7 h-[2.5px] bg-gradient-to-r from-rose-500 via-pink-500 to-amber-400 rounded-full" />
              )}

              <Icon
                className={`w-4 h-4 transition-colors ${
                  isActive
                    ? `${item.color} stroke-[2.3]`
                    : `${item.color} opacity-65 group-hover:opacity-100 stroke-[1.9]`
                }`}
              />

              <span
                className={`text-[10px] tracking-tight mt-1 whitespace-nowrap truncate ${
                  isActive ? 'text-white font-bold' : 'text-slate-400 font-medium'
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
