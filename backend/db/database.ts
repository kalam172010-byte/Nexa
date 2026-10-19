import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import {
  User,
  Product,
  ProductVariant,
  DigitalKey,
  Order,
  Transaction,
  Deposit,
  SupportTicket,
  SupportMessage,
  ReferralRecord,
  PaymentGatewayConfig,
  ResellerApiConfig,
  ActivityLog,
  SiteCustomizationConfig,
  EmailConfig,
} from '../models/types';

interface DatabaseSchema {
  hasSeededProducts?: boolean;
  deletedProductIds?: string[];
  users: User[];
  products: Product[];
  productVariants: ProductVariant[];
  digitalKeys: DigitalKey[];
  orders: Order[];
  transactions: Transaction[];
  deposits: Deposit[];
  supportTickets: SupportTicket[];
  supportMessages: SupportMessage[];
  referrals: ReferralRecord[];
  gatewayConfig: PaymentGatewayConfig;
  resellerConfig: ResellerApiConfig;
  siteConfig: SiteCustomizationConfig;
  emailConfig?: EmailConfig;
  activityLogs: ActivityLog[];
}

const DB_DIR = path.resolve(process.cwd(), 'database');
const DB_FILE = path.join(DB_DIR, 'nexa_panel.json');

if (!fs.existsSync(DB_DIR)) {
  fs.mkdirSync(DB_DIR, { recursive: true });
}

export class Database {
  private static instance: Database;
  private data: DatabaseSchema;
  private writeTimer: NodeJS.Timeout | null = null;

  private constructor() {
    this.data = this.loadData();
  }

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  private loadData(): DatabaseSchema {
    if (fs.existsSync(DB_FILE)) {
      try {
        const raw = fs.readFileSync(DB_FILE, 'utf-8');
        const parsed = JSON.parse(raw);
        if (!parsed.resellerConfig || !parsed.resellerConfig.apiKey) {
          parsed.resellerConfig = {
            apiUrl: 'https://bantibhaiya.to/api/reseller_v1.php',
            apiKey: '5841ac0e6b458bdde0ffbe2baa095306',
            masterKey: 'a7f3e8b2c9d1f4a6b8c2d5e9f1a3b6c8',
            timeoutMs: 20000,
            retryAttempts: 2,
            autoSyncStock: true,
            isLiveApiEnabled: true,
            defaultAndroidId: '0b9b969bc2e7997b',
          };
        }
        if (!parsed.siteConfig || !parsed.siteConfig.siteTitle) {
          parsed.siteConfig = this.getDefaultSiteConfig();
        }
        if (!parsed.emailConfig) {
          parsed.emailConfig = this.getDefaultEmailConfig();
        } else if (parsed.emailConfig.smtpPort === 587 && parsed.emailConfig.secure === true) {
          parsed.emailConfig.secure = false;
        }
        if (!parsed.gatewayConfig) {
          parsed.gatewayConfig = this.getDefaultGatewayConfig();
        } else {
          // Ensure FamGateway has its valid production API key if selected
          if (
            (parsed.gatewayConfig.apiUrl?.includes('famgateway.in') || parsed.gatewayConfig.gatewayType === 'FAMGATEWAY') &&
            (!parsed.gatewayConfig.apiKey ||
              parsed.gatewayConfig.apiKey.includes('...') ||
              parsed.gatewayConfig.apiKey === 'fam_67c5e10fc423d5ef37aac212a20e55c63d51b7fe')
          ) {
            parsed.gatewayConfig.apiKey = 'fam_a9527c6c2dd4d26ad5223cfc3c4c5fa9289b574e';
          }
          // Force real-time bank verification mode (no fake test mode)
          parsed.gatewayConfig.testMode = false;
        }
        if (Array.isArray(parsed.products) && Array.isArray(parsed.productVariants)) {
          const productIds = new Set(parsed.products.map((p: any) => p.id));
          parsed.productVariants = parsed.productVariants.filter((v: any) => productIds.has(v.productId));
          for (const v of parsed.productVariants) {
            if (typeof v.price === 'number' && v.price > 0) {
              v.resellerPrice = v.price;
            }
          }
        }
        if (Array.isArray(parsed.users)) {
          const seenApiKeys = new Set<string>();
          let modifiedUsers = false;
          for (const u of parsed.users) {
            if (
              !u.apiKey ||
              seenApiKeys.has(u.apiKey) ||
              u.apiKey === 'nexa_live_89f4e2a1c7d3b6f890e1a2b3c4d5e6f7'
            ) {
              u.apiKey = `nexa_live_${crypto.randomBytes(16).toString('hex')}`;
              modifiedUsers = true;
            }
            seenApiKeys.add(u.apiKey);
          }
          if (modifiedUsers) {
            try {
              fs.writeFileSync(DB_FILE, JSON.stringify(parsed, null, 2), 'utf-8');
            } catch {}
          }
        }
        return parsed;
      } catch (err) {
        console.error('Failed to parse database file, reinitializing', err);
      }
    }
    return this.getInitialSchema();
  }

