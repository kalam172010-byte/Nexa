import { Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';

export class KeyController {
  public static async getUserKeys(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const { status, search } = req.query;

      // Update any expired keys based on current time
      const now = new Date();
      db.digitalKeys.forEach(k => {
        if (k.assignedUserId === user.id && k.status === 'ACTIVE' && k.expiresAt) {
          if (new Date(k.expiresAt) < now) {
            k.status = 'EXPIRED';
          }
        }
      });
      db.save();

      let userKeys = db.digitalKeys
        .filter(k => k.assignedUserId === user.id)
        .map(key => {
          const product = db.products.find(p => p.id === key.productId);
          const variant = db.productVariants.find(v => v.id === key.variantId);
          return {
            id: key.id,
            keyCode: key.keyCode,
            status: key.status,
            assignedAt: key.assignedAt,
            expiresAt: key.expiresAt,
            productName: product ? product.name : 'Digital Product',
            gameName: product ? product.game : 'Mobile Game',
            durationLabel: variant ? variant.durationLabel : 'Standard Key',
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

      const { id } = req.params;
      const key = db.digitalKeys.find(k => k.id === id && k.assignedUserId === user.id);
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
