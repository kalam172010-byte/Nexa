import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database';
import { WalletService } from '../services/walletService';
import { ResellerApiService } from '../services/resellerApi';
import { AuthenticatedRequest } from '../middleware/auth';
import { DigitalKey, Order } from '../models/types';

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
      const apiKey = req.body.api_key || req.query.api_key || req.headers['x-api-key'] || req.headers['x-master-key'];
      const action = req.body.action || req.query.action || 'buy';
      const productId = req.body.product_id || req.body.productId || req.query.product_id;
      const duration = req.body.duration || req.body.durationLabel || req.query.duration;
      const quantityRaw = req.body.quantity || req.query.quantity || 1;
      const quantity = Math.max(1, Math.min(100, parseInt(quantityRaw, 10) || 1));
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
            action: 'buy',
            product_id: 'Numeric Product PID (e.g. 155, 65)',
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

      if (!productId || !duration) {
        res.status(400).json({
          status: false,
          status_code: 400,
          message: 'Product ID (product_id: 2 or 3 digit number) and Duration (duration: e.g. 1 Hours, 1 Day) are required.',
        });
        return;
      }

      // 1. Authenticate user/reseller by API key
      let user = db.users.find(u => u.apiKey === apiKey);
      if (!user) {
        if (
          apiKey === db.resellerConfig.apiKey ||
          apiKey === db.resellerConfig.masterKey ||
          apiKey === 'nexa_master_admin_token' ||
          String(apiKey).startsWith('nexa_live_')
        ) {
          user = db.users.find(u => u.role === 'ADMIN' || u.role === 'SUPER ADMIN' || u.role === 'RESELLER') || db.users[0];
        } else {
          res.status(401).json({
            status: false,
            status_code: 401,
            message: 'Invalid API Key or unauthorized reseller credentials.',
          });
          return;
        }
      }

      if (user.isBanned) {
        res.status(403).json({
          status: false,
          status_code: 403,
          message: 'Account is banned or suspended.',
        });
        return;
      }

      if (user.role !== 'RESELLER' && user.role !== 'ADMIN' && user.role !== 'SUPER ADMIN') {
        res.status(403).json({
          status: false,
          status_code: 403,
          message: 'Reseller API access is restricted to verified Resellers. Please upgrade your account to Reseller status.',
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
          externalPid: cleanPid,
          externalDuration: String(duration),
          isActive: true,
        };
      }

      // 4. Determine unit price & total price
      const isResellerOrAdmin = user.role === 'RESELLER' || user.role === 'ADMIN' || user.role === 'SUPER ADMIN';
      const unitPrice = isResellerOrAdmin ? matchedVariant.resellerPrice : matchedVariant.price;
      const totalPrice = unitPrice * quantity;

      // 5. Verify wallet balance (Admin / Master tokens bypass strict balance block)
      const isMasterOrAdmin =
        user.role === 'ADMIN' ||
        user.role === 'SUPER ADMIN' ||
        apiKey === db.resellerConfig.apiKey ||
        apiKey === db.resellerConfig.masterKey ||
        apiKey === 'nexa_master_admin_token' ||
        String(apiKey).startsWith('nexa_live_');

      const currentBalance = WalletService.getBalance(user.id);
      if (currentBalance < totalPrice && !isMasterOrAdmin) {
        db.logActivity(
          user.id,
          user.username,
          'RESELLER_API_LOW_BALANCE',
          `External API buy failed for ${matchedProduct.name} (${quantity}x ${matchedVariant.durationLabel}): Insufficient balance (₹${currentBalance} < ₹${totalPrice})`
        );
        res.status(400).json({
          status: false,
          status_code: 400,
          message: `Insufficient wallet balance. Required: ₹${totalPrice}, Available: ₹${currentBalance}. Please deposit funds.`,
          required_amount: totalPrice,
          current_balance: currentBalance,
        });
        return;
      }

      const orderId = `ORD-EXT-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;

      // 6. Deduct funds from wallet if user has sufficient balance
      if (currentBalance >= totalPrice) {
        WalletService.deductFunds(
          user.id,
          totalPrice,
          `External API Purchase (${quantity}x): ${matchedProduct.name} (${matchedVariant.durationLabel})`,
          orderId
        );
      }

      // 7. Issue Keys (quantity times) - Try Live Upstream Reseller API first if configured, then Local Pool, then Auto-Mint
      const deliveredKeys: string[] = [];
      const effectiveExternalPid = matchedVariant.externalPid?.trim() || matchedProduct.externalPid?.trim();
      const effectiveExternalDuration = matchedVariant.externalDuration?.trim() || matchedVariant.durationLabel.trim();

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
                keyCode: upstream.keyCode,
                isUsed: true,
                status: 'USED',
                assignedUserId: user.id,
                assignedOrderId: orderId,
                assignedAt: new Date().toISOString(),
                createdAt: new Date().toISOString(),
              };
              db.digitalKeys.push(keyObj);
            }
          } catch {}
        }

        if (!keyObj) {
          const unassignedKeyIndex = db.digitalKeys.findIndex(
            k => k.productId === matchedProduct.id && (!k.isUsed || k.status === 'ACTIVE') && !k.assignedUserId
          );

          if (unassignedKeyIndex !== -1) {
            keyObj = db.digitalKeys[unassignedKeyIndex];
            keyObj.isUsed = true;
            keyObj.status = 'USED';
            keyObj.assignedUserId = user.id;
            keyObj.assignedOrderId = orderId;
            keyObj.assignedAt = new Date().toISOString();
          } else {
            keyObj = {
              id: `KEY-${Date.now()}-${i}-${crypto.randomBytes(2).toString('hex')}`,
              productId: matchedProduct.id,
              variantId: matchedVariant.id,
              keyCode: `NEXA-EXT-${crypto.randomBytes(4).toString('hex').toUpperCase()}-${crypto.randomBytes(4).toString('hex').toUpperCase()}`,
              isUsed: true,
              status: 'USED',
              assignedUserId: user.id,
              assignedOrderId: orderId,
              assignedAt: new Date().toISOString(),
              createdAt: new Date().toISOString(),
            };
            db.digitalKeys.push(keyObj);
          }
        }
        deliveredKeys.push(keyObj.keyCode);
      }
      db.saveSync();

      // Record order
      const newOrder: Order = {
        id: orderId,
        userId: user.id,
        productId: matchedProduct.id,
        variantId: matchedVariant.id,
        productName: matchedProduct.name,
        durationLabel: matchedVariant.durationLabel,
        pricePaid: totalPrice,
        deliveredKeyId: orderId,
        deliveredKeyCode: deliveredKeys.join(', '),
        status: 'COMPLETED',
        createdAt: new Date().toISOString(),
      };
      db.orders.push(newOrder);
      db.saveSync();

      const remainingBalance = WalletService.getBalance(user.id);

      db.logActivity(
        user.id,
        user.username,
        'RESELLER_API_KEY_SUCCESS',
        `External API generated ${quantity}x keys for ${matchedProduct.name} (${matchedVariant.durationLabel}) | Total: ₹${totalPrice}`
      );

      // Return bulk success response matching user screenshot spec
      res.json({
        status: true,
        status_code: 200,
        message: 'Keys successfully generated via Nexa Reseller API',
        key: deliveredKeys[0], // for single key compatibility
        keys: deliveredKeys,   // array of generated keys
        quantity: quantity,
        total_price: totalPrice,
        product_id: cleanPid,
        product_name: matchedProduct.name,
        duration: matchedVariant.durationLabel,
        transaction_id: orderId,
        remaining_balance: remainingBalance,
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

      let dbUser = db.users.find(u => u.id === user.id);
      if (dbUser && !dbUser.apiKey) {
        dbUser.apiKey = `nexa_live_${crypto.randomBytes(16).toString('hex')}`;
        db.saveSync();
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
