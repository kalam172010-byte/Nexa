import { Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { FirestoreSyncService } from '../services/firestoreSync';
import { emailService } from '../services/emailService';

export class KeyController {
  public static async getUserKeys(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      // Trigger background sync without blocking the response so My Keys loads in < 2ms
      FirestoreSyncService.pullAndMergeExternalState(false).catch(() => {});

      const { status, search } = req.query;
      const headerUserId = (req.headers['x-user-id'] as string | undefined)?.trim();
      const headerEmail = (req.headers['x-user-email'] as string | undefined)?.toLowerCase().trim();

      const dbUser = db.users.find(
        u =>
          u.id === user.id ||
          u.firebaseUid === user.id ||
          u.email.toLowerCase() === user.email.toLowerCase() ||
          (headerUserId && (u.id === headerUserId || u.firebaseUid === headerUserId)) ||
          (headerEmail && u.email.toLowerCase() === headerEmail)
      );
      const userAltIds = new Set<string>(FirestoreSyncService.getLinkedUserIds(dbUser || user, user.id));
      if (headerUserId) userAltIds.add(headerUserId);
      if (user.role === 'ADMIN' || user.role === 'SUPER ADMIN') {
        userAltIds.add('USR-KALAM-172010');
        userAltIds.add('tnqy7LYfgwgzYpoQGqljC4H6bKc2');
      }
      const userEmail = (dbUser?.email || user.email || headerEmail || '').toLowerCase().trim();
      const userApiKey = (dbUser?.apiKey || user.apiKey || '').trim();

      const isUserKeyMatch = (k: any) => {
        if (!k.assignedUserId && !k.assignedUserEmail && !k.assignedOrderId) return false;
        if (k.assignedUserId && userAltIds.has(k.assignedUserId)) return true;
        if (userEmail && k.assignedUserEmail && k.assignedUserEmail.toLowerCase().trim() === userEmail) return true;
        if (headerEmail && k.assignedUserEmail && k.assignedUserEmail.toLowerCase().trim() === headerEmail) return true;
        if (userApiKey && k.assignedApiKey && k.assignedApiKey.trim() === userApiKey) return true;
        return false;
      };

      // Update any expired keys based on current time
      const now = new Date();
      let statusUpdated = false;
      db.digitalKeys.forEach(k => {
        if (isUserKeyMatch(k) && k.status === 'ACTIVE' && k.expiresAt) {
          if (new Date(k.expiresAt) < now) {
            k.status = 'EXPIRED';
            statusUpdated = true;
          }
        }
      });
      if (statusUpdated) db.save();

      let userKeys = db.digitalKeys
        .filter(k => isUserKeyMatch(k))
        .map(key => {
          const product = db.products.find(p => p.id === key.productId);
          const variant = db.productVariants.find(v => v.id === key.variantId);
          const order = db.orders.find(o => o.id === key.assignedOrderId || o.deliveredKeyId === key.id);
          const isApi =
            key.purchaseSource === 'API' ||
            order?.purchaseSource === 'API' ||
            String(key.assignedOrderId || '').startsWith('API-ORD-') ||
            String(key.assignedOrderId || '').startsWith('ORD-EXT-') ||
            String(key.id).includes('EXT') ||
            String(key.id).includes('API');
          return {
            id: key.id,
            keyCode: key.keyCode,
            productId: key.productId,
            variantId: key.variantId,
            status: key.status || 'ACTIVE',
            isUsed: Boolean(key.isUsed),
            assignedUserId: key.assignedUserId,
            assignedUserEmail: key.assignedUserEmail,
            assignedOrderId: key.assignedOrderId,
            assignedAt: key.assignedAt || key.createdAt,
            expiresAt: key.expiresAt,
            createdAt: key.createdAt,
            productName: key.productName || (product ? product.name : 'Digital Product'),
            gameName: key.gameName || (product ? product.game : 'Mobile Game'),
            durationLabel: key.durationLabel || (variant ? variant.durationLabel : 'Standard Key'),
            purchaseSource: isApi ? ('API' as const) : ('WEB' as const),
            purchaseSourceLabel: isApi ? 'Buy from API' : 'Buy from Website',
          };
        });

      // Filter by status
      if (status && status !== 'ALL') {
        userKeys = userKeys.filter(k => k.status === (status as string).toUpperCase());
      }

      // Search by product name or key snippet
      if (search && typeof search === 'string') {
        const query = search.toLowerCase().trim();
        userKeys = userKeys.filter(
          k => k.keyCode.toLowerCase().includes(query) ||
               k.productName.toLowerCase().includes(query) ||
               k.durationLabel.toLowerCase().includes(query)
        );
      }

      // Sort newest first
      userKeys.sort((a, b) => new Date(b.assignedAt || 0).getTime() - new Date(a.assignedAt || 0).getTime());

      res.json({ keys: userKeys });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch user keys.' });
    }
  }

  public static async markKeyUsed(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const userAltIds = new Set<string>([user.id]);
      if ((user as any).firebaseUid) userAltIds.add((user as any).firebaseUid);
      const dbUser = db.users.find(
        u => u.id === user.id || u.firebaseUid === user.id || u.email.toLowerCase() === user.email.toLowerCase()
      );
      if (dbUser) {
        userAltIds.add(dbUser.id);
        if (dbUser.firebaseUid) userAltIds.add(dbUser.firebaseUid);
      }
      const userEmail = (dbUser?.email || user.email || '').toLowerCase().trim();
      const userApiKey = (dbUser?.apiKey || user.apiKey || '').trim();

      const { id } = req.params;
      const key = db.digitalKeys.find(
        k =>
          k.id === id &&
          ((k.assignedUserId && userAltIds.has(k.assignedUserId)) ||
            (userEmail && k.assignedUserEmail && k.assignedUserEmail.toLowerCase().trim() === userEmail) ||
            (userApiKey && k.assignedApiKey && k.assignedApiKey.trim() === userApiKey))
      );
      if (!key) {
        res.status(404).json({ error: 'Key not found in your inventory.' });
        return;
      }

      key.status = 'USED';
      key.isUsed = true;
      db.save();

      res.json({ message: 'Key marked as USED successfully.', key });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update key status.' });
    }
  }

  public static async sendKeyReceipt(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      emailService.applyHeaderEmailConfigIfMissing(req.headers['x-saved-email-config'] as string | undefined);

      const { id } = req.params;
      const body = req.body || {};
      const headerEmail = (req.headers['x-user-email'] as string | undefined)?.toLowerCase().trim();
      const dbUser = db.users.find(
        u => u.id === user.id || u.firebaseUid === user.id || u.email.toLowerCase() === user.email.toLowerCase()
      );
      const targetEmail = (body.email || dbUser?.email || user.email || headerEmail || '').trim().toLowerCase();

      if (!targetEmail || !targetEmail.includes('@')) {
        res.status(400).json({ error: 'A valid recipient email address is required to send the receipt.' });
        return;
      }

      const keyRecord = db.digitalKeys.find(
        k => k.id === id || (body.keyCode && k.keyCode === body.keyCode)
      );
      const product = keyRecord ? db.products.find(p => p.id === keyRecord.productId) : undefined;
      const variant = keyRecord ? db.productVariants.find(v => v.id === keyRecord.variantId) : undefined;
      const order = keyRecord
        ? db.orders.find(o => o.id === keyRecord.assignedOrderId || o.deliveredKeyId === keyRecord.id)
        : undefined;

      const keyCodeRaw = String(body.keyCode || keyRecord?.keyCode || 'N/A');
      const keyCodes = keyCodeRaw
        .split('\n')
        .map(s => s.trim())
        .filter(Boolean);

      const orderId = String(body.orderId || order?.id || keyRecord?.assignedOrderId || id || `ORD-${Date.now()}`);
      const productName = String(body.productName || keyRecord?.productName || product?.name || 'VIP License Key');
      const gameName = String(body.gameName || keyRecord?.gameName || product?.game || 'FREE FIRE');
      const durationLabel = String(body.durationLabel || keyRecord?.durationLabel || variant?.durationLabel || 'Standard');
      const pricePaid = Number(body.pricePaid ?? order?.pricePaid ?? variant?.price ?? 0);
      const purchaseSourceLabel = String(
        body.purchaseSourceLabel ||
          keyRecord?.purchaseSourceLabel ||
          (keyRecord?.purchaseSource === 'API' ? 'Buy from API' : 'Buy from Website')
      );
      const expiresAt = body.expiresAt || keyRecord?.expiresAt;
      const purchasedAt = body.assignedAt || keyRecord?.assignedAt || keyRecord?.createdAt;

      const result = await emailService.sendKeyPurchaseReceipt({
        toEmail: targetEmail,
        username: dbUser?.username || user.username,
        orderId,
        productName,
        gameName,
        durationLabel,
        keyCodes: keyCodes.length > 0 ? keyCodes : [keyCodeRaw],
        pricePaid,
        remainingBalance: dbUser?.balance ?? user.balance,
        purchaseSourceLabel,
        expiresAt,
        purchasedAt,
      });

      res.json({
        success: result.success,
        simulated: result.simulated,
        sentTo: result.sentTo,
        message: result.message,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to send key receipt email.' });
    }
  }
}
