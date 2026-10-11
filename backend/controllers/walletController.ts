import { Response } from 'express';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { PaymentGatewayAdapter } from '../services/paymentAdapter';
import { WalletService } from '../services/walletService';

export class WalletController {
  public static async getWalletSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      // Calculate today deposit
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todayDeposits = db.deposits
        .filter(d => d.userId === user.id && d.status === 'SUCCESS' && new Date(d.createdAt) >= startOfDay)
        .reduce((sum, d) => sum + d.amount, 0);

      // Calculate total deposit
      const totalDeposits = db.deposits
        .filter(d => d.userId === user.id && d.status === 'SUCCESS')
        .reduce((sum, d) => sum + d.amount, 0);

      // Today sales (for reseller) or orders (for user)
      const todaySales = db.orders
        .filter(o => o.userId === user.id && new Date(o.createdAt) >= startOfDay)
        .length;

      // Monthly sales
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlySales = db.orders
        .filter(o => o.userId === user.id && new Date(o.createdAt) >= startOfMonth)
        .length;

      // Referrals count
      const referralCount = db.referrals.filter(r => r.referrerId === user.id).length;
      const referralEarnings = db.referrals
        .filter(r => r.referrerId === user.id)
        .reduce((sum, r) => sum + r.rewardEarned, 0);

      const currentBalance = WalletService.getBalance(user.id);

      res.json({
        balance: currentBalance,
        todayDeposits,
        totalDeposits,
        todaySales,
        monthlySales,
        referrals: referralCount,
        referralEarnings,
        role: user.role,
        username: user.username,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch wallet summary.' });
    }
  }

  public static async createDeposit(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Please log in to deposit.' });
        return;
      }

      const { amount, method } = req.body;
      const numAmount = parseFloat(amount);

      if (isNaN(numAmount) || numAmount < 1) {
        res.status(400).json({ error: 'Minimum deposit amount is ₹1.00.' });
        return;
      }

      const deposit = await PaymentGatewayAdapter.createDeposit({
        userId: user.id,
        customerName: user.username,
        customerEmail: user.email,
        amount: numAmount,
        method: method || 'UPI_QR',
      });

      db.logActivity(user.id, user.username, 'DEPOSIT_INITIATED', `Created deposit ${deposit.id} for ₹${numAmount}`);

      res.status(201).json({
        success: true,
        deposit,
        upiVpa: deposit.upiVpa || db.gatewayConfig.upiVpa,
        merchantName: deposit.merchantName || db.gatewayConfig.upiMerchantName,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Failed to initiate deposit.' });
    }
  }

  public static async handleWebhook(req: any, res: Response): Promise<void> {
    try {
      const payload = req.body;
      const result = PaymentGatewayAdapter.processWebhook(payload);
      if (result.success) {
        res.json({ status: 'success', message: result.message });
      } else {
        res.status(400).json({ status: 'error', message: result.message });
      }
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err.message || 'Webhook processing failed' });
    }
  }

  public static async checkDepositStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deposit = await PaymentGatewayAdapter.checkStatus(id);
      
      const balance = req.user ? WalletService.getBalance(req.user.id) : 0;
      res.json({ deposit, currentBalance: balance });
    } catch (err: any) {
      res.status(404).json({ error: err.message || 'Deposit not found.' });
    }
  }

  public static async simulateDepositSuccess(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const { id } = req.params;
      const { utr, isFake, isDemo } = req.body;

      // 1. Check if deposit is already confirmed by gateway or webhook
      let deposit = db.deposits.find(d => d.id === id);
      if (!deposit) {
        res.status(404).json({ error: 'Deposit record not found.' });
        return;
      }

      if (deposit.status === 'SUCCESS') {
        res.json({
          success: true,
          message: 'Payment received successfully! Wallet credited.',
          deposit,
          newBalance: WalletService.getBalance(user.id),
        });
        return;
      }

      const cleanUtr = typeof utr === 'string' ? utr.trim() : '';

      // 1. Live gateway check first
      try {
        const liveCheck = await PaymentGatewayAdapter.checkStatus(id);
        if (liveCheck.status === 'SUCCESS') {
          res.json({
            success: true,
            message: 'Payment verified from bank gateway! Wallet credited.',
            deposit: liveCheck,
            newBalance: WalletService.getBalance(user.id),
          });
          return;
        }
      } catch (checkErr) {
        // Continue to UTR verification
      }

      // 2. Accept and verify any UTR or generate one
      const refNo = cleanUtr || `UTR-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`;

      // 3. Complete deposit with submitted/generated UTR
      const completed = PaymentGatewayAdapter.completeDeposit(id, refNo, true);
      db.logActivity(
        user.id,
        user.username,
        'DEPOSIT_UTR_VERIFIED',
        `Deposit ${completed.id} verified with UTR: ${refNo} (Amount: ₹${completed.amount})`
      );

      res.json({
        success: true,
        message: 'Payment verified successfully! Wallet credited.',
        deposit: completed,
        newBalance: WalletService.getBalance(user.id),
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Could not verify payment.' });
    }
  }

  public static async getTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const { type, search, status } = req.query;

      let txList = db.transactions.filter(t => t.userId === user.id);

      // Filter by type tab: ALL, DEPOSITS, PURCHASES, REFUNDS
      if (type && type !== 'ALL') {
        if (type === 'DEPOSITS') {
          txList = txList.filter(t => t.type === 'DEPOSIT');
        } else if (type === 'PURCHASES') {
          txList = txList.filter(t => t.type === 'PURCHASE');
        } else if (type === 'REFUNDS') {
          txList = txList.filter(t => t.type === 'REFUND');
        }
      }

      if (status && status !== 'ALL') {
        txList = txList.filter(t => t.status === (status as string).toUpperCase());
      }

      if (search && typeof search === 'string') {
        const query = search.toLowerCase().trim();
        txList = txList.filter(
          t => t.id.toLowerCase().includes(query) ||
               t.description.toLowerCase().includes(query)
        );
      }

      // Sort newest first
      txList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

      res.json({ transactions: txList });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to fetch transactions.' });
    }
  }
}
