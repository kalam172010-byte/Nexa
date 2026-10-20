import { Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { FirestoreSyncService } from '../services/firestoreSync';

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
}