  public getDefaultGatewayConfig(): PaymentGatewayConfig {
    return {
      gatewayName: 'FamGateway Official (famgateway.in)',
      gatewayType: 'FAMGATEWAY',
      apiUrl: 'https://famgateway.in/api/create-order',
      qrAliasUrl: 'https://famgateway.in/api/qr.php',
      statusUrl: 'https://famgateway.in/api/verify-order.php',
      merchantId: 'FAMGATEWAY_PRIMARY',
      apiKey: 'fam_a9527c6c2dd4d26ad5223cfc3c4c5fa9289b574e',
      masterKey: '',
      webhookUrl: 'https://panel.nexa.internal/api/payments/webhook',
      redirectUrl: 'https://yoursite.com/payment-success',
      successUrl: 'https://yoursite.com/payment-success',
      cancelUrl: 'https://yoursite.com/payment-cancel',
      paymentExpiryMinutes: 10,
      minDeposit: 1,
      isUpiQrEnabled: true,
      upiVpa: '8056317218@fam',
      upiMerchantName: 'Kalam Kalam',
      testMode: false,
    };
  }

  public getDefaultSiteConfig(): SiteCustomizationConfig {
    return {
      siteTitle: 'KALAM FF PANEL',
      siteTagline: 'Free Fire VIP Digital Keys & Reseller Panel',
      logoUrl: '',
      faviconUrl: '',
      currencySymbol: '₹',
      currencyCode: 'INR',
      footerText: 'The premier automated Free Fire digital keys and panel reseller infrastructure.',
      copyrightText: '© 2026 Kalam FF Panel. All rights reserved.',
      accentTheme: 'crimson',
      backgroundStyle: 'deep-slate',
      glowIntensity: 'vibrant',
      borderRadius: 'rounded',
      fontStyle: 'ultra-bold',
      isAnnouncementEnabled: true,
      announcementText: '🔥 OB55 UPDATE ACTIVE! Kalam FF Instant Digital Key Delivery 24/7 with Live Reseller API',
      announcementType: 'promo',
      announcementLink: '',
      isMarqueeEnabled: true,
      marqueeText: '⚡ Fast UPI Auto Deposit | Instant FF Key Delivery | Non-Root & iOS Supported | 100% Anti-Ban Menus | 24/7 Live Support',
      heroTitle: 'DOMINATE FREE FIRE WITH KALAM FF VIP PANEL',
      heroSubtitle: 'Instant Key Delivery · Automated Wallet Deposits · Wholesale VIP Pricing for Resellers',
      heroBadgeText: 'OFFICIAL KALAM FF RESELLER PLATFORM',
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
      adminPanelTitle: 'KALAM FF SYSTEM CONTROL PANEL',
      adminHeaderNotice: 'SUPER ADMIN LIVE REALTIME SESSION ACTIVE',
      adminAccentColor: '#e11d48',
      adminStatusBadge: 'SUPER PRIVILEGES',
      adminThemePreset: 'crimson-admin',
      adminShortcutsEnabled: true,
    };
  }

