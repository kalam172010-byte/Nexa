import crypto from 'crypto';
import { db } from '../db/database';
import { Deposit, PaymentGatewayConfig } from '../models/types';
import { WalletService } from './walletService';
import { FirestoreSyncService } from './firestoreSync';
import { emailService } from './emailService';

export interface CreateDepositRequest {
  userId: string;
  customerName?: string;
  customerEmail?: string;
  amount: number;
  method?: 'UPI_QR' | 'ADMIN_SUPPORT';
  redirectUrl?: string;
}

export interface GatewayOrderData {
  order_id?: string;
  qr_url?: string;
  checkout_url?: string;
  payment_url?: string;
  upi_id?: string;
  amount?: string | number;
  payable_amount?: string | number;
  upi_intent?: string;
  status?: string;
  created_at_ist?: string;
  expires_at_ist?: string;
  [key: string]: any;
}

export interface GatewayResponse {
  status?: 'success' | 'error' | 'unauthorized' | string;
  success?: boolean;
  data?: GatewayOrderData;
  order_id?: string;
  qr_url?: string;
  checkout_url?: string;
  payment_url?: string;
  upi_intent?: string;
  message?: string;
  msg?: string;
  [key: string]: any;
}

const FAMGATEWAY_PRIMARY_KEY = 'fam_a9527c6c2dd4d26ad5223cfc3c4c5fa9289b574e';
const RENDER_SECONDARY_KEY = 'fam_67c5e10fc423d5ef37aac212a20e55c63d51b7fe';

export class PaymentGatewayAdapter {
  /**
   * Resolves active gateway URLs and guarantees the matching API key is never masked or mismatched
   */
  public static resolveCredentials(override?: Partial<PaymentGatewayConfig>) {
    const config = { ...db.gatewayConfig, ...(override || {}) };
    const gatewayType = config.gatewayType || 'FAMGATEWAY';
    const rawPostUrl = (config.apiUrl || '').trim();

    const isFamGateway =
      gatewayType === 'FAMGATEWAY' ||
      rawPostUrl.includes('famgateway.in') ||
      (!rawPostUrl && gatewayType !== 'RENDER_FGW' && gatewayType !== 'DIRECT_UPI');

    const postUrl = isFamGateway
      ? 'https://famgateway.in/api/create-order'
      : rawPostUrl || 'https://payment-gateway-87gk.onrender.com/api/create-order';

    const getUrl = isFamGateway
      ? 'https://famgateway.in/api/qr.php'
      : (config.qrAliasUrl || '').trim() || 'https://payment-gateway-87gk.onrender.com/api/qr.php';

    let apiKey = (config.apiKey || '').trim();

    if (isFamGateway) {
      // Ensure FamGateway never receives a masked key (...) or the Render key
      if (!apiKey || apiKey.includes('...') || apiKey === RENDER_SECONDARY_KEY) {
        apiKey = FAMGATEWAY_PRIMARY_KEY;
      }
    } else if (postUrl.includes('onrender.com')) {
      if (!apiKey || apiKey.includes('...')) {
        apiKey = RENDER_SECONDARY_KEY;
      }
    }

    return {
      config,
      gatewayType,
      isFamGateway,
      postUrl,
      getUrl,
      apiKey,
    };
  }

