import React, { useState, useEffect } from 'react';
import {
  Wallet,
  ShoppingBag,
  ArrowUpRight,
  ShieldCheck,
  ChevronRight,
  Clock,
  KeyRound,
  Trophy,
  Terminal,
  Users,
  Sparkles,
  TrendingUp,
  Zap,
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
  const { balance, role } = useAuth();
  const { siteConfig } = useSite();
  const [summary, setSummary] = useState<any>({
    todaySales: 0,
    monthlySales: 0,
    totalDeposits: 0,
    referrals: 0,
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);

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
    }
  };

  useEffect(() => {
    loadDashboardData();

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
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  const isReseller = role === 'RESELLER' || role === 'ADMIN' || role === 'SUPER ADMIN';
  const currency = siteConfig.currencySymbol || '₹';

  return (
    <div className="space-y-8">
      {/* 1. Primary Vibrant Wallet Hero Anchor */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-rose-950/60 via-[#121422] to-indigo-950/50 border border-rose-500/30 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_12px_40px_rgba(244,63,94,0.12)]">
        {/* Ambient Color Orbs */}
        <div className="absolute -top-20 -left-20 w-64 h-64 bg-rose-500/15 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -right-20 w-64 h-64 bg-violet-500/15 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 space-y-2">
          <div className="flex items-center gap-2 text-xs text-rose-300 font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Available Wallet Balance</span>
            <span aria-hidden="true" className="text-slate-500">·</span>
            <span className="text-amber-300 font-semibold">{role} Tier</span>
          </div>

          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">
              {currency}
            </span>
            <span className="font-mono text-3xl sm:text-5xl font-extrabold bg-gradient-to-r from-white via-emerald-100 to-emerald-300 bg-clip-text text-transparent tracking-tight tabular-nums">
              {balance.toFixed(2)}
            </span>
          </div>

          <p className="text-xs text-slate-300/90 pt-0.5">
            {siteConfig.accountSafetyBalanceText || 'Instant automated key delivery and zero-fee UPI wallet top-ups.'}
          </p>
        </div>

        {/* Vibrant Primary & Secondary Actions */}
        <div className="relative z-10 flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('deposit')}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-emerald-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 font-bold text-xs transition-all shadow-[0_4px_20px_rgba(16,185,129,0.35)] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            <Wallet className="w-4 h-4 stroke-[2.5]" />
            <span>Deposit</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('buy')}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs transition-all shadow-[0_4px_20px_rgba(244,63,94,0.35)] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
          >
            <ShoppingBag className="w-4 h-4" />
            <span>Buy Key</span>
          </button>
        </div>
      </div>

      {/* 2. Multi-Hue Key Performance Metrics Row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-500/12 via-[#10121a] to-[#10121a] border border-rose-500/25 space-y-1.5 shadow-[0_4px_20px_rgba(244,63,94,0.06)]">
          <div className="flex items-center justify-between text-xs text-rose-300 font-semibold">
            <span>Today's Orders</span>
            <ShoppingBag className="w-4 h-4 text-rose-400" />
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-rose-400 tabular-nums">
            {summary.todaySales ?? 0}
          </div>
          <div className="text-xs text-slate-400">Licenses delivered today</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/12 via-[#10121a] to-[#10121a] border border-cyan-500/25 space-y-1.5 shadow-[0_4px_20px_rgba(6,182,212,0.06)]">
          <div className="flex items-center justify-between text-xs text-cyan-300 font-semibold">
            <span>30-Day Volume</span>
            <TrendingUp className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-cyan-400 tabular-nums">
            {summary.monthlySales ?? 0}
          </div>
          <div className="text-xs text-slate-400">Monthly active licenses</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/12 via-[#10121a] to-[#10121a] border border-emerald-500/25 space-y-1.5 shadow-[0_4px_20px_rgba(16,185,129,0.06)]">
          <div className="flex items-center justify-between text-xs text-emerald-300 font-semibold">
            <span>Total Deposits</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-emerald-400 tabular-nums">
            {currency}{(summary.totalDeposits ?? 0).toFixed(0)}
          </div>
          <div className="text-xs text-slate-400">Verified UPI top-ups</div>
        </div>

        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/12 via-[#10121a] to-[#10121a] border border-amber-500/25 space-y-1.5 shadow-[0_4px_20px_rgba(245,158,11,0.06)]">
          <div className="flex items-center justify-between text-xs text-amber-300 font-semibold">
            <span>Partner Referrals</span>
            <Users className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-amber-400 tabular-nums">
            {summary.referrals ?? 0}
          </div>
          <div className="text-xs text-slate-400">5% lifetime commission</div>
        </div>
      </div>

      {/* 3. Reseller Tier Status / Upgrade Callout */}
      {!isReseller ? (
        <div className="rounded-2xl bg-gradient-to-r from-amber-500/15 via-[#131520] to-orange-500/10 border border-amber-500/35 p-6 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_8px_30px_rgba(245,158,11,0.1)]">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-amber-400 font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>For Scaling Operations & Resellers</span>
              <span aria-hidden="true">·</span>
              <span className="text-orange-300">Wholesale Tier</span>
            </div>

            <h2 className="font-display font-bold text-lg bg-gradient-to-r from-amber-200 via-yellow-300 to-orange-300 bg-clip-text text-transparent">
              Upgrade to Wholesale Reseller Account
            </h2>

            <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
              Unlock up to 30% wholesale discounts across all license durations, outbound REST API integration for external stores, and bulk key generation up to 100 units per request.
            </p>
          </div>

          <div className="flex flex-col sm:items-end justify-center shrink-0 space-y-2">
            <div className="text-xs text-slate-300">
              One-time activation: <span className="font-mono font-bold text-amber-300 tabular-nums text-sm">{currency}{Number(siteConfig.resellerUpgradePrice || 299).toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={onOpenUpgrade}
              className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-bold text-xs transition-all shadow-[0_4px_20px_rgba(245,158,11,0.35)] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0"
            >
              <span>Upgrade Account</span>
              <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => onNavigate('api')}
          className="p-5 sm:p-6 rounded-2xl bg-gradient-to-r from-violet-950/40 via-[#121422] to-cyan-950/30 hover:from-violet-900/50 border border-violet-500/30 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group shadow-[0_8px_25px_rgba(139,92,246,0.1)]"
        >
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-11 h-11 rounded-xl bg-gradient-to-br from-violet-500/25 to-fuchsia-500/20 border border-violet-500/40 text-violet-300 flex items-center justify-center shrink-0">
              <Terminal className="w-5 h-5" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2 text-xs text-violet-300 font-semibold">
                <span>Wholesale Reseller Active</span>
                <span aria-hidden="true">·</span>
                <span className="text-cyan-300">Outbound REST API</span>
              </div>
              <h3 className="font-display font-bold text-sm sm:text-base text-white group-hover:text-violet-300 transition-colors">
                Connect External Stores & Automated Key Dispatch
              </h3>
              <p className="text-xs text-slate-300">
                Manage your API key, view numeric product IDs, and test automated license provisioning.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-violet-300 group-hover:text-white shrink-0 whitespace-nowrap">
            <span>API Console</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* 4. Color-Coded Workspace Shortcuts */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-base text-white">
            Workspace Shortcuts
          </h3>
          <span className="text-xs text-slate-400">
            Quick access
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <button
            type="button"
            onClick={() => onNavigate('buy')}
            className="p-4 rounded-2xl bg-gradient-to-br from-rose-500/12 via-[#10121a] to-[#10121a] hover:from-rose-500/20 border border-rose-500/25 hover:border-rose-500/45 transition-all text-left flex flex-col justify-between space-y-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-rose-500/20 border border-rose-500/35 text-rose-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-xs group-hover:text-rose-300 transition-colors">
                Buy Keys
              </div>
              <div className="text-[11px] text-rose-300/70 mt-0.5">License catalog</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('deposit')}
            className="p-4 rounded-2xl bg-gradient-to-br from-emerald-500/12 via-[#10121a] to-[#10121a] hover:from-emerald-500/20 border border-emerald-500/25 hover:border-emerald-500/45 transition-all text-left flex flex-col justify-between space-y-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-emerald-500/20 border border-emerald-500/35 text-emerald-400 flex items-center justify-center">
              <Wallet className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-xs group-hover:text-emerald-300 transition-colors">
                Add Funds
              </div>
              <div className="text-[11px] text-emerald-300/70 mt-0.5">Instant UPI QR</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('keys')}
            className="p-4 rounded-2xl bg-gradient-to-br from-amber-500/12 via-[#10121a] to-[#10121a] hover:from-amber-500/20 border border-amber-500/25 hover:border-amber-500/45 transition-all text-left flex flex-col justify-between space-y-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 border border-amber-500/35 text-amber-400 flex items-center justify-center">
              <KeyRound className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-xs group-hover:text-amber-300 transition-colors">
                My Keys
              </div>
              <div className="text-[11px] text-amber-300/70 mt-0.5">Delivered keys</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('history')}
            className="p-4 rounded-2xl bg-gradient-to-br from-cyan-500/12 via-[#10121a] to-[#10121a] hover:from-cyan-500/20 border border-cyan-500/25 hover:border-cyan-500/45 transition-all text-left flex flex-col justify-between space-y-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-cyan-500/20 border border-cyan-500/35 text-cyan-400 flex items-center justify-center">
              <Clock className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-xs group-hover:text-cyan-300 transition-colors">
                Transactions
              </div>
              <div className="text-[11px] text-cyan-300/70 mt-0.5">Order ledger</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('tickets')}
            className="p-4 rounded-2xl bg-gradient-to-br from-violet-500/12 via-[#10121a] to-[#10121a] hover:from-violet-500/20 border border-violet-500/25 hover:border-violet-500/45 transition-all text-left flex flex-col justify-between space-y-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 border border-violet-500/35 text-violet-400 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-xs group-hover:text-violet-300 transition-colors">
                Support Desk
              </div>
              <div className="text-[11px] text-violet-300/70 mt-0.5">24/7 resolution</div>
            </div>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('refer')}
            className="p-4 rounded-2xl bg-gradient-to-br from-pink-500/12 via-[#10121a] to-[#10121a] hover:from-pink-500/20 border border-pink-500/25 hover:border-pink-500/45 transition-all text-left flex flex-col justify-between space-y-3 cursor-pointer group"
          >
            <div className="w-9 h-9 rounded-xl bg-pink-500/20 border border-pink-500/35 text-pink-400 flex items-center justify-center">
              <Users className="w-4 h-4" />
            </div>
            <div>
              <div className="font-bold text-white text-xs group-hover:text-pink-300 transition-colors">
                Refer & Earn
              </div>
              <div className="text-[11px] text-pink-300/70 mt-0.5">5% commission</div>
            </div>
          </button>
        </div>
      </div>

      {/* 5. Top Active Members Table */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-base text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 text-amber-400" />
              <span>Top Active Members</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Ranked by verified license volume
            </p>
          </div>
          <span className="text-xs text-amber-400 font-mono font-bold tabular-nums">
            Top {Math.min(5, leaderboard.length)}
          </span>
        </div>

        <div className="bg-[#10121a] border border-white/[0.08] rounded-2xl overflow-hidden shadow-xl">
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No license purchases recorded yet. Purchase your first license key to appear on the leaderboard.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.06]">
              {leaderboard.slice(0, 5).map(u => {
                const isFirst = u.rank === 1;
                const isSecond = u.rank === 2;
                const isThird = u.rank === 3;

                return (
                  <div
                    key={u.userId}
                    className="px-5 py-3.5 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div
                        className={`w-8 h-8 rounded-lg flex items-center justify-center font-mono font-bold text-xs tabular-nums shrink-0 ${
                          isFirst
                            ? 'bg-gradient-to-br from-amber-400/25 to-orange-500/20 text-amber-300 border border-amber-400/40 shadow-[0_0_12px_rgba(245,158,11,0.25)]'
                            : isSecond
                            ? 'bg-cyan-500/15 text-cyan-300 border border-cyan-500/30'
                            : isThird
                            ? 'bg-rose-500/15 text-rose-300 border border-rose-500/30'
                            : 'bg-white/[0.04] text-slate-400 border border-white/[0.08]'
                        }`}
                      >
                        #{u.rank}
                      </div>

                      <div className="min-w-0">
                        <div className="text-xs sm:text-sm font-semibold text-white truncate">
                          @{u.username}
                        </div>
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-400">
                          <span className="text-emerald-400 font-medium">Verified Member</span>
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs sm:text-sm font-bold text-rose-300 tabular-nums">
                        {u.keysCount} Keys
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
