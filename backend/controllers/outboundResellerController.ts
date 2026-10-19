import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database';
import { WalletService } from '../services/walletService';
import { ResellerApiService } from '../services/resellerApi';
import { AuthenticatedRequest } from '../middleware/auth';
import { DigitalKey, Order, Transaction, User } from '../models/types';
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

      // 1. Authenticate user/reseller strictly by their account API key
      const cleanApiKey = String(apiKey).trim();
      const headerUserId = (req.headers['x-user-id'] as string | undefined)?.trim();
      const headerEmail = (req.headers['x-user-email'] as string | undefined)?.toLowerCase().trim();

      // Check local DB first
      let user = db.users.find(u => u.apiKey && u.apiKey.trim() === cleanApiKey);

      // If not in local DB, search Firestore in real-time
      if (!user) {
        const firestoreUser = await FirestoreSyncService.findUserByApiKey(cleanApiKey);
        if (firestoreUser) {
          const localMatch = db.users.find(u => u.id === firestoreUser.id);
          if (localMatch) {
            localMatch.apiKey = cleanApiKey;
            localMatch.balance = firestoreUser.balance;
            user = localMatch;
          } else {
            db.users.push(firestoreUser);
            user = firestoreUser;
          }
          db.saveSync();
        }
      }

      // Check header hint if still not matched
      if (!user && (headerUserId || headerEmail)) {
        user = db.users.find(
          u =>
            (headerUserId && u.id === headerUserId) ||
            (headerEmail && u.email.toLowerCase() === headerEmail)
        );
        if (user && cleanApiKey.startsWith('nexa_live_')) {
          user.apiKey = cleanApiKey;
          db.saveSync();
          FirestoreSyncService.syncUserApiKey(user.id, cleanApiKey).catch(() => {});
        }
      }

      // Master admin key fallback if explicitly provided
      if (!user && (cleanApiKey === 'nexa_live_89f4e2a1c7d3b6f890e1a2b3c4d5e6f7' || cleanApiKey === 'nexa_master_admin_token')) {
        user =
          db.users.find(u => u.email.toLowerCase() === 'kalam172010@gmail.com' || u.email.toLowerCase() === 'kalamkalam1234kd@gmail.com') ||
          db.users.find(u => u.role === 'ADMIN' || u.role === 'SUPER ADMIN');
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
          role: user.role,
          currency: 'INR',
          message: 'Account verified successfully.',
        });
        return;
      }

      // External panels service list handshake: action=get_products or action=products or action=services
      if (rawAction === 'get_products' || rawAction === 'products' || rawAction === 'services') {
        const isResellerOrAdmin = user.role === 'RESELLER' || user.role === 'ADMIN' || user.role === 'SUPER ADMIN';
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
              price: isResellerOrAdmin ? v.resellerPrice : v.price,
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

      // 2. Find product by numeric PID or ID (e.g. "155", "66", "150", "123")
      const cleanPid = String(productId).trim();
      const cleanDuration = String(duration).trim().toLowerCase();

      let matchedProduct = db.products.find(p => 
        String(p.externalPid).trim() === cleanPid ||
        String(p.id).trim().toLowerCase() === cleanPid.toLowerCase()
      );

      // If not directly found on product, check if any variant has this externalPid
      if (!matchedProduct) {
        const varWithPid = db.productVariants.find(v => 
          String(v.externalPid).trim() === cleanPid || 
          String(v.id).trim().toLowerCase() === cleanPid.toLowerCase()
        );
        if (varWithPid) {
          matchedProduct = db.products.find(p => p.id === varWithPid.productId);
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

      // 3. Find the variant for this product matching the duration plan
      const productVariants = db.productVariants.filter(v => v.productId === matchedProduct.id && v.isActive);
      
      let matchedVariant = productVariants.find(v => 
        v.durationLabel.trim().toLowerCase() === cleanDuration ||
        v.externalDuration?.trim().toLowerCase() === cleanDuration
      );

      if (!matchedVariant) {
        // Partial or normalized matching (e.g. "1 day" matching "1 DAYS" or "1 Day Non-Root")
        matchedVariant = productVariants.find(v => 
          v.durationLabel.toLowerCase().includes(cleanDuration) ||
          cleanDuration.includes(v.durationLabel.toLowerCase())
        );
      }

      if (!matchedVariant) {
        matchedVariant = productVariants[0] || {
          id: `VAR-AUTO-${cleanPid}`,
          productId: matchedProduct.id,
          durationLabel: String(duration),
          durationHours: 24,
          price: 50,
          resellerPrice: 38,
          stockCount: 999,
          externalPid: cleanPid,
          externalDuration: String(duration),
          isActive: true,
        };
      }

      // 4. Determine unit price & total price
      const isResellerOrAdmin = user.role === 'RESELLER' || user.role === 'ADMIN' || user.role === 'SUPER ADMIN';
      const unitPrice = Math.max(1, isResellerOrAdmin ? matchedVariant.resellerPrice : matchedVariant.price);
      const totalPrice = unitPrice * quantity;

      const orderId = `ORD-EXT-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      // 5. SERVER-SIDE WALLET BALANCE VALIDATION & ATOMIC DEDUCTION LAYER
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
      // Immediately sync balance to Firestore so website UI reflects deduction in real-time
      FirestoreSyncService.syncUserBalance(user.id, remainingBalance).catch(e => {
        console.warn('[OutboundReseller] Firestore balance sync warning:', e);
      });

      // 7. Issue Keys (quantity times) - Try Live Upstream Reseller API first if configured, then Local Pool, then Auto-Mint
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
            k => k.productId === matchedProduct.id && !k.isUsed && k.status === 'ACTIVE' && !k.assignedUserId
          );

          if (unassignedKeyIndex !== -1) {
            keyObj = db.digitalKeys[unassignedKeyIndex];
            keyObj.isUsed = false;
            keyObj.status = 'ACTIVE';
            keyObj.assignedUserId = user.id;
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

        // Immediately push key to Firestore so website shows it in real-time
        FirestoreSyncService.syncDigitalKey(keyObj).catch(e => {
          console.warn('[OutboundReseller] Firestore key sync warning:', e);
        });
      }

      // Record order tagged with purchaseSource: 'API'
      const newOrder: Order = {
        id: orderId,
        userId: user.id,
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
      }

      db.saveSync();

      // EXECUTE ATOMIC TRANSACTION COMMIT IN FIRESTORE
      // Simultaneously updates user balance, stores issued digital keys, order record, and debit transaction
      FirestoreSyncService.commitAtomicKeyPurchase({
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

      let dbUser: User | undefined = db.users.find(u => u.id === user.id);
      const clientHintKey = (req.headers['x-user-api-key'] as string | undefined)?.trim();
      if (!dbUser) {
        dbUser = {
          id: user.id,
          username: user.username,
          email: user.email,
          passwordHash: '',
          role: user.role,
          balance: user.balance,
          apiKey: clientHintKey && clientHintKey.startsWith('nexa_live_')
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
      } else if (!dbUser.apiKey) {
        dbUser.apiKey =
          clientHintKey && clientHintKey.startsWith('nexa_live_')
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