  public getDefaultEmailConfig(): EmailConfig {
    return {
      enabled: true,
      protocol: 'smtp',
      senderEmail: 'kalamkalam1234kd@gmail.com',
      senderName: 'KALAM FF PANEL',
      smtpHost: 'smtp.gmail.com',
      smtpPort: 587,
      secure: false,
      smtpUser: 'kalamkalam1234kd@gmail.com',
      smtpPass: '',
      imapHost: 'imap.gmail.com',
      imapPort: 993,
      imapUser: 'kalamkalam1234kd@gmail.com',
      imapPass: '',
      imapSecure: true,
      otpExpiryMinutes: 10,
      allowOtpSignup: true,
      imap24x7Enabled: true,
      imapPollIntervalSeconds: 25,
      autoApproveDeposits: true,
      otpSubject: '🔐 Your {SITE_NAME} Login Verification Code: {OTP}',
      otpHeader: 'Secure Email OTP Authentication',
      otpMessageBody: 'Use the 6-digit verification code below to log in to your {SITE_NAME} account:',
      otpSecurityNotice: '🔒 Security Notice: Never share this code with anyone, including staff. Our administrators will never ask for your OTP.',
      otpFooterText: 'Automated Gaming Reseller Infrastructure · Secure OTP Delivery',
    };
  }

  private getInitialSchema(): DatabaseSchema {
    return {
      users: [],
      products: [],
      productVariants: [],
      digitalKeys: [],
      orders: [],
      transactions: [],
      deposits: [],
      supportTickets: [],
      supportMessages: [],
      referrals: [],
      gatewayConfig: this.getDefaultGatewayConfig(),
      resellerConfig: {
        apiUrl: 'https://bantibhaiya.to/api/reseller_v1.php',
        apiKey: '5841ac0e6b458bdde0ffbe2baa095306',
        masterKey: 'a7f3e8b2c9d1f4a6b8c2d5e9f1a3b6c8',
        timeoutMs: 20000,
        retryAttempts: 2,
        autoSyncStock: true,
        isLiveApiEnabled: true,
        defaultAndroidId: '0b9b969bc2e7997b',
      },
      siteConfig: this.getDefaultSiteConfig(),
      emailConfig: this.getDefaultEmailConfig(),
      activityLogs: [],
    };
  }

  public save(): void {
    if (this.writeTimer) clearTimeout(this.writeTimer);
    this.writeTimer = setTimeout(() => {
      this.saveSync();
    }, 50);
  }

  public saveSync(): void {
    if (this.writeTimer) {
      clearTimeout(this.writeTimer);
      this.writeTimer = null;
    }
    try {
      const tempPath = `${DB_FILE}.tmp`;
      fs.writeFileSync(tempPath, JSON.stringify(this.data, null, 2), 'utf-8');
      fs.renameSync(tempPath, DB_FILE);
    } catch (err) {
      console.error('Error persisting database synchronously:', err);
    }
  }

  public get hasSeededProducts(): boolean {
    return Boolean(this.data.hasSeededProducts);
  }

  public markProductsSeeded(): void {
    this.data.hasSeededProducts = true;
    this.saveSync();
  }

  public permanentlyDeleteProduct(id: string): void {
    if (!this.data.deletedProductIds) {
      this.data.deletedProductIds = [];
    }
    if (!this.data.deletedProductIds.includes(id)) {
      this.data.deletedProductIds.push(id);
    }
    this.data.products = this.data.products.filter(p => p.id !== id);
    this.data.productVariants = this.data.productVariants.filter(v => v.productId !== id);
    this.data.digitalKeys = this.data.digitalKeys.filter(k => !(k.productId === id && !k.isUsed));
    this.data.hasSeededProducts = true;
    this.saveSync();
  }

  public addProduct(product: Product): void {
    if (!this.data.products) this.data.products = [];
    if (this.data.deletedProductIds) {
      this.data.deletedProductIds = this.data.deletedProductIds.filter(id => id !== product.id);
    }
    this.data.products.unshift(product);
    this.saveSync();
  }

  public addVariant(variant: ProductVariant): void {
    if (!this.data.productVariants) this.data.productVariants = [];
    this.data.productVariants.push(variant);
    this.saveSync();
  }

  public addVariants(variants: ProductVariant[]): void {
    if (!this.data.productVariants) this.data.productVariants = [];
    this.data.productVariants.push(...variants);
    this.saveSync();
  }

  public get users(): User[] {
    if (!this.data.users) this.data.users = [];
    return this.data.users;
  }

