import crypto from 'crypto';
import { db } from './database';
import { User, Product, ProductVariant, DigitalKey } from '../models/types';

export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(`nexa_salt_${password}`).digest('hex');
}

export function seedDatabaseIfEmpty() {
  const now = new Date();
  const isoNow = now.toISOString();

  // Seed authenticable accounts if none exist
  if (db.users.length === 0) {
    const user1: User = {
      id: 'USR-101',
      username: 'pro_gamer99',
      email: 'user@example.com',
      passwordHash: hashPassword('user123'),
      role: 'USER',
      balance: 500.0,
      referralCode: 'NEXA99PRO',
      twoFactorEnabled: false,
      isBanned: false,
      createdAt: isoNow,
      updatedAt: isoNow,
    };

    const reseller1: User = {
      id: 'USR-202',
      username: 'apex_reseller',
      email: 'reseller@example.com',
      passwordHash: hashPassword('reseller123'),
      role: 'RESELLER',
      balance: 1000.0,
      referralCode: 'APEXVIP77',
      twoFactorEnabled: false,
      isBanned: false,
      createdAt: isoNow,
      updatedAt: isoNow,
    };

    const admin1: User = {
      id: 'USR-001',
      username: 'nexa_admin',
      email: 'admin@example.com',
      passwordHash: hashPassword('admin123'),
      role: 'ADMIN',
      balance: 5000.0,
      referralCode: 'NEXAROOT1',
      twoFactorEnabled: true,
      isBanned: false,
      createdAt: isoNow,
      updatedAt: isoNow,
    };

    const kalamAdmin: User = {
      id: 'USR-KALAM-ADMIN',
      username: 'kalam',
      email: 'kalamkalam1234kd@gmail.com',
      passwordHash: hashPassword('admin123'),
      role: 'ADMIN',
      balance: 5000.0,
      referralCode: 'NXKALAM1',
      twoFactorEnabled: false,
      isBanned: false,
      createdAt: isoNow,
      updatedAt: isoNow,
    };

    db.users.push(user1, reseller1, admin1, kalamAdmin);
  }

  // Ensure admin accounts are always present and have ADMIN privileges
  const adminEmails = [
    { email: 'kalamkalam1234kd@gmail.com', username: 'kalam', id: 'USR-KALAM-ADMIN' },
    { email: 'kalam172010@gmail.com', username: 'kalam_kalam', id: 'tnqy7LYfgwgzYpoQGqljC4H6bKc2' },
    { email: 'admin@example.com', username: 'nexa_admin', id: 'USR-001' },
  ];

  for (const adm of adminEmails) {
    const existing = db.users.find(u => u.email.toLowerCase() === adm.email.toLowerCase());
    if (existing) {
      if (existing.role !== 'ADMIN') existing.role = 'ADMIN';
      if (!existing.passwordHash) existing.passwordHash = hashPassword('admin123');
    } else {
      db.users.push({
        id: adm.id,
        username: adm.username,
        email: adm.email,
        passwordHash: hashPassword('admin123'),
        role: 'ADMIN',
        balance: 5000.0,
        referralCode: `NX${adm.username.toUpperCase().slice(0, 6)}`,
        twoFactorEnabled: false,
        isBanned: false,
        createdAt: isoNow,
        updatedAt: isoNow,
      });
    }
  }

  // Populate official gaming key products so all users can see and buy keys
  if (!db.hasSeededProducts && db.products.length === 0) {
    const products: Product[] = [
      {
        id: 'PROD-BALA-01',
        name: 'BALA MOD XYZ ~ V5 FF NONROOT',
        game: 'FREEFIRE',
        category: 'FREEFIRE',
        deviceType: 'NONROOT',
        badge: 'STAR',
        description: 'V5 FF Nonroot mod menu with auto headshot, real-time location radar, and fast revive.',
        imageUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
        features: ['Headshot', 'Location', 'Fast Revive'],
        updateFileUrl: 'https://t.me/c/nexa_mod/update_bala_v5.apk',
        videoUrl: 'https://t.me/c/nexa_mod/bala_gameplay',
        isActive: true,
        createdAt: isoNow,
      },
      {
        id: 'PROD-IMMO-02',
        name: 'IMMO BLOODY NON ROOT',
        game: 'FREEFIRE',
        category: 'FREEFIRE',
        deviceType: 'NONROOT',
        badge: 'NONROOT',
        description: 'Full safe working all servers with all enemy location pinpoint and freeze fake lag protection.',
        imageUrl: 'https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80',
        features: ['All Enemy Location', 'All Server Working', 'Freez fake lag'],
        updateFileUrl: 'https://t.me/c/nexa_mod/immo_bloody_v4.apk',
        videoUrl: 'https://t.me/c/nexa_mod/immo_feedback',
        isActive: true,
        createdAt: isoNow,
      },
      {
        id: 'PROD-DRIP-03',
        name: 'DRIP WIRE IOS + NONROOT',
        game: 'FREEFIRE',
        category: 'FREEFIRE',
        deviceType: 'iOS IPHONE',
        badge: 'ELITE',
        description: 'Advanced iOS iPhone & Android Non-Root bypass with precision aimbot and silent aim prediction.',
        imageUrl: 'https://images.unsplash.com/photo-1538481199705-c710c4e965fc?auto=format&fit=crop&w=800&q=80',
        features: ['AIMBOT', 'Silent Aim', 'AIM LAG'],
        updateFileUrl: 'https://t.me/c/nexa_mod/drip_wire_ios.mobileconfig',
        videoUrl: 'https://t.me/c/nexa_mod/drip_wire_gameplay',
        isActive: true,
        createdAt: isoNow,
      },
      {
        id: 'PROD-TROLL-04',
        name: 'TROLL MODZ FF',
        game: 'FREEFIRE',
        category: 'FREEFIRE',
        deviceType: 'ALL SYSTEMS',
        badge: 'OB55',
        description: 'OB55 update done now online. All products fully working with auto headshot and anti-blacklist.',
        imageUrl: 'https://images.unsplash.com/photo-1563089145-599997674d42?auto=format&fit=crop&w=800&q=80',
        features: ['OB55 Update Done', 'Full Safe Working All Serv', 'Auto Headshot'],
        updateFileUrl: 'https://t.me/c/nexa_mod/troll_modz_ob55.apk',
        videoUrl: 'https://t.me/c/nexa_mod/troll_video',
        isActive: true,
        createdAt: isoNow,
      },
      {
        id: 'PROD-CARROM-05',
        name: 'CARROM POOL VIP AIM',
        game: 'CARROM POOL',
        category: 'CARROM POOL',
        deviceType: 'ALL SYSTEMS',
        badge: 'VIP',
        description: 'Multi-laser guideline predictor with pocket shot calculation and safe anti-ban technology.',
        imageUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=800&q=80',
        features: ['Laser Aim Line', 'Coin Cushion Predictor', 'No Ban Protection'],
        updateFileUrl: 'https://t.me/c/nexa_mod/carrom_vip.apk',
        videoUrl: 'https://t.me/c/nexa_mod/carrom_preview',
        isActive: true,
        createdAt: isoNow,
      },
    ];

    const variants: ProductVariant[] = [
      // BALA MOD XYZ ~ V5 FF NONROOT
      {
        id: 'VAR-BALA-1H',
        productId: 'PROD-BALA-01',
        durationLabel: '1 Hours',
        durationHours: 1,
        price: 20.0,
        resellerPrice: 15.0,
        stockCount: 50,
        externalPid: 'BALA_V5_1H',
        isActive: true,
      },
      {
        id: 'VAR-BALA-3H',
        productId: 'PROD-BALA-01',
        durationLabel: '3 Hours',
        durationHours: 3,
        price: 70.0,
        resellerPrice: 55.0,
        stockCount: 50,
        externalPid: 'BALA_V5_3H',
        isActive: true,
      },
      {
        id: 'VAR-BALA-6H',
        productId: 'PROD-BALA-01',
        durationLabel: '6 Hours',
        durationHours: 6,
        price: 120.0,
        resellerPrice: 95.0,
        stockCount: 50,
        externalPid: 'BALA_V5_6H',
        isActive: true,
      },
      {
        id: 'VAR-BALA-1D',
        productId: 'PROD-BALA-01',
        durationLabel: '1 DAYS',
        durationHours: 24,
        price: 300.0,
        resellerPrice: 240.0,
        stockCount: 50,
        externalPid: 'BALA_V5_1D',
        isActive: true,
      },

      // IMMO BLOODY NON ROOT
      {
        id: 'VAR-IMMO-1H',
        productId: 'PROD-IMMO-02',
        durationLabel: '1 Hours',
        durationHours: 1,
        price: 25.0,
        resellerPrice: 18.0,
        stockCount: 50,
        externalPid: 'IMMO_V4_1H',
        isActive: true,
      },
      {
        id: 'VAR-IMMO-3H',
        productId: 'PROD-IMMO-02',
        durationLabel: '3 Hours',
        durationHours: 3,
        price: 80.0,
        resellerPrice: 65.0,
        stockCount: 50,
        externalPid: 'IMMO_V4_3H',
        isActive: true,
      },
      {
        id: 'VAR-IMMO-6H',
        productId: 'PROD-IMMO-02',
        durationLabel: '6 Hours',
        durationHours: 6,
        price: 130.0,
        resellerPrice: 105.0,
        stockCount: 50,
        externalPid: 'IMMO_V4_6H',
        isActive: true,
      },
      {
        id: 'VAR-IMMO-1D',
        productId: 'PROD-IMMO-02',
        durationLabel: '1 DAYS',
        durationHours: 24,
        price: 320.0,
        resellerPrice: 250.0,
        stockCount: 50,
        externalPid: 'IMMO_V4_1D',
        isActive: true,
      },

      // DRIP WIRE IOS + NONROOT
      {
        id: 'VAR-DRIP-1H',
        productId: 'PROD-DRIP-03',
        durationLabel: '1 Hours',
        durationHours: 1,
        price: 30.0,
        resellerPrice: 22.0,
        stockCount: 50,
        externalPid: 'DRIP_IOS_1H',
        isActive: true,
      },
      {
        id: 'VAR-DRIP-3H',
        productId: 'PROD-DRIP-03',
        durationLabel: '3 Hours',
        durationHours: 3,
        price: 85.0,
        resellerPrice: 68.0,
        stockCount: 50,
        externalPid: 'DRIP_IOS_3H',
        isActive: true,
      },
      {
        id: 'VAR-DRIP-1D',
        productId: 'PROD-DRIP-03',
        durationLabel: '1 DAYS',
        durationHours: 24,
        price: 350.0,
        resellerPrice: 270.0,
        stockCount: 50,
        externalPid: 'DRIP_IOS_1D',
        isActive: true,
      },
      {
        id: 'VAR-DRIP-7D',
        productId: 'PROD-DRIP-03',
        durationLabel: '7 DAYS',
        durationHours: 168,
        price: 1100.0,
        resellerPrice: 850.0,
        stockCount: 50,
        externalPid: 'DRIP_IOS_7D',
        isActive: true,
      },

      // TROLL MODZ FF
      {
        id: 'VAR-TROLL-1H',
        productId: 'PROD-TROLL-04',
        durationLabel: '1 Hours',
        durationHours: 1,
        price: 20.0,
        resellerPrice: 15.0,
        stockCount: 50,
        externalPid: 'TROLL_OB55_1H',
        isActive: true,
      },
      {
        id: 'VAR-TROLL-3H',
        productId: 'PROD-TROLL-04',
        durationLabel: '3 Hours',
        durationHours: 3,
        price: 65.0,
        resellerPrice: 50.0,
        stockCount: 50,
        externalPid: 'TROLL_OB55_3H',
        isActive: true,
      },
      {
        id: 'VAR-TROLL-1D',
        productId: 'PROD-TROLL-04',
        durationLabel: '1 DAYS',
        durationHours: 24,
        price: 280.0,
        resellerPrice: 210.0,
        stockCount: 50,
        externalPid: 'TROLL_OB55_1D',
        isActive: true,
      },

      // CARROM POOL VIP AIM
      {
        id: 'VAR-CARROM-1D',
        productId: 'PROD-CARROM-05',
        durationLabel: '1 DAYS',
        durationHours: 24,
        price: 150.0,
        resellerPrice: 110.0,
        stockCount: 50,
        externalPid: 'CARROM_VIP_1D',
        isActive: true,
      },
      {
        id: 'VAR-CARROM-7D',
        productId: 'PROD-CARROM-05',
        durationLabel: '7 DAYS',
        durationHours: 168,
        price: 450.0,
        resellerPrice: 340.0,
        stockCount: 50,
        externalPid: 'CARROM_VIP_7D',
        isActive: true,
      },
    ];

    // Generate real stocked digital keys for every variant
    const digitalKeys: DigitalKey[] = [];
    for (const v of variants) {
      for (let i = 0; i < 30; i++) {
        digitalKeys.push({
          id: `KEY-${v.id}-${i + 1}-${crypto.randomBytes(2).toString('hex')}`,
          productId: v.productId,
          variantId: v.id,
          keyCode: `NEXA-${v.durationLabel.replace(/\s+/g, '')}-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
          isUsed: false,
          status: 'ACTIVE',
          createdAt: isoNow,
        });
      }
      v.stockCount = 30;
    }

    db.products.push(...products);
    db.productVariants.push(...variants);
    db.digitalKeys.push(...digitalKeys);
    db.markProductsSeeded();
  }
}
