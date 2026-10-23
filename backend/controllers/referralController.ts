import { Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { ReferralRecord } from '../models/types';

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
      const totalEarnings = referrals.reduce((sum, r) => sum + (Number(r.rewardEarned) || 0), 0);

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
        commissionPercent: db.siteConfig?.referralCommissionPct || 5,
        minWithdrawal: db.siteConfig?.minReferralWithdrawal || 100,
        referrals,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch referral details.' });
    }
  }

  // --- Admin Referral System APIs ---
  public static async getAdminReferrals(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const referrals = db.referrals || [];
      const users = db.users || [];

      const totalReferrals = referrals.length;
      const totalCommissionsPaid = referrals.reduce((sum, r) => sum + (Number(r.rewardEarned) || 0), 0);
      const successfulReferrals = referrals.filter(r => r.hasPurchased).length;

      // Map referrals with referrer and referred user details
      const detailedReferrals = referrals.map(r => {
        const referrer = users.find(u => u.id === r.referrerId || (r.referralCode && u.referralCode === r.referralCode));
        const referredUser = users.find(u => u.id === r.referredUserId);
        return {
          ...r,
          referrerUsername: referrer?.username || 'Unknown',
          referrerEmail: referrer?.email || 'N/A',
          referredUsername: referredUser?.username || r.referredUsername || 'New Member',
          referredEmail: referredUser?.email || 'N/A',
          referredUserSpent: db.orders
            .filter(o => o.userId === r.referredUserId)
            .reduce((sum, o) => sum + (Number(o.pricePaid) || 0), 0),
        };
      });

      // Top referrers leaderboard
      const referrerMap = new Map<string, { id: string; userId: string; username: string; email: string; referralCode: string; referredCount: number; totalEarned: number }>();
      users.forEach(u => {
        if (!u.referralCode) return;
        const uRefs = referrals.filter(r => r.referrerId === u.id || (r.referralCode && r.referralCode === u.referralCode));
        const earned = uRefs.reduce((sum, r) => sum + (Number(r.rewardEarned) || 0), 0);
        referrerMap.set(u.id, {
          id: u.id,
          userId: u.id,
          username: u.username,
          email: u.email,
          referralCode: u.referralCode,
          referredCount: uRefs.length,
          totalEarned: earned,
        });
      });

      const topReferrers = Array.from(referrerMap.values())
        .filter(r => r.referredCount > 0 || r.totalEarned > 0)
        .sort((a, b) => b.totalEarned - a.totalEarned || b.referredCount - a.referredCount)
        .slice(0, 15);

      res.json({
        stats: {
          totalReferredUsers: totalReferrals,
          totalCommissionsPaid,
          successfulReferrals,
          activePartners: topReferrers.length,
          currentCommissionPct: db.siteConfig?.referralCommissionPct || 5,
          signupBonus: db.siteConfig?.referralSignupBonus || 0,
          isEnabled: db.siteConfig?.isReferralEnabled ?? true,
          minWithdrawal: db.siteConfig?.minReferralWithdrawal || 100,
        },
        referrals: detailedReferrals,
        topReferrers,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch admin referral data.' });
    }
  }

  public static async updateReferralSettings(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { commissionPct, signupBonus, isEnabled, isReferralEnabled, minWithdrawal } = req.body;
      const updates: any = {};

      if (commissionPct !== undefined) updates.referralCommissionPct = Number(commissionPct);
      if (signupBonus !== undefined) updates.referralSignupBonus = Number(signupBonus);
      if (isEnabled !== undefined) updates.isReferralEnabled = Boolean(isEnabled);
      if (isReferralEnabled !== undefined) updates.isReferralEnabled = Boolean(isReferralEnabled);
      if (minWithdrawal !== undefined) updates.minReferralWithdrawal = Number(minWithdrawal);

      const updatedConfig = db.updateSiteConfig(updates);

      res.json({
        message: 'Referral program settings updated successfully.',
        stats: {
          currentCommissionPct: updatedConfig.referralCommissionPct || 5,
          signupBonus: updatedConfig.referralSignupBonus || 0,
          isEnabled: updatedConfig.isReferralEnabled ?? true,
          minWithdrawal: updatedConfig.minReferralWithdrawal || 100,
        },
        settings: updatedConfig,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update referral settings.' });
    }
  }

  public static async manualAssignReferral(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const targetUserKey = req.body.userId || req.body.targetUsernameOrEmail;
      const sponsorKey = req.body.sponsorCodeOrUser || req.body.sponsorUsernameOrCode;

      if (!targetUserKey || !sponsorKey) {
        res.status(400).json({ error: 'Please provide both target user and sponsor referral code or username.' });
        return;
      }

      const qTarget = String(targetUserKey).toLowerCase().trim();
      const qSponsor = String(sponsorKey).toLowerCase().trim();

      const targetUser = db.users.find(u => u.id === qTarget || u.username.toLowerCase() === qTarget || u.email.toLowerCase() === qTarget);
      const sponsorUser = db.users.find(u => u.id === qSponsor || u.username.toLowerCase() === qSponsor || (u.referralCode && u.referralCode.toLowerCase() === qSponsor) || u.email.toLowerCase() === qSponsor);

      if (!targetUser) {
        res.status(404).json({ error: `Target user "${targetUserKey}" not found.` });
        return;
      }
      if (!sponsorUser) {
        res.status(404).json({ error: `Sponsor user/code "${sponsorKey}" not found.` });
        return;
      }

      if (targetUser.id === sponsorUser.id) {
        res.status(400).json({ error: 'User cannot refer themselves.' });
        return;
      }

      let existingRef = db.referrals.find(r => r.referredUserId === targetUser.id);
      if (existingRef) {
        existingRef.referrerId = sponsorUser.id;
        existingRef.referralCode = sponsorUser.referralCode || `REF_${sponsorUser.id.slice(0, 6)}`;
      } else {
        const newRefRecord: ReferralRecord = {
          id: `REF-MANUAL-${Date.now()}`,
          referrerId: sponsorUser.id,
          referredUserId: targetUser.id,
          referredUsername: targetUser.username,
          referralCode: sponsorUser.referralCode || `REF_${sponsorUser.id.slice(0, 6)}`,
          hasPurchased: false,
          rewardEarned: 0,
          createdAt: new Date().toISOString(),
        };
        db.referrals.push(newRefRecord);
        existingRef = newRefRecord;
      }
      db.saveSync();

      res.json({
        message: `Successfully linked @${targetUser.username} to sponsor @${sponsorUser.username} (${sponsorUser.referralCode})`,
        referral: existingRef,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to assign referral.' });
    }
  }

  public static async creditReferralCommission(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const partnerKey = req.body.userId || req.body.partnerUserId;
      const creditAmt = req.body.amount;
      const note = req.body.note || req.body.reason;

      if (!partnerKey || !creditAmt || Number(creditAmt) <= 0) {
        res.status(400).json({ error: 'Please specify partner user ID and valid positive credit amount.' });
        return;
      }

      const partner = db.users.find(u => u.id === partnerKey || u.username.toLowerCase() === String(partnerKey).toLowerCase() || u.email.toLowerCase() === String(partnerKey).toLowerCase());
      if (!partner) {
        res.status(404).json({ error: 'Partner user account not found.' });
        return;
      }

      const amountNum = Number(creditAmt);
      partner.balance = Number(((partner.balance || 0) + amountNum).toFixed(2));

      db.transactions.push({
        id: `TXN-REF-${Date.now()}`,
        userId: partner.id,
        userEmail: partner.email,
        type: 'REFERRAL_COMMISSION',
        amount: amountNum,
        status: 'SUCCESS',
        description: note || `Manual Admin Partner Commission Credit +₹${amountNum}`,
        createdAt: new Date().toISOString(),
      });
      db.saveSync();

      res.json({
        message: `Credited +₹${amountNum} referral commission to @${partner.username}`,
        newBalance: partner.balance,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to credit referral commission.' });
    }
  }
}
