import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Users,
  ShoppingBag,
  KeyRound,
  CreditCard,
  Settings,
  Activity,
  Plus,
  Trash2,
  Edit2,
  Check,
  X,
  RefreshCw,
  Search,
  Filter,
  DollarSign,
  TrendingUp,
  AlertTriangle,
  Zap,
  CheckCircle2,
  Clock,
  Layers,
  FileText,
  Sliders,
  Radio,
  Terminal,
  Code,
  QrCode,
  Smartphone,
  Sparkles,
  Copy,
  ExternalLink,
  Image as ImageIcon,
  Upload,
  Camera,
  FolderPlus,
  ArrowDownCircle,
  UserCheck,
  History,
  Eye,
  Wallet,
  Palette,
  Megaphone,
  Database,
  Package,
  Globe,
  Monitor,
  Layout,
  SlidersHorizontal,
  MessageSquare,
  Send,
  Bell,
  Save,
  RotateCcw,
  Sparkle,
} from 'lucide-react';
import { api } from '../services/api.js';
import { useToast } from '../context/ToastContext.js';
import { useSite } from '../context/SiteContext.js';
import { AdminStats, Product, ProductVariant, SiteCustomizationConfig } from '../types/index.js';

const ALBUM_PRESETS = [
  {
    name: 'Free Fire V5 Bala Mod',
    game: 'FREEFIRE',
    url: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Free Fire Immo Bloody',
    game: 'FREEFIRE',
    url: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'iOS Drip Wire + Nonroot',
    game: 'FREEFIRE',
    url: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Troll Modz FF OB55',
    game: 'FREEFIRE',
    url: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Carrom Pool VIP Aim Laser',
    game: 'CARROM POOL',
    url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'BGMI / PUBG VIP Aimbot',
    game: 'BGMI',
    url: 'https://images.unsplash.com/photo-1579373903781-fd5c0c30c4cd?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Call of Duty Warzone VIP',
    game: 'COD',
    url: 'https://images.unsplash.com/photo-1550745165-9bc0b252726f?auto=format&fit=crop&w=800&q=80',
  },
  {
    name: 'Cyberpunk Neon Bypass',
    game: 'CYBERPUNK',
    url: 'https://images.unsplash.com/photo-1526374965328-7f61d4dc18c5?auto=format&fit=crop&w=800&q=80',
  },
];

