import crypto from 'crypto';
import { db } from '../db/database';
import { Deposit } from '../models/types';
import { WalletService } from './walletService';

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
  status?: 'success' | 'error' | string;
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

export class PaymentGatewayAdapter {
  /**
   * Initializes a deposit transaction via Render FGW / FamGateway REST API or fallback UPI scheme
   */
  public static async createDeposit(req: CreateDepositRequest): Promise<Deposit> {
    const config = db.gatewayConfig;
    if (req.amount < (config.minDeposit || 1)) {
      throw new Error(`Minimum deposit amount is ₹${config.minDeposit || 1}.`);
    }

    const transactionId = `TXN-DEP-${Date.now()}-${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
    const depositId = `DEP-${Date.now()}-${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
    const expiresAt = new Date(Date.now() + (config.paymentExpiryMinutes || 5) * 60 * 1000).toISOString();

    const rawVpa = (config.upiVpa || '').trim();
    const targetVpa = rawVpa.includes('@') ? rawVpa : '8056317218@fam';
    const targetName = (config.upiMerchantName || 'Kalam Akash').trim();

    // Default standard UPI URI schema (compatible with GPay, PhonePe, Paytm, BHIM, CRED)
    let upiUri = `upi://pay?pa=${encodeURIComponent(targetVpa)}&pn=${encodeURIComponent(targetName)}&am=${req.amount.toFixed(2)}&cu=INR&tr=${transactionId}&tn=Wallet%20Topup%20${depositId}`;
    let gatewayOrderId: string | undefined = undefined;
    let qrUrl: string | undefined = undefined;
    let checkoutUrl: string | undefined = undefined;
    let upiIntent: string | undefined = upiUri;

    // Check if Payment Gateway integration is configured
    const apiKey = config.apiKey?.trim();
    const apiUrl = config.apiUrl?.trim() || 'https://payment-gateway-87gk.onrender.com/api/create-order';

    if (apiKey) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 8000);

        const customerName = req.customerName?.trim() || 'Valued Gamer';
        const customerEmail = req.customerEmail?.trim() || 'customer@example.com';
        const successUrl = req.redirectUrl || config.successUrl || config.redirectUrl || 'https://yoursite.com/payment-success';
        const cancelUrl = config.cancelUrl || 'https://yoursite.com/payment-cancel';
        const note = `Payment for Order #${depositId}`;

        // Payload compatible with both Render FGW (/api/create-order or /api/v1/order/create) and FamGateway (/api/create-order)
        const postBody = {
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

        const response = await fetch(apiUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-api-key': apiKey,
            'X-Api-Key': apiKey,
          },
          body: JSON.stringify(postBody),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const resData: GatewayResponse = await response.json();
          const data = resData.data || resData;

          // Extract order ID
          const parsedOrderId =
            data.order_id ||
            data.orderId ||
            data.id ||
            resData.order_id ||
            resData.orderId ||
            resData.id ||
            data.txn_id ||
            resData.txn_id;

          if (parsedOrderId) {
            gatewayOrderId = String(parsedOrderId);
          }

          // Extract Checkout URL / Payment URL
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

          // Extract UPI Intent / URI
          const parsedIntent =
            data.upi_uri ||
            resData.upi_uri ||
            data.upi_intent ||
            data.upi_url ||
            data.upiIntent ||
            resData.upi_intent ||
            resData.upi_url ||
            resData.upiIntent;

          if (parsedIntent) {
            upiUri = parsedIntent;
          }

          db.logActivity(
            req.userId,
            req.customerName || 'USER',
            'GATEWAY_ORDER_CREATED',
            `${config.gatewayName || 'Payment Gateway'} order ${gatewayOrderId || depositId} created for ₹${req.amount}.`
          );
        }
      } catch (err: any) {
        db.logActivity(
          req.userId,
          req.customerName || 'USER',
          'GATEWAY_FALLBACK_ACTIVE',
          `Payment gateway network call notice (${err.message}). Safe internal UPI QR generated.`
        );
      }
    }

    // ALWAYS ensure upiUri contains the target merchant VPA (8056317218@fam) and merchant name (Kalam Akash)
    if (upiUri.includes('pa=')) {
      upiUri = upiUri.replace(/pa=[^&]+/, `pa=${encodeURIComponent(targetVpa)}`);
    } else {
      upiUri += `&pa=${encodeURIComponent(targetVpa)}`;
    }
    if (upiUri.includes('pn=')) {
      upiUri = upiUri.replace(/pn=[^&]+/, `pn=${encodeURIComponent(targetName)}`);
    }

    upiIntent = upiUri;

    // ALWAYS generate QR code image with target VPA (8056317218@fam)
    qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(upiUri)}`;

    const deposit: Deposit = {
      id: depositId,
      userId: req.userId,
      amount: req.amount,
      fee: 0,
      method: req.method || 'UPI_QR',
      transactionId,
      gatewayOrderId,
      qrUrl,
      checkoutUrl,
      upiIntent,
      upiVpa: targetVpa,
      merchantName: targetName,
      qrPayload: upiUri,
      status: 'PENDING',
      expiresAt,
      createdAt: new Date().toISOString(),
    };

    db.deposits.unshift(deposit);
    db.save();

    return deposit;
  }

  /**
   * Admin test runner for Payment Gateway API (Render FGW POST, FamGateway POST or GET)
   */
  public static async testGatewayCall(params: {
    amount: number;
    customerName: string;
    customerEmail?: string;
    note?: string;
    method?: 'POST' | 'GET';
  }): Promise<{
    success: boolean;
    method: 'POST' | 'GET';
    status: number;
    latencyMs: number;
    rawResponse: string;
    orderData?: GatewayOrderData;
    payloadSent: any;
  }> {
    const config = db.gatewayConfig;
    const apiKey = config.apiKey?.trim() || 'fam_67c5e10fc423d5ef37aac212a20e55c63d51b7fe';
    const postUrl = config.apiUrl?.trim() || 'https://payment-gateway-87gk.onrender.com/api/create-order';
    const getUrl = config.qrAliasUrl?.trim() || 'https://payment-gateway-87gk.onrender.com/api/qr.php';
    const method = params.method || 'POST';

    const startTime = Date.now();

    if (method === 'GET') {
      // Query Alias (GET)
      const url = new URL(getUrl);
      url.searchParams.set('api_key', apiKey);
      url.searchParams.set('x-api-key', apiKey);
      url.searchParams.set('amount', params.amount.toString());
      url.searchParams.set('customer_name', params.customerName || 'Rahul');

      const payloadSent = {
        endpoint: url.toString(),
        method: 'GET',
        headers: {
          'x-api-key': `${apiKey.slice(0, 8)}...`,
        },
        query_params: {
          api_key: `${apiKey.slice(0, 8)}...`,
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
            'x-api-key': apiKey,
            'X-Api-Key': apiKey,
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);
        const latencyMs = Date.now() - startTime;
        const rawText = await response.text();

        let orderData: GatewayOrderData | undefined;
        try {
          const parsed = JSON.parse(rawText);
          orderData = parsed.data || parsed;
          if (orderData && (orderData.qr_data_url || parsed.qr_data_url) && !orderData.qr_url) {
            orderData.qr_url = orderData.qr_data_url || parsed.qr_data_url;
          }
        } catch (e) {}

        return {
          success: response.ok,
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
      // POST JSON: Render FGW & FamGateway Compatible Payload
      const postBody = {
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
          'X-Api-Key': `${apiKey.slice(0, 8)}...`,
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
        try {
          const parsed = JSON.parse(rawText);
          orderData = parsed.data || parsed;
          if (orderData && (orderData.qr_data_url || parsed.qr_data_url) && !orderData.qr_url) {
            orderData.qr_url = orderData.qr_data_url || parsed.qr_data_url;
          }
        } catch (e) {}

        return {
          success: response.ok,
          method: 'POST',
          status: response.status,
          latencyMs,
          rawResponse: rawText,
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
      db.save();
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
    return deposit;
  }

  /**
   * Processes incoming automated webhooks from Payment Gateway
   */
  public static processWebhook(payload: any): { success: boolean; message: string; deposit?: Deposit } {
    const orderId = payload.order_id || payload.orderId || payload.id || payload.data?.order_id || payload.data?.id;
    const utr = payload.utr || payload.bank_ref || payload.upi_ref_no || payload.reference_no || payload.txn_id;
    const status = (payload.status || payload.event || payload.payment_status || '').toLowerCase();

    if (!orderId && !utr) {
      return { success: false, message: 'Missing order_id or utr in webhook payload' };
    }

    // Find deposit by gateway order ID or transaction ID
    const deposit = db.deposits.find(
      d =>
        (orderId && (d.gatewayOrderId === String(orderId) || d.transactionId === String(orderId) || d.id === String(orderId))) ||
        (utr && d.upiRefNumber === utr)
    );

    if (!deposit) {
      return { success: false, message: `Deposit matching order ${orderId || utr} not found.` };
    }

    if (deposit.status === 'SUCCESS') {
      return { success: true, message: 'Deposit already processed and credited.', deposit };
    }

    if (status.includes('success') || status.includes('paid') || status.includes('completed')) {
      const completed = PaymentGatewayAdapter.completeDeposit(deposit.id, utr || `WB-${Date.now()}`);
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

  public static async checkStatus(depositId: string): Promise<Deposit> {
    const deposit = db.deposits.find(d => d.id === depositId);
    if (!deposit) throw new Error('Deposit not found.');

    if (deposit.status === 'SUCCESS' || deposit.status === 'EXPIRED') {
      return deposit;
    }

    if (new Date() > new Date(deposit.expiresAt)) {
      deposit.status = 'EXPIRED';
      db.save();
      return deposit;
    }

    // Live Gateway Status Verification
    const config = db.gatewayConfig;
    const apiKey = config.apiKey?.trim();
    const orderId = deposit.gatewayOrderId;

    if (apiKey && orderId) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 2500);

        // 1. Try GET /api/order-status/:orderId endpoint (Render FGW & FamGateway)
        const baseUrl = config.apiUrl ? config.apiUrl.split('/api/')[0] : 'https://payment-gateway-87gk.onrender.com';
        const orderStatusUrl = `${baseUrl}/api/order-status/${encodeURIComponent(orderId)}`;

        const response = await fetch(orderStatusUrl, {
          method: 'GET',
          headers: {
            'x-api-key': apiKey,
            'X-Api-Key': apiKey,
          },
          signal: controller.signal,
        });

        clearTimeout(timeout);

        if (response.ok) {
          const resData: any = await response.json();
          const pStatus = (
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
              `FGW-${Date.now()}`;
            return PaymentGatewayAdapter.completeDeposit(deposit.id, utr);
          }
        } else {
          // 2. Fallback to POST check-order-status endpoint
          const checkUrl = config.apiUrl?.includes('/create-order')
            ? config.apiUrl.replace('/create-order', '/check-order-status')
            : `${baseUrl}/api/check-order-status`;

          const postController = new AbortController();
          const postTimeout = setTimeout(() => postController.abort(), 5000);

          const postRes = await fetch(checkUrl, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Api-Key': apiKey,
              'x-api-key': apiKey,
            },
            body: JSON.stringify({
              order_id: orderId,
              api_key: apiKey,
            }),
            signal: postController.signal,
          });

          clearTimeout(postTimeout);

          if (postRes.ok) {
            const resData: any = await postRes.json();
            const pStatus = (
              resData.status ||
              resData.payment_status ||
              resData.data?.status ||
              ''
            ).toLowerCase();

            if (pStatus.includes('success') || pStatus.includes('paid') || pStatus.includes('completed')) {
              const utr = resData.utr || resData.data?.utr || resData.bank_ref || `FG-${Date.now()}`;
              return PaymentGatewayAdapter.completeDeposit(deposit.id, utr);
            }
          }
        }
      } catch (err: any) {
        // Fallback silently if gateway status endpoint is unresponsive
      }
    }

    return deposit;
  }
}

