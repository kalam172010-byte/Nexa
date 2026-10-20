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

      const {
        variantId,
        androidId,
        quantity,
        productId: bodyProductId,
        productName: bodyProductName,
        game: bodyGame,
        durationLabel: bodyDurationLabel,
        durationHours: bodyDurationHours,
        price: bodyPrice,
      } = req.body;
      if (!variantId) {
        res.status(400).json({ error: 'Product duration variant ID is required.' });
        return;
      }

      const qty = Math.max(1, Math.min(20, parseInt(quantity, 10) || 1));

      // 1. Server-side variant lookup (with automatic upsert if product/variant was created in client cache)
      let variant = db.productVariants.find(v => v.id === variantId && v.isActive !== false);
      let product = variant
        ? db.products.find(p => p.id === variant!.productId && p.isActive !== false)
        : bodyProductId
        ? db.products.find(p => p.id === bodyProductId && p.isActive !== false)
        : undefined;

      if (!product && (bodyProductId || bodyProductName)) {
        const newProdId = bodyProductId || `PROD-${Date.now().toString().slice(-6)}`;
        product = {
          id: newProdId,
          name: bodyProductName || 'VIP Gaming Panel',
          game: bodyGame || 'FREEFIRE',
          description: '',
          category: bodyGame || 'FREEFIRE',
          badge: 'VIP',
          deviceType: 'NONROOT',
          isActive: true,
          isUnderMaintenance: false,
          createdAt: new Date().toISOString(),
        };
        db.products.unshift(product);
      }

      if (!variant && product) {
        const unitP = Math.max(1, Number(bodyPrice || 50));
        variant = {
          id: String(variantId),
          productId: product.id,
          durationLabel: bodyDurationLabel || '1 Day',
          durationHours: Number(bodyDurationHours) || 24,
          price: unitP,
          resellerPrice: unitP,
          stockCount: 50,
          isActive: true,
        };
        db.productVariants.push(variant);
      }

      if (!variant) {
        res.status(404).json({ error: 'Selected duration variant is unavailable or invalid.' });
        return;
      }

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

      // 3. Server-side price calculation (exact variant price)
      const singlePrice = Math.max(1, Number(variant.price || variant.resellerPrice || 50));
      const authoritativePrice = Math.round(singlePrice * qty * 100) / 100;

      const orderId = `ORD-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      // 4. Server-side wallet balance validation & atomic deduction
      const verification = await WalletService.verifyAndDeductApiKeyPurchase(
        user.id,
        authoritativePrice,
        `Purchased ${qty > 1 ? `${qty}x ` : ''}${product.name} (${variant.durationLabel})`,
        orderId
      );

      if (!verification.success) {
        res.status(400).json({
          error: verification.error,
          requiredAmount: authoritativePrice,
          currentBalance: verification.currentBalance,
        });
        return;
      }

      const dbUser = verification.user || user;
      const headerEmail = (req.headers['x-user-email'] as string | undefined)?.toLowerCase().trim();
      const userEmail = (dbUser.email || user.email || headerEmail || '').toLowerCase().trim();
      const userApiKey = dbUser.apiKey || user.apiKey || '';

      // 5. Instant Key Allocation: Check local inventory first, then fast upstream or instant auto-generation
      const deliveredKeys: DigitalKey[] = [];
      const effectivePid = variant.externalPid?.trim() || product.externalPid?.trim();
      const effectiveDuration = variant.externalDuration?.trim() || variant.durationLabel.trim();

      for (let i = 0; i < qty; i++) {
        const subOrderId = qty > 1 ? `${orderId}-${i + 1}` : orderId;

        // Priority A: Check local pre-generated key stock in db.digitalKeys first (0ms latency)
        const availableKey = db.digitalKeys.find(
          k => k.variantId === variant!.id && !k.isUsed && k.status === 'ACTIVE' && !k.assignedUserId
        );

        if (availableKey) {
          const localKey = KeyService.allocateKey(dbUser.id, variant, subOrderId, 'WEB');
          localKey.assignedUserEmail = userEmail;
          localKey.assignedApiKey = userApiKey;
          localKey.productName = product.name;
          localKey.gameName = product.game || 'FREEFIRE';
          localKey.durationLabel = variant.durationLabel;
          deliveredKeys.push(localKey);
          continue;
        }

        // Priority B: External provider if PID is explicitly configured
        if (effectivePid && db.resellerConfig?.isLiveApiEnabled !== false) {
          const apiResult = await ResellerApiService.fetchKeyFromProvider({
            externalPid: effectivePid,
            durationLabel: effectiveDuration,
            androidId: androidId?.trim(),
            orderId: subOrderId,
          });

          if (apiResult.success && apiResult.keyCode) {
            const nowIso = new Date().toISOString();
            const expiryDate = new Date(Date.now() + (variant.durationHours || 24) * 3600 * 1000);
            const extKey: DigitalKey = {
              id: `KEY-${Date.now()}-${i}-${crypto.randomBytes(2).toString('hex')}`,
              productId: product.id,
              variantId: variant.id,
              productName: product.name,
              gameName: product.game || 'FREEFIRE',
              durationLabel: variant.durationLabel,
              keyCode: apiResult.keyCode,
              isUsed: false,
              assignedUserId: dbUser.id,
              assignedUserEmail: userEmail,
              assignedApiKey: userApiKey,
              assignedOrderId: subOrderId,
              assignedAt: nowIso,
              expiresAt: expiryDate.toISOString(),
              status: 'ACTIVE',
              purchaseSource: 'WEB',
              purchaseSourceLabel: 'Buy from Website',
              createdAt: nowIso,
            };
            db.digitalKeys.unshift(extKey);
            deliveredKeys.push(extKey);
            continue;
          }
        }

        // Priority C: Instant high-entropy key generation (0ms latency)
        const fallbackKey = KeyService.generateFallbackKey(dbUser.id, product, variant, subOrderId, undefined, 'WEB');
        fallbackKey.assignedUserEmail = userEmail;
        fallbackKey.assignedApiKey = userApiKey;
        fallbackKey.productName = product.name;
        fallbackKey.gameName = product.game || 'FREEFIRE';
        fallbackKey.durationLabel = variant.durationLabel;
        deliveredKeys.push(fallbackKey);
      }

      // 6. Create Order records and trigger non-blocking Firestore sync
      for (let i = 0; i < deliveredKeys.length; i++) {
        const k = deliveredKeys[i];
        const subOrderId = qty > 1 ? `${orderId}-${i + 1}` : orderId;
        const order: Order = {
          id: subOrderId,
          userId: dbUser.id,
          userEmail,
          apiKey: userApiKey,
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

      const newBalance = verification.remainingBalance;
      FirestoreSyncService.syncUserBalance(dbUser.id, newBalance).catch(() => {});

      const latestTx = db.transactions.find(t => t.referenceId === orderId);
      if (latestTx) {
        latestTx.purchaseSource = 'WEB';
        latestTx.purchaseSourceLabel = 'Buy from Website';
        latestTx.userEmail = userEmail;
        latestTx.apiKey = userApiKey;
        FirestoreSyncService.syncTransaction(latestTx).catch(() => {});
      }

      // 7. Process referral commission if applicable
      WalletService.processReferralReward(dbUser.id, authoritativePrice);

      const deliveredKey = deliveredKeys[0];
      const allKeyCodes = deliveredKeys.map(k => k.keyCode).join('\n');

      // 8. Audit log
      db.logActivity(
        dbUser.id,
        dbUser.username,
        'KEY_PURCHASE_WEB',
        `[This Key Buyed by Web] Purchased ${qty}x ${product.name} [${variant.durationLabel}] for ₹${authoritativePrice}. Key: ${deliveredKey.keyCode}`
      );

      const latestOrder = db.orders[0];
      const formattedDeliveredKeys = deliveredKeys.map(k => ({
        id: k.id,
        keyCode: k.keyCode,
        productId: product!.id,
        variantId: variant!.id,
        productName: product!.name,
        gameName: product!.game || 'FREEFIRE',
        durationLabel: variant!.durationLabel,
        assignedUserId: dbUser.id,
        assignedUserEmail: userEmail,
        assignedApiKey: userApiKey,
        assignedOrderId: k.assignedOrderId,
        assignedAt: k.assignedAt,
        expiresAt: k.expiresAt,
        status: 'ACTIVE' as const,
        isUsed: false,
        purchaseSource: 'WEB' as const,
        purchaseSourceLabel: 'Buy from Website',
        createdAt: k.createdAt,
      }));

      res.status(201).json({
        success: true,
        message: 'Purchase successful! This Key Buyed by Web.',
        order: latestOrder,
        deliveredKeys: formattedDeliveredKeys,
        deliveredKey: {
          ...formattedDeliveredKeys[0],
          keyCode: allKeyCodes,
        },
        key: {
          ...formattedDeliveredKeys[0],
          keyCode: allKeyCodes,
          keys: deliveredKeys.map(k => k.keyCode),
          quantity: qty,
        },
        newBalance,
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

      await FirestoreSyncService.pullAndMergeExternalState(false);

      const dbUser = db.users.find(
        u => u.id === user.id || u.firebaseUid === user.id || u.email.toLowerCase() === user.email.toLowerCase()
      );
      const userAltIds = new Set<string>(FirestoreSyncService.getLinkedUserIds(dbUser || user, user.id));
      const userEmail = (dbUser?.email || user.email || '').toLowerCase().trim();
      const userApiKey = (dbUser?.apiKey || user.apiKey || '').trim();

      const orders = db.orders
        .filter(
          o =>
            userAltIds.has(o.userId) ||
            (userEmail && o.userEmail && o.userEmail.toLowerCase().trim() === userEmail) ||
            (userApiKey && o.apiKey && o.apiKey.trim() === userApiKey)
        )
        .map(o => {
          const isApi =
            o.purchaseSource === 'API' ||
            String(o.id || '').startsWith('API-ORD-') ||
            String(o.id || '').startsWith('ORD-EXT-');
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

  public static async getTopActiveUsers(req: any, res: Response): Promise<void> {
    try {
      // Sync real-time Firestore & Edge users first
      await FirestoreSyncService.pullAndMergeExternalState(false).catch(() => {});

      // Calculate top 5 real active users from database
      const userStatsMap: Record<
        string,
        { userId: string; username: string; role: string; keysCount: number; totalSpent: number; createdAt: string }
      > = {};

      // Seed all real registered users from database
      db.users.forEach(u => {
        userStatsMap[u.id] = {
          userId: u.id,
          username: u.username || 'user',
          role: u.role || 'USER',
          keysCount: 0,
          totalSpent: 0,
          createdAt: u.createdAt || new Date().toISOString(),
        };
      });

      // Aggregate completed orders for real users
      db.orders.forEach(o => {
        if (o.status === 'COMPLETED') {
          const targetUserId = o.userId || Object.keys(userStatsMap).find(
            uid => userStatsMap[uid].userId === o.userId || userStatsMap[uid].username === o.userEmail
          );
          if (targetUserId && userStatsMap[targetUserId]) {
            userStatsMap[targetUserId].keysCount += 1;
            userStatsMap[targetUserId].totalSpent += o.pricePaid || 0;
          }
        }
      });

      // Also verify keysCount against digitalKeys
      db.digitalKeys.forEach(k => {
        if (k.assignedUserId && userStatsMap[k.assignedUserId]) {
          const directCount = db.digitalKeys.filter(dk => dk.assignedUserId === k.assignedUserId).length;
          if (directCount > userStatsMap[k.assignedUserId].keysCount) {
            userStatsMap[k.assignedUserId].keysCount = directCount;
          }
        }
      });

      // Sort by keysCount descending, then totalSpent descending, then newest members
      const topRealUsers = Object.values(userStatsMap)
        .sort((a, b) => b.keysCount - a.keysCount || b.totalSpent - a.totalSpent || new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
        .slice(0, 5);

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
