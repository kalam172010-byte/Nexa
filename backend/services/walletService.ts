import crypto from 'crypto';
import { db } from '../db/database';
import { User, Transaction } from '../models/types';
import { FirestoreSyncService } from './firestoreSync';

export class WalletService {
  public static getBalance(userId: string): number {
    const user = db.users.find(u => u.id === userId || u.firebaseUid === userId);
    return user ? Math.max(0, Math.round((user.balance || 0) * 100) / 100) : 0;
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

    const user = db.users.find(u => u.id === userId || u.firebaseUid === userId);
    if (!user) throw new Error('User not found.');

    user.balance = Math.round((user.balance + amount) * 100) / 100;
    user.updatedAt = new Date().toISOString();

    const transaction: Transaction = {
      id: `TXN-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      userId: user.id,
      userEmail: user.email.toLowerCase(),
      apiKey: user.apiKey,
      type,
      amount: Math.round(amount * 100) / 100,
      description,
      referenceId,
      status: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    db.transactions.unshift(transaction);
    db.saveSync();
    FirestoreSyncService.syncUserBalance(user.id, user.balance).catch(() => {});
    FirestoreSyncService.syncTransaction(transaction).catch(() => {});

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

    const user = db.users.find(u => u.id === userId || u.firebaseUid === userId);
    if (!user) throw new Error('User not found.');

    if (user.balance < amount) {
      throw new Error(`Insufficient wallet balance. You have ₹${user.balance.toFixed(2)}, required ₹${amount.toFixed(2)}.`);
    }

    user.balance = Math.round((user.balance - amount) * 100) / 100;
    user.updatedAt = new Date().toISOString();

    const transaction: Transaction = {
      id: `TXN-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`,
      userId: user.id,
      userEmail: user.email.toLowerCase(),
      apiKey: user.apiKey,
      type: 'PURCHASE',
      amount: -Math.round(amount * 100) / 100,
      description,
      referenceId,
      status: 'SUCCESS',
      createdAt: new Date().toISOString(),
    };

    db.transactions.unshift(transaction);
    db.saveSync();
    FirestoreSyncService.syncUserBalance(user.id, user.balance).catch(() => {});
    FirestoreSyncService.syncTransaction(transaction).catch(() => {});

    return { user, transaction };
  }

  /**
   * Server-side validation service method that verifies a user's current wallet balance
   * against the required key purchase price before allowing key generation, and performs
   * atomic deduction strictly from that specific user's account.
   */
  public static async verifyAndDeductApiKeyPurchase(
    userId: string,
    totalPrice: number,
    description: string,
    referenceId?: string
  ): Promise<{
    success: boolean;
    user?: User;
    transaction?: Transaction;
    currentBalance: number;
    remainingBalance: number;
    error?: string;
  }> {
    const user = db.users.find(u => u.id === userId || u.firebaseUid === userId);
    if (!user) {
      return {
        success: false,
        currentBalance: 0,
        remainingBalance: 0,
        error: 'User account not found.',
      };
    }

    // Only check Firestore with a fast 1.2s timeout if local balance appears insufficient
    let currentBalance = Math.max(0, Math.round((user.balance || 0) * 100) / 100);
    if (currentBalance < totalPrice) {
      try {
        const liveBalance = await Promise.race([
          FirestoreSyncService.getAuthoritativeBalance(user),
          new Promise<number>(resolve => setTimeout(() => resolve(currentBalance), 1200)),
        ]);
        if (typeof liveBalance === 'number' && !Number.isNaN(liveBalance) && liveBalance > currentBalance) {
          user.balance = liveBalance;
          currentBalance = Math.max(0, Math.round(liveBalance * 100) / 100);
        }
      } catch {}
    }

    if (currentBalance < totalPrice) {
      return {
        success: false,
        user,
        currentBalance,
        remainingBalance: currentBalance,
        error: `Insufficient wallet balance in your API account (@${user.username}). Available Balance: ₹${currentBalance.toFixed(2)}, Required: ₹${totalPrice.toFixed(2)}. Key purchase denied.`,
      };
    }

    // Atomic deduction
    try {
      const { user: updatedUser, transaction } = this.deductFunds(user.id, totalPrice, description, referenceId);
      return {
        success: true,
        user: updatedUser,
        transaction,
        currentBalance,
        remainingBalance: updatedUser.balance,
      };
    } catch (err: any) {
      return {
        success: false,
        user,
        currentBalance,
        remainingBalance: currentBalance,
        error: err.message || 'Failed to deduct wallet funds.',
      };
    }
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