  /**
   * Initializes a real-time deposit transaction via FamGateway (Primary) / Render FGW (Secondary) / Direct UPI
   */
  public static async createDeposit(req: CreateDepositRequest): Promise<Deposit> {
    const { config, gatewayType, postUrl, apiKey } = this.resolveCredentials();

    if (req.amount < (config.minDeposit || 1)) {
      throw new Error(`Minimum deposit amount is ₹${config.minDeposit || 1}.`);
    }

    const transactionId = `TXN-DEP-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const depositId = `DEP-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const expiryMinutes = config.paymentExpiryMinutes || 10;
    const expiresAt = new Date(Date.now() + expiryMinutes * 60 * 1000).toISOString();

    const rawVpa = (config.upiVpa || '').trim();
    let targetVpa = rawVpa.includes('@') ? rawVpa : '8056317218@fam';
    let targetName = (config.upiMerchantName || 'FamPay').trim();

    // Default fallback UPI URI (only used if Direct UPI mode is explicitly selected)
    let upiUri = `upi://pay?pa=${encodeURIComponent(targetVpa)}&pn=${encodeURIComponent(targetName)}&am=${req.amount.toFixed(2)}&cu=INR&tr=${transactionId}&tn=${depositId}`;
    let gatewayOrderId: string | undefined = undefined;
    let qrUrl: string | undefined = undefined;
    let checkoutUrl: string | undefined = undefined;
    let upiIntent: string | undefined = upiUri;

    const customerName = req.customerName?.trim() || 'Valued Gamer';
    const customerEmail = req.customerEmail?.trim() || 'customer@example.com';
    const successUrl = req.redirectUrl || config.successUrl || config.redirectUrl || 'https://yoursite.com/payment-success';
    const cancelUrl = config.cancelUrl || 'https://yoursite.com/payment-cancel';
    const note = `Payment for Order #${depositId}`;

    let payableAmount = req.amount;

    // Helper to call a gateway endpoint (FamGateway or Render FGW)
    const dispatchOrderRequest = async (targetEndpoint: string, targetKey: string): Promise<boolean> => {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 9000);
      try {
        const postBody = {
          api_key: targetKey,
          amount: Number(req.amount),
          upi_id: targetVpa,
          merchant_upi_id: targetVpa,
          upi_vpa: targetVpa,
          merchant_name: targetName,
          note,
          customer_name: customerName,
          customer_email: customerEmail,
          redirect_url: successUrl,
          success_url: successUrl,
          cancel_url: cancelUrl,
        };

        const response = await fetch(targetEndpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; KalamFFPanel/2.0)',
            'X-Api-Key': targetKey,
            'x-api-key': targetKey,
          },
          body: JSON.stringify(postBody),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (!response.ok) return false;

        const resData: GatewayResponse = await response.json();
        if (resData.status === 'error' || resData.status === 'unauthorized' || resData.success === false) {
          return false;
        }

        const data = resData.data || resData;

        const parsedOrderId =
          data.order_id ||
          data.orderId ||
          data.id ||
          resData.order_id ||
          resData.orderId ||
          resData.id ||
          data.txn_id ||
          resData.txn_id;

        if (!parsedOrderId) return false;

        gatewayOrderId = String(parsedOrderId);

        if (data.payable_amount || resData.payable_amount) {
          const pAmt = parseFloat(String(data.payable_amount || resData.payable_amount));
          if (!isNaN(pAmt) && pAmt > 0) {
            payableAmount = pAmt;
          }
        }

        const parsedCheckout =
          data.checkout_url ||
          data.payment_url ||
          data.paymentUrl ||
          data.url ||
          resData.checkout_url ||
          resData.payment_url ||
          resData.paymentUrl ||
          resData.url;

        if (parsedCheckout) {
          checkoutUrl = parsedCheckout;
        }

        const parsedQrUrl =
          data.qr_url ||
          data.qr_code ||
          data.qr_data_url ||
          resData.qr_url ||
          resData.qr_code ||
          resData.qr_data_url;

        if (parsedQrUrl) {
          qrUrl = parsedQrUrl;
        }

        const parsedIntent =
          data.upi_intent ||
          data.upi_uri ||
          data.upi_url ||
          data.upiIntent ||
          resData.upi_intent ||
          resData.upi_uri ||
          resData.upi_url ||
          resData.upiIntent;

        if (parsedIntent) {
          // CRITICAL: Keep the exact gateway upi_intent untouched so tn=fg_... matches FamGateway's real-time bank listener!
          upiUri = parsedIntent;
          upiIntent = parsedIntent;
        }

        if (data.upi_id) {
          targetVpa = String(data.upi_id);
        }

        return true;
      } catch (err) {
        clearTimeout(timeout);
        return false;
      }
    };

    if (gatewayType !== 'DIRECT_UPI') {
      let createdLiveOrder = await dispatchOrderRequest(postUrl, apiKey);

      // If Secondary Render Gateway is selected but suspended/unreachable, automatically failover to Primary FamGateway (famgateway.in)
      if (!createdLiveOrder && !postUrl.includes('famgateway.in')) {
        createdLiveOrder = await dispatchOrderRequest(
          'https://famgateway.in/api/create-order',
          FAMGATEWAY_PRIMARY_KEY
        );
      }

      if (createdLiveOrder && gatewayOrderId) {
        db.logActivity(
          req.userId,
          req.customerName || 'USER',
          'GATEWAY_ORDER_CREATED',
          `Live gateway order ${gatewayOrderId} created for ₹${req.amount}.`
        );
      }
    }

    // Fallback QR URL if neither local generator nor gateway is reached
    if (!qrUrl) {
      qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiIntent || upiUri)}`;
    }

    const deposit: Deposit = {
      id: depositId,
      userId: req.userId,
      amount: req.amount,
      payableAmount,
      fee: 0,
      method: req.method || 'UPI_QR',
      transactionId,
      gatewayOrderId,
      qrUrl,
      checkoutUrl,
      upiIntent: upiIntent || upiUri,
      upiVpa: targetVpa,
      merchantName: targetName,
      qrPayload: upiIntent || upiUri,
      status: 'PENDING',
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    db.deposits.unshift(deposit);
    db.saveSync();
    FirestoreSyncService.syncDeposit(deposit).catch(() => {});

    return deposit;
  }

  /**
   * Admin test runner for Payment Gateway API (FamGateway Primary POST/GET, Render FGW Secondary)
   */
  public static async testGatewayCall(params: {
    amount: number;
    customerName: string;
    customerEmail?: string;
    note?: string;
    method?: 'POST' | 'GET';
    configOverride?: Partial<PaymentGatewayConfig>;
  }): Promise<{
    success: boolean;
    method: 'POST' | 'GET';
    status: number;
    latencyMs: number;
    rawResponse: string;
    orderData?: GatewayOrderData;
    payloadSent: any;
  }> {
    const { config, postUrl, getUrl, apiKey } = this.resolveCredentials(params.configOverride);
    const method = params.method || 'POST';
    const startTime = Date.now();

    if (method === 'GET') {
      const url = new URL(getUrl);
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('amount', params.amount.toString());
      url.searchParams.set('customer_name', params.customerName || 'Rahul Sharma');

      const payloadSent = {
        endpoint: url.toString(),
        method: 'GET',
        headers: {
          'X-Api-Key': apiKey,
          'Accept': 'application/json',
        },
        query_params: {
          api_key: apiKey,
          amount: params.amount,
          customer_name: params.customerName,
        },
      };

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(url.toString(), {
          method: 'GET',
          headers: {
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; KalamFFPanel/2.0)',
            'x-api-key': apiKey,
            'X-Api-Key': apiKey,
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const latencyMs = Date.now() - startTime;
        const rawText = await response.text();

        let orderData: GatewayOrderData | undefined;
        let isApiSuccess = response.ok;
        try {
          const parsed = JSON.parse(rawText);
          if (parsed.status === 'error' || parsed.status === 'unauthorized' || parsed.success === false) {
            isApiSuccess = false;
          } else {
            orderData = parsed.data || parsed;
            if (orderData && (orderData.qr_data_url || parsed.qr_data_url) && !orderData.qr_url) {
              orderData.qr_url = orderData.qr_data_url || parsed.qr_data_url;
            }
          }
        } catch (e) {
          if (rawText.includes('Service Suspended') || rawText.includes('<!DOCTYPE html>')) {
            isApiSuccess = false;
          }
        }

        return {
          success: isApiSuccess,
          method: 'GET',
          status: response.status,
          latencyMs,
          rawResponse: rawText,
          orderData,
          payloadSent,
        };
      } catch (err: any) {
        return {
          success: false,
          method: 'GET',
          status: 0,
          latencyMs: Date.now() - startTime,
          rawResponse: `Connection error: ${err.message}`,
          payloadSent,
        };
      }
    } else {
      // POST JSON: FamGateway & Render FGW Compatible Payload
      const postBody = {
        api_key: apiKey,
        amount: Number(params.amount),
        note: params.note || `Payment for Order #${Date.now().toString().slice(-4)}`,
        customer_name: params.customerName || 'Rahul Sharma',
        customer_email: params.customerEmail || 'rahul@example.com',
        redirect_url: config.successUrl || config.redirectUrl || 'https://yoursite.com/payment-success',
        success_url: config.successUrl || config.redirectUrl || 'https://yoursite.com/payment-success',
        cancel_url: config.cancelUrl || 'https://yoursite.com/payment-cancel',
      };

      const payloadSent = {
        endpoint: postUrl,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Api-Key': apiKey,
        },
        body: postBody,
      };

      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 10000);

        const response = await fetch(postUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
            'User-Agent': 'Mozilla/5.0 (compatible; KalamFFPanel/2.0)',
            'X-Api-Key': apiKey,
            'x-api-key': apiKey,
          },
          body: JSON.stringify(postBody),
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const latencyMs = Date.now() - startTime;
        const rawText = await response.text();

        let orderData: GatewayOrderData | undefined;
        let isApiSuccess = response.ok;
        try {
          const parsed = JSON.parse(rawText);
          if (parsed.status === 'error' || parsed.status === 'unauthorized' || parsed.success === false) {
            isApiSuccess = false;
          } else {
            orderData = parsed.data || parsed;
            if (orderData && (orderData.qr_data_url || parsed.qr_data_url) && !orderData.qr_url) {
              orderData.qr_url = orderData.qr_data_url || parsed.qr_data_url;
            }
          }
        } catch (e) {
          if (rawText.includes('Service Suspended') || rawText.includes('<!DOCTYPE html>')) {
            isApiSuccess = false;
          }
        }

        return {
          success: isApiSuccess,
          method: 'POST',
          status: response.status,
          latencyMs,
          rawResponse: rawText.includes('Service Suspended')
            ? 'Secondary Render Gateway (payment-gateway-87gk.onrender.com) is currently suspended on Render. Switch to Primary FamGateway (famgateway.in) for 100% live operations.'
            : rawText,
          orderData,
          payloadSent,
        };
      } catch (err: any) {
        return {
          success: false,
          method: 'POST',
          status: 0,
          latencyMs: Date.now() - startTime,
          rawResponse: `Connection error: ${err.message}`,
          payloadSent,
        };
      }
    }
  }

  /**
   * Backward-compatible alias for testFamGatewayCall
   */
  public static async testFamGatewayCall(params: {
    amount: number;
    customerName: string;
    customerEmail?: string;
    method?: 'POST' | 'GET';
  }) {
    return this.testGatewayCall(params);
  }

  /**
   * Verifies / completes a payment and credits the user's wallet
   */
  public static completeDeposit(
    depositId: string,
    upiRefNumber?: string,
    isManualAdminApproval: boolean = false
  ): Deposit {
    const deposit = db.deposits.find(d => d.id === depositId);
    if (!deposit) {
      throw new Error('Deposit record not found.');
    }

    if (deposit.status === 'SUCCESS') {
      return deposit; // Already completed
    }

    if (new Date() > new Date(deposit.expiresAt) && !isManualAdminApproval) {
      deposit.status = 'EXPIRED';
      db.saveSync();
      throw new Error('This payment transaction has expired. Please create a new payment.');
    }

    deposit.status = 'SUCCESS';
    deposit.completedAt = new Date().toISOString();
    deposit.upiRefNumber = upiRefNumber || `REF-${Date.now()}-${Math.floor(100000 + Math.random() * 900000)}`;

    // Credit user's wallet
    WalletService.addFunds(
      deposit.userId,
      deposit.amount,
      `UPI Deposit (Ref: ${deposit.upiRefNumber})`,
      deposit.transactionId,
      'DEPOSIT'
    );

    db.saveSync();
    FirestoreSyncService.syncDeposit(deposit).catch(() => {});
    const updatedUser = db.users.find(u => u.id === deposit.userId || u.firebaseUid === deposit.userId);
    if (updatedUser) {
      FirestoreSyncService.syncUserBalance(updatedUser.id, updatedUser.balance).catch(() => {});
    }
    return deposit;
  }

  /**
   * Processes incoming automated webhooks from FamGateway & External Providers
   */
  public static processWebhook(payload: any): { success: boolean; message: string; deposit?: Deposit } {
    const orderId = payload.order_id || payload.orderId || payload.id || payload.data?.order_id || payload.data?.id;
    const utr =
      payload.utr ||
      payload.transaction_id ||
      payload.bank_ref ||
      payload.upi_ref_no ||
      payload.reference_no ||
      payload.txn_id ||
      payload.data?.utr ||
      payload.data?.transaction_id;
    const status = (payload.status || payload.event || payload.payment_status || '').toLowerCase();

    if (!orderId && !utr) {
      return { success: false, message: 'Missing order_id or utr in webhook payload' };
    }

    // Find deposit by gateway order ID or transaction ID
    const deposit = db.deposits.find(
      d =>
        (orderId &&
          (d.gatewayOrderId === String(orderId) ||
            d.transactionId === String(orderId) ||
            d.id === String(orderId))) ||
        (utr && d.upiRefNumber === utr)
    );

    if (!deposit) {
      return { success: false, message: `Deposit matching order ${orderId || utr} not found.` };
    }

    if (deposit.status === 'SUCCESS') {
      return { success: true, message: 'Deposit already processed and credited.', deposit };
    }

    if (status.includes('success') || status.includes('paid') || status.includes('completed')) {
      const completed = PaymentGatewayAdapter.completeDeposit(deposit.id, utr || `FGW-${Date.now()}`);
      db.logActivity(
        deposit.userId,
        'WEBHOOK',
        'GATEWAY_WEBHOOK_PROCESSED',
        `Automated webhook verified payment for deposit ${deposit.id} (Amount: ₹${deposit.amount}, UTR: ${utr || 'N/A'})`
      );
      return { success: true, message: 'Payment verified and wallet credited via webhook.', deposit: completed };
    }

    return { success: false, message: `Payment status ${status} is not successful.` };
  }

  private static lastImapCheckOnPoll = 0;

  /**
   * Real-time live gateway order verification (FamGateway /api/checkout-status.php & /api/verify-order.php + 24/7 IMAP Inbox Scan)
   */
  public static async checkStatus(depositId: string): Promise<Deposit> {
    const deposit = db.deposits.find(d => d.id === depositId);
    if (!deposit) throw new Error('Deposit not found.');

    if (deposit.status === 'SUCCESS' || deposit.status === 'EXPIRED') {
      return deposit;
    }

    if (new Date() > new Date(deposit.expiresAt)) {
      deposit.status = 'EXPIRED';
      db.saveSync();
      FirestoreSyncService.syncDeposit(deposit).catch(() => {});
      return deposit;
    }

    // Trigger throttled live IMAP inbox scan (at most every 8 seconds) while user is actively waiting on a deposit
    const nowMs = Date.now();
    if (nowMs - this.lastImapCheckOnPoll > 8000) {
      this.lastImapCheckOnPoll = nowMs;
      await emailService.scanInboxForUpiPayments().catch(() => {});
      const refreshed = db.deposits.find(d => d.id === depositId);
      if (refreshed && refreshed.status === 'SUCCESS') {
        return refreshed;
      }
    }

    const { config, apiKey } = this.resolveCredentials();
    const orderId = deposit.gatewayOrderId;

    if (orderId) {
      const isFamGatewayOrder =
        orderId.startsWith('fg_') ||
        (deposit.checkoutUrl && deposit.checkoutUrl.includes('famgateway.in')) ||
        (config.apiUrl && config.apiUrl.includes('famgateway.in'));

      if (isFamGatewayOrder) {
        const fgKey =
          apiKey && !apiKey.includes('...') && apiKey !== RENDER_SECONDARY_KEY
            ? apiKey
            : FAMGATEWAY_PRIMARY_KEY;

        // 1. Check FamGateway real-time public checkout-status.php (<25ms cached + triggers 5s IMAP scan)
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 4000);
          const checkoutStatusUrl = `https://famgateway.in/api/checkout-status.php?order_id=${encodeURIComponent(orderId)}&tz=Asia%2FKolkata&lang=en-IN`;

          const response = await fetch(checkoutStatusUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (compatible; KalamFFPanel/2.0)',
            },
            signal: controller.signal,
          });
          clearTimeout(timeout);

          if (response.ok) {
            const resData: any = await response.json();
            const pStatus = String(resData.status || resData.data?.status || '').toLowerCase();

            if (pStatus === 'success' || pStatus === 'paid' || pStatus === 'completed') {
              const utr =
                resData.utr ||
                resData.transaction_id ||
                resData.data?.utr ||
                resData.data?.transaction_id ||
                orderId;
              return PaymentGatewayAdapter.completeDeposit(deposit.id, String(utr));
            }
            if (pStatus === 'expired') {
              deposit.status = 'EXPIRED';
              db.saveSync();
              return deposit;
            }
          }
        } catch (err) {
          // Continue to authoritative verify-order.php check
        }

        // 2. Check FamGateway authoritative server-to-server verify-order.php endpoint
        try {
          const verifyController = new AbortController();
          const verifyTimeout = setTimeout(() => verifyController.abort(), 5000);
          const verifyUrl = `https://famgateway.in/api/verify-order.php?order_id=${encodeURIComponent(orderId)}&api_key=${encodeURIComponent(fgKey)}`;

          const verifyRes = await fetch(verifyUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'User-Agent': 'Mozilla/5.0 (compatible; KalamFFPanel/2.0)',
              'X-Api-Key': fgKey,
              'x-api-key': fgKey,
            },
            signal: verifyController.signal,
          });
          clearTimeout(verifyTimeout);

          if (verifyRes.ok) {
            const resData: any = await verifyRes.json();
            const pStatus = String(resData.status || resData.data?.status || '').toLowerCase();

            if (pStatus === 'success' || pStatus === 'paid' || pStatus === 'completed') {
              const utr =
                resData.data?.utr ||
                resData.utr ||
                resData.data?.transaction_id ||
                resData.transaction_id ||
                orderId;
              return PaymentGatewayAdapter.completeDeposit(deposit.id, String(utr));
            }
            if (pStatus === 'expired') {
              deposit.status = 'EXPIRED';
              db.saveSync();
              return deposit;
            }
          }
        } catch (err) {
          // Return pending deposit if network call times out
        }

        return deposit;
      }

      // Secondary / Custom Gateway Status Check
      if (apiKey) {
        try {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), 3500);
          const baseUrl = config.apiUrl ? config.apiUrl.split('/api/')[0] : 'https://payment-gateway-87gk.onrender.com';
          const orderStatusUrl = `${baseUrl}/api/order-status/${encodeURIComponent(orderId)}`;

          const response = await fetch(orderStatusUrl, {
            method: 'GET',
            headers: {
              'Accept': 'application/json',
              'x-api-key': apiKey,
              'X-Api-Key': apiKey,
            },
            signal: controller.signal,
          });

          clearTimeout(timeout);

          if (response.ok) {
            const resData: any = await response.json();
            const pStatus = String(
              resData.status ||
              resData.payment_status ||
              resData.data?.status ||
              resData.order_status ||
              ''
            ).toLowerCase();

            if (pStatus.includes('success') || pStatus.includes('paid') || pStatus.includes('completed')) {
              const utr =
                resData.transaction_ref ||
                resData.utr ||
                resData.data?.utr ||
                resData.bank_ref ||
                resData.txn_id ||
                orderId;
              return PaymentGatewayAdapter.completeDeposit(deposit.id, String(utr));
            }
          }
        } catch (err) {}
      }
    }

    return deposit;
  }
}
