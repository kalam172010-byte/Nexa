import React, { useState, useEffect } from 'react';
import {
  Download,
  PlaySquare,
  ShoppingBag,
  AlertCircle,
  AlertTriangle,
  Plus,
  Minus,
  ExternalLink,
  ShieldCheck,
  X,
  Check,
  RefreshCw,
  Search,
  Sparkles,
  Flame,
  Zap,
} from 'lucide-react';
import { Product, ProductVariant } from '../types/index.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { KeySuccessModal } from '../components/KeySuccessModal.js';
import { PremiumLoadingModal } from '../components/PremiumLoader.js';
import { collection, onSnapshot } from 'firebase/firestore';
import { db } from '../firebase.js';

interface BuyKeysPageProps {
  onNavigateDeposit: () => void;
  onNavigateKeys: () => void;
  onNavigateAdmin?: () => void;
}

export const BuyKeysPage: React.FC<BuyKeysPageProps> = ({
  onNavigateDeposit,
  onNavigateKeys,
  onNavigateAdmin,
}) => {
  const { role, balance, updateBalanceLocally } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();

  const [products, setProducts] = useState<Product[]>(() => api.getCachedProductsSync());
  const [isLoading, setIsLoading] = useState<boolean>(() => api.getCachedProductsSync().length === 0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [gameFilter, setGameFilter] = useState<string>('ALL GAMES');
  const [deviceFilter, setDeviceFilter] = useState<string>('ALL SYSTEMS');

  // Selected variant per product: { [productId]: variantId }
  const [selectedVariantMap, setSelectedVariantMap] = useState<Record<string, string>>({});

  // Quantity per variant: { [variantId]: number }
  const [quantityMap, setQuantityMap] = useState<Record<string, number>>({});

  // Purchasing state
  const [isBuyingId, setIsBuyingId] = useState<string | null>(null);

  // Delivered key modal
  const [deliveredKey, setDeliveredKey] = useState<any | null>(null);

  // Info Modals
  const [activeFileModal, setActiveFileModal] = useState<Product | null>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<Product | null>(null);

  // Insufficient Balance Modal
  const [insufficientModal, setInsufficientModal] = useState<{
    required: number;
    current: number;
  } | null>(null);

  // Track broken product images to render clean CSS/SVG fallback
  const [failedImages, setFailedImages] = useState<Record<string, boolean>>({});

  const fetchProducts = async (isSilent = false) => {
    try {
      if (!isSilent) setIsLoading(true);
      else setIsRefreshing(true);

      const res = await api.getProducts();
      if (res?.products) {
        setProducts(res.products);
      }
    } catch (err: any) {
      if (!isSilent) {
        console.warn('Unable to load products:', err?.message || err);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchProducts(products.length > 0);

    const handleUpdate = (evt?: any) => {
      if (evt?.detail?.products && Array.isArray(evt.detail.products)) {
        setProducts(evt.detail.products);
        setIsLoading(false);
      } else {
        fetchProducts(true);
      }
    };

    window.addEventListener('nexa_products_updated', handleUpdate);
    window.addEventListener('storage', handleUpdate);

    let unsubscribeProds: (() => void) | undefined;
    let unsubscribeVars: (() => void) | undefined;
    try {
      unsubscribeProds = onSnapshot(
        collection(db, 'products'),
        () => fetchProducts(true),
        () => {}
      );
      unsubscribeVars = onSnapshot(
        collection(db, 'productVariants'),
        () => fetchProducts(true),
        () => {}
      );
    } catch (e) {
      console.warn('[BuyKeysPage] Realtime product listener note:', e);
    }

    const interval = setInterval(() => {
      fetchProducts(true);
    }, 4000);

    return () => {
      window.removeEventListener('nexa_products_updated', handleUpdate);
      window.removeEventListener('storage', handleUpdate);
      if (unsubscribeProds) unsubscribeProds();
      if (unsubscribeVars) unsubscribeVars();
      clearInterval(interval);
    };
  }, []);

  const getActiveVariant = (product: Product): ProductVariant | null => {
    if (!product.variants || product.variants.length === 0) return null;
    const chosenId = selectedVariantMap[product.id];
    if (chosenId) {
      const found = product.variants.find(v => v.id === chosenId);
      if (found) return found;
    }
    return product.variants[0];
  };

  const getQuantity = (variantId: string): number => {
    return quantityMap[variantId] || 1;
  };

  const updateQuantity = (variantId: string, delta: number) => {
    setQuantityMap(prev => {
      const current = prev[variantId] || 1;
      const next = Math.max(1, Math.min(20, current + delta));
      return { ...prev, [variantId]: next };
    });
  };

  const handlePurchase = async (product: Product, variant: ProductVariant) => {
    const qty = getQuantity(variant.id);
    const unitPrice = Number(variant.price || variant.resellerPrice || 50);
    const totalCost = unitPrice * qty;

    if (balance < totalCost) {
      setInsufficientModal({
        required: totalCost,
        current: balance,
      });
      return;
    }

    try {
      setIsBuyingId(variant.id);
      const res = await api.createOrder(variant.id, undefined, qty, {
        productId: product.id,
        productName: product.name,
        game: product.game || 'FREEFIRE',
        durationLabel: variant.durationLabel,
        durationHours: variant.durationHours || 24,
        price: unitPrice,
      });

      if (res?.deliveredKey || res?.key) {
        const delivered = res.deliveredKey || res.key;
        if (typeof res.newBalance === 'number') {
          updateBalanceLocally(res.newBalance);
        } else {
          updateBalanceLocally(balance - totalCost);
        }
        showToastSuccess(
          'Buy from Website',
          `${product.name} (${variant.durationLabel}) key is ready to use.`
        );

        setDeliveredKey({
          keyCode: delivered.keyCode,
          productName: product.name,
          durationLabel: variant.durationLabel,
          expiresAt: delivered.expiresAt,
          purchaseSource: delivered.purchaseSource || 'WEB',
          purchaseSourceLabel: delivered.purchaseSourceLabel || 'Buy from Website',
        });

        fetchProducts(true);
      }
    } catch (err: any) {
      showToastError('Purchase Failed', err.message || 'Could not complete key purchase.');
    } finally {
      setIsBuyingId(null);
    }
  };

  // Dynamic filter lists
  const dynamicGames = Array.from(
    new Set(
      products
        .flatMap(p => [p.game, p.category])
        .filter((val): val is string => Boolean(val))
        .map(g => g.toUpperCase().trim())
    )
  );
  const gameFilters = Array.from(
    new Set(['ALL GAMES', 'FREEFIRE', 'CARROM POOL', ...dynamicGames])
  );

  const dynamicDevices = Array.from(
    new Set(
      products
        .flatMap(p => [p.deviceType, p.badge])
        .filter((val): val is string => Boolean(val))
        .map(d => d.toUpperCase().trim())
    )
  );
  const deviceFilters = Array.from(
    new Set([
      'ALL SYSTEMS',
      'NONROOT',
      'GUILD GLORY',
      'iOS IPHONE',
      'ONLY PC',
      'ROOT+SAFE',
      ...dynamicDevices,
    ])
  );

  const filteredProducts = products.filter(p => {
    if (p.isActive === false) return false;

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        (p.name || '').toLowerCase().includes(q) ||
        (p.game || '').toLowerCase().includes(q) ||
        (p.deviceType || '').toLowerCase().includes(q);
      if (!matchSearch) return false;
    }

    const normGameFilter = gameFilter.toUpperCase().replace(/\s+/g, '');
    const pGame = (p.game || '').toUpperCase().replace(/\s+/g, '');
    const pCategory = (p.category || '').toUpperCase().replace(/\s+/g, '');
    const pName = (p.name || '').toUpperCase().replace(/\s+/g, '');

    const matchGame =
      gameFilter === 'ALL GAMES' ||
      !normGameFilter ||
      pGame.includes(normGameFilter) ||
      normGameFilter.includes(pGame) ||
      pCategory.includes(normGameFilter) ||
      pName.includes(normGameFilter);

    const normDeviceFilter = deviceFilter.toUpperCase().replace(/\s+/g, '');
    const pDevice = (p.deviceType || '').toUpperCase().replace(/\s+/g, '');
    const pBadge = (p.badge || '').toUpperCase().replace(/\s+/g, '');

    const matchDevice =
      deviceFilter === 'ALL SYSTEMS' ||
      !normDeviceFilter ||
      pDevice.includes(normDeviceFilter) ||
      normDeviceFilter.includes(pDevice) ||
      pBadge.includes(normDeviceFilter) ||
      pName.includes(normDeviceFilter);

    return matchGame && matchDevice;
  });

  return (
    <div className="space-y-6">
      <PremiumLoadingModal
        isOpen={Boolean(isBuyingId)}
        title="Generating Instant License Key..."
        subtitle="Allocating verified digital license key and updating your wallet ledger."
        badgeText="AUTOMATED KEY DELIVERY"
      />

      {/* Page Header & Search / Refresh Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-extrabold text-2xl sm:text-3xl bg-gradient-to-r from-white via-rose-100 to-amber-200 bg-clip-text text-transparent">
            VIP License Catalog & Key Dispatch
          </h2>
          <p className="text-xs sm:text-sm text-slate-300 mt-0.5">
            Select your Free Fire or game duration plan below for instant automated key generation.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <div className="relative flex-1 sm:w-64">
            <Search className="w-4 h-4 text-rose-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Search software package..."
              className="w-full pl-9 pr-3.5 py-2.5 rounded-xl bg-[#101424] border border-white/10 focus:border-rose-500 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors shadow-inner"
            />
          </div>

          <button
            type="button"
            onClick={() => fetchProducts(false)}
            className="px-3.5 py-2.5 rounded-xl bg-[#12162a] hover:bg-[#1a2038] text-slate-200 hover:text-white text-xs font-bold border border-rose-500/30 transition-all flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-md shadow-rose-950/30"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-rose-400 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Refresh</span>
          </button>
        </div>
      </div>

      {/* Interactive Segmented Filter Controls with Glowing Active Tabs */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-[#121629] via-[#0f1220] to-[#121629] border border-white/10 space-y-3 shadow-xl">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
          {gameFilters.map(tab => {
            const isActive = gameFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setGameFilter(tab)}
                className={`px-4 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 text-white shadow-lg shadow-rose-950/60 border border-white/20 scale-105'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.06] border border-transparent'
                }`}
              >
                {tab === 'FREEFIRE' ? '🔥 FREE FIRE' : tab === 'CARROM POOL' ? '🎯 CARROM POOL' : tab}
              </button>
            );
          })}
        </div>

        <div className="pt-2.5 border-t border-white/[0.08] flex items-center gap-2 overflow-x-auto no-scrollbar">
          {deviceFilters.map(dTab => {
            const isActive = deviceFilter === dTab;
            return (
              <button
                key={dTab}
                onClick={() => setDeviceFilter(dTab)}
                className={`px-3 py-1.5 rounded-lg text-[11px] font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-md shadow-cyan-950/50'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] border border-transparent'
                }`}
              >
                {dTab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {[1, 2].map(n => (
            <div key={n} className="h-96 rounded-3xl bg-[#101424] border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#101424] border border-white/10 space-y-4">
          <div className="w-14 h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400 shadow-lg">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-white font-display font-bold text-lg">
              No Products Configured
            </h4>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              Catalog items will appear here once added through the administration panel.
            </p>
          </div>
          {(role === 'ADMIN' || role === 'SUPER ADMIN') && onNavigateAdmin && (
            <button
              type="button"
              onClick={onNavigateAdmin}
              className="px-6 py-3 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer shadow-lg"
            >
              <span>Add Product in Admin Console</span>
            </button>
          )}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#101424] border border-white/10 space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h4 className="text-white font-display font-bold text-base">No Matching Products</h4>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            No products match the selected category or system filters.
          </p>
          <button
            onClick={() => {
              setGameFilter('ALL GAMES');
              setDeviceFilter('ALL SYSTEMS');
              setSearchQuery('');
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
          {filteredProducts.map(product => {
            const features = product.features || [
              'Precision Auto Aim Assist',
              'ESP Weapon & Player Overlay',
              '100% Anti-Ban Bypass Active',
              'No Root Required (All Android/iOS)',
            ];
            const hasValidImage = Boolean(product.imageUrl && !failedImages[product.id]);
            const activeVariant = getActiveVariant(product);
            const activeQty = activeVariant ? getQuantity(activeVariant.id) : 1;
            const activeUnitPrice = activeVariant
              ? Number(activeVariant.price || activeVariant.resellerPrice || 50)
              : 0;
            const activeTotalPrice = activeUnitPrice * activeQty;
            const isBuyingCurrent = activeVariant && isBuyingId === activeVariant.id;

            return (
              <div
                key={product.id}
                className="bg-gradient-to-b from-[#121628] via-[#0f1322] to-[#0c0f1c] border border-rose-500/25 hover:border-rose-500/50 rounded-3xl overflow-hidden flex flex-col justify-between transition-all shadow-[0_10px_35px_rgba(0,0,0,0.5)] hover:shadow-[0_10px_40px_rgba(244,63,94,0.18)]"
              >
                <div>
                  {/* Product Media Header with Game Visual Banner */}
                  <div className="relative aspect-[16/8] w-full bg-[#080b14] overflow-hidden border-b border-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-950/80 via-[#101424] to-indigo-950/80 flex flex-col items-center justify-center p-6 text-center select-none">
                      <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-amber-500 flex items-center justify-center mb-2 shadow-lg shadow-rose-950/50 border border-white/20">
                        <ShieldCheck className="w-6 h-6 text-white" />
                      </div>
                      <div className="font-display font-extrabold text-xl text-white tracking-tight">
                        {product.name}
                      </div>
                      <div className="text-xs text-cyan-300 font-semibold mt-1">
                        {product.game || 'FREE FIRE'} · {product.deviceType || 'NON-ROOT'}
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
                        className="w-full h-full object-cover relative z-10"
                      />
                    )}

                    {/* Gradient Scrim & Top Badge */}
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0f1322] via-black/35 to-transparent z-20 pointer-events-none" />

                    <div className="absolute top-3 right-3 z-30 flex items-center gap-2">
                      <span className="px-3 py-1 rounded-full bg-emerald-500/20 backdrop-blur-md border border-emerald-400/40 text-emerald-300 text-[11px] font-extrabold shadow-lg">
                        ⚡ INSTANT KEY
                      </span>
                    </div>

                    {/* Maintenance Overlay */}
                    {product.isUnderMaintenance && (
                      <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/85 backdrop-blur-xs p-4">
                        <div className="px-4 py-2.5 rounded-2xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-xs flex items-center gap-2 shadow-2xl">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span>Temporarily Under Maintenance</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Header & Specifications */}
                  <div className="p-5 sm:p-6 space-y-4">
                    <div className="space-y-1.5">
                      {/* Colorful Badges */}
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <span className="px-2.5 py-0.5 rounded-md bg-rose-500/20 border border-rose-500/40 text-rose-300 font-bold">
                          {product.game || 'FREE FIRE'}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-md bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 font-bold">
                          {product.deviceType || 'NON-ROOT'}
                        </span>
                        {product.badge && (
                          <span className="px-2.5 py-0.5 rounded-md bg-amber-500/20 border border-amber-500/40 text-amber-300 font-bold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {product.badge}
                          </span>
                        )}
                      </div>

                      <h3 className="font-display font-extrabold text-xl sm:text-2xl text-white">
                        {product.name}
                      </h3>
                    </div>

                    {/* Specification Grid */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-3 border-t border-white/[0.08]">
                      {features.slice(0, 4).map((feat, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-2 text-xs text-slate-200 py-0.5"
                        >
                          <div className="w-4 h-4 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0">
                            <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
                          </div>
                          <span className="truncate font-medium">{feat}</span>
                        </div>
                      ))}
                    </div>

                    {/* Secondary Resource Buttons */}
                    <div className="grid grid-cols-2 gap-2.5 pt-2">
                      <button
                        type="button"
                        onClick={() => setActiveFileModal(product)}
                        className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/10 hover:from-emerald-500/25 hover:to-teal-500/20 border border-emerald-500/35 text-emerald-300 text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-md"
                      >
                        <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate">Download Loader</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveVideoModal(product)}
                        className="py-2.5 px-3 rounded-xl bg-gradient-to-r from-violet-500/15 to-rose-500/10 hover:from-violet-500/25 hover:to-rose-500/20 border border-violet-500/35 text-violet-300 text-xs font-bold transition-all flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer shadow-md"
                      >
                        <PlaySquare className="w-4 h-4 text-violet-400 shrink-0" />
                        <span className="truncate">Proof & Gameplay</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Interactive Duration Selection & Instant Checkout Bar */}
                <div className="p-5 sm:p-6 pt-4 bg-[#090c18] border-t border-white/10 space-y-4">
                  {product.isUnderMaintenance ? (
                    <div className="p-3.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2.5">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div>
                        <div className="font-bold text-amber-300">Maintenance Notice</div>
                        <p className="text-amber-200/90 mt-0.5">
                          {product.maintenanceNotice ||
                            'This package is undergoing a scheduled update. New license purchases are temporarily paused.'}
                        </p>
                      </div>
                    </div>
                  ) : product.variants && product.variants.length > 0 ? (
                    <>
                      {/* Duration Tier Selector Tiles */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs">
                          <span className="text-slate-300 font-bold uppercase tracking-wider text-[10px]">Select Duration Tier</span>
                          {activeVariant && (
                            <span className="font-mono text-emerald-400 font-extrabold tabular-nums">
                              ₹{activeUnitPrice.toFixed(2)} / key
                            </span>
                          )}
                        </div>

                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                          {product.variants.map(variant => {
                            const isSelected = activeVariant?.id === variant.id;
                            const vPrice = Number(variant.price || variant.resellerPrice || 50);

                            return (
                              <button
                                key={variant.id}
                                type="button"
                                onClick={() =>
                                  setSelectedVariantMap(prev => ({
                                    ...prev,
                                    [product.id]: variant.id,
                                  }))
                                }
                                className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer ${
                                  isSelected
                                    ? 'bg-gradient-to-br from-rose-600/30 via-pink-600/20 to-amber-500/20 border-rose-500 text-white shadow-lg shadow-rose-950/50 scale-102 ring-1 ring-rose-500/50'
                                    : 'bg-[#121628] border-white/10 hover:border-white/20 text-slate-300 hover:bg-[#161c33]'
                                }`}
                              >
                                <div className="text-xs font-bold truncate">
                                  {variant.durationLabel}
                                </div>
                                <div
                                  className={`font-mono text-xs font-extrabold tabular-nums mt-0.5 ${
                                    isSelected ? 'text-amber-300' : 'text-emerald-400'
                                  }`}
                                >
                                  ₹{vPrice.toFixed(0)}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      {/* Quantity Stepper + Instant Buy Button */}
                      {activeVariant && (
                        <div className="flex items-center gap-3 pt-1">
                          <div className="flex items-center bg-[#121628] border border-white/15 rounded-xl px-2 py-1.5 shrink-0 shadow-inner">
                            <button
                              type="button"
                              onClick={() => updateQuantity(activeVariant.id, -1)}
                              className="p-1 text-slate-400 hover:text-white cursor-pointer"
                              aria-label="Decrease quantity"
                            >
                              <Minus className="w-3.5 h-3.5" />
                            </button>
                            <span className="w-8 text-center text-xs font-mono font-bold text-amber-300 tabular-nums">
                              {activeQty}
                            </span>
                            <button
                              type="button"
                              onClick={() => updateQuantity(activeVariant.id, 1)}
                              className="p-1 text-slate-400 hover:text-white cursor-pointer"
                              aria-label="Increase quantity"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>
                          </div>

                          <button
                            type="button"
                            onClick={() => handlePurchase(product, activeVariant)}
                            disabled={Boolean(isBuyingCurrent)}
                            className="flex-1 py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-black text-xs sm:text-sm transition-all shadow-[0_4px_25px_rgba(244,63,94,0.4)] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0 border border-white/20 hover:scale-102"
                          >
                            {isBuyingCurrent ? (
                              <RefreshCw className="w-4 h-4 animate-spin" />
                            ) : (
                              <>
                                <Flame className="w-4 h-4 fill-white" />
                                <span>Buy License Key</span>
                                <span aria-hidden="true" className="opacity-60">·</span>
                                <span className="font-mono font-extrabold tabular-nums">
                                  ₹{activeTotalPrice.toFixed(2)}
                                </span>
                              </>
                            )}
                          </button>
                        </div>
                      )}
                    </>
                  ) : (
                    <div className="text-center py-3 text-xs text-slate-500">
                      No duration plans configured for this package.
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal: Update File & Loader */}
      {activeFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setActiveFileModal(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md bg-[#121628] border border-emerald-500/40 rounded-3xl p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                <h4 className="font-display font-extrabold text-base text-white">Loader & Package File</h4>
              </div>
              <button
                onClick={() => setActiveFileModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <p className="text-slate-300">
                Download the latest verified setup package for{' '}
                <span className="text-white font-bold">{activeFileModal.name}</span>.
              </p>

              <div className="bg-[#0a0d18] border border-white/10 rounded-2xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">System Compatibility</span>
                  <span className="text-cyan-400 font-bold">{activeFileModal.deviceType || 'NON-ROOT'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Verification</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-4 h-4" /> Verified Clean Build
                  </span>
                </div>
              </div>

              <a
                href={activeFileModal.updateFileUrl || 'https://t.me'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/50"
              >
                <Download className="w-4 h-4" />
                <span>Download Setup Package</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Gameplay Video & Proof */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setActiveVideoModal(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md bg-[#121628] border border-violet-500/40 rounded-3xl p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <PlaySquare className="w-5 h-5 text-violet-400" />
                <h4 className="font-display font-extrabold text-base text-white">Gameplay Preview & Proof</h4>
              </div>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-2xl bg-[#0a0d18] border border-white/10 space-y-1.5 text-slate-300">
                <div className="font-bold text-white text-sm">Official Demonstration Channel</div>
                <p className="text-slate-400 leading-relaxed">
                  Watch live gameplay footage, setup tutorials, and customer feedback on our verified channel.
                </p>
              </div>

              <a
                href={activeVideoModal.videoUrl || 'https://t.me'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-rose-600 hover:from-violet-500 hover:to-rose-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-950/50"
              >
                <span>Open Video Demonstration</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Insufficient Balance */}
      {insufficientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setInsufficientModal(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-sm bg-[#121628] border border-rose-500/40 rounded-3xl p-6 shadow-2xl z-10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto shadow-lg">
              <ShoppingBag className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="font-display font-extrabold text-lg text-white">Insufficient Wallet Balance</h4>
              <p className="text-xs text-slate-300 leading-relaxed">
                This order requires{' '}
                <span className="text-amber-300 font-extrabold font-mono tabular-nums">
                  ₹{insufficientModal.required.toFixed(2)}
                </span>
                , but your available balance is{' '}
                <span className="text-rose-400 font-extrabold font-mono tabular-nums">
                  ₹{insufficientModal.current.toFixed(2)}
                </span>
                .
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setInsufficientModal(null)}
                className="flex-1 py-3 rounded-xl bg-white/10 hover:bg-white/15 text-slate-300 text-xs font-bold cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setInsufficientModal(null);
                  onNavigateDeposit();
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-black cursor-pointer shadow-lg shadow-emerald-950/50"
              >
                + Add Funds
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Delivered Key Success */}
      {deliveredKey && (
        <KeySuccessModal
          keyData={deliveredKey}
          onClose={() => setDeliveredKey(null)}
          onViewKeys={() => {
            setDeliveredKey(null);
            onNavigateKeys();
          }}
        />
      )}
    </div>
  );
};
