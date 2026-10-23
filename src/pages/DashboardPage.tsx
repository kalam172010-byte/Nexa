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
  Download,
  PlaySquare,
  Check,
  ExternalLink,
  X,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext.js';
import { useSite } from '../context/SiteContext.js';
import { useToast } from '../context/ToastContext.js';
import { api } from '../services/api.js';
import { Product, ProductVariant } from '../types/index.js';
import { PurchaseModal } from '../components/PurchaseModal.js';
import { KeySuccessModal } from '../components/KeySuccessModal.js';
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
  const { success: showToastSuccess } = useToast();
  const [summary, setSummary] = useState<any>({
    todaySales: 0,
    monthlySales: 0,
    totalDeposits: 0,
    referrals: 0,
  });
  const [leaderboard, setLeaderboard] = useState<LeaderboardUser[]>([]);
  const [products, setProducts] = useState<Product[]>(() => api.getCachedProductsSync());
  const [selectedGenProductId, setSelectedGenProductId] = useState<string>('');
  const [selectedGenVariantId, setSelectedGenVariantId] = useState<string>('');
  const [cardSelectedVariants, setCardSelectedVariants] = useState<Record<string, string>>({});
  const [selectedPurchase, setSelectedPurchase] = useState<{
    product: Product;
    variant: ProductVariant;
  } | null>(null);
  const [deliveredKey, setDeliveredKey] = useState<any | null>(null);
  const [activeFileModal, setActiveFileModal] = useState<Product | null>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<Product | null>(null);
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});
  const [heroImgFailed, setHeroImgFailed] = useState(false);
  const [deletingMember, setDeletingMember] = useState<LeaderboardUser | null>(null);
  const [, setIsDeletingMember] = useState(false);

  const loadDashboardData = async () => {
    try {
      const [sumRes, topUsersRes, prodsRes] = await Promise.all([
        api.getWalletSummary().catch(() => ({})),
        api.getTopActiveUsers().catch(() => ({ leaderboard: [] })),
        api.getProducts().catch(() => ({ products: [] })),
      ]);

      if (sumRes) setSummary(sumRes);
      if (topUsersRes?.leaderboard && topUsersRes.leaderboard.length > 0) {
        setLeaderboard(topUsersRes.leaderboard);
      }
      if (prodsRes?.products && prodsRes.products.length > 0) {
        setProducts(prodsRes.products);
      }
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
    }
  };

  // Sync default selection for the Instant Key Generator widget
  useEffect(() => {
    const activeProds = products.filter(p => p.isActive !== false && p.variants && p.variants.length > 0);
    if (activeProds.length > 0) {
      const currentProd = activeProds.find(p => p.id === selectedGenProductId) || activeProds[0];
      if (currentProd.id !== selectedGenProductId) {
        setSelectedGenProductId(currentProd.id);
      }
      const variants = currentProd.variants || [];
      if (variants.length > 0 && !variants.some(v => v.id === selectedGenVariantId)) {
        setSelectedGenVariantId(variants[0].id);
      }
    }
  }, [products, selectedGenProductId, selectedGenVariantId]);

  useEffect(() => {
    loadDashboardData();

    const handleProductUpdate = (evt?: any) => {
      if (evt?.detail?.products && Array.isArray(evt.detail.products)) {
        setProducts(evt.detail.products);
      } else {
        api.getProducts().then(r => r?.products && setProducts(r.products)).catch(() => {});
      }
    };
    window.addEventListener('nexa_products_updated', handleProductUpdate);

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
      window.removeEventListener('nexa_products_updated', handleProductUpdate);
      if (unsubscribeUsers) unsubscribeUsers();
      clearInterval(interval);
    };
  }, []);

  const handleConfirmDelete = async (action: 'hide' | 'delete') => {
    if (!deletingMember) return;
    setIsDeletingMember(true);
    const target = deletingMember;

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

    setLeaderboard(prev => prev.filter(m => m.userId !== target.userId && m.username !== target.username));
    setDeletingMember(null);

    try {
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

      if (action === 'delete') {
        await api.deleteUser(target.userId);
        showToastSuccess('User Deleted', `@${target.username} has been permanently deleted from the system.`);
      } else {
        await api.removeTopActiveUser(target.userId);
        showToastSuccess('Member Removed', `@${target.username} has been removed from Top Active Members.`);
      }
    } catch (err: any) {
      console.warn('Backend user removal note:', err);
      showToastSuccess('Member Removed', `@${target.username} has been removed from Top Active Members.`);
    } finally {
      setIsDeletingMember(false);
    }
  };

  const handlePurchaseSuccess = (deliveredKeyData: any) => {
    const purchasedProduct = selectedPurchase?.product;
    const purchasedVariant = selectedPurchase?.variant;
    setSelectedPurchase(null);

    showToastSuccess(
      'Key Generated Successfully',
      `${purchasedProduct?.name || 'Panel Key'} (${purchasedVariant?.durationLabel || 'Key'}) is ready.`
    );

    setDeliveredKey({
      keyCode: deliveredKeyData?.keyCode || 'N/A',
      productName: purchasedProduct?.name || deliveredKeyData?.productName || 'VIP Key',
      durationLabel: purchasedVariant?.durationLabel || deliveredKeyData?.durationLabel || 'Standard',
      expiresAt: deliveredKeyData?.expiresAt,
      purchaseSource: deliveredKeyData?.purchaseSource || 'WEB',
      purchaseSourceLabel: deliveredKeyData?.purchaseSourceLabel || 'INR Panel Store',
    });

    loadDashboardData();
  };

  const isReseller = role === 'RESELLER' || role === 'ADMIN' || role === 'SUPER ADMIN';
  const currency = siteConfig.currencySymbol || '₹';

  const activeProducts = products.filter(p => p.isActive !== false);
  const selectedGenProduct =
    activeProducts.find(p => p.id === selectedGenProductId) || activeProducts[0] || null;
  const selectedGenVariant =
    selectedGenProduct?.variants?.find(v => v.id === selectedGenVariantId) ||
    selectedGenProduct?.variants?.[0] ||
    null;
  const selectedGenPrice = selectedGenVariant
    ? Number(
        role === 'RESELLER' && selectedGenVariant.resellerPrice
          ? selectedGenVariant.resellerPrice
          : selectedGenVariant.price
      )
    : 0;

  const quickModules = [
    {
      id: 'buy',
      index: '01',
      title: 'Buy Panel Keys',
      desc: 'All VIP Free Fire & iOS/PC panels',
      icon: ShoppingBag,
      bgGlow: 'from-rose-500/15 to-[#121625] border-rose-500/30 hover:border-rose-500/60',
      iconBg: 'bg-rose-500/20 text-rose-400 border-rose-500/30',
    },
    {
      id: 'deposit',
      index: '02',
      title: 'Add Money (UPI)',
      desc: 'Instant zero-fee QR auto top-up',
      icon: Wallet,
      bgGlow: 'from-emerald-500/15 to-[#121625] border-emerald-500/30 hover:border-emerald-500/60',
      iconBg: 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30',
    },
    {
      id: 'keys',
      index: '03',
      title: 'Manage My Keys',
      desc: 'Copy license keys & expiry status',
      icon: KeyRound,
      bgGlow: 'from-amber-500/15 to-[#121625] border-amber-500/30 hover:border-amber-500/60',
      iconBg: 'bg-amber-500/20 text-amber-400 border-amber-500/30',
    },
    {
      id: 'api',
      index: '04',
      title: 'Reseller API',
      desc: 'Wholesale panel & bot key dispatch',
      icon: Terminal,
      bgGlow: 'from-cyan-500/15 to-[#121625] border-cyan-500/30 hover:border-cyan-500/60',
      iconBg: 'bg-cyan-500/20 text-cyan-400 border-cyan-500/30',
    },
    {
      id: 'history',
      index: '05',
      title: 'Wallet Ledger',
      desc: 'Orders & UPI deposit records',
      icon: Clock,
      bgGlow: 'from-violet-500/15 to-[#121625] border-violet-500/30 hover:border-violet-500/60',
      iconBg: 'bg-violet-500/20 text-violet-400 border-violet-500/30',
    },
    {
      id: 'refer',
      index: '06',
      title: 'Refer & Earn',
      desc: 'Earn commission on partner orders',
      icon: Users,
      bgGlow: 'from-fuchsia-500/15 to-[#121625] border-fuchsia-500/30 hover:border-fuchsia-500/60',
      iconBg: 'bg-fuchsia-500/20 text-fuchsia-400 border-fuchsia-500/30',
    },
  ];

  const maxKeys = Math.max(1, ...leaderboard.map(u => u.keysCount || 0));

  return (
    <div className="space-y-5 sm:space-y-7 w-full max-w-full overflow-x-hidden">
      {/* 1. INR ADMIN PANELS — Command & Wallet Hero Hub */}
      <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-br from-rose-950/75 via-[#101426] to-indigo-950/75 border border-rose-500/35 p-4 sm:p-7 flex flex-col lg:flex-row lg:items-center justify-between gap-4 sm:gap-6 shadow-[0_12px_40px_rgba(244,63,94,0.2)]">
        <div className="absolute -top-24 -left-24 w-72 h-72 bg-rose-500/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -right-24 w-72 h-72 bg-cyan-500/20 rounded-full blur-3xl pointer-events-none" />

        {!heroImgFailed && (
          <img
            src={heroBannerImg}
            alt="Gaming Backdrop"
            referrerPolicy="no-referrer"
            onError={() => setHeroImgFailed(true)}
            className="absolute inset-0 w-full h-full object-cover opacity-20 mix-blend-screen pointer-events-none select-none"
          />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#090c18]/95 via-[#090c18]/85 to-transparent pointer-events-none" />

        <div className="relative z-10 space-y-2 max-w-2xl min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[10px] sm:text-xs font-mono font-bold">
            <span className="text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <span>INR PANEL CLOUD ONLINE</span>
            </span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-rose-300 truncate">@{user?.username || 'member'}</span>
            <span aria-hidden="true" className="text-slate-600">·</span>
            <span className="text-amber-300 uppercase">{role} TIER</span>
          </div>

          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-xl sm:text-3xl font-bold text-emerald-400 font-mono">
              {currency}
            </span>
            <span className="font-mono text-3xl sm:text-5xl font-black bg-gradient-to-r from-emerald-300 via-teal-200 to-cyan-300 bg-clip-text text-transparent tracking-tight tabular-nums drop-shadow-[0_0_20px_rgba(16,185,129,0.4)]">
              {balance.toFixed(2)}
            </span>
            <span className="text-[11px] sm:text-xs text-slate-400 font-mono font-semibold ml-1">
              AVAILABLE WALLET
            </span>
          </div>

          <p className="text-[11px] sm:text-sm text-slate-300 leading-relaxed font-medium break-words">
            {siteConfig.accountSafetyBalanceText ||
              'Official INR Admin Panels Portal — Instant 24/7 automated license key generation, zero-fee UPI QR deposits, and verified anti-ban loaders.'}
          </p>
        </div>

        {/* Primary Action Buttons */}
        <div className="relative z-10 grid grid-cols-2 sm:flex sm:flex-wrap items-center gap-2.5 sm:gap-3 shrink-0">
          <button
            type="button"
            onClick={() => onNavigate('deposit')}
            className="min-h-[44px] px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-emerald-500 via-teal-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-black text-xs sm:text-sm transition-all shadow-[0_4px_25px_rgba(16,185,129,0.4)] flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap border border-emerald-300/40 active:scale-95"
          >
            <Wallet className="w-4 h-4 stroke-[2.5] shrink-0" />
            <span>+ Add Money</span>
          </button>

          <button
            type="button"
            onClick={() => onNavigate('buy')}
            className="min-h-[44px] px-4 sm:px-5 py-2.5 sm:py-3 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-xs sm:text-sm transition-all shadow-[0_4px_25px_rgba(244,63,94,0.4)] flex items-center justify-center gap-1.5 sm:gap-2 cursor-pointer whitespace-nowrap border border-rose-300/30 active:scale-95"
          >
            <KeyRound className="w-4 h-4 shrink-0" />
            <span>Generate Key</span>
          </button>
        </div>
      </div>

      {/* 2. 4-Column INR Panel Stats Bar */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-br from-rose-500/15 via-[#121524] to-[#121524] border border-rose-500/35 space-y-1 shadow-[0_8px_25px_rgba(244,63,94,0.12)] min-w-0">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-rose-300 gap-1">
            <span className="truncate">Today's Keys</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 shrink-0">
              <KeyRound className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-rose-400 tabular-nums">
            {summary.todaySales ?? 0}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
            Generated today
          </div>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-br from-cyan-500/15 via-[#121524] to-[#121524] border border-cyan-500/35 space-y-1 shadow-[0_8px_25px_rgba(6,182,212,0.12)] min-w-0">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-cyan-300 gap-1">
            <span className="truncate">30-Day Keys</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400 shrink-0">
              <TrendingUp className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-cyan-400 tabular-nums">
            {summary.monthlySales ?? 0}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
            Monthly active keys
          </div>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-br from-emerald-500/15 via-[#121524] to-[#121524] border border-emerald-500/35 space-y-1 shadow-[0_8px_25px_rgba(16,185,129,0.12)] min-w-0">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-emerald-300 gap-1">
            <span className="truncate">Total Deposits</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Wallet className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-emerald-400 tabular-nums truncate">
            {currency}{(summary.totalDeposits ?? 0).toFixed(0)}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
            UPI wallet top-ups
          </div>
        </div>

        <div className="p-3.5 sm:p-5 rounded-2xl bg-gradient-to-br from-amber-500/15 via-[#121524] to-[#121524] border border-amber-500/35 space-y-1 shadow-[0_8px_25px_rgba(245,158,11,0.12)] min-w-0">
          <div className="flex items-center justify-between text-[11px] sm:text-xs font-bold text-amber-300 gap-1">
            <span className="truncate">Referrals</span>
            <div className="w-6 h-6 sm:w-7 sm:h-7 rounded-lg bg-amber-500/20 border border-amber-500/40 flex items-center justify-center text-amber-400 shrink-0">
              <Users className="w-3.5 h-3.5" />
            </div>
          </div>
          <div className="font-mono text-2xl sm:text-3xl font-extrabold text-amber-400 tabular-nums">
            {summary.referrals ?? 0}
          </div>
          <div className="text-[10px] sm:text-[11px] text-slate-400 font-medium truncate">
            Partner network
          </div>
        </div>
      </div>

      {/* 3. ⚡ INSTANT KEY GENERATOR WIDGET (Signature inradminpanels.site Quick Key Box) */}
      {selectedGenProduct && (
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-br from-[#13182e] via-[#0e1222] to-[#151126] border border-cyan-500/35 shadow-[0_10px_35px_rgba(6,182,212,0.15)] space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-white/[0.08]">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-cyan-500 via-rose-500 to-amber-500 flex items-center justify-center text-white shrink-0 shadow-md">
                <KeyRound className="w-4 h-4 sm:w-5 sm:h-5" />
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2 text-[10px] font-mono font-bold text-cyan-400">
                  <span>INSTANT LICENSE GENERATOR</span>
                  <span aria-hidden="true" className="text-slate-600">·</span>
                  <span className="text-emerald-400">AUTO DISPATCH</span>
                </div>
                <h3 className="font-display font-black text-sm sm:text-lg text-white truncate">
                  Quick Generate / Buy Panel Key
                </h3>
              </div>
            </div>

            <button
              type="button"
              onClick={() => onNavigate('keys')}
              className="self-start sm:self-auto text-xs font-bold text-cyan-300 hover:text-white flex items-center gap-1 cursor-pointer"
            >
              <span>View My Keys</span>
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-12 gap-3.5 sm:gap-4 items-end">
            {/* Step 1: Select Panel / Mod */}
            <div className="md:col-span-5 space-y-1.5 min-w-0">
              <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block">
                1. Select Game Panel / Loader
              </label>
              <select
                value={selectedGenProduct.id}
                onChange={e => {
                  const newProdId = e.target.value;
                  setSelectedGenProductId(newProdId);
                  const found = activeProducts.find(p => p.id === newProdId);
                  if (found?.variants?.[0]) {
                    setSelectedGenVariantId(found.variants[0].id);
                  }
                }}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#090c18] border border-white/15 focus:border-cyan-400 text-xs sm:text-sm font-bold text-white focus:outline-none transition-colors cursor-pointer"
              >
                {activeProducts.map(prod => (
                  <option key={prod.id} value={prod.id} className="bg-[#0c1020] text-white">
                    {prod.name} ({prod.game || 'FREE FIRE'} · {prod.deviceType || 'NONROOT'})
                  </option>
                ))}
              </select>
            </div>

            {/* Step 2: Select Duration / Validity */}
            <div className="md:col-span-4 space-y-1.5 min-w-0">
              <label className="text-[11px] font-mono font-bold text-slate-300 uppercase tracking-wider block">
                2. Select Key Validity &amp; Price
              </label>
              <select
                value={selectedGenVariant?.id || ''}
                onChange={e => setSelectedGenVariantId(e.target.value)}
                className="w-full min-h-[44px] px-3.5 py-2.5 rounded-xl bg-[#090c18] border border-white/15 focus:border-rose-400 text-xs sm:text-sm font-bold text-emerald-300 focus:outline-none transition-colors cursor-pointer"
              >
                {(selectedGenProduct.variants || []).map(v => {
                  const p = Number(role === 'RESELLER' && v.resellerPrice ? v.resellerPrice : v.price);
                  return (
                    <option key={v.id} value={v.id} className="bg-[#0c1020] text-white">
                      {v.durationLabel} — {currency}{p.toFixed(2)}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Step 3: 1-Click Generate / Buy Key Button */}
            <div className="md:col-span-3 min-w-0">
              <button
                type="button"
                disabled={!selectedGenVariant || selectedGenProduct.isUnderMaintenance}
                onClick={() => {
                  if (selectedGenProduct && selectedGenVariant) {
                    setSelectedPurchase({
                      product: selectedGenProduct,
                      variant: selectedGenVariant,
                    });
                  }
                }}
                className="w-full min-h-[44px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 disabled:opacity-50 text-white font-black text-xs sm:text-sm uppercase tracking-wider transition-all shadow-[0_4px_20px_rgba(244,63,94,0.4)] flex items-center justify-center gap-2 cursor-pointer active:scale-95"
              >
                <Zap className="w-4 h-4 fill-white shrink-0" />
                <span className="truncate">
                  Buy Key ({currency}{selectedGenPrice.toFixed(0)})
                </span>
              </button>
            </div>
          </div>

          {/* Interactive Duration Quick-Pills for Selected Panel */}
          {selectedGenProduct.variants && selectedGenProduct.variants.length > 0 && (
            <div className="pt-2 border-t border-white/[0.06] flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar">
              <span className="text-[10px] font-mono text-slate-400 uppercase shrink-0 mr-1">
                Durations:
              </span>
              {selectedGenProduct.variants.map(v => {
                const p = Number(role === 'RESELLER' && v.resellerPrice ? v.resellerPrice : v.price);
                const isSelected = selectedGenVariant?.id === v.id;
                return (
                  <button
                    key={v.id}
                    type="button"
                    onClick={() => setSelectedGenVariantId(v.id)}
                    className={`px-2.5 py-1 rounded-lg text-[11px] font-mono font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer border ${
                      isSelected
                        ? 'bg-rose-500/25 border-rose-400 text-white shadow-sm'
                        : 'bg-[#090c16] border-white/10 text-slate-400 hover:text-white'
                    }`}
                  >
                    {v.durationLabel} · <span className="text-emerald-400">{currency}{p.toFixed(0)}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* 4. 🔥 FEATURED VIP PANELS & INSTANT KEY STOREFRONT */}
      {activeProducts.length > 0 && (
        <div className="space-y-3.5 sm:space-y-4">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <h3 className="font-display font-bold text-base sm:text-lg text-white flex items-center gap-2">
                <Flame className="w-4 h-4 sm:w-5 sm:h-5 text-rose-500 shrink-0" />
                <span className="truncate">Available VIP Panels &amp; Loaders</span>
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-400 truncate">
                Select duration and tap Buy Now for instant key delivery
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('buy')}
              className="px-3 py-1.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] border border-white/10 text-xs font-bold text-rose-300 hover:text-white flex items-center gap-1 shrink-0 cursor-pointer transition-colors"
            >
              <span>Full Store ({activeProducts.length})</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5 items-start">
            {activeProducts.slice(0, 4).map(product => {
              const variants = product.variants || [];
              const activeVarId = cardSelectedVariants[product.id] || variants[0]?.id || '';
              const activeVariant = variants.find(v => v.id === activeVarId) || variants[0];
              const activePrice = activeVariant
                ? Number(
                    role === 'RESELLER' && activeVariant.resellerPrice
                      ? activeVariant.resellerPrice
                      : activeVariant.price
                  )
                : 0;
              const hasValidImage = Boolean(product.imageUrl && !failedImages[product.id]);
              const features = product.features || [
                'Auto Headshot & Aim Assist',
                'ESP Player & Loot Overlay',
                '100% Anti-Ban Protection',
                'Instant License Key Dispatch',
              ];

              return (
                <div
                  key={product.id}
                  className="w-full min-w-0 bg-gradient-to-b from-[#13172e] via-[#0f1326] to-[#0a0d1a] border border-cyan-500/25 hover:border-cyan-400/60 rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col justify-between transition-all shadow-[0_8px_28px_rgba(0,0,0,0.55)] group"
                >
                  <div className="min-w-0">
                    {/* Compact Banner */}
                    <div className="relative aspect-[16/7] w-full bg-[#080b14] overflow-hidden border-b border-white/10">
                      <div className="absolute inset-0 bg-gradient-to-br from-rose-950/80 via-[#101428] to-cyan-950/80 flex flex-col items-center justify-center p-3 text-center select-none">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-cyan-500 via-rose-500 to-amber-500 flex items-center justify-center mb-1.5 shadow-lg border border-white/20">
                          <ShieldCheck className="w-4 h-4 text-white" />
                        </div>
                        <div className="font-display font-extrabold text-sm sm:text-base text-white line-clamp-1 px-2">
                          {product.name}
                        </div>
                        <div className="text-[10px] text-cyan-300 font-semibold mt-0.5">
                          {product.game || 'FREE FIRE'} · {product.deviceType || 'NONROOT'}
                        </div>
                      </div>

                      {hasValidImage && (
                        <img
                          src={product.imageUrl}
                          alt={product.name}
                          referrerPolicy="no-referrer"
                          onError={() =>
                            setFailedImages(prev => ({ ...prev, [product.id]: true }))
                          }
                          className="w-full h-full object-cover relative z-10 group-hover:scale-105 transition-transform duration-300"
                        />
                      )}

                      <div className="absolute inset-0 bg-gradient-to-t from-[#0f1326] via-black/30 to-transparent z-20 pointer-events-none" />

                      <div className="absolute top-2.5 left-2.5 right-2.5 z-30 flex items-center justify-between gap-1.5 pointer-events-none">
                        <div className="flex items-center gap-1 min-w-0 overflow-hidden">
                          <span className="px-2 py-0.5 rounded-md bg-black/80 backdrop-blur-md border border-white/15 text-white text-[9px] sm:text-[10px] font-mono font-bold uppercase truncate">
                            {product.game || 'FREE FIRE'}
                          </span>
                          <span className="px-2 py-0.5 rounded-md bg-cyan-950/85 backdrop-blur-md border border-cyan-400/40 text-cyan-300 text-[9px] sm:text-[10px] font-mono font-bold uppercase truncate">
                            {product.deviceType || 'NONROOT'}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md bg-emerald-950/85 backdrop-blur-md border border-emerald-400/50 text-emerald-300 text-[9px] sm:text-[10px] font-mono font-extrabold shrink-0 flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                          <span>IN STOCK</span>
                        </span>
                      </div>
                    </div>

                    {/* Title, Features & Loader Buttons */}
                    <div className="p-3.5 sm:p-5 space-y-3 min-w-0">
                      <div className="flex items-start justify-between gap-2 min-w-0">
                        <div className="min-w-0">
                          <h4 className="font-display font-extrabold text-base sm:text-lg text-white truncate">
                            {product.name}
                          </h4>
                          <p className="text-[11px] text-slate-400 line-clamp-1">
                            {product.description || 'Official verified anti-ban package with instant key activation.'}
                          </p>
                        </div>
                        {activeVariant && (
                          <div className="text-right shrink-0">
                            <div className="font-mono font-black text-sm sm:text-base text-emerald-400 tabular-nums">
                              {currency}{activePrice.toFixed(0)}
                            </div>
                            <div className="text-[10px] font-mono text-slate-400">
                              {activeVariant.durationLabel}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Compact 2-Column Feature List */}
                      <div className="grid grid-cols-2 gap-1.5 pt-2 border-t border-white/[0.08] min-w-0">
                        {features.slice(0, 4).map((feat, i) => (
                          <div key={i} className="flex items-center gap-1.5 text-[11px] text-slate-200 min-w-0">
                            <Check className="w-3 h-3 text-emerald-400 shrink-0 stroke-[3]" />
                            <span className="truncate">{feat}</span>
                          </div>
                        ))}
                      </div>

                      {/* Download Loader & Video Buttons */}
                      <div className="grid grid-cols-2 gap-2 pt-0.5">
                        <button
                          type="button"
                          onClick={() => setActiveFileModal(product)}
                          className="min-h-[38px] py-1.5 px-2.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/35 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1.5 min-w-0 cursor-pointer transition-colors"
                        >
                          <Download className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Download Loader</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setActiveVideoModal(product)}
                          className="min-h-[38px] py-1.5 px-2.5 rounded-xl bg-violet-500/15 hover:bg-violet-500/25 border border-violet-500/35 text-violet-300 text-[11px] font-bold flex items-center justify-center gap-1.5 min-w-0 cursor-pointer transition-colors"
                        >
                          <PlaySquare className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">Setup Video</span>
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Direct Duration Selector & 1-Tap Buy Key Footer */}
                  <div className="p-3.5 sm:p-4 bg-[#080b16] border-t border-white/10 space-y-2.5 min-w-0">
                    {variants.length > 0 ? (
                      <>
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                          {variants.slice(0, 4).map(v => {
                            const vPrice = Number(
                              role === 'RESELLER' && v.resellerPrice ? v.resellerPrice : v.price
                            );
                            const isSelected = activeVariant?.id === v.id;
                            return (
                              <button
                                key={v.id}
                                type="button"
                                onClick={() =>
                                  setCardSelectedVariants(prev => ({ ...prev, [product.id]: v.id }))
                                }
                                className={`p-2 rounded-xl border text-left transition-all cursor-pointer min-w-0 ${
                                  isSelected
                                    ? 'bg-rose-500/20 border-rose-500 text-white shadow-sm'
                                    : 'bg-[#101528] border-white/10 text-slate-300 hover:border-white/25'
                                }`}
                              >
                                <div className="text-[10px] font-bold truncate">{v.durationLabel}</div>
                                <div className="font-mono text-xs font-black text-emerald-400 tabular-nums">
                                  {currency}{vPrice.toFixed(0)}
                                </div>
                              </button>
                            );
                          })}
                        </div>

                        <button
                          type="button"
                          disabled={product.isUnderMaintenance || !activeVariant}
                          onClick={() => {
                            if (activeVariant) {
                              setSelectedPurchase({ product, variant: activeVariant });
                            }
                          }}
                          className="w-full min-h-[42px] py-2.5 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 disabled:opacity-50 text-white font-black text-xs uppercase tracking-wider transition-all shadow-[0_4px_18px_rgba(244,63,94,0.35)] flex items-center justify-center gap-2 cursor-pointer active:scale-[0.99]"
                        >
                          <Zap className="w-3.5 h-3.5 fill-white shrink-0" />
                          <span className="truncate">
                            Buy {activeVariant?.durationLabel} Key — {currency}{activePrice.toFixed(2)}
                          </span>
                        </button>
                      </>
                    ) : (
                      <button
                        type="button"
                        onClick={() => onNavigate('buy')}
                        className="w-full min-h-[42px] py-2.5 px-4 rounded-xl bg-white/10 text-white text-xs font-bold cursor-pointer"
                      >
                        View Package in Catalog
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 5. Wholesale Reseller Tier Spotlight */}
      {!isReseller ? (
        <div className="relative overflow-hidden rounded-2xl sm:rounded-3xl bg-gradient-to-r from-amber-500/15 via-[#151829] to-orange-500/15 border border-amber-500/40 p-4 sm:p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-[0_10px_35px_rgba(245,158,11,0.15)]">
          <div className="space-y-1.5 min-w-0">
            <div className="inline-flex items-center gap-2 text-[11px] sm:text-xs font-bold text-amber-300">
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>INR RESELLER PANEL ACCESS</span>
              <span aria-hidden="true" className="text-slate-600">·</span>
              <span className="text-orange-400">WHOLESALE KEY RATES</span>
            </div>

            <h2 className="font-display font-extrabold text-base sm:text-xl bg-gradient-to-r from-amber-200 via-yellow-200 to-orange-300 bg-clip-text text-transparent">
              Upgrade to Official Wholesale Reseller Account
            </h2>

            <p className="text-[11px] sm:text-xs text-slate-300 max-w-2xl leading-relaxed">
              Unlock discounted reseller pricing on all 1D / 7D / 30D keys, automated REST API key generation, and bulk dispatch.
            </p>
          </div>

          <div className="flex flex-col sm:items-end justify-center shrink-0 space-y-2">
            <div className="text-xs text-slate-300">
              Activation: <span className="font-mono font-bold text-amber-300 tabular-nums text-sm sm:text-base">{currency}{Number(siteConfig.resellerUpgradePrice || 299).toFixed(2)}</span>
            </div>
            <button
              type="button"
              onClick={onOpenUpgrade}
              className="min-h-[42px] px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black text-xs transition-all shadow-[0_4px_20px_rgba(245,158,11,0.4)] flex items-center justify-center gap-1.5 cursor-pointer whitespace-nowrap"
            >
              <span>Upgrade to Reseller</span>
              <ArrowUpRight className="w-4 h-4 stroke-[3]" />
            </button>
          </div>
        </div>
      ) : (
        <div
          onClick={() => onNavigate('api')}
          className="p-4 sm:p-5 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-violet-950/50 via-[#12162a] to-cyan-950/40 hover:from-violet-900/60 border border-violet-500/40 transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 group shadow-[0_10px_35px_rgba(139,92,246,0.15)]"
        >
          <div className="flex items-start sm:items-center gap-3.5 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-gradient-to-br from-violet-500/30 to-fuchsia-500/20 border border-violet-500/50 text-violet-300 flex items-center justify-center shrink-0">
              <Terminal className="w-5 h-5 sm:w-6 sm:h-6" />
            </div>
            <div className="space-y-0.5 min-w-0">
              <div className="flex items-center gap-2 text-[10px] sm:text-xs font-bold text-violet-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <span>RESELLER API ACTIVE</span>
              </div>
              <h3 className="font-display font-extrabold text-sm sm:text-base text-white truncate">
                Wholesale Key Generator &amp; Telegram Bot API
              </h3>
              <p className="text-[11px] sm:text-xs text-slate-300 truncate">
                Generate keys from your website or bot with wholesale wallet deduction.
              </p>
            </div>
          </div>

          <div className="flex items-center justify-center gap-1.5 text-xs font-bold text-violet-300 group-hover:text-white shrink-0 whitespace-nowrap bg-violet-500/20 px-3.5 py-2 rounded-xl border border-violet-500/30">
            <span>Open API Console</span>
            <ChevronRight className="w-4 h-4" />
          </div>
        </div>
      )}

      {/* 6. INR Panel Quick Portal Modules */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-display font-bold text-base sm:text-lg text-white flex items-center gap-2">
            <Zap className="w-4 h-4 text-amber-400" />
            <span>Panel Control Modules</span>
          </h3>
          <span className="text-[11px] text-rose-400 font-semibold">
            Quick Navigation
          </span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5 sm:gap-3.5">
          {quickModules.map(mod => {
            const Icon = mod.icon;
            return (
              <button
                key={mod.id}
                type="button"
                onClick={() => onNavigate(mod.id)}
                className={`p-3.5 sm:p-4 rounded-2xl bg-gradient-to-b ${mod.bgGlow} border transition-all text-left flex flex-col justify-between space-y-2.5 cursor-pointer group shadow-lg active:scale-95 min-w-0`}
              >
                <div className="flex items-center justify-between">
                  <div className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl border flex items-center justify-center shadow-md ${mod.iconBg}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <span className="font-mono text-[10px] font-bold text-slate-500 group-hover:text-white transition-colors">
                    {mod.index}
                  </span>
                </div>

                <div className="min-w-0">
                  <div className="font-bold text-white text-xs sm:text-sm group-hover:text-rose-300 transition-colors truncate">
                    {mod.title}
                  </div>
                  <div className="text-[10px] sm:text-[11px] text-slate-400 mt-0.5 line-clamp-1">
                    {mod.desc}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 7. Top Active Members / Resellers Leaderboard */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="min-w-0">
            <h3 className="font-display font-bold text-base sm:text-lg text-white flex items-center gap-2">
              <Trophy className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
              <span className="truncate">Top Active Buyers &amp; Resellers</span>
            </h3>
            <p className="text-[11px] sm:text-xs text-slate-400 mt-0.5 truncate">
              Live standings ranked by verified license key volume
            </p>
          </div>
          <span className="text-[11px] text-amber-400 font-mono font-bold tabular-nums shrink-0">
            Top {Math.min(5, leaderboard.length || 5)}
          </span>
        </div>

        <div className="bg-[#0f121e]/90 border border-white/10 rounded-2xl overflow-hidden shadow-2xl">
          {leaderboard.length === 0 ? (
            <div className="p-6 sm:p-8 text-center text-xs text-slate-400">
              No license purchases recorded yet. Generate your first key to appear on the leaderboard.
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
                    className="px-3.5 sm:px-5 py-3.5 flex items-center justify-between gap-3 hover:bg-white/[0.03] transition-colors"
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <div
                        className={`w-8 h-8 sm:w-9 sm:h-9 rounded-xl flex items-center justify-center font-mono font-black text-xs tabular-nums shrink-0 border ${
                          isFirst
                            ? 'bg-gradient-to-br from-amber-400/30 to-orange-500/20 text-amber-300 border-amber-400/50'
                            : isSecond
                            ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40'
                            : isThird
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-white/[0.05] text-slate-400 border-white/[0.1]'
                        }`}
                      >
                        #{u.rank}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="font-bold text-white truncate">
                            @{u.username}
                          </span>
                          <span className="text-slate-600" aria-hidden="true">·</span>
                          <span
                            className={`text-[10px] font-mono font-bold truncate ${
                              u.role === 'RESELLER' || u.role === 'ADMIN'
                                ? 'text-amber-400'
                                : 'text-emerald-400'
                            }`}
                          >
                            {u.role === 'RESELLER' || u.role === 'ADMIN' ? 'VIP RESELLER' : 'VERIFIED'}
                          </span>
                        </div>
                        <div className="w-full max-w-[180px] h-1.5 bg-white/[0.08] rounded-full overflow-hidden mt-1.5">
                          <div
                            className={`h-full rounded-full transition-all duration-500 ${
                              isFirst
                                ? 'bg-gradient-to-r from-amber-400 to-orange-500'
                                : isSecond
                                ? 'bg-gradient-to-r from-cyan-400 to-blue-500'
                                : 'bg-gradient-to-r from-rose-500 to-pink-500'
                            }`}
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <div className="font-mono text-xs sm:text-sm font-extrabold text-rose-300 tabular-nums">
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

      {/* Modal: Update File & Loader */}
      {activeFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            onClick={() => setActiveFileModal(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md bg-[#121628] border border-emerald-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl z-10 space-y-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Download className="w-4 h-4 sm:w-5 sm:h-5 text-emerald-400 shrink-0" />
                <h4 className="font-display font-extrabold text-sm sm:text-base text-white truncate">
                  Loader &amp; Setup File
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveFileModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <p className="text-slate-300 break-words leading-relaxed">
                Download the latest verified setup package for{' '}
                <span className="text-white font-bold">{activeFileModal.name}</span>.
              </p>

              <div className="bg-[#0a0d18] border border-white/10 rounded-xl p-3.5 space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">Compatibility</span>
                  <span className="text-cyan-400 font-bold truncate">{activeFileModal.deviceType || 'NON-ROOT'}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">Protection</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" /> 100% Anti-Ban
                  </span>
                </div>
              </div>

              <a
                href={activeFileModal.updateFileUrl || 'https://t.me'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span className="truncate">Download Loader File</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gameplay Video & Proof */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          <div
            onClick={() => setActiveVideoModal(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-[calc(100vw-1.5rem)] sm:max-w-md bg-[#121628] border border-violet-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-6 shadow-2xl z-10 space-y-4 overflow-hidden">
            <div className="flex items-center justify-between border-b border-white/10 pb-3 gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <PlaySquare className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400 shrink-0" />
                <h4 className="font-display font-extrabold text-sm sm:text-base text-white truncate">
                  Setup Tutorial &amp; Gameplay Proof
                </h4>
              </div>
              <button
                type="button"
                onClick={() => setActiveVideoModal(null)}
                className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-3.5 rounded-xl bg-[#0a0d18] border border-white/10 space-y-1 text-slate-300">
                <div className="font-bold text-white text-xs sm:text-sm">Official Demonstration Channel</div>
                <p className="text-slate-400 leading-relaxed text-[11px] sm:text-xs">
                  Watch live gameplay footage, installation guide, and feedback on our official channel.
                </p>
              </div>

              <a
                href={activeVideoModal.videoUrl || 'https://t.me'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-rose-600 hover:from-violet-500 hover:to-rose-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg"
              >
                <span className="truncate">Watch Setup Video</span>
                <ExternalLink className="w-4 h-4 shrink-0" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Purchase Confirmation Modal */}
      {selectedPurchase && (
        <PurchaseModal
          product={selectedPurchase.product}
          variant={selectedPurchase.variant}
          onClose={() => setSelectedPurchase(null)}
          onSuccess={handlePurchaseSuccess}
          onNavigateDeposit={() => {
            setSelectedPurchase(null);
            onNavigate('deposit');
          }}
        />
      )}

      {/* Delivered Key Success Modal */}
      {deliveredKey && (
        <KeySuccessModal
          keyData={deliveredKey}
          onClose={() => setDeliveredKey(null)}
          onViewKeys={() => {
            setDeliveredKey(null);
            onNavigate('keys');
          }}
        />
      )}
    </div>
  );
};
