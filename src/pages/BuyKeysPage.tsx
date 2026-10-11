import React, { useState, useEffect } from 'react';
import {
  Zap,
  Download,
  PlaySquare,
  Sparkles,
  ShoppingBag,
  CheckCircle,
  AlertCircle,
  AlertTriangle,
  Clock,
  ChevronDown,
  ChevronUp,
  Volume2,
  VolumeX,
  Plus,
  Minus,
  Star,
  ExternalLink,
  ShieldCheck,
  X,
  RefreshCw,
} from 'lucide-react';
import { Product, ProductVariant } from '../types/index.js';
import { api } from '../services/api.js';
import { useAuth } from '../context/AuthContext.js';
import { useToast } from '../context/ToastContext.js';
import { KeySuccessModal } from '../components/KeySuccessModal.js';

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

  const [products, setProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Filters from the video
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
    fetchProducts();

    // Auto-sync polling every 3 seconds so product additions, deletions and maintenance reflect live
    const interval = setInterval(() => {
      fetchProducts(true);
    }, 3000);

    return () => clearInterval(interval);
  }, [role]);

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
    const unitPrice = role === 'RESELLER' ? variant.resellerPrice : variant.price;
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
      const res = await api.createOrder(variant.id, undefined, qty);

      if (res?.deliveredKey || res?.key) {
        const delivered = res.deliveredKey || res.key;
        if (typeof res.newBalance === 'number') {
          updateBalanceLocally(res.newBalance);
        } else {
          updateBalanceLocally(balance - totalCost);
        }
        showToastSuccess('Key Delivered!', `${product.name} ready to use.`);

        setDeliveredKey({
          keyCode: delivered.keyCode,
          productName: product.name,
          durationLabel: variant.durationLabel,
          expiresAt: delivered.expiresAt,
        });

        // Refresh stock counts
        fetchProducts();
      }
    } catch (err: any) {
      showToastError('Purchase Failed', err.message || 'Could not complete key purchase.');
    } finally {
      setIsBuyingId(null);
    }
  };

  // Dynamic filter lists based on existing products + defaults
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

  // Filtering products
  const filteredProducts = products.filter(p => {
    const normGameFilter = gameFilter.toUpperCase().replace(/\s+/g, '');
    const pGame = (p.game || '').toUpperCase().replace(/\s+/g, '');
    const pCategory = (p.category || '').toUpperCase().replace(/\s+/g, '');
    const pName = (p.name || '').toUpperCase().replace(/\s+/g, '');

    const matchGame =
      gameFilter === 'ALL GAMES' ||
      pGame.includes(normGameFilter) ||
      pCategory.includes(normGameFilter) ||
      pName.includes(normGameFilter);

    const normDeviceFilter = deviceFilter.toUpperCase().replace(/\s+/g, '');
    const pDevice = (p.deviceType || '').toUpperCase().replace(/\s+/g, '');
    const pBadge = (p.badge || '').toUpperCase().replace(/\s+/g, '');

    const matchDevice =
      deviceFilter === 'ALL SYSTEMS' ||
      pDevice.includes(normDeviceFilter) ||
      pBadge.includes(normDeviceFilter) ||
      pName.includes(normDeviceFilter);

    return matchGame && matchDevice;
  });

  return (
    <div className="space-y-6 pb-28 md:pb-16 max-w-4xl mx-auto">
      {/* 1. TOP GAME CATEGORY FILTER (Row 1 from video) + Live Sync Action */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1 flex-1">
          {gameFilters.map(tab => {
            const isActive = gameFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setGameFilter(tab)}
                className={`px-4 sm:px-6 py-2.5 rounded-xl font-display font-extrabold text-xs sm:text-sm tracking-wider uppercase transition-all whitespace-nowrap border ${
                  isActive
                    ? 'bg-gradient-to-r from-red-600 to-rose-600 border-red-500 text-white shadow-lg shadow-rose-950/60 scale-[1.02]'
                    : 'bg-[#101018] border-white/10 text-slate-400 hover:text-white hover:border-white/20'
                }`}
              >
                {tab}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => fetchProducts(false)}
          className="px-3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-bold border border-white/10 transition-colors flex items-center gap-1.5 shrink-0"
          title="Refresh live catalog"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isLoading ? 'animate-spin text-rose-400' : ''}`} />
          <span className="hidden sm:inline">Sync Live</span>
        </button>
      </div>

      {/* 2. DEVICE FILTER (Row 2 from video) */}
      <div className="space-y-2">
        <div className="text-[11px] font-mono font-black text-[#f59e0b] uppercase tracking-wider">
          DEVICE FILTER
        </div>

        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
          {deviceFilters.map(dTab => {
            const isActive = deviceFilter === dTab;
            return (
              <button
                key={dTab}
                onClick={() => setDeviceFilter(dTab)}
                className={`px-3.5 py-1.5 rounded-lg font-mono text-[11px] font-bold uppercase transition-all whitespace-nowrap border ${
                  isActive
                    ? 'bg-red-950/60 border-rose-500 text-rose-300 shadow-sm shadow-rose-950'
                    : 'bg-[#0f0f16] border-white/10 text-slate-400 hover:text-slate-200'
                }`}
              >
                {dTab}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. SECTION TITLE (from video) */}
      <div className="flex items-center justify-between pt-1">
        <h3 className="font-mono font-black text-rose-500 text-xs sm:text-sm tracking-widest uppercase flex items-center gap-1.5">
          <span>&gt;&gt; MARKETPLACE / USER STOCK</span>
        </h3>
        <span className="text-[10px] font-mono text-slate-500">
          {filteredProducts.length} PRODUCTS ONLINE
        </span>
      </div>

      {/* 4. PRODUCTS LIST */}
      {isLoading ? (
        <div className="py-20 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-4 border-rose-500/20 border-t-rose-500 rounded-full animate-spin" />
          <p className="font-mono text-xs text-slate-400 tracking-wider">LOADING STORE CATALOG...</p>
        </div>
      ) : products.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#0d0d14] border border-white/5 space-y-4 shadow-xl">
          <div className="w-14 h-14 rounded-2xl bg-white/[0.03] border border-white/10 flex items-center justify-center mx-auto text-slate-500">
            <ShoppingBag className="w-7 h-7" />
          </div>
          <div className="space-y-1">
            <h4 className="text-white font-display font-black text-base uppercase tracking-wider">
              NO PRODUCTS CURRENTLY AVAILABLE
            </h4>
            <p className="text-slate-400 text-xs max-w-sm mx-auto">
              All demo products have been removed. Products will appear here once added through the admin control panel.
            </p>
          </div>
          {role === 'ADMIN' && onNavigateAdmin && (
            <button
              type="button"
              onClick={onNavigateAdmin}
              className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-950/60 inline-flex items-center gap-2"
            >
              <span>+ ADD PRODUCT IN ADMIN PANEL</span>
            </button>
          )}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="p-12 text-center rounded-3xl bg-[#0d0d14] border border-white/5 space-y-3">
          <AlertCircle className="w-10 h-10 text-slate-500 mx-auto" />
          <h4 className="text-white font-bold text-sm">NO PRODUCTS MATCH THIS FILTER</h4>
          <p className="text-slate-400 text-xs max-w-sm mx-auto">
            Try switching game categories or device filters above.
          </p>
          <button
            onClick={() => {
              setGameFilter('ALL GAMES');
              setDeviceFilter('ALL SYSTEMS');
            }}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold uppercase tracking-wider"
          >
            Reset Filters
          </button>
        </div>
      ) : (
        <div className="space-y-6">
          {filteredProducts.map(product => {
            const isExpanded = !!expandedMap[product.id];
            const features = product.features || ['Headshot', 'Location', 'Fast Revive'];

            return (
              <div
                key={product.id}
                className="bg-[#0b0b12] border border-white/10 rounded-3xl overflow-hidden shadow-2xl shadow-black/80 hover:border-rose-500/30 transition-all duration-300"
              >
                {/* Product Banner Container */}
                <div className="relative aspect-[16/8] sm:aspect-[16/7] w-full bg-slate-900 overflow-hidden">
                  <img
                    src={
                      product.imageUrl ||
                      'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80'
                    }
                    alt={product.name}
                    className="w-full h-full object-cover opacity-85 hover:scale-105 transition-transform duration-700"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-[#0b0b12] via-transparent to-black/60" />

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                    <span className="bg-red-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-md shadow-md">
                      {product.deviceType || 'NONROOT'}
                    </span>
                    <span className="bg-sky-600 text-white text-[10px] font-black uppercase px-2.5 py-1 rounded-md shadow-md">
                      {product.game || 'FREEFIRE'}
                    </span>
                  </div>

                  <div className="absolute top-3 right-3 flex items-center gap-1.5 z-10">
                    <span className="bg-[#fbbf24] text-black text-[10px] font-black uppercase px-2 py-1 rounded-md flex items-center gap-1 shadow-md">
                      <Star className="w-3 h-3 fill-black text-black" />
                      <span>{product.badge || 'STAR'}</span>
                    </span>
                  </div>

                  {/* Centered Under Maintenance Button / Overlay on Product Photo */}
                  {product.isUnderMaintenance && (
                    <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/70 backdrop-blur-[2px] p-4">
                      <div className="px-5 py-2.5 rounded-2xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black border-2 border-amber-300 font-display font-black text-xs sm:text-sm uppercase tracking-wider flex items-center gap-2 shadow-[0_0_30px_rgba(245,158,11,0.8)] animate-pulse">
                        <AlertTriangle className="w-4 h-4 text-black fill-black shrink-0" />
                        <span>UNDER MAINTENANCE</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Card Body */}
                <div className="p-4 sm:p-6 space-y-4">
                  {/* Product Title */}
                  <h4 className="font-display font-black text-lg sm:text-xl text-white uppercase text-center tracking-wide flex items-center justify-center gap-2">
                    <span>{product.name}</span>
                    {product.isUnderMaintenance && (
                      <span className="text-[9px] font-mono px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase">
                        MAINTENANCE
                      </span>
                    )}
                  </h4>

                  {/* Available Plan Durations Preview Badges */}
                  {product.variants && product.variants.length > 0 && (
                    <div className="flex flex-wrap items-center justify-center gap-1.5 pt-0.5">
                      {product.variants.map(v => (
                        <span
                          key={v.id}
                          className="px-2.5 py-1 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 font-mono text-[10px] font-bold uppercase tracking-wider flex items-center gap-1"
                        >
                          <Clock className="w-3 h-3 text-rose-400" />
                          <span>{v.durationLabel}</span>
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Feature Pills with Red Lightning Bolts */}
                  <div className="space-y-2">
                    {features.map((feat, idx) => (
                      <div
                        key={idx}
                        className="bg-[#12121c] border border-white/5 rounded-2xl px-4 py-3 flex items-center gap-3 shadow-inner"
                      >
                        <Zap className="w-4 h-4 text-rose-500 fill-rose-500 shrink-0" />
                        <span className="text-white font-bold text-xs sm:text-sm tracking-wide">
                          {feat}
                        </span>
                      </div>
                    ))}
                  </div>

                  {/* Side-by-side action buttons */}
                  <div className="grid grid-cols-2 gap-3 pt-1">
                    <button
                      type="button"
                      onClick={() => setActiveFileModal(product)}
                      className="py-3 px-3 rounded-2xl bg-[#141420] hover:bg-[#1a1a2b] border border-white/10 active:scale-95 text-slate-200 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                      <Download className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">CHECK UPDATE FILE</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setActiveVideoModal(product)}
                      className="py-3 px-3 rounded-2xl bg-[#141420] hover:bg-[#1a1a2b] border border-white/10 active:scale-95 text-slate-200 text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2"
                    >
                      <PlaySquare className="w-4 h-4 text-rose-400 shrink-0" />
                      <span className="truncate">CHECK VIDEO / FEEDBACK</span>
                    </button>
                  </div>

                  {/* Under Maintenance Notice & Button OR Normal Purchase Button */}
                  {product.isUnderMaintenance ? (
                    <div className="space-y-2.5 pt-1">
                      <button
                        type="button"
                        disabled
                        className="w-full py-4 rounded-2xl bg-gradient-to-r from-amber-600/30 via-orange-600/30 to-amber-600/30 border border-amber-500/50 text-amber-300 font-display font-black uppercase tracking-widest text-xs sm:text-sm flex items-center justify-center gap-2 cursor-not-allowed shadow-[0_0_20px_rgba(245,158,11,0.2)]"
                      >
                        <AlertTriangle className="w-5 h-5 text-amber-400 animate-bounce" />
                        <span>UNDER MAINTENANCE · PURCHASING PAUSED</span>
                      </button>
                      <div className="p-3 rounded-2xl bg-amber-950/30 border border-amber-500/30 text-center space-y-1">
                        <div className="text-[11px] font-mono text-amber-300 font-bold uppercase tracking-wider flex items-center justify-center gap-1.5">
                          <AlertTriangle className="w-3.5 h-3.5" />
                          <span>MAINTENANCE STATUS NOTICE</span>
                        </div>
                        <p className="text-xs text-amber-200/90 leading-relaxed font-semibold">
                          {product.maintenanceNotice || '⚠️ This product is currently undergoing game server updates. New key purchases are temporarily paused.'}
                        </p>
                      </div>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleAccordion(product.id)}
                      className="w-full py-4 rounded-2xl bg-gradient-to-r from-red-600 via-rose-600 to-red-600 hover:from-red-500 hover:to-rose-500 active:scale-[0.99] text-white font-black uppercase tracking-widest text-sm sm:text-base shadow-[0_0_30px_rgba(225,29,72,0.45)] transition-all flex items-center justify-center gap-2 group"
                    >
                      <span>PURCHASE KEY</span>
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5 transition-transform group-hover:-translate-y-0.5" />
                      ) : (
                        <ChevronDown className="w-5 h-5 transition-transform group-hover:translate-y-0.5" />
                      )}
                    </button>
                  )}

                  {/* 5. ACCORDION DURATION LIST (Shown in video when PURCHASE KEY is tapped) */}
                  {isExpanded && (
                    <div className="pt-2 space-y-2.5 animate-in slide-in-from-top-3 fade-in duration-200">
                      {product.variants && product.variants.length > 0 ? (
                        product.variants.map(variant => {
                          const qty = getQuantity(variant.id);
                          const unitPrice =
                            role === 'RESELLER' ? variant.resellerPrice : variant.price;
                          const totalPrice = unitPrice * qty;
                          const isBuying = isBuyingId === variant.id;

                          return (
                            <div
                              key={variant.id}
                              className="bg-[#12121c] border border-white/10 hover:border-rose-500/30 rounded-2xl p-3.5 flex items-center justify-between gap-3 transition-colors shadow-sm"
                            >
                              {/* Left: Duration Label & Price */}
                              <div className="space-y-0.5">
                                <div className="text-white font-black text-xs sm:text-sm">
                                  {variant.durationLabel}
                                </div>
                                <div className="text-rose-400 font-extrabold text-sm sm:text-base font-mono">
                                  ₹{totalPrice.toFixed(2)}
                                  {qty > 1 && (
                                    <span className="text-[10px] text-slate-400 font-normal ml-1">
                                      (₹{unitPrice.toFixed(2)}/ea)
                                    </span>
                                  )}
                                </div>
                              </div>

                              {/* Right: Quantity Selector & BUY button */}
                              <div className="flex items-center gap-2 sm:gap-3">
                                {/* Quantity selector box */}
                                <div className="flex items-center bg-[#0a0a0f] border border-white/10 rounded-xl px-1.5 py-1">
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(variant.id, -1)}
                                    className="p-1 text-slate-400 hover:text-white active:scale-90"
                                  >
                                    <Minus className="w-3 h-3" />
                                  </button>
                                  <span className="w-6 text-center text-xs font-mono font-bold text-white">
                                    {qty}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => updateQuantity(variant.id, 1)}
                                    className="p-1 text-slate-400 hover:text-white active:scale-90"
                                  >
                                    <Plus className="w-3 h-3" />
                                  </button>
                                </div>

                                {/* BUY button */}
                                <button
                                  type="button"
                                  onClick={() => handlePurchase(product, variant)}
                                  disabled={isBuying}
                                  className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 active:scale-95 text-white font-black text-xs uppercase tracking-wider shadow-lg shadow-rose-950/60 transition-all flex items-center justify-center min-w-[68px]"
                                >
                                  {isBuying ? (
                                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                  ) : (
                                    <span>BUY</span>
                                  )}
                                </button>
                              </div>
                            </div>
                          );
                        })
                      ) : (
                        <div className="text-center py-4 text-xs text-slate-400 font-mono">
                          NO ACTIVE DURATION VARIANTS CONFIGURED
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

      {/* 6. MODAL: CHECK UPDATE FILE */}
      {activeFileModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setActiveFileModal(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in"
          />
          <div className="relative w-full max-w-md bg-[#0e0e17] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <Download className="w-5 h-5 text-emerald-400" />
                <h4 className="font-display font-black text-sm text-white">UPDATE FILE & LOADER</h4>
              </div>
              <button
                onClick={() => setActiveFileModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <p className="text-slate-300 font-medium">
                Latest stable build for <span className="text-rose-400 font-bold">{activeFileModal.name}</span>.
              </p>

              <div className="bg-[#141420] border border-white/5 rounded-2xl p-4 space-y-2 font-mono text-[11px]">
                <div className="flex justify-between">
                  <span className="text-slate-400">VERSION:</span>
                  <span className="text-emerald-400 font-bold">v5.2.0 (OB55 Safe)</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">SECURITY:</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <ShieldCheck className="w-3.5 h-3.5" /> 100% CLEAN
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-400">TARGET:</span>
                  <span className="text-white">{activeFileModal.deviceType || 'NONROOT'}</span>
                </div>
              </div>

              <a
                href={activeFileModal.updateFileUrl || 'https://t.me'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/40"
              >
                <Download className="w-4 h-4" />
                <span>DOWNLOAD FILE NOW</span>
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 7. MODAL: CHECK VIDEO / FEEDBACK */}
      {activeVideoModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setActiveVideoModal(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in"
          />
          <div className="relative w-full max-w-md bg-[#0e0e17] border border-white/10 rounded-3xl p-6 shadow-2xl z-10 space-y-4">
            <div className="flex items-center justify-between border-b border-white/10 pb-3">
              <div className="flex items-center gap-2">
                <PlaySquare className="w-5 h-5 text-rose-400" />
                <h4 className="font-display font-black text-sm text-white">GAMEPLAY VIDEO & FEEDBACK</h4>
              </div>
              <button
                onClick={() => setActiveVideoModal(null)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div className="aspect-video w-full rounded-2xl bg-black border border-white/10 relative overflow-hidden flex items-center justify-center group">
                <img
                  src={activeVideoModal.imageUrl}
                  alt="Gameplay Proof"
                  className="w-full h-full object-cover opacity-50"
                />
                <a
                  href={activeVideoModal.videoUrl || 'https://t.me'}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-14 h-14 rounded-full bg-rose-600 text-white flex items-center justify-center shadow-xl shadow-rose-950 hover:scale-110 active:scale-95 transition-all z-10"
                >
                  <PlaySquare className="w-6 h-6 fill-white" />
                </a>
              </div>

              <div className="bg-[#141420] border border-white/5 rounded-2xl p-3.5 space-y-1 text-slate-300">
                <div className="text-[11px] font-bold text-amber-400 flex items-center gap-1">
                  ⭐⭐⭐⭐⭐ Customer Verified Proof
                </div>
                <p className="text-[11px] text-slate-400">
                  Full headshot and fast revive gameplay preview on official Telegram channel.
                </p>
              </div>

              <a
                href={activeVideoModal.videoUrl || 'https://t.me'}
                target="_blank"
                rel="noopener noreferrer"
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-950/40"
              >
                <span>OPEN OFFICIAL VIDEO PROOF</span>
                <ExternalLink className="w-4 h-4" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* 8. MODAL: INSUFFICIENT BALANCE */}
      {insufficientModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            onClick={() => setInsufficientModal(null)}
            className="fixed inset-0 bg-black/80 backdrop-blur-sm animate-in fade-in"
          />
          <div className="relative w-full max-w-sm bg-[#0e0e17] border border-rose-500/40 rounded-3xl p-6 shadow-2xl z-10 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 flex items-center justify-center mx-auto">
              <ShoppingBag className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1">
              <h4 className="font-display font-black text-base text-white">INSUFFICIENT BALANCE</h4>
              <p className="text-xs text-slate-400">
                You need <span className="text-rose-400 font-bold font-mono">₹{insufficientModal.required.toFixed(2)}</span>, but your wallet balance is <span className="text-white font-bold font-mono">₹{insufficientModal.current.toFixed(2)}</span>.
              </p>
            </div>

            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setInsufficientModal(null)}
                className="flex-1 py-3 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setInsufficientModal(null);
                  onNavigateDeposit();
                }}
                className="flex-1 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-black uppercase tracking-wider shadow-lg shadow-rose-950/60"
              >
                Deposit Funds
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 9. MODAL: DELIVERED KEY SUCCESS */}
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
