import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { KeyService } from '../services/keyService';
import { WalletService } from '../services/walletService';
import { PaymentGatewayAdapter } from '../services/paymentAdapter';
import { ResellerApiService } from '../services/resellerApi';
import { emailService } from '../services/emailService';
import { hashPassword } from '../db/seed';
import { User, Product, ProductVariant, DigitalKey, Order } from '../models/types';
import { FirestoreSyncService } from '../services/firestoreSync';

export class AdminController {
  public static async getDashboardStats(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Sync latest Firestore & Edge users, orders, and balances in real time
      await FirestoreSyncService.pullAndMergeExternalState(false).catch(() => {});

      const now = new Date();
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);

      const totalUsers = db.users.length;
      const activeUsers = db.users.filter(u => !u.isBanned).length;

      const totalSales = db.orders.reduce((sum, o) => sum + (Number(o.pricePaid) || 0), 0);
      const todaySales = db.orders
        .filter(o => new Date(o.createdAt) >= startOfDay)
        .reduce((sum, o) => sum + (Number(o.pricePaid) || 0), 0);

      const monthlySales = db.orders
        .filter(o => new Date(o.createdAt) >= startOfMonth)
        .reduce((sum, o) => sum + (Number(o.pricePaid) || 0), 0);

      const todayOrders = db.orders.filter(o => new Date(o.createdAt) >= startOfDay).length;

      const totalDeposits = db.deposits
        .filter(d => d.status === 'SUCCESS')
        .reduce((sum, d) => sum + (Number(d.amount) || 0), 0);

      const pendingDeposits = db.deposits.filter(d => d.status === 'PENDING').length;
      const totalOrders = db.orders.length;

      const availableKeys = db.digitalKeys.filter(k => !k.isUsed && k.status === 'ACTIVE').length;

      // Group sales by day for chart (last 7 days)
      const salesChart: Array<{ date: string; sales: number; deposits: number; orders: number }> = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateStr = d.toISOString().split('T')[0];

        const dayOrders = db.orders.filter(o => o.createdAt.startsWith(dateStr));
        const dayDeposits = db.deposits.filter(dep => dep.status === 'SUCCESS' && dep.createdAt.startsWith(dateStr));

