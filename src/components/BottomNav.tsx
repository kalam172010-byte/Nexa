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
    { id: 'dashboard', label: 'Home', icon: Home },
    { id: 'deposit', label: 'Deposit', icon: Wallet },
    { id: 'buy', label: 'Buy Keys', icon: ShoppingBag },
    { id: 'keys', label: 'My Keys', icon: KeyRound },
    isReseller
      ? { id: 'api', label: 'Reseller API', icon: Terminal }
      : { id: 'history', label: 'History', icon: History },
  ];

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-[#0a0a0f]/95 backdrop-blur-xl border-t border-white/10 pb-[env(safe-area-inset-bottom)] shadow-[0_-8px_30px_rgba(0,0,0,0.8)]">
      <div className="grid grid-cols-5 items-center h-16 px-1">
        {navItems.map(item => {
          const Icon = item.icon;
          const isActive = currentPage === item.id;

          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className="relative flex flex-col items-center justify-center h-full min-h-[44px] py-1 transition-all group focus:outline-none"
            >
              {/* Active indicator bar */}
              {isActive && (
                <div className="absolute top-0 w-8 h-[2px] bg-gradient-to-r from-red-500 to-rose-500 shadow-[0_0_10px_#f43f5e]" />
              )}

              <div
                className={`flex items-center justify-center w-7 h-7 rounded-lg transition-all duration-200 ${
                  isActive
                    ? 'text-rose-400 scale-110'
                    : 'text-slate-400 group-hover:text-slate-200'
                }`}
              >
                <Icon className={`w-5 h-5 ${isActive ? 'stroke-[2.5]' : 'stroke-[1.8]'}`} />
              </div>

              <span
                className={`text-[10px] tracking-tight font-medium mt-0.5 transition-colors ${
                  isActive ? 'text-rose-400 font-extrabold' : 'text-slate-400 group-hover:text-slate-300'
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
