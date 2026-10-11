import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ShoppingBag,
  TrendingUp,
  CreditCard,
  Users,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Zap,
  ChevronRight,
  Clock,
  KeyRound,
  Trophy,
  Crown,
  Medal,
  Award,
  Terminal,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useSite } from '../context/SiteContext.js';
import { api } from '../services/api.js';

interface DashboardPageProps {
  onNavigate: (page: string) => void;
  onOpenUpgrade: () => void;
}

interface LeaderboardUser {
  rank: number;
  userId: string;
  username: string;
  role: string;
  keysCount: number;
  totalSpent: number;
}

export const DashboardPage: React.FC<DashboardPageProps> = ({
  onNavigate,
  onOpenUpgrade,
}) => {
  const { user, balance, role } = useAuth();
  const { siteConfig } = useSite();
  const [summary, setSummary] = useState<any>({
    todaySales: 0,
    monthlySales: 0,
    totalDeposits: 0,
    referrals: 0,
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const loadDashboardData = async () => {
    try {
      const [sumRes, topUsersRes] = await Promise.all([
        api.getWalletSummary().catch(() => ({})),
        api.getTopActiveUsers().catch(() => ({ leaderboard: [] })),
      ]);

      if (sumRes) setSummary(sumRes);
      if (topUsersRes?.leaderboard) setLeaderboard(topUsersRes.leaderboard);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();

    // Live auto-polling every 3 seconds to keep Leaderboard and Sales stats real-time
    const interval = setInterval(() => {
      api.getTopActiveUsers()
        .then(res => {
          if (res?.leaderboard) setLeaderboard(res.leaderboard);
        })
        .catch(() => {});

      api.getWalletSummary()
        .then(res => {
          if (res) setSummary(res);
        })
        .catch(() => {});
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const isReseller = role === 'RESELLER' || role === 'ADMIN' || role === 'SUPER ADMIN';

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-6xl mx-auto">
      {/* 1. TOP CARD: YOUR CURRENT BALANCE */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#141420] via-[#0d0d14] to-[#070709] border border-rose-500/30 p-5 sm:p-7 shadow-2xl shadow-rose-950/20">
        <div className="absolute top-0 right-0 w-64 h-64 bg-rose-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="space-y-1">
            <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-wider text-rose-400">
              <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
              <span>YOUR CURRENT BALANCE</span>
            </div>

            <div className="flex items-baseline gap-1">
              <span className="text-2xl sm:text-3xl font-extrabold text-rose-500">
                {siteConfig.currencySymbol || '₹'}
              </span>
              <span className="font-mono text-4xl sm:text-5xl font-black text-white tracking-tight tabular-nums">
                {balance.toFixed(2)}
              </span>
            </div>

            <p className="text-xs text-slate-400 font-medium pt-1">
              {siteConfig.accountSafetyBalanceText || 'Keep ₹500+ balance for account safety.'}
            </p>
          </div>

          {/* Quick Action Buttons */}
          <div className="flex items-center gap-2.5 sm:gap-3 shrink-0">
            <button
              type="button"
              onClick={() => onNavigate('deposit')}
              className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 active:scale-95 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-950/40 flex items-center justify-center gap-2 cursor-pointer"
            >
              <Wallet className="w-4 h-4" />
              <span>DEPOSIT</span>
            </button>

            <button
              type="button"
              onClick={() => onNavigate('buy')}
              className="flex-1 sm:flex-none px-5 py-3 rounded-2xl bg-white/[0.04] hover:bg-white/[0.08] active:scale-95 text-slate-200 hover:text-white font-bold text-xs uppercase tracking-wider transition-all border border-white/10 flex items-center justify-center gap-2 cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-rose-400" />
              <span>BUY KEYS</span>
            </button>
          </div>
        </div>
      </div>

      {/* 1.5 RESELLER API SYSTEM PROMO BANNER */}
      {isReseller && (
        <div
          onClick={() => onNavigate('api')}
          className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-amber-950/40 via-[#0d0d14] to-[#0d0d14] border border-amber-500/40 shadow-xl cursor-pointer hover:border-amber-400 transition-all group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform">
              <Terminal className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[9px] font-bold uppercase tracking-wider">
                  ⚡ Outbound API System
                </span>
              </div>
              <h3 className="font-display font-black text-base text-white uppercase tracking-wider mt-1 group-hover:text-amber-400 transition-colors">
                Connect Other Websites &amp; Resellers API
              </h3>
              <p className="text-xs text-slate-300 mt-0.5">
                Get your API key and endpoint to allow other websites to buy keys automatically using wallet balance.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-bold text-amber-400 uppercase tracking-wider shrink-0 self-start sm:self-auto">
            <span>Open API Center</span>
            <ChevronRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>
      )}

      {/* 2. STATISTICS CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {/* TODAY SALES */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0d0d14] border border-white/5 shadow-lg relative overflow-hidden group hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold tracking-wider uppercase text-[10px]">TODAY SALES</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/10 text-rose-400 flex items-center justify-center">
              <Zap className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-white tabular-nums mt-2">
            {summary.todaySales ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">Real-time sync</div>
        </div>

        {/* MONTHLY SALES */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0d0d14] border border-white/5 shadow-lg relative overflow-hidden group hover:border-rose-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold tracking-wider uppercase text-[10px]">MONTHLY SALES</span>
            <div className="w-7 h-7 rounded-lg bg-sky-500/10 text-sky-400 flex items-center justify-center">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-white tabular-nums mt-2">
            {summary.monthlySales ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">Active 30 days</div>
        </div>

        {/* TOTAL DEPOSIT */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0d0d14] border border-white/5 shadow-lg relative overflow-hidden group hover:border-emerald-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold tracking-wider uppercase text-[10px]">TOTAL DEPOSIT</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <CreditCard className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-emerald-400 tabular-nums mt-2">
            ₹{(summary.totalDeposits ?? 0).toFixed(0)}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">UPI verified</div>
        </div>

        {/* REFERRALS */}
        <div className="p-4 sm:p-5 rounded-2xl bg-[#0d0d14] border border-white/5 shadow-lg relative overflow-hidden group hover:border-amber-500/30 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-bold tracking-wider uppercase text-[10px]">REFERRALS</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/10 text-amber-400 flex items-center justify-center">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-black text-amber-400 tabular-nums mt-2">
            {summary.referrals ?? 0}
          </div>
          <div className="text-[10px] text-slate-400 mt-1 font-mono">5% commission</div>
        </div>
      </div>

      {/* 3. PROMOTIONAL / RESELLER UPGRADE CARD */}
      {!isReseller ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#181308] via-[#120e06] to-[#0a0a0f] border border-amber-500/40 p-5 sm:p-6 shadow-xl">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-400 border border-amber-500/40 text-[10px] font-extrabold uppercase tracking-wider flex items-center gap-1">
                  <Sparkles className="w-3 h-3" />
                  VIP PROGRAM
                </span>
                <span className="text-xs text-amber-300/80 font-mono">Limited Availability</span>
              </div>

              <h2 className="font-display font-black text-lg sm:text-xl text-white tracking-wide">
                UPGRADE TO RESELLER
              </h2>

              <p className="text-xs text-slate-300 max-w-xl leading-relaxed">
                Unlock premium reseller access. Benefits include:
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1 pt-1 text-xs text-slate-300">
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>Access exclusive reseller dashboard</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>Sell products to your own customers</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>Manage your own orders</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-amber-400 shrink-0" />
                  <span>Automatic key delivery & higher limits</span>
                </div>
              </div>
            </div>

            <div className="flex flex-col sm:items-end justify-center shrink-0 space-y-2 pt-2 md:pt-0">
              <div className="text-xs text-slate-400 font-mono">
                One-time upgrade: <span className="font-bold text-white text-base">₹299.00</span>
              </div>
              <button
                type="button"
                onClick={onOpenUpgrade}
                className="px-6 py-3 rounded-2xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 active:scale-95 text-slate-950 font-black text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-950/40 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>UPGRADE NOW</span>
                <ArrowUpRight className="w-4 h-4 text-slate-950" />
              </button>
            </div>
          </div>
        </div>
      ) : (
        <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-950/30 to-slate-900 border border-emerald-500/30 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <span>ACTIVE RESELLER STATUS</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-300 font-mono">VIP TIER</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                You enjoy wholesale discounted pricing on all durations and automated instant delivery.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('buy')}
            className="px-4 py-2 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 border border-emerald-500/40 text-emerald-300 text-xs font-bold uppercase transition-all shrink-0 hidden sm:inline-flex cursor-pointer"
          >
            Browse VIP Stock
          </button>
        </div>
      )}

      {/* 4. QUICK ACTIONS & SERVICES NAVIGATION */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-black text-base text-white uppercase tracking-wider">
            QUICK ACTIONS &amp; SERVICES
          </h3>
          <span className="text-[10px] font-mono text-slate-400 font-bold uppercase">
            Instant Panel Shortcuts
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          {/* 1. BUY DIGITAL KEYS */}
          <button
            type="button"
            onClick={() => onNavigate('buy')}
            className="p-4 rounded-2xl bg-[#0d0d14] border border-rose-500/30 hover:border-rose-500 hover:bg-rose-500/10 transition-all text-left group flex flex-col justify-between space-y-3 shadow-lg hover:shadow-rose-950/40 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-rose-600 to-red-600 text-white flex items-center justify-center shadow-md shadow-rose-950/50 group-hover:scale-110 transition-transform">
              <ShoppingBag className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-white text-xs uppercase tracking-wide group-hover:text-rose-400 transition-colors">
                BUY KEYS
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">Game Keys Catalog</div>
            </div>
          </button>

          {/* 2. DEPOSIT FUNDS */}
          <button
            type="button"
            onClick={() => onNavigate('deposit')}
            className="p-4 rounded-2xl bg-[#0d0d14] border border-emerald-500/30 hover:border-emerald-500 hover:bg-emerald-500/10 transition-all text-left group flex flex-col justify-between space-y-3 shadow-lg hover:shadow-emerald-950/40 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-emerald-600 to-teal-600 text-white flex items-center justify-center shadow-md shadow-emerald-950/50 group-hover:scale-110 transition-transform">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-white text-xs uppercase tracking-wide group-hover:text-emerald-400 transition-colors">
                ADD FUNDS
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">Instant UPI Deposit</div>
            </div>
          </button>

          {/* 3. MY DIGITAL KEYS */}
          <button
            type="button"
            onClick={() => onNavigate('keys')}
            className="p-4 rounded-2xl bg-[#0d0d14] border border-amber-500/30 hover:border-amber-500 hover:bg-amber-500/10 transition-all text-left group flex flex-col justify-between space-y-3 shadow-lg hover:shadow-amber-950/40 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-amber-500 to-orange-600 text-slate-950 flex items-center justify-center shadow-md shadow-amber-950/50 group-hover:scale-110 transition-transform">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-white text-xs uppercase tracking-wide group-hover:text-amber-400 transition-colors">
                MY KEYS
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">Delivered Licenses</div>
            </div>
          </button>

          {/* 4. TRANSACTION HISTORY */}
          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="p-4 rounded-2xl bg-[#0d0d14] border border-sky-500/30 hover:border-sky-500 hover:bg-sky-500/10 transition-all text-left group flex flex-col justify-between space-y-3 shadow-lg hover:shadow-sky-950/40 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-sky-600 to-blue-600 text-white flex items-center justify-center shadow-md shadow-sky-950/50 group-hover:scale-110 transition-transform">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-white text-xs uppercase tracking-wide group-hover:text-sky-400 transition-colors">
                HISTORY
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">Passbook &amp; Orders</div>
            </div>
          </button>

          {/* 5. 24/7 SUPPORT */}
          <button
            type="button"
            onClick={() => onNavigate('tickets')}
            className="p-4 rounded-2xl bg-[#0d0d14] border border-purple-500/30 hover:border-purple-500 hover:bg-purple-500/10 transition-all text-left group flex flex-col justify-between space-y-3 shadow-lg hover:shadow-purple-950/40 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-purple-950/50 group-hover:scale-110 transition-transform">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-white text-xs uppercase tracking-wide group-hover:text-purple-400 transition-colors">
                SUPPORT
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">Tickets &amp; Helpdesk</div>
            </div>
          </button>

          {/* 6. REFER & EARN */}
          <button
            type="button"
            onClick={() => onNavigate('refer')}
            className="p-4 rounded-2xl bg-[#0d0d14] border border-pink-500/30 hover:border-pink-500 hover:bg-pink-500/10 transition-all text-left group flex flex-col justify-between space-y-3 shadow-lg hover:shadow-pink-950/40 cursor-pointer"
          >
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-pink-600 to-rose-600 text-white flex items-center justify-center shadow-md shadow-pink-950/50 group-hover:scale-110 transition-transform">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-white text-xs uppercase tracking-wide group-hover:text-pink-400 transition-colors">
                REFER &amp; EARN
              </div>
              <div className="text-[10px] text-slate-400 font-bold mt-0.5">5% Lifetime Comm</div>
            </div>
          </button>
        </div>
      </div>

      {/* 5. LIVE TOP 5 REAL ACTIVE USERS LEADERBOARD (டாப் 5 ரியல் ஆக்டிவ் பயனர்கள்) */}
      <div className="space-y-4 pt-2">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h3 className="font-display font-black text-base text-white uppercase tracking-wider flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>TOP 5 REAL ACTIVE USERS</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[9px] font-mono font-bold animate-pulse">
                REAL LIVE
              </span>
            </h3>
            <p className="text-xs text-slate-400 font-mono">
              Top 5 real registered members &amp; key buyers (Real-Time DB Sync)
            </p>
          </div>
          <span className="text-[10px] font-mono text-slate-500">
            TOP {Math.min(5, leaderboard.length)} REAL USERS
          </span>
        </div>

        <div className="bg-[#0d0d14] border border-white/10 rounded-3xl overflow-hidden shadow-2xl">
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400 font-mono">
              No key purchases recorded yet. Be the first to buy a key and claim #1!
            </div>
          ) : (
            <div className="divide-y divide-white/5">
              {leaderboard.slice(0, 5).map((u) => {
              const isFirst = u.rank === 1;
              const isSecond = u.rank === 2;
              const isThird = u.rank === 3;
              const isResellerRole = u.role === 'RESELLER';
              const isAdminRole = u.role === 'ADMIN' || u.role === 'SUPER ADMIN';

              return (
                <div
                  key={u.userId}
                  className={`p-4 flex items-center justify-between gap-3 transition-colors ${
                    isFirst
                      ? 'bg-amber-500/[0.08] hover:bg-amber-500/15'
                      : isSecond
                      ? 'bg-slate-300/[0.04] hover:bg-slate-300/10'
                      : isThird
                      ? 'bg-amber-700/[0.05] hover:bg-amber-700/10'
                      : 'hover:bg-white/[0.02]'
                  }`}
                >
                  {/* Left: Rank & Username */}
                  <div className="flex items-center gap-3.5 min-w-0">
                    {/* Rank Badge / Trophy */}
                    <div
                      className={`w-9 h-9 rounded-2xl flex items-center justify-center font-display font-black text-sm shrink-0 shadow-md ${
                        isFirst
                          ? 'bg-gradient-to-br from-amber-400 to-yellow-600 text-black shadow-amber-950/60'
                          : isSecond
                          ? 'bg-gradient-to-br from-slate-200 to-slate-400 text-black shadow-slate-900/60'
                          : isThird
                          ? 'bg-gradient-to-br from-amber-600 to-orange-700 text-white shadow-amber-950/60'
                          : 'bg-white/[0.04] border border-white/10 text-slate-400 font-mono'
                      }`}
                    >
                      {isFirst ? (
                        <Crown className="w-5 h-5 text-black fill-black" />
                      ) : isSecond ? (
                        <Medal className="w-5 h-5 text-slate-900" />
                      ) : isThird ? (
                        <Award className="w-5 h-5 text-white" />
                      ) : (
                        `#${u.rank}`
                      )}
                    </div>

                    {/* Username & Role Tag */}
                    <div className="space-y-0.5 truncate">
                      <div className="flex items-center gap-2">
                        <span className="font-display font-bold text-xs sm:text-sm text-white truncate">
                          @{u.username}
                        </span>

                        {/* Role Badge */}
                        {isResellerRole ? (
                          <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 shadow-sm">
                            <Crown className="w-2.5 h-2.5 text-amber-400" />
                            <span>VIP RESELLER</span>
                          </span>
                        ) : isAdminRole ? (
                          <span className="px-2 py-0.5 rounded-full bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[9px] font-mono font-bold uppercase tracking-wider flex items-center gap-1 shrink-0 shadow-sm">
                            <Zap className="w-2.5 h-2.5 text-rose-400" />
                            <span>ADMIN</span>
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded-full bg-sky-500/20 text-sky-300 border border-sky-500/40 text-[9px] font-mono font-bold uppercase tracking-wider shrink-0">
                            USER
                          </span>
                        )}
                      </div>

                      <div className="text-[10px] text-slate-400 font-mono">
                        Active Gaming Member
                      </div>
                    </div>
                  </div>

                  {/* Right: Keys Bought Count & Total Spent */}
                  <div className="text-right shrink-0">
                    <div className="font-mono text-sm sm:text-base font-black text-rose-400 flex items-center justify-end gap-1">
                      <KeyRound className="w-3.5 h-3.5 text-rose-500" />
                      <span>{u.keysCount} Keys</span>
                    </div>
                    <div className="text-[10px] text-emerald-400 font-mono font-semibold">
                      ₹{u.totalSpent.toFixed(2)} Spent
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        </div>
      </div>
    </div>
  );
};
