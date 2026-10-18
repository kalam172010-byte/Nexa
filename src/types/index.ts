export type UserRole = 'USER' | 'RESELLER' | 'ADMIN' | 'SUPER ADMIN';

export interface User {
  id: string;
  username: string;
  email: string;
  role: UserRole;
  balance: number;
  apiKey?: string;
  referralCode: string;
  referredBy?: string;
  twoFactorEnabled: boolean;
  isBanned: boolean;
  hasPassword?: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ProductVariant {
  id: string;
  productId: string;
  durationLabel: string;
  durationHours: number;
  price: number;
  resellerPrice: number;
  displayPrice?: number;
  stockCount: number;
  externalPid?: string;
  externalDuration?: string;
  requiresAndroidId?: boolean;
  isActive: boolean;
  isAvailable?: boolean;
}

export interface Product {
  id: string;
  name: string;
  game: string;
  description: string;
  category: string;
  badge?: string;
  imageUrl?: string;
  features?: string[];
  deviceType?: string;
  updateFileUrl?: string;
  videoUrl?: string;
  externalPid?: string;
  isActive: boolean;
  isUnderMaintenance?: boolean;
  maintenanceNotice?: string;
  createdAt: string;
  variants: ProductVariant[];
}

export interface DigitalKey {
  id: string;
  keyCode: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
  productId?: string;
  variantId?: string;
  assignedUserId?: string;
  assignedOrderId?: string;
  assignedAt?: string;
  expiresAt?: string;
  productName: string;
  gameName: string;
  durationLabel: string;
  isUsed?: boolean;
  purchaseSource?: 'API' | 'WEB';
  purchaseSourceLabel?: string;
  createdAt?: string;
}

export interface Order {
  id: string;
  userId: string;
  productId: string;
  variantId: string;
  productName: string;
  durationLabel: string;
  pricePaid: number;
  deliveredKeyId: string;
  deliveredKeyCode: string;
  status: 'COMPLETED' | 'REFUNDED' | 'FAILED';
  purchaseSource?: 'API' | 'WEB';
  purchaseSourceLabel?: string;
  createdAt: string;
  username?: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'DEPOSIT' | 'PURCHASE' | 'REFUND' | 'REFERRAL_BONUS' | 'ADMIN_ADJUST';
  amount: number;
  description: string;
  referenceId?: string;
  purchaseSource?: 'API' | 'WEB';
  purchaseSourceLabel?: string;
  status: 'SUCCESS' | 'PENDING' | 'FAILED' | 'EXPIRED';
  createdAt: string;
}

export interface Deposit {
  id: string;
  userId: string;
  amount: number;
  fee: number;
  method: 'UPI_QR' | 'ADMIN_SUPPORT';
  transactionId: string;
  gatewayOrderId?: string;
  qrUrl?: string;
  checkoutUrl?: string;
  upiIntent?: string;
  upiVpa?: string;
  merchantName?: string;
  upiRefNumber?: string;
  qrPayload?: string;
  payableAmount?: number;
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  completedAt?: string;
  username?: string;
}

export interface SupportMessage {
  id: string;
  ticketId: string;
  senderId: string;
  senderRole: UserRole;
  senderName: string;
  message: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  userId: string;
  username: string;
  subject: string;
  category: 'Payment' | 'Purchase' | 'Key' | 'Account' | 'Technical' | 'Other';
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  status: 'OPEN' | 'PENDING' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  messageCount?: number;
  lastMessage?: string;
  messages?: SupportMessage[];
}

export interface ReferralData {
  referralCode: string;
  referralLink: string;
  totalReferrals: number;
  successfulReferrals: number;
  totalEarnings: number;
  commissionPercent: number;
  minWithdrawal: number;
  referrals: {
    id: string;
    referrerId: string;
    referredUserId: string;
    referredUsername: string;
    rewardEarned: number;
    hasPurchased: boolean;
    createdAt: string;
  }[];
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalSales: number;
  todaySales: number;
  monthlySales?: number;
  todayOrders?: number;
  totalDeposits: number;
  pendingDeposits: number;
  totalOrders: number;
  availableKeys: number;
  todayRevenue: number;
  salesChart: {
    date: string;
    sales: number;
    deposits: number;
    orders: number;
  }[];
}

export interface SiteCustomizationConfig {
  // Brand Identity
  siteTitle: string;
  siteTagline: string;
  logoUrl?: string;
  faviconUrl?: string;
  currencySymbol: string;
  currencyCode: string;
  footerText?: string;
  copyrightText?: string;
  customDomain?: string;

  // Visual Theme & Accents
  accentTheme: 'crimson' | 'cyberpunk' | 'emerald' | 'amber' | 'violet' | 'blood' | 'blue' | 'gold';
  backgroundStyle: 'deep-slate' | 'oled-black' | 'midnight-void';
  glowIntensity: 'off' | 'subtle' | 'vibrant' | 'extreme';
  borderRadius: 'rounded' | 'sharp' | 'pill';
  fontStyle: 'ultra-bold' | 'cyber-black' | 'modern-heavy';

  // Announcement Bar & Marquee News
  isAnnouncementEnabled: boolean;
  announcementText: string;
  announcementType: 'promo' | 'alert' | 'update' | 'discount';
  announcementLink?: string;
  isMarqueeEnabled: boolean;
  marqueeText: string;

  // Hero & Marketing Section
  heroTitle: string;
  heroSubtitle: string;
  heroBadgeText: string;

  // Social & Community Links
  telegramChannelUrl?: string;
  telegramSupportUser?: string;
  whatsappNumber?: string;
  youtubeChannelUrl?: string;
  discordInviteUrl?: string;
  contactEmail?: string;
  quickSupportWidgetEnabled: boolean;

  // Platform Business Rules
  minDepositAmount: number;
  resellerUpgradePrice: number;
  referralCommissionPct: number;
  accountSafetyBalanceText: string;

  // Custom Admin Panel Personalization
  adminPanelTitle: string;
  adminHeaderNotice?: string;
  adminAccentColor: string;
  adminStatusBadge?: string;
  adminThemePreset?: 'crimson-admin' | 'cyber-admin' | 'emerald-admin' | 'gold-admin' | 'obsidian-admin';
  adminShortcutsEnabled?: boolean;
}

export interface PaymentGatewayConfig {
  gatewayName: string;
  gatewayType?: 'RENDER_FGW' | 'FAMGATEWAY' | 'DIRECT_UPI' | 'CUSTOM';
  apiUrl: string;
  qrAliasUrl?: string;
  statusUrl?: string;
  merchantId?: string;
  apiKey: string;
  masterKey?: string;
  webhookUrl: string;
  redirectUrl?: string;
  successUrl?: string;
  cancelUrl?: string;
  paymentExpiryMinutes: number;
  minDeposit: number;
  isUpiQrEnabled: boolean;
  upiVpa: string;
  upiMerchantName: string;
  testMode?: boolean;
}

export interface ResellerApiConfig {
  apiUrl: string;
  apiKey: string;
  masterKey: string;
  timeoutMs: number;
  retryAttempts: number;
  autoSyncStock: boolean;
  isLiveApiEnabled: boolean;
  defaultAndroidId: string;
}