  public get products(): Product[] {
    if (!this.data.products) this.data.products = [];
    return this.data.products;
  }

  public get productVariants(): ProductVariant[] {
    if (!this.data.productVariants) this.data.productVariants = [];
    return this.data.productVariants;
  }
  public get digitalKeys(): DigitalKey[] { return this.data.digitalKeys; }
  public get orders(): Order[] { return this.data.orders; }
  public get transactions(): Transaction[] { return this.data.transactions; }
  public get deposits(): Deposit[] { return this.data.deposits; }
  public get supportTickets(): SupportTicket[] { return this.data.supportTickets; }
  public get supportMessages(): SupportMessage[] { return this.data.supportMessages; }
  public get referrals(): ReferralRecord[] { return this.data.referrals; }
  public get gatewayConfig(): PaymentGatewayConfig { return this.data.gatewayConfig; }
  public get resellerConfig(): ResellerApiConfig { return this.data.resellerConfig; }
  public get siteConfig(): SiteCustomizationConfig { return this.data.siteConfig; }
  public get emailConfig(): EmailConfig {
    if (!this.data.emailConfig) {
      this.data.emailConfig = this.getDefaultEmailConfig();
    }
    return this.data.emailConfig;
  }
  public get activityLogs(): ActivityLog[] { return this.data.activityLogs; }

  public updateSiteConfig(config: Partial<SiteCustomizationConfig>): SiteCustomizationConfig {
    this.data.siteConfig = {
      ...this.data.siteConfig,
      ...config,
    };
    this.save();
    return this.data.siteConfig;
  }

  public updateEmailConfig(config: Partial<EmailConfig>): EmailConfig {
    if (!this.data.emailConfig) {
      this.data.emailConfig = this.getDefaultEmailConfig();
    }
    this.data.emailConfig = {
      ...this.data.emailConfig,
      ...config,
    };
    this.saveSync();
    return this.data.emailConfig;
  }

  public logActivity(userId: string | undefined, username: string | undefined, action: string, details: string, ip: string = '127.0.0.1') {
    const log: ActivityLog = {
      id: `LOG-${Date.now()}-${crypto.randomBytes(3).toString('hex')}`,
      userId,
      username,
      action,
      details,
      ip,
      createdAt: new Date().toISOString(),
    };
    this.data.activityLogs.unshift(log);
    if (this.data.activityLogs.length > 500) {
      this.data.activityLogs.pop();
    }
    this.save();
  }

  public getRawData(): DatabaseSchema {
    return JSON.parse(JSON.stringify(this.data));
  }

  public replaceData(newData: Partial<DatabaseSchema>): void {
    if (!newData || typeof newData !== 'object') {
      throw new Error('Invalid backup data');
    }
    this.data = {
      ...this.getInitialSchema(),
      ...newData,
      users: Array.isArray(newData.users) ? newData.users : this.data.users,
      products: Array.isArray(newData.products) ? newData.products : this.data.products,
      productVariants: Array.isArray(newData.productVariants) ? newData.productVariants : this.data.productVariants,
      digitalKeys: Array.isArray(newData.digitalKeys) ? newData.digitalKeys : this.data.digitalKeys,
      orders: Array.isArray(newData.orders) ? newData.orders : this.data.orders,
      transactions: Array.isArray(newData.transactions) ? newData.transactions : this.data.transactions,
      deposits: Array.isArray(newData.deposits) ? newData.deposits : this.data.deposits,
      supportTickets: Array.isArray(newData.supportTickets) ? newData.supportTickets : this.data.supportTickets,
      supportMessages: Array.isArray(newData.supportMessages) ? newData.supportMessages : this.data.supportMessages,
      referrals: Array.isArray(newData.referrals) ? newData.referrals : this.data.referrals,
      gatewayConfig: newData.gatewayConfig || this.data.gatewayConfig,
      resellerConfig: newData.resellerConfig || this.data.resellerConfig,
      siteConfig: newData.siteConfig || this.data.siteConfig,
      emailConfig: newData.emailConfig || this.data.emailConfig,
      activityLogs: Array.isArray(newData.activityLogs) ? newData.activityLogs : this.data.activityLogs,
    };
    this.saveSync();
  }
}

export const db = Database.getInstance();
