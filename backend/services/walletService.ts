import crypto from 'crypto';
import { db } from '../db/database';
import { User, Transaction } from '../models/types';

export class WalletService {
  public static getBalance(userId: string): number {
    const user = db.users.find(u => u.id === userId);
    return user ? user.balance : 0;
  }

  public static addFunds(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string,
    type: 'DEPOSIT' | 'REFERRAL_BONUS' | 'ADMIN_ADJUST' | 'REFUND' = 'DEPOSIT'
  ): { user: User; transaction: Transaction } {
    if (amount <= 0) {
      throw new Error('Credit amount must be greater than zero.');
    }

    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found.');

    user.balance = Math.round((user.balance + amount) * 100) / 100;
    user.updatedAt = new Date().toISOString();

    const transaction: Transaction = {
      id: `TXN-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      userId,
      type,
      amount: Math.round(amount * 100) / 100,
      description,
      referenceId,
      status: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    db.transactions.unshift(transaction);
    db.saveSync();

    return { user, transaction };
  }

  public static deductFunds(
    userId: string,
    amount: number,
    description: string,
    referenceId?: string
  ): { user: User; transaction: Transaction } {
    if (amount <= 0) {
      throw new Error('Debit amount must be greater than zero.');
    }

    const user = db.users.find(u => u.id === userId);
    if (!user) throw new Error('User not found.');

    if (user.balance < amount) {
      throw new Error(`Insufficient wallet balance. You have ₹${user.balance.toFixed(2)}, required ₹${amount.toFixed(2)}.`);
    }

    user.balance = Math.round((user.balance - amount) * 100) / 100;
    user.updatedAt = new Date().toISOString();

    const transaction: Transaction = {
      id: `TXN-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      userId,
      type: 'PURCHASE',
      amount: -Math.round(amount * 100) / 100,
      description,
      referenceId,
      status: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    db.transactions.unshift(transaction);
    db.saveSync();

    return { user, transaction };
  }

  public static processReferralReward(userId: string, purchaseAmount: number): void {
    const user = db.users.find(u => u.id === userId);
    if (!user || !user.referredBy) return;

    const referrer = db.users.find(u => u.id === user.referredBy);
    if (!referrer) return;

    // 5% commission on purchase
    const commission = Math.round(purchaseAmount * 0.05 * 100) / 100;
    if (commission >= 1) {
      referrer.balance = Math.round((referrer.balance + commission) * 100) / 100;
      
      db.transactions.unshift({
        id: `TXN-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
        userId: referrer.id,
        type: 'REFERRAL_BONUS',
        amount: commission,
        description: `5% Referral Commission from ${user.username}'s order`,
        status: 'SUCCESS',
        createdAt: new Date().toISOString(),
      });

      const refRecord = db.referrals.find(r => r.referrerId === referrer.id && r.referredUserId === user.id);
      if (refRecord) {
        refRecord.rewardEarned += commission;
        refRecord.hasPurchased = true;
      } else {
        db.referrals.push({
          id: `REF-${Date.now()}`,
          referrerId: referrer.id,
          referredUserId: user.id,
          referredUsername: user.username,
          rewardEarned: commission,
          hasPurchased: true,
          createdAt: new Date().toISOString(),
        });
      }
      db.saveSync();
    }
  }
}
