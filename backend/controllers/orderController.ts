import { Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { WalletService } from '../services/walletService';
import { KeyService } from '../services/keyService';
import { ResellerApiService } from '../services/resellerApi';
import { Order, DigitalKey } from '../models/types';
import { FirestoreSyncService } from '../services/firestoreSync';

export class OrderController {
  public static async createOrder(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Please log in to purchase digital keys.' });
        return;
      }

      const { variantId, androidId, quantity } = req.body;
      if (!variantId) {
        res.status(400).json({ error: 'Product duration variant ID is required.' });
        return;
      }

      const qty = Math.max(1, Math.min(20, parseInt(quantity, 10) || 1));

      // 1. Server-side variant lookup
      const variant = db.productVariants.find(v => v.id === variantId && v.isActive);
      if (!variant) {
        res.status(404).json({ error: 'Selected duration variant is unavailable or invalid.' });
        return;
      }

      // 2. Product verification
      const product = db.products.find(p => p.id === variant.productId && p.isActive);
      if (!product) {
        res.status(404).json({ error: 'The parent product is currently disabled or removed.' });
        return;
      }

      // Check if product is under maintenance
      if (product.isUnderMaintenance) {
        res.status(400).json({
          error: `⚠️ ${product.name} is currently under maintenance. Purchasing is temporarily paused for server updates.`,
        });
        return;
      }

      // Check if Android ID is required for Device-Bound / V1
      if (variant.requiresAndroidId && (!androidId || !androidId.trim())) {
        res.status(400).json({
          error: 'Android Device ID is required for this Device-Bound / V1 product option.',
        });
        return;
      }

      // 3. Server-side price calculation
      const isReseller = user.role === 'RESELLER';
      const singlePrice = isReseller ? variant.resellerPrice : variant.price;
      const authoritativePrice = singlePrice * qty;

      // 4. Wallet balance verification
      const currentBalance = WalletService.getBalance(user.id);
      if (currentBalance < authoritativePrice) {
        res.status(400).json({
          error: `Insufficient wallet balance. You have ₹${currentBalance.toFixed(2)}, but this requires ₹${authoritativePrice.toFixed(2)}. Please deposit funds.`,
          requiredAmount: authoritativePrice,
          currentBalance,
        });
        return;
      }

      const orderId = `ORD-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      // 5. Deduct balance from wallet
      WalletService.deductFunds(
        user.id,
        authoritativePrice,
        `Purchased ${qty > 1 ? `${qty}x ` : ''}${product.name} (${variant.durationLabel})`,
        orderId
      );

      // 6. Key generation via External Reseller API or Local Pool
      const deliveredKeys: DigitalKey[] = [];
      const effectivePid = variant.externalPid?.trim() || product.externalPid?.trim();
      const effectiveDuration = variant.externalDuration?.trim() || variant.durationLabel.trim();

      for (let i = 0; i < qty; i++) {
        const subOrderId = qty > 1 ? `${orderId}-${i + 1}` : orderId;
        if (effectivePid) {
          const apiResult = await ResellerApiService.fetchKeyFromProvider({
            externalPid: effectivePid,
            durationLabel: effectiveDuration,
            androidId: androidId?.trim(),
            orderId: subOrderId,
          });

          if (apiResult.success && apiResult.keyCode) {
            const expiryDate = new Date(Date.now() + variant.durationHours * 3600 * 1000);
            const extKey: DigitalKey = {
              id: `KEY-${Date.now()}-${i}-${crypto.randomBytes(2).toString('hex')}`,
              productId: product.id,
              variantId: variant.id,
              productName: product.name,
              gameName: product.game || 'FREEFIRE',
              durationLabel: variant.durationLabel,
              keyCode: apiResult.keyCode,
              isUsed: false,
              assignedUserId: user.id,
              assignedOrderId: subOrderId,
              assignedAt: new Date().toISOString(),
              expiresAt: expiryDate.toISOString(),
              status: 'ACTIVE',
              purchaseSource: 'WEB',
              purchaseSourceLabel: 'Buy from Website',
              createdAt: new Date().toISOString(),
            };
            db.digitalKeys.push(extKey);
            KeyService.syncVariantStock(variant.id);
            deliveredKeys.push(extKey);
          } else {
            // Check local inventory first
            const availableKey = db.digitalKeys.find(
              k => k.variantId === variant.id && !k.isUsed && k.status === 'ACTIVE'
            );

            if (availableKey) {
              const localKey = KeyService.allocateKey(user.id, variant, subOrderId, 'WEB');
              deliveredKeys.push(localKey);
            } else {
              // Auto-generate high entropy fallback key if upstream fails / out of stock
              const fallbackKey = KeyService.generateFallbackKey(user.id, product, variant, subOrderId, 'WEB');
              db.logActivity(
                user.id,
                user.username,
                'ORDER_KEY_FALLBACK_ISSUED',
                `Delivered instant digital key for ${product.name} (${variant.durationLabel}). Upstream notice: ${apiResult.message || 'Out of stock'}`
              );
              deliveredKeys.push(fallbackKey);
            }
          }
        } else {
          // Local inventory allocation or fallback auto-generation
          const availableKey = db.digitalKeys.find(
            k => k.variantId === variant.id && !k.isUsed && k.status === 'ACTIVE'
          );
          if (availableKey) {
            const localKey = KeyService.allocateKey(user.id, variant, subOrderId, 'WEB');
            deliveredKeys.push(localKey);
          } else {
            const fallbackKey = KeyService.generateFallbackKey(user.id, product, variant, subOrderId, 'WEB');
            deliveredKeys.push(fallbackKey);
          }
        }
      }

      // 7. Create Order records
      for (let i = 0; i < deliveredKeys.length; i++) {
        const k = deliveredKeys[i];
        const subOrderId = qty > 1 ? `${orderId}-${i + 1}` : orderId;
        const order: Order = {
          id: subOrderId,
          userId: user.id,
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          durationLabel: variant.durationLabel,
          pricePaid: singlePrice,
          deliveredKeyId: k.id,
          deliveredKeyCode: k.keyCode,
          status: 'COMPLETED',
          purchaseSource: 'WEB',
          purchaseSourceLabel: 'Buy from Website',
          createdAt: new Date().toISOString(),
        };
        db.orders.unshift(order);
        FirestoreSyncService.syncDigitalKey(k).catch(() => {});
        FirestoreSyncService.syncOrder(order).catch(() => {});
      }
      db.saveSync();

      const newBalance = WalletService.getBalance(user.id);
      FirestoreSyncService.syncUserBalance(user.id, newBalance).catch(() => {});

      const latestTx = db.transactions.find(t => t.referenceId === orderId);
      if (latestTx) {
        latestTx.purchaseSource = 'WEB';
        latestTx.purchaseSourceLabel = 'Buy from Website';
        FirestoreSyncService.syncTransaction(latestTx).catch(() => {});
      }

      // 8. Process referral commission if applicable
      WalletService.processReferralReward(user.id, authoritativePrice);

      const deliveredKey = deliveredKeys[0];

      // 9. Audit log
      db.logActivity(
        user.id,
        user.username,
        'KEY_PURCHASE_WEB',
        `[This Key Buyed by Web] Purchased ${product.name} [${variant.durationLabel}] for ₹${authoritativePrice}. Key: ${deliveredKey.keyCode}`
      );

      const latestOrder = db.orders[0];

      res.status(201).json({
        success: true,
        message: 'Purchase successful! This Key Buyed by Web.',
        order: latestOrder,
        deliveredKey: {
          id: deliveredKey.id,
          keyCode: deliveredKey.keyCode,
          durationLabel: variant.durationLabel,
          expiresAt: deliveredKey.expiresAt,
          productName: product.name,
          purchaseSource: 'WEB',
          purchaseSourceLabel: 'Buy from Website',
        },
        key: {
          id: deliveredKey.id,
          keyCode: deliveredKey.keyCode,
          durationLabel: variant.durationLabel,
          expiresAt: deliveredKey.expiresAt,
          productName: product.name,
          purchaseSource: 'WEB',
          purchaseSourceLabel: 'This Key Buyed by Web',
        },
        newBalance: WalletService.getBalance(user.id),
      });
    } catch (err: any) {
      console.error('Order creation error:', err);
      res.status(500).json({ error: err.message || 'Failed to process purchase.' });
    }
  }

  public static async getUserOrders(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const orders = db.orders
        .filter(o => o.userId === user.id)
        .map(o => {
          const isApi = o.purchaseSource === 'API' || String(o.id || '').startsWith('API-ORD-');
          return {
            ...o,
            purchaseSource: isApi ? ('API' as const) : ('WEB' as const),
            purchaseSourceLabel: isApi ? 'This Key Buyed by API' : 'This Key Buyed by Web',
          };
        });
      res.json({ orders });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch orders.' });
    }
  }

  public static async getTopActiveUsers(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      // Calculate top 5 real active users strictly from database
      const userStatsMap: Record<
        string,
        { userId: string; username: string; role: string; keysCount: number; totalSpent: number }
      > = {};

      // Seed all real registered users from database
      db.users.forEach(u => {
        userStatsMap[u.id] = {
          userId: u.id,
          username: u.username,
          role: u.role,
          keysCount: 0,
          totalSpent: 0,
        };
      });

      // Aggregate completed orders for real users
      db.orders.forEach(o => {
        if (o.status === 'COMPLETED' && userStatsMap[o.userId]) {
          userStatsMap[o.userId].keysCount += 1;
          userStatsMap[o.userId].totalSpent += o.pricePaid || 0;
        }
      });

      // Sort strictly by keysCount descending, then totalSpent descending
      const topRealUsers = Object.values(userStatsMap)
        .sort((a, b) => b.keysCount - a.keysCount || b.totalSpent - a.totalSpent)
        .slice(0, 5); // Strictly Top 5 real users

      // Format Top 5 real users with rank
      const leaderboard = topRealUsers.map((u, index) => ({
        rank: index + 1,
        userId: u.userId,
        username: u.username,
        role: u.role,
        keysCount: u.keysCount,
        totalSpent: u.totalSpent,
      }));

      res.json({ success: true, leaderboard });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch top active users.' });
    }
  }
}
