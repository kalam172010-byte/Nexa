import React, { useState, useEffect } from 'react';
import {
  Download,
  PlaySquare,
  ShoppingBag,
  AlertCircle,
  AlertTriangle,
  ExternalLink,
  ShieldCheck,
  X,
  Check,
  RefreshCw,
  Search,
  Sparkles,
  Zap,
  Flame,
  KeyRound,
  CheckCircle2,
  Crosshair,
  Eye,
  Smartphone,
  Cpu,
  LayoutGrid,
  List,
} from 'lucide-react';
import { Product, ProductVariant } from '../types/index.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { PurchaseModal } from '../components/PurchaseModal.js';
import { KeySuccessModal } from '../components/KeySuccessModal.js';
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
  const { role, balance } = useAuth();
  const { success: showToastSuccess } = useToast();

  const [products, setProducts] = useState<Product[]>(() => api.getCachedProductsSync());
  const [isLoading, setIsLoading] = useState<boolean>(() => api.getCachedProductsSync().length === 0);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters & Mobile Layout Mode
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [gameFilter, setGameFilter] = useState<string>('ALL GAMES');
  const [deviceFilter, setDeviceFilter] = useState<string>('ALL SYSTEMS');
  const [viewMode, setViewMode] = useState<'cards' | 'compact'>('cards');
  const [selectedCompactVariantMap, setSelectedCompactVariantMap] = useState<Record<string, string>>({});

  // Track which product cards have their "Purchase Key" duration list expanded
  const [expandedProductIds, setExpandedProductIds] = useState<Record<string, boolean>>({});

  const toggleProductPurchaseList = (productId: string) => {
    setExpandedProductIds(prev => ({
      ...prev,
      [productId]: !prev[productId],
    }));
  };

  // Active purchase modal (with Android ID & Confirmation)
  const [selectedPurchase, setSelectedPurchase] = useState<{
    product: Product;
    variant: ProductVariant;
  } | null>(null);

  // Delivered key modal
  const [deliveredKey, setDeliveredKey] = useState<any | null>(null);

  // Info Modals
  const [activeFileModal, setActiveFileModal] = useState<Product | null>(null);
  const [activeVideoModal, setActiveVideoModal] = useState<Product | null>(null);

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

  const handlePurchaseSuccess = (deliveredKeyData: any) => {
    const purchasedProduct = selectedPurchase?.product;
    const purchasedVariant = selectedPurchase?.variant;
    setSelectedPurchase(null);

    const receiptTarget = deliveredKeyData?.receiptEmailAddress;
    showToastSuccess(
      'Purchase Successful & Receipt Sent',
      receiptTarget
        ? `${purchasedProduct?.name || 'License'} key delivered & email receipt dispatched to ${receiptTarget}.`
        : `${purchasedProduct?.name || 'License'} (${purchasedVariant?.durationLabel || 'Key'}) is ready for use.`
    );

    setDeliveredKey({
      id: deliveredKeyData?.id,
      orderId: deliveredKeyData?.orderId || deliveredKeyData?.assignedOrderId,
      keyCode: deliveredKeyData?.keyCode || 'N/A',
      productName: purchasedProduct?.name || deliveredKeyData?.productName || 'VIP Key',
      gameName: purchasedProduct?.game || deliveredKeyData?.gameName || 'FREE FIRE',
      durationLabel: purchasedVariant?.durationLabel || deliveredKeyData?.durationLabel || 'Standard',
      pricePaid: deliveredKeyData?.pricePaid ?? purchasedVariant?.price,
      expiresAt: deliveredKeyData?.expiresAt,
      assignedAt: deliveredKeyData?.assignedAt || deliveredKeyData?.createdAt,
      purchaseSource: deliveredKeyData?.purchaseSource || 'WEB',
      purchaseSourceLabel: deliveredKeyData?.purchaseSourceLabel || 'Buy from Website',
      receiptEmailSent: deliveredKeyData?.receiptEmailSent,
      receiptEmailAddress: deliveredKeyData?.receiptEmailAddress,
    });

    fetchProducts(true);
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

  const getVariantPrice = (variant: ProductVariant) =>
    Number(role === 'RESELLER' && variant.resellerPrice ? variant.resellerPrice : variant.price);

  const getStartingPrice = (product: Product): number | null => {
    if (!product.variants || product.variants.length === 0) return null;
    const prices = product.variants.map(getVariantPrice).filter(p => !Number.isNaN(p) && p >= 0);
    return prices.length > 0 ? Math.min(...prices) : null;
  };

  return (
    <div className="space-y-3.5 sm:space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Dynamic Cyber Hero Header */}
      <div className="p-3.5 sm:p-6 rounded-2xl sm:rounded-3xl bg-gradient-to-r from-[#14182e] via-[#0e1224] to-[#151a33] border border-cyan-500/25 shadow-[0_4px_30px_rgba(6,182,212,0.15)] space-y-3 sm:space-y-4 overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 sm:gap-4 min-w-0">
          <div className="space-y-1 min-w-0">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap text-[10px] sm:text-[11px] font-mono font-bold">
              <span className="text-cyan-300 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse shrink-0" />
                <span className="truncate">OFFICIAL VIP KEY STORE</span>
              </span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-emerald-400 truncate">100% ANTI-BAN</span>
              <span className="text-slate-600" aria-hidden="true">·</span>
              <span className="text-amber-300 truncate">INSTANT DISPATCH</span>
            </div>
            <h2 className="font-display font-black text-base sm:text-2xl md:text-3xl text-white tracking-tight leading-snug break-words">
              VIP License Catalog &amp; Key Dispatch
            </h2>
            <p className="text-[11px] sm:text-sm text-slate-300 leading-relaxed break-words">
              Tap <span className="text-rose-400 font-bold">Purchase Key</span> on any package or switch to <span className="text-cyan-400 font-bold">Quick Compact</span> view for 1-tap mobile checkout.
            </p>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 w-full md:w-auto min-w-0">
            <div className="relative flex-1 md:w-56 min-w-0">
              <Search className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-cyan-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="Search package..."
                className="w-full min-h-[42px] pl-8 sm:pl-9 pr-3 py-2 rounded-xl bg-[#0a0d18] border border-white/10 focus:border-cyan-400 text-xs text-white placeholder:text-slate-500 focus:outline-none transition-colors shadow-inner font-medium"
              />
            </div>

            {/* Layout Mode Switcher: Cards vs Quick Compact */}
            <div className="flex items-center p-1 rounded-xl bg-[#0a0d18] border border-white/10 shrink-0">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'cards'
                    ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/50 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Detailed Card View"
              >
                <LayoutGrid className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline sm:inline">Cards</span>
              </button>
              <button
                type="button"
                onClick={() => setViewMode('compact')}
                className={`min-h-[34px] px-2.5 py-1 rounded-lg text-[11px] font-bold flex items-center gap-1 transition-all cursor-pointer ${
                  viewMode === 'compact'
                    ? 'bg-rose-500/25 text-rose-300 border border-rose-400/50 shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
                title="Quick Compact Mobile View"
              >
                <List className="w-3.5 h-3.5 shrink-0" />
                <span className="hidden xs:inline sm:inline">Compact</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => fetchProducts(false)}
              className="min-h-[42px] px-3 py-2 rounded-xl bg-[#101428] hover:bg-[#181f3d] active:scale-95 text-slate-200 hover:text-white text-xs font-bold border border-cyan-500/30 transition-all flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer shadow-md"
              aria-label="Refresh Catalog"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-cyan-400 ${isRefreshing || isLoading ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Refresh</span>
            </button>
          </div>
        </div>

        {/* Touch-Friendly Segmented Filter Controls */}
        <div className="pt-2.5 border-t border-white/[0.08] space-y-2 min-w-0">
          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-full">
            {gameFilters.map(tab => {
              const isActive = gameFilter === tab;
              return (
                <button
                  key={tab}
                  type="button"
                  onClick={() => setGameFilter(tab)}
                  className={`min-h-[38px] sm:min-h-[40px] px-3 sm:px-3.5 py-1.5 rounded-xl text-[11px] sm:text-xs font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 text-white shadow-lg shadow-rose-950/60 border border-white/30'
                      : 'text-slate-400 hover:text-white bg-[#090c18] hover:bg-white/[0.08] border border-white/10'
                  }`}
                >
                  {tab === 'FREEFIRE' ? '🔥 FREE FIRE VIP' : tab === 'CARROM POOL' ? '🎯 CARROM POOL' : tab}
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar py-0.5 max-w-full">
            {deviceFilters.map(dTab => {
              const isActive = deviceFilter === dTab;
              return (
                <button
                  key={dTab}
                  type="button"
                  onClick={() => setDeviceFilter(dTab)}
                  className={`min-h-[34px] sm:min-h-[36px] px-2.5 sm:px-3 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all whitespace-nowrap shrink-0 cursor-pointer active:scale-95 ${
                    isActive
                      ? 'bg-cyan-500/25 text-cyan-300 border border-cyan-400/60 shadow-md shadow-cyan-950/50'
                      : 'text-slate-400 hover:text-slate-200 bg-[#090c18]/80 hover:bg-white/[0.05] border border-white/5'
                  }`}
                >
                  {dTab}
                </button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Products Grid */}
      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5">
          {[1, 2].map(n => (
            <div key={n} className="h-80 sm:h-96 rounded-2xl sm:rounded-3xl bg-[#101424] border border-white/10 animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="p-6 sm:p-10 text-center rounded-2xl sm:rounded-3xl bg-[#101424] border border-white/10 space-y-3 sm:space-y-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center mx-auto text-rose-400 shadow-lg">
            <ShoppingBag className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-white font-display font-bold text-base sm:text-lg">
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
              className="min-h-[42px] px-5 py-2.5 bg-gradient-to-r from-rose-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-all cursor-pointer shadow-lg"
            >
              <span>Add Product in Admin Console</span>
            </button>
          )}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-6 sm:p-10 text-center rounded-2xl sm:rounded-3xl bg-[#101424] border border-white/10 space-y-3">
          <AlertCircle className="w-7 h-7 sm:w-8 sm:h-8 text-rose-400 mx-auto" />
          <h4 className="text-white font-display font-bold text-sm sm:text-base">No Matching Products</h4>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            No products match the selected category or system filters.
          </p>
          <button
            type="button"
            onClick={() => {
              setGameFilter('ALL GAMES');
              setDeviceFilter('ALL SYSTEMS');
              setSearchQuery('');
            }}
            className="min-h-[40px] px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition-colors cursor-pointer"
          >
            Reset Filters
          </button>
        </div>
      ) : viewMode === 'compact' ? (
        /* IDEA 2: Ultra-Compact Mobile Quick-Buy Grid (Zero Banner Scroll, Inline Duration Selector) */
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 w-full max-w-full">
          {filteredProducts.map(product => {
            const variants = product.variants || [];
            const selectedVarId = selectedCompactVariantMap[product.id] || variants[0]?.id;
            const activeVariant = variants.find(v => v.id === selectedVarId) || variants[0];
            const activePrice = activeVariant ? getVariantPrice(activeVariant) : 0;
            const hasExternalApi = Boolean(
              (activeVariant as any)?.externalPid || product.externalPid
            );
            const isOutOfStock =
              !activeVariant || (!hasExternalApi && (activeVariant.stockCount ?? 15) <= 0);

            return (
              <div
                key={product.id}
                className="p-3.5 rounded-2xl bg-gradient-to-b from-[#13172e] to-[#0b0e1c] border border-cyan-500/25 hover:border-cyan-400/50 transition-all space-y-3 min-w-0 shadow-lg"
              >
                {/* Compact Row Header */}
                <div className="flex items-start justify-between gap-2.5 min-w-0">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-cyan-500/20 via-rose-500/20 to-amber-500/20 border border-cyan-400/30 flex items-center justify-center shrink-0">
                      <ShieldCheck className="w-5 h-5 text-cyan-400" />
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-[10px] font-mono font-bold text-slate-400">
                        <span className="text-cyan-300 truncate">{product.game || 'FREE FIRE'}</span>
                        <span aria-hidden="true">·</span>
                        <span className="text-emerald-400 truncate">{product.deviceType || 'NONROOT'}</span>
                      </div>
                      <h3 className="font-display font-extrabold text-sm sm:text-base text-white truncate">
                        {product.name}
                      </h3>
                    </div>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      type="button"
                      onClick={() => setActiveFileModal(product)}
                      className="w-8 h-8 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 flex items-center justify-center cursor-pointer active:scale-95"
                      title="Download Loader File"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveVideoModal(product)}
                      className="w-8 h-8 rounded-lg bg-violet-500/15 border border-violet-500/30 text-violet-300 flex items-center justify-center cursor-pointer active:scale-95"
                      title="Watch Gameplay Video"
                    >
                      <PlaySquare className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Inline Touch Duration Selector Chips + Instant Buy Bar */}
                {product.isUnderMaintenance ? (
                  <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[11px] text-amber-300 font-bold flex items-center gap-2">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">Temporarily Under Maintenance</span>
                  </div>
                ) : variants.length > 0 ? (
                  <div className="space-y-2.5 pt-2 border-t border-white/[0.08] min-w-0">
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 min-w-0">
                      {variants.map(v => {
                        const isSelected = activeVariant?.id === v.id;
                        const vP = getVariantPrice(v);
                        return (
                          <button
                            key={v.id}
                            type="button"
                            onClick={() =>
                              setSelectedCompactVariantMap(prev => ({
                                ...prev,
                                [product.id]: v.id,
                              }))
                            }
                            className={`min-h-[38px] px-2.5 py-1.5 rounded-xl text-left transition-all cursor-pointer border min-w-0 flex flex-col justify-center ${
                              isSelected
                                ? 'bg-rose-500/20 border-rose-500 text-white shadow-sm'
                                : 'bg-[#090c18] border-white/10 text-slate-300 hover:border-white/25'
                            }`}
                          >
                            <div className="text-[10px] font-bold truncate">{v.durationLabel}</div>
                            <div className="text-[11px] font-mono font-black text-emerald-400 tabular-nums">
                              ₹{vP.toFixed(0)}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    {activeVariant && (
                      <div className="flex items-center justify-between gap-2 pt-1 min-w-0">
                        <div className="min-w-0">
                          <span className="text-[10px] text-slate-400 block truncate">
                            Selected: {activeVariant.durationLabel}
                          </span>
                          <span className="font-mono text-sm font-black text-emerald-400 tabular-nums">
                            ₹{activePrice.toFixed(2)}
                          </span>
                        </div>

                        <button
                          type="button"
                          disabled={isOutOfStock}
                          onClick={() => setSelectedPurchase({ product, variant: activeVariant })}
                          className={`min-h-[42px] px-4 py-2 rounded-xl font-black text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
                            isOutOfStock
                              ? 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                              : 'bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white shadow-md border border-white/20'
                          }`}
                        >
                          <Zap className="w-3.5 h-3.5 fill-white text-white shrink-0" />
                          <span>{isOutOfStock ? 'Out of Stock' : 'Buy Now'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="text-center py-2 text-[11px] text-slate-500">
                    No duration plans configured.
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5 sm:gap-5 items-start w-full max-w-full">
          {filteredProducts.map(product => {
            const features = product.features || [
              'Precision Auto Aim Assist',
              'ESP Weapon & Player Overlay',
              '100% Anti-Ban Bypass Active',
              'No Root Required (All Android/iOS)',
            ];
            const hasValidImage = Boolean(product.imageUrl && !failedImages[product.id]);
            const isExpanded = Boolean(expandedProductIds[product.id]);
            const startingPrice = getStartingPrice(product);

            return (
              <div
                key={product.id}
                className="w-full min-w-0 max-w-full bg-gradient-to-b from-[#13172e] via-[#0f1326] to-[#0a0d1a] border border-cyan-500/25 hover:border-cyan-400/60 rounded-2xl sm:rounded-3xl overflow-hidden flex flex-col justify-between transition-all duration-200 shadow-[0_8px_28px_rgba(0,0,0,0.55)] group"
              >
                <div className="min-w-0">
                  {/* Compact Visual Banner */}
                  <div className="relative aspect-[16/7] sm:aspect-[16/8] w-full bg-[#080b14] overflow-hidden border-b border-white/10">
                    <div className="absolute inset-0 bg-gradient-to-br from-rose-950/80 via-[#101428] to-cyan-950/80 flex flex-col items-center justify-center p-3 sm:p-4 text-center select-none">
                      <div className="w-9 h-9 sm:w-11 sm:h-11 rounded-xl sm:rounded-2xl bg-gradient-to-tr from-cyan-500 via-rose-500 to-amber-500 flex items-center justify-center mb-1.5 sm:mb-2 shadow-lg shadow-cyan-950/50 border border-white/20 shrink-0">
                        <ShieldCheck className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                      <div className="font-display font-extrabold text-sm sm:text-lg text-white tracking-tight line-clamp-1 max-w-full px-2">
                        {product.name}
                      </div>
                      <div className="text-[10px] sm:text-xs text-cyan-300 font-semibold mt-0.5 truncate max-w-full px-2">
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
                        className="w-full h-full object-cover relative z-10 group-hover:scale-105 transition-transform duration-300"
                      />
                    )}

                    {/* Gradient Scrim & Overlay Metadata */}
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
                        <span>INSTANT</span>
                      </span>
                    </div>

                    {/* Maintenance Overlay */}
                    {product.isUnderMaintenance && (
                      <div className="absolute inset-0 flex items-center justify-center z-30 bg-black/85 backdrop-blur-xs p-3">
                        <div className="px-3.5 py-2 rounded-xl bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-[11px] sm:text-xs flex items-center gap-2 shadow-2xl max-w-full">
                          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                          <span className="truncate">Temporarily Under Maintenance</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Card Content & Compact Feature Grid */}
                  <div className="p-3.5 sm:p-5 space-y-3 sm:space-y-4 min-w-0">
                    <div className="space-y-1 min-w-0">
                      <div className="flex flex-wrap items-center justify-between gap-1.5 text-[10px] sm:text-xs font-mono font-bold">
                        <div className="flex items-center gap-1.5 min-w-0">
                          {product.badge && (
                            <>
                              <span className="text-amber-300 uppercase truncate max-w-[150px]">
                                {product.badge}
                              </span>
                              <span className="text-slate-600" aria-hidden="true">·</span>
                            </>
                          )}
                          <span className="text-emerald-400 uppercase shrink-0">OB55 VERIFIED</span>
                        </div>
                        {startingPrice !== null && (
                          <span className="text-cyan-300 font-mono font-black shrink-0">
                            From ₹{startingPrice.toFixed(0)}
                          </span>
                        )}
                      </div>

                      <h3 className="font-display font-extrabold text-base sm:text-xl md:text-2xl text-white leading-tight break-words line-clamp-2">
                        {product.name}
                      </h3>
                      {product.description && (
                        <p className="text-[11px] sm:text-xs text-slate-400 line-clamp-2 break-words leading-relaxed">
                          {product.description}
                        </p>
                      )}
                    </div>

                    {/* Compact 2-Column Mobile Feature Grid */}
                    <div className="grid grid-cols-2 gap-1.5 sm:gap-2 pt-2.5 border-t border-white/[0.08] min-w-0">
                      {features.slice(0, 4).map((feat, idx) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-200 py-0.5 min-w-0"
                        >
                          <div className="w-3.5 h-3.5 sm:w-4 sm:h-4 rounded-full bg-emerald-500/20 border border-emerald-500/30 flex items-center justify-center shrink-0">
                            <Check className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-emerald-400 stroke-[3]" />
                          </div>
                          <span className="truncate font-medium sm:font-semibold">{feat}</span>
                        </div>
                      ))}
                    </div>

                    {/* Touch-Friendly Loader & Proof Action Buttons */}
                    <div className="grid grid-cols-2 gap-2 pt-0.5 min-w-0">
                      <button
                        type="button"
                        onClick={() => setActiveFileModal(product)}
                        className="min-h-[42px] py-2 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-emerald-500/15 to-teal-500/10 hover:from-emerald-500/25 hover:to-teal-500/20 active:scale-[0.98] border border-emerald-500/35 text-emerald-300 text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 cursor-pointer shadow-md"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="truncate">Download File</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setActiveVideoModal(product)}
                        className="min-h-[42px] py-2 px-2.5 sm:px-3 rounded-xl bg-gradient-to-r from-violet-500/15 to-rose-500/10 hover:from-violet-500/25 hover:to-rose-500/20 active:scale-[0.98] border border-violet-500/35 text-violet-300 text-[11px] sm:text-xs font-bold transition-all flex items-center justify-center gap-1.5 min-w-0 cursor-pointer shadow-md"
                      >
                        <PlaySquare className="w-3.5 h-3.5 text-violet-400 shrink-0" />
                        <span className="truncate">Feedback Video</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* PURCHASE KEY Button & Compact Touch-Friendly Duration Grid */}
                <div className="p-3.5 sm:p-5 pt-2.5 sm:pt-3 bg-[#080b16] border-t border-white/10 space-y-2.5 min-w-0">
                  {product.isUnderMaintenance ? (
                    <div className="p-3 rounded-xl bg-amber-500/15 border border-amber-500/30 text-[11px] sm:text-xs text-amber-200 flex items-start gap-2 min-w-0">
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                      <div className="min-w-0">
                        <div className="font-bold text-amber-300">Maintenance Notice</div>
                        <p className="text-amber-200/90 mt-0.5 break-words">
                          {product.maintenanceNotice ||
                            'This package is undergoing a scheduled update. New license purchases are temporarily paused.'}
                        </p>
                      </div>
                    </div>
                  ) : product.variants && product.variants.length > 0 ? (
                    <div className="space-y-2.5 min-w-0">
                      {/* Primary "PURCHASE KEY" Toggle Button */}
                      <button
                        type="button"
                        onClick={() => toggleProductPurchaseList(product.id)}
                        className={`w-full min-h-[44px] sm:min-h-[48px] py-2.5 sm:py-3 px-3.5 sm:px-4 rounded-xl sm:rounded-2xl font-black text-xs sm:text-sm tracking-wider uppercase transition-all flex items-center justify-between gap-2 cursor-pointer active:scale-[0.99] border min-w-0 ${
                          isExpanded
                            ? 'bg-[#151a30] border-rose-500/50 text-white shadow-inner'
                            : 'bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white shadow-[0_4px_20px_rgba(244,63,94,0.35)] border-white/20'
                        }`}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <KeyRound className="w-4 h-4 shrink-0 text-white" />
                          <span className="truncate">
                            {isExpanded ? 'Hide Durations' : 'Purchase Key'}
                          </span>
                        </div>
                        <span className="text-[10px] sm:text-[11px] font-mono font-bold px-2 py-0.5 rounded-lg bg-black/30 text-white shrink-0">
                          {product.variants.length} Plans {isExpanded ? '▲' : '▼'}
                        </span>
                      </button>

                      {/* Expanded Duration Rows: Compact & Touch-Friendly */}
                      {isExpanded && (
                        <div className="grid grid-cols-1 gap-2 pt-0.5 min-w-0">
                          {product.variants.map(variant => {
                            const vPrice = getVariantPrice(variant);
                            const hasExternalApi = Boolean(
                              (variant as any).externalPid || product.externalPid
                            );
                            const isOutOfStock = !hasExternalApi && (variant.stockCount ?? 15) <= 0;

                            return (
                              <div
                                key={variant.id}
                                className="p-2.5 sm:p-3 rounded-xl sm:rounded-2xl bg-[#101528] hover:bg-[#151c36] border border-white/10 hover:border-rose-500/40 transition-all flex items-center justify-between gap-2 min-w-0"
                              >
                                <div className="min-w-0 flex-1">
                                  <div className="text-xs sm:text-sm font-extrabold text-white truncate">
                                    {variant.durationLabel}
                                  </div>
                                  <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                    <span className="font-mono text-xs sm:text-sm font-black text-emerald-400 tabular-nums">
                                      ₹{vPrice.toFixed(2)}
                                    </span>
                                    <span className="text-[10px] font-semibold text-slate-400 truncate">
                                      · {isOutOfStock ? 'Out of Stock' : 'Instant Key'}
                                    </span>
                                  </div>
                                </div>

                                <button
                                  type="button"
                                  disabled={isOutOfStock}
                                  onClick={() => setSelectedPurchase({ product, variant })}
                                  className={`min-h-[40px] px-3 sm:px-4 py-2 rounded-xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shrink-0 cursor-pointer active:scale-95 ${
                                    isOutOfStock
                                      ? 'bg-white/5 text-slate-500 border border-white/10 cursor-not-allowed'
                                      : 'bg-gradient-to-r from-rose-600 via-pink-600 to-amber-500 hover:from-rose-500 hover:to-amber-400 text-white shadow-[0_4px_15px_rgba(244,63,94,0.35)] border border-white/20'
                                  }`}
                                >
                                  <Zap className="w-3 h-3 sm:w-3.5 sm:h-3.5 fill-white text-white shrink-0" />
                                  <span>BUY NOW</span>
                                </button>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-2.5 text-xs text-slate-500">
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
                  Loader &amp; Package File
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

              <div className="bg-[#0a0d18] border border-white/10 rounded-xl sm:rounded-2xl p-3.5 space-y-2">
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">System Compatibility</span>
                  <span className="text-cyan-400 font-bold truncate">{activeFileModal.deviceType || 'NON-ROOT'}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="text-slate-400">Verification</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1 shrink-0">
                    <ShieldCheck className="w-3.5 h-3.5" /> Verified Clean Build
                  </span>
                </div>
              </div>

              <a
                href={activeFileModal.updateFileUrl || 'https://t.me'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-emerald-950/50"
              >
                <Download className="w-4 h-4 shrink-0" />
                <span className="truncate">Download Setup Package</span>
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
                  Gameplay Preview &amp; Proof
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
              <div className="p-3.5 rounded-xl sm:rounded-2xl bg-[#0a0d18] border border-white/10 space-y-1.5 text-slate-300">
                <div className="font-bold text-white text-xs sm:text-sm">Official Demonstration Channel</div>
                <p className="text-slate-400 leading-relaxed text-[11px] sm:text-xs">
                  Watch live gameplay footage, setup tutorials, and customer feedback on our verified channel.
                </p>
              </div>

              <a
                href={activeVideoModal.videoUrl || 'https://t.me'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full min-h-[44px] py-3 px-4 rounded-xl bg-gradient-to-r from-violet-600 via-pink-600 to-rose-600 hover:from-violet-500 hover:to-rose-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all shadow-lg shadow-violet-950/50"
              >
                <span className="truncate">Open Video Demonstration</span>
                <ExternalLink className="w-4 h-4 shrink-0" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Modernized Purchase Modal (with Android ID, Randomizer, Balance HUD & Key Confirmation) */}
      {selectedPurchase && (
        <PurchaseModal
          product={selectedPurchase.product}
          variant={selectedPurchase.variant}
          onClose={() => setSelectedPurchase(null)}
          onSuccess={handlePurchaseSuccess}
          onNavigateDeposit={() => {
            setSelectedPurchase(null);
            onNavigateDeposit();
          }}
        />
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
