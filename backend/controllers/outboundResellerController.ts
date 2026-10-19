import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database';
import { WalletService } from '../services/walletService';
import { ResellerApiService } from '../services/resellerApi';
import { AuthenticatedRequest } from '../middleware/auth';
import { DigitalKey, Order, ProductVariant, Transaction, User } from '../models/types';
import { FirestoreSyncService } from '../services/firestoreSync';

export class OutboundResellerController {
  /**
   * Public / External API endpoint for other websites / resellers to buy keys using their API key and wallet balance.
   * Compatible with endpoint paths: /api/v1/reseller/buy and /api/reseller_v1.php
   * Accepts:
   * - product_id: 2-digit or 3-digit numeric PID (e.g. 155, 66, 150, 123)
   * - duration: plan duration label (e.g. 1 Hours, 1 DAYS, 1 Day Non-Root, 7 DAYS)
   * - quantity: 1 to 100
   * - api_key: Reseller's active API token
   */
  public static async handleResellerBuy(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const bearerToken = authHeader && authHeader.startsWith('Bearer ') ? authHeader.slice(7).trim() : null;
      const apiKey =
        req.body.api_key ||
        req.body.apiKey ||
        req.query.api_key ||
        req.query.apiKey ||
        req.headers['x-api-key'] ||
        req.headers['x-master-key'] ||
        req.headers['api-key'] ||
        req.headers['apikey'] ||
        bearerToken;

      const rawAction = String(req.body.action || req.query.action || 'buy').toLowerCase().trim();
      const productId = req.body.product_id || req.body.productId || req.body.pid || req.query.product_id || req.query.pid;
      const duration = req.body.duration || req.body.durationLabel || req.query.duration || req.query.durationLabel;
      const quantityRaw = req.body.quantity || req.query.quantity || 1;
      const quantity = Math.max(1, Math.min(100, parseInt(String(quantityRaw), 10) || 1));
      const androidId = req.body.android_id || req.body.androidId || req.query.android_id;

      // When accessed directly in a browser via GET without parameters, return 200 OK status overview
      if (req.method === 'GET' && !apiKey && !productId) {
        let protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
        if (Array.isArray(protocol)) protocol = protocol[0];
        protocol = protocol.split(',')[0].trim();
        let host = (req.headers['x-forwarded-host'] as string) || req.get('host') || 'localhost:3000';
        if (Array.isArray(host)) host = host[0];
        host = host.split(',')[0].trim();
        if (!host.includes('localhost') && !host.includes('127.0.0.1')) {
          protocol = 'https';
        }
        const origin = `${protocol}://${host}`;

        res.status(200).json({
          status: true,
          status_code: 200,
          online: true,
          service: 'KALAM FF PANEL Outbound Reseller API',
          detected_domain: origin,
          active_endpoint: `${origin}${req.originalUrl || '/api/v1/reseller/buy'}`,
          available_endpoints: {
            rest_api: `${origin}/api/v1/reseller/buy`,
            php_bridge: `${origin}/api/reseller_v1.php`,
            root_php: `${origin}/reseller_v1.php`,
          },
          supported_methods: ['POST', 'GET'],
          required_parameters: {
            api_key: 'Your Reseller Secret API Token (or pass via X-Api-Key header)',
            action: 'buy (or get_balance / get_products)',
            product_id: 'Numeric Product PID (e.g. 155, 66, 150)',
            duration: 'Duration label (e.g. 1 Day, 7 Days, 60 Days)',
            quantity: 'Number of keys to generate (1 to 100)',
          },
          message: 'Outbound Reseller API is active and ready. Send a POST or GET request with api_key, product_id, and duration to generate keys.',
        });
        return;
      }

      if (!apiKey) {
        res.status(401).json({
          status: false,
          status_code: 401,
          message: 'API Key is required. Please provide api_key in payload, query, or x-api-key header.',
        });
        return;
      }

      // 1. Authenticate user/reseller strictly by their unique account API key
      const cleanApiKey = String(apiKey).trim();
      const headerUserId = (req.headers['x-user-id'] as string | undefined)?.trim();
      const headerEmail = (req.headers['x-user-email'] as string | undefined)?.toLowerCase().trim();

      // Check local DB first by exact API key match
      let user = db.users.find(u => u.apiKey && u.apiKey.trim() === cleanApiKey);

      // If not in local DB, search Firestore in real-time by exact API key
      if (!user) {
        const firestoreUser = await FirestoreSyncService.findUserByApiKey(cleanApiKey);
        if (firestoreUser) {
          const localMatch = db.users.find(
            u =>
              u.id === firestoreUser.id ||
              (firestoreUser.firebaseUid && u.id === firestoreUser.firebaseUid) ||
              (firestoreUser.email && u.email.toLowerCase() === firestoreUser.email.toLowerCase())
          );
          if (localMatch) {
            localMatch.apiKey = cleanApiKey;
            localMatch.balance = firestoreUser.balance;
            if (firestoreUser.firebaseUid) {
              localMatch.firebaseUid = firestoreUser.firebaseUid;
            }
            user = localMatch;
          } else {
            db.users.push(firestoreUser);
            user = firestoreUser;
          }
          db.saveSync();
        }
      }

      // Check header hint ONLY if the user does not already have a different API key assigned
      if (!user && (headerUserId || headerEmail) && cleanApiKey.startsWith('nexa_live_')) {
        const candidate = db.users.find(
          u =>
            (headerUserId && (u.id === headerUserId || u.firebaseUid === headerUserId)) ||
            (headerEmail && u.email.toLowerCase() === headerEmail)
        );
        if (candidate && (!candidate.apiKey || candidate.apiKey.trim() === cleanApiKey)) {
          candidate.apiKey = cleanApiKey;
          user = candidate;
          db.saveSync();
          FirestoreSyncService.syncUserApiKey(user.id, cleanApiKey).catch(() => {});
        }
      }

      if (!user) {
        res.status(401).json({
          status: false,
          status_code: 401,
          error: 'Invalid API Key. No account found matching this API Key. Please copy your unique API Token from your Reseller API page.',
          message: 'Invalid API Key. No account found matching this API Key. Please copy your unique API Token from your Reseller API page.',
        });
        return;
      }

      if (user.isBanned) {
        res.status(403).json({
          status: false,
          status_code: 403,
          error: 'Account is banned or suspended.',
          message: 'Account is banned or suspended.',
        });
        return;
      }

      // Refresh authoritative balance from Firestore so external API checks are 100% accurate
      try {
        const liveBal = await FirestoreSyncService.getAuthoritativeBalance(user);
        if (typeof liveBal === 'number' && !Number.isNaN(liveBal)) {
          user.balance = liveBal;
          db.saveSync();
        }
      } catch {}

      // External panels balance verification handshake: action=get_balance or action=balance
      if (rawAction === 'get_balance' || rawAction === 'balance' || rawAction === 'check_balance' || rawAction === 'status') {
        const bal = WalletService.getBalance(user.id);
        res.json({
          status: true,
          status_code: 200,
          balance: bal,
          wallet_balance: bal,
          user: user.username,
          username: user.username,
          email: user.email,
          role: user.role,
          currency: 'INR',
          message: 'Account verified successfully.',
        });
        return;
      }

      // External panels service list handshake: action=get_products or action=products or action=services
      if (rawAction === 'get_products' || rawAction === 'products' || rawAction === 'services') {
        const productsList = db.products.map(p => {
          const variants = db.productVariants.filter(v => v.productId === p.id && v.isActive);
          return {
            id: p.id,
            name: p.name,
            game: p.game,
            externalPid: p.externalPid || '155',
            variants: variants.map(v => ({
              variantId: v.id,
              durationLabel: v.durationLabel,
              externalPid: v.externalPid || p.externalPid || '155',
              price: v.price,
            })),
          };
        });
        res.json({
          status: true,
          status_code: 200,
          products: productsList,
          currency: 'INR',
        });
        return;
      }

      if (!productId || !duration) {
        res.status(400).json({
          status: false,
          status_code: 400,
          message: 'Product ID (product_id: 2 or 3 digit number) and Duration (duration: e.g. 1 Hours, 1 Day) are required.',
        });
        return;
      }

      // 2. Find product & variant by numeric PID and Duration
      const cleanPid = String(productId).trim();
      const cleanDuration = String(duration).trim().toLowerCase();

      // Candidate products matching PID
      const candidateProducts = db.products.filter(
        p =>
          String(p.externalPid).trim() === cleanPid ||
          String(p.id).trim().toLowerCase() === cleanPid.toLowerCase()
      );

      let matchedProduct = candidateProducts[0];
      let matchedVariant: ProductVariant | undefined = undefined;

      // Try to find a candidate product that also has an exact or partial duration match
      for (const candProd of candidateProducts) {
        const vars = db.productVariants.filter(v => v.productId === candProd.id && v.isActive);
        const exactVar = vars.find(
          v =>
            v.durationLabel.trim().toLowerCase() === cleanDuration ||
            v.externalDuration?.trim().toLowerCase() === cleanDuration
        );
        if (exactVar) {
          matchedProduct = candProd;
          matchedVariant = exactVar;
          break;
        }
      }

      if (!matchedVariant) {
        for (const candProd of candidateProducts) {
          const vars = db.productVariants.filter(v => v.productId === candProd.id && v.isActive);
          const partialVar = vars.find(
            v =>
              v.durationLabel.toLowerCase().includes(cleanDuration) ||
              cleanDuration.includes(v.durationLabel.toLowerCase())
          );
          if (partialVar) {
            matchedProduct = candProd;
            matchedVariant = partialVar;
            break;
          }
        }
      }

      // If not found on product directly, check if any variant has this externalPid + duration
      if (!matchedVariant) {
        const varsWithPid = db.productVariants.filter(
          v =>
            v.isActive &&
            (String(v.externalPid).trim() === cleanPid ||
              String(v.id).trim().toLowerCase() === cleanPid.toLowerCase())
        );
        const exactVarWithPid =
          varsWithPid.find(
            v =>
              v.durationLabel.trim().toLowerCase() === cleanDuration ||
              v.externalDuration?.trim().toLowerCase() === cleanDuration
          ) ||
          varsWithPid.find(
            v =>
              v.durationLabel.toLowerCase().includes(cleanDuration) ||
              cleanDuration.includes(v.durationLabel.toLowerCase())
          ) ||
          varsWithPid[0];

        if (exactVarWithPid) {
          matchedVariant = exactVarWithPid;
          matchedProduct = db.products.find(p => p.id === exactVarWithPid.productId) || matchedProduct;
        }
      }

      if (!matchedProduct && db.products.length > 0) {
        matchedProduct = db.products[0];
      }

      if (!matchedProduct) {
        res.status(404).json({
          status: false,
          status_code: 404,
          error: `Product not found for PID '${productId}'. Please check your Product Reference Table for valid 2 or 3-digit PIDs.`,
          message: `Product not found for PID '${productId}'. Please check your Product Reference Table for valid 2 or 3-digit PIDs.`,
        });
        return;
      }

      // 3. Fallback variant lookup on matchedProduct if still not resolved
      if (!matchedVariant) {
        const productVariants = db.productVariants.filter(v => v.productId === matchedProduct.id && v.isActive);
        matchedVariant =
          productVariants.find(
            v =>
              v.durationLabel.trim().toLowerCase() === cleanDuration ||
              v.externalDuration?.trim().toLowerCase() === cleanDuration
          ) ||
          productVariants.find(
            v =>
              v.durationLabel.toLowerCase().includes(cleanDuration) ||
              cleanDuration.includes(v.durationLabel.toLowerCase())
          ) ||
          productVariants[0] || {
            id: `VAR-AUTO-${cleanPid}`,
            productId: matchedProduct.id,
            durationLabel: String(duration),
            durationHours: 24,
            price: 50,
            resellerPrice: 50,
            stockCount: 999,
            externalPid: cleanPid,
            externalDuration: String(duration),
            isActive: true,
          };
      }

      // 4. Determine exact unit price & total price (if a key is ₹50, deduct ₹50 from the account wallet)
      const unitPrice = Math.max(1, Number(matchedVariant.price || matchedVariant.resellerPrice || 50));
      const totalPrice = Math.round(unitPrice * quantity * 100) / 100;

      const orderId = `ORD-EXT-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      // 5. SERVER-SIDE WALLET BALANCE VALIDATION & ATOMIC DEDUCTION LAYER
      // Only allow purchase if the user's account wallet has sufficient balance!
      const verification = await WalletService.verifyAndDeductApiKeyPurchase(
        user.id,
        totalPrice,
        `[This Key Buyed by API] External API Purchase (${quantity}x): ${matchedProduct.name} (${matchedVariant.durationLabel})`,
        orderId
      );

      if (!verification.success) {
        db.logActivity(
          user.id,
          user.username,
          'RESELLER_API_LOW_BALANCE',
          `External API buy blocked for ${matchedProduct.name}: ${verification.error}`
        );
        res.status(400).json({
          status: false,
          status_code: 400,
          error: verification.error,
          message: verification.error,
          required_amount: totalPrice,
          current_balance: verification.currentBalance,
        });
        return;
      }

      const remainingBalance = verification.remainingBalance;

      // 6. Issue Keys (quantity times) - Try Live Upstream Reseller API first if configured, then Local Pool, then Auto-Mint
      const deliveredKeys: string[] = [];
      const deliveredKeyObjects: DigitalKey[] = [];
      const effectiveExternalPid = matchedVariant.externalPid?.trim() || matchedProduct.externalPid?.trim();
      const effectiveExternalDuration = matchedVariant.externalDuration?.trim() || matchedVariant.durationLabel.trim();
      const now = new Date();
      const expiryDate = new Date(now.getTime() + (matchedVariant.durationHours || 24) * 3600 * 1000);

      for (let i = 0; i < quantity; i++) {
        let keyObj: DigitalKey | null = null;

        if (effectiveExternalPid && db.resellerConfig.isLiveApiEnabled !== false) {
          try {
            const upstream = await ResellerApiService.fetchKeyFromProvider({
              externalPid: effectiveExternalPid,
              durationLabel: effectiveExternalDuration,
              androidId,
              orderId: `${orderId}-${i + 1}`,
            });
            if (upstream.success && upstream.keyCode) {
              keyObj = {
                id: `KEY-EXT-${Date.now()}-${i}-${crypto.randomBytes(2).toString('hex')}`,
                productId: matchedProduct.id,
                variantId: matchedVariant.id,
                productName: matchedProduct.name,
                gameName: matchedProduct.game || 'FREEFIRE',
                durationLabel: matchedVariant.durationLabel,
                keyCode: upstream.keyCode,
                isUsed: false,
                status: 'ACTIVE',
                assignedUserId: user.id,
                assignedUserEmail: user.email.toLowerCase(),
                assignedApiKey: cleanApiKey,
                assignedOrderId: orderId,
                assignedAt: now.toISOString(),
                expiresAt: expiryDate.toISOString(),
                purchaseSource: 'API',
                purchaseSourceLabel: 'Buy from API',
                createdAt: now.toISOString(),
              };
              db.digitalKeys.unshift(keyObj);
            }
          } catch {}
        }

        if (!keyObj) {
          const unassignedKeyIndex = db.digitalKeys.findIndex(
            k =>
              k.productId === matchedProduct.id &&
              (!k.variantId || k.variantId === matchedVariant.id) &&
              !k.isUsed &&
              k.status === 'ACTIVE' &&
              !k.assignedUserId
          );

          if (unassignedKeyIndex !== -1) {
            keyObj = db.digitalKeys[unassignedKeyIndex];
            keyObj.isUsed = false;
            keyObj.status = 'ACTIVE';
            keyObj.assignedUserId = user.id;
            keyObj.assignedUserEmail = user.email.toLowerCase();
            keyObj.assignedApiKey = cleanApiKey;
            keyObj.assignedOrderId = orderId;
            keyObj.assignedAt = now.toISOString();
            keyObj.expiresAt = expiryDate.toISOString();
            keyObj.purchaseSource = 'API';
            keyObj.purchaseSourceLabel = 'Buy from API';
            keyObj.productName = matchedProduct.name;
            keyObj.gameName = matchedProduct.game || 'FREEFIRE';
            keyObj.durationLabel = matchedVariant.durationLabel;
          } else {
            keyObj = {
              id: `KEY-EXT-${Date.now()}-${i}-${crypto.randomBytes(2).toString('hex')}`,
              productId: matchedProduct.id,
              variantId: matchedVariant.id,
              productName: matchedProduct.name,
              gameName: matchedProduct.game || 'FREEFIRE',
              durationLabel: matchedVariant.durationLabel,
              keyCode: `KALAM-API-${cleanPid}-${crypto.randomBytes(3).toString('hex').toUpperCase()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
              isUsed: false,
              status: 'ACTIVE',
              assignedUserId: user.id,
              assignedUserEmail: user.email.toLowerCase(),
              assignedApiKey: cleanApiKey,
              assignedOrderId: orderId,
              assignedAt: now.toISOString(),
              expiresAt: expiryDate.toISOString(),
              purchaseSource: 'API',
              purchaseSourceLabel: 'Buy from API',
              createdAt: now.toISOString(),
            };
            db.digitalKeys.unshift(keyObj);
          }
        }
        deliveredKeys.push(keyObj.keyCode);
        deliveredKeyObjects.push(keyObj);
      }

      // Record order tagged with purchaseSource: 'API'
      const newOrder: Order = {
        id: orderId,
        userId: user.id,
        userEmail: user.email.toLowerCase(),
        apiKey: cleanApiKey,
        productId: matchedProduct.id,
        variantId: matchedVariant.id,
        productName: matchedProduct.name,
        durationLabel: matchedVariant.durationLabel,
        pricePaid: totalPrice,
        deliveredKeyId: deliveredKeyObjects[0]?.id || orderId,
        deliveredKeyCode: deliveredKeys.join(', '),
        status: 'COMPLETED',
        purchaseSource: 'API',
        purchaseSourceLabel: 'Buy from API',
        createdAt: now.toISOString(),
      };
      db.orders.unshift(newOrder);

      const latestTx = db.transactions.find(t => t.referenceId === orderId) || {
        id: `TXN-${Date.now()}`,
        userId: user.id,
        userEmail: user.email.toLowerCase(),
        apiKey: cleanApiKey,
        type: 'PURCHASE' as const,
        amount: -totalPrice,
        description: `[This Key Buyed by API] External API Purchase (${quantity}x): ${matchedProduct.name} (${matchedVariant.durationLabel})`,
        referenceId: orderId,
        status: 'SUCCESS' as const,
        purchaseSource: 'API' as const,
        purchaseSourceLabel: 'Buy from API',
        createdAt: now.toISOString(),
      };
      if (latestTx) {
        latestTx.purchaseSource = 'API';
        latestTx.purchaseSourceLabel = 'Buy from API';
        latestTx.userEmail = user.email.toLowerCase();
        latestTx.apiKey = cleanApiKey;
      }

      db.saveSync();

      // EXECUTE ATOMIC TRANSACTION COMMIT IN FIRESTORE AND AWAIT IT
      // Simultaneously updates user balance, stores issued digital keys, order record, and debit transaction
      await FirestoreSyncService.commitAtomicKeyPurchase({
        userId: user.id,
        newBalance: remainingBalance,
        keyObjects: deliveredKeyObjects,
        order: newOrder,
        transaction: latestTx,
      }).catch(e => {
        console.warn('[OutboundReseller] Atomic commit background notice:', e);
      });

      db.logActivity(
        user.id,
        user.username,
        'RESELLER_API_KEY_SUCCESS',
        `[This Key Buyed by API] Generated ${quantity}x keys for ${matchedProduct.name} (${matchedVariant.durationLabel}) | Deducted: ₹${totalPrice} | Remaining Wallet: ₹${remainingBalance}`
      );

      res.json({
        status: true,
        status_code: 200,
        message: 'Keys successfully generated via Outbound Reseller API (This Key Buyed by API)',
        key: deliveredKeys[0],
        keys: deliveredKeys,
        quantity: quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        wallet_deducted: totalPrice,
        remaining_balance: remainingBalance,
        product_id: cleanPid,
        product_name: matchedProduct.name,
        duration: matchedVariant.durationLabel,
        transaction_id: orderId,
        purchase_source: 'API',
        purchase_source_label: 'This Key Buyed by API',
      });
    } catch (err: any) {
      db.logActivity(undefined, 'SYSTEM', 'RESELLER_API_ERROR', `Error processing external API buy: ${err.message}`);
      res.status(500).json({
        status: false,
        status_code: 500,
        message: err.message || 'Internal server error processing external API request.',
      });
    }
  }

  /**
   * Get API credentials and integration guide for the logged-in user/reseller
   */
  public static async getApiCredentials(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Please log in.' });
        return;
      }

      let dbUser: User | undefined = db.users.find(
        u => u.id === user.id || u.firebaseUid === user.id || u.email.toLowerCase() === user.email.toLowerCase()
      );
      const clientHintKey = (req.headers['x-user-api-key'] as string | undefined)?.trim();

      // Ensure clientHintKey is not already owned by a different user
      const isHintKeyUnique =
        clientHintKey &&
        clientHintKey.startsWith('nexa_live_') &&
        !db.users.some(u => u.id !== dbUser?.id && u.apiKey === clientHintKey);

      if (!dbUser) {
        dbUser = {
          id: user.id,
          username: user.username,
          email: user.email.toLowerCase(),
          passwordHash: '',
          role: user.role,
          balance: user.balance,
          apiKey: isHintKeyUnique
            ? clientHintKey
            : `nexa_live_${crypto.randomBytes(16).toString('hex')}`,
          referralCode: `NX${user.id.slice(0, 4).toUpperCase()}`,
          twoFactorEnabled: false,
          isBanned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.users.push(dbUser);
        db.saveSync();
      } else if (!dbUser.apiKey || db.users.some(u => u.id !== dbUser!.id && u.apiKey === dbUser!.apiKey)) {
        dbUser.apiKey = isHintKeyUnique
          ? clientHintKey
          : `nexa_live_${crypto.randomBytes(16).toString('hex')}`;
        db.saveSync();
      }
      // Ensure Firestore user document has the current apiKey
      if (dbUser && dbUser.apiKey) {
        FirestoreSyncService.syncUserApiKey(dbUser.id, dbUser.apiKey).catch(() => {});
      }

      // Ensure every product has a 2 or 3-digit numeric PID
      const defaultPids: Record<string, string> = {
        'PROD-BALA-01': '155',
        'PROD-IMMO-02': '66',
        'PROD-DRIP-03': '150',
        'PROD-TROLL-04': '123',
        'PROD-CARROM-05': '99',
      };

      let autoNum = 101;
      let hasChanges = false;
      for (const p of db.products) {
        if (!p.externalPid || !/^\d{2,3}$/.test(p.externalPid.trim())) {
          p.externalPid = defaultPids[p.id] || String(autoNum++);
          hasChanges = true;
        }
      }
      if (hasChanges) {
        db.saveSync();
      }

      // Auto-detect public protocol and host from reverse proxy, Cloud Run, custom domain, or origin headers
      let protocol = (req.headers['x-forwarded-proto'] as string) || req.protocol || 'https';
      if (Array.isArray(protocol)) protocol = protocol[0];
      if (typeof protocol === 'string' && protocol.includes(',')) protocol = protocol.split(',')[0].trim();

      let host = (req.headers['x-forwarded-host'] as string) || req.headers['host'] || req.get('host') || '';
      if (Array.isArray(host)) host = host[0];
      if (typeof host === 'string' && host.includes(',')) host = host.split(',')[0].trim();

      // If host contains localhost / 127.0.0.1 or is empty, inspect origin or referer header from the browser
      const clientOrigin = (req.headers['origin'] as string) || (req.headers['referer'] as string);
      if ((!host || host.includes('localhost') || host.includes('127.0.0.1')) && clientOrigin) {
        try {
          const parsed = new URL(clientOrigin);
          protocol = parsed.protocol.replace(':', '');
          host = parsed.host;
        } catch {}
      }

      // Check if customDomain is specified in siteConfig or DB
      const siteConf = db.siteConfig as any;
      if (siteConf && siteConf.customDomain && typeof siteConf.customDomain === 'string' && siteConf.customDomain.trim()) {
        try {
          const rawDom = siteConf.customDomain.trim();
          const parsedDom = rawDom.startsWith('http') ? new URL(rawDom) : new URL(`https://${rawDom}`);
          protocol = parsedDom.protocol.replace(':', '');
          host = parsedDom.host;
        } catch {}
      }

      if (!host) {
        host = 'localhost:3000';
      }

      const baseUrl = `${protocol}://${host}`;

      // Build product reference list for resellers reading from db.productVariants!
      const productReferenceTable = db.products.map(p => {
        const variants = db.productVariants.filter(v => v.productId === p.id && v.isActive);
        return {
          id: p.id,
          name: p.name,
          game: p.game,
          category: p.category,
          deviceType: p.deviceType,
          externalPid: p.externalPid || '100',
          variants: variants.map(v => ({
            variantId: v.id,
            durationLabel: v.durationLabel,
            durationHours: v.durationHours,
            pid: p.externalPid || '100',
            price: v.price,
            resellerPrice: v.resellerPrice,
            stockCount: db.digitalKeys.filter(k => k.productId === p.id && (!k.isUsed || k.status === 'ACTIVE') && !k.assignedUserId).length,
          })),
        };
      });

      res.json({
        apiKey: dbUser?.apiKey || user.id,
        detectedDomain: baseUrl,
        host: host,
        apiUrl: `${baseUrl}/api/v1/reseller/buy`,
        phpScriptUrl: `${baseUrl}/api/reseller_v1.php`,
        rootPhpScriptUrl: `${baseUrl}/reseller_v1.php`,
        endpoints: [
          {
            name: 'Standard REST API (JSON POST)',
            url: `${baseUrl}/api/v1/reseller/buy`,
            method: 'POST',
            contentType: 'application/json',
          },
          {
            name: 'PHP v1 Compatibility Script',
            url: `${baseUrl}/api/reseller_v1.php`,
            method: 'POST',
            contentType: 'application/x-www-form-urlencoded or application/json',
          },
          {
            name: 'Root PHP Script Endpoint',
            url: `${baseUrl}/reseller_v1.php`,
            method: 'POST',
            contentType: 'application/x-www-form-urlencoded or application/json',
          },
        ],
        productReferenceTable,
        documentation: {
          method: 'POST',
          contentType: 'application/json',
          parameters: {
            api_key: 'Your unique reseller API key',
            action: 'buy',
            product_id: 'Product PID (2 or 3-digit number, e.g. 155, 66, 150)',
            duration: 'Duration plan label (e.g. 1 Hours, 1 DAYS, 1 Day Non-Root)',
            quantity: 'Number of keys to buy (1-100, default 1)',
            android_id: 'Optional Android Device ID',
          },
          exampleCurl: `curl -X POST "${baseUrl}/api/v1/reseller/buy" \\\n  -H "Content-Type: application/json" \\\n  -d '{"api_key": "${dbUser?.apiKey}", "action": "buy", "product_id": "155", "duration": "1 Hours", "quantity": 1}'`,
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch API credentials.' });
    }
  }

  /**
   * Regenerate user's API key
   */
  public static async regenerateApiKey(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Please log in.' });
        return;
      }

      const dbUser = db.users.find(u => u.id === user.id);
      if (!dbUser) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      dbUser.apiKey = `nexa_live_${crypto.randomBytes(16).toString('hex')}`;
      db.saveSync();

      // Sync regenerated API key to Firestore
      FirestoreSyncService.syncUserApiKey(dbUser.id, dbUser.apiKey).catch(() => {});

      db.logActivity(dbUser.id, dbUser.username, 'RESELLER_API_KEY_REGENERATE', 'User regenerated their Outbound Reseller API Key.');

      res.json({
        message: 'Reseller API Key successfully regenerated.',
        apiKey: dbUser.apiKey,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to regenerate API key.' });
    }
  }
}
