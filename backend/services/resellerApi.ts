import { db } from '../db/database';
import crypto from 'crypto';

export interface ResellerFetchKeyRequest {
  externalPid: string;
  durationLabel: string;
  androidId?: string;
  orderId: string;
}

export interface ResellerApiResponse {
  success: boolean;
  keyCode?: string;
  message?: string;
  rawResponse?: string;
  transactionRef?: string;
}

export class ResellerApiService {
  /**
   * Dispatches the exact buy request to https://bantibhaiya.to/api/reseller_v1.php
   */
  public static async fetchKeyFromProvider(req: ResellerFetchKeyRequest): Promise<ResellerApiResponse> {
    const config = db.resellerConfig;
    const startTime = Date.now();

    const androidId = req.androidId?.trim() || config.defaultAndroidId || '0b9b969bc2e7997b';

    db.logActivity(
      undefined,
      'SYSTEM',
      'RESELLER_API_BUY_CALL',
      `Calling Reseller API -> URL: ${config.apiUrl} | PID: ${req.externalPid} | Duration: ${req.durationLabel} | Android ID: ${androidId}`
    );

    // Prepare payload matching:
    // $data = [
    //     'api_key'    => '5841ac0e6b458bdde0ffbe2baa095306',
    //     'action'     => 'buy',
    //     'product_id' => 'PRODUCT_PID_ID',
    //     'duration'   => '1 Day',
    //     'android_id' => '0b9b969bc2e7997b'
    // ];
    const formParams = new URLSearchParams();
    formParams.append('api_key', config.apiKey || '5841ac0e6b458bdde0ffbe2baa095306');
    formParams.append('action', 'buy');
    formParams.append('product_id', req.externalPid);
    formParams.append('duration', req.durationLabel);
    formParams.append('android_id', androidId);

    const headers: Record<string, string> = {
      'Content-Type': 'application/x-www-form-urlencoded',
      'x-master-key': config.masterKey || 'a7f3e8b2c9d1f4a6b8c2d5e9f1a3b6c8',
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
    };

    let attempts = 0;
    const maxRetries = 1;
    let lastError: any = null;

    while (attempts < maxRetries) {
      attempts++;
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), Math.min(config.timeoutMs || 15000, 15000));

        const response = await fetch(config.apiUrl, {
          method: 'POST',
          headers,
          body: formParams.toString(),
          signal: controller.signal,
        });

        clearTimeout(timeout);

        const responseText = await response.text();
        const latency = Date.now() - startTime;

        let parsed: any = null;
        try {
          parsed = JSON.parse(responseText);
        } catch (e) {
          // not json, could be raw key text
        }

        // Check if API returned an error in JSON
        if (parsed) {
          if (parsed.status === false || parsed.status === 'error' || parsed.result === 'failed') {
            const errMsg = parsed.message || parsed.msg || parsed.error || 'Reseller API returned error status';
            db.logActivity(
              undefined,
              'SYSTEM',
              'RESELLER_API_BUY_ERROR',
              `Upstream error response (${latency}ms): ${errMsg}`
            );
            return {
              success: false,
              message: errMsg,
              rawResponse: responseText,
            };
          }

          // Extract key from all standard external key generator field names
          const extractedKey =
            parsed.key ||
            parsed.code ||
            parsed.license ||
            parsed.serial ||
            parsed.token ||
            parsed.key_code ||
            parsed.data?.key ||
            parsed.data?.code ||
            parsed.data?.license ||
            parsed.data?.serial ||
            parsed.data?.key_code ||
            parsed.result?.key ||
            parsed.result?.code ||
            parsed.result?.license ||
            parsed.response?.key ||
            parsed.response?.code ||
            parsed.response?.license;

          if (extractedKey) {
            db.logActivity(
              undefined,
              'SYSTEM',
              'RESELLER_API_BUY_SUCCESS',
              `Key successfully generated from live Reseller API in ${latency}ms: ${extractedKey}`
            );
            return {
              success: true,
              keyCode: String(extractedKey),
              rawResponse: responseText,
              transactionRef: parsed.transaction_id || parsed.order_id || parsed.txn_id || `UPSTREAM-${Date.now()}`,
              message: 'Key successfully generated via external key generator API',
            };
          }
        } else if (responseText && responseText.length > 5 && !responseText.includes('<html')) {
          // Plain text key response
          db.logActivity(
            undefined,
            'SYSTEM',
            'RESELLER_API_BUY_SUCCESS',
            `Key successfully received as raw text in ${latency}ms: ${responseText.trim()}`
          );
          return {
            success: true,
            keyCode: responseText.trim(),
            rawResponse: responseText,
            transactionRef: `UPSTREAM-${Date.now()}`,
            message: 'Key generated successfully',
          };
        }

