import crypto from 'crypto';
import { db } from '../db/database';
import { User, Transaction } from '../models/types';

function syncUserBalanceToFirestore(userId: string, balance: number): void {
  try {
    const url = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/users/${encodeURIComponent(userId)}?updateMask.fieldPaths=balance&key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
    fetch(url, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        fields: {
          balance: { doubleValue: Number(balance) }
        }
      })
    }).catch(() => {});
  } catch {}
}

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
    syncUserBalanceToFirestore(user.id, user.balance);

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
    syncUserBalanceToFirestore(user.id, user.balance);

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
    const user = db.users.find(u => u.id === userId);
    if (!user) {
      return {
        success: false,
        currentBalance: 0,
        remainingBalance: 0,
        error: 'User account not found.',
      };
    }

    // Refresh balance from Firestore if possible for real-time accuracy
    try {
      const url = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/users/${encodeURIComponent(userId)}?key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
      const res = await fetch(url);
      if (res.ok) {
        const docData: any = await res.json();
        if (docData?.fields?.balance) {
          const fsBal = typeof docData.fields.balance.doubleValue === 'number'
            ? docData.fields.balance.doubleValue
            : typeof docData.fields.balance.integerValue === 'string'
            ? parseInt(docData.fields.balance.integerValue, 10)
            : Number(docData.fields.balance.doubleValue || 0);
          if (typeof fsBal === 'number') {
            user.balance = fsBal;
          }
        }
      }
    } catch {}

    const currentBalance = user.balance;

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
      const { user: updatedUser, transaction } = this.deductFunds(userId, totalPrice, description, referenceId);
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
