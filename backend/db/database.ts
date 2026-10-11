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
        return parsed;
      } catch (err) {
        console.error('Failed to parse database file, reinitializing', err);
      }
    }
    return this.getInitialSchema();
  }

  public getDefaultSiteConfig(): SiteCustomizationConfig {
    return {
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
      gatewayConfig: {
        gatewayName: 'FamPay UPI Payment Gateway',
        gatewayType: 'RENDER_FGW',
        apiUrl: 'https://payment-gateway-87gk.onrender.com/api/create-order',
        qrAliasUrl: 'https://payment-gateway-87gk.onrender.com/api/qr.php',
        statusUrl: 'https://payment-gateway-87gk.onrender.com/api/v1/order/status',
        merchantId: 'FGW_RENDER_MERCHANT',
        apiKey: 'fam_67c5e10fc423d5ef37aac212a20e55c63d51b7fe',
        masterKey: '',
        webhookUrl: 'https://panel.nexa.internal/api/payments/webhook',
        redirectUrl: 'https://yoursite.com/payment-success',
        successUrl: 'https://yoursite.com/payment-success',
        cancelUrl: 'https://yoursite.com/payment-cancel',
        paymentExpiryMinutes: 5,
        minDeposit: 1,
        isUpiQrEnabled: true,
        upiVpa: '8056317218@fam',
        upiMerchantName: 'Kalam Akash',
      },
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
  public get activityLogs(): ActivityLog[] { return this.data.activityLogs; }

  public updateSiteConfig(config: Partial<SiteCustomizationConfig>): SiteCustomizationConfig {
    this.data.siteConfig = {
      ...this.data.siteConfig,
      ...config,
    };
    this.save();
    return this.data.siteConfig;
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
}

export const db = Database.getInstance();