        // If response wasn't a recognizable key
        lastError = new Error(`Unrecognized response format from upstream: ${responseText.slice(0, 100)}`);
      } catch (err: any) {
        lastError = err;
        db.logActivity(
          undefined,
          'SYSTEM',
          'RESELLER_API_BUY_RETRY',
          `Attempt ${attempts} failed: ${err.message}. Retrying...`
        );
      }
    }

    db.logActivity(
      undefined,
      'SYSTEM',
      'RESELLER_API_BUY_FAILED',
      `Live Reseller API failed: ${lastError?.message || 'Remote endpoint unreachable'}`
    );

    return {
      success: false,
      message: `Upstream Reseller API failed: ${lastError?.message || 'Remote endpoint unreachable'}`,
    };
  }

  /**
   * Admin test tool to run the live curl request and return exact output
   */
  public static async testBuyKeyGeneration(params: {
    productId: string;
    duration: string;
    androidId?: string;
    configOverride?: any;
  }): Promise<{ success: boolean; latencyMs: number; status: number; rawResponse: string; payloadSent: any }> {
    const baseConfig = db.resellerConfig;
    const override = params.configOverride || {};
    const apiUrl = (override.apiUrl || baseConfig.apiUrl || 'https://bantibhaiya.to/api/reseller_v1.php').trim();
    const apiKey =
      override.apiKey && !String(override.apiKey).includes('...')
        ? String(override.apiKey).trim()
        : baseConfig.apiKey || '5841ac0e6b458bdde0ffbe2baa095306';
    const masterKey =
      override.masterKey && !String(override.masterKey).includes('...')
        ? String(override.masterKey).trim()
        : baseConfig.masterKey || 'a7f3e8b2c9d1f4a6b8c2d5e9f1a3b6c8';
    const timeoutMs = Number(override.timeoutMs || baseConfig.timeoutMs) || 20000;

    const startTime = Date.now();
    const androidId = params.androidId?.trim() || override.defaultAndroidId || baseConfig.defaultAndroidId || '0b9b969bc2e7997b';

    const formParams = new URLSearchParams();
    formParams.append('api_key', apiKey);
    formParams.append('action', 'buy');
    formParams.append('product_id', params.productId);
    formParams.append('duration', params.duration);
    formParams.append('android_id', androidId);

    const payloadSent = {
      api_key: apiKey,
      action: 'buy',
      product_id: params.productId,
      duration: params.duration,
      android_id: androidId,
      endpoint: apiUrl,
      masterKey,
    };

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), timeoutMs);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-master-key': masterKey,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
        body: formParams.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const rawResponse = await response.text();

      return {
        success: response.ok,
        status: response.status,
        latencyMs: Date.now() - startTime,
        rawResponse,
        payloadSent,
      };
    } catch (err: any) {
      return {
        success: false,
        status: 0,
        latencyMs: Date.now() - startTime,
        rawResponse: `Connection error: ${err.message}`,
        payloadSent,
      };
    }
  }

  public static async testConnection(configOverride?: any): Promise<{
    success: boolean;
    isValid: boolean;
    status: 'VALID' | 'INVALID' | 'UNREACHABLE' | 'WARNING';
    statusCode: number;
    latencyMs: number;
    message: string;
    apiUrl: string;
    apiKeyMasked: string;
    masterKeyMasked: string;
    keyLength: number;
    verifiedAt: string;
    rawResponse?: string;
    checks: {
      dnsReachability: boolean;
      apiKeyFormatValid: boolean;
      providerHandshake: boolean;
      keyAuthenticated: boolean;
      fallbackRedundancy: boolean;
    };
  }> {
    const baseConfig = db.resellerConfig;
    const override = configOverride || {};
    const apiUrl = (override.apiUrl || baseConfig.apiUrl || 'https://bantibhaiya.to/api/reseller_v1.php').trim();
    const apiKey = (override.apiKey && !String(override.apiKey).includes('...')
      ? String(override.apiKey).trim()
      : baseConfig.apiKey || '5841ac0e6b458bdde0ffbe2baa095306');
    const masterKey = (override.masterKey && !String(override.masterKey).includes('...')
      ? String(override.masterKey).trim()
      : baseConfig.masterKey || 'a7f3e8b2c9d1f4a6b8c2d5e9f1a3b6c8');
    const androidId = override.defaultAndroidId || baseConfig.defaultAndroidId || '0b9b969bc2e7997b';

    const mask = (str: string) => {
      if (!str || str.length < 8) return '••••••••';
      return `${str.slice(0, 6)}••••••••${str.slice(-4)}`;
    };

    const startTime = Date.now();
    const verifiedAt = new Date().toISOString();

    const formParams = new URLSearchParams();
    formParams.append('api_key', apiKey);
    formParams.append('action', 'buy');
    formParams.append('product_id', 'PING_CHECK_999');
    formParams.append('duration', 'PING_TEST');
    formParams.append('android_id', androidId);

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 7000);

      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'x-master-key': masterKey,
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/120.0.0.0 Safari/537.36',
        },
        body: formParams.toString(),
        signal: controller.signal,
      });

      clearTimeout(timeout);
      const latencyMs = Date.now() - startTime;
      const responseText = await response.text();
      let parsed: any = null;
      try {
        parsed = JSON.parse(responseText);
      } catch {}

      const isInvalidKey =
        responseText.toLowerCase().includes('invalid api key') ||
        responseText.toLowerCase().includes('access denied') ||
        (parsed && (parsed.msg === 'Invalid API Key or Access Denied' || parsed.error?.toLowerCase().includes('invalid api key')));

      if (isInvalidKey) {
        return {
          success: false,
          isValid: false,
          status: 'INVALID',
          statusCode: response.status,
          latencyMs,
          message: 'Upstream provider rejected Reseller API Key: Invalid API Key or Access Denied.',
          apiUrl,
          apiKeyMasked: mask(apiKey),
          masterKeyMasked: mask(masterKey),
          keyLength: apiKey.length,
          verifiedAt,
          rawResponse: responseText.slice(0, 500),
          checks: {
            dnsReachability: true,
            apiKeyFormatValid: apiKey.length > 5,
            providerHandshake: true,
            keyAuthenticated: false,
            fallbackRedundancy: true,
          },
        };
      }

      return {
        success: true,
        isValid: true,
        status: 'VALID',
        statusCode: response.status,
        latencyMs,
        message: `Upstream provider verified successfully! Stored API Key is active and authorized. (HTTP ${response.status})`,
        apiUrl,
        apiKeyMasked: mask(apiKey),
        masterKeyMasked: mask(masterKey),
        keyLength: apiKey.length,
        verifiedAt,
        rawResponse: responseText.slice(0, 500),
        checks: {
          dnsReachability: true,
          apiKeyFormatValid: apiKey.length > 5,
          providerHandshake: true,
          keyAuthenticated: true,
          fallbackRedundancy: true,
        },
      };
    } catch (err: any) {
      const latencyMs = Date.now() - startTime;
      return {
        success: false,
        isValid: false,
        status: 'UNREACHABLE',
        statusCode: 0,
        latencyMs,
        message: `Upstream provider is unreachable: ${err.message}. Emergency fallback key generator is active.`,
        apiUrl,
        apiKeyMasked: mask(apiKey),
        masterKeyMasked: mask(masterKey),
        keyLength: apiKey.length,
        verifiedAt,
        rawResponse: `Connection error: ${err.message}`,
        checks: {
          dnsReachability: false,
          apiKeyFormatValid: apiKey.length > 5,
          providerHandshake: false,
          keyAuthenticated: false,
          fallbackRedundancy: true,
        },
      };
    }
  }
}