        salesChart.push({
          date: dateStr.slice(5), // MM-DD
          sales: dayOrders.reduce((sum, o) => sum + (Number(o.pricePaid) || 0), 0),
          deposits: dayDeposits.reduce((sum, dep) => sum + (Number(dep.amount) || 0), 0),
          orders: dayOrders.length,
        });
      }

      res.json({
        totalUsers,
        activeUsers,
        totalSales,
        todaySales,
        monthlySales,
        todayOrders,
        totalDeposits,
        pendingDeposits,
        totalOrders,
        availableKeys,
        todayRevenue: todaySales,
        salesChart,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch admin stats.' });
    }
  }

  // User Management
  public static async getUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Sync latest Firestore & Edge users in real time
      await FirestoreSyncService.pullAndMergeExternalState(false).catch(() => {});

      const { search } = req.query;
      let users = db.users.map(({ passwordHash: _, ...safeUser }) => {
        const fullUser = db.users.find(u => u.id === safeUser.id);
        const linkedIds = new Set<string>([safeUser.id, safeUser.firebaseUid || ''].filter(Boolean));
        const cleanUserEmail = (safeUser.email || '').toLowerCase().trim();
        const userOrders = db.orders.filter(
          o =>
            linkedIds.has(o.userId) ||
            (cleanUserEmail && o.userEmail && o.userEmail.toLowerCase().trim() === cleanUserEmail)
        );
        const userDeposits = db.deposits.filter(d => linkedIds.has(d.userId) && d.status === 'SUCCESS');
        const userKeys = db.digitalKeys.filter(
          k =>
            (k.assignedUserId && linkedIds.has(k.assignedUserId)) ||
            (cleanUserEmail && k.assignedUserEmail && k.assignedUserEmail.toLowerCase().trim() === cleanUserEmail)
        );
        const totalSpent = userOrders.reduce((sum, o) => sum + (o.pricePaid || 0), 0);
        const totalDeposited = userDeposits.reduce((sum, d) => sum + (d.amount || 0), 0);

        const hasPassword = Boolean(fullUser?.passwordHash);
        const isGoogleUser = !hasPassword && Boolean(fullUser?.id && fullUser.id.length > 20 && !fullUser.id.startsWith('USR-'));
        const authProvider = hasPassword
          ? 'password'
          : isGoogleUser
          ? 'google.com'
          : 'email_otp';

        if (fullUser && !fullUser.apiKey) {
          fullUser.apiKey = `nexa_live_${crypto.randomBytes(16).toString('hex')}`;
          db.save();
        }

        return {
          ...safeUser,
          apiKey: fullUser?.apiKey || safeUser.apiKey,
          hasPassword,
          authProvider,
          providerDisplay: hasPassword ? 'Email & Password' : isGoogleUser ? 'Google Account' : 'Email OTP',
          passwordStatus: hasPassword ? 'Encrypted (SHA-256 / Firebase Standard)' : 'None (OAuth / OTP Only)',
          totalOrdersCount: userOrders.length,
          totalSpent,
          totalDeposited,
          keysCount: userKeys.length,
        };
      });

      if (search && typeof search === 'string') {
        const q = search.toLowerCase();
        users = users.filter(u => u.username.toLowerCase().includes(q) || u.email.toLowerCase().includes(q));
      }

      res.json({ users });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch users.' });
    }
  }

  public static async updateUserRole(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { role } = req.body;

      if (!['USER', 'RESELLER', 'ADMIN', 'SUPER ADMIN'].includes(role)) {
        res.status(400).json({ error: 'Invalid user role specified.' });
        return;
      }

      let target: User | undefined = db.users.find(u => u.id === id || u.firebaseUid === id || (req.body.email && u.email.toLowerCase() === String(req.body.email).toLowerCase()));
      if (!target) {
        target = {
          id,
          firebaseUid: id,
          username: req.body.username || (req.body.email ? String(req.body.email).split('@')[0] : 'user'),
          email: req.body.email || `${id}@user.local`,
          passwordHash: '',
          role,
          balance: 0,
          apiKey: `nexa_live_${crypto.randomBytes(16).toString('hex')}`,
          referralCode: `NX${id.slice(0, 4).toUpperCase()}`,
          twoFactorEnabled: false,
          isBanned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.users.push(target);
      } else {
        target.role = role;
        target.updatedAt = new Date().toISOString();
      }

      db.save();
      FirestoreSyncService.syncUserProfile(target).catch(() => {});

      db.logActivity(req.user?.id, req.user?.username, 'ADMIN_ROLE_CHANGE', `Updated role of ${target.username} to ${role}`);
      res.json({ message: `Role updated to ${role} successfully.`, user: target });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update role.' });
    }
  }

  public static async adjustUserBalance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { amount, reason } = req.body;
      const numAmount = parseFloat(amount);

      if (isNaN(numAmount) || numAmount === 0) {
        res.status(400).json({ error: 'Please specify a valid non-zero adjustment amount.' });
        return;
      }

      const target = db.users.find(u => u.id === id);
      if (!target) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      if (numAmount > 0) {
        WalletService.addFunds(target.id, numAmount, reason || 'Manual Admin Credit Adjustment', undefined, 'ADMIN_ADJUST');
      } else {
        const absVal = Math.abs(numAmount);
        if (target.balance < absVal) {
          res.status(400).json({ error: `Cannot deduct ₹${absVal}. User balance is only ₹${target.balance}.` });
          return;
        }
        target.balance = Math.round((target.balance - absVal) * 100) / 100;
        db.transactions.unshift({
          id: `TXN-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
          userId: target.id,
          type: 'ADMIN_ADJUST',
          amount: -absVal,
          description: reason || 'Manual Admin Debit Adjustment',
          status: 'SUCCESS',
          createdAt: new Date().toISOString(),
        });
        db.save();
      }

      db.logActivity(req.user?.id, req.user?.username, 'ADMIN_BALANCE_ADJUST', `Adjusted balance of ${target.username} by ${numAmount}`);
      res.json({ message: 'Balance adjusted successfully.', currentBalance: target.balance });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to adjust balance.' });
    }
  }

  public static async toggleUserBan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const target = db.users.find(u => u.id === id);
      if (!target) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      target.isBanned = !target.isBanned;
      target.updatedAt = new Date().toISOString();
      db.save();

      db.logActivity(req.user?.id, req.user?.username, 'ADMIN_BAN_TOGGLE', `${target.isBanned ? 'Banned' : 'Unbanned'} ${target.username}`);
      res.json({ message: `User ${target.isBanned ? 'suspended' : 'reactivated'}.`, isBanned: target.isBanned });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to toggle ban status.' });
    }
  }

  public static async deleteUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'User ID is required.' });
        return;
      }
      db.permanentlyDeleteUser(id);
      db.logActivity(req.user?.id, req.user?.username, 'ADMIN_DELETE_USER', `Permanently deleted user: ${id}`);
      res.json({ success: true, message: `User ${id} permanently deleted.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete user.' });
    }
  }

  public static async removeTopActiveUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      if (!id) {
        res.status(400).json({ error: 'User ID is required.' });
        return;
      }
      db.hideUserFromLeaderboard(id);
      db.logActivity(req.user?.id, req.user?.username, 'ADMIN_REMOVE_LEADERBOARD', `Removed user ${id} from Top Active Members`);
      res.json({ success: true, message: `User ${id} removed from Top Active Members.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to remove user from leaderboard.' });
    }
  }

  public static async resetUserPassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { newPassword } = req.body;

      if (!newPassword || typeof newPassword !== 'string' || newPassword.trim().length < 4) {
        res.status(400).json({ error: 'New password must be at least 4 characters long.' });
        return;
      }

      const target = db.users.find(u => u.id === id);
      if (!target) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      const newHash = hashPassword(newPassword.trim());
      target.passwordHash = newHash;
      target.updatedAt = new Date().toISOString();

      const ADMIN_EMAILS = [
        'kalamkalam1234kd@gmail.com',
        'kalam172010@gmail.com',
        'admin@example.com',
      ];
      if (ADMIN_EMAILS.includes(target.email.toLowerCase()) || target.role === 'ADMIN' || target.role === 'SUPER ADMIN') {
        for (const adm of db.users) {
          if (
            ADMIN_EMAILS.includes(adm.email.toLowerCase()) ||
            adm.username.toLowerCase() === 'kalam' ||
            adm.username.toLowerCase() === 'kalam_kalam' ||
            adm.username.toLowerCase() === 'nexa_admin'
          ) {
            adm.passwordHash = newHash;
            adm.updatedAt = target.updatedAt;
          }
        }
      }

      db.saveSync();

      db.logActivity(
        req.user?.id,
        req.user?.username,
        'ADMIN_PASSWORD_RESET',
        `Admin updated password for user @${target.username} (${target.email})`
      );

      res.json({
        success: true,
        message: `Password for @${target.username} successfully updated to: ${newPassword.trim()}`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update user password.' });
    }
  }

  public static async upgradeToReseller(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Please log in to upgrade.' });
        return;
      }

      const dbUser = db.users.find(u => u.id === user.id || (user.email && u.email.toLowerCase() === user.email.toLowerCase()));
      if (!dbUser) {
        res.status(404).json({ error: 'User account not found.' });
        return;
      }

      if (dbUser.role === 'RESELLER' || dbUser.role === 'ADMIN' || dbUser.role === 'SUPER ADMIN') {
        res.json({ message: 'User is already a privileged account.', user: dbUser, newBalance: dbUser.balance });
        return;
      }

      const upgradePrice = Number(db.siteConfig?.resellerUpgradePrice || 299);
      if (dbUser.balance < upgradePrice) {
        res.status(400).json({
          error: `Insufficient balance. Required: ₹${upgradePrice.toFixed(2)}, Available: ₹${dbUser.balance.toFixed(2)}. Please add funds.`,
        });
        return;
      }

      dbUser.balance = Number((dbUser.balance - upgradePrice).toFixed(2));
      dbUser.role = 'RESELLER';
      if (!dbUser.apiKey) {
        dbUser.apiKey = `nexa_live_${crypto.randomBytes(16).toString('hex')}`;
      }
      dbUser.updatedAt = new Date().toISOString();

      db.transactions.unshift({
        id: `TXN-UPGRADE-${Date.now()}`,
        userId: dbUser.id,
        userEmail: dbUser.email,
        apiKey: dbUser.apiKey,
        type: 'PURCHASE',
        amount: -upgradePrice,
        description: 'Upgraded account to Wholesale Reseller Tier',
        status: 'SUCCESS',
        createdAt: new Date().toISOString(),
      });

      db.saveSync();
      FirestoreSyncService.syncUserProfile(dbUser).catch(() => {});

      db.logActivity(dbUser.id, dbUser.username, 'RESELLER_UPGRADE', `Upgraded to Reseller. Balance deducted: ₹${upgradePrice}`);

      res.json({
        success: true,
        message: 'Successfully upgraded to Wholesale Reseller tier!',
        newBalance: dbUser.balance,
        user: dbUser,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to upgrade to reseller tier.' });
    }
  }

  // Product & Variant Management
  public static async createProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        id: requestedId,
        name,
        game,
        description,
        category,
        badge,
        imageUrl,
        features,
        deviceType,
        updateFileUrl,
        videoUrl,
        externalPid,
        isUnderMaintenance,
        maintenanceNotice,
        initialDurations,
        variants: requestedVariants,
      } = req.body;

      if (!name) {
        res.status(400).json({ error: 'Product name is required.' });
        return;
      }

      const finalGame = (game || category || 'FREEFIRE').trim();
      const prodId =
        typeof requestedId === 'string' && requestedId.trim()
          ? requestedId.trim()
          : `PROD-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 89)}`;

      const newProduct: Product = {
        id: prodId,
        name: name.trim(),
        game: finalGame,
        description: description?.trim() || '',
        category: category?.trim() || 'FREEFIRE',
        badge: badge?.trim() || undefined,
        imageUrl: imageUrl?.trim() || undefined,
        features: Array.isArray(features) ? features : undefined,
        deviceType: deviceType?.trim() || undefined,
        updateFileUrl: updateFileUrl?.trim() || undefined,
        videoUrl: videoUrl?.trim() || undefined,
        externalPid: externalPid?.trim() || undefined,
        isActive: true,
        isUnderMaintenance: Boolean(isUnderMaintenance),
        maintenanceNotice: maintenanceNotice?.trim() || undefined,
        createdAt: new Date().toISOString(),
      };

      db.addProduct(newProduct);

      const initialVariants: ProductVariant[] = [];
      const cleanPid = newProduct.externalPid || undefined;
      const sourceDurations = Array.isArray(requestedVariants)
        ? requestedVariants
        : Array.isArray(initialDurations)
        ? initialDurations
        : [
            { label: '1 Day', hours: 24, price: 50, resellerPrice: 38, extDur: '1 DAYS' },
            { label: '3 Days', hours: 72, price: 120, resellerPrice: 90, extDur: '3 DAYS' },
            { label: '7 Days', hours: 168, price: 250, resellerPrice: 190, extDur: '7 DAYS' },
            { label: '30 Days', hours: 720, price: 600, resellerPrice: 450, extDur: '30 DAYS' },
          ];

      for (let idx = 0; idx < sourceDurations.length; idx++) {
        const d = sourceDurations[idx];
        const labelStr = String(d.label || d.durationLabel || '1 Day').trim();
        const hoursNum = Number(d.hours || d.durationHours) || 24;
        const priceNum = Number(d.price) || 50;
        const resellerPriceNum = Number(d.resellerPrice) || priceNum;
        const varPid = d.externalPid?.trim() || cleanPid;
        const extDur = String(d.extDur || d.externalDuration || labelStr).trim();
        const varId =
          typeof d.id === 'string' && d.id.trim()
            ? d.id.trim()
            : `VAR-${Date.now().toString().slice(-5)}-${idx}-${Math.floor(10 + Math.random() * 89)}`;

        const variant: ProductVariant = {
          id: varId,
          productId: newProduct.id,
          durationLabel: labelStr,
          durationHours: hoursNum,
          price: priceNum,
          resellerPrice: resellerPriceNum,
          stockCount: varPid ? 999 : 15,
          externalPid: varPid,
          externalDuration: extDur,
          isActive: true,
        };
        db.addVariant(variant);

        const existingKeysForVar = db.digitalKeys.filter(k => k.variantId === variant.id && !k.isUsed).length;
        if (!varPid && existingKeysForVar === 0) {
          KeyService.generateKeys(newProduct.id, variant.id, 15, 'KALAM');
          variant.stockCount = 15;
        }

        initialVariants.push(variant);
      }

      db.saveSync();
      FirestoreSyncService.syncProduct(newProduct, initialVariants).catch(() => {});

      db.logActivity(
        req.user?.id,
        req.user?.username,
        'PRODUCT_CREATE',
        `Created product ${newProduct.name} (${newProduct.id}) with ${initialVariants.length} duration tiers`
      );

      const responseProduct = {
        ...newProduct,
        variants: initialVariants,
      };

      res.status(201).json({ message: 'Product created successfully with standard durations.', product: responseProduct });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create product.' });
    }
  }

  public static async updateProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      let product = db.products.find(p => p.id === id);

      const {
        name,
        game,
        description,
        category,
        badge,
        imageUrl,
        features,
        deviceType,
        updateFileUrl,
        videoUrl,
        externalPid,
        isActive,
        isUnderMaintenance,
        maintenanceNotice,
      } = req.body;

      if (!product) {
        product = {
          id,
          name: (name || 'Gaming Panel').trim(),
          game: (game || category || 'FREEFIRE').trim(),
          description: description?.trim() || '',
          category: (category || 'FREEFIRE').trim(),
          badge: badge?.trim() || undefined,
          imageUrl: imageUrl?.trim() || undefined,
          features: Array.isArray(features) ? features : undefined,
          deviceType: deviceType?.trim() || 'NONROOT',
          updateFileUrl: updateFileUrl?.trim() || undefined,
          videoUrl: videoUrl?.trim() || undefined,
          externalPid: externalPid?.trim() || undefined,
          isActive: typeof isActive === 'boolean' ? isActive : true,
          isUnderMaintenance: Boolean(isUnderMaintenance),
          maintenanceNotice: maintenanceNotice?.trim() || undefined,
          createdAt: new Date().toISOString(),
        };
        db.addProduct(product);
      } else {
        if (name) product.name = name.trim();
        if (game) product.game = game.trim();
        else if (category) product.game = category.trim();
        if (description !== undefined) product.description = description.trim();
        if (category) product.category = category.trim();
        if (badge !== undefined) product.badge = badge.trim() || undefined;
        if (imageUrl !== undefined) product.imageUrl = imageUrl.trim() || undefined;
        if (features !== undefined) product.features = Array.isArray(features) ? features : undefined;
        if (deviceType !== undefined) product.deviceType = deviceType.trim() || undefined;
        if (updateFileUrl !== undefined) product.updateFileUrl = updateFileUrl.trim() || undefined;
        if (videoUrl !== undefined) product.videoUrl = videoUrl.trim() || undefined;
        if (externalPid !== undefined) product.externalPid = externalPid.trim() || undefined;
        if (typeof isActive === 'boolean') product.isActive = isActive;
        if (typeof isUnderMaintenance === 'boolean') product.isUnderMaintenance = isUnderMaintenance;
        if (maintenanceNotice !== undefined) product.maintenanceNotice = maintenanceNotice.trim() || undefined;
      }

      db.saveSync();
      const variants = db.productVariants.filter(v => v.productId === product!.id && v.isActive);
      FirestoreSyncService.syncProduct(product, variants).catch(() => {});
      res.json({ message: 'Product updated successfully.', product: { ...product, variants } });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update product.' });
    }
  }

  public static async updateProductPid(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { externalPid } = req.body;
      const product = db.products.find(p => p.id === id);
      if (!product) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }
      product.externalPid = String(externalPid || '').trim();
      db.saveSync();
      const variants = db.productVariants.filter(v => v.productId === product.id && v.isActive);
      FirestoreSyncService.syncProduct(product, variants).catch(() => {});
      res.json({ message: 'Product PID updated successfully.', product: { ...product, variants } });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update product PID.' });
    }
  }

  public static async autoAssignPids(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const defaultNumbers = ['155', '66', '150', '123', '99', '110', '120', '130', '140', '160', '170', '180', '190'];
      let idx = 0;
      for (const p of db.products) {
        if (!p.externalPid || !/^\d{2,3}$/.test(p.externalPid.trim())) {
          while (idx < defaultNumbers.length && db.products.some(prod => prod.externalPid === defaultNumbers[idx])) {
            idx++;
          }
          if (idx < defaultNumbers.length) {
            p.externalPid = defaultNumbers[idx];
            idx++;
          } else {
            p.externalPid = String(100 + db.products.indexOf(p));
          }
        }
      }
      db.saveSync();
      for (const p of db.products) {
        FirestoreSyncService.syncProduct(p).catch(() => {});
      }
      const productsWithVariants = db.products.map(p => ({
        ...p,
        variants: db.productVariants.filter(v => v.productId === p.id && v.isActive),
      }));
      res.json({ message: 'Numeric 2/3-digit PIDs successfully assigned to all products.', products: productsWithVariants });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to auto-assign PIDs.' });
    }
  }

  public static async toggleProductMaintenance(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const product = db.products.find(p => p.id === id);
      if (!product) {
        res.status(404).json({ error: 'Product not found.' });
        return;
      }

      const { isUnderMaintenance, maintenanceNotice } = req.body;
      if (typeof isUnderMaintenance === 'boolean') {
        product.isUnderMaintenance = isUnderMaintenance;
      } else {
        product.isUnderMaintenance = !product.isUnderMaintenance;
      }

      if (maintenanceNotice !== undefined) {
        product.maintenanceNotice = maintenanceNotice.trim() || undefined;
      }

      db.saveSync();
      const variants = db.productVariants.filter(v => v.productId === product.id && v.isActive);
      FirestoreSyncService.syncProduct(product, variants).catch(() => {});
      res.json({
        message: `Product ${product.name} is now ${product.isUnderMaintenance ? 'Under Maintenance' : 'Active'}.`,
        product: { ...product, variants },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to toggle product maintenance.' });
    }
  }

  public static async deleteProduct(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const targetProduct = db.products.find(p => p.id === id);
      const productName = targetProduct?.name || id;

      db.permanentlyDeleteProduct(id);
      FirestoreSyncService.deleteProductSync(id).catch(() => {});

      db.logActivity(
        req.user?.id,
        req.user?.username,
        'PRODUCT_DELETE',
        `Permanently deleted product ${productName} (${id}) and its variants`
      );

      res.json({ message: `Product ${productName} deleted permanently.` });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete product.' });
    }
  }

  // Variant Management (Independent duration options)
  public static async createVariant(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { productId, durationLabel, durationHours, price, resellerPrice, externalPid, externalDuration } = req.body;
      if (!durationLabel || price === undefined) {
        res.status(400).json({ error: 'Duration label and price are required.' });
        return;
      }

      let product: Product | undefined = productId ? db.products.find(p => p.id === productId) : undefined;
      if (!product && req.body.product && req.body.product.id) {
        product = req.body.product as Product;
        db.addProduct(product);
      } else if (!product && productId) {
        // Ensure product exists in database so variants are never orphaned
        product = {
          id: productId,
          name: req.body.productName || 'VIP Gaming Panel',
          game: 'FREEFIRE',
          category: 'FREEFIRE',
          description: '',
          deviceType: 'NONROOT',
          isActive: true,
          createdAt: new Date().toISOString(),
        };
        db.addProduct(product);
      } else if (!product) {
        product = db.products[0];
      }

      const resolvedProductId = productId || (product ? product.id : `PROD-${Date.now()}`);
      const effectivePid = externalPid?.trim() || product?.externalPid?.trim() || undefined;

      const newVariant: ProductVariant = {
        id: `VAR-${Date.now().toString().slice(-6)}-${Math.floor(100 + Math.random() * 900)}`,
        productId: resolvedProductId,
        durationLabel: durationLabel.trim(),
        durationHours: Number(durationHours) || 24,
        price: Number(price),
        resellerPrice: Number(resellerPrice) || Math.round(Number(price) * 0.75),
        stockCount: effectivePid ? 999 : 15,
        externalPid: effectivePid,
        externalDuration: externalDuration?.trim() || durationLabel.trim(),
        isActive: true,
      };

      db.productVariants.push(newVariant);
      if (!effectivePid) {
        KeyService.generateKeys(resolvedProductId, newVariant.id, 15, 'KALAM');
        newVariant.stockCount = 15;
      }
      db.saveSync();
      FirestoreSyncService.syncVariant(newVariant).catch(() => {});

      res.status(201).json({ message: 'Duration variant created successfully.', variant: newVariant });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to create variant.' });
    }
  }

  public static async updateVariant(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const variant = db.productVariants.find(v => v.id === id);
      if (!variant) {
        res.status(404).json({ error: 'Variant not found.' });
        return;
      }

      const { durationLabel, durationHours, price, resellerPrice, externalPid, externalDuration, isActive } = req.body;
      if (durationLabel) variant.durationLabel = durationLabel.trim();
      if (durationHours !== undefined) variant.durationHours = Number(durationHours);
      if (price !== undefined) variant.price = Number(price);
      if (resellerPrice !== undefined) variant.resellerPrice = Number(resellerPrice);
      if (externalPid !== undefined) variant.externalPid = externalPid.trim() || undefined;
      if (externalDuration !== undefined) variant.externalDuration = externalDuration.trim() || undefined;
      if (typeof isActive === 'boolean') variant.isActive = isActive;

      db.saveSync();
      FirestoreSyncService.syncVariant(variant).catch(() => {});
      res.json({ message: 'Duration variant updated successfully.', variant });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update variant.' });
    }
  }

  public static async deleteVariant(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const index = db.productVariants.findIndex(v => v.id === id);
      if (index === -1) {
        res.status(404).json({ error: 'Variant not found.' });
        return;
      }
      db.productVariants.splice(index, 1);
      db.saveSync();
      FirestoreSyncService.deleteVariantSync(id).catch(() => {});
      res.json({ message: 'Duration variant removed successfully.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to remove variant.' });
    }
  }

  // Key Management & Bulk Import
  public static async getAllKeys(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await FirestoreSyncService.pullAndMergeExternalState(false).catch(() => {});
      const { variantId, productId, status } = req.query;

      let keys = db.digitalKeys.map(k => {
        const prod = db.products.find(p => p.id === k.productId);
        const variant = db.productVariants.find(v => v.id === k.variantId);
        const assignedUser = k.assignedUserId
          ? db.users.find(
              u =>
                u.id === k.assignedUserId ||
                u.firebaseUid === k.assignedUserId ||
                (k.assignedUserEmail && u.email.toLowerCase() === k.assignedUserEmail.toLowerCase())
            )
          : null;

        const order = db.orders.find(o => o.id === k.assignedOrderId || o.deliveredKeyId === k.id);
        const isApi =
          k.purchaseSource === 'API' ||
          order?.purchaseSource === 'API' ||
          String(k.assignedOrderId || '').startsWith('API-ORD-');

        return {
          ...k,
          productName: k.productName || prod?.name || 'Unknown',
          durationLabel: k.durationLabel || variant?.durationLabel || 'Unknown',
          assignedUsername: assignedUser?.username || (k.assignedUserEmail ? k.assignedUserEmail.split('@')[0] : undefined),
          purchaseSource: k.isUsed || k.assignedUserId ? (isApi ? ('API' as const) : ('WEB' as const)) : k.purchaseSource,
          purchaseSourceLabel:
            k.isUsed || k.assignedUserId
              ? isApi
                ? 'Buy from API'
                : 'Buy from Website'
              : k.purchaseSourceLabel,
        };
      });

      if (variantId) keys = keys.filter(k => k.variantId === variantId);
      if (productId) keys = keys.filter(k => k.productId === productId);
      if (status && status !== 'ALL') keys = keys.filter(k => k.status === status);

      keys.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json({ keys });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch keys.' });
    }
  }

  public static async generateKeys(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { productId, variantId, count, prefix } = req.body;
      if (!productId || !variantId || !count) {
        res.status(400).json({ error: 'Product ID, variant ID, and count are required.' });
        return;
      }

      const generated = KeyService.generateKeys(productId, variantId, Number(count), prefix || 'NEXA');
      res.status(201).json({ message: `Successfully generated ${generated.length} keys.`, keys: generated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to generate keys.' });
    }
  }

  public static async bulkImportKeys(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { productId, variantId, rawKeys } = req.body;
      if (!productId || !variantId || !rawKeys) {
        res.status(400).json({ error: 'Product ID, variant ID, and key list text are required.' });
        return;
      }

      const result = KeyService.importBulkKeys(productId, variantId, rawKeys);
      res.status(201).json({
        message: `Successfully imported ${result.importedCount} keys into inventory.`,
        importedCount: result.importedCount,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to bulk import keys.' });
    }
  }

  public static async deleteKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const index = db.digitalKeys.findIndex(k => k.id === id);
      if (index === -1) {
        res.status(404).json({ error: 'Key not found.' });
        return;
      }

      const variantId = db.digitalKeys[index].variantId;
      db.digitalKeys.splice(index, 1);
      KeyService.syncVariantStock(variantId);
      db.save();

      res.json({ message: 'Key removed from database.' });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to delete key.' });
    }
  }

  // Deposits & Orders Management
  public static async getDeposits(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await FirestoreSyncService.pullAndMergeExternalState(false).catch(() => {});
      const deposits = db.deposits.map(d => {
        const user = db.users.find(u => u.id === d.userId || u.firebaseUid === d.userId);
        return {
          ...d,
          username: user?.username || 'Unknown',
        };
      });
      deposits.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json({ deposits });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch deposits.' });
    }
  }

  public static async approveDeposit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const { utr } = req.body;
      const completed = PaymentGatewayAdapter.completeDeposit(id, utr || `MANUAL-${Date.now()}`, true);

      res.json({ message: 'Deposit approved and wallet credited successfully.', deposit: completed });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to approve deposit.' });
    }
  }

  public static async getOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await FirestoreSyncService.pullAndMergeExternalState(false).catch(() => {});
      const orders = db.orders.map(o => {
        const user = db.users.find(
          u =>
            u.id === o.userId ||
            u.firebaseUid === o.userId ||
            (o.userEmail && u.email.toLowerCase() === o.userEmail.toLowerCase())
        );
        const isApi = o.purchaseSource === 'API' || String(o.id || '').startsWith('API-ORD-');
        return {
          ...o,
          username: user?.username || (o.userEmail ? o.userEmail.split('@')[0] : 'Unknown'),
          purchaseSource: isApi ? ('API' as const) : ('WEB' as const),
          purchaseSourceLabel: isApi ? 'Buy from API' : 'Buy from Website',
        };
      });
      orders.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      res.json({ orders });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch orders.' });
    }
  }

  // Payment Gateway Settings
  public static async getGatewaySettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const resolved = PaymentGatewayAdapter.resolveCredentials();
      if (resolved.apiKey && resolved.apiKey !== db.gatewayConfig.apiKey) {
        db.gatewayConfig.apiKey = resolved.apiKey;
        db.saveSync();
      }
      res.json({ config: db.gatewayConfig });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch settings.' });
    }
  }

  public static async updateGatewaySettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const {
        gatewayName,
        gatewayType,
        apiUrl,
        qrAliasUrl,
        statusUrl,
        merchantId,
        apiKey,
        masterKey,
        webhookUrl,
        redirectUrl,
        successUrl,
        cancelUrl,
        paymentExpiryMinutes,
        minDeposit,
        upiVpa,
        upiMerchantName,
        testMode,
      } = req.body;

      if (gatewayName) db.gatewayConfig.gatewayName = gatewayName.trim();
      if (gatewayType) db.gatewayConfig.gatewayType = gatewayType;
      if (apiUrl) db.gatewayConfig.apiUrl = apiUrl.trim();
      if (qrAliasUrl) db.gatewayConfig.qrAliasUrl = qrAliasUrl.trim();
      if (statusUrl) db.gatewayConfig.statusUrl = statusUrl.trim();
      if (merchantId) db.gatewayConfig.merchantId = merchantId.trim();
      if (apiKey && !apiKey.includes('...')) db.gatewayConfig.apiKey = apiKey.trim();
      if (masterKey && !masterKey.includes('...')) db.gatewayConfig.masterKey = masterKey.trim();
      if (webhookUrl) db.gatewayConfig.webhookUrl = webhookUrl.trim();
      if (redirectUrl) db.gatewayConfig.redirectUrl = redirectUrl.trim();
      if (successUrl) db.gatewayConfig.successUrl = successUrl.trim();
      if (cancelUrl) db.gatewayConfig.cancelUrl = cancelUrl.trim();
      if (paymentExpiryMinutes) db.gatewayConfig.paymentExpiryMinutes = Number(paymentExpiryMinutes);
      if (minDeposit) db.gatewayConfig.minDeposit = Number(minDeposit);
      if (upiVpa) db.gatewayConfig.upiVpa = upiVpa.trim();
      if (upiMerchantName) db.gatewayConfig.upiMerchantName = upiMerchantName.trim();
      if (typeof testMode === 'boolean') db.gatewayConfig.testMode = testMode;

      // Auto-resolve matching API key when switching between FamGateway Primary and Render Secondary
      const resolved = PaymentGatewayAdapter.resolveCredentials(db.gatewayConfig);
      db.gatewayConfig.apiKey = resolved.apiKey;
      db.gatewayConfig.apiUrl = resolved.postUrl;
      db.gatewayConfig.qrAliasUrl = resolved.getUrl;

      db.saveSync();
      res.json({ message: 'Payment gateway switched and activated live.', config: db.gatewayConfig });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update gateway settings.' });
    }
  }

  public static async testGatewayConnection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const configOverride = req.body?.configOverride;
      const result = await PaymentGatewayAdapter.testGatewayCall({
        amount: 10,
        customerName: 'Kalam Health Ping',
        customerEmail: 'admin@nexapanel.com',
        note: 'Gateway Health Ping',
        method: 'POST',
        configOverride,
      });

      const activeName = configOverride?.gatewayName || db.gatewayConfig.gatewayName || 'FamGateway';
      res.json({
        success: result.success,
        latencyMs: result.latencyMs,
        gateway: activeName,
        status: result.success ? 'ONLINE' : 'OFFLINE',
        orderId: result.orderData?.order_id,
        message: result.success
          ? `${activeName} is ONLINE & READY (${result.latencyMs}ms). Live Order ${result.orderData?.order_id || 'OK'} created.`
          : `${activeName} returned status ${result.status}: ${result.rawResponse.slice(0, 120)}`,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Connection test failed.' });
    }
  }

  public static async testFamGatewayOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { amount, customerName, customerEmail, note, method, configOverride } = req.body;
      const numAmount = parseFloat(amount) || 100.00;

      const result = await PaymentGatewayAdapter.testGatewayCall({
        amount: numAmount,
        customerName: customerName || 'Ramesh Kumar',
        customerEmail: customerEmail || 'ramesh@example.com',
        note: note || `Payment for Order #${Date.now().toString().slice(-4)}`,
        method: method === 'GET' ? 'GET' : 'POST',
        configOverride,
      });

      res.json(result);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Payment gateway test order failed.' });
    }
  }

  // Reseller API Settings
  public static async getResellerSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const config = { ...db.resellerConfig };
      res.json({ config });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch reseller settings.' });
    }
  }

  public static async updateResellerSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { apiUrl, apiKey, masterKey, timeoutMs, retryAttempts, autoSyncStock, isLiveApiEnabled, defaultAndroidId } = req.body;
      if (apiUrl !== undefined) db.resellerConfig.apiUrl = String(apiUrl).trim();
      if (apiKey !== undefined && !String(apiKey).includes('...')) db.resellerConfig.apiKey = String(apiKey).trim();
      if (masterKey !== undefined && !String(masterKey).includes('...')) db.resellerConfig.masterKey = String(masterKey).trim();
      if (timeoutMs !== undefined) db.resellerConfig.timeoutMs = Number(timeoutMs) || 20000;
      if (retryAttempts !== undefined) db.resellerConfig.retryAttempts = Number(retryAttempts) || 2;
      if (typeof autoSyncStock === 'boolean') db.resellerConfig.autoSyncStock = autoSyncStock;
      if (typeof isLiveApiEnabled === 'boolean') db.resellerConfig.isLiveApiEnabled = isLiveApiEnabled;
      if (defaultAndroidId !== undefined) db.resellerConfig.defaultAndroidId = String(defaultAndroidId).trim();

      db.saveSync();
      res.json({ message: 'Reseller API settings saved successfully.', config: db.resellerConfig });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update reseller settings.' });
    }
  }

  public static async testResellerConnection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const configOverride = req.body?.configOverride;
      const test = await ResellerApiService.testConnection(configOverride);
      res.json(test);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Test failed.' });
    }
  }

  public static async testBuyKeyGeneration(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Please log in to purchase or generate keys.' });
        return;
      }

      const pid = String(req.body.productId || req.body.product_id || req.body.externalPid || '').trim();
      const dur = String(req.body.duration || req.body.durationLabel || '').trim();
      const androidId = req.body.androidId || req.body.android_id;
      const configOverride = req.body.configOverride;

      if (!pid || !dur) {
        res.status(400).json({ error: 'Product PID and Duration are required for key generation.' });
        return;
      }

      // Resolve product and variant price
      const cleanDuration = dur.toLowerCase();
      const candidateProducts = db.products.filter(
        p => String(p.externalPid).trim() === pid || String(p.id).trim().toLowerCase() === pid.toLowerCase()
      );
      let matchedProd = candidateProducts[0];
      let matchedVar: ProductVariant | undefined = undefined;

      for (const cand of candidateProducts) {
        const vars = db.productVariants.filter(v => v.productId === cand.id && v.isActive);
        const exact =
          vars.find(
            v =>
              v.durationLabel.trim().toLowerCase() === cleanDuration ||
              v.externalDuration?.trim().toLowerCase() === cleanDuration
          ) ||
          vars.find(
            v =>
              v.durationLabel.toLowerCase().includes(cleanDuration) ||
              cleanDuration.includes(v.durationLabel.toLowerCase())
          );
        if (exact) {
          matchedProd = cand;
          matchedVar = exact;
          break;
        }
      }

      if (!matchedProd) {
        matchedProd = db.products[0];
      }
      if (!matchedVar && matchedProd) {
        const vars = db.productVariants.filter(v => v.productId === matchedProd.id && v.isActive);
        matchedVar = vars[0];
      }

      const unitPrice = Math.max(1, Number(matchedVar?.price || matchedVar?.resellerPrice || 50));
      const orderId = `ORD-EXT-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      // Enforce wallet balance check and atomic deduction
      const verification = await WalletService.verifyAndDeductApiKeyPurchase(
        user.id,
        unitPrice,
        `[This Key Buyed by API] API Purchase: ${matchedProd ? matchedProd.name : `Product PID ${pid}`} (${dur})`,
        orderId
      );

      if (!verification.success) {
        res.status(400).json({
          success: false,
          error: verification.error,
          message: verification.error,
          required_amount: unitPrice,
          current_balance: verification.currentBalance,
        });
        return;
      }

      const dbUser = verification.user || user;
      const result = await ResellerApiService.testBuyKeyGeneration({
        productId: pid,
        duration: dur,
        androidId,
        configOverride,
      });

      const keyCode =
        (result as any).keyCode ||
        `KALAM-API-${pid}-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;

      const now = new Date();
      const expiryDate = new Date(now.getTime() + (matchedVar?.durationHours || 24) * 3600 * 1000);
      const newKey: DigitalKey = {
        id: `KEY-EXT-${Date.now()}-${crypto.randomBytes(2).toString('hex')}`,
        productId: matchedProd ? matchedProd.id : 'PROD-API',
        variantId: matchedVar ? matchedVar.id : 'VAR-API',
        productName: matchedProd ? matchedProd.name : `Product PID ${pid}`,
        gameName: matchedProd?.game || 'FREEFIRE',
        durationLabel: matchedVar?.durationLabel || dur,
        keyCode,
        isUsed: false,
        assignedUserId: dbUser.id,
        assignedUserEmail: dbUser.email.toLowerCase(),
        assignedApiKey: dbUser.apiKey,
        assignedOrderId: orderId,
        assignedAt: now.toISOString(),
        expiresAt: expiryDate.toISOString(),
        status: 'ACTIVE',
        purchaseSource: 'API',
        purchaseSourceLabel: 'Buy from API',
        createdAt: now.toISOString(),
      };
      db.digitalKeys.unshift(newKey);

      const newOrder: Order = {
        id: orderId,
        userId: dbUser.id,
        userEmail: dbUser.email.toLowerCase(),
        apiKey: dbUser.apiKey,
        productId: matchedProd ? matchedProd.id : 'PROD-API',
        variantId: matchedVar ? matchedVar.id : 'VAR-API',
        productName: matchedProd ? matchedProd.name : `Product PID ${pid}`,
        durationLabel: matchedVar?.durationLabel || dur,
        pricePaid: unitPrice,
        deliveredKeyId: newKey.id,
        deliveredKeyCode: keyCode,
        status: 'COMPLETED',
        purchaseSource: 'API',
        purchaseSourceLabel: 'Buy from API',
        createdAt: now.toISOString(),
      };
      db.orders.unshift(newOrder);
      db.saveSync();

      const txRecord = verification.transaction || {
        id: `TXN-${Date.now()}`,
        userId: dbUser.id,
        userEmail: dbUser.email.toLowerCase(),
        apiKey: dbUser.apiKey,
        type: 'PURCHASE' as const,
        amount: -unitPrice,
        description: `[This Key Buyed by API] API Purchase: ${newOrder.productName} (${dur})`,
        referenceId: orderId,
        status: 'SUCCESS' as const,
        purchaseSource: 'API' as const,
        purchaseSourceLabel: 'Buy from API',
        createdAt: now.toISOString(),
      };

      await FirestoreSyncService.commitAtomicKeyPurchase({
        userId: dbUser.id,
        newBalance: verification.remainingBalance,
        keyObjects: [newKey],
        order: newOrder,
        transaction: txRecord,
      }).catch(() => {});

      res.json({
        ...result,
        success: true,
        keyCode,
        key: keyCode,
        keys: [keyCode],
        wallet_deducted: unitPrice,
        remaining_balance: verification.remainingBalance,
        purchaseSource: 'API',
        purchaseSourceLabel: 'This Key Buyed by API',
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Test buy generation failed.' });
    }
  }

  // Site Customization & Branding Engine
  public static async getSiteSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.json({ config: db.siteConfig });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch site settings.' });
    }
  }

  public static async updateSiteSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const updated = db.updateSiteConfig(req.body);
      db.logActivity(
        req.user?.id,
        req.user?.username,
        'SITE_CUSTOMIZATION_UPDATE',
        `Admin updated website branding & theme settings: ${req.body.siteTitle || 'General'}`
      );
      res.json({ message: 'Site customization settings updated successfully.', config: updated });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update site settings.' });
    }
  }

  public static async getActivityLogs(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      res.json({ logs: db.activityLogs });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch logs.' });
    }
  }

  // --- Email & IMAP/SMTP Setup ---
  public static async getEmailSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await FirestoreSyncService.pullEmailConfig().catch(() => {});
      const config = { ...db.emailConfig };
      res.json({
        config: {
          ...config,
          smtpPass: config.smtpPass || '',
          imapPass: config.imapPass || '',
          hasSmtpPass: Boolean(config.smtpPass && config.smtpPass.length > 0),
          hasImapPass: Boolean(config.imapPass && config.imapPass.length > 0),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch email settings.' });
    }
  }

  public static async updateEmailSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const body = req.body;
      const current = db.emailConfig;

      const updatedData: any = {
        ...body,
      };

      // Clean and normalize sender email, and always keep smtpUser / imapUser synchronized unless explicitly given a different custom login
      if (body.senderEmail !== undefined) {
        updatedData.senderEmail = String(body.senderEmail).trim();
        const prevSender = (current.senderEmail || 'kalamkalam1234kd@gmail.com').trim().toLowerCase();
        const rawSmtpUser = String(body.smtpUser || '').trim();
        const rawImapUser = String(body.imapUser || '').trim();

        if (!rawSmtpUser || rawSmtpUser.toLowerCase() === prevSender || rawSmtpUser.toLowerCase() === 'kalamkalam1234kd@gmail.com') {
          updatedData.smtpUser = updatedData.senderEmail;
        }
        if (!rawImapUser || rawImapUser.toLowerCase() === prevSender || rawImapUser.toLowerCase() === 'kalamkalam1234kd@gmail.com') {
          updatedData.imapUser = updatedData.senderEmail;
        }

        // Auto-sync SMTP/IMAP hosts if senderEmail domain changed and host was still on previous provider default
        const domain = updatedData.senderEmail.includes('@') ? updatedData.senderEmail.split('@')[1].toLowerCase() : '';
        if (domain) {
          if (domain === 'gmail.com' || domain === 'googlemail.com') {
            if (!body.smtpHost || body.smtpHost.includes('yourdomain')) {
              updatedData.smtpHost = 'smtp.gmail.com';
              updatedData.imapHost = 'imap.gmail.com';
            }
          } else if (body.smtpHost === 'smtp.gmail.com') {
            if (domain === 'outlook.com' || domain === 'hotmail.com' || domain === 'live.com') {
              updatedData.smtpHost = 'smtp-mail.outlook.com';
              updatedData.smtpPort = 587;
              updatedData.secure = false;
              updatedData.imapHost = 'outlook.office365.com';
            } else if (domain === 'yahoo.com' || domain === 'ymail.com') {
              updatedData.smtpHost = 'smtp.mail.yahoo.com';
              updatedData.smtpPort = 465;
              updatedData.secure = true;
              updatedData.imapHost = 'imap.mail.yahoo.com';
            } else if (domain.includes('zoho')) {
              updatedData.smtpHost = 'smtp.zoho.com';
              updatedData.smtpPort = 465;
              updatedData.secure = true;
              updatedData.imapHost = 'imap.zoho.com';
            } else if (domain === 'icloud.com' || domain === 'me.com') {
              updatedData.smtpHost = 'smtp.mail.me.com';
              updatedData.smtpPort = 587;
              updatedData.secure = false;
              updatedData.imapHost = 'imap.mail.me.com';
            } else {
              updatedData.smtpHost = `mail.${domain}`;
              updatedData.imapHost = `mail.${domain}`;
            }
          }
        }
      }

      // Update password if user passed a new unmasked password
      if (body.smtpPass === undefined || String(body.smtpPass).includes('••••')) {
        delete updatedData.smtpPass;
      } else {
        const raw = String(body.smtpPass).trim();
        updatedData.smtpPass = raw.replace(/^["']+|["']+$/g, '').trim();
      }

      if (body.imapPass === undefined || String(body.imapPass).includes('••••')) {
        delete updatedData.imapPass;
      } else {
        const raw = String(body.imapPass).trim();
        updatedData.imapPass = raw.replace(/^["']+|["']+$/g, '').trim();
      }

      const isSmtpNew = Boolean(updatedData.smtpPass && !updatedData.smtpPass.includes('••••'));
      const isImapNew = Boolean(updatedData.imapPass && !updatedData.imapPass.includes('••••'));

      // If user entered a new password in SMTP, also update IMAP password
      if (isSmtpNew && !isImapNew) {
        updatedData.imapPass = updatedData.smtpPass;
      } else if (isImapNew && !isSmtpNew) {
        updatedData.smtpPass = updatedData.imapPass;
      }

      if (isSmtpNew || isImapNew) {
        const activeNewPass = updatedData.imapPass || updatedData.smtpPass || '';
        if (activeNewPass && activeNewPass !== 'testpass1234') {
          updatedData.simulationMode = false;
        }
      }

      if (body.smtpPort) {
        updatedData.smtpPort = Number(body.smtpPort);
        // Prevent TLS version mismatch: port 587 uses STARTTLS (secure: false), port 465 uses implicit SSL (secure: true)
        if (updatedData.smtpPort === 587 || updatedData.smtpPort === 25 || updatedData.smtpPort === 2525) {
          updatedData.secure = false;
        } else if (updatedData.smtpPort === 465) {
          updatedData.secure = true;
        }
      }
      if (body.imapPort) updatedData.imapPort = Number(body.imapPort);
      if (body.otpExpiryMinutes) updatedData.otpExpiryMinutes = Number(body.otpExpiryMinutes);

      // Custom OTP email message templates
      if (body.otpSubject !== undefined) updatedData.otpSubject = String(body.otpSubject);
      if (body.otpHeader !== undefined) updatedData.otpHeader = String(body.otpHeader);
      if (body.otpMessageBody !== undefined) updatedData.otpMessageBody = String(body.otpMessageBody);
      if (body.otpSecurityNotice !== undefined) updatedData.otpSecurityNotice = String(body.otpSecurityNotice);
      if (body.otpFooterText !== undefined) updatedData.otpFooterText = String(body.otpFooterText);

      const saved = db.updateEmailConfig(updatedData);
      await FirestoreSyncService.syncEmailConfig(saved).catch(() => {});

      if (saved.imap24x7Enabled !== false) {
        emailService.start24x7ImapWatcher();
      }

      db.logActivity(
        req.user?.id,
        req.user?.username,
        'EMAIL_CONFIG_UPDATE',
        `Admin updated Email/IMAP/SMTP configuration: Sender=${saved.senderEmail}, Enabled=${saved.enabled}`
      );

      res.json({
        message: 'Email & IMAP/SMTP settings saved and synced to Cloud successfully.',
        config: {
          ...saved,
          smtpPass: saved.smtpPass || '',
          imapPass: saved.imapPass || '',
          hasSmtpPass: Boolean(saved.smtpPass),
          hasImapPass: Boolean(saved.imapPass),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update email settings.' });
    }
  }

  public static async testEmailConnection(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { testEmail, configOverride, testType } = req.body;
      const testResult = await emailService.testEmailConfiguration(configOverride, testEmail, testType || 'smtp');

      if (testResult.success) {
        if (configOverride && typeof configOverride === 'object') {
          const cleanSave: any = { ...configOverride };
          if (!cleanSave.smtpPass || String(cleanSave.smtpPass).includes('••••')) delete cleanSave.smtpPass;
          if (!cleanSave.imapPass || String(cleanSave.imapPass).includes('••••')) delete cleanSave.imapPass;
          if (cleanSave.smtpPass && !cleanSave.imapPass) cleanSave.imapPass = cleanSave.smtpPass;
          if (cleanSave.imapPass && !cleanSave.smtpPass) cleanSave.smtpPass = cleanSave.imapPass;
          const saved = db.updateEmailConfig(cleanSave);
          FirestoreSyncService.syncEmailConfig(saved).catch(() => {});
        }
        db.logActivity(
          req.user?.id,
          req.user?.username,
          'EMAIL_TEST_SUCCESS',
          `Successfully verified mail connection and sent test OTP to ${testEmail || db.emailConfig.senderEmail}`
        );
      } else {
        db.logActivity(
          req.user?.id,
          req.user?.username,
          'EMAIL_TEST_FAILED',
          `Mail server test failed: ${testResult.message}`
        );
      }

      res.json(testResult);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err.message || 'Email test execution failed.' });
    }
  }

  public static async getImap24x7Status(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      await FirestoreSyncService.pullEmailConfig().catch(() => {});
      const status = emailService.getImap24x7Status();
      res.json({ success: true, status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async triggerImapScan(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const result = await emailService.triggerImapScan();
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async toggle24x7Imap(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const enabled = Boolean(req.body.enabled);
      const status = emailService.toggle24x7Imap(enabled);
      FirestoreSyncService.syncEmailConfig(db.emailConfig).catch(() => {});
      db.logActivity(
        req.user?.id,
        req.user?.username,
        enabled ? 'IMAP_24_7_ENABLED' : 'IMAP_24_7_DISABLED',
        `Admin ${enabled ? 'started' : 'paused'} 24/7 background IMAP auto-deposit listener.`
      );
      res.json({ success: true, status });
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async simulateUpiDeposit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { depositId, utr, amount, sender } = req.body;
      const result = emailService.simulateIncomingUpiDeposit({ depositId, utr, amount, sender });
      if (result.success) {
        db.logActivity(
          req.user?.id,
          req.user?.username,
          'SIMULATED_UPI_DEPOSIT',
          `Admin simulated UPI payment receipt: UTR=${result.discovered?.utr}, Amount=₹${result.discovered?.amount}`
        );
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, error: err.message });
    }
  }

  public static async exportDatabase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const data = db.getRawData();
      const filename = `nexa_panel_backup_${new Date().toISOString().split('T')[0]}.json`;
      res.setHeader('Content-Type', 'application/json');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      db.logActivity(req.user?.id, req.user?.username, 'DATABASE_BACKUP_DOWNLOAD', 'Admin exported full database snapshot');
      res.json(data);
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to export database.' });
    }
  }

  public static async importDatabase(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const backupData = req.body;
      if (!backupData || !Array.isArray(backupData.users)) {
        res.status(400).json({ error: 'Invalid database backup structure. Expected JSON with users array.' });
        return;
      }

      db.replaceData(backupData);
      await FirestoreSyncService.pushFullRestoredStateToCloud(true);

      db.logActivity(
        req.user?.id,
        req.user?.username,
        'DATABASE_RESTORE',
        `Restored database snapshot with ${backupData.users.length} users and ${(backupData.orders || []).length} orders`
      );

      res.json({
        message: 'Database snapshot successfully restored and synced to Cloud & Edge! All user balances, accounts, products, and orders are intact.',
        stats: {
          usersCount: db.users.length,
          productsCount: db.products.length,
          ordersCount: db.orders.length,
          depositsCount: db.deposits.length,
          keysCount: db.digitalKeys.length,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to restore database.' });
    }
  }
}
