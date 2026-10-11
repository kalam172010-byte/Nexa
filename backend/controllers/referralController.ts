import { Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';

export class ReferralController {
  public static async getReferralInfo(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const referrals = db.referrals.filter(r => r.referrerId === user.id);
      const totalReferrals = referrals.length;
      const successfulReferrals = referrals.filter(r => r.hasPurchased).length;
      const totalEarnings = referrals.reduce((sum, r) => sum + r.rewardEarned, 0);

      // Base app URL for referral link
      const host = req.get('host') || 'localhost:3000';
      const protocol = req.protocol || 'http';
      const referralLink = `${protocol}://${host}/?ref=${user.referralCode}`;

      res.json({
        referralCode: user.referralCode,
        referralLink,
        totalReferrals,
        successfulReferrals,
        totalEarnings,
        commissionPercent: 5,
        minWithdrawal: 100,
        referrals,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch referral details.' });
    }
  }
}
