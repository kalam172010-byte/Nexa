import React, { useState, useEffect } from 'react';
import {
  Download,
  PlaySquare,
  ShoppingBag,
  AlertCircle,
  AlertTriangle,
  ChevronDown,
  ChevronUp,
  Plus,
  Minus,
  ExternalLink,
  ShieldCheck,
  X,
  Check,
  RefreshCw,
  Sparkles,
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
  const { user, role, balance, updateBalanceLocally } = useAuth();
  const { success: showToastSuccess, error: showToastError } = useToast();

  const [products, setProducts] = useState<Product[]>(() => api.getCachedProductsSync());
  const [isLoading, setIsLoading] = useState<boolean>(() => api.getCachedProductsSync().length === 0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters
  const [gameFilter, setGameFilter] = useState<string>('ALL GAMES');
  const [deviceFilter, setDeviceFilter] = useState<string>('ALL SYSTEMS');

  // Accordion state: map of expanded product IDs
  const [expandedMap, setExpandedMap] = useState<Record<string, boolean>>({});

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

  const toggleAccordion = (productId: string) => {
    setExpandedMap(prev => ({
      ...prev,
      [productId]: !prev[productId],
    }));
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
        showToastSuccess('Buy from Website', `${product.name} (${variant.durationLabel}) key is ready to use.`);

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

  // Filtering products (ensures all active products remain visible and live)
  const filteredProducts = products.filter(p => {
    if (p.isActive === false) return false;

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
    <div className="space-y-6 max-w-4xl mx-auto">
      <PremiumLoadingModal
        isOpen={Boolean(isBuyingId)}
        title="Generating Instant License Key..."
        subtitle="Allocating verified digital license key and updating your wallet ledger."
        badgeText="AUTOMATED KEY DELIVERY"
      />
      {/* Page Header & Refresh Control */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="font-display font-bold text-xl sm:text-2xl bg-gradient-to-r from-white via-rose-100 to-amber-200 bg-clip-text text-transparent">
            Product Catalog & License Stock
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Select a software package and duration tier for automated key generation.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <span className="text-xs text-emerald-400 font-mono font-semibold tabular-nums">
            {filteredProducts.length} available
          </span>
          <button
            type="button"
            onClick={() => fetchProducts(false)}
            className="px-3.5 py-2 rounded-xl bg-[#10121a] hover:bg-[#161926] text-slate-200 hover:text-white text-xs font-semibold border border-rose-500/25 transition-colors flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-rose-400 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh Stock</span>
          </button>
        </div>
      </div>

      {/* Interactive Filter Controls */}
      <div className="space-y-3 p-4 rounded-2xl bg-gradient-to-br from-[#131622] to-[#0f111a] border border-white/[0.08] shadow-lg">
        {/* Category Filter */}
        <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {gameFilters.map(tab => {
            const isActive = gameFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setGameFilter(tab)}
                className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-gradient-to-r from-rose-600 to-pink-600 text-white font-bold shadow-[0_2px_12px_rgba(244,63,94,0.35)]'
                    : 'text-slate-400 hover:text-white hover:bg-white/[0.05]'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        {/* System / Device Filter */}
        <div className="pt-2 border-t border-white/[0.06] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {deviceFilters.map(dTab => {
            const isActive = deviceFilter === dTab;
            return (
              <button
                key={dTab}
                onClick={() => setDeviceFilter(dTab)}
                className={`px-3 py-1 rounded-lg text-[11px] font-medium transition-all whitespace-nowrap shrink-0 cursor-pointer ${
                  isActive
                    ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-semibold'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                }`}
              >
                {dTab}
              </button>
            );
          })}
        </div>
      </div>

      {/* Products List */}
      {isLoading ? (
        <div className="space-y-4">
          {[1, 2].map(n => (
            <div key={n} className="h-72 rounded-2xl bg-[#10121a] border border-white/[0.06] animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#10121a] border border-white/[0.06] space-y-4">
          <div className="w-12 h-12 rounded-xl bg-rose-500/15 border border-rose-500/30 flex items-center justify-center mx-auto text-rose-400">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h4 className="text-white font-display font-bold text-base">
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
              className="px-5 py-2.5 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer"
            >
              <span>Add Product in Admin Console</span>
            </button>
          )}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-[#10121a] border border-white/[0.06] space-y-3">
          <AlertCircle className="w-8 h-8 text-rose-400 mx-auto" />
          <h4 className="text-white font-display font-bold text-sm">No Matching Products</h4>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            No products match the selected category or system filters.
          </p>
          <button
            onClick={() => {
              setGameFilter('ALL GAMES');
              setDeviceFilter('ALL SYSTEMS');
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-5">
          {filteredProducts.map(product => {
            const isExpanded = !!expandedMap[product.id];
            const features = product.features || ['Precision Aim Assist', 'ESP Overlay', 'Anti-Ban Protection'];
            const hasValidImage = Boolean(product.imageUrl && !failedImages[product.id]);

            return (
              <div
                key={product.id}
                className="bg-gradient-to-b from-[#131622] to-[#0e1018] border border-rose-500/20 hover:border-rose-500/40 rounded-2xl overflow-hidden transition-all shadow-[0_8px_30px_rgba(0,0,0,0.4)]"
              >
                {/* Product Media Banner with Vibrant Architectural Fallback */}
                <div className="relative aspect-[16/7] w-full bg-[#0c0e15] overflow-hidden border-b border-white/[0.06]">
                  {/* Vibrant Multi-Stop Gradient Banner */}
                  <div className="absolute inset-0 bg-gradient-to-br from-rose-950/80 via-indigo-950/70 to-amber-950/50 flex flex-col items-center justify-center p-6 text-center select-none">
                    <div className="w-11 h-11 rounded-2xl bg-rose-500/20 border border-rose-400/35 flex items-center justify-center mb-2.5 shadow-[0_0_20px_rgba(244,63,94,0.3)]">
                      <ShieldCheck className="w-6 h-6 text-rose-300" />
                    </div>
                    <div className="font-display font-extrabold text-lg sm:text-2xl bg-gradient-to-r from-white via-rose-100 to-amber-200 bg-clip-text text-transparent tracking-tight">
                      {product.name}
                    </div>
                    <div className="text-xs text-cyan-300 font-medium mt-1">
                      {product.game || 'Digital License'} · {product.deviceType || 'Universal'}
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

                  {/* Measured Contrast Scrim */}
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0e1018] via-black/25 to-transparent z-20 pointer-events-none" />

                  {/* Maintenance Scrim Overlay */}
                  {product.isUnderMaintenance && (
                    <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/75 backdrop-blur-xs p-4">
                      <div className="px-4 py-2 rounded-xl bg-amber-500/20 border border-amber-500/40 text-amber-300 font-semibold text-xs flex items-center gap-2">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                        <span>Temporarily Under Maintenance</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-5 sm:p-6 space-y-5">
                  {/* Colorful Unboxed Metadata Kicker & Title */}
                  <div className="space-y-1">
                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      <span className="text-rose-400 font-bold">{product.game || 'Free Fire'}</span>
                      <span aria-hidden="true" className="text-slate-600">·</span>
                      <span className="text-cyan-400 font-semibold">{product.deviceType || 'Non-Root'}</span>
                      {product.badge && (
                        <>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-amber-400 font-semibold flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            {product.badge}
                          </span>
                        </>
                      )}
                      {product.variants && product.variants.length > 0 && (
                        <>
                          <span aria-hidden="true" className="text-slate-600">·</span>
                          <span className="text-emerald-400 font-medium">
                            {product.variants.map(v => v.durationLabel).join(' / ')}
                          </span>
                        </>
                      )}
                    </div>

                    <h4 className="font-display font-bold text-lg sm:text-xl text-white">
                      {product.name}
                    </h4>
                  </div>

                  {/* Clean Specification List */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5 pt-2 border-t border-white/[0.06]">
                    {features.map((feat, idx) => (
                      <div
                        key={idx}
                        className="flex items-center gap-2.5 text-xs text-slate-200 py-1"
                      >
                        <div className="w-5 h-5 rounded-md bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center shrink-0">
                          <Check className="w-3 h-3 text-emerald-400" />
                        </div>
                        <span>{feat}</span>
                      </div>
                    ))}
                  </div>

                  {/* Secondary Resource Links & Primary Purchase Trigger */}
                  <div className="space-y-3 pt-2 border-t border-white/[0.06]">
                    <div className="grid grid-cols-2 gap-3">
                      <button
                        type="button"
                        onClick={() => setActiveFileModal(product)}
                        className="py-2.5 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                        <span className="truncate">Download Loader</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveVideoModal(product)}
                        className="py-2.5 px-4 rounded-xl bg-violet-500/10 hover:bg-violet-500/20 border border-violet-500/30 text-violet-300 text-xs font-semibold transition-colors flex items-center justify-center gap-2 whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <PlaySquare className="w-4 h-4 text-violet-400 shrink-0" />
                        <span className="truncate">Preview & Proof</span>
                      </button>
                    </div>

                    {product.isUnderMaintenance ? (
                      <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/25 text-xs text-amber-200 flex items-start gap-2.5">
                        <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                        <div>
                          <div className="font-semibold text-amber-300">Maintenance Notice</div>
                          <p className="text-amber-200/80 mt-0.5">
                            {product.maintenanceNotice || 'This package is undergoing a scheduled update. New license purchases are temporarily paused.'}
                          </p>
                        </div>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => toggleAccordion(product.id)}
                        className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white font-bold text-xs sm:text-sm transition-all shadow-[0_4px_20px_rgba(244,63,94,0.3)] flex items-center justify-center gap-2 cursor-pointer whitespace-nowrap shrink-0"
                      >
                        <span>{isExpanded ? 'Hide Duration Options' : 'Select Duration & Buy Key'}</span>
                        {isExpanded ? (
                          <ChevronUp className="w-4 h-4" />
                        ) : (
                          <ChevronDown className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>

                  {/* Accordion Duration Variants */}
                  {isExpanded && (
                    <div className="pt-2 space-y-2 border-t border-white/[0.06]">
                      {product.variants && product.variants.length > 0 ? (
                        product.variants.map(variant => {
                          const qty = getQuantity(variant.id);
                          const unitPrice = Number(variant.price || variant.resellerPrice || 50);
                          const totalPrice = unitPrice * qty;
                          const isBuying = isBuyingId === variant.id;

                          return (
                            <div
                              key={variant.id}
                              className="bg-[#090a0f] border border-rose-500/20 hover:border-rose-500/40 rounded-xl p-3.5 flex items-center justify-between gap-3 transition-colors"
                            >
                              <div className="space-y-0.5">
                                <div className="text-white font-semibold text-xs sm:text-sm">
                                  {variant.durationLabel}
                                </div>
                                <div className="text-emerald-400 font-bold text-sm font-mono tabular-nums">
                                  ₹{totalPrice.toFixed(2)}
                                  {qty > 1 && (
                                    <span className="text-xs text-slate-400 font-normal ml-1.5">
                                      (₹{unitPrice.toFixed(2)} each)
                                    </span>
                                  )}
                                </div>
                              </div>

                              <div className="flex items-center gap-2.5">
                                {/* Quantity Control */}
                                <div className="flex items-center bg-[#131622] border border-white/[0.1] rounded-lg px-1.5 py-1">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(variant.id, -1)}
                                    className="p-1 text-slate-400 hover:text-rose-400 cursor-pointer"
                                    aria-label="Decrease quantity"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="w-6 text-center text-xs font-mono font-bold text-amber-300 tabular-nums">
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(variant.id, 1)}
                                    className="p-1 text-slate-400 hover:text-emerald-400 cursor-pointer"
                                    aria-label="Increase quantity"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  onClick={() => handlePurchase(product, variant)}
                                  disabled={isBuying}
                                  className="px-4 py-2 rounded-lg bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs transition-all shadow-[0_2px_12px_rgba(16,185,129,0.3)] flex items-center justify-center min-w-[76px] cursor-pointer whitespace-nowrap shrink-0"
                                >
                                  {isBuying ? (
                                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                                  ) : (
                                    <span>Buy Key</span>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-4 text-xs text-slate-400">
                          No duration plans configured for this product.
                        </div>
                      )}
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
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md bg-[#10121a] border border-emerald-500/30 rounded-2xl p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <Download className="w-4 h-4 text-emerald-400" />
                <h4 className="font-display font-bold text-sm text-white">Loader & Package File</h4>
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
                Download the latest verified setup package for <span className="text-white font-semibold">{activeFileModal.name}</span>.
              </p>

              <div className="bg-[#090a0f] border border-white/[0.06] rounded-xl p-4 space-y-2">
                <div className="flex justify-between">
                  <span className="text-slate-400">System Compatibility</span>
                  <span className="text-cyan-400 font-semibold">{activeFileModal.deviceType || 'Non-Root'}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">Verification</span>
                  <span className="text-emerald-400 font-semibold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Clean Build
                  </span>
                </div>
              </div>

              <a
                href={activeFileModal.updateFileUrl || 'https://t.me'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-2 transition-all"
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
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-md bg-[#10121a] border border-violet-500/30 rounded-2xl p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/[0.06] pb-3">
              <div className="flex items-center gap-2">
                <PlaySquare className="w-4 h-4 text-violet-400" />
                <h4 className="font-display font-bold text-sm text-white">Gameplay Preview & Proof</h4>
              </div>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="text-slate-400 hover:text-white cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4 text-xs">
              <div className="p-4 rounded-xl bg-[#090a0f] border border-white/[0.06] space-y-1.5 text-slate-300">
                <div className="font-semibold text-white">
                  Official Demonstration Channel
                </div>
                <p className="text-slate-400 leading-relaxed">
                  Watch live gameplay footage, setup tutorials, and customer feedback on our verified channel.
                </p>
              </div>

              <a
                href={activeVideoModal.videoUrl || 'https://t.me'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-violet-600 to-rose-600 hover:from-violet-500 hover:to-rose-500 text-white font-bold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <span>Open Video Preview</span>
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
            className="fixed inset-0 bg-black/75 backdrop-blur-sm"
          />
          <div className="relative w-full max-w-sm bg-[#10121a] border border-rose-500/30 rounded-2xl p-6 shadow-2xl z-10 space-y-4">
            <div className="w-10 h-10 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-5 h-5" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="font-display font-bold text-base text-white">Insufficient Wallet Balance</h4>
              <p className="text-xs text-slate-400 leading-relaxed">
                This order requires <span className="text-amber-300 font-semibold font-mono tabular-nums">₹{insufficientModal.required.toFixed(2)}</span>, but your available balance is <span className="text-rose-400 font-semibold font-mono tabular-nums">₹{insufficientModal.current.toFixed(2)}</span>.
              </p>
            </div>

            <div className="flex items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setInsufficientModal(null)}
                className="flex-1 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.09] text-slate-300 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setInsufficientModal(null);
                  onNavigateDeposit();
                }}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-slate-950 text-xs font-bold cursor-pointer"
              >
                Add Funds
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
