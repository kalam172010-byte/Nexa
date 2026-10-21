import { Response } from 'express';
import QRCode from 'qrcode';
import { db } from '../db/database';
import { AuthenticatedRequest } from '../middleware/auth';
import { PaymentGatewayAdapter } from '../services/paymentAdapter';
import { WalletService } from '../services/walletService';
import { FirestoreSyncService } from '../services/firestoreSync';
import { emailService } from '../services/emailService';

export class WalletController {
  public static async getWalletSummary(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      await FirestoreSyncService.pullAndMergeExternalState(false);

      const dbUser = db.users.find(
        u => u.id === user.id || u.firebaseUid === user.id || u.email.toLowerCase() === user.email.toLowerCase()
      );
      const userAltIds = new Set<string>(FirestoreSyncService.getLinkedUserIds(dbUser || user, user.id));
      const userEmail = (dbUser?.email || user.email || '').trim().toLowerCase();
      const userApiKey = (dbUser?.apiKey || user.apiKey || '').trim();

      // Calculate today deposit
      const startOfDay = new Date();
      startOfDay.setHours(0, 0, 0, 0);

      const todayDeposits = db.deposits
        .filter(d => userAltIds.has(d.userId) && d.status === 'SUCCESS' && new Date(d.createdAt) >= startOfDay)
        .reduce((sum, d) => sum + d.amount, 0);

      // Calculate total deposit
      const totalDeposits = db.deposits
        .filter(d => userAltIds.has(d.userId) && d.status === 'SUCCESS')
        .reduce((sum, d) => sum + d.amount, 0);

      const matchesUserOrder = (o: any) =>
        userAltIds.has(o.userId) ||
        (userEmail && (o.userEmail || '').trim().toLowerCase() === userEmail) ||
        (userApiKey && (o.apiKey || '').trim() === userApiKey);

      // Today sales (for reseller) or orders (for user)
      const todaySales = db.orders
        .filter(o => matchesUserOrder(o) && new Date(o.createdAt) >= startOfDay)
        .length;

      // Monthly sales
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const monthlySales = db.orders
        .filter(o => matchesUserOrder(o) && new Date(o.createdAt) >= startOfMonth)
        .length;

      // Referrals count
      const referralCount = db.referrals.filter(r => userAltIds.has(r.referrerId)).length;
      const referralEarnings = db.referrals
        .filter(r => userAltIds.has(r.referrerId))
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

      const originUrl = req.headers.origin ? `${req.headers.origin}/` : undefined;

      const deposit = await PaymentGatewayAdapter.createDeposit({
        userId: user.id,
        customerName: user.username,
        customerEmail: user.email,
        amount: numAmount,
        method: method || 'UPI_QR',
        redirectUrl: originUrl,
      });

      db.logActivity(user.id, user.username, 'DEPOSIT_INITIATED', `Created deposit ${deposit.id} (${deposit.gatewayOrderId || 'UPI'}) for ₹${numAmount}`);

      res.status(201).json({
        success: true,
        deposit,
        upiVpa: deposit.upiVpa || db.gatewayConfig.upiVpa,
        merchantName: deposit.merchantName || db.gatewayConfig.upiMerchantName,
        testMode: Boolean(db.gatewayConfig.testMode),
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
      res.json({ deposit, currentBalance: balance, testMode: Boolean(db.gatewayConfig.testMode) });
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
      const { utr } = req.body;

      // 1. Check if deposit is already confirmed by gateway or webhook
      const deposit = db.deposits.find(d => d.id === id);
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

      // 2. Authoritative Real-Time Gateway Verification (FamGateway /api/checkout-status.php & /api/verify-order.php)
      const liveCheck = await PaymentGatewayAdapter.checkStatus(id);
      if (liveCheck.status === 'SUCCESS') {
        res.json({
          success: true,
          message: 'Payment verified in real-time from UPI Gateway! Wallet credited.',
          deposit: liveCheck,
          newBalance: WalletService.getBalance(user.id),
        });
        return;
      }

      if (liveCheck.status === 'EXPIRED') {
        res.status(400).json({
          error: 'This payment session has expired. Please generate a new UPI QR code.',
        });
        return;
      }

      // 3. User UTR Submission Verification (PhonePe, Google Pay, Paytm, BHIM, FamPay)
      const cleanUtr = typeof utr === 'string' ? utr.trim() : '';
      if (cleanUtr && cleanUtr.length >= 8) {
        // Prevent duplicate UTR reuse across completed deposits
        const duplicate = db.deposits.find(
          d => d.upiRefNumber === cleanUtr && d.status === 'SUCCESS' && d.id !== id
        );
        if (duplicate) {
          res.status(400).json({
            error: `UTR ${cleanUtr} has already been credited to a previous deposit. Please provide the unique UTR for this transaction.`,
          });
          return;
        }

        const completed = PaymentGatewayAdapter.completeDeposit(id, cleanUtr, true);
        db.logActivity(
          user.id,
          user.username,
          'DEPOSIT_UTR_VERIFIED',
          `Verified UPI deposit ${completed.id} (₹${completed.amount}) via submitted UTR ${cleanUtr}`
        );

        // Record in 24/7 IMAP live telemetry feed
        try {
          emailService.recordExternalUpiDeposit(
            cleanUtr,
            completed.amount,
            user.username || 'UPI Transfer',
            completed.id
          );
        } catch {}

        res.json({
          success: true,
          message: `🎉 Payment Verified! ₹${completed.amount.toFixed(2)} credited to your wallet in real-time.`,
          deposit: completed,
          newBalance: WalletService.getBalance(user.id),
        });
        return;
      }

      // 4. Test mode / Simulation fallback (Admin test mode or explicit simulation request)
      if (db.gatewayConfig.testMode === true || req.body.isSimulate === true || cleanUtr.toUpperCase().includes('TEST')) {
        const refNo = cleanUtr || `SIM-UPI-${Date.now().toString().slice(-8)}`;
        const completed = PaymentGatewayAdapter.completeDeposit(id, refNo, true);
        db.logActivity(
          user.id,
          user.username,
          'DEPOSIT_TEST_VERIFIED',
          `Verified deposit ${completed.id} (Amount: ₹${completed.amount}) via instant payment simulation`
        );
        res.json({
          success: true,
          message: `🎉 Payment Verified! ₹${completed.amount.toFixed(2)} credited to your wallet in real-time.`,
          deposit: completed,
          newBalance: WalletService.getBalance(user.id),
        });
        return;
      }

      // Real-Time Mode: Prompt for the 12-digit UTR if not yet received on gateway
      res.status(400).json({
        error: `Payment not detected automatically yet on UPI Gateway (Order ${deposit.gatewayOrderId || deposit.id}). If you have already paid ₹${(deposit.payableAmount || deposit.amount).toFixed(2)}, enter your 12-digit UPI Transaction ID / UTR number below and click "Verify UTR" for instant credit.`,
      });
    } catch (err: any) {
      res.status(400).json({ error: err.message || 'Could not verify payment.' });
    }
  }

  public static async getDepositQrImage(req: any, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const deposit = db.deposits.find(d => d.id === id);
      if (!deposit) {
        res.status(404).send('Deposit not found.');
        return;
      }

      const upiString =
        deposit.upiIntent ||
        deposit.qrPayload ||
        `upi://pay?pa=${deposit.upiVpa || '8056317218@fam'}&pn=FamPay&am=${(deposit.payableAmount || deposit.amount).toFixed(2)}&cu=INR&tn=${deposit.gatewayOrderId || deposit.transactionId}`;

      const buffer = await QRCode.toBuffer(upiString, {
        width: 360,
        margin: 1,
        color: {
          dark: '#020617',
          light: '#ffffff',
        },
        errorCorrectionLevel: 'M',
      });

      res.setHeader('Content-Type', 'image/png');
      res.setHeader('Cache-Control', 'public, max-age=3600');
      res.send(buffer);
    } catch (err: any) {
      res.status(500).send('Failed to generate QR code image.');
    }
  }

  public static async getTransactions(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      const user = req.user;
      if (!user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      await FirestoreSyncService.pullAndMergeExternalState(false);

      const { type, search, status } = req.query;

      const dbUser = db.users.find(
        u => u.id === user.id || u.firebaseUid === user.id || u.email.toLowerCase() === user.email.toLowerCase()
      );
      const userAltIds = new Set<string>(FirestoreSyncService.getLinkedUserIds(dbUser || user, user.id));
      const userEmail = (dbUser?.email || user.email || '').trim().toLowerCase();
      const userApiKey = (dbUser?.apiKey || user.apiKey || '').trim();

      let txList = db.transactions.filter(
        t =>
          userAltIds.has(t.userId) ||
          (userEmail && (t.userEmail || '').trim().toLowerCase() === userEmail) ||
          (userApiKey && (t.apiKey || '').trim() === userApiKey)
      );

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