export const AdminPage: React.FC = () => {
  const { success: showToastSuccess, error: showToastError } = useToast();

  const [activeTab, setActiveTab] = useState<
    | 'dashboard'
    | 'customization'
    | 'users'
    | 'products'
    | 'variants'
    | 'user_reseller_api'
    | 'keys'
    | 'deposits'
    | 'orders'
    | 'gateway'
    | 'reseller'
    | 'logs'
  >('dashboard');

  // User Reseller API Management States
  const [editingPidMap, setEditingPidMap] = useState<Record<string, string>>({});
  const [savingPidId, setSavingPidId] = useState<string | null>(null);
  const [userApiSearch, setUserApiSearch] = useState('');

  const { siteConfig: globalSiteConfig, updateSiteConfigLocally } = useSite();
  const [siteForm, setSiteForm] = useState<SiteCustomizationConfig>(globalSiteConfig);
  const [isSavingSite, setIsSavingSite] = useState(false);
  const [customizationSubTab, setCustomizationSubTab] = useState<
    'branding' | 'theme' | 'announcement' | 'hero' | 'support' | 'rules' | 'admin' | 'preview'
  >('branding');
  const siteLogoFileInputRef = useRef<HTMLInputElement | null>(null);

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [keys, setKeys] = useState<any[]>([]);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [gatewayConfig, setGatewayConfig] = useState<any>({});
  const [resellerConfig, setResellerConfig] = useState<any>({});
  const [isLoading, setIsLoading] = useState(true);

  // User Search & Real-time Details
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [selectedUserDetail, setSelectedUserDetail] = useState<any | null>(null);

  // Modal / Form States
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [isEditingProduct, setIsEditingProduct] = useState(false);
  const [isCreatingProduct, setIsCreatingProduct] = useState(false);

  // New Product Form
  const [newProdName, setNewProdName] = useState('');
  const [newProdGame, setNewProdGame] = useState('');
  const [newProdDesc, setNewProdDesc] = useState('');
  const [newProdBadge, setNewProdBadge] = useState('STAR');
  const [newProdCategory, setNewProdCategory] = useState('FREEFIRE');
  const [newProdDeviceType, setNewProdDeviceType] = useState('NONROOT');
  const [newProdImageUrl, setNewProdImageUrl] = useState(ALBUM_PRESETS[0].url);
  const [newProdFeatures, setNewProdFeatures] = useState('Headshot, Location, Fast Revive');
  const [newProdUpdateFileUrl, setNewProdUpdateFileUrl] = useState('');
  const [newProdVideoUrl, setNewProdVideoUrl] = useState('');
  const [newProdExternalPid, setNewProdExternalPid] = useState('');
  const [newProdIsUnderMaintenance, setNewProdIsUnderMaintenance] = useState(false);
  const [newProdMaintenanceNotice, setNewProdMaintenanceNotice] = useState('');
  const [newProdAlbumTab, setNewProdAlbumTab] = useState<'upload' | 'preset' | 'url'>('upload');

  // Edit Product Form
  const [editProdName, setEditProdName] = useState('');
  const [editProdGame, setEditProdGame] = useState('');
  const [editProdDesc, setEditProdDesc] = useState('');
  const [editProdBadge, setEditProdBadge] = useState('');
  const [editProdCategory, setEditProdCategory] = useState('FREEFIRE');
  const [editProdDeviceType, setEditProdDeviceType] = useState('NONROOT');
  const [editProdImageUrl, setEditProdImageUrl] = useState('');
  const [editProdFeatures, setEditProdFeatures] = useState('');
  const [editProdUpdateFileUrl, setEditProdUpdateFileUrl] = useState('');
  const [editProdVideoUrl, setEditProdVideoUrl] = useState('');
  const [editProdExternalPid, setEditProdExternalPid] = useState('');
  const [editProdIsUnderMaintenance, setEditProdIsUnderMaintenance] = useState(false);
  const [editProdMaintenanceNotice, setEditProdMaintenanceNotice] = useState('');
  const [editProdAlbumTab, setEditProdAlbumTab] = useState<'upload' | 'preset' | 'url'>('upload');

  // File input refs for album uploads
  const newFileInputRef = useRef<HTMLInputElement | null>(null);
  const editFileInputRef = useRef<HTMLInputElement | null>(null);

  // Deletion Confirmation States (In-App Modal replacing blocked window.confirm)
  const [productToDelete, setProductToDelete] = useState<Product | null>(null);
  const [variantToDelete, setVariantToDelete] = useState<any | null>(null);
  const [keyToDelete, setKeyToDelete] = useState<any | null>(null);
  const [isDeletingLoading, setIsDeletingLoading] = useState(false);

  // Variant create modal
  const [isCreatingVariant, setIsCreatingVariant] = useState(false);
  const [selectedProdForVar, setSelectedProdForVar] = useState('');
  const [varEntryMode, setVarEntryMode] = useState<'single' | 'batch'>('single');
  const [variantProductFilter, setVariantProductFilter] = useState<string>('ALL');
  const [varDurationLabel, setVarDurationLabel] = useState('1 Day');
  const [varDurationHours, setVarDurationHours] = useState(24);
  const [varPrice, setVarPrice] = useState(50);
  const [varResellerPrice, setVarResellerPrice] = useState(38);
  const [varExternalPid, setVarExternalPid] = useState('');
  const [varExternalDuration, setVarExternalDuration] = useState('');

  // Batch Multi-Duration State
  const [batchDiscountPct, setBatchDiscountPct] = useState<number>(25);
  const [batchPidPrefix, setBatchPidPrefix] = useState<string>('');
  const [batchDurations, setBatchDurations] = useState([
    { label: '1 Hours', hours: 1, price: 20, selected: true, pidSuffix: '1H' },
    { label: '3 Hours', hours: 3, price: 70, selected: true, pidSuffix: '3H' },
    { label: '6 Hours', hours: 6, price: 120, selected: true, pidSuffix: '6H' },
    { label: '1 DAYS', hours: 24, price: 300, selected: true, pidSuffix: '1D' },
    { label: '7 DAYS', hours: 168, price: 1100, selected: true, pidSuffix: '7D' },
    { label: '30 DAYS', hours: 720, price: 2500, selected: true, pidSuffix: '30D' },
  ]);
  const [isBatchCreating, setIsBatchCreating] = useState(false);

  // Edit duration variant
  const [editingVariant, setEditingVariant] = useState<any | null>(null);
  const [editVarDurationLabel, setEditVarDurationLabel] = useState('');
  const [editVarDurationHours, setEditVarDurationHours] = useState(24);
  const [editVarPrice, setEditVarPrice] = useState(0);
  const [editVarResellerPrice, setEditVarResellerPrice] = useState(0);
  const [editVarExternalPid, setEditVarExternalPid] = useState('');
  const [editVarExternalDuration, setEditVarExternalDuration] = useState('');

  // Bulk import keys form
  const [isBulkImporting, setIsBulkImporting] = useState(false);
  const [bulkImportProdId, setBulkImportProdId] = useState('');
  const [bulkImportVarId, setBulkImportVarId] = useState('');
  const [bulkRawKeys, setBulkRawKeys] = useState('');

  // Generate single keys
  const [isGeneratingKeys, setIsGeneratingKeys] = useState(false);
  const [genCount, setGenCount] = useState(5);

  // User Balance adjustment
  const [adjustingUser, setAdjustingUser] = useState<any | null>(null);
  const [adjustAmount, setAdjustAmount] = useState('');
  const [adjustReason, setAdjustReason] = useState('');

  // Key generator live test runner states
  const [testProdPid, setTestProdPid] = useState('PRODUCT_PID_ID');
  const [testDuration, setTestDuration] = useState('1 Day');
  const [testAndroidId, setTestAndroidId] = useState('0b9b969bc2e7997b');
  const [isTestingKeyGen, setIsTestingKeyGen] = useState(false);
  const [keyGenTestResult, setKeyGenTestResult] = useState<any | null>(null);

  // Payment Gateway live order test runner states
  const [testFgAmount, setTestFgAmount] = useState<number>(500.00);
  const [testFgCustomerName, setTestFgCustomerName] = useState('Ramesh Kumar');
  const [testFgCustomerEmail, setTestFgCustomerEmail] = useState('ramesh@example.com');
  const [testFgNote, setTestFgNote] = useState('Payment for Order #1024');
  const [testFgMethod, setTestFgMethod] = useState<'POST' | 'GET'>('POST');
  const [isTestingFg, setIsTestingFg] = useState(false);
  const [fgTestResult, setFgTestResult] = useState<any | null>(null);

  const loadAllAdminData = async () => {
    try {
      setIsLoading(true);
      const [
        statsRes,
        usersRes,
        prodRes,
        keysRes,
        depRes,
        ordRes,
        gwRes,
        resRes,
        siteRes,
        logsRes,
      ] = await Promise.all([
        api.getAdminStats().catch(() => null),
        api.getAdminUsers().catch(() => ({ users: [] })),
        api.getProducts().catch(() => ({ products: [] })),
        api.getAdminKeys().catch(() => ({ keys: [] })),
        api.getAdminDeposits().catch(() => ({ deposits: [] })),
        api.getAdminOrders().catch(() => ({ orders: [] })),
        api.getGatewaySettings().catch(() => ({ config: {} })),
        api.getResellerSettings().catch(() => ({ config: {} })),
        api.getSiteSettings().catch(() => ({ config: null })),
        api.getAdminLogs().catch(() => ({ logs: [] })),
      ]);

      if (statsRes) setStats(statsRes);
      if (usersRes?.users) setUsers(usersRes.users);
      if (prodRes?.products) {
        setProducts(prodRes.products);
        if (prodRes.products.length > 0 && !selectedProdForVar) {
          setSelectedProdForVar(prodRes.products[0].id);
          setBulkImportProdId(prodRes.products[0].id);
          if (prodRes.products[0].variants?.[0]) {
            setBulkImportVarId(prodRes.products[0].variants[0].id);
          }
        }
      }
      if (keysRes?.keys) setKeys(keysRes.keys);
      if (depRes?.deposits) setDeposits(depRes.deposits);
      if (ordRes?.orders) setOrders(ordRes.orders);
      if (gwRes?.config) setGatewayConfig(gwRes.config);
      if (resRes?.config) setResellerConfig(resRes.config);
      if (siteRes?.config) {
        setSiteForm(prev => ({ ...prev, ...siteRes.config }));
        updateSiteConfigLocally(siteRes.config);
      }
      if (logsRes?.logs) setLogs(logsRes.logs);
    } catch (err: any) {
      showToastError('Failed to load admin data', err.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadAllAdminData();
  }, []);

  // Save Website & Admin Panel Customizations
  const handleSaveSiteSettings = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    try {
      setIsSavingSite(true);
      const res = await api.updateSiteSettings(siteForm);
      if (res?.config) {
        setSiteForm(res.config);
        updateSiteConfigLocally(res.config);
      } else {
        updateSiteConfigLocally(siteForm);
      }
      showToastSuccess('Website & Admin Panel Customizations Published Live!');
      loadAllAdminData();
    } catch (err: any) {
      showToastError('Failed to save customization settings', err.message);
    } finally {
      setIsSavingSite(false);
    }
  };

  // Instant 1-Click Toggle for Customization Switches (Saves and Syncs Immediately)
  const handleInstantToggle = async (
    field: keyof SiteCustomizationConfig,
    newValue: boolean,
    label: string
  ) => {
    const updatedForm = { ...siteForm, [field]: newValue };
    setSiteForm(updatedForm);
    updateSiteConfigLocally({ [field]: newValue });
    try {
      await api.updateSiteSettings({ [field]: newValue });
      showToastSuccess(
        newValue ? `${label} TURNED ON` : `${label} TURNED OFF`,
        newValue ? 'Active across the entire platform' : 'Disabled and hidden immediately'
      );
    } catch (err: any) {
      showToastError(`Failed to update ${label}`, err.message);
    }
  };

  // Instant 1-Click Toggle for Product Under Maintenance
  const handleToggleProductMaintenance = async (product: Product) => {
    try {
      const nextMaintenance = !product.isUnderMaintenance;
      await api.toggleProductMaintenance(product.id, nextMaintenance);
      setProducts(prev =>
        prev.map(p => (p.id === product.id ? { ...p, isUnderMaintenance: nextMaintenance } : p))
      );
      showToastSuccess(
        nextMaintenance
          ? `⚠️ ${product.name} IS NOW UNDER MAINTENANCE`
          : `✓ ${product.name} IS NOW ACTIVE & AVAILABLE`,
        nextMaintenance
          ? 'Maintenance badge placed in photo center & purchasing paused'
          : 'Purchasing reopened for all users'
      );
    } catch (err: any) {
      showToastError('Failed to toggle product maintenance', err.message);
    }
  };

  // Reset to Default Factory Brand Settings
  const handleResetSiteDefaults = async () => {
    const defaults: SiteCustomizationConfig = {
      siteTitle: 'Nexa Panel',
      siteTagline: 'Gaming Digital Reseller Platform',
      logoUrl: '',
      faviconUrl: '',
      currencySymbol: '₹',
      currencyCode: 'INR',
      footerText: 'The premier automated digital keys and panels reseller infrastructure.',
      copyrightText: '© 2026 Nexa Gaming Systems. All rights reserved.',
      accentTheme: 'crimson',
      backgroundStyle: 'deep-slate',
      glowIntensity: 'vibrant',
      borderRadius: 'rounded',
      fontStyle: 'ultra-bold',
      isAnnouncementEnabled: true,
      announcementText: '🔥 OB55 UPDATE ACTIVE! Automated Instant Digital Key Delivery 24/7 with Live Reseller API',
      announcementType: 'promo',
      announcementLink: '',
      isMarqueeEnabled: true,
      marqueeText: '⚡ Fast UPI Auto Deposit | Instant Digital Key Delivery | Non-Root & iOS Supported | 100% Anti-Ban Menus | 24/7 Live Support',
      heroTitle: 'DOMINATE THE GAME WITH PRO DIGITAL PANELS',
      heroSubtitle: 'Instant Key Delivery · Automated Wallet Deposits · Wholesale VIP Pricing for Resellers',
      heroBadgeText: 'OFFICIAL GAMING RESELLER PLATFORM',
      telegramChannelUrl: 'https://t.me/nexa_gaming_official',
      telegramSupportUser: '@nexa_support_admin',
      whatsappNumber: '+918056317218',
      youtubeChannelUrl: '',
      discordInviteUrl: '',
      contactEmail: 'support@nexapanel.com',
      quickSupportWidgetEnabled: true,
      minDepositAmount: 1,
      resellerUpgradePrice: 299,
      referralCommissionPct: 5,
      accountSafetyBalanceText: 'Keep ₹500+ balance for account safety.',
      adminPanelTitle: 'NEXA SYSTEM CONTROL PANEL',
      adminHeaderNotice: 'SUPER ADMIN LIVE REALTIME SESSION ACTIVE',
      adminAccentColor: '#e11d48',
      adminStatusBadge: 'SUPER PRIVILEGES',
      adminThemePreset: 'crimson-admin',
      adminShortcutsEnabled: true,
    };
    setSiteForm(defaults);
    try {
      await api.updateSiteSettings(defaults);
      updateSiteConfigLocally(defaults);
      showToastSuccess('Reset to Factory Brand Configuration');
    } catch (err: any) {
      showToastError('Failed to reset defaults', err.message);
    }
  };

  // One-Click Preset Theme Swapper
  const handleApplyThemePreset = (presetKey: string) => {
    switch (presetKey) {
      case 'crimson':
        setSiteForm(prev => ({
          ...prev,
          accentTheme: 'crimson',
          backgroundStyle: 'deep-slate',
          glowIntensity: 'vibrant',
          adminAccentColor: '#e11d48',
          adminThemePreset: 'crimson-admin',
        }));
        showToastSuccess('Applied Nexa Crimson Theme');
        break;
      case 'cyberpunk':
        setSiteForm(prev => ({
          ...prev,
          accentTheme: 'cyberpunk',
          backgroundStyle: 'oled-black',
          glowIntensity: 'extreme',
          adminAccentColor: '#06b6d4',
          adminThemePreset: 'cyber-admin',
        }));
        showToastSuccess('Applied Cyberpunk Neon Matrix Theme');
        break;
      case 'emerald':
        setSiteForm(prev => ({
          ...prev,
          accentTheme: 'emerald',
          backgroundStyle: 'oled-black',
          glowIntensity: 'extreme',
          adminAccentColor: '#10b981',
          adminThemePreset: 'emerald-admin',
        }));
        showToastSuccess('Applied Matrix Cyber Green Theme');
        break;
      case 'amber':
        setSiteForm(prev => ({
          ...prev,
          accentTheme: 'amber',
          backgroundStyle: 'midnight-void',
          glowIntensity: 'vibrant',
          adminAccentColor: '#f59e0b',
          adminThemePreset: 'gold-admin',
        }));
        showToastSuccess('Applied Royal Gold VIP Theme');
        break;
      case 'violet':
        setSiteForm(prev => ({
          ...prev,
          accentTheme: 'violet',
          backgroundStyle: 'midnight-void',
          glowIntensity: 'vibrant',
          adminAccentColor: '#8b5cf6',
          adminThemePreset: 'obsidian-admin',
        }));
        showToastSuccess('Applied Obsidian Violet Void Theme');
        break;
      case 'blood':
        setSiteForm(prev => ({
          ...prev,
          accentTheme: 'blood',
          backgroundStyle: 'oled-black',
          glowIntensity: 'extreme',
          adminAccentColor: '#ea580c',
          adminThemePreset: 'crimson-admin',
        }));
        showToastSuccess('Applied Blood Flame Warzone Theme');
        break;
      case 'blue':
        setSiteForm(prev => ({
          ...prev,
          accentTheme: 'blue',
          backgroundStyle: 'deep-slate',
          glowIntensity: 'vibrant',
          adminAccentColor: '#2563eb',
          adminThemePreset: 'cyber-admin',
        }));
        showToastSuccess('Applied Sapphire Blue Theme');
        break;
    }
  };

  // Logo File Upload handler to base64 Data URI
  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      showToastError('File Too Large', 'Please upload a logo image smaller than 2MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      setSiteForm(prev => ({ ...prev, logoUrl: result }));
      showToastSuccess('Custom Logo Loaded', 'Click Save to publish live');
    };
    reader.readAsDataURL(file);
  };

  // Update User Role
  const handleUpdateRole = async (userId: string, newRole: string) => {
    try {
      await api.updateUserRole(userId, newRole);
      showToastSuccess('User Role Updated');
      loadAllAdminData();
    } catch (err: any) {
      showToastError('Failed to update role', err.message);
    }
  };

  // Adjust balance
  const handleAdjustBalanceSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingUser) return;
    try {
      await api.adjustUserBalance(adjustingUser.id, parseFloat(adjustAmount), adjustReason);
      showToastSuccess('Balance Adjusted');
      setAdjustingUser(null);
      setAdjustAmount('');
      setAdjustReason('');
      loadAllAdminData();
    } catch (err: any) {
      showToastError('Adjustment failed', err.message);
    }
  };

  // Toggle user ban
  const handleToggleBan = async (userId: string) => {
    try {
      const res = await api.toggleUserBan(userId);
      showToastSuccess(res.message);
      loadAllAdminData();
    } catch (err: any) {
      showToastError('Failed to toggle ban', err.message);
    }
  };

  // Real-time user polling when on Users tab
  useEffect(() => {
    if (activeTab !== 'users') return;
    const interval = setInterval(() => {
      api.getAdminUsers(userSearchQuery || undefined).then(res => {
        if (res?.users) {
          setUsers(res.users);
        }
      }).catch(() => {});
    }, 4000);

    return () => clearInterval(interval);
  }, [activeTab, userSearchQuery]);

  // Image upload handler from device / album
  const handleImageFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isEdit = false) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 5 * 1024 * 1024) {
      showToastError('File Too Large', 'Please select an image file under 5MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      if (isEdit) {
        setEditProdImageUrl(dataUrl);
      } else {
        setNewProdImageUrl(dataUrl);
      }
      showToastSuccess('Photo Loaded From Album', `Selected: ${file.name}`);
    };
    reader.onerror = () => {
      showToastError('Upload Error', 'Failed to read image file from device.');
    };
    reader.readAsDataURL(file);
  };

  // Quick 1-click credit
  const handleQuickCredit = async (userObj: any, amountToAdd: number) => {
    try {
      const res = await api.adjustUserBalance(userObj.id, amountToAdd, `Quick Admin Credit +₹${amountToAdd}`);
      showToastSuccess(`Credited +₹${amountToAdd} to @${userObj.username}`, `New Balance: ₹${res.currentBalance.toFixed(2)}`);
      setUsers(prev => prev.map(u => (u.id === userObj.id ? { ...u, balance: res.currentBalance } : u)));
    } catch (err: any) {
      showToastError('Credit failed', err.message);
    }
  };

  // Create Product
  const handleCreateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProdName.trim()) {
      showToastError('Validation Error', 'Please enter a product title.');
      return;
    }
    try {
      const feats = newProdFeatures
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const finalGame = (newProdGame.trim() || newProdCategory || 'FREEFIRE').trim();
      const res = await api.createProduct({
        name: newProdName.trim(),
        game: finalGame,
        category: newProdCategory || 'FREEFIRE',
        deviceType: newProdDeviceType || 'NONROOT',
        description: newProdDesc,
        badge: newProdBadge || undefined,
        imageUrl: newProdImageUrl || undefined,
        features: feats.length > 0 ? feats : ['Auto Headshot', 'Location Pinpoint', 'Anti-Ban'],
        updateFileUrl: newProdUpdateFileUrl || undefined,
        videoUrl: newProdVideoUrl || undefined,
        externalPid: newProdExternalPid.trim() || undefined,
        isUnderMaintenance: newProdIsUnderMaintenance,
        maintenanceNotice: newProdMaintenanceNotice.trim() || undefined,
      });

      if (res?.product) {
        setProducts(prev => [res.product, ...prev.filter(p => p.id !== res.product.id)]);
        setSelectedProdForVar(res.product.id);
        setBulkImportProdId(res.product.id);
      }

      showToastSuccess('Product Created Successfully!');
      setIsCreatingProduct(false);
      setNewProdName('');
      setNewProdGame('');
      setNewProdDesc('');
      setNewProdBadge('STAR');
      setNewProdImageUrl(ALBUM_PRESETS[0].url);
      setNewProdUpdateFileUrl('');
      setNewProdVideoUrl('');
      setNewProdExternalPid('');
      setNewProdIsUnderMaintenance(false);
      setNewProdMaintenanceNotice('');
      loadAllAdminData();
    } catch (err: any) {
      showToastError('Creation failed', err.message);
    }
  };

  // Open Edit Product Modal
  const handleOpenEditProduct = (p: Product) => {
    setEditingProduct(p);
    setEditProdName(p.name);
    setEditProdGame(p.game);
    setEditProdDesc(p.description || '');
    setEditProdBadge(p.badge || '');
    setEditProdCategory(p.category || 'FREEFIRE');
    setEditProdDeviceType(p.deviceType || 'NONROOT');
    setEditProdImageUrl(p.imageUrl || ALBUM_PRESETS[0].url);
    setEditProdFeatures((p.features || []).join(', '));
    setEditProdUpdateFileUrl(p.updateFileUrl || '');
    setEditProdVideoUrl(p.videoUrl || '');
    setEditProdExternalPid(p.externalPid || '');
    setEditProdIsUnderMaintenance(Boolean(p.isUnderMaintenance));
    setEditProdMaintenanceNotice(p.maintenanceNotice || '');
    setIsEditingProduct(true);
  };

  // Update Product
  const handleUpdateProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingProduct) return;
    try {
      const feats = editProdFeatures
        .split(',')
        .map(s => s.trim())
        .filter(Boolean);

      const res = await api.updateProduct(editingProduct.id, {
        name: editProdName,
        game: editProdGame || editProdCategory || 'FREEFIRE',
        category: editProdCategory,
        deviceType: editProdDeviceType,
        description: editProdDesc,
        badge: editProdBadge || undefined,
        imageUrl: editProdImageUrl || undefined,
        features: feats,
        updateFileUrl: editProdUpdateFileUrl || undefined,
        videoUrl: editProdVideoUrl || undefined,
        externalPid: editProdExternalPid.trim() || undefined,
        isUnderMaintenance: editProdIsUnderMaintenance,
        maintenanceNotice: editProdMaintenanceNotice.trim() || undefined,
      });

      if (res?.product) {
        setProducts(prev => prev.map(p => p.id === res.product.id ? { ...p, ...res.product } : p));
      }

      showToastSuccess('Product updated with photo from album');
      setIsEditingProduct(false);
      setEditingProduct(null);
      loadAllAdminData();
    } catch (err: any) {
      showToastError('Update failed', err.message);
    }
  };

  const handleSaveProductPid = async (productId: string, newPid: string) => {
    const trimmed = newPid.trim();
    if (!trimmed) {
      showToastError('Invalid PID', 'Product PID cannot be empty.');
      return;
    }
    if (!/^\d{2,3}$/.test(trimmed)) {
      showToastError('Invalid PID format', 'Product PID must be a 2-digit or 3-digit number (e.g. 155, 66, 120).');
      return;
    }
    setSavingPidId(productId);
    try {
      await api.updateProductPid(productId, trimmed);
      showToastSuccess('Product PID Updated', `PID set to ${trimmed}`);
      await loadAllAdminData();
    } catch (err: any) {
      showToastError('Failed to update PID', err.message);
    } finally {
      setSavingPidId(null);
    }
  };

  const handleAutoAssignPids = async () => {
    try {
      await api.autoAssignPids();
      showToastSuccess('Auto-Assigned PIDs', 'All products now have 2-digit or 3-digit numeric PIDs.');
      await loadAllAdminData();
    } catch (err: any) {
      showToastError('Failed to auto-assign PIDs', err.message);
    }
  };

  // Delete Handlers that open the confirmation modal safely (no window.confirm)
  const handleDeleteProduct = (productOrId: Product | string) => {
    const prod = typeof productOrId === 'string' ? products.find(p => p.id === productOrId) : productOrId;
    if (prod) {
      setProductToDelete(prod);
    } else if (typeof productOrId === 'string') {
      setProductToDelete({
        id: productOrId,
        name: 'Product',
        game: '',
        description: '',
        category: 'FREEFIRE',
        isActive: true,
        createdAt: '',
        variants: [],
      });
    }
  };

  const handleDeleteVariant = (variantOrId: any | string) => {
    const allVariants = products.flatMap(p => p.variants || []);
    const v = typeof variantOrId === 'string' ? allVariants.find(item => item.id === variantOrId) : variantOrId;
    if (v) {
      setVariantToDelete(v);
    } else if (typeof variantOrId === 'string') {
      setVariantToDelete({ id: variantOrId, durationLabel: 'Duration Option' });
    }
  };

  const handleDeleteKey = (keyOrId: any | string) => {
    const k = typeof keyOrId === 'string' ? keys.find(item => item.id === keyOrId) : keyOrId;
    if (k) {
      setKeyToDelete(k);
    } else if (typeof keyOrId === 'string') {
      setKeyToDelete({ id: keyOrId, keyCode: keyOrId });
    }
  };

  // Confirm Delete Product execution
  const handleConfirmDeleteProduct = async () => {
    if (!productToDelete) return;
    try {
      setIsDeletingLoading(true);
      await api.deleteProduct(productToDelete.id);
      showToastSuccess('Product Deleted', `Removed ${productToDelete.name}`);
      setProductToDelete(null);
      loadAllAdminData();
    } catch (err: any) {
      showToastError('Delete failed', err.message);
    } finally {
      setIsDeletingLoading(false);
    }
  };

  // Confirm Delete Variant execution
  const handleConfirmDeleteVariant = async () => {
    if (!variantToDelete) return;
    try {
      setIsDeletingLoading(true);
      await api.deleteVariant(variantToDelete.id);
      showToastSuccess('Duration Removed', `Removed ${variantToDelete.durationLabel}`);
      setVariantToDelete(null);
      loadAllAdminData();
    } catch (err: any) {
      showToastError('Failed to remove variant', err.message);
    } finally {
      setIsDeletingLoading(false);
    }
  };

  // Confirm Delete Key execution
  const handleConfirmDeleteKey = async () => {
    if (!keyToDelete) return;
    try {
      setIsDeletingLoading(true);
      await api.deleteAdminKey(keyToDelete.id);
      showToastSuccess('Key Deleted', `Removed key ${keyToDelete.keyCode}`);
      setKeyToDelete(null);
      loadAllAdminData();
    } catch (err: any) {
      showToastError('Failed to delete key', err.message);
    } finally {
      setIsDeletingLoading(false);
    }
  };

  // Duration calculation helper
  const calculateHoursFromLabel = (label: string): number => {
    const clean = label.toLowerCase().trim();
    const match = clean.match(/^(\d+)\s*(h|hour|hours|d|day|days|w|week|weeks|m|month|months)/);
    if (!match) return 24;
    const num = parseInt(match[1], 10);
    const unit = match[2];
    if (unit.startsWith('h')) return num;
    if (unit.startsWith('d')) return num * 24;
    if (unit.startsWith('w')) return num * 24 * 7;
    if (unit.startsWith('m')) return num * 24 * 30;
    return 24;
  };

  // Create Single Duration Variant
  const handleCreateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    const targetProdId = selectedProdForVar || (products.length > 0 ? products[0].id : '');
    if (!targetProdId) {
      showToastError('Validation Error', 'Please select or create a product first.');
      return;
    }
    try {
      const res = await api.createVariant({
        productId: targetProdId,
        durationLabel: varDurationLabel.trim(),
        durationHours: Number(varDurationHours) || 24,
        price: Number(varPrice),
        resellerPrice: Number(varResellerPrice) || Math.round(Number(varPrice) * 0.75),
        externalPid: varExternalPid.trim() || undefined,
        externalDuration: varExternalDuration.trim() || undefined,
      });

      if (res?.variant) {
        setProducts(prev => prev.map(p => {
          if (p.id === targetProdId) {
            const existing = p.variants || [];
            return {
              ...p,
              variants: [...existing.filter((v: any) => v.id !== res.variant.id), res.variant],
            };
          }
          return p;
        }));
      }

      showToastSuccess('Duration Variant Added with Reseller PID');
      setIsCreatingVariant(false);
      setVarExternalPid('');
      setVarExternalDuration('');
      loadAllAdminData();
    } catch (err: any) {
      showToastError('Variant creation failed', err.message);
    }
  };

  // Batch Multi-Duration Creation
  const handleBatchCreateVariants = async () => {
    const targetProdId = selectedProdForVar || (products.length > 0 ? products[0].id : '');
    if (!targetProdId) {
      showToastError('Validation Error', 'Please select or create a product first.');
      return;
    }
    const selectedItems = batchDurations.filter(d => d.selected);
    if (selectedItems.length === 0) {
      showToastError('Validation Error', 'Please select at least one duration variant.');
      return;
    }
    setIsBatchCreating(true);
    try {
      for (const item of selectedItems) {
        const resellerPrice = Math.max(1, Math.round(item.price * (1 - batchDiscountPct / 100)));
        const externalPid = batchPidPrefix.trim() ? `${batchPidPrefix.trim()}_${item.pidSuffix}` : undefined;
        await api.createVariant({
          productId: targetProdId,
          durationLabel: item.label,
          durationHours: item.hours,
          price: item.price,
          resellerPrice,
          externalPid,
          externalDuration: item.label,
        });
      }
      showToastSuccess(`Batch Created ${selectedItems.length} Duration Variants!`);
      setIsCreatingVariant(false);
      loadAllAdminData();
    } catch (err: any) {
      showToastError('Batch Creation Error', err.message);
    } finally {
      setIsBatchCreating(false);
    }
  };

  const handleOpenEditVariant = (v: any) => {
    setEditingVariant(v);
    setEditVarDurationLabel(v.durationLabel || '');
    setEditVarDurationHours(v.durationHours || 24);
    setEditVarPrice(v.price || 0);
    setEditVarResellerPrice(v.resellerPrice || 0);
    setEditVarExternalPid(v.externalPid || '');
    setEditVarExternalDuration(v.externalDuration || '');
  };

  const handleUpdateVariant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVariant) return;
    try {
      await api.updateVariant(editingVariant.id, {
        durationLabel: editVarDurationLabel,
        durationHours: editVarDurationHours,
        price: editVarPrice,
        resellerPrice: editVarResellerPrice,
        externalPid: editVarExternalPid.trim() || undefined,
        externalDuration: editVarExternalDuration.trim() || undefined,
      });
      showToastSuccess('Duration and Reseller PID updated successfully');
      setEditingVariant(null);
      loadAllAdminData();
    } catch (err: any) {
      showToastError('Update failed', err.message);
    }
  };

  // Bulk import keys
  const handleBulkImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!bulkImportProdId || !bulkImportVarId || !bulkRawKeys.trim()) {
      showToastError('Validation Error', 'Please select product, duration, and enter keys.');
      return;
    }
    try {
      const res = await api.bulkImportAdminKeys({
        productId: bulkImportProdId,
        variantId: bulkImportVarId,
        rawKeys: bulkRawKeys,
      });
      showToastSuccess(res.message);
      setIsBulkImporting(false);
      setBulkRawKeys('');
      loadAllAdminData();
    } catch (err: any) {
      showToastError('Import failed', err.message);
    }
  };

  // Generate keys
  const handleGenerateKeys = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.generateAdminKeys({
        productId: bulkImportProdId,
        variantId: bulkImportVarId,
        count: genCount,
      });
      showToastSuccess(`Generated ${genCount} digital keys!`);
      setIsGeneratingKeys(false);
      loadAllAdminData();
    } catch (err: any) {
      showToastError('Generation failed', err.message);
    }
  };

  // Approve deposit
  const handleApproveDeposit = async (depId: string) => {
    try {
      await api.approveDeposit(depId);
      showToastSuccess('Deposit Approved & Balance Credited');
      loadAllAdminData();
    } catch (err: any) {
      showToastError('Approval failed', err.message);
    }
  };

  // Test Gateway Connection
  const handleTestGateway = async () => {
    try {
      const res = await api.testGatewayConnection();
      showToastSuccess('Gateway Online', res.message);
    } catch (err: any) {
      showToastError('Gateway Connection Error', err.message);
    }
  };

  // Save Gateway settings
  const handleSaveGatewaySettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateGatewaySettings(gatewayConfig);
      showToastSuccess('Payment Gateway Settings Saved');
    } catch (err: any) {
      showToastError('Save failed', err.message);
    }
  };

  // Test Payment Gateway Order Generation (Render FGW POST or FamGateway POST/GET)
  const handleRunFamGatewayTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testFgAmount || testFgAmount <= 0) {
      showToastError('Validation Error', 'Amount must be greater than ₹0.');
      return;
    }
    setIsTestingFg(true);
    setFgTestResult(null);
    try {
      const res = await api.testFamGatewayOrder({
        amount: testFgAmount,
        customerName: testFgCustomerName.trim() || 'Ramesh Kumar',
        customerEmail: testFgCustomerEmail.trim() || 'ramesh@example.com',
        note: testFgNote.trim() || 'Payment for Order #1024',
        method: testFgMethod,
      });
      setFgTestResult(res);
      if (res.success) {
        showToastSuccess(
          `Payment Gateway ${res.method} Succeeded`,
          `Order ${res.orderData?.order_id || res.orderData?.id || 'OK'} generated in ${res.latencyMs}ms`
        );
      } else {
        showToastError(
          `Gateway Notice (HTTP ${res.status || 0})`,
          res.rawResponse?.slice(0, 80) || 'Request failed'
        );
      }
    } catch (err: any) {
      showToastError('Test Call Failed', err.message);
      setFgTestResult({
        success: false,
        method: testFgMethod,
        status: 0,
        latencyMs: 0,
        rawResponse: `Connection error: ${err.message}`,
        payloadSent: {
          amount: testFgAmount,
          note: testFgNote,
          customer_name: testFgCustomerName,
          customer_email: testFgCustomerEmail,
        },
      });
    } finally {
      setIsTestingFg(false);
    }
  };

  // Test Reseller API Connection
  const handleTestReseller = async () => {
    try {
      const res = await api.testResellerConnection();
      showToastSuccess('Reseller API Handshake OK', res.message);
    } catch (err: any) {
      showToastError('Reseller API Handshake Failed', err.message);
    }
  };

  // Save Reseller settings
  const handleSaveResellerSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await api.updateResellerSettings(resellerConfig);
      showToastSuccess('Reseller API Configuration Saved');
    } catch (err: any) {
      showToastError('Save failed', err.message);
    }
  };

  // Test Live Buy Key Generator API Call ($data payload & curl headers)
  const handleRunKeyGenTest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!testProdPid || !testDuration) {
      showToastError('Validation Error', 'Product PID and Duration are required.');
      return;
    }
    setIsTestingKeyGen(true);
    setKeyGenTestResult(null);
    try {
      const res = await api.testBuyKeyGeneration({
        productId: testProdPid.trim(),
        duration: testDuration.trim(),
        androidId: testAndroidId.trim() || undefined,
      });
      setKeyGenTestResult(res);
      if (res.success) {
        showToastSuccess('Key Generator Responded', `HTTP ${res.status} in ${res.latencyMs}ms`);
      } else {
        showToastError(
          'Generator Returned Non-OK or Fallback',
          `HTTP ${res.status || 0} (${res.latencyMs}ms): ${res.rawResponse?.slice(0, 70)}`
        );
      }
    } catch (err: any) {
      showToastError('Test Buy Call Failed', err.message);
      setKeyGenTestResult({
        success: false,
        status: 0,
        latencyMs: 0,
        rawResponse: `Connection error: ${err.message}`,
        payloadSent: {
          productId: testProdPid,
          duration: testDuration,
          androidId: testAndroidId,
        },
      });
    } finally {
      setIsTestingKeyGen(false);
    }
  };

  const handleRandomizeTestAndroidId = () => {
    const chars = '0123456789abcdef';
    let res = '';
    for (let i = 0; i < 16; i++) {
      res += chars[Math.floor(Math.random() * chars.length)];
    }
    setTestAndroidId(res);
  };

  const navTabs = [
    { id: 'dashboard', label: 'Dashboard', icon: Activity },
    { id: 'customization', label: 'Customization & Branding', icon: Palette },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'products', label: 'Products', icon: ShoppingBag },
    { id: 'variants', label: 'Durations', icon: Layers },
    { id: 'user_reseller_api', label: 'User Reseller API System', icon: Terminal },
    { id: 'keys', label: 'Keys & Inventory', icon: KeyRound },
    { id: 'deposits', label: 'Deposits', icon: CreditCard },
    { id: 'orders', label: 'Orders', icon: FileText },
    { id: 'gateway', label: 'Payment Gateway', icon: Sliders },
    { id: 'reseller', label: 'Upstream Provider (Banti Bhaiya)', icon: Radio },
    { id: 'logs', label: 'Logs', icon: Clock },
  ];

  return (
    <div className="space-y-6 pb-24 md:pb-12 max-w-6xl mx-auto">
      {/* Admin Top Header with Custom Branding */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-3xl bg-gradient-to-r from-rose-950/40 via-[#0d0d14] to-[#0a0a0f] border border-rose-500/40 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="font-display font-black text-lg text-white uppercase tracking-wider">
                {globalSiteConfig.adminPanelTitle || 'ADMIN CONTROL CENTER'}
              </h2>
              <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono font-bold uppercase border border-rose-500/40">
                {globalSiteConfig.adminStatusBadge || 'SUPER PRIVILEGES'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              {globalSiteConfig.adminHeaderNotice || 'Live inventory management, pricing tiers, payment gateways, and system monitoring.'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => setActiveTab('customization')}
            className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-600/30 to-red-600/30 hover:from-rose-600/50 hover:to-red-600/50 text-rose-300 text-xs font-bold border border-rose-500/40 transition-all flex items-center gap-1.5"
          >
            <Palette className="w-3.5 h-3.5" />
            <span>Customize Panel</span>
          </button>
          <button
            onClick={loadAllAdminData}
            className="px-4 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs font-semibold flex items-center gap-2 border border-white/5 transition-colors"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
            <span>Refresh All</span>
          </button>
        </div>
      </div>

      {/* Admin Navigation Pills */}
      <div className="flex items-center gap-2 overflow-x-auto no-scrollbar pb-1">
        {navTabs.map(t => {
          const Icon = t.icon;
          const isActive = activeTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id as any)}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-2 border ${
                isActive
                  ? 'bg-rose-500/15 border-rose-500 text-rose-400 shadow-[0_0_12px_rgba(244,63,94,0.3)]'
                  : 'bg-[#0d0d14] border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.04]'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* TAB CONTENT: 1. DASHBOARD OVERVIEW */}
      {activeTab === 'dashboard' && stats && (
        <div className="space-y-6">
          {/* 8 Stats Metrics Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
            <div className="p-4 rounded-2xl bg-[#0d0d14] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Total Users</span>
              <div className="font-mono text-2xl font-black text-white">{stats.totalUsers}</div>
              <span className="text-[10px] text-emerald-400">{stats.activeUsers} active</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0d0d14] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Total Sales</span>
              <div className="font-mono text-2xl font-black text-rose-400">₹{stats.totalSales.toFixed(0)}</div>
              <span className="text-[10px] text-slate-400">All time orders</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0d0d14] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Today Revenue</span>
              <div className="font-mono text-2xl font-black text-emerald-400">₹{stats.todayRevenue.toFixed(0)}</div>
              <span className="text-[10px] text-emerald-400">Calculated today</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0d0d14] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Available Keys</span>
              <div className="font-mono text-2xl font-black text-sky-400">{stats.availableKeys}</div>
              <span className="text-[10px] text-sky-400">In stock for delivery</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0d0d14] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Total Deposits</span>
              <div className="font-mono text-2xl font-black text-white">₹{stats.totalDeposits.toFixed(0)}</div>
              <span className="text-[10px] text-slate-400">UPI credits</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0d0d14] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Pending Deposits</span>
              <div className="font-mono text-2xl font-black text-amber-400">{stats.pendingDeposits}</div>
              <span className="text-[10px] text-amber-400">Awaiting UTR confirm</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0d0d14] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Total Orders</span>
              <div className="font-mono text-2xl font-black text-white">{stats.totalOrders}</div>
              <span className="text-[10px] text-slate-400">Automated fulfilled</span>
            </div>

            <div className="p-4 rounded-2xl bg-[#0d0d14] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono">System Gateway</span>
              <div className="font-mono text-sm font-bold text-emerald-400 uppercase mt-1">ONLINE 200 OK</div>
              <span className="text-[10px] text-slate-400 font-mono">UPI QR Active</span>
            </div>
          </div>

          {/* 7-Day Sales & Deposits Visual Chart */}
          <div className="p-5 rounded-3xl bg-[#0d0d14] border border-white/5 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                  7-DAY REVENUE & DEPOSIT TIMELINE
                </h3>
                <p className="text-xs text-slate-400">Daily financial throughput in INR</p>
              </div>
              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="flex items-center gap-1.5 text-rose-400">
                  <span className="w-2.5 h-2.5 rounded bg-rose-500" /> Sales (₹)
                </span>
                <span className="flex items-center gap-1.5 text-emerald-400">
                  <span className="w-2.5 h-2.5 rounded bg-emerald-500" /> Deposits (₹)
                </span>
              </div>
            </div>

            {/* SVG Histogram */}
            <div className="h-44 flex items-end justify-between gap-2 pt-6 px-2">
              {stats.salesChart.map((d, idx) => {
                const maxVal = Math.max(...stats.salesChart.map(s => Math.max(s.sales, s.deposits)), 100);
                const salesHeight = Math.max(8, (d.sales / maxVal) * 120);
                const depositsHeight = Math.max(8, (d.deposits / maxVal) * 120);

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center gap-1.5 h-full justify-end">
                    <div className="w-full flex items-end justify-center gap-1">
                      <div
                        style={{ height: `${salesHeight}px` }}
                        className="w-1/2 max-w-[18px] bg-rose-500/80 hover:bg-rose-400 rounded-t transition-all"
                        title={`Sales: ₹${d.sales}`}
                      />
                      <div
                        style={{ height: `${depositsHeight}px` }}
                        className="w-1/2 max-w-[18px] bg-emerald-500/80 hover:bg-emerald-400 rounded-t transition-all"
                        title={`Deposits: ₹${d.deposits}`}
                      />
                    </div>
                    <span className="font-mono text-[10px] text-slate-400">{d.date}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: CUSTOMIZATION & BRANDING (WEBSITE & ADMIN PANEL FULL CUSTOMIZATION) */}
      {activeTab === 'customization' && (
        <div className="space-y-6">
          {/* Preset Theme Quick Switcher Banner */}
          <div className="p-5 rounded-3xl bg-gradient-to-r from-purple-950/40 via-[#0d0d14] to-rose-950/40 border border-purple-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                  ONE-CLICK THEME PRESETS (WEBSITE &amp; ADMIN PANEL)
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Instantly transforms colors, accents, and control center styling
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {[
                { id: 'crimson', label: '🌹 Nexa Crimson', color: 'bg-rose-600', border: 'border-rose-500/40' },
                { id: 'cyberpunk', label: '⚡ Cyber Neon', color: 'bg-cyan-500', border: 'border-cyan-500/40' },
                { id: 'emerald', label: '🟢 Matrix Green', color: 'bg-emerald-500', border: 'border-emerald-500/40' },
                { id: 'amber', label: '👑 Royal Gold', color: 'bg-amber-500', border: 'border-amber-500/40' },
                { id: 'violet', label: '🟣 Obsidian Void', color: 'bg-purple-600', border: 'border-purple-500/40' },
                { id: 'blood', label: '🩸 Blood Warzone', color: 'bg-red-700', border: 'border-red-500/40' },
                { id: 'blue', label: '🔵 Sapphire Blue', color: 'bg-blue-600', border: 'border-blue-500/40' },
              ].map(preset => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => handleApplyThemePreset(preset.id)}
                  className={`p-2 rounded-xl bg-black/40 border ${preset.border} hover:bg-white/[0.05] transition-all flex flex-col items-center gap-1.5 text-center group`}
                >
                  <span className={`w-4 h-4 rounded-full ${preset.color} shadow group-hover:scale-110 transition-transform`} />
                  <span className="text-[11px] font-bold text-slate-200 group-hover:text-white leading-tight">
                    {preset.label}
                  </span>
                </button>
              ))}
            </div>
          </div>

          {/* Subtabs for Customization Suite */}
          <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar pb-1 p-1 bg-[#0d0d14] rounded-2xl border border-white/5">
            {[
              { id: 'branding', label: 'Branding & Logo', icon: Globe },
              { id: 'theme', label: 'Visual Themes', icon: Palette },
              { id: 'announcement', label: 'Announcement & Ticker', icon: Megaphone },
              { id: 'hero', label: 'Hero Headlines', icon: Sparkles },
              { id: 'support', label: 'Support & Social', icon: MessageSquare },
              { id: 'rules', label: 'Platform Economics', icon: DollarSign },
              { id: 'admin', label: '🛡️ Admin Panel Customizing', icon: ShieldCheck },
              { id: 'preview', label: 'Live Preview', icon: Eye },
            ].map(tab => {
              const Icon = tab.icon;
              const isActive = customizationSubTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => setCustomizationSubTab(tab.id as any)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-bold whitespace-nowrap transition-all flex items-center gap-1.5 border ${
                    isActive
                      ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-md shadow-rose-950/40'
                      : 'border-transparent text-slate-400 hover:text-white hover:bg-white/[0.03]'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          {/* SUBTAB 1: BRANDING & LOGO */}
          {customizationSubTab === 'branding' && (
            <div className="p-6 rounded-3xl bg-[#0d0d14] border border-white/5 space-y-6">
              <div className="pb-3 border-b border-white/5">
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <Globe className="w-4 h-4 text-rose-400" />
                  <span>BRAND IDENTITY &amp; LOGO CUSTOMIZATION</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure website title, slogan, custom brand logo, and currency symbols.
                </p>
              </div>

              {/* Logo Upload / URL Section */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                <label className="text-[10px] font-bold uppercase tracking-wider text-rose-400 block">
                  WEBSITE BRAND LOGO / ICON
                </label>
                <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
                  {/* Current Logo Preview */}
                  <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-rose-500/20 to-red-600/30 border border-rose-500/40 text-rose-400 flex items-center justify-center font-display font-black text-xl shadow-[0_0_20px_rgba(244,63,94,0.3)] overflow-hidden shrink-0">
                    {siteForm.logoUrl ? (
                      <img src={siteForm.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                    ) : (
                      <span>{siteForm.siteTitle ? siteForm.siteTitle.slice(0, 2).toUpperCase() : 'NX'}</span>
                    )}
                  </div>

                  <div className="space-y-2 flex-1">
                    <div className="flex flex-wrap gap-2">
                      <input
                        type="file"
                        ref={siteLogoFileInputRef}
                        onChange={handleLogoFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => siteLogoFileInputRef.current?.click()}
                        className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs flex items-center gap-1.5 transition-all shadow-md shadow-rose-950/30"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload Logo File (PNG/JPG)</span>
                      </button>

                      {siteForm.logoUrl && (
                        <button
                          type="button"
                          onClick={() => setSiteForm({ ...siteForm, logoUrl: '' })}
                          className="px-3 py-2 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-rose-400 text-xs font-semibold transition-colors"
                        >
                          Clear to Initials
                        </button>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400">
                      Upload transparent PNG or square brand icon. Recommended 256x256 or 512x512 px.
                    </p>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    OR LOGO IMAGE DIRECT URL
                  </label>
                  <input
                    type="text"
                    value={siteForm.logoUrl || ''}
                    onChange={e => setSiteForm({ ...siteForm, logoUrl: e.target.value })}
                    placeholder="https://example.com/logo.png"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-xs"
                  />
                </div>
              </div>

              {/* Brand Text Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    WEBSITE BRAND TITLE
                  </label>
                  <input
                    type="text"
                    value={siteForm.siteTitle}
                    onChange={e => setSiteForm({ ...siteForm, siteTitle: e.target.value })}
                    placeholder="Nexa Panel"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-display font-bold text-sm"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Displays on header, browser tab, and sidebar</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    BRAND TAGLINE / SUBTITLE
                  </label>
                  <input
                    type="text"
                    value={siteForm.siteTagline}
                    onChange={e => setSiteForm({ ...siteForm, siteTagline: e.target.value })}
                    placeholder="Gaming Digital Reseller Platform"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Appears beneath brand title on desktop sidebar</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    FAVICON URL (.ICO / .PNG)
                  </label>
                  <input
                    type="text"
                    value={siteForm.faviconUrl || ''}
                    onChange={e => setSiteForm({ ...siteForm, faviconUrl: e.target.value })}
                    placeholder="https://example.com/favicon.png"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Browser tab icon</span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      CURRENCY SYMBOL
                    </label>
                    <input
                      type="text"
                      value={siteForm.currencySymbol}
                      onChange={e => setSiteForm({ ...siteForm, currencySymbol: e.target.value })}
                      placeholder="₹"
                      className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono font-bold text-center text-sm"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      CURRENCY CODE
                    </label>
                    <input
                      type="text"
                      value={siteForm.currencyCode}
                      onChange={e => setSiteForm({ ...siteForm, currencyCode: e.target.value })}
                      placeholder="INR"
                      className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono font-bold text-center text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    FOOTER BRAND DESCRIPTION
                  </label>
                  <input
                    type="text"
                    value={siteForm.footerText || ''}
                    onChange={e => setSiteForm({ ...siteForm, footerText: e.target.value })}
                    placeholder="The premier automated digital keys and panels reseller infrastructure."
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    COPYRIGHT NOTICE TEXT
                  </label>
                  <input
                    type="text"
                    value={siteForm.copyrightText || ''}
                    onChange={e => setSiteForm({ ...siteForm, copyrightText: e.target.value })}
                    placeholder="© 2026 Nexa Gaming Systems. All rights reserved."
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 2: VISUAL THEMES & ACCENTS */}
          {customizationSubTab === 'theme' && (
            <div className="p-6 rounded-3xl bg-[#0d0d14] border border-white/5 space-y-6">
              <div className="pb-3 border-b border-white/5">
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <Palette className="w-4 h-4 text-purple-400" />
                  <span>VISUAL THEMES, COLOR ACCENTS &amp; ATMOSPHERE</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customize the website's color palette, dark mode deepness, corner curvature, and neon glow intensity.
                </p>
              </div>

              {/* Accent Color Palette Selector */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  PRIMARY ACCENT THEME
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  {[
                    { id: 'crimson', name: 'Crimson Red', desc: 'Blood & Esports Scarlet', color: 'from-rose-600 to-red-600' },
                    { id: 'cyberpunk', name: 'Cyberpunk Neon', desc: 'Cyan & Teal Matrix', color: 'from-cyan-500 to-teal-500' },
                    { id: 'emerald', name: 'Matrix Emerald', desc: 'Vibrant Gamer Green', color: 'from-emerald-500 to-green-600' },
                    { id: 'amber', name: 'Neon Amber', desc: 'Golden VIP Luxury', color: 'from-amber-500 to-orange-500' },
                    { id: 'violet', name: 'Royal Violet', desc: 'Obsidian Deep Purple', color: 'from-purple-600 to-indigo-600' },
                    { id: 'blood', name: 'Blood Flame', desc: 'Ultra Deep Inferno', color: 'from-red-600 to-orange-700' },
                    { id: 'blue', name: 'Sapphire Blue', desc: 'Electric Cyber Sky', color: 'from-blue-600 to-indigo-500' },
                    { id: 'gold', name: 'Crown Gold', desc: 'Wholesale Reseller Gold', color: 'from-yellow-500 to-amber-600' },
                  ].map(theme => (
                    <button
                      key={theme.id}
                      type="button"
                      onClick={() => setSiteForm({ ...siteForm, accentTheme: theme.id as any })}
                      className={`p-3.5 rounded-2xl border text-left transition-all relative overflow-hidden group ${
                        siteForm.accentTheme === theme.id
                          ? 'bg-white/[0.08] border-rose-500 ring-2 ring-rose-500/30 shadow-lg'
                          : 'bg-black/30 border-white/5 hover:border-white/20'
                      }`}
                    >
                      <div className={`w-full h-2 rounded-full bg-gradient-to-r ${theme.color} mb-2`} />
                      <div className="font-bold text-white text-xs">{theme.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{theme.desc}</div>
                      {siteForm.accentTheme === theme.id && (
                        <div className="absolute top-2 right-2 w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              {/* Background Theme & Glow Intensity */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    BACKGROUND DARKNESS MODE
                  </label>
                  <select
                    value={siteForm.backgroundStyle}
                    onChange={e => setSiteForm({ ...siteForm, backgroundStyle: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-semibold"
                  >
                    <option value="deep-slate" className="bg-[#0d0d14] text-white">Deep Slate (#070709) - Recommended</option>
                    <option value="oled-black" className="bg-[#0d0d14] text-white">True OLED Black (#000000) - Maximum Battery &amp; Contrast</option>
                    <option value="midnight-void" className="bg-[#0d0d14] text-white">Midnight Cyber Void (#040407) - Esports Dark</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    NEON GLOW &amp; ATMOSPHERE
                  </label>
                  <select
                    value={siteForm.glowIntensity}
                    onChange={e => setSiteForm({ ...siteForm, glowIntensity: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-semibold"
                  >
                    <option value="extreme" className="bg-[#0d0d14] text-white">Extreme Neon (Intense Esports Glow)</option>
                    <option value="vibrant" className="bg-[#0d0d14] text-white">Vibrant Cyber (Balanced Pro Look)</option>
                    <option value="subtle" className="bg-[#0d0d14] text-white">Subtle Clean (Minimal Glow)</option>
                    <option value="off" className="bg-[#0d0d14] text-white">Off (Flat High-Contrast)</option>
                  </select>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    CORNER RADIUS GEOMETRY
                  </label>
                  <select
                    value={siteForm.borderRadius}
                    onChange={e => setSiteForm({ ...siteForm, borderRadius: e.target.value as any })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-semibold"
                  >
                    <option value="rounded" className="bg-[#0d0d14] text-white">Modern Curved (16px - 24px Rounded)</option>
                    <option value="sharp" className="bg-[#0d0d14] text-white">Aggressive Cyber Sharp (4px - 6px)</option>
                    <option value="pill" className="bg-[#0d0d14] text-white">Smooth Pill (Ultra Rounded)</option>
                  </select>
                </div>
              </div>

              {/* Typography Styles */}
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  TYPOGRAPHY &amp; FONT WEIGHT STYLE
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {[
                    { id: 'ultra-bold', name: 'Outfit Ultra Bold 900', desc: 'Thick, punchy, high-conversion gamer headlines' },
                    { id: 'cyber-black', name: 'Syne & Space Grotesk', desc: 'Futuristic hyper-stylized cyber typography' },
                    { id: 'modern-heavy', name: 'Plus Jakarta Heavy 800', desc: 'Modern fintech & clean digital panel look' },
                  ].map(font => (
                    <button
                      key={font.id}
                      type="button"
                      onClick={() => setSiteForm({ ...siteForm, fontStyle: font.id as any })}
                      className={`p-3 rounded-xl border text-left transition-all ${
                        siteForm.fontStyle === font.id
                          ? 'bg-rose-500/10 border-rose-500 text-rose-300'
                          : 'bg-black/30 border-white/5 text-slate-300 hover:border-white/10'
                      }`}
                    >
                      <div className="font-display font-black text-white text-xs">{font.name}</div>
                      <div className="text-[10px] text-slate-400 mt-1">{font.desc}</div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 3: ANNOUNCEMENT BAR & MARQUEE NEWS TICKER */}
          {customizationSubTab === 'announcement' && (
            <div className="p-6 rounded-3xl bg-[#0d0d14] border border-white/5 space-y-6">
              <div className="pb-3 border-b border-white/5">
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <Megaphone className="w-4 h-4 text-amber-400" />
                  <span>TOP ANNOUNCEMENT BAR &amp; LIVE MARQUEE NEWS</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Broadcast live alerts, patch notes, promo discounts, and news tickers across the top of all pages.
                </p>
              </div>

              {/* Announcement Bar Settings */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${siteForm.isAnnouncementEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    <span className="font-bold text-white text-xs uppercase tracking-wider">
                      TOP ANNOUNCEMENT HEADER BAR
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleInstantToggle('isAnnouncementEnabled', !siteForm.isAnnouncementEnabled, 'Top Announcement Bar')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 border cursor-pointer ${
                        siteForm.isAnnouncementEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${siteForm.isAnnouncementEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                      <span>{siteForm.isAnnouncementEnabled ? 'TURNED ON' : 'TURNED OFF'}</span>
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                  <div className="sm:col-span-2">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      ANNOUNCEMENT TEXT MESSAGE
                    </label>
                    <input
                      type="text"
                      value={siteForm.announcementText}
                      onChange={e => setSiteForm({ ...siteForm, announcementText: e.target.value })}
                      placeholder="🔥 OB55 UPDATE ACTIVE! Automated Instant Digital Key Delivery 24/7 with Live Reseller API"
                      className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-bold text-xs"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      ANNOUNCEMENT BADGE TYPE
                    </label>
                    <select
                      value={siteForm.announcementType}
                      onChange={e => setSiteForm({ ...siteForm, announcementType: e.target.value as any })}
                      className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-bold text-xs"
                    >
                      <option value="promo" className="bg-[#0d0d14] text-white">🔥 PROMO BADGE</option>
                      <option value="alert" className="bg-[#0d0d14] text-white">⚠️ ALERT / NOTICE</option>
                      <option value="update" className="bg-[#0d0d14] text-white">🚀 UPDATE / PATCH</option>
                      <option value="discount" className="bg-[#0d0d14] text-white">💸 DISCOUNT SALE</option>
                    </select>
                  </div>

                  <div className="sm:col-span-3">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                      OPTIONAL ACTION TARGET URL (CLICKABLE LINK)
                    </label>
                    <input
                      type="text"
                      value={siteForm.announcementLink || ''}
                      onChange={e => setSiteForm({ ...siteForm, announcementLink: e.target.value })}
                      placeholder="https://t.me/nexa_gaming_official"
                      className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-xs"
                    />
                  </div>
                </div>
              </div>

              {/* Live News Marquee Ticker */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-4">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    <div className={`w-3 h-3 rounded-full ${siteForm.isMarqueeEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'}`} />
                    <span className="font-bold text-white text-xs uppercase tracking-wider">
                      LIVE STREAMING NEWS MARQUEE TICKER
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleInstantToggle('isMarqueeEnabled', !siteForm.isMarqueeEnabled, 'Live Marquee Ticker')}
                      className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 border cursor-pointer ${
                        siteForm.isMarqueeEnabled
                          ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                          : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                      }`}
                    >
                      <span className={`w-2 h-2 rounded-full ${siteForm.isMarqueeEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                      <span>{siteForm.isMarqueeEnabled ? 'TURNED ON' : 'TURNED OFF'}</span>
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    MARQUEE TICKER TEXT
                  </label>
                  <textarea
                    rows={2}
                    value={siteForm.marqueeText}
                    onChange={e => setSiteForm({ ...siteForm, marqueeText: e.target.value })}
                    placeholder="⚡ Fast UPI Auto Deposit | Instant Digital Key Delivery | Non-Root & iOS Supported | 100% Anti-Ban Menus | 24/7 Live Support"
                    className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-xs leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 4: HERO HEADLINES & MARKETING BANNER */}
          {customizationSubTab === 'hero' && (
            <div className="p-6 rounded-3xl bg-[#0d0d14] border border-white/5 space-y-6">
              <div className="pb-3 border-b border-white/5">
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-rose-400" />
                  <span>HERO HEADLINES &amp; MARKETING BANNER</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Customize the hero marketing headers shown on key purchasing, login, and promotional pages.
                </p>
              </div>

              <div className="grid grid-cols-1 gap-4 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    HERO TOP BADGE PILL TEXT
                  </label>
                  <input
                    type="text"
                    value={siteForm.heroBadgeText}
                    onChange={e => setSiteForm({ ...siteForm, heroBadgeText: e.target.value })}
                    placeholder="OFFICIAL GAMING RESELLER PLATFORM"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono font-bold text-xs uppercase"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    HERO MAIN TITLE (H1 HEADLINE)
                  </label>
                  <input
                    type="text"
                    value={siteForm.heroTitle}
                    onChange={e => setSiteForm({ ...siteForm, heroTitle: e.target.value })}
                    placeholder="DOMINATE THE GAME WITH PRO DIGITAL PANELS"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-display font-black text-base uppercase"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    HERO SUBTITLE / MOTTO
                  </label>
                  <textarea
                    rows={2}
                    value={siteForm.heroSubtitle}
                    onChange={e => setSiteForm({ ...siteForm, heroSubtitle: e.target.value })}
                    placeholder="Instant Key Delivery · Automated Wallet Deposits · Wholesale VIP Pricing for Resellers"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-xs leading-relaxed"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 5: SOCIAL CHANNELS & 24/7 SUPPORT */}
          {customizationSubTab === 'support' && (
            <div className="p-6 rounded-3xl bg-[#0d0d14] border border-white/5 space-y-6">
              <div className="pb-3 border-b border-white/5">
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <MessageSquare className="w-4 h-4 text-emerald-400" />
                  <span>SOCIAL MEDIA CHANNELS &amp; 24/7 LIVE SUPPORT</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Configure your official community links, Telegram channel, and floating WhatsApp support widget.
                </p>
              </div>

              {/* Floating Widget Toggle */}
              <div className="p-4 rounded-2xl bg-emerald-500/5 border border-emerald-500/20 flex items-center justify-between flex-wrap gap-2">
                <div>
                  <div className="font-bold text-white text-xs flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full ${siteForm.quickSupportWidgetEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                    <span>FLOATING 24/7 QUICK SUPPORT BUBBLE (WHATSAPP &amp; TELEGRAM)</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Displays animated floating WhatsApp / Telegram support button at bottom-right corner.
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => handleInstantToggle('quickSupportWidgetEnabled', !siteForm.quickSupportWidgetEnabled, 'Floating 24/7 Support Button')}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-mono font-bold uppercase transition-all flex items-center gap-2 border cursor-pointer ${
                      siteForm.quickSupportWidgetEnabled
                        ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow-sm'
                        : 'bg-rose-500/15 text-rose-300 border-rose-500/30'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${siteForm.quickSupportWidgetEnabled ? 'bg-emerald-400 animate-pulse' : 'bg-rose-500'}`} />
                    <span>{siteForm.quickSupportWidgetEnabled ? 'TURNED ON' : 'TURNED OFF'}</span>
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    WHATSAPP SUPPORT NUMBER
                  </label>
                  <input
                    type="text"
                    value={siteForm.whatsappNumber || ''}
                    onChange={e => setSiteForm({ ...siteForm, whatsappNumber: e.target.value })}
                    placeholder="+918056317218"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Full country code with plus (+) e.g. +91...</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    TELEGRAM SUPPORT USERNAME
                  </label>
                  <input
                    type="text"
                    value={siteForm.telegramSupportUser || ''}
                    onChange={e => setSiteForm({ ...siteForm, telegramSupportUser: e.target.value })}
                    placeholder="@nexa_support_admin"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Direct Telegram DM username</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    OFFICIAL TELEGRAM CHANNEL LINK
                  </label>
                  <input
                    type="text"
                    value={siteForm.telegramChannelUrl || ''}
                    onChange={e => setSiteForm({ ...siteForm, telegramChannelUrl: e.target.value })}
                    placeholder="https://t.me/nexa_gaming_official"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    OFFICIAL SUPPORT EMAIL
                  </label>
                  <input
                    type="email"
                    value={siteForm.contactEmail || ''}
                    onChange={e => setSiteForm({ ...siteForm, contactEmail: e.target.value })}
                    placeholder="support@nexapanel.com"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    DISCORD SERVER INVITE LINK
                  </label>
                  <input
                    type="text"
                    value={siteForm.discordInviteUrl || ''}
                    onChange={e => setSiteForm({ ...siteForm, discordInviteUrl: e.target.value })}
                    placeholder="https://discord.gg/nexagaming"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    YOUTUBE CHANNEL LINK
                  </label>
                  <input
                    type="text"
                    value={siteForm.youtubeChannelUrl || ''}
                    onChange={e => setSiteForm({ ...siteForm, youtubeChannelUrl: e.target.value })}
                    placeholder="https://youtube.com/@nexagaming"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 6: PLATFORM ECONOMICS & RULES */}
          {customizationSubTab === 'rules' && (
            <div className="p-6 rounded-3xl bg-[#0d0d14] border border-white/5 space-y-6">
              <div className="pb-3 border-b border-white/5">
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                  <DollarSign className="w-4 h-4 text-rose-400" />
                  <span>PLATFORM ECONOMICS &amp; BUSINESS RULES</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Control deposit thresholds, reseller upgrade prices, and referral reward percentages.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    MINIMUM WALLET DEPOSIT (₹)
                  </label>
                  <input
                    type="number"
                    value={siteForm.minDepositAmount}
                    onChange={e => setSiteForm({ ...siteForm, minDepositAmount: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Enforced during UPI payment creation</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    VIP RESELLER UPGRADE FEE (₹)
                  </label>
                  <input
                    type="number"
                    value={siteForm.resellerUpgradePrice}
                    onChange={e => setSiteForm({ ...siteForm, resellerUpgradePrice: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Deducted from balance on VIP upgrade</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    REFERRAL COMMISSION (%)
                  </label>
                  <input
                    type="number"
                    value={siteForm.referralCommissionPct}
                    onChange={e => setSiteForm({ ...siteForm, referralCommissionPct: Number(e.target.value) })}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono font-bold"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Credited to referrer on purchase</span>
                </div>

                <div className="sm:col-span-3">
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    ACCOUNT SAFETY NOTICE PHRASE
                  </label>
                  <input
                    type="text"
                    value={siteForm.accountSafetyBalanceText}
                    onChange={e => setSiteForm({ ...siteForm, accountSafetyBalanceText: e.target.value })}
                    placeholder="Keep ₹500+ balance for account safety."
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-xs"
                  />
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 7: 🛡️ ADMIN PANEL ALSO CUSTOMIZING (DEDICATED ADMIN PANEL CUSTOMIZATION) */}
          {customizationSubTab === 'admin' && (
            <div className="p-6 rounded-3xl bg-[#0d0d14] border border-rose-500/30 shadow-2xl shadow-rose-950/20 space-y-6">
              <div className="pb-3 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-5 h-5 text-rose-400" />
                    <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                      ADMIN PANEL PERSONALIZATION &amp; CUSTOMIZATION
                    </h3>
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Fully customize your administrator control center titles, status badges, broadcast notices, and color theme.
                  </p>
                </div>

                <span className="px-3 py-1 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-400 text-[10px] font-mono font-bold uppercase self-start sm:self-auto">
                  ADMIN UI OVERRIDE
                </span>
              </div>

              {/* Admin Theme Presets */}
              <div className="space-y-3">
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                  ADMIN PANEL THEME PRESET
                </label>
                <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-3">
                  {[
                    { id: 'crimson-admin', name: 'Crimson Super Admin', color: '#e11d48', badge: 'bg-rose-500/20 text-rose-300' },
                    { id: 'cyber-admin', name: 'Cyberpunk Master', color: '#06b6d4', badge: 'bg-cyan-500/20 text-cyan-300' },
                    { id: 'emerald-admin', name: 'Matrix Terminal', color: '#10b981', badge: 'bg-emerald-500/20 text-emerald-300' },
                    { id: 'gold-admin', name: 'Gold VIP Reseller', color: '#f59e0b', badge: 'bg-amber-500/20 text-amber-300' },
                    { id: 'obsidian-admin', name: 'Obsidian Night Void', color: '#8b5cf6', badge: 'bg-purple-500/20 text-purple-300' },
                  ].map(admTheme => (
                    <button
                      key={admTheme.id}
                      type="button"
                      onClick={() => setSiteForm({
                        ...siteForm,
                        adminThemePreset: admTheme.id as any,
                        adminAccentColor: admTheme.color,
                      })}
                      className={`p-3 rounded-2xl border text-left transition-all relative ${
                        siteForm.adminThemePreset === admTheme.id
                          ? 'bg-white/[0.08] border-rose-500 ring-2 ring-rose-500/30 shadow-md'
                          : 'bg-black/40 border-white/5 hover:border-white/15'
                      }`}
                    >
                      <div className="w-5 h-5 rounded-lg mb-2 flex items-center justify-center text-white" style={{ backgroundColor: admTheme.color }}>
                        <ShieldCheck className="w-3.5 h-3.5" />
                      </div>
                      <div className="font-bold text-white text-xs leading-tight">{admTheme.name}</div>
                      <div className="text-[9px] font-mono text-slate-400 mt-1">{admTheme.color}</div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Admin Panel Specific Controls */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    ADMIN CONTROL CENTER TITLE
                  </label>
                  <input
                    type="text"
                    value={siteForm.adminPanelTitle}
                    onChange={e => setSiteForm({ ...siteForm, adminPanelTitle: e.target.value })}
                    placeholder="NEXA SYSTEM CONTROL PANEL"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-display font-black text-sm uppercase"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Displayed on the admin center top header</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    ADMIN STATUS BADGE TEXT
                  </label>
                  <input
                    type="text"
                    value={siteForm.adminStatusBadge || 'SUPER PRIVILEGES'}
                    onChange={e => setSiteForm({ ...siteForm, adminStatusBadge: e.target.value })}
                    placeholder="SUPER PRIVILEGES"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono font-bold text-xs uppercase"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Pill badge next to admin title</span>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    ADMIN CUSTOM ACCENT HEX COLOR
                  </label>
                  <div className="flex items-center gap-2">
                    <input
                      type="color"
                      value={siteForm.adminAccentColor || '#e11d48'}
                      onChange={e => setSiteForm({ ...siteForm, adminAccentColor: e.target.value })}
                      className="w-10 h-10 rounded-xl bg-transparent cursor-pointer border border-white/10"
                    />
                    <input
                      type="text"
                      value={siteForm.adminAccentColor || '#e11d48'}
                      onChange={e => setSiteForm({ ...siteForm, adminAccentColor: e.target.value })}
                      placeholder="#e11d48"
                      className="flex-1 px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-xs"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    ADMIN HEADER BROADCAST / NOTICE
                  </label>
                  <input
                    type="text"
                    value={siteForm.adminHeaderNotice || ''}
                    onChange={e => setSiteForm({ ...siteForm, adminHeaderNotice: e.target.value })}
                    placeholder="SUPER ADMIN LIVE REALTIME SESSION ACTIVE"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-xs"
                  />
                  <span className="text-[10px] text-slate-500 mt-1 block">Appears in subtitle under admin header</span>
                </div>
              </div>
            </div>
          )}

          {/* SUBTAB 8: LIVE INTERACTIVE PREVIEW DOCK */}
          {customizationSubTab === 'preview' && (
            <div className="p-6 rounded-3xl bg-[#0d0d14] border border-white/5 space-y-6">
              <div className="pb-3 border-b border-white/5 flex items-center justify-between">
                <div>
                  <h3 className="font-display font-black text-sm text-white uppercase tracking-wider flex items-center gap-2">
                    <Eye className="w-4 h-4 text-sky-400" />
                    <span>REAL-TIME LIVE COMPONENT PREVIEW</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Live visualization of how your customized branding, colors, announcement, and admin header appear.
                  </p>
                </div>
                <span className="px-2.5 py-1 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] font-mono font-bold">
                  LIVE INTERACTIVE
                </span>
              </div>

              {/* 1. Header & Announcement Live Preview */}
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-3">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  1. WEBSITE TOP ANNOUNCEMENT BAR &amp; HEADER PREVIEW:
                </span>

                {siteForm.isAnnouncementEnabled && (
                  <div className="w-full bg-gradient-to-r from-rose-600 via-red-600 to-amber-600 text-white px-3 py-1.5 text-xs font-bold flex items-center justify-between rounded-t-xl shadow">
                    <div className="flex items-center gap-2">
                      <span className="px-1.5 py-0.5 rounded bg-black/40 text-[9px] font-mono font-black uppercase">
                        {siteForm.announcementType === 'promo' ? '🔥 PROMO' : siteForm.announcementType === 'alert' ? '⚠️ NOTICE' : '🚀 UPDATE'}
                      </span>
                      <span className="truncate">{siteForm.announcementText}</span>
                    </div>
                    {siteForm.announcementLink && (
                      <span className="text-[10px] underline font-mono flex items-center gap-1">Details &rarr;</span>
                    )}
                  </div>
                )}

                <div className="flex items-center justify-between p-3 bg-[#0a0a0f] border border-white/5 rounded-b-xl">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-rose-500/20 to-red-600/30 border border-rose-500/40 text-rose-400 flex items-center justify-center font-display font-black text-sm overflow-hidden">
                      {siteForm.logoUrl ? (
                        <img src={siteForm.logoUrl} alt="Logo" className="w-full h-full object-cover" />
                      ) : (
                        siteForm.siteTitle.slice(0, 2).toUpperCase()
                      )}
                    </div>
                    <div>
                      <div className="font-display font-black text-sm text-white uppercase">{siteForm.siteTitle}</div>
                      <div className="text-[9px] text-slate-400 font-mono uppercase">{siteForm.siteTagline}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <div className="px-3 py-1.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs font-mono font-bold text-white flex items-center gap-1">
                      <span className="text-rose-400">{siteForm.currencySymbol}</span>
                      <span>1,450.00</span>
                    </div>
                  </div>
                </div>
              </div>

              {/* 2. Hero Card Live Preview */}
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  2. HERO HEADLINE PREVIEW:
                </span>
                <div className="p-5 rounded-2xl bg-gradient-to-br from-rose-950/30 via-[#0d0d14] to-black border border-rose-500/20 space-y-2">
                  <span className="px-2.5 py-0.5 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/40 text-[10px] font-mono font-bold uppercase tracking-wider">
                    {siteForm.heroBadgeText}
                  </span>
                  <h4 className="font-display font-black text-lg text-white uppercase">
                    {siteForm.heroTitle}
                  </h4>
                  <p className="text-xs text-slate-400">
                    {siteForm.heroSubtitle}
                  </p>
                </div>
              </div>

              {/* 3. Admin Center Top Header Live Preview */}
              <div className="p-4 rounded-2xl bg-black/60 border border-white/10 space-y-2">
                <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider block">
                  3. ADMIN CONTROL CENTER HEADER PREVIEW:
                </span>
                <div className="p-4 rounded-2xl bg-gradient-to-r from-rose-950/40 via-[#0d0d14] to-[#0a0a0f] border border-rose-500/40 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center">
                      <ShieldCheck className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-display font-black text-sm text-white uppercase">
                          {siteForm.adminPanelTitle}
                        </span>
                        <span className="text-[9px] px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 font-mono font-bold uppercase border border-rose-500/40">
                          {siteForm.adminStatusBadge || 'SUPER PRIVILEGES'}
                        </span>
                      </div>
                      <span className="text-[11px] text-slate-400 block">
                        {siteForm.adminHeaderNotice}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Persistent Bottom Save & Reset Dock */}
          <div className="sticky bottom-4 z-30 p-4 rounded-2xl bg-[#0a0a0f]/95 backdrop-blur-md border border-rose-500/40 shadow-2xl flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-white font-bold">Unsaved changes sync in real-time</span>
              <span className="text-slate-500 font-mono hidden md:inline">| Press Save to publish permanent database updates</span>
            </div>

            <div className="flex items-center gap-2 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleResetSiteDefaults}
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors border border-white/10"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Reset Defaults</span>
              </button>

              <button
                type="button"
                disabled={isSavingSite}
                onClick={() => handleSaveSiteSettings()}
                className="flex-1 sm:flex-none px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 via-crimson-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-rose-950/50 active:scale-95 disabled:opacity-50 transition-all"
              >
                {isSavingSite ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>PUBLISHING LIVE...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>SAVE &amp; PUBLISH ALL CUSTOMIZATIONS</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 2. USERS MANAGEMENT */}
      {activeTab === 'users' && (
        <div className="space-y-4">
          {/* User Metrics Summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-2xl bg-[#0d0d14] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Total Users</span>
              <div className="font-mono text-xl font-black text-white">{users.length}</div>
              <span className="text-[10px] text-emerald-400">Live Auto-Sync Active</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#0d0d14] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Total User Balances</span>
              <div className="font-mono text-xl font-black text-emerald-400">
                ₹{users.reduce((acc, u) => acc + (u.balance || 0), 0).toFixed(2)}
              </div>
              <span className="text-[10px] text-slate-400">In circulation</span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#0d0d14] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Active Accounts</span>
              <div className="font-mono text-xl font-black text-white">
                {users.filter(u => !u.isBanned).length}
              </div>
              <span className="text-[10px] text-slate-400">
                {users.filter(u => u.isBanned).length} suspended
              </span>
            </div>
            <div className="p-3.5 rounded-2xl bg-[#0d0d14] border border-white/5 space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-mono">Resellers & Admins</span>
              <div className="font-mono text-xl font-black text-amber-400">
                {users.filter(u => u.role !== 'USER').length}
              </div>
              <span className="text-[10px] text-slate-400">Privileged accounts</span>
            </div>
          </div>

          {/* Search & Header Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d0d14] p-3 rounded-2xl border border-white/5">
            <div className="relative flex-1 max-w-md">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={userSearchQuery}
                onChange={e => setUserSearchQuery(e.target.value)}
                placeholder="Search user by @username or email in real-time..."
                className="w-full pl-9 pr-8 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
              {userSearchQuery && (
                <button
                  onClick={() => setUserSearchQuery('')}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                >
                  ✕
                </button>
              )}
            </div>

            <div className="flex items-center gap-2">
              <span className="text-[11px] font-mono text-emerald-400 flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-emerald-500/10 border border-emerald-500/20">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                <span>Real-Time Sync (4s)</span>
              </span>
              <button
                onClick={() => loadAllAdminData()}
                className="p-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 text-xs flex items-center gap-1"
                title="Refresh user list"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0d0d14]">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/5 text-[10px] font-mono text-slate-400 uppercase">
                <tr>
                  <th className="p-3.5">User Details</th>
                  <th className="p-3.5">Role</th>
                  <th className="p-3.5">Real-Time Balance & Quick Add</th>
                  <th className="p-3.5">Activity & Orders</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {users.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-mono">
                      No user accounts found matching '{userSearchQuery}'.
                    </td>
                  </tr>
                ) : (
                  users.map(u => (
                    <tr key={u.id} className="hover:bg-white/[0.02] transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-rose-600/30 to-amber-600/30 border border-white/10 flex items-center justify-center font-bold text-white text-xs">
                            {(u.username || u.email || 'U')[0].toUpperCase()}
                          </div>
                          <div>
                            <div className="font-bold text-white flex items-center gap-1.5">
                              <span>@{u.username}</span>
                              {u.twoFactorEnabled && (
                                <span className="text-[9px] px-1 rounded bg-sky-500/20 text-sky-300 font-mono">2FA</span>
                              )}
                            </div>
                            <div className="text-[10px] text-slate-400 font-mono select-all">{u.email}</div>
                            {u.referralCode && (
                              <div className="text-[9px] text-slate-500 font-mono">Ref: {u.referralCode}</div>
                            )}
                            <div className="text-[9px] text-rose-400 font-mono font-bold flex items-center gap-1 mt-0.5">
                              <Clock className="w-2.5 h-2.5" />
                              <span>
                                Joined: {u.createdAt ? new Date(u.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <select
                          value={u.role}
                          onChange={e => handleUpdateRole(u.id, e.target.value)}
                          className={`border rounded-lg text-[11px] font-bold font-mono py-1 px-2 focus:outline-none ${
                            u.role === 'ADMIN' || u.role === 'SUPER ADMIN'
                              ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                              : u.role === 'RESELLER'
                              ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                              : 'bg-white/[0.04] border-white/10 text-slate-300'
                          }`}
                        >
                          <option value="USER" className="bg-[#0d0d14]">USER</option>
                          <option value="RESELLER" className="bg-[#0d0d14]">RESELLER</option>
                          <option value="ADMIN" className="bg-[#0d0d14]">ADMIN</option>
                          <option value="SUPER ADMIN" className="bg-[#0d0d14]">SUPER ADMIN</option>
                        </select>
                      </td>
                      <td className="p-3.5">
                        <div className="space-y-1.5">
                          <div className="font-mono font-black text-sm text-emerald-400 flex items-center gap-1">
                            <span>₹{Number(u.balance || 0).toFixed(2)}</span>
                          </div>
                          {/* Quick 1-Click Balance Top-up Chips */}
                          <div className="flex items-center gap-1">
                            {[50, 100, 500, 1000].map(amt => (
                              <button
                                key={amt}
                                onClick={() => handleQuickCredit(u, amt)}
                                className="px-1.5 py-0.5 rounded bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 font-mono text-[9px] font-bold transition-all active:scale-95"
                                title={`Add ₹${amt} instantly`}
                              >
                                +₹{amt}
                              </button>
                            ))}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <div className="space-y-0.5 text-[10px] font-mono">
                          <div className="text-slate-300">
                            Orders: <span className="text-white font-bold">{u.totalOrdersCount || 0}</span> · Keys: <span className="text-rose-400 font-bold">{u.keysCount || 0}</span>
                          </div>
                          <div className="text-slate-400">
                            Deposited: <span className="text-emerald-400 font-bold">₹{(u.totalDeposited || 0).toFixed(0)}</span> · Spent: ₹{(u.totalSpent || 0).toFixed(0)}
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                            !u.isBanned
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {!u.isBanned ? 'ACTIVE' : 'SUSPENDED'}
                        </span>
                      </td>
                      <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                        <button
                          onClick={() => {
                            setAdjustingUser(u);
                            setAdjustAmount('100');
                            setAdjustReason('Manual Admin Credit');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-xs font-bold text-emerald-300 transition-colors inline-flex items-center gap-1"
                        >
                          <Wallet className="w-3 h-3" />
                          <span>+ Balance</span>
                        </button>
                        <button
                          onClick={() => setSelectedUserDetail(u)}
                          className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-300 transition-colors inline-flex items-center gap-1"
                        >
                          <Eye className="w-3 h-3" />
                          <span>Details</span>
                        </button>
                        <button
                          onClick={() => handleToggleBan(u.id)}
                          className={`px-2.5 py-1 rounded-lg text-xs font-semibold transition-colors ${
                            u.isBanned
                              ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                          }`}
                        >
                          {u.isBanned ? 'Unban' : 'Ban'}
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 3. PRODUCTS MANAGEMENT */}
      {activeTab === 'products' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                  PRODUCTS CATALOG
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-rose-500/20 text-rose-400 font-mono font-bold uppercase border border-rose-500/30">
                  {products.length} Panels
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Manage live game mod menus, custom banner photos from device albums, update files, and duration pricing.
              </p>
            </div>
            <button
              onClick={() => {
                setNewProdName('');
                setNewProdGame('');
                setNewProdDesc('');
                setNewProdBadge('STAR');
                setNewProdCategory('FREEFIRE');
                setNewProdDeviceType('NONROOT');
                setNewProdImageUrl(ALBUM_PRESETS[0].url);
                setNewProdFeatures('Headshot, Location, Fast Revive');
                setNewProdUpdateFileUrl('');
                setNewProdVideoUrl('');
                setIsCreatingProduct(true);
              }}
              className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-950/50 self-start sm:self-auto"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Add Product + Photo</span>
            </button>
          </div>

          {products.length === 0 ? (
            <div className="p-12 rounded-2xl bg-[#0d0d14] border border-white/5 text-center space-y-3">
              <ShoppingBag className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="font-bold text-sm text-white">NO PRODUCTS CREATED YET</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Your product catalog is currently empty. Click "Add Product + Photo" above to upload photos from your album and create gaming panels.
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {products.map((p, idx) => (
                <div
                  key={`admin-prod-${p.id}-${idx}`}
                  className={`rounded-2xl bg-[#0d0d14] border overflow-hidden shadow-lg transition-all flex flex-col justify-between ${
                    p.isUnderMaintenance ? 'border-amber-500/40 ring-1 ring-amber-500/20' : 'border-white/5 hover:border-rose-500/30'
                  }`}
                >
                  <div>
                    {/* Product Photo Thumbnail Banner */}
                    <div className="relative aspect-[16/8] w-full bg-slate-900 overflow-hidden">
                      {p.imageUrl ? (
                        <img
                          src={p.imageUrl}
                          alt={p.name}
                          className="w-full h-full object-cover object-center"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-slate-800 text-slate-600 font-mono text-xs">
                          NO PHOTO
                        </div>
                      )}
                      <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d14] via-transparent to-black/40 pointer-events-none" />

                      {/* Floating Badges */}
                      <div className="absolute top-2.5 left-2.5 flex items-center gap-1.5">
                        <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-black/70 backdrop-blur-md text-slate-200 border border-white/10 uppercase">
                          {p.game}
                        </span>
                        {p.badge && (
                          <span className="text-[9px] font-mono font-bold px-1.5 py-0.5 rounded bg-rose-500/80 text-white uppercase shadow-sm">
                            {p.badge}
                          </span>
                        )}
                      </div>

                      <div className="absolute top-2.5 right-2.5">
                        <span className="text-[9px] font-mono font-bold px-2 py-0.5 rounded bg-black/70 text-slate-300 border border-white/10 uppercase">
                          {p.deviceType || 'NONROOT'}
                        </span>
                      </div>

                      {/* Centered Under Maintenance Button / Badge in Product Photo */}
                      {p.isUnderMaintenance && (
                        <div className="absolute inset-0 flex items-center justify-center z-20 bg-black/70 backdrop-blur-[2px] p-2">
                          <div className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 text-black border-2 border-amber-300 font-display font-black text-xs uppercase tracking-wider flex items-center gap-1.5 shadow-[0_0_25px_rgba(245,158,11,0.8)] animate-pulse">
                            <AlertTriangle className="w-3.5 h-3.5 text-black fill-black shrink-0" />
                            <span>UNDER MAINTENANCE</span>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Product Details Content */}
                    <div className="p-4 space-y-2.5">
                      <div>
                        <div className="flex items-center justify-between gap-1">
                          <h4 className="font-bold text-sm text-white line-clamp-1">{p.name}</h4>
                          {p.isUnderMaintenance && (
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 uppercase shrink-0">
                              PAUSED
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5 line-clamp-2">{p.description}</p>
                      </div>

                      {/* Features */}
                      {p.features && p.features.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {p.features.slice(0, 3).map((f, i) => (
                            <span
                              key={i}
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-white/[0.03] border border-white/5 text-slate-300"
                            >
                              ⚡ {f}
                            </span>
                          ))}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-1 border-t border-white/5">
                        <span>{p.variants?.length || 0} Durations Configured</span>
                        <span className="text-emerald-400 font-bold">
                          {p.variants?.length ? `From ₹${Math.min(...p.variants.map(v => v.price))}` : 'No Price'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Card Actions Footer */}
                  <div className="p-3 bg-white/[0.02] border-t border-white/5 flex items-center justify-between gap-2">
                    <button
                      type="button"
                      onClick={() => handleOpenEditProduct(p)}
                      className="flex-1 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-slate-200 border border-white/10 flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Edit2 className="w-3.5 h-3.5 text-rose-400" />
                      <span>Edit &amp; Photo</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleToggleProductMaintenance(p)}
                      className={`px-2.5 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 border cursor-pointer ${
                        p.isUnderMaintenance
                          ? 'bg-amber-500/20 text-amber-300 border-amber-500/40 hover:bg-amber-500/30'
                          : 'bg-white/[0.04] text-slate-400 border-white/10 hover:text-amber-300 hover:border-amber-500/30'
                      }`}
                      title={p.isUnderMaintenance ? 'Maintenance active (purchases blocked). Click to turn off' : 'Click to put product under maintenance'}
                    >
                      <AlertTriangle className={`w-3.5 h-3.5 ${p.isUnderMaintenance ? 'text-amber-400' : 'text-slate-400'}`} />
                      <span>{p.isUnderMaintenance ? 'Maint. ON' : 'Maint. OFF'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDeleteProduct(p.id)}
                      className="p-1.5 rounded-xl text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors"
                      title="Delete product"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB CONTENT: 4. DURATION VARIANTS (INDEPENDENT OPTIONS) */}
      {activeTab === 'variants' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                  INDEPENDENT DURATION VARIANTS & RESELLER PRICING
                </h3>
                <span className="text-[10px] px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-mono font-bold uppercase border border-emerald-500/30">
                  RESELLER API SYSTEM
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Configure durations with custom hours, retail vs VIP reseller pricing, and upstream Reseller PIDs for automated API delivery.
              </p>
            </div>
            
            <div className="flex items-center gap-2 flex-wrap">
              <button
                onClick={() => {
                  if (products.length > 0 && !selectedProdForVar) {
                    setSelectedProdForVar(products[0].id);
                  }
                  setVarEntryMode('batch');
                  setIsCreatingVariant(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-sm"
              >
                <Zap className="w-3.5 h-3.5 text-amber-400" />
                <span>⚡ Batch Duration Builder</span>
              </button>
              <button
                onClick={() => {
                  if (products.length > 0 && !selectedProdForVar) {
                    setSelectedProdForVar(products[0].id);
                  }
                  setVarEntryMode('single');
                  setIsCreatingVariant(true);
                }}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 transition-colors shadow-lg shadow-rose-950/50"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>+ Add Duration &amp; PID</span>
              </button>
            </div>
          </div>

          {/* Instructions Box for Admin Reseller API Setup */}
          <div className="p-4 rounded-2xl bg-gradient-to-r from-amber-950/30 via-[#0d0d14] to-[#0d0d14] border border-amber-500/30 text-xs text-slate-300 flex items-start gap-3">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <Zap className="w-4 h-4" />
            </div>
            <div className="space-y-1">
              <div className="font-bold text-white uppercase tracking-wider flex items-center gap-2">
                <span>⚡ How to Create &amp; Map Reseller API Products Manually</span>
              </div>
              <p className="text-slate-300 leading-relaxed">
                Click <strong>"+ Add Duration &amp; PID"</strong> or <strong>"⚡ Batch Duration Builder"</strong> to manually set the <strong className="text-amber-400 font-mono">Reseller PID (externalPid)</strong> and <strong className="text-emerald-400 font-mono">Duration Code</strong>. When other websites call your reseller API with this PID and duration, your website will automatically validate wallet balance, deduct funds, and issue keys!
              </p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d0d14] p-3 rounded-2xl border border-white/5">
            <div className="flex items-center gap-2">
              <span className="text-slate-400 text-xs font-semibold flex items-center gap-1">
                <Filter className="w-3.5 h-3.5" /> Filter by Product:
              </span>
              <select
                value={variantProductFilter}
                onChange={e => setVariantProductFilter(e.target.value)}
                className="px-3 py-1.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-xs font-medium focus:border-rose-500 focus:outline-none"
              >
                <option value="ALL" className="bg-[#0d0d14]">All Products ({products.reduce((acc, p) => acc + (p.variants?.length || 0), 0)} durations)</option>
                {products.map((p, idx) => (
                  <option key={`opt-prod-${p.id}-${idx}`} value={p.id} className="bg-[#0d0d14]">
                    {p.name} ({p.variants?.length || 0})
                  </option>
                ))}
              </select>
            </div>

            <div className="text-xs font-mono text-slate-400">
              Total Duration Options:{' '}
              <strong className="text-white">
                {products
                  .filter(p => variantProductFilter === 'ALL' || p.id === variantProductFilter)
                  .flatMap(p => p.variants || []).length}
              </strong>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0d0d14]">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/5 text-[10px] font-mono text-slate-400 uppercase">
                <tr>
                  <th className="p-3.5">Product</th>
                  <th className="p-3.5">Duration Option</th>
                  <th className="p-3.5">Expiry Hours</th>
                  <th className="p-3.5">Standard Price</th>
                  <th className="p-3.5">VIP Reseller Price</th>
                  <th className="p-3.5">Reseller Margin</th>
                  <th className="p-3.5">Delivery Mode</th>
                  <th className="p-3.5">Reseller PID</th>
                  <th className="p-3.5">Upstream Duration Code</th>
                  <th className="p-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {products
                  .filter(p => variantProductFilter === 'ALL' || p.id === variantProductFilter)
                  .flatMap(p => p.variants || []).length === 0 ? (
                  <tr>
                    <td colSpan={10} className="p-8 text-center text-slate-500 font-mono">
                      No duration variants configured for this selection. Use "+ Add Duration & PID" or "⚡ Batch Duration Builder" above.
                    </td>
                  </tr>
                ) : (
                  products
                    .filter(p => variantProductFilter === 'ALL' || p.id === variantProductFilter)
                    .flatMap(p =>
                      (p.variants || []).map(v => {
                        const marginAmt = Math.max(0, (v.price || 0) - (v.resellerPrice || 0));
                        const marginPct = v.price ? Math.round((marginAmt / v.price) * 100) : 0;
                        const effectivePid = v.externalPid?.trim() || p.externalPid?.trim();
                        const effectiveDur = v.externalDuration?.trim() || v.durationLabel.trim();
                        return (
                          <tr key={v.id} className="hover:bg-white/[0.02] transition-colors">
                            <td className="p-3.5 font-bold text-white">
                              <div className="line-clamp-1">{p.name}</div>
                              <span className="text-[10px] text-slate-400 font-mono uppercase">{p.game}</span>
                            </td>
                            <td className="p-3.5 font-mono text-rose-400 font-bold whitespace-nowrap">
                              {v.durationLabel}
                            </td>
                            <td className="p-3.5 font-mono text-slate-300">
                              {v.durationHours}h
                            </td>
                            <td className="p-3.5 font-mono font-bold text-white">
                              ₹{v.price}
                            </td>
                            <td className="p-3.5 font-mono font-bold text-amber-400">
                              ₹{v.resellerPrice}
                            </td>
                            <td className="p-3.5 font-mono text-[11px]">
                              <span className="text-emerald-400 font-bold">₹{marginAmt}</span>
                              <span className="text-slate-500 text-[10px] ml-1">({marginPct}%)</span>
                            </td>
                            <td className="p-3.5">
                              {effectivePid ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 text-[10px] font-mono font-bold">
                                  <Zap className="w-3 h-3" />
                                  <span>RESELLER API</span>
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-800 text-slate-300 border border-white/10 text-[10px] font-mono">
                                  <span>LOCAL POOL</span>
                                </span>
                              )}
                            </td>
                            <td className="p-3.5 font-mono">
                              {effectivePid ? (
                                <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/30 text-amber-300 font-bold text-[11px] select-all">
                                  {effectivePid}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px] italic">Not Set (Local)</span>
                              )}
                            </td>
                            <td className="p-3.5 font-mono">
                              {effectivePid ? (
                                <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-bold text-[11px] select-all">
                                  {effectiveDur}
                                </span>
                              ) : (
                                <span className="text-slate-500 text-[11px]">-</span>
                              )}
                            </td>
                            <td className="p-3.5 text-right space-x-1.5 whitespace-nowrap">
                              <button
                                onClick={() => handleOpenEditVariant(v)}
                                className="px-2.5 py-1 rounded-lg bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 hover:text-white text-[11px] font-semibold border border-white/10 transition-colors inline-flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3 text-amber-400" />
                                <span>Edit</span>
                              </button>
                              <button
                                onClick={() => handleDeleteVariant(v.id)}
                                className="p-1.5 rounded-lg text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 transition-colors inline-flex items-center"
                                title="Delete variant"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: USER RESELLER API SYSTEM (யூசர் ரீசெல்லர் ஏபிஐ சிஸ்டம்) */}
      {activeTab === 'user_reseller_api' && (
        <div className="space-y-6">
          {/* Header Banner */}
          <div className="p-6 rounded-3xl bg-gradient-to-r from-amber-950/40 via-[#0d0d14] to-[#0d0d14] border border-amber-500/40 shadow-2xl flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-amber-500/20 border border-amber-500/40 text-amber-400 flex items-center justify-center shrink-0 shadow-lg shadow-amber-950/40">
                <Terminal className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-mono text-[9px] font-bold uppercase tracking-wider">
                    OUTBOUND RESELLER API
                  </span>
                  <span className="text-[10px] text-emerald-400 font-mono font-bold">
                    ⚡ Live Auto-Delivery
                  </span>
                </div>
                <h3 className="font-display font-black text-lg text-white uppercase tracking-wider mt-1">
                  USER RESELLER API SYSTEM (யூசர் ரீசெல்லர் ஏபிஐ சிஸ்டம்)
                </h3>
                <p className="text-xs text-slate-300 mt-0.5">
                  Set 2-digit or 3-digit numeric PIDs (e.g. 155, 66, 150, 123) for each of your products. Duration plans, prices, and stock counts are automatically mapped for external resellers.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap shrink-0">
              <button
                onClick={handleAutoAssignPids}
                className="px-4 py-2.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 border border-amber-500/40 text-amber-300 text-xs font-mono font-bold uppercase tracking-wider flex items-center gap-1.5 transition-all shadow-md"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>⚡ Auto-Assign 2/3 Digit PIDs</span>
              </button>
              <button
                onClick={() => {
                  const endpoint = `${window.location.origin}/api/v1/reseller/buy`;
                  navigator.clipboard.writeText(endpoint);
                  showToastSuccess('Copied API Endpoint', endpoint);
                }}
                className="px-4 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-200 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5 border border-white/10 transition-colors"
              >
                <Copy className="w-3.5 h-3.5" />
                <span>Copy API URL</span>
              </button>
            </div>
          </div>

          {/* Search Bar & Stats */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-[#0d0d14] p-4 rounded-2xl border border-white/5">
            <div className="relative w-full sm:w-80">
              <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
              <input
                type="text"
                value={userApiSearch}
                onChange={e => setUserApiSearch(e.target.value)}
                placeholder="Search products by name or PID..."
                className="w-full pl-10 pr-4 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white text-xs focus:outline-none focus:border-amber-500"
              />
            </div>

            <div className="text-xs font-mono text-slate-400">
              Configured Products:{' '}
              <strong className="text-white font-bold">{products.length}</strong> · Active Durations:{' '}
              <strong className="text-emerald-400 font-bold">
                {products.reduce((acc, p) => acc + (p.variants?.length || 0), 0)}
              </strong>
            </div>
          </div>

          {/* Products & Numeric PID Management Table */}
          <div className="overflow-x-auto rounded-3xl border border-white/5 bg-[#0d0d14]">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/5 text-[10px] font-mono text-slate-400 uppercase">
                <tr>
                  <th className="p-4">Product Name & Category</th>
                  <th className="p-4">2 or 3 Digit Numeric PID</th>
                  <th className="p-4">Plan Durations, Pricing & Live Stock</th>
                  <th className="p-4 text-right">Quick Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {products
                  .filter(p => 
                    !userApiSearch || 
                    p.name.toLowerCase().includes(userApiSearch.toLowerCase()) || 
                    String(p.externalPid).includes(userApiSearch) ||
                    p.game.toLowerCase().includes(userApiSearch.toLowerCase())
                  )
                  .map(p => {
                    const currentPid = editingPidMap[p.id] !== undefined ? editingPidMap[p.id] : (p.externalPid || '');
                    const isSaving = savingPidId === p.id;
                    const prodVariants = p.variants || [];

                    return (
                      <tr key={p.id} className="hover:bg-white/[0.02] transition-colors">
                        {/* Product info */}
                        <td className="p-4 font-bold text-white align-top">
                          <div className="text-sm">{p.name}</div>
                          <div className="flex items-center gap-1.5 mt-1 font-mono text-[10px]">
                            <span className="text-slate-400 uppercase">{p.game}</span>
                            {p.deviceType && (
                              <span className="px-1.5 py-0.5 rounded bg-white/5 text-rose-300 border border-white/10 uppercase font-semibold">
                                {p.deviceType}
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Numeric PID (2 or 3 Digit Number) */}
                        <td className="p-4 font-mono align-top">
                          <div className="space-y-2">
                            <div className="flex items-center gap-2">
                              {p.externalPid ? (
                                <button
                                  type="button"
                                  onClick={() => {
                                    navigator.clipboard.writeText(String(p.externalPid));
                                    showToastSuccess('Copied PID', `Product PID "${p.externalPid}" copied to clipboard!`);
                                  }}
                                  className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 font-mono font-black text-sm tracking-wider shadow-sm select-all inline-flex items-center gap-1.5 transition-colors cursor-pointer group active:scale-95"
                                  title="Click to copy Product PID"
                                >
                                  <span>{p.externalPid}</span>
                                  <Copy className="w-3.5 h-3.5 text-amber-400/80 group-hover:text-amber-300" />
                                </button>
                              ) : (
                                <span className="px-2.5 py-1 rounded-lg bg-rose-500/10 text-rose-400 border border-rose-500/30 text-[11px] font-bold">
                                  Missing PID
                                </span>
                              )}
                            </div>

                            {/* Direct Inline Edit Input */}
                            <div className="flex items-center gap-1.5">
                              <input
                                type="text"
                                maxLength={3}
                                value={currentPid}
                                onChange={e => {
                                  const val = e.target.value.replace(/\D/g, '');
                                  setEditingPidMap(prev => ({ ...prev, [p.id]: val }));
                                }}
                                placeholder="PID (e.g. 155)"
                                className="w-24 px-2.5 py-1 bg-black/60 border border-white/15 rounded-lg text-white font-mono text-xs focus:outline-none focus:border-amber-500 text-center font-bold tracking-widest"
                              />
                              <button
                                onClick={() => handleSaveProductPid(p.id, currentPid)}
                                disabled={isSaving || !currentPid}
                                className="px-2.5 py-1 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center gap-1"
                              >
                                {isSaving ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Save className="w-3 h-3" />}
                                <span>Save</span>
                              </button>
                            </div>
                            <span className="text-[10px] text-slate-500 font-mono block">
                              Must be 2 or 3 digits (e.g. 155, 66)
                            </span>
                          </div>
                        </td>

                        {/* Mapped Plan Durations */}
                        <td className="p-4 align-top">
                          {prodVariants.length === 0 ? (
                            <div className="text-slate-500 text-xs italic">
                              No durations configured yet. Click "+ Add Duration" to create options (e.g. 1 Hours, 1 Day Non-Root).
                            </div>
                          ) : (
                            <div className="flex flex-wrap gap-2">
                              {prodVariants.map(v => (
                                <div
                                  key={v.id}
                                  onClick={() => {
                                    navigator.clipboard.writeText(v.durationLabel);
                                    showToastSuccess('Copied Duration', `Duration "${v.durationLabel}" copied to clipboard!`);
                                  }}
                                  className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10 hover:border-amber-500/50 hover:bg-white/[0.06] transition-all space-y-1 min-w-[135px] cursor-pointer group select-none active:scale-95 shadow-sm"
                                  title="Click to copy duration label"
                                >
                                  <div className="font-mono font-bold text-emerald-400 text-xs flex items-center justify-between">
                                    <span className="flex items-center gap-1">
                                      <span className="group-hover:text-amber-300 transition-colors">{v.durationLabel}</span>
                                      <Copy className="w-3 h-3 text-slate-500 group-hover:text-amber-300 transition-colors" />
                                    </span>
                                    <span className="text-[10px] text-slate-400 font-normal">{v.durationHours}h</span>
                                  </div>
                                  <div className="flex items-center justify-between text-[11px] font-mono">
                                    <span className="text-slate-400">Retail: ₹{v.price}</span>
                                    <span className="text-amber-400 font-bold">VIP: ₹{v.resellerPrice}</span>
                                  </div>
                                  <div className="text-[10px] font-mono text-slate-400 flex items-center gap-1">
                                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                                    <span>Stock: {v.stockCount ?? 0} keys</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </td>

                        {/* Quick Actions */}
                        <td className="p-4 text-right align-top space-y-1.5 whitespace-nowrap">
                          <button
                            onClick={() => {
                              setSelectedProdForVar(p.id);
                              setVarEntryMode('single');
                              setIsCreatingVariant(true);
                            }}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-300 text-xs font-semibold border border-emerald-500/30 transition-colors inline-flex items-center gap-1"
                          >
                            <Plus className="w-3.5 h-3.5" />
                            <span>+ Add Duration</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
              </tbody>
            </table>
          </div>

          {/* Reseller API Usage Instructions & Code */}
          <div className="p-6 rounded-3xl bg-[#0a0a0f] border border-white/10 space-y-4">
            <div className="flex items-center gap-2">
              <Code className="w-5 h-5 text-amber-400" />
              <h4 className="font-display font-black text-sm text-white uppercase tracking-wider">
                HOW EXTERNAL RESELLERS CALL YOUR API
              </h4>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-mono">
              <div className="p-4 rounded-2xl bg-black/60 border border-white/5 space-y-2">
                <div className="text-amber-400 font-bold uppercase text-[11px]">Request Specifications</div>
                <ul className="space-y-1.5 text-slate-300 text-[11px]">
                  <li>• <strong>Endpoint:</strong> <code className="text-emerald-400 select-all">POST /api/v1/reseller/buy</code></li>
                  <li>• <strong>Header:</strong> <code className="text-sky-300">Content-Type: application/json</code></li>
                  <li>• <strong>product_id:</strong> The 2 or 3-digit numeric PID (e.g. 155, 66, 150)</li>
                  <li>• <strong>duration:</strong> Exact plan duration label (e.g. 1 Hours, 1 DAYS, 1 Day Non-Root)</li>
                  <li>• <strong>quantity:</strong> Number of keys to buy (1 to 100)</li>
                  <li>• <strong>api_key:</strong> User's active reseller token</li>
                </ul>
              </div>

              <div className="p-4 rounded-2xl bg-black/60 border border-white/5 space-y-2">
                <div className="text-amber-400 font-bold uppercase text-[11px]">Sample JSON Payload</div>
                <pre className="text-emerald-300 text-[11px] overflow-x-auto select-all leading-relaxed bg-[#070709] p-3 rounded-xl">
{`{
  "api_key": "nexa_live_xxxxxxxxxxxxxxxx",
  "action": "buy",
  "product_id": "155",
  "duration": "1 Hours",
  "quantity": 1
}`}
                </pre>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 5. KEY MANAGEMENT & BULK IMPORT */}
      {activeTab === 'keys' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                DIGITAL KEY INVENTORY
              </h3>
              <p className="text-xs text-slate-400">
                Total Keys: {keys.length} · In Stock: {keys.filter(k => !k.isUsed && k.status === 'ACTIVE').length}
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsGeneratingKeys(true)}
                className="px-3.5 py-2 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-white text-xs font-semibold border border-white/10"
              >
                Auto-Generate
              </button>
              <button
                onClick={() => setIsBulkImporting(true)}
                className="px-3.5 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold uppercase tracking-wider flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Bulk Import Keys</span>
              </button>
            </div>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0d0d14] max-h-[500px]">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/5 text-[10px] font-mono text-slate-400 uppercase sticky top-0 bg-[#0d0d14]">
                <tr>
                  <th className="p-3.5">Product & Duration</th>
                  <th className="p-3.5">Key Code</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Assigned To</th>
                  <th className="p-3.5 text-right">Delete</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {keys.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-mono">
                      No digital keys in stock. Use 'Auto-Generate' or 'Bulk Import Keys' above to add stock.
                    </td>
                  </tr>
                ) : (
                  keys.map(k => (
                    <tr key={k.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5">
                        <div className="font-bold text-white">{k.productName}</div>
                        <div className="text-[10px] text-rose-400 font-mono">{k.durationLabel}</div>
                      </td>
                      <td className="p-3.5 font-mono text-slate-200 select-all font-semibold">
                        {k.keyCode}
                      </td>
                      <td className="p-3.5">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                            k.status === 'ACTIVE' && !k.isUsed
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : k.status === 'USED'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {k.status}
                        </span>
                      </td>
                      <td className="p-3.5 font-mono text-slate-400">
                        {k.assignedUsername ? `@${k.assignedUsername}` : 'Unassigned (Stock)'}
                      </td>
                      <td className="p-3.5 text-right">
                        <button
                          onClick={() => handleDeleteKey(k.id)}
                          className="p-1 rounded text-slate-500 hover:text-rose-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 6. DEPOSITS MANAGEMENT */}
      {activeTab === 'deposits' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
              UPI DEPOSITS LOG
            </h3>
            <span className="text-xs font-mono text-slate-400">{deposits.length} transactions</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0d0d14]">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/5 text-[10px] font-mono text-slate-400 uppercase">
                <tr>
                  <th className="p-3.5">User</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Transaction ID</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {deposits.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-8 text-center text-slate-500 font-mono">
                      No UPI deposits recorded yet.
                    </td>
                  </tr>
                ) : (
                  deposits.map(d => (
                    <tr key={d.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5 font-bold text-white">@{d.username}</td>
                      <td className="p-3.5 font-mono font-bold text-emerald-400">₹{d.amount.toFixed(2)}</td>
                      <td className="p-3.5 font-mono text-slate-400">{d.transactionId}</td>
                      <td className="p-3.5">
                        <span
                          className={`text-[10px] font-mono font-bold px-2 py-0.5 rounded border uppercase ${
                            d.status === 'SUCCESS'
                              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
                              : d.status === 'PENDING'
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                              : 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                          }`}
                        >
                          {d.status}
                        </span>
                      </td>
                      <td className="p-3.5 text-right">
                        {d.status === 'PENDING' && (
                          <button
                            onClick={() => handleApproveDeposit(d.id)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold uppercase transition-colors"
                          >
                            Manual Approve
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 7. ORDERS LOG */}
      {activeTab === 'orders' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
              FULFILLED CUSTOMER ORDERS
            </h3>
            <span className="text-xs font-mono text-slate-400">{orders.length} orders</span>
          </div>

          <div className="overflow-x-auto rounded-2xl border border-white/5 bg-[#0d0d14]">
            <table className="w-full text-left text-xs">
              <thead className="bg-white/[0.02] border-b border-white/5 text-[10px] font-mono text-slate-400 uppercase">
                <tr>
                  <th className="p-3.5">Order ID</th>
                  <th className="p-3.5">Buyer</th>
                  <th className="p-3.5">Product / Variant</th>
                  <th className="p-3.5">Paid</th>
                  <th className="p-3.5">Delivered Key</th>
                  <th className="p-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-slate-500 font-mono">
                      No customer orders recorded yet.
                    </td>
                  </tr>
                ) : (
                  orders.map(o => (
                    <tr key={o.id} className="hover:bg-white/[0.02]">
                      <td className="p-3.5 font-mono text-rose-400 font-bold">{o.id}</td>
                      <td className="p-3.5 font-bold text-white">@{o.username}</td>
                      <td className="p-3.5">
                        <span className="text-white font-semibold">{o.productName}</span>
                        <span className="text-[10px] text-slate-400 font-mono block">{o.durationLabel}</span>
                      </td>
                      <td className="p-3.5 font-mono font-bold text-white">₹{o.pricePaid}</td>
                      <td className="p-3.5 font-mono text-slate-300 select-all">{o.deliveredKeyCode}</td>
                      <td className="p-3.5 font-mono text-slate-400">
                        {new Date(o.createdAt).toLocaleString()}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 8. PAYMENT GATEWAY SETTINGS & CONSOLE */}
      {activeTab === 'gateway' && (
        <div className="space-y-6">
          {/* Quick Gateway Presets Banner */}
          <div className="p-4 sm:p-5 rounded-3xl bg-gradient-to-r from-emerald-950/40 via-[#0d0d14] to-rose-950/40 border border-emerald-500/30 space-y-3">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                  ONE-CLICK PAYMENT GATEWAY PRESETS
                </h3>
              </div>
              <span className="text-[11px] text-slate-400 font-mono">
                Click a preset to auto-populate production endpoints &amp; API keys
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Preset 1: Render FGW Live */}
              <button
                type="button"
                onClick={() => {
                  setGatewayConfig(prev => ({
                    ...prev,
                    gatewayName: 'FamPay UPI Payment Gateway',
                    gatewayType: 'RENDER_FGW' as any,
                    apiUrl: 'https://payment-gateway-87gk.onrender.com/api/create-order',
                    qrAliasUrl: 'https://payment-gateway-87gk.onrender.com/api/qr.php',
                    statusUrl: 'https://payment-gateway-87gk.onrender.com/api/v1/order/status',
                    apiKey: 'fam_67c5e10fc423d5ef37aac212a20e55c63d51b7fe',
                    successUrl: 'https://yoursite.com/payment-success',
                    redirectUrl: 'https://yoursite.com/payment-success',
                    cancelUrl: 'https://yoursite.com/payment-cancel',
                    upiVpa: '8056317218@fam',
                    upiMerchantName: 'Kalam Akash',
                  }));
                  showToastSuccess('FamPay Render Gateway Applied', 'Live endpoints & API Key loaded.');
                }}
                className="p-3.5 rounded-2xl bg-black/50 border border-emerald-500/40 hover:border-emerald-400 text-left transition-all group"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-emerald-400 flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5 text-emerald-400" />
                    <span>FamPay Render Gateway</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-emerald-500/20 text-emerald-300 font-bold">
                    ACTIVE LIVE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1 font-mono">
                  https://payment-gateway-87gk.onrender.com/api/create-order
                </p>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">X-Api-Key: fam_67c5e1...</div>
              </button>

              {/* Preset 2: FamGateway */}
              <button
                type="button"
                onClick={() => {
                  setGatewayConfig(prev => ({
                    ...prev,
                    gatewayName: 'FamGateway UPI Automated',
                    gatewayType: 'FAMGATEWAY' as any,
                    apiUrl: 'https://famgateway.in/api/create-order',
                    qrAliasUrl: 'https://famgateway.in/api/qr.php',
                    apiKey: 'fam_a9527c6c2dd4d26ad5223cfc3c4c5fa9289b574e',
                    redirectUrl: 'https://yoursite.com/payment-success',
                  }));
                  showToastSuccess('FamGateway Preset Applied');
                }}
                className="p-3.5 rounded-2xl bg-black/50 border border-white/10 hover:border-white/20 text-left transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <Radio className="w-3.5 h-3.5 text-rose-400" />
                    <span>FamGateway Legacy</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold">
                    MIRROR
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1 font-mono">
                  https://famgateway.in/api/create-order
                </p>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">X-Api-Key: fam_a9527c...</div>
              </button>

              {/* Preset 3: Direct UPI QR */}
              <button
                type="button"
                onClick={() => {
                  setGatewayConfig(prev => ({
                    ...prev,
                    gatewayName: 'Direct Peer-to-Peer UPI',
                    gatewayType: 'DIRECT_UPI' as any,
                    upiVpa: '8056317218@fam',
                    upiMerchantName: 'FamPay',
                  }));
                  showToastSuccess('Direct UPI Preset Applied');
                }}
                className="p-3.5 rounded-2xl bg-black/50 border border-white/10 hover:border-white/20 text-left transition-all"
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-xs font-bold text-white flex items-center gap-1.5">
                    <QrCode className="w-3.5 h-3.5 text-sky-400" />
                    <span>Direct Peer-to-Peer UPI</span>
                  </span>
                  <span className="text-[9px] font-mono px-1.5 py-0.5 rounded bg-sky-500/20 text-sky-300 font-bold">
                    0% FEE
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 line-clamp-1 font-mono">
                  8056317218@fam (FamPay)
                </p>
                <div className="text-[10px] text-slate-500 mt-1 font-mono">Internal instant QR renderer</div>
              </button>
            </div>
          </div>

          {/* Main Gateway Settings Form */}
          <form onSubmit={handleSaveGatewaySettings} className="p-6 rounded-3xl bg-[#0d0d14] border border-white/5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/5 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                    PAYMENT GATEWAY CONFIGURATION
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated peer-to-peer UPI payment verification, order generation, and live webhook receiver
                </p>
              </div>
              <button
                type="button"
                onClick={handleTestGateway}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-rose-400 border border-rose-500/30 transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Test Gateway Ping</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  GATEWAY PROVIDER NAME
                </label>
                <input
                  type="text"
                  value={gatewayConfig.gatewayName || ''}
                  onChange={e => setGatewayConfig({ ...gatewayConfig, gatewayName: e.target.value })}
                  placeholder="FamPay UPI Payment Gateway"
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  PAYMENT GATEWAY API KEY (X-Api-Key)
                </label>
                <input
                  type="text"
                  value={gatewayConfig.apiKey || ''}
                  onChange={e => setGatewayConfig({ ...gatewayConfig, apiKey: e.target.value })}
                  placeholder="fam_67c5e10fc423d5ef37aac212a20e55c63d51b7fe"
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  ORDER CREATE REST API URL (POST JSON)
                </label>
                <input
                  type="text"
                  value={gatewayConfig.apiUrl || 'https://payment-gateway-87gk.onrender.com/api/create-order'}
                  onChange={e => setGatewayConfig({ ...gatewayConfig, apiUrl: e.target.value })}
                  placeholder="https://payment-gateway-87gk.onrender.com/api/create-order"
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  QUERY ALIAS URL (GET QR)
                </label>
                <input
                  type="text"
                  value={gatewayConfig.qrAliasUrl || 'https://payment-gateway-87gk.onrender.com/api/qr.php'}
                  onChange={e => setGatewayConfig({ ...gatewayConfig, qrAliasUrl: e.target.value })}
                  placeholder="https://payment-gateway-87gk.onrender.com/api/qr.php"
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  SUCCESS REDIRECT URL
                </label>
                <input
                  type="text"
                  value={gatewayConfig.successUrl || gatewayConfig.redirectUrl || 'https://yoursite.com/success'}
                  onChange={e => setGatewayConfig({ ...gatewayConfig, successUrl: e.target.value, redirectUrl: e.target.value })}
                  placeholder="https://yoursite.com/success"
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  CANCEL REDIRECT URL
                </label>
                <input
                  type="text"
                  value={gatewayConfig.cancelUrl || 'https://yoursite.com/cancel'}
                  onChange={e => setGatewayConfig({ ...gatewayConfig, cancelUrl: e.target.value })}
                  placeholder="https://yoursite.com/cancel"
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  UPI VPA (PAYEE ADDRESS)
                </label>
                <input
                  type="text"
                  value={gatewayConfig.upiVpa || '8056317218@fam'}
                  onChange={e => setGatewayConfig({ ...gatewayConfig, upiVpa: e.target.value })}
                  placeholder="8056317218@fam"
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  MERCHANT PAYEE NAME
                </label>
                <input
                  type="text"
                  value={gatewayConfig.upiMerchantName || 'FamPay'}
                  onChange={e => setGatewayConfig({ ...gatewayConfig, upiMerchantName: e.target.value })}
                  placeholder="FamPay"
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  MINIMUM DEPOSIT (₹)
                </label>
                <input
                  type="number"
                  value={gatewayConfig.minDeposit || 1}
                  onChange={e => setGatewayConfig({ ...gatewayConfig, minDeposit: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  PAYMENT EXPIRY (MINUTES)
                </label>
                <input
                  type="number"
                  value={gatewayConfig.paymentExpiryMinutes || 5}
                  onChange={e => setGatewayConfig({ ...gatewayConfig, paymentExpiryMinutes: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  WEBHOOK NOTIFICATION URL
                </label>
                <input
                  type="text"
                  value={gatewayConfig.webhookUrl || 'https://panel.nexa.internal/api/payments/webhook'}
                  onChange={e => setGatewayConfig({ ...gatewayConfig, webhookUrl: e.target.value })}
                  placeholder="https://yoursite.com/api/payments/webhook"
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              {/* Fake / Test Payment Mode Toggle */}
              <div className="sm:col-span-2 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-between gap-4">
                <div>
                  <div className="text-xs font-bold text-amber-300 uppercase tracking-wide flex items-center gap-2">
                    <Zap className="w-4 h-4 text-amber-400" />
                    <span>⚡ TEST / FAKE PAYMENT MODE (INSTANT APPROVAL)</span>
                  </div>
                  <p className="text-[11px] text-slate-300 mt-1">
                    When enabled, users can test wallet deposits using Fake/Demo Pay or manual UTR submissions instantly without real bank transactions.
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={!!gatewayConfig.testMode}
                  onChange={e => setGatewayConfig({ ...gatewayConfig, testMode: e.target.checked })}
                  className="w-6 h-6 accent-amber-500 rounded cursor-pointer shrink-0"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-rose-950/40"
              >
                Save Gateway Settings
              </button>
              <span className="text-[11px] font-mono text-slate-400">
                Peer-to-Peer 0% Fee Engine: <span className="text-emerald-400 font-bold">ACTIVE</span>
              </span>
            </div>
          </form>

          {/* Interactive Live Order & QR Test Console */}
          <div className="p-6 rounded-3xl bg-[#0d0d14] border border-emerald-500/20 shadow-xl shadow-emerald-950/20 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/5 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-emerald-500/20 to-teal-600/30 border border-emerald-500/30 text-emerald-400 flex items-center justify-center">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                    PAYMENT GATEWAY LIVE ORDER &amp; QR TEST CONSOLE
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Live dispatch test for <span className="font-mono text-emerald-400">{gatewayConfig.apiUrl || 'https://payment-gateway-87gk.onrender.com/api/v1/order/create'}</span>
                  </p>
                </div>
              </div>

              {/* Method Switcher */}
              <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl self-start sm:self-auto">
                <button
                  type="button"
                  onClick={() => setTestFgMethod('POST')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    testFgMethod === 'POST'
                      ? 'bg-rose-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  POST JSON (Standard)
                </button>
                <button
                  type="button"
                  onClick={() => setTestFgMethod('GET')}
                  className={`px-3 py-1 rounded-lg text-xs font-mono font-bold transition-all ${
                    testFgMethod === 'GET'
                      ? 'bg-emerald-600 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  GET Query (Alias)
                </button>
              </div>
            </div>

            <form onSubmit={handleRunFamGatewayTest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 text-xs">
                {/* Amount */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    amount (INR)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    value={testFgAmount}
                    onChange={e => setTestFgAmount(parseFloat(e.target.value) || 0)}
                    placeholder="500"
                    required
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {[10, 50, 100, 500, 1000].map(amt => (
                      <button
                        key={amt}
                        type="button"
                        onClick={() => setTestFgAmount(amt)}
                        className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                          testFgAmount === amt
                            ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                            : 'bg-white/[0.02] text-slate-400 border-white/5 hover:text-white'
                        }`}
                      >
                        ₹{amt}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Customer Name */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    customer_name
                  </label>
                  <input
                    type="text"
                    value={testFgCustomerName}
                    onChange={e => setTestFgCustomerName(e.target.value)}
                    placeholder="Ramesh Kumar"
                    required
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[9px] text-slate-500 mt-1 block">Customer / gamer full name</span>
                </div>

                {/* Note / Order Description */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    note (Order Description)
                  </label>
                  <input
                    type="text"
                    value={testFgNote}
                    onChange={e => setTestFgNote(e.target.value)}
                    placeholder="Payment for Order #1024"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[9px] text-slate-500 mt-1 block">Custom memo / invoice reference</span>
                </div>

                {/* Customer Email */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    customer_email
                  </label>
                  <input
                    type="email"
                    value={testFgCustomerEmail}
                    onChange={e => setTestFgCustomerEmail(e.target.value)}
                    placeholder="ramesh@example.com"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-xs focus:border-emerald-500 focus:outline-none"
                  />
                  <span className="text-[9px] text-slate-500 mt-1 block">Receipt notification email</span>
                </div>
              </div>

              {/* Exact Curl Command Preview */}
              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/5 font-mono text-[11px] text-slate-300 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider border-b border-white/5 pb-2">
                  <span className="flex items-center gap-1.5 text-emerald-400">
                    <Code className="w-3.5 h-3.5" />
                    <span>Exact Terminal Curl Command ({testFgMethod === 'POST' ? 'POST JSON' : 'GET Query'})</span>
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const snippet =
                        testFgMethod === 'POST'
                          ? `curl -X POST "${gatewayConfig.apiUrl || 'https://payment-gateway-87gk.onrender.com/api/create-order'}" \\\n  -H "Content-Type: application/json" \\\n  -H "X-Api-Key: ${gatewayConfig.apiKey || 'fam_67c5e10fc423d5ef37aac212a20e55c63d51b7fe'}" \\\n  -d '{\n    "amount": ${testFgAmount.toFixed(2)},\n    "customer_name": "${testFgCustomerName}",\n    "customer_email": "${testFgCustomerEmail}",\n    "redirect_url": "${gatewayConfig.successUrl || gatewayConfig.redirectUrl || 'https://yoursite.com/payment-success'}"\n  }'`
                          : `curl -X GET "${gatewayConfig.qrAliasUrl || 'https://payment-gateway-87gk.onrender.com/api/qr.php'}?api_key=${gatewayConfig.apiKey || 'fam_67c5e10fc423d5ef37aac212a20e55c63d51b7fe'}&amount=${testFgAmount}&customer_name=${encodeURIComponent(testFgCustomerName)}"`;
                      navigator.clipboard.writeText(snippet);
                      showToastSuccess('Curl command copied to clipboard');
                    }}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300 flex items-center gap-1 font-mono"
                  >
                    <Copy className="w-3 h-3" />
                    <span>Copy Command</span>
                  </button>
                </div>

                <div className="text-slate-300 overflow-x-auto p-2 bg-[#08080c] rounded-xl text-[10px] leading-relaxed select-all">
                  {testFgMethod === 'POST' ? (
                    <>
                      <span className="text-amber-400">curl</span> -X POST <span className="text-emerald-300">"{gatewayConfig.apiUrl || 'https://payment-gateway-87gk.onrender.com/api/create-order'}"</span> \<br />
                      &nbsp;&nbsp;-H <span className="text-emerald-300">"Content-Type: application/json"</span> \<br />
                      &nbsp;&nbsp;-H <span className="text-emerald-300">"X-Api-Key: {gatewayConfig.apiKey ? `${gatewayConfig.apiKey.slice(0, 10)}...` : 'fam_67c5e10fc423d5ef37aac212a20e55c63d51b7fe'}"</span> \<br />
                      &nbsp;&nbsp;-d <span className="text-purple-300">'{JSON.stringify({
                        amount: Number(testFgAmount.toFixed(2)),
                        customer_name: testFgCustomerName,
                        customer_email: testFgCustomerEmail,
                        redirect_url: gatewayConfig.successUrl || gatewayConfig.redirectUrl || 'https://yoursite.com/payment-success'
                      }, null, 2)}'</span>
                    </>
                  ) : (
                    <>
                      <span className="text-amber-400">curl</span> -X GET <span className="text-emerald-300">"{gatewayConfig.qrAliasUrl || 'https://payment-gateway-87gk.onrender.com/api/qr.php'}?api_key={gatewayConfig.apiKey || 'fam_67c5e10fc423d5ef37aac212a20e55c63d51b7fe'}&amp;amount={testFgAmount}&amp;customer_name={encodeURIComponent(testFgCustomerName)}"</span>
                    </>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isTestingFg}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-teal-600 to-cyan-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/60 active:scale-[0.99] disabled:opacity-50"
                >
                  {isTestingFg ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>DISPATCHING LIVE GATEWAY ORDER...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>DISPATCH LIVE GATEWAY ORDER</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Test Results Display */}
            {fgTestResult && (
              <div className="p-4 rounded-2xl bg-[#09090f] border border-white/10 space-y-4 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        fgTestResult.success
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                      }`}
                    >
                      {fgTestResult.success ? `HTTP ${fgTestResult.status} SUCCESS` : `HTTP ${fgTestResult.status} RESPONSE`}
                    </span>
                    <span className="text-xs font-mono text-slate-300">
                      Method: <strong className="text-white">{fgTestResult.method}</strong>
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Latency: <strong className="text-emerald-400">{fgTestResult.latencyMs}ms</strong>
                  </span>
                </div>

                {/* If Order Data parsed */}
                {fgTestResult.orderData && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs">
                    <div className="space-y-2">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Order ID:</span>
                        <span className="font-mono font-bold text-emerald-400 select-all">
                          {fgTestResult.orderData.order_id || fgTestResult.orderData.id || fgTestResult.orderData.orderId || 'N/A'}
                        </span>
                      </div>
                      {fgTestResult.orderData.upi_id && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">UPI ID / VPA:</span>
                          <span className="font-mono text-white select-all">
                            {fgTestResult.orderData.upi_id}
                          </span>
                        </div>
                      )}
                      {(fgTestResult.orderData.amount || fgTestResult.orderData.payable_amount) && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Amount:</span>
                          <span className="font-mono font-bold text-white">
                            ₹{fgTestResult.orderData.payable_amount || fgTestResult.orderData.amount}
                          </span>
                        </div>
                      )}
                      {(fgTestResult.orderData.checkout_url || fgTestResult.orderData.payment_url || fgTestResult.orderData.url) && (
                        <div className="flex justify-between items-center">
                          <span className="text-slate-400">Checkout Link:</span>
                          <a
                            href={fgTestResult.orderData.checkout_url || fgTestResult.orderData.payment_url || fgTestResult.orderData.url}
                            target="_blank"
                            rel="noreferrer"
                            className="text-amber-400 hover:text-amber-300 flex items-center gap-1 font-mono text-[11px]"
                          >
                            <span>Open Checkout</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {fgTestResult.orderData.upi_intent && (
                        <div className="pt-2 border-t border-white/5">
                          <span className="text-[10px] text-slate-400 block mb-1">Native UPI Intent:</span>
                          <div className="p-1.5 rounded-lg bg-black/60 font-mono text-[10px] text-slate-300 break-all select-all">
                            {fgTestResult.orderData.upi_intent}
                          </div>
                        </div>
                      )}
                    </div>

                    {/* QR Preview */}
                    {(fgTestResult.orderData.qr_url || fgTestResult.orderData.qr_code || fgTestResult.orderData.upi_intent) && (
                      <div className="flex flex-col items-center justify-center p-2 bg-white rounded-xl">
                        <img
                          src={
                            fgTestResult.orderData.qr_url ||
                            fgTestResult.orderData.qr_code ||
                            `https://api.qrserver.com/v1/create-qr-code/?size=250x250&data=${encodeURIComponent(fgTestResult.orderData.upi_intent || 'upi://pay')}`
                          }
                          alt="Generated Gateway QR"
                          className="w-32 h-32 object-contain"
                        />
                        <span className="text-[9px] font-mono text-slate-700 mt-1 font-semibold">
                          LIVE GATEWAY QR CODE
                        </span>
                      </div>
                    )}
                  </div>
                )}

                {/* Raw Response Text */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    RAW RESPONSE BODY
                  </label>
                  <div className="p-2.5 rounded-xl bg-black/60 border border-white/10 font-mono text-[11px] text-emerald-300 break-all select-all max-h-40 overflow-y-auto">
                    {fgTestResult.rawResponse}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}


      {/* TAB CONTENT: 9. RESELLER API SETTINGS & BUY KEY GENERATOR TESTER */}
      {activeTab === 'reseller' && (
        <div className="space-y-6">
          {/* Main Reseller Configuration Form */}
          <form onSubmit={handleSaveResellerSettings} className="p-6 rounded-3xl bg-[#0d0d14] border border-white/5 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/5 gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                  <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                    EXTERNAL RESELLER API INTEGRATION
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Automated upstream digital key generation via POST curl protocol
                </p>
              </div>
              <button
                type="button"
                onClick={handleTestReseller}
                className="px-3.5 py-1.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-xs font-semibold text-amber-400 border border-amber-500/30 transition-colors flex items-center justify-center gap-1.5 self-start sm:self-auto"
              >
                <Radio className="w-3.5 h-3.5" />
                <span>Test Upstream Ping</span>
              </button>
            </div>

            {/* Key Generator Template Presets */}
            <div className="p-3 rounded-2xl bg-black/40 border border-white/5 space-y-2">
              <span className="text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 block">
                ⚡ QUICK PRESETS: CONNECT EXTERNAL KEY GENERATOR WEBSITE
              </span>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() =>
                    setResellerConfig({
                      ...resellerConfig,
                      apiUrl: 'https://bantibhaiya.to/api/reseller_v1.php',
                      apiKey: '5841ac0e6b458bdde0ffbe2baa095306',
                      masterKey: 'a7f3e8b2c9d1f4a6b8c2d5e9f1a3b6c8',
                      defaultAndroidId: '0b9b969bc2e7997b',
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/30 text-amber-300 text-[11px] font-mono font-bold transition-all flex items-center gap-1.5"
                >
                  <Zap className="w-3 h-3 text-amber-400" />
                  <span>PHP Reseller v1 API (bantibhaiya.to)</span>
                </button>

                <button
                  type="button"
                  onClick={() =>
                    setResellerConfig({
                      ...resellerConfig,
                      apiUrl: 'https://keygenerator.external-panel.com/api/v1/generate',
                      apiKey: 'ext_key_gen_88f2190c',
                      masterKey: 'master_secret_key_9921',
                      defaultAndroidId: '0b9b969bc2e7997b',
                    })
                  }
                  className="px-3 py-1.5 rounded-xl bg-rose-500/15 hover:bg-rose-500/25 border border-rose-500/30 text-rose-300 text-[11px] font-mono font-bold transition-all flex items-center gap-1.5"
                >
                  <Globe className="w-3 h-3 text-rose-400" />
                  <span>External Key Generator Panel</span>
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  UPSTREAM API URL
                </label>
                <input
                  type="text"
                  value={resellerConfig.apiUrl || ''}
                  onChange={e => setResellerConfig({ ...resellerConfig, apiUrl: e.target.value })}
                  placeholder="https://bantibhaiya.to/api/reseller_v1.php"
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  RESELLER API KEY (POST 'api_key')
                </label>
                <input
                  type="text"
                  value={resellerConfig.apiKey || ''}
                  onChange={e => setResellerConfig({ ...resellerConfig, apiKey: e.target.value })}
                  placeholder="5841ac0e6b458bdde0ffbe2baa095306"
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  MASTER KEY (HEADER 'x-master-key')
                </label>
                <input
                  type="text"
                  value={resellerConfig.masterKey || ''}
                  onChange={e => setResellerConfig({ ...resellerConfig, masterKey: e.target.value })}
                  placeholder="a7f3e8b2c9d1f4a6b8c2d5e9f1a3b6c8"
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  DEFAULT ANDROID ID (DEVICE-BOUND / V1)
                </label>
                <input
                  type="text"
                  value={resellerConfig.defaultAndroidId || ''}
                  onChange={e => setResellerConfig({ ...resellerConfig, defaultAndroidId: e.target.value })}
                  placeholder="0b9b969bc2e7997b"
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  TIMEOUT (MS)
                </label>
                <input
                  type="number"
                  value={resellerConfig.timeoutMs || 20000}
                  onChange={e => setResellerConfig({ ...resellerConfig, timeoutMs: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                  MAX RETRIES
                </label>
                <input
                  type="number"
                  value={resellerConfig.retryAttempts || 2}
                  onChange={e => setResellerConfig({ ...resellerConfig, retryAttempts: Number(e.target.value) })}
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                />
              </div>
            </div>

            <div className="pt-2 flex items-center justify-between">
              <button
                type="submit"
                className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white font-bold text-xs uppercase tracking-wider transition-all shadow-lg shadow-amber-950/40"
              >
                Save Reseller Configuration
              </button>
              <span className="text-[11px] font-mono text-slate-400">
                Fallback key minting: <span className="text-emerald-400 font-bold">ACTIVE (0 Downtime)</span>
              </span>
            </div>
          </form>

          {/* Interactive User Buy Key Generator API System Tester */}
          <div className="p-6 rounded-3xl bg-[#0d0d14] border border-rose-500/20 shadow-xl shadow-rose-950/20 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/5 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-rose-500/20 to-red-600/30 border border-rose-500/30 text-rose-400 flex items-center justify-center">
                  <Terminal className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                    USER BUY KEY GENERATOR API SYSTEM
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Direct test console for <span className="font-mono text-rose-400">reseller_v1.php</span> key minting
                  </p>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-full bg-rose-500/10 border border-rose-500/20 text-rose-400 text-[10px] font-mono font-bold self-start sm:self-auto">
                ACTION: BUY
              </span>
            </div>

            <form onSubmit={handleRunKeyGenTest} className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                {/* Target Product PID */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      product_id (Exact Product PID)
                    </label>
                  </div>
                  <input
                    type="text"
                    value={testProdPid}
                    onChange={e => setTestProdPid(e.target.value)}
                    placeholder="e.g. PRODUCT_PID_ID or PID_FF_V1_1DAY"
                    required
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-xs focus:border-rose-500 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['PRODUCT_PID_ID', 'EXT-FF-1H', 'EXT-FF-1D', 'EXT-BG-1D', 'EXT-COD-1D'].map(pid => (
                      <button
                        key={pid}
                        type="button"
                        onClick={() => setTestProdPid(pid)}
                        className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                          testProdPid === pid
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-white/[0.02] text-slate-400 border-white/5 hover:text-white'
                        }`}
                      >
                        {pid}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    duration (Duration Name)
                  </label>
                  <input
                    type="text"
                    value={testDuration}
                    onChange={e => setTestDuration(e.target.value)}
                    placeholder="1 Day, 1 Hours, 3 Hours, 7 Days, 30 Days"
                    required
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-xs focus:border-rose-500 focus:outline-none"
                  />
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {['1 Hours', '3 Hours', '1 Day', '7 Days', '30 Days'].map(dur => (
                      <button
                        key={dur}
                        type="button"
                        onClick={() => setTestDuration(dur)}
                        className={`text-[9px] font-mono px-2 py-0.5 rounded border transition-colors ${
                          testDuration === dur
                            ? 'bg-rose-500/20 text-rose-300 border-rose-500/40'
                            : 'bg-white/[0.02] text-slate-400 border-white/5 hover:text-white'
                        }`}
                      >
                        {dur}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Android ID */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1">
                      <Smartphone className="w-3 h-3 text-rose-400" />
                      <span>android_id</span>
                    </label>
                    <button
                      type="button"
                      onClick={handleRandomizeTestAndroidId}
                      className="text-[10px] text-rose-400 hover:text-rose-300 flex items-center gap-0.5 font-mono"
                    >
                      <Sparkles className="w-2.5 h-2.5" />
                      <span>Randomize</span>
                    </button>
                  </div>
                  <input
                    type="text"
                    value={testAndroidId}
                    onChange={e => setTestAndroidId(e.target.value)}
                    placeholder="0b9b969bc2e7997b"
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-xs focus:border-rose-500 focus:outline-none"
                  />
                  <p className="text-[9px] text-slate-400 mt-1.5 leading-relaxed">
                    Required <span className="text-amber-400 font-semibold">ONLY</span> for Device-Bound / V1 Products, V2 ke liye optional/not required
                  </p>
                </div>
              </div>

              {/* Live Payload Preview Accordion */}
              <div className="p-3.5 rounded-2xl bg-black/60 border border-white/5 font-mono text-[11px] text-slate-300 space-y-2">
                <div className="flex items-center justify-between text-[10px] text-slate-400 uppercase tracking-wider border-b border-white/5 pb-2">
                  <span className="flex items-center gap-1.5 text-rose-400">
                    <Code className="w-3.5 h-3.5" />
                    <span>Exact Curl Dispatch Payload (PHP Specification)</span>
                  </span>
                  <span>ENDPOINT: {resellerConfig.apiUrl || 'https://bantibhaiya.to/api/reseller_v1.php'}</span>
                </div>
                <div className="text-slate-300 overflow-x-auto p-2 bg-[#08080c] rounded-xl text-[10px] leading-relaxed select-all">
                  <span className="text-purple-400">$data</span> = [<br />
                  &nbsp;&nbsp;<span className="text-emerald-300">'api_key'</span>&nbsp;&nbsp;&nbsp;&nbsp;=&gt; <span className="text-amber-300">'{resellerConfig.apiKey || '5841ac0e6b458bdde0ffbe2baa095306'}'</span>,<br />
                  &nbsp;&nbsp;<span className="text-emerald-300">'action'</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;=&gt; <span className="text-amber-300">'buy'</span>,<br />
                  &nbsp;&nbsp;<span className="text-emerald-300">'product_id'</span> =&gt; <span className="text-amber-300">'{testProdPid}'</span>,&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500">// Exact Product PID</span><br />
                  &nbsp;&nbsp;<span className="text-emerald-300">'duration'</span>&nbsp;&nbsp;&nbsp;=&gt; <span className="text-amber-300">'{testDuration}'</span>,&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500">// Duration Name</span><br />
                  &nbsp;&nbsp;<span className="text-emerald-300">'android_id'</span> =&gt; <span className="text-amber-300">'{testAndroidId}'</span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;<span className="text-slate-500">// Required ONLY for Device-Bound / V1</span><br />
                  ];<br />
                  <span className="text-purple-400">$headers</span> = [<br />
                  &nbsp;&nbsp;<span className="text-emerald-300">'Content-Type: application/x-www-form-urlencoded'</span>,<br />
                  &nbsp;&nbsp;<span className="text-emerald-300">'x-master-key: {resellerConfig.masterKey ? `${resellerConfig.masterKey.slice(0, 6)}...` : 'a7f3e8b2c9d1f4a6b8c2d5e9f1a3b6c8'}'</span><br />
                  ];
                </div>
              </div>

              <div className="flex items-center gap-3">
                <button
                  type="submit"
                  disabled={isTestingKeyGen}
                  className="px-6 py-3 rounded-xl bg-gradient-to-r from-rose-600 via-crimson-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-bold text-xs uppercase tracking-wider transition-all flex items-center justify-center gap-2 shadow-lg shadow-rose-950/60 active:scale-[0.99] disabled:opacity-50"
                >
                  {isTestingKeyGen ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>DISPATCHING LIVE CURL POST...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>EXECUTE TEST BUY KEY GENERATOR</span>
                    </>
                  )}
                </button>
              </div>
            </form>

            {/* Test Results Display */}
            {keyGenTestResult && (
              <div className="p-4 rounded-2xl bg-[#09090f] border border-white/10 space-y-3 animate-in fade-in">
                <div className="flex items-center justify-between pb-2 border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                        keyGenTestResult.success
                          ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {keyGenTestResult.success ? 'HTTP SUCCESS' : 'UPSTREAM NOTICE / FALLBACK'}
                    </span>
                    <span className="text-xs font-mono text-slate-300">
                      HTTP Status: <strong className="text-white">{keyGenTestResult.status}</strong>
                    </span>
                  </div>
                  <span className="text-xs font-mono text-slate-400">
                    Latency: <strong className="text-rose-400">{keyGenTestResult.latencyMs}ms</strong>
                  </span>
                </div>

                {/* Key Extraction Preview */}
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                    GENERATED KEY / RAW PROVIDER RESPONSE
                  </label>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 p-2.5 rounded-xl bg-black/60 border border-white/10 font-mono text-xs text-rose-300 break-all select-all">
                      {keyGenTestResult.rawResponse || 'No response data returned'}
                    </div>
                    {keyGenTestResult.rawResponse && (
                      <button
                        type="button"
                        onClick={() => {
                          navigator.clipboard.writeText(keyGenTestResult.rawResponse);
                          showToastSuccess('Copied to Clipboard');
                        }}
                        className="p-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.1] text-slate-300 hover:text-white transition-colors"
                        title="Copy Key/Response"
                      >
                        <Copy className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Sent Payload Summary */}
                {keyGenTestResult.payloadSent && (
                  <div className="text-[10px] font-mono text-slate-400 flex flex-wrap gap-x-4 gap-y-1 pt-1">
                    <span>PID: <strong className="text-slate-200">{keyGenTestResult.payloadSent.product_id}</strong></span>
                    <span>Duration: <strong className="text-slate-200">{keyGenTestResult.payloadSent.duration}</strong></span>
                    <span>Android ID: <strong className="text-slate-200">{keyGenTestResult.payloadSent.android_id}</strong></span>
                  </div>
                )}
              </div>
            )}

          {/* RESELLER API PRODUCT PID & DURATION MAPPING OVERVIEW TABLE */}
          <div className="p-6 rounded-3xl bg-[#0d0d14] border border-amber-500/20 shadow-xl space-y-4 mt-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-white/5 gap-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-amber-500/20 to-orange-600/30 border border-amber-500/30 text-amber-400 flex items-center justify-center">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                    RESELLER API PRODUCT PID &amp; DURATION MAPPING OVERVIEW
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Live mapping overview of external website product PIDs and durations for automated key dispatch
                  </p>
                </div>
              </div>
              <span className="text-xs font-mono text-amber-400 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20 self-start sm:self-auto">
                {products.reduce((acc, p) => acc + (p.variants?.length || 0), 0)} Total Mapped Durations
              </span>
            </div>

            <div className="overflow-x-auto no-scrollbar">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="border-b border-white/10 text-[10px] font-mono font-bold uppercase text-slate-400 tracking-wider">
                    <th className="py-2.5 px-3">PRODUCT / GAME</th>
                    <th className="py-2.5 px-3">DURATION LABEL</th>
                    <th className="py-2.5 px-3">EXTERNAL PRODUCT PID</th>
                    <th className="py-2.5 px-3">EXTERNAL DURATION</th>
                    <th className="py-2.5 px-3">PRICING (USER / RESELLER)</th>
                    <th className="py-2.5 px-3">DISPATCH MODE</th>
                    <th className="py-2.5 px-3 text-right">TEST / ACTIONS</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-mono text-xs">
                  {products.flatMap(p =>
                    (p.variants || []).map(v => {
                      const effectivePid = v.externalPid?.trim() || p.externalPid?.trim();
                      const effectiveDur = v.externalDuration?.trim() || v.durationLabel.trim();
                      const isAutomated = Boolean(effectivePid);

                      return (
                        <tr key={`map-${p.id}-${v.id}`} className="hover:bg-white/[0.02] transition-colors">
                          <td className="py-3 px-3">
                            <div className="font-bold text-white text-xs">{p.name}</div>
                            <div className="text-[10px] text-slate-400">{p.game || p.category || 'FREEFIRE'}</div>
                          </td>
                          <td className="py-3 px-3 font-semibold text-rose-300">
                            {v.durationLabel}
                          </td>
                          <td className="py-3 px-3">
                            {effectivePid ? (
                              <span className="bg-white/10 text-white font-bold px-2 py-1 rounded-md text-[11px] border border-white/10">
                                {effectivePid}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px] italic">Not Set (Local Only)</span>
                            )}
                          </td>
                          <td className="py-3 px-3">
                            {effectiveDur ? (
                              <span className="bg-emerald-500/20 text-emerald-300 font-bold px-2 py-1 rounded-md text-[11px] border border-emerald-500/30">
                                {effectiveDur}
                              </span>
                            ) : (
                              <span className="text-slate-500 text-[10px] italic">{v.durationLabel}</span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-[11px]">
                            <span className="text-white font-bold">₹{v.price}</span> /{' '}
                            <span className="text-emerald-400 font-bold">₹{v.resellerPrice}</span>
                          </td>
                          <td className="py-3 px-3">
                            {isAutomated ? (
                              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 text-[10px] font-bold flex items-center gap-1 w-fit">
                                <Zap className="w-3 h-3 text-emerald-400 fill-emerald-400" />
                                <span>AUTOMATED API</span>
                              </span>
                            ) : (
                              <span className="px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-bold flex items-center gap-1 w-fit">
                                <Package className="w-3 h-3 text-slate-400" />
                                <span>LOCAL POOL</span>
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <div className="flex items-center justify-end gap-1.5">
                              {isAutomated && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    setTestProdPid(effectivePid || '');
                                    setTestDuration(effectiveDur || '');
                                    showToastSuccess('Loaded into API Tester', `PID: ${effectivePid} | Duration: ${effectiveDur}`);
                                  }}
                                  className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[10px] font-extrabold uppercase tracking-wider transition-colors flex items-center gap-1"
                                >
                                  <Terminal className="w-3 h-3" />
                                  <span>Test API</span>
                                </button>
                              )}
                              <button
                                type="button"
                                onClick={() => handleOpenEditVariant(v)}
                                className="px-2.5 py-1 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-[10px] font-extrabold uppercase tracking-wider transition-colors flex items-center gap-1"
                              >
                                <Edit2 className="w-3 h-3" />
                                <span>Edit PID</span>
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>
        </div>
      )}

      {/* TAB CONTENT: 10. SYSTEM ACTIVITY LOGS */}
      {activeTab === 'logs' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
              REAL-TIME AUDIT LOGS
            </h3>
            <span className="text-xs font-mono text-slate-400">{logs.length} events logged</span>
          </div>

          {logs.length === 0 ? (
            <div className="p-8 rounded-2xl bg-[#0d0d14] border border-white/5 text-center text-xs text-slate-500 font-mono">
              No audit logs recorded yet.
            </div>
          ) : (
            <div className="space-y-2">
              {logs.map(log => (
                <div
                  key={log.id}
                  className="p-3 rounded-xl bg-[#0d0d14] border border-white/5 flex items-start justify-between gap-3 text-xs"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-rose-500/20 text-rose-400 uppercase">
                        {log.action}
                      </span>
                      <span className="font-bold text-white">@{log.username || 'SYSTEM'}</span>
                    </div>
                    <p className="text-slate-300 font-mono text-[11px] leading-relaxed">{log.details}</p>
                  </div>
                  <span className="text-[10px] text-slate-500 font-mono shrink-0">
                    {new Date(log.createdAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* MODAL: CREATE PRODUCT WITH ALBUM PHOTO PICKER */}
      {isCreatingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsCreatingProduct(false)} className="fixed inset-0 bg-black/85 backdrop-blur-md" />
          <div className="relative w-full max-w-2xl bg-[#0d0d14] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 space-y-4 text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                  ADD NEW GAMING PRODUCT + ALBUM PHOTO
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingProduct(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateProduct} className="space-y-4">
              {/* Product Photo Selection / Album Upload Section */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-rose-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>PRODUCT PHOTO / BANNER (MANUAL ALBUM UPLOAD)</span>
                  </label>

                  {/* Album Mode Switcher */}
                  <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
                    <button
                      type="button"
                      onClick={() => setNewProdAlbumTab('upload')}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                        newProdAlbumTab === 'upload'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Upload className="w-2.5 h-2.5" />
                      <span>Upload from Device</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewProdAlbumTab('preset')}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                        newProdAlbumTab === 'preset'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FolderPlus className="w-2.5 h-2.5" />
                      <span>Gaming Presets</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setNewProdAlbumTab('url')}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                        newProdAlbumTab === 'url'
                          ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>Direct URL</span>
                    </button>
                  </div>
                </div>

                {/* 1. Device / Album File Upload Input */}
                {newProdAlbumTab === 'upload' && (
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={newFileInputRef}
                      accept="image/*"
                      onChange={e => handleImageFileUpload(e, false)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => newFileInputRef.current?.click()}
                      className="w-full py-4 border-2 border-dashed border-rose-500/30 hover:border-rose-500/60 rounded-xl bg-rose-500/5 hover:bg-rose-500/10 text-rose-300 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all"
                    >
                      <Camera className="w-6 h-6 text-rose-400" />
                      <span>Click to Select Photo from Phone Gallery / Album</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Supports PNG, JPG, WEBP, GIF (Max 5MB)
                      </span>
                    </button>
                  </div>
                )}

                {/* 2. Preset Gaming Album Grid */}
                {newProdAlbumTab === 'preset' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                    {ALBUM_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => {
                          setNewProdImageUrl(preset.url);
                          if (!newProdGame) setNewProdGame(preset.game);
                        }}
                        className={`relative rounded-xl overflow-hidden aspect-[16/9] border transition-all text-left group ${
                          newProdImageUrl === preset.url
                            ? 'border-rose-500 ring-2 ring-rose-500/30 shadow-lg'
                            : 'border-white/10 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                          <span className="text-[9px] font-bold text-white line-clamp-1">{preset.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* 3. Direct URL Input */}
                {newProdAlbumTab === 'url' && (
                  <input
                    type="url"
                    value={newProdImageUrl}
                    onChange={e => setNewProdImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or hosted image URL"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white font-mono text-xs"
                  />
                )}

                {/* Live Photo Preview */}
                {newProdImageUrl && (
                  <div className="relative aspect-[16/6] w-full rounded-xl overflow-hidden bg-black/60 border border-white/10">
                    <img
                      src={newProdImageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover object-center"
                    />
                    <div className="absolute bottom-2 left-2 bg-black/70 backdrop-blur-md px-2 py-0.5 rounded text-[9px] font-mono text-emerald-400 border border-emerald-500/30">
                      ✓ Active Banner Photo Selected
                    </div>
                  </div>
                )}
              </div>

              {/* Title & Game */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    PRODUCT TITLE
                  </label>
                  <input
                    type="text"
                    value={newProdName}
                    onChange={e => setNewProdName(e.target.value)}
                    placeholder="e.g. BALA MOD XYZ ~ V5 FF NONROOT"
                    required
                    className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    GAME TITLE
                  </label>
                  <input
                    type="text"
                    value={newProdGame}
                    onChange={e => setNewProdGame(e.target.value)}
                    placeholder="e.g. FREEFIRE, CARROM POOL, BGMI (Defaults to Category)"
                    className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white"
                  />
                </div>
              </div>

              {/* Category, Device Type & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    GAME CATEGORY
                  </label>
                  <select
                    value={newProdCategory}
                    onChange={e => {
                      setNewProdCategory(e.target.value);
                      if (!newProdGame) setNewProdGame(e.target.value);
                    }}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                  >
                    <option value="FREEFIRE" className="bg-[#0d0d14]">FREEFIRE</option>
                    <option value="CARROM POOL" className="bg-[#0d0d14]">CARROM POOL</option>
                    <option value="BGMI" className="bg-[#0d0d14]">BGMI / PUBG</option>
                    <option value="CALL OF DUTY" className="bg-[#0d0d14]">CALL OF DUTY</option>
                    <option value="VALORANT" className="bg-[#0d0d14]">VALORANT</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    DEVICE TYPE
                  </label>
                  <select
                    value={newProdDeviceType}
                    onChange={e => setNewProdDeviceType(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                  >
                    <option value="NONROOT" className="bg-[#0d0d14]">NONROOT</option>
                    <option value="ALL SYSTEMS" className="bg-[#0d0d14]">ALL SYSTEMS</option>
                    <option value="iOS IPHONE" className="bg-[#0d0d14]">iOS IPHONE</option>
                    <option value="ONLY PC" className="bg-[#0d0d14]">ONLY PC</option>
                    <option value="ROOT+SAFE" className="bg-[#0d0d14]">ROOT+SAFE</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    PROMO BADGE
                  </label>
                  <input
                    type="text"
                    value={newProdBadge}
                    onChange={e => setNewProdBadge(e.target.value)}
                    placeholder="e.g. STAR, OB55, VIP"
                    className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              {/* Description & Features */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  DESCRIPTION
                </label>
                <textarea
                  rows={2}
                  value={newProdDesc}
                  onChange={e => setNewProdDesc(e.target.value)}
                  placeholder="Mod menu features overview, server compatibility, and anti-ban info..."
                  className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  FEATURES (COMMA SEPARATED)
                </label>
                <input
                  type="text"
                  value={newProdFeatures}
                  onChange={e => setNewProdFeatures(e.target.value)}
                  placeholder="Headshot, Location radar, Fast Revive, Freeze fake lag"
                  className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white"
                />
              </div>

              {/* Reseller Upstream Product ID (PID) */}
              <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>DEFAULT RESELLER PRODUCT ID (PID)</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">All Durations Base PID</span>
                </div>
                <input
                  type="text"
                  value={newProdExternalPid}
                  onChange={e => setNewProdExternalPid(e.target.value)}
                  placeholder="e.g. 32, FF_AUTO, BGMI_ESP, BALA_V5"
                  className="w-full px-3.5 py-2 bg-black/40 border border-amber-500/30 rounded-xl text-amber-300 font-mono font-bold text-xs focus:border-amber-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  💡 இந்த தயாரிப்பின் அனைத்து கால அளவுகளுக்கும் இது பொதுவான Upstream PID ஆகும்.
                </p>
              </div>

              {/* Update File & Video Feedback URLs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    [📥 UPDATE FILE URL]
                  </label>
                  <input
                    type="url"
                    value={newProdUpdateFileUrl}
                    onChange={e => setNewProdUpdateFileUrl(e.target.value)}
                    placeholder="https://t.me/c/mod/update.apk"
                    className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    [🎬 VIDEO / FEEDBACK URL]
                  </label>
                  <input
                    type="url"
                    value={newProdVideoUrl}
                    onChange={e => setNewProdVideoUrl(e.target.value)}
                    placeholder="https://t.me/c/mod/video_gameplay"
                    className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Under Maintenance Mode Controls */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold text-amber-300 text-xs uppercase tracking-wider block">
                        UNDER MAINTENANCE MODE
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Shows maintenance badge on photo &amp; pauses key purchases
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newProdIsUnderMaintenance}
                      onChange={e => setNewProdIsUnderMaintenance(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                  </label>
                </div>

                {newProdIsUnderMaintenance && (
                  <div>
                    <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                      CUSTOM MAINTENANCE NOTICE
                    </label>
                    <input
                      type="text"
                      value={newProdMaintenanceNotice}
                      onChange={e => setNewProdMaintenanceNotice(e.target.value)}
                      placeholder="⚠️ This product is temporarily under maintenance for server updates."
                      className="w-full px-3.5 py-2 bg-black/50 border border-amber-500/40 rounded-xl text-amber-200 text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsCreatingProduct(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-bold uppercase tracking-wider shadow-lg shadow-rose-950/50"
                >
                  Save Product & Banner
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT PRODUCT WITH ALBUM PHOTO PICKER */}
      {isEditingProduct && editingProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsEditingProduct(false)} className="fixed inset-0 bg-black/85 backdrop-blur-md" />
          <div className="relative w-full max-w-2xl bg-[#0d0d14] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 space-y-4 text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                  EDIT PRODUCT & ALBUM PHOTO
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsEditingProduct(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateProduct} className="space-y-4">
              {/* Product Photo Selection / Album Upload Section */}
              <div className="p-4 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>CHANGE PRODUCT PHOTO / ALBUM</span>
                  </label>

                  {/* Album Mode Switcher */}
                  <div className="flex items-center gap-1 bg-black/40 p-0.5 rounded-lg border border-white/5">
                    <button
                      type="button"
                      onClick={() => setEditProdAlbumTab('upload')}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                        editProdAlbumTab === 'upload'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Upload className="w-2.5 h-2.5" />
                      <span>Upload from Device</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditProdAlbumTab('preset')}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                        editProdAlbumTab === 'preset'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <FolderPlus className="w-2.5 h-2.5" />
                      <span>Presets</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setEditProdAlbumTab('url')}
                      className={`px-2 py-1 rounded text-[10px] font-bold transition-all flex items-center gap-1 ${
                        editProdAlbumTab === 'url'
                          ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <span>URL</span>
                    </button>
                  </div>
                </div>

                {/* 1. Device / Album File Upload Input */}
                {editProdAlbumTab === 'upload' && (
                  <div className="space-y-2">
                    <input
                      type="file"
                      ref={editFileInputRef}
                      accept="image/*"
                      onChange={e => handleImageFileUpload(e, true)}
                      className="hidden"
                    />
                    <button
                      type="button"
                      onClick={() => editFileInputRef.current?.click()}
                      className="w-full py-4 border-2 border-dashed border-amber-500/30 hover:border-amber-500/60 rounded-xl bg-amber-500/5 hover:bg-amber-500/10 text-amber-300 text-xs font-bold flex flex-col items-center justify-center gap-1.5 transition-all"
                    >
                      <Camera className="w-6 h-6 text-amber-400" />
                      <span>Choose New Image from Phone Album / Gallery</span>
                      <span className="text-[10px] text-slate-400 font-normal">
                        Supports PNG, JPG, WEBP, GIF (Max 5MB)
                      </span>
                    </button>
                  </div>
                )}

                {/* 2. Preset Gaming Album Grid */}
                {editProdAlbumTab === 'preset' && (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 max-h-48 overflow-y-auto p-1">
                    {ALBUM_PRESETS.map(preset => (
                      <button
                        key={preset.name}
                        type="button"
                        onClick={() => setEditProdImageUrl(preset.url)}
                        className={`relative rounded-xl overflow-hidden aspect-[16/9] border transition-all text-left group ${
                          editProdImageUrl === preset.url
                            ? 'border-amber-500 ring-2 ring-amber-500/30 shadow-lg'
                            : 'border-white/10 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={preset.url} alt={preset.name} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-1.5">
                          <span className="text-[9px] font-bold text-white line-clamp-1">{preset.name}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {/* 3. Direct URL Input */}
                {editProdAlbumTab === 'url' && (
                  <input
                    type="url"
                    value={editProdImageUrl}
                    onChange={e => setEditProdImageUrl(e.target.value)}
                    placeholder="https://images.unsplash.com/... or hosted image URL"
                    className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white font-mono text-xs"
                  />
                )}

                {/* Live Photo Preview */}
                {editProdImageUrl && (
                  <div className="relative aspect-[16/6] w-full rounded-xl overflow-hidden bg-black/60 border border-white/10">
                    <img
                      src={editProdImageUrl}
                      alt="Preview"
                      className="w-full h-full object-cover object-center"
                    />
                  </div>
                )}
              </div>

              {/* Title & Game */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    PRODUCT TITLE
                  </label>
                  <input
                    type="text"
                    value={editProdName}
                    onChange={e => setEditProdName(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    GAME TITLE
                  </label>
                  <input
                    type="text"
                    value={editProdGame}
                    onChange={e => setEditProdGame(e.target.value)}
                    required
                    className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white"
                  />
                </div>
              </div>

              {/* Category, Device Type & Badge */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    GAME CATEGORY
                  </label>
                  <select
                    value={editProdCategory}
                    onChange={e => setEditProdCategory(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                  >
                    <option value="FREEFIRE" className="bg-[#0d0d14]">FREEFIRE</option>
                    <option value="CARROM POOL" className="bg-[#0d0d14]">CARROM POOL</option>
                    <option value="BGMI" className="bg-[#0d0d14]">BGMI / PUBG</option>
                    <option value="CALL OF DUTY" className="bg-[#0d0d14]">CALL OF DUTY</option>
                    <option value="VALORANT" className="bg-[#0d0d14]">VALORANT</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    DEVICE TYPE
                  </label>
                  <select
                    value={editProdDeviceType}
                    onChange={e => setEditProdDeviceType(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                  >
                    <option value="NONROOT" className="bg-[#0d0d14]">NONROOT</option>
                    <option value="ALL SYSTEMS" className="bg-[#0d0d14]">ALL SYSTEMS</option>
                    <option value="iOS IPHONE" className="bg-[#0d0d14]">iOS IPHONE</option>
                    <option value="ONLY PC" className="bg-[#0d0d14]">ONLY PC</option>
                    <option value="ROOT+SAFE" className="bg-[#0d0d14]">ROOT+SAFE</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    PROMO BADGE
                  </label>
                  <input
                    type="text"
                    value={editProdBadge}
                    onChange={e => setEditProdBadge(e.target.value)}
                    placeholder="e.g. STAR, OB55, VIP"
                    className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                  />
                </div>
              </div>

              {/* Description & Features */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  DESCRIPTION
                </label>
                <textarea
                  rows={2}
                  value={editProdDesc}
                  onChange={e => setEditProdDesc(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white resize-none"
                />
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  FEATURES (COMMA SEPARATED)
                </label>
                <input
                  type="text"
                  value={editProdFeatures}
                  onChange={e => setEditProdFeatures(e.target.value)}
                  className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white"
                />
              </div>

              {/* Reseller Upstream Product ID (PID) */}
              <div className="p-3.5 rounded-xl bg-amber-500/5 border border-amber-500/20 space-y-1.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <Zap className="w-3.5 h-3.5" />
                    <span>DEFAULT RESELLER PRODUCT ID (PID)</span>
                  </label>
                  <span className="text-[10px] font-mono text-slate-400">All Durations Base PID</span>
                </div>
                <input
                  type="text"
                  value={editProdExternalPid}
                  onChange={e => setEditProdExternalPid(e.target.value)}
                  placeholder="e.g. 32, FF_AUTO, BGMI_ESP, BALA_V5"
                  className="w-full px-3.5 py-2 bg-black/40 border border-amber-500/30 rounded-xl text-amber-300 font-mono font-bold text-xs focus:border-amber-500 focus:outline-none"
                />
                <p className="text-[10px] text-slate-400 leading-relaxed">
                  💡 இந்த தயாரிப்பின் அனைத்து கால அளவுகளுக்கும் இது பொதுவான Upstream PID ஆகும்.
                </p>
              </div>

              {/* Update File & Video Feedback URLs */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    [📥 UPDATE FILE URL]
                  </label>
                  <input
                    type="url"
                    value={editProdUpdateFileUrl}
                    onChange={e => setEditProdUpdateFileUrl(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-[11px]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    [🎬 VIDEO / FEEDBACK URL]
                  </label>
                  <input
                    type="url"
                    value={editProdVideoUrl}
                    onChange={e => setEditProdVideoUrl(e.target.value)}
                    className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-[11px]"
                  />
                </div>
              </div>

              {/* Under Maintenance Mode Controls */}
              <div className="p-3.5 rounded-2xl bg-amber-500/10 border border-amber-500/30 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400" />
                    <div>
                      <span className="font-bold text-amber-300 text-xs uppercase tracking-wider block">
                        UNDER MAINTENANCE MODE
                      </span>
                      <span className="text-[10px] text-slate-400">
                        Shows maintenance badge on photo &amp; pauses key purchases
                      </span>
                    </div>
                  </div>
                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editProdIsUnderMaintenance}
                      onChange={e => setEditProdIsUnderMaintenance(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500" />
                  </label>
                </div>

                {editProdIsUnderMaintenance && (
                  <div>
                    <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                      CUSTOM MAINTENANCE NOTICE
                    </label>
                    <input
                      type="text"
                      value={editProdMaintenanceNotice}
                      onChange={e => setEditProdMaintenanceNotice(e.target.value)}
                      placeholder="⚠️ This product is temporarily under maintenance for server updates."
                      className="w-full px-3.5 py-2 bg-black/50 border border-amber-500/40 rounded-xl text-amber-200 text-xs"
                    />
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsEditingProduct(false)}
                  className="w-1/3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black uppercase tracking-wider shadow-lg shadow-amber-950/50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: CREATE DURATION VARIANT (MANUAL SINGLE & BATCH MODES) */}
      {isCreatingVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsCreatingVariant(false)} className="fixed inset-0 bg-black/85 backdrop-blur-md" />
          <div className="relative w-full max-w-xl bg-[#0d0d14] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 space-y-4 text-xs max-h-[92vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                  {varEntryMode === 'single' ? 'MANUAL DURATION ENTRY & RESELLER PID' : '⚡ 1-CLICK BATCH DURATION BUILDER'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setIsCreatingVariant(false)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Entry Mode Switcher Tabs */}
            <div className="flex items-center gap-1.5 p-1 bg-black/40 border border-white/10 rounded-xl">
              <button
                type="button"
                onClick={() => setVarEntryMode('single')}
                className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  varEntryMode === 'single'
                    ? 'bg-rose-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>1. Single Manual Entry</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  setVarEntryMode('batch');
                  const prod = products.find(p => p.id === selectedProdForVar);
                  if (prod && !batchPidPrefix) {
                    const cleanName = prod.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 10).toUpperCase();
                    setBatchPidPrefix(cleanName);
                  }
                }}
                className={`flex-1 py-1.5 rounded-lg font-bold text-xs transition-all flex items-center justify-center gap-1.5 ${
                  varEntryMode === 'batch'
                    ? 'bg-amber-500 text-slate-950 font-black shadow-md'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Zap className="w-3.5 h-3.5" />
                <span>2. ⚡ Batch Multi-Duration Builder</span>
              </button>
            </div>

            {/* MODE 1: SINGLE MANUAL DURATION ENTRY */}
            {varEntryMode === 'single' && (
              <form onSubmit={handleCreateVariant} className="space-y-4">
                {/* Target Product */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    TARGET PRODUCT
                  </label>
                  <select
                    value={selectedProdForVar}
                    onChange={e => {
                      setSelectedProdForVar(e.target.value);
                      const prod = products.find(p => p.id === e.target.value);
                      if (prod) {
                        const cleanCode = prod.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 8).toUpperCase();
                        setVarExternalPid(`${cleanCode}_1D`);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-medium focus:border-rose-500 focus:outline-none"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#0d0d14]">
                        {p.name} ({p.game})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Duration Label & Quick Presets */}
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                      DURATION PRESET CHIPS (1-CLICK FILL)
                    </label>
                    <span className="text-[10px] text-slate-500 font-mono">Click to autofill</span>
                  </div>

                  {/* Hourly & Daily Quick Chips */}
                  <div className="flex flex-wrap gap-1.5">
                    {[
                      { label: '1 Hours', hours: 1, price: 20 },
                      { label: '2 Hours', hours: 2, price: 40 },
                      { label: '3 Hours', hours: 3, price: 70 },
                      { label: '6 Hours', hours: 6, price: 120 },
                      { label: '12 Hours', hours: 12, price: 180 },
                      { label: '1 DAYS', hours: 24, price: 300 },
                      { label: '2 DAYS', hours: 48, price: 500 },
                      { label: '3 DAYS', hours: 72, price: 700 },
                      { label: '7 DAYS', hours: 168, price: 1100 },
                      { label: '15 DAYS', hours: 360, price: 1800 },
                      { label: '30 DAYS', hours: 720, price: 2500 },
                      { label: 'Lifetime', hours: 87600, price: 5000 },
                    ].map(preset => (
                      <button
                        key={preset.label}
                        type="button"
                        onClick={() => {
                          setVarDurationLabel(preset.label);
                          setVarDurationHours(preset.hours);
                          setVarPrice(preset.price);
                          setVarResellerPrice(Math.round(preset.price * 0.75));
                          const prod = products.find(p => p.id === selectedProdForVar);
                          if (prod) {
                            const cleanCode = prod.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 8).toUpperCase();
                            const suffix = preset.label.replace(/\s+/g, '_').toUpperCase();
                            setVarExternalPid(`${cleanCode}_${suffix}`);
                          }
                        }}
                        className={`px-2 py-1 rounded-lg border text-[10px] font-mono font-bold transition-all ${
                          varDurationLabel.toLowerCase() === preset.label.toLowerCase()
                            ? 'bg-rose-500/20 border-rose-500 text-rose-300 shadow-sm'
                            : 'bg-white/[0.02] border-white/5 text-slate-400 hover:text-white hover:bg-white/[0.05]'
                        }`}
                      >
                        {preset.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Duration Label & Expiry Hours Inputs */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      DURATION LABEL (MANUAL TEXT)
                    </label>
                    <input
                      type="text"
                      value={varDurationLabel}
                      onChange={e => {
                        const val = e.target.value;
                        setVarDurationLabel(val);
                        const autoH = calculateHoursFromLabel(val);
                        if (autoH) setVarDurationHours(autoH);
                      }}
                      placeholder="e.g. 1 Hours, 3 Hours, 1 DAYS, 7 DAYS"
                      required
                      className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-medium focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      EXPIRY HOURS (NUMERIC)
                    </label>
                    <input
                      type="number"
                      value={varDurationHours}
                      onChange={e => setVarDurationHours(Number(e.target.value))}
                      required
                      min={1}
                      className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono font-medium focus:border-rose-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Standard Price, Reseller Price & Margin Calculator */}
                <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                      PRICING & RESELLER DISCOUNT MARGIN
                    </label>
                    {varPrice > 0 && (
                      <div className="text-[11px] font-mono">
                        <span className="text-slate-400">Profit Margin: </span>
                        <strong className="text-emerald-400">₹{Math.max(0, varPrice - varResellerPrice)}</strong>
                        <span className="text-slate-500 ml-1">
                          ({varPrice > 0 ? Math.round(((varPrice - varResellerPrice) / varPrice) * 100) : 0}%)
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        STANDARD END-USER PRICE (₹)
                      </label>
                      <input
                        type="number"
                        value={varPrice}
                        onChange={e => {
                          const p = Number(e.target.value);
                          setVarPrice(p);
                          setVarResellerPrice(Math.round(p * 0.75));
                        }}
                        required
                        min={0}
                        className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white font-mono font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                        VIP RESELLER PRICE (₹)
                      </label>
                      <input
                        type="number"
                        value={varResellerPrice}
                        onChange={e => setVarResellerPrice(Number(e.target.value))}
                        required
                        min={0}
                        className="w-full px-3.5 py-2.5 bg-black/40 border border-amber-500/30 rounded-xl text-amber-400 font-mono font-bold focus:border-amber-500 focus:outline-none"
                      />
                    </div>
                  </div>

                  {/* Margin Discount Quick Chips */}
                  <div className="flex items-center gap-1.5 flex-wrap pt-1">
                    <span className="text-[10px] text-slate-500 font-mono">Reseller Discount:</span>
                    {[15, 20, 25, 30, 40, 50].map(pct => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => {
                          const disc = Math.round(varPrice * (1 - pct / 100));
                          setVarResellerPrice(Math.max(1, disc));
                        }}
                        className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold transition-all"
                      >
                        -{pct}% (₹{Math.round(varPrice * (1 - pct / 100))})
                      </button>
                    ))}
                  </div>
                </div>

                {/* Reseller Upstream API Configuration (Manual Duration Symbol & PID) */}
                <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                      <Zap className="w-3.5 h-3.5" />
                      <span>RESELLER API INTEGRATION (CUSTOM DURATION CODE & PID)</span>
                    </div>
                    <span className="text-[10px] font-mono text-emerald-400">
                      {varExternalPid.trim() || products.find(p => p.id === selectedProdForVar)?.externalPid ? '⚡ AUTOMATED API' : '📦 LOCAL STOCK POOL'}
                    </span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                        RESELLER DURATION SYMBOL / CODE
                      </label>
                      <input
                        type="text"
                        value={varExternalDuration}
                        onChange={e => setVarExternalDuration(e.target.value)}
                        placeholder={varDurationLabel || 'e.g. 1D, 1_DAY, 24h, d1, 7D, 30D'}
                        className="w-full px-3.5 py-2.5 bg-black/50 border border-amber-500/30 rounded-xl text-amber-300 font-mono font-bold placeholder-amber-500/30 focus:border-amber-500 focus:outline-none"
                      />
                      <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                        ஒவ்வொரு ரீசெல்லருக்கும் இந்த குறியீடு மாறும் (எ.கா: <span className="text-amber-300 font-mono">1D, 24h, 1_DAY, d1</span>).
                      </p>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                        RESELLER PID (OVERRIDE)
                      </label>
                      <input
                        type="text"
                        value={varExternalPid}
                        onChange={e => setVarExternalPid(e.target.value)}
                        placeholder={products.find(p => p.id === selectedProdForVar)?.externalPid || 'Product Default PID'}
                        className="w-full px-3.5 py-2.5 bg-black/50 border border-white/10 rounded-xl text-white font-mono font-bold focus:border-rose-500 focus:outline-none"
                      />
                      <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                        Product PID தானாகப் பொருந்தும். தனி PID தேவைப்பட்டால் மட்டும் மாற்றவும்.
                      </p>
                    </div>
                  </div>

                  {/* Live Upstream Key Generation Dispatch Preview */}
                  {(varExternalPid.trim() || products.find(p => p.id === selectedProdForVar)?.externalPid) && (
                    <div className="p-2.5 rounded-xl bg-black/70 border border-amber-500/30 font-mono text-[10px] text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                      <span className="text-slate-400">⚡ Live Upstream Key Request:</span>
                      <span className="text-amber-300">
                        product_id: <strong className="text-white bg-white/10 px-1.5 py-0.5 rounded">{varExternalPid.trim() || products.find(p => p.id === selectedProdForVar)?.externalPid}</strong> | duration: <strong className="text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">{varExternalDuration.trim() || varDurationLabel}</strong>
                      </span>
                    </div>
                  )}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingVariant(false)}
                    className="w-1/3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black uppercase tracking-wider shadow-lg shadow-rose-950/50"
                  >
                    Save Duration &amp; PID
                  </button>
                </div>
              </form>
            )}

            {/* MODE 2: BATCH 1-CLICK MULTI-DURATION BUILDER */}
            {varEntryMode === 'batch' && (
              <div className="space-y-4">
                <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  ⚡ <strong>Batch Mode:</strong> Automatically creates all 6 standard duration options (1H, 3H, 6H, 1D, 7D, 30D) with custom reseller pricing and upstream API PIDs in a single click!
                </div>

                {/* Target Product */}
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    TARGET PRODUCT
                  </label>
                  <select
                    value={selectedProdForVar}
                    onChange={e => {
                      setSelectedProdForVar(e.target.value);
                      const prod = products.find(p => p.id === e.target.value);
                      if (prod) {
                        const cleanCode = prod.name.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 8).toUpperCase();
                        setBatchPidPrefix(cleanCode);
                      }
                    }}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-medium focus:border-rose-500 focus:outline-none"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#0d0d14]">
                        {p.name} ({p.game})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Batch Settings: PID Prefix & Reseller Discount */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                      RESELLER PID PREFIX (UPSTREAM)
                    </label>
                    <input
                      type="text"
                      value={batchPidPrefix}
                      onChange={e => setBatchPidPrefix(e.target.value)}
                      placeholder="e.g. BALA_V5, IMMO_V4"
                      className="w-full px-3.5 py-2 bg-black/40 border border-amber-500/30 rounded-xl text-amber-300 font-mono font-bold text-xs"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      VIP RESELLER DISCOUNT %
                    </label>
                    <select
                      value={batchDiscountPct}
                      onChange={e => setBatchDiscountPct(Number(e.target.value))}
                      className="w-full px-3.5 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono text-xs font-bold"
                    >
                      <option value={15} className="bg-[#0d0d14]">15% Off End-User Price</option>
                      <option value={20} className="bg-[#0d0d14]">20% Off End-User Price</option>
                      <option value={25} className="bg-[#0d0d14]">25% Off End-User Price</option>
                      <option value={30} className="bg-[#0d0d14]">30% Off End-User Price</option>
                      <option value={40} className="bg-[#0d0d14]">40% Off End-User Price</option>
                    </select>
                  </div>
                </div>

                {/* Batch Items List */}
                <div className="space-y-2 border border-white/5 rounded-xl p-3 bg-white/[0.01]">
                  <div className="text-[10px] font-mono text-slate-400 uppercase font-bold grid grid-cols-12 gap-2 pb-1 border-b border-white/5">
                    <span className="col-span-1">Add</span>
                    <span className="col-span-4">Duration</span>
                    <span className="col-span-3">Retail Price (₹)</span>
                    <span className="col-span-2">Reseller</span>
                    <span className="col-span-2 text-right">PID</span>
                  </div>

                  {batchDurations.map((item, idx) => {
                    const resellerPrice = Math.max(1, Math.round(item.price * (1 - batchDiscountPct / 100)));
                    const pidPreview = batchPidPrefix.trim() ? `${batchPidPrefix.trim()}_${item.pidSuffix}` : 'Local';
                    return (
                      <div key={item.label} className="grid grid-cols-12 gap-2 items-center text-xs py-1 border-b border-white/5 last:border-0">
                        <div className="col-span-1">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={e => {
                              const updated = [...batchDurations];
                              updated[idx].selected = e.target.checked;
                              setBatchDurations(updated);
                            }}
                            className="rounded accent-rose-500 w-4 h-4 cursor-pointer"
                          />
                        </div>
                        <div className="col-span-4 font-mono font-bold text-white">
                          {item.label} <span className="text-[10px] text-slate-500">({item.hours}h)</span>
                        </div>
                        <div className="col-span-3">
                          <input
                            type="number"
                            value={item.price}
                            onChange={e => {
                              const updated = [...batchDurations];
                              updated[idx].price = Number(e.target.value);
                              setBatchDurations(updated);
                            }}
                            className="w-full px-2 py-1 bg-black/40 border border-white/10 rounded-lg text-emerald-400 font-mono font-bold text-xs"
                          />
                        </div>
                        <div className="col-span-2 font-mono font-bold text-amber-400 text-xs">
                          ₹{resellerPrice}
                        </div>
                        <div className="col-span-2 text-right font-mono text-[10px] text-slate-400 truncate" title={pidPreview}>
                          {pidPreview}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="flex gap-3 pt-2">
                  <button
                    type="button"
                    disabled={isBatchCreating}
                    onClick={() => setIsCreatingVariant(false)}
                    className="w-1/3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-semibold"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    disabled={isBatchCreating}
                    onClick={handleBatchCreateVariants}
                    className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black uppercase tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-amber-950/50"
                  >
                    {isBatchCreating ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        <span>CREATING BATCH VARIANTS...</span>
                      </>
                    ) : (
                      <>
                        <Zap className="w-4 h-4" />
                        <span>CREATE ALL {batchDurations.filter(d => d.selected).length} DURATIONS</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL: EDIT DURATION VARIANT & RESELLER PID */}
      {editingVariant && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setEditingVariant(null)} className="fixed inset-0 bg-black/85 backdrop-blur-md" />
          <div className="relative w-full max-w-lg bg-[#0d0d14] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                  EDIT DURATION & RESELLER PID
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setEditingVariant(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleUpdateVariant} className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    DURATION LABEL
                  </label>
                  <input
                    type="text"
                    value={editVarDurationLabel}
                    onChange={e => {
                      const val = e.target.value;
                      setEditVarDurationLabel(val);
                      const autoH = calculateHoursFromLabel(val);
                      if (autoH) setEditVarDurationHours(autoH);
                    }}
                    required
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-medium focus:border-amber-500 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                    EXPIRY HOURS
                  </label>
                  <input
                    type="number"
                    value={editVarDurationHours}
                    onChange={e => setEditVarDurationHours(Number(e.target.value))}
                    required
                    min={1}
                    className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono font-medium focus:border-amber-500 focus:outline-none"
                  />
                </div>
              </div>

              {/* Pricing & Margin Calculator */}
              <div className="p-3.5 rounded-2xl bg-white/[0.02] border border-white/5 space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="text-[10px] font-bold text-slate-300 uppercase tracking-wider">
                    PRICING & RESELLER MARGIN
                  </label>
                  {editVarPrice > 0 && (
                    <div className="text-[11px] font-mono">
                      <span className="text-slate-400">Margin: </span>
                      <strong className="text-emerald-400">₹{Math.max(0, editVarPrice - editVarResellerPrice)}</strong>
                      <span className="text-slate-500 ml-1">
                        ({editVarPrice > 0 ? Math.round(((editVarPrice - editVarResellerPrice) / editVarPrice) * 100) : 0}%)
                      </span>
                    </div>
                  )}
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      STANDARD PRICE (₹)
                    </label>
                    <input
                      type="number"
                      value={editVarPrice}
                      onChange={e => {
                        const p = Number(e.target.value);
                        setEditVarPrice(p);
                        setEditVarResellerPrice(Math.round(p * 0.75));
                      }}
                      required
                      min={0}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white font-mono font-bold text-emerald-400 focus:border-emerald-500 focus:outline-none"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      VIP RESELLER PRICE (₹)
                    </label>
                    <input
                      type="number"
                      value={editVarResellerPrice}
                      onChange={e => setEditVarResellerPrice(Number(e.target.value))}
                      required
                      min={0}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-amber-500/30 rounded-xl text-white font-mono font-bold text-amber-400 focus:border-amber-500 focus:outline-none"
                    />
                  </div>
                </div>

                {/* Quick Discount Calculator Chips */}
                <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
                  <span className="text-[10px] text-slate-500 font-mono">Auto Calc:</span>
                  {[15, 20, 25, 30, 40].map(pct => (
                    <button
                      key={pct}
                      type="button"
                      onClick={() => {
                        const disc = Math.round(editVarPrice * (1 - pct / 100));
                        setEditVarResellerPrice(Math.max(1, disc));
                      }}
                      className="px-2 py-0.5 rounded bg-amber-500/10 hover:bg-amber-500/20 border border-amber-500/30 text-amber-300 font-mono text-[10px] font-bold transition-all"
                    >
                      -{pct}% (₹{Math.round(editVarPrice * (1 - pct / 100))})
                    </button>
                  ))}
                </div>
              </div>

              {/* RESELLER UPSTREAM API CONFIGURATION */}
              <div className="p-3.5 rounded-2xl bg-amber-500/5 border border-amber-500/20 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-amber-400 font-bold text-[11px] uppercase tracking-wider">
                    <Zap className="w-3.5 h-3.5" />
                    <span>RESELLER API INTEGRATION (CUSTOM DURATION CODE & PID)</span>
                  </div>
                  <span className="text-[10px] font-mono text-emerald-400">
                    {editVarExternalPid.trim() || products.find(p => p.id === editingVariant.productId)?.externalPid ? '⚡ AUTOMATED API' : '📦 LOCAL POOL'}
                  </span>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="text-[10px] font-bold text-amber-400 uppercase tracking-wider block mb-1">
                      RESELLER DURATION SYMBOL / CODE
                    </label>
                    <input
                      type="text"
                      value={editVarExternalDuration}
                      onChange={e => setEditVarExternalDuration(e.target.value)}
                      placeholder={editVarDurationLabel || 'e.g. 1D, 1_DAY, 24h, d1, 7D, 30D'}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-amber-500/30 rounded-xl text-amber-300 font-mono font-bold placeholder-amber-500/30 focus:border-amber-500 focus:outline-none"
                    />
                    <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                      ரீசெல்லர் API-க்கான குறியீடு (எ.கா: <span className="text-amber-300 font-mono">1D, 24h, 1_DAY, d1</span>).
                    </p>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                      RESELLER PID (OVERRIDE)
                    </label>
                    <input
                      type="text"
                      value={editVarExternalPid}
                      onChange={e => setEditVarExternalPid(e.target.value)}
                      placeholder={products.find(p => p.id === editingVariant.productId)?.externalPid || 'Product Default PID'}
                      className="w-full px-3.5 py-2.5 bg-black/40 border border-white/10 rounded-xl text-white font-mono font-bold focus:border-amber-500 focus:outline-none"
                    />
                    <p className="text-[9px] text-slate-400 mt-1 leading-tight">
                      Product PID தானாகப் பொருந்தும். குறிப்பிட்ட மாற்றம் தேவைப்பட்டால் மாற்றவும்.
                    </p>
                  </div>
                </div>

                {/* Live Upstream Key Generation Dispatch Preview */}
                {(editVarExternalPid.trim() || products.find(p => p.id === editingVariant.productId)?.externalPid) && (
                  <div className="p-2.5 rounded-xl bg-black/70 border border-amber-500/30 font-mono text-[10px] text-slate-300 flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
                    <span className="text-slate-400">⚡ Live Upstream Key Request:</span>
                    <span className="text-amber-300">
                      product_id: <strong className="text-white bg-white/10 px-1.5 py-0.5 rounded">{editVarExternalPid.trim() || products.find(p => p.id === editingVariant.productId)?.externalPid}</strong> | duration: <strong className="text-emerald-400 bg-emerald-500/20 px-1.5 py-0.5 rounded">{editVarExternalDuration.trim() || editVarDurationLabel}</strong>
                    </span>
                  </div>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingVariant(null)}
                  className="w-1/3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-slate-950 font-black uppercase tracking-wider shadow-lg shadow-amber-950/50"
                >
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: BULK IMPORT KEYS */}
      {isBulkImporting && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsBulkImporting(false)} className="fixed inset-0 bg-black/85 backdrop-blur-md" />
          <div className="relative w-full max-w-lg bg-[#0d0d14] border border-white/10 rounded-2xl p-5 shadow-2xl z-10 space-y-4 text-xs">
            <h3 className="font-display font-bold text-sm text-white uppercase">BULK IMPORT DIGITAL KEYS</h3>
            <p className="text-slate-400 text-xs">
              Paste keys line-by-line. They will be immediately associated with the chosen product & duration.
            </p>
            <form onSubmit={handleBulkImport} className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">SELECT PRODUCT</label>
                  <select
                    value={bulkImportProdId}
                    onChange={e => {
                      setBulkImportProdId(e.target.value);
                      const prod = products.find(p => p.id === e.target.value);
                      if (prod?.variants?.[0]) setBulkImportVarId(prod.variants[0].id);
                    }}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white"
                  >
                    {products.map(p => (
                      <option key={p.id} value={p.id} className="bg-[#0d0d14]">
                        {p.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 block mb-1">SELECT DURATION</label>
                  <select
                    value={bulkImportVarId}
                    onChange={e => setBulkImportVarId(e.target.value)}
                    className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                  >
                    {products
                      .find(p => p.id === bulkImportProdId)
                      ?.variants?.map(v => (
                        <option key={v.id} value={v.id} className="bg-[#0d0d14]">
                          {v.durationLabel}
                        </option>
                      ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">
                  PASTE KEYS (ONE PER LINE)
                </label>
                <textarea
                  rows={6}
                  value={bulkRawKeys}
                  onChange={e => setBulkRawKeys(e.target.value)}
                  placeholder={`NEXA-PRO-8921-A99B\nNEXA-PRO-8922-K210\nNEXA-PRO-8923-Z718`}
                  required
                  className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono resize-none leading-relaxed"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsBulkImporting(false)}
                  className="w-1/3 py-2 rounded-xl bg-white/[0.04] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2 rounded-xl bg-rose-600 text-white font-bold uppercase tracking-wider"
                >
                  Import All Keys
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: AUTO-GENERATE KEYS */}
      {isGeneratingKeys && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsGeneratingKeys(false)} className="fixed inset-0 bg-black/85 backdrop-blur-md" />
          <div className="relative w-full max-w-sm bg-[#0d0d14] border border-white/10 rounded-2xl p-5 shadow-2xl z-10 space-y-4 text-xs">
            <h3 className="font-display font-bold text-sm text-white uppercase">GENERATE KEYS</h3>
            <form onSubmit={handleGenerateKeys} className="space-y-3">
              <div>
                <label className="text-[10px] font-bold text-slate-400 block mb-1">HOW MANY KEYS?</label>
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={genCount}
                  onChange={e => setGenCount(Number(e.target.value))}
                  className="w-full px-3 py-2 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono"
                />
              </div>
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsGeneratingKeys(false)}
                  className="w-1/3 py-2 rounded-xl bg-white/[0.04] text-slate-300"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2 rounded-xl bg-rose-600 text-white font-bold uppercase"
                >
                  Generate
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REAL-TIME WALLET BALANCE ADDING & ADJUSTMENT */}
      {adjustingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setAdjustingUser(null)} className="fixed inset-0 bg-black/85 backdrop-blur-md" />
          <div className="relative w-full max-w-md bg-[#0d0d14] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 space-y-4 text-xs">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                  REAL-TIME WALLET CREDIT / ADJUST
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setAdjustingUser(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* User Details Header */}
            <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 flex items-center justify-between">
              <div>
                <div className="font-bold text-white text-sm">@{adjustingUser.username}</div>
                <div className="text-[10px] text-slate-400 font-mono">{adjustingUser.email}</div>
              </div>
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase block font-mono">Current Balance</span>
                <span className="text-base font-black font-mono text-emerald-400">
                  ₹{Number(adjustingUser.balance || 0).toFixed(2)}
                </span>
              </div>
            </div>

            <form onSubmit={handleAdjustBalanceSubmit} className="space-y-4">
              {/* Quick Add Presets */}
              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1.5">
                  QUICK PRESET AMOUNTS
                </label>
                <div className="grid grid-cols-4 gap-1.5">
                  {[50, 100, 200, 500, 1000, 2000, 5000].map(amt => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setAdjustAmount(amt.toString())}
                      className={`py-1.5 rounded-lg border font-mono font-bold text-xs transition-all ${
                        adjustAmount === amt.toString()
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300'
                          : 'bg-white/[0.02] border-white/5 text-slate-300 hover:text-white'
                      }`}
                    >
                      +₹{amt}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setAdjustAmount('-100')}
                    className="py-1.5 rounded-lg border border-rose-500/30 bg-rose-500/10 text-rose-300 font-mono font-bold text-xs"
                  >
                    -₹100
                  </button>
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  CUSTOM AMOUNT (POSITIVE TO CREDIT, NEGATIVE TO DEBIT)
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-slate-400 text-sm">₹</span>
                  <input
                    type="number"
                    step="any"
                    value={adjustAmount}
                    onChange={e => setAdjustAmount(e.target.value)}
                    placeholder="e.g. 500 or -50"
                    required
                    className="w-full pl-8 pr-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white font-mono font-bold text-sm focus:border-emerald-500 focus:outline-none"
                  />
                </div>
                {adjustAmount && !isNaN(parseFloat(adjustAmount)) && (
                  <div className="text-[11px] font-mono text-slate-400 mt-1.5 flex items-center justify-between">
                    <span>New Resulting Balance:</span>
                    <span className="font-bold text-emerald-400 text-xs">
                      ₹{(Number(adjustingUser.balance || 0) + parseFloat(adjustAmount)).toFixed(2)}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-wider block mb-1">
                  REASON / AUDIT NOTE
                </label>
                <input
                  type="text"
                  value={adjustReason}
                  onChange={e => setAdjustReason(e.target.value)}
                  placeholder="e.g. Manual UPI Deposit, Bonus, Support Refund..."
                  className="w-full px-3.5 py-2.5 bg-white/[0.03] border border-white/10 rounded-xl text-white text-xs"
                />
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setAdjustingUser(null)}
                  className="w-1/3 py-2.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] text-slate-300 font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="w-2/3 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black uppercase tracking-wider shadow-lg shadow-emerald-950/50"
                >
                  Add Balance Now
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: REAL-TIME USER DETAILS & METRICS DRAWER */}
      {selectedUserDetail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setSelectedUserDetail(null)} className="fixed inset-0 bg-black/85 backdrop-blur-md" />
          <div className="relative w-full max-w-md bg-[#0d0d14] border border-white/10 rounded-2xl p-6 shadow-2xl z-10 space-y-4 text-xs max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-2 border-b border-white/5">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
                <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                  REAL-TIME USER INFORMATION
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setSelectedUserDetail(null)}
                className="p-1 rounded-lg text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>

            {/* Profile Overview Card */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-white/[0.03] to-white/[0.01] border border-white/5 space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-600 to-amber-600 flex items-center justify-center text-white font-black text-lg">
                  {(selectedUserDetail.username || 'U')[0].toUpperCase()}
                </div>
                <div>
                  <h4 className="text-base font-bold text-white">@{selectedUserDetail.username}</h4>
                  <p className="text-xs text-slate-400 font-mono">{selectedUserDetail.email}</p>
                  <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 font-bold uppercase mt-1 inline-block">
                    {selectedUserDetail.role}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/5 text-xs font-mono">
                <div className="p-2 rounded-xl bg-black/40">
                  <span className="text-[9px] text-slate-400 uppercase block">Wallet Balance</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    ₹{Number(selectedUserDetail.balance || 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-black/40">
                  <span className="text-[9px] text-slate-400 uppercase block">Total Spent</span>
                  <span className="text-white font-bold text-sm">
                    ₹{(selectedUserDetail.totalSpent || 0).toFixed(2)}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-black/40">
                  <span className="text-[9px] text-slate-400 uppercase block">Total Orders</span>
                  <span className="text-white font-bold text-sm">
                    {selectedUserDetail.totalOrdersCount || 0}
                  </span>
                </div>
                <div className="p-2 rounded-xl bg-black/40">
                  <span className="text-[9px] text-slate-400 uppercase block">Total Deposited</span>
                  <span className="text-emerald-400 font-bold text-sm">
                    ₹{(selectedUserDetail.totalDeposited || 0).toFixed(2)}
                  </span>
                </div>
              </div>

              <div className="space-y-1 text-[11px] font-mono text-slate-400 pt-1">
                <div>User ID: <span className="text-slate-200 select-all">{selectedUserDetail.id}</span></div>
                <div>Joined Date &amp; Time: <span className="text-rose-400 font-bold">{selectedUserDetail.createdAt ? new Date(selectedUserDetail.createdAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true }) : 'N/A'}</span></div>
                <div>Referral Code: <span className="text-amber-300 font-bold">{selectedUserDetail.referralCode || 'None'}</span></div>
                <div>2FA Authentication: <span className={selectedUserDetail.twoFactorEnabled ? 'text-emerald-400' : 'text-slate-500'}>{selectedUserDetail.twoFactorEnabled ? 'ENABLED' : 'DISABLED'}</span></div>
                <div>Account Status: <span className={!selectedUserDetail.isBanned ? 'text-emerald-400' : 'text-rose-400 font-bold'}>{!selectedUserDetail.isBanned ? 'ACTIVE' : 'SUSPENDED'}</span></div>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => {
                  setAdjustingUser(selectedUserDetail);
                  setAdjustAmount('100');
                  setAdjustReason('Admin Manual Top-up');
                  setSelectedUserDetail(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs uppercase transition-all flex items-center justify-center gap-1.5"
              >
                <Wallet className="w-3.5 h-3.5" />
                <span>Add / Adjust Balance</span>
              </button>
              <button
                type="button"
                onClick={() => {
                  handleToggleBan(selectedUserDetail.id);
                  setSelectedUserDetail(null);
                }}
                className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all ${
                  selectedUserDetail.isBanned
                    ? 'bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 hover:bg-rose-500/30'
                }`}
              >
                {selectedUserDetail.isBanned ? 'Unban' : 'Ban User'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE PRODUCT */}
      {productToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => !isDeletingLoading && setProductToDelete(null)} className="fixed inset-0 bg-black/85 backdrop-blur-md" />
          <div className="relative w-full max-w-sm bg-[#0d0d14] border border-rose-500/40 rounded-2xl p-6 shadow-2xl z-10 space-y-4 text-xs">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                DELETE THIS PRODUCT?
              </h3>
              <p className="text-slate-400 text-xs">
                Are you sure you want to permanently delete <strong className="text-white">"{productToDelete.name}"</strong>? All associated duration variants and digital keys will also be removed.
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingLoading}
                onClick={() => setProductToDelete(null)}
                className="w-1/2 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingLoading}
                onClick={handleConfirmDeleteProduct}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/50"
              >
                {isDeletingLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE DURATION VARIANT */}
      {variantToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => !isDeletingLoading && setVariantToDelete(null)} className="fixed inset-0 bg-black/85 backdrop-blur-md" />
          <div className="relative w-full max-w-sm bg-[#0d0d14] border border-rose-500/40 rounded-2xl p-6 shadow-2xl z-10 space-y-4 text-xs">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto">
              <Layers className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                DELETE DURATION VARIANT?
              </h3>
              <p className="text-slate-400 text-xs">
                Are you sure you want to remove duration option <strong className="text-white">"{variantToDelete.durationLabel}"</strong>?
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingLoading}
                onClick={() => setVariantToDelete(null)}
                className="w-1/2 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingLoading}
                onClick={handleConfirmDeleteVariant}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/50"
              >
                {isDeletingLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Removing...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL: CONFIRM DELETE DIGITAL KEY */}
      {keyToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => !isDeletingLoading && setKeyToDelete(null)} className="fixed inset-0 bg-black/85 backdrop-blur-md" />
          <div className="relative w-full max-w-sm bg-[#0d0d14] border border-rose-500/40 rounded-2xl p-6 shadow-2xl z-10 space-y-4 text-xs">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 border border-rose-500/40 flex items-center justify-center mx-auto">
              <KeyRound className="w-6 h-6" />
            </div>
            <div className="text-center space-y-1">
              <h3 className="font-display font-black text-sm text-white uppercase tracking-wider">
                DELETE DIGITAL KEY?
              </h3>
              <p className="text-slate-400 text-xs">
                Are you sure you want to delete digital key <strong className="text-rose-400 font-mono">{keyToDelete.keyCode}</strong> from inventory?
              </p>
            </div>
            <div className="flex gap-2.5 pt-2">
              <button
                type="button"
                disabled={isDeletingLoading}
                onClick={() => setKeyToDelete(null)}
                className="w-1/2 py-2.5 rounded-xl bg-white/[0.05] hover:bg-white/[0.08] text-slate-300 font-semibold"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isDeletingLoading}
                onClick={handleConfirmDeleteKey}
                className="w-1/2 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-black uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-lg shadow-rose-950/50"
              >
                {isDeletingLoading ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    <span>Deleting...</span>
                  </>
                ) : (
                  <>
                    <Trash2 className="w-3.5 h-3.5" />
                    <span>Delete</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
