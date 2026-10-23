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
  TrendingUp,
  Sparkles,
  Flame,
  Zap,
  Trash2,
  X,
  RefreshCw,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useSite } from '../context/SiteContext.js';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import { collection, onSnapshot, doc, deleteDoc, setDoc } from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../firebase.js';
import heroBannerImg from '../assets/images/hero_vip_gaming_panel_1792510058753.jpg';

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
  const { success: showToastSuccess, error: showToastError } = useToast();
  const [summary, setSummary] = useState<any>({
    todaySales: 0,
    monthlySales: 0,
    totalDeposits: 0,
    referrals: 0,
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [deletingMember, setDeletingMember] = useState<LeaderboardUser | null>(null);
  const [isDeletingMember, setIsDeletingMember] = useState(false);

  let storedUserRole = '';
  let storedUserEmail = '';
  let storedUsername = '';
  try {
    const rawStored = localStorage.getItem('nexa_user_data');
    if (rawStored) {
      const parsed = JSON.parse(rawStored);
      storedUserRole = parsed.role || '';
      storedUserEmail = parsed.email || '';
      storedUsername = parsed.username || '';
    }
  } catch {}

  const currentEmail = (user?.email || storedUserEmail).toLowerCase();
  const currentUsername = (user?.username || storedUsername).toLowerCase();
  const currentRole = role || storedUserRole;

  const isAdmin =
    currentRole === 'ADMIN' ||
    currentRole === 'SUPER ADMIN' ||
    ['kk7953926@gmail.com', 'kalamkalam1234kd@gmail.com', 'kalam172010@gmail.com', 'admin@example.com'].includes(currentEmail) ||
    ['kalam', 'kalam_admin', 'nexa_admin', 'admin', 'super_admin'].includes(currentUsername);

  const loadDashboardData = async () => {
    try {
      const [sumRes, topUsersRes] = await Promise.all([
        api.getWalletSummary().catch(() => ({})),
        api.getTopActiveUsers().catch(() => ({ leaderboard: [] })),
      ]);

      if (sumRes) setSummary(sumRes);
      if (topUsersRes?.leaderboard && topUsersRes.leaderboard.length > 0) {
        setLeaderboard(topUsersRes.leaderboard);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  useEffect(() => {
    loadDashboardData();

    let unsubscribeUsers: (() => void) | undefined;
    try {
      const usersColRef = collection(db, 'users');
      unsubscribeUsers = onSnapshot(
        usersColRef,
        snapshot => {
          const hiddenSet = new Set<string>();
          try {
            const rawHidden = localStorage.getItem('nexa_hidden_leaderboard_users');
            if (rawHidden) {
              JSON.parse(rawHidden).forEach((x: string) => {
                hiddenSet.add(x);
                hiddenSet.add(x.toLowerCase());
              });
            }
            const rawDel = localStorage.getItem('nexa_deleted_user_ids');
            if (rawDel) {
              JSON.parse(rawDel).forEach((x: string) => {
                hiddenSet.add(x);
                hiddenSet.add(x.toLowerCase());
              });
            }
          } catch {}

          const liveUsers: any[] = [];
          snapshot.forEach(docSnap => {
            const data = docSnap.data();
            const docId = docSnap.id.toLowerCase();
            const uName = (data.username || data.displayName || '').toLowerCase();
            if (
              hiddenSet.has(docSnap.id) ||
              hiddenSet.has(docId) ||
              hiddenSet.has(data.username) ||
              hiddenSet.has(uName) ||
              data.isDeleted ||
              data.hiddenFromLeaderboard
            ) {
              return;
            }
            liveUsers.push({
              userId: docSnap.id,
              username: data.username || data.displayName || 'user',
              role: data.role || 'USER',
              keysCount: Number(data.keysCount) || 0,
              totalSpent: Number(data.totalSpent) || 0,
              createdAt: data.createdAt || new Date().toISOString(),
            });
          });

          if (liveUsers.length > 0) {
            const sorted = liveUsers
              .sort(
                (a, b) =>
                  b.keysCount - a.keysCount ||
                  b.totalSpent - a.totalSpent ||
                  new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
              )
              .slice(0, 5)
              .map((u, i) => ({
                rank: i + 1,
                userId: u.userId,
                username: u.username,
                role: u.role,
                keysCount: u.keysCount,
                totalSpent: u.totalSpent,
              }));

            setLeaderboard(sorted);
          }
        },
        err => {
          handleFirestoreError(err, OperationType.LIST, 'users');
        }
      );
    } catch (e) {
      console.warn('[DashboardPage] Real-time leaderboard listener setup note:', e);
    }

    const interval = setInterval(() => {
      api
        .getTopActiveUsers()
        .then(res => {
          if (res?.leaderboard) {
            setLeaderboard(res.leaderboard);
          }
        })
        .catch(() => {});

      api
        .getWalletSummary()
        .then(res => {
          if (res) setSummary(res);
        })
        .catch(() => {});
    }, 3500);

    return () => {
      if (unsubscribeUsers) unsubscribeUsers();
      clearInterval(interval);
    };
  }, []);

  const handleConfirmDelete = async (action: 'hide' | 'delete') => {
    if (!deletingMember) return;
    setIsDeletingMember(true);
    const target = deletingMember;

    // 1. Immediately persist exclusion in localStorage to prevent any snapshot flicker
    try {
      const rawHidden = localStorage.getItem('nexa_hidden_leaderboard_users') || '[]';
      const hiddenList: string[] = JSON.parse(rawHidden);
      [target.userId, target.username].forEach(item => {
        if (item && !hiddenList.includes(item)) hiddenList.push(item);
      });
      localStorage.setItem('nexa_hidden_leaderboard_users', JSON.stringify(hiddenList));

      if (action === 'delete') {
        const rawDel = localStorage.getItem('nexa_deleted_user_ids') || '[]';
        const delList: string[] = JSON.parse(rawDel);
        [target.userId, target.username].forEach(item => {
          if (item && !delList.includes(item)) delList.push(item);
        });
        localStorage.setItem('nexa_deleted_user_ids', JSON.stringify(delList));
      }
    } catch {}

    // 2. Immediately remove from local state and dismiss modal
    setLeaderboard(prev => prev.filter(m => m.userId !== target.userId && m.username !== target.username));
    setDeletingMember(null);

    // 3. Perform backend API and Firestore operations asynchronously
    try {
      // Update/delete in Firestore
      try {
        if (action === 'delete') {
          await deleteDoc(doc(db, 'users', target.userId)).catch(() => {});
          await setDoc(
            doc(db, 'users', target.userId),
            {
              isDeleted: true,
              hiddenFromLeaderboard: true,
              keysCount: 0,
              totalSpent: 0,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          ).catch(() => {});
        } else {
          await setDoc(
            doc(db, 'users', target.userId),
            {
              keysCount: 0,
              totalSpent: 0,
              hiddenFromLeaderboard: true,
              updatedAt: new Date().toISOString(),
            },
            { merge: true }
          ).catch(() => {});
        }
      } catch (fsErr) {
        console.warn('Firestore update note:', fsErr);
      }

      // Call API
      if (action === 'delete') {
        await api.deleteUser(target.userId);
        showToastSuccess('User Deleted', `@${target.username} has been permanently deleted from the system.`);
      } else {
        await api.removeTopActiveUser(target.userId);
        showToastSuccess('Member Removed', `@${target.username} has been removed from Top Active Members.`);
      }
    } catch (err: any) {
      console.warn('Backend user removal note:', err);
      // Still show success since local removal and exclusion are persisted
      showToastSuccess('Member Removed', `@${target.username} has been removed from Top Active Members.`);
    } finally {
      setIsDeletingMember(false);
    }
  };

  const isReseller = role === 'RESELLER' || role === 'ADMIN' || role === 'SUPER ADMIN';
  const currency = siteConfig.currencySymbol || '₹';

  const quickModules = [
    {
      id: 'buy',
      index: '01',
      title: 'Buy Keys',
      desc: 'Instant VIP Free Fire & Game licenses',
      icon: ShoppingBag,
      color: 'text-rose-400',
      bgGlow: 'from-rose-500/15 to-[#121625] border-rose-500/30 hover:border-rose-500/60',
      iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    },
    {
      id: 'deposit',
      index: '02',
      title: 'Add Funds',
      desc: 'Instant zero-fee automated UPI QR credit',
      icon: Wallet,
      color: 'text-emerald-400',
      bgGlow: 'from-emerald-500/15 to-[#121625] border-emerald-500/30 hover:border-emerald-500/60',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    {
      id: 'keys',
      index: '03',
      title: 'My Keys',
      desc: 'Active licenses, expiry & 1-click copy',
      icon: KeyRound,
      color: 'text-amber-400',
      bgGlow: 'from-amber-500/15 to-[#121625] border-amber-500/30 hover:border-amber-500/60',
      iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    {
      id: 'history',
      index: '04',
      title: 'Transaction Ledger',
      desc: 'Realtime order history and audit logs',
      icon: Clock,
      color: 'text-cyan-400',
      bgGlow: 'from-cyan-500/15 to-[#121625] border-cyan-500/30 hover:border-cyan-500/60',
      iconBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    },
    {
      id: 'tickets',
      index: '05',
      title: 'Support Desk',
      desc: '24/7 technical and payment resolution',
      icon: ShieldCheck,
      color: 'text-violet-400',
      bgGlow: 'from-violet-500/15 to-[#121625] border-violet-500/30 hover:border-violet-500/60',
      iconBg: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    },
    {
      id: 'refer',
      index: '06',
      title: 'Partner Referrals',
      desc: 'Earn 5% lifetime commission on all orders',
      icon: Users,
      color: 'text-fuchsia-400',
      bgGlow: 'from-fuchsia-500/15 to-[#121625] border-fuchsia-500/30 hover:border-fuchsia-500/60',
      iconBg: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
    },
  ];

  const maxKeys = Math.max(1, ...leaderboard.map(u => u.keysCount || 0));

  return (
    <div className="space-y-8">
      {/* 1. Futuristic VIP Gaming Command Hero Card */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-rose-950/70 via-[#101426] to-indigo-950/70 border border-rose-500/35 p-6 sm:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_12px_40px_rgba(244,63,94,0.2)]">
        {/* Ambient Glowing Orbs */}
        <div className="absolute -top-24 -left-24 w-80 h-80 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-80 h-80 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {/* Background Visual Showcase */}
        {!heroImgFailed && (
          <img
            src={heroBannerImg}
            alt="Gaming Backdrop"
            referrerPolicy="no-referrer"
            onError={() => setHeroImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-25 mix-blend-screen pointer-events-none select-none"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#0a0d18]/95 via-[#0a0d18]/85 to-transparent pointer-events-none" />

        <div className="relative z-10 space-y-2.5 max-w-2xl">
          {/* Animated Status Pill */}
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold shadow-inner">
            <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping" />
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span>KALAM FF VIP CLOUD ACTIVE</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-amber-400 font-bold">{role} TIER</span>
          </div>

          <div className="flex items-baseline gap-2 pt-1">
            <span className="text-2xl sm:text-3xl font-bold text-emerald-400 font-mono">
              {currency}
            </span>
            <span className="font-mono text-4xl sm:text-6xl font-black bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent tracking-tight tabular-nums drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              {balance.toFixed(2)}
            </span>
          </div>

          <p className="text-xs sm:text-sm text-slate-300 leading-relaxed font-medium">
            {siteConfig.accountSafetyBalanceText ||
              'Instant automated Free Fire key delivery with zero-fee UPI wallet deposits and live reseller API synchronization.'}
          </p>
        </div>

        {/* Vibrant Glowing Action Buttons */}
        <div className="relative z-10 flex flex-wrap sm:flex-nowrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('deposit')}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-[0_4px_25px_rgba(16,185,129,0.4)] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 border border-emerald-300/40 hover:scale-105"
          >
            <Wallet className="w-4 h-4 stroke-[2.8]" />
            <span>+ Add Funds</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('buy')}
            className="px-5 py-3 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-xs sm:text-sm transition-all shadow-[0_4px_25px_rgba(244,63,94,0.4)] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 border border-rose-300/30 hover:scale-105"
          >
            <Flame className="w-4 h-4 fill-white" />
            <span>Buy Key</span>
          </button>
        </div>
      </div>

      {/* 2. 4 Multi-Hue Performance Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: Today's Orders (Ruby Flame) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-500/15 via-[#121524] to-[#121524] border border-rose-500/35 space-y-1.5 shadow-[0_8px_25px_rgba(244,63,94,0.12)] hover:border-rose-500/60 transition-colors">
          <div className="flex items-center justify-between text-xs font-bold text-rose-300">
            <span>Today's Deliveries</span>
            <div className="w-7 h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400">
              <ShoppingBag className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono text-3xl sm:text-4xl font-extrabold text-rose-400 tabular-nums drop-shadow-[0_0_12px_rgba(244,63,94,0.4)]">
            {summary.todaySales ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Delivered to players today</div>
        </div>

        {/* Card 2: 30-Day Volume (Cyber Cyan) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-cyan-500/15 via-[#121524] to-[#121524] border border-cyan-500/35 space-y-1.5 shadow-[0_8px_25px_rgba(6,182,212,0.12)] hover:border-cyan-500/60 transition-colors">
          <div className="flex items-center justify-between text-xs font-bold text-cyan-300">
            <span>30-Day Volume</span>
            <div className="w-7 h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono text-3xl sm:text-4xl font-extrabold text-cyan-400 tabular-nums drop-shadow-[0_0_12px_rgba(6,182,212,0.4)]">
            {summary.monthlySales ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Monthly active licenses</div>
        </div>

        {/* Card 3: Total Deposits (Electric Emerald) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-[#121524] to-[#121524] border border-emerald-500/35 space-y-1.5 shadow-[0_8px_25px_rgba(16,185,129,0.12)] hover:border-emerald-500/60 transition-colors">
          <div className="flex items-center justify-between text-xs font-bold text-emerald-300">
            <span>Total UPI Deposits</span>
            <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono text-3xl sm:text-4xl font-extrabold text-emerald-400 tabular-nums drop-shadow-[0_0_12px_rgba(16,185,129,0.4)]">
            {currency}{(summary.totalDeposits ?? 0).toFixed(0)}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">Instant automated credit</div>
        </div>

        {/* Card 4: Partner Referrals (Royal Gold) */}
        <div className="p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-[#121524] to-[#121524] border border-amber-500/35 space-y-1.5 shadow-[0_8px_25px_rgba(245,158,11,0.12)] hover:border-amber-500/60 transition-colors">
          <div className="flex items-center justify-between text-xs font-bold text-amber-300">
            <span>Partner Referrals</span>
            <div className="w-7 h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono text-3xl sm:text-4xl font-extrabold text-amber-400 tabular-nums drop-shadow-[0_0_12px_rgba(245,158,11,0.4)]">
            {summary.referrals ?? 0}
          </div>
          <div className="text-[11px] text-slate-400 font-medium">5% lifetime commission</div>
        </div>
      </div>

      {/* 3. Wholesale Reseller Tier Spotlight */}
      {!isReseller ? (
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-amber-500/15 via-[#151829] to-orange-500/15 border border-amber-500/40 p-6 sm:p-7 flex flex-col md:flex-row md:items-center justify-between gap-6 shadow-[0_10px_35px_rgba(245,158,11,0.15)]">
          <div className="space-y-2">
            <div className="inline-flex items-center gap-2 text-xs font-bold text-amber-300">
              <Sparkles className="w-4 h-4 text-amber-400 animate-spin" />
              <span>WHOLESALE RESELLER PRIVILEGES</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-orange-400">UP TO 30% DISCOUNT</span>
            </div>

            <h2 className="font-display font-extrabold text-xl sm:text-2xl bg-gradient-to-r from-amber-200 via-yellow-200 to-orange-300 bg-clip-text text-transparent">
              Upgrade to Official Wholesale Reseller Account
            </h2>

            <p className="text-xs sm:text-sm text-slate-300 max-w-2xl leading-relaxed">
              Unlock wholesale pricing on all Free Fire durations, automated outbound REST API integration for your Telegram store or website, and bulk dispatch up to 100 keys per request.
            </p>
          </div>

          <div className="flex flex-col sm:items-end justify-center shrink-0 space-y-2">
            <div className="text-xs text-slate-300">
              One-time activation: <span className="font-mono font-bold text-amber-300 tabular-nums text-base">{currency}{Number(siteConfig.resellerUpgradePrice || 299).toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={onOpenUpgrade}
              className="px-6 py-3 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-[0_4px_25px_rgba(245,158,11,0.4)] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap shrink-0 hover:scale-105"
            >
              <span>Upgrade to Reseller</span>
              <ArrowUpRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => onNavigate('api')}
          className="p-5 sm:p-6 rounded-3xl bg-gradient-to-r from-violet-950/50 via-[#12162a] to-cyan-950/40 hover:from-violet-900/60 border border-violet-500/40 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-4 group shadow-[0_10px_35px_rgba(139,92,246,0.15)]"
        >
          <div className="flex items-start sm:items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 border border-violet-500/50 text-violet-300 flex items-center justify-center shrink-0 shadow-lg shadow-violet-950/50">
              <Terminal className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-violet-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <span>WHOLESALE RESELLER ACTIVE</span>
                <span aria-hidden="true" className="text-slate-600">·</span>
                <span className="text-cyan-300">REST API & TELEGRAM BOT READY</span>
              </div>
              <h3 className="font-display font-extrabold text-sm sm:text-base text-white group-hover:text-violet-300 transition-colors">
                External Store API & Automated Provisioning Active
              </h3>
              <p className="text-xs text-slate-300">
                Generate keys from your Telegram bot or website. All orders reflect immediately in your wallet ledger.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs font-bold text-violet-300 group-hover:text-white shrink-0 whitespace-nowrap bg-violet-500/20 px-3.5 py-2 rounded-xl border border-violet-500/30">
            <span>Open API Console</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* 4. Colorful Workspace Quick-Launch Modules */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
            <Flame className="w-4 h-4 text-rose-500" />
            <span>Workspace Operations</span>
          </h3>
          <span className="text-xs text-rose-400 font-semibold">
            Instant Access
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3.5">
          {quickModules.map(mod => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onNavigate(mod.id)}
                className={`p-4 rounded-2xl bg-gradient-to-b ${mod.bgGlow} border transition-all text-left flex flex-col justify-between space-y-3 cursor-pointer group shadow-lg hover:scale-105`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-9 h-9 rounded-xl border flex items-center justify-center shadow-md ${mod.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-slate-500 group-hover:text-white transition-colors">
                    {mod.index}
                  </span>
                </div>

                <div>
                  <div className="font-bold text-white text-xs sm:text-sm group-hover:text-rose-300 transition-colors">
                    {mod.title}
                  </div>
                  <div className="text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {mod.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 5. Esports Leaderboard: Top Active Members */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-display font-bold text-lg text-white flex items-center gap-2">
              <Trophy className="w-5 h-5 text-amber-400" />
              <span>Top Active Members</span>
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live standings ranked by verified digital license volume
            </p>
          </div>
          <span className="text-xs text-amber-400 font-mono font-bold tabular-nums bg-amber-500/10 px-2.5 py-1 rounded-lg border border-amber-500/25">
            Top {Math.min(5, leaderboard.length || 5)}
          </span>
        </div>

        <div className="bg-[#0f121e]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl backdrop-blur-md">
          {leaderboard.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-400">
              No license purchases recorded yet. Purchase your first key to climb the leaderboard.
            </div>
          ) : (
            <div className="divide-y divide-white/[0.08]">
              {leaderboard.slice(0, 5).map(u => {
                const isFirst = u.rank === 1;
                const isSecond = u.rank === 2;
                const isThird = u.rank === 3;
                const pct = Math.max(15, Math.min(100, Math.round(((u.keysCount || 1) / maxKeys) * 100)));

                return (
                  <div
                    key={u.userId}
                    className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div
                        className={`w-9 h-9 rounded-xl flex items-center justify-center font-mono font-black text-xs tabular-nums shrink-0 border ${
                          isFirst
                            ? 'bg-gradient-to-br from-amber-400/30 to-orange-500/20 text-amber-300 border-amber-400/50 shadow-[0_0_15px_rgba(245,158,11,0.35)]'
                            : isSecond
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow-[0_0_12px_rgba(6,182,212,0.25)]'
                            : isThird
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40 shadow-[0_0_12px_rgba(244,63,94,0.25)]'
                            : 'bg-white/[0.05] text-slate-400 border-white/[0.1]'
                        }`}
                      >
                        #{u.rank}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-xs sm:text-sm font-bold text-white truncate">
                            @{u.username}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-md ${
                              u.role === 'RESELLER' || u.role === 'ADMIN'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                : 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            }`}
                          >
                            {u.role === 'RESELLER' || u.role === 'ADMIN' ? 'VIP RESELLER' : 'VERIFIED'}
                          </span>
                        </div>
                        <div className="w-full max-w-[200px] h-1.5 bg-white/[0.08] rounded-full overflow-hidden mt-1.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isFirst
                                ? 'bg-gradient-to-r from-amber-400 to-orange-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]'
                                : isSecond
                                ? 'bg-gradient-to-r from-cyan-400 to-blue-500'
                                : 'bg-gradient-to-r from-rose-500 to-pink-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="font-mono text-sm sm:text-base font-extrabold text-rose-300 tabular-nums drop-shadow-[0_0_8px_rgba(244,63,94,0.4)]">
                          {u.keysCount} Keys
                        </div>
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
