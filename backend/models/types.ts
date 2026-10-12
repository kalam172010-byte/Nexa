export type UserRole = 'USER' | 'RESELLER' | 'ADMIN' | 'SUPER ADMIN';

export interface User {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: UserRole;
  balance: number;
  apiKey?: string;
  referralCode: string;
  referredBy?: string;
  twoFactorEnabled: boolean;
  isBanned: boolean;
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
  stockCount: number;
  externalPid?: string;
  externalDuration?: string;
  requiresAndroidId?: boolean;
  isActive: boolean;
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
  variants?: ProductVariant[];
}

export interface DigitalKey {
  id: string;
  productId: string;
  variantId: string;
  keyCode: string;
  isUsed: boolean;
  assignedUserId?: string;
  assignedOrderId?: string;
  assignedAt?: string;
  expiresAt?: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
  createdAt: string;
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
  createdAt: string;
}

export interface Transaction {
  id: string;
  userId: string;
  type: 'DEPOSIT' | 'PURCHASE' | 'REFUND' | 'REFERRAL_BONUS' | 'ADMIN_ADJUST';
  amount: number;
  description: string;
  referenceId?: string;
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
  status: 'PENDING' | 'PROCESSING' | 'SUCCESS' | 'FAILED' | 'EXPIRED';
  expiresAt: string;
  createdAt: string;
  completedAt?: string;
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
  messages?: SupportMessage[];
}

export interface ReferralRecord {
  id: string;
  referrerId: string;
  referredUserId: string;
  referredUsername: string;
  rewardEarned: number;
  hasPurchased: boolean;
  createdAt: string;
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
  defaultAndroidId?: string;
}

export interface ActivityLog {
  id: string;
  userId?: string;
  username?: string;
  action: string;
  details: string;
  ip: string;
  createdAt: string;
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

export interface EmailConfig {
  enabled: boolean;
  protocol: 'smtp' | 'imap_smtp' | 'gmail';
  senderEmail: string;        // "My Email" (e.g., kalamkalam1234kd@gmail.com)
  senderName: string;         // e.g. "NEXA Gaming Panel"
  smtpHost: string;           // e.g. smtp.gmail.com
  smtpPort: number;           // e.g. 587 or 465
  secure: boolean;            // SSL/TLS (true for 465, false for 587)
  smtpUser: string;           // SMTP Username
  smtpPass: string;           // Password / App password
  imapHost?: string;          // IMAP Host (e.g. imap.gmail.com)
  imapPort?: number;          // IMAP Port (e.g. 993)
  imapUser?: string;          // IMAP Username
  imapPass?: string;          // IMAP Password
  imapSecure?: boolean;       // IMAP SSL
  otpExpiryMinutes: number;   // default 10
  allowOtpSignup: boolean;    // auto-create user on OTP verification if not exists
}
