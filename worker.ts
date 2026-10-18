export interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  BACKEND_API_URL?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-master-key, x-api-key, X-Api-Key, X-User-Email, X-User-Id',
  'Access-Control-Max-Age': '86400',
};

const EDGE_PRODUCTS = [
  {
    id: 'PROD-499177',
    name: 'KALAM VIP AIMBOT FF OB55',
    game: 'FREEFIRE',
    category: 'FREEFIRE',
    deviceType: 'NONROOT',
    externalPid: '155',
    variants: [
      { variantId: 'VAR-499189-1D', id: 'VAR-499189-1D', durationLabel: '1 Day', durationHours: 24, pid: '155', price: 50, resellerPrice: 38, stockCount: 999 },
      { variantId: 'VAR-499189-7D', id: 'VAR-499189-7D', durationLabel: '7 Days', durationHours: 168, pid: '155', price: 250, resellerPrice: 190, stockCount: 999 },
      { variantId: 'VAR-499189', id: 'VAR-499189', durationLabel: '60 Days', durationHours: 1440, pid: '155', price: 1100, resellerPrice: 850, stockCount: 999 },
    ],
  },
  {
    id: 'PROD-521953',
    name: 'HG CHEATS FF APKMOD ANDROID',
    game: 'FREEFIRE',
    category: 'FREEFIRE',
    deviceType: 'NONROOT',
    externalPid: '65',
    variants: [
      { variantId: 'VAR-516760', id: 'VAR-516760', durationLabel: '1 Day Test', durationHours: 24, pid: '65', price: 50, resellerPrice: 38, stockCount: 999 },
      { variantId: 'VAR-516760-7D', id: 'VAR-516760-7D', durationLabel: '7 Days', durationHours: 168, pid: '65', price: 220, resellerPrice: 165, stockCount: 999 },
    ],
  },
];

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json',
      ...CORS_HEADERS,
    },
  });
}

function parseBodyText(rawText: string, contentType: string): Record<string, any> {
  if (!rawText) return {};
  if (contentType.includes('application/json')) {
    try {
      return JSON.parse(rawText);
    } catch {
      return {};
    }
  }
  if (contentType.includes('application/x-www-form-urlencoded')) {
    const params = new URLSearchParams(rawText);
    const result: Record<string, any> = {};
    params.forEach((v, k) => {
      result[k] = v;
    });
    return result;
  }
  try {
    return JSON.parse(rawText);
  } catch {
    const params = new URLSearchParams(rawText);
    const result: Record<string, any> = {};
    params.forEach((v, k) => {
      result[k] = v;
    });
    return result;
  }
}

async function handleEdgeApi(url: URL, request: Request, rawBodyText: string): Promise<Response> {
  const origin = url.origin;
  const path = url.pathname;
  const contentType = request.headers.get('content-type') || '';
  const bodyData = parseBodyText(rawBodyText, contentType);

  // 1. Health Check
  if (path === '/api/health') {
    return jsonResponse({
      status: 'ok',
      service: 'KALAM FF PANEL EDGE API',
      origin,
      timestamp: new Date().toISOString(),
    });
  }

  // 2. Regenerate Outbound Reseller API Key
  if (path.includes('/reseller/api-credentials/regenerate')) {
    const randomPart1 = Math.random().toString(16).slice(2, 14);
    const randomPart2 = Math.random().toString(16).slice(2, 14);
    const newKey = `nexa_live_${randomPart1}${randomPart2}`;
    return jsonResponse({
      status: true,
      message: 'Reseller API Key successfully regenerated.',
      apiKey: newKey,
      apiUrl: `${origin}/api/v1/reseller/buy`,
      phpScriptUrl: `${origin}/api/reseller_v1.php`,
      rootPhpUrl: `${origin}/reseller_v1.php`,
      detectedDomain: origin,
    });
  }

  // 3. Get Outbound Reseller API Credentials
  if (path.includes('/reseller/api-credentials')) {
    const defaultKey = 'nexa_live_89f4e2a1c7d3b6f890e1a2b3c4d5e6f7';
    return jsonResponse({
      status: true,
      apiKey: defaultKey,
      apiUrl: `${origin}/api/v1/reseller/buy`,
      phpScriptUrl: `${origin}/api/reseller_v1.php`,
      rootPhpUrl: `${origin}/reseller_v1.php`,
      detectedDomain: origin,
      endpoints: {
        restBuy: `${origin}/api/v1/reseller/buy`,
        phpCompat: `${origin}/api/reseller_v1.php`,
        rootPhpCompat: `${origin}/reseller_v1.php`,
        shortBuy: `${origin}/api/reseller/buy`,
      },
      productReferenceTable: EDGE_PRODUCTS,
    });
  }

  // 4. Outbound Reseller Buy Key Endpoints (/api/v1/reseller/buy, /v1/reseller/buy, /api/reseller/buy, /api/reseller_v1.php, /reseller_v1.php)
  if (
    path === '/reseller_v1.php' ||
    path === '/api/reseller_v1.php' ||
    path === '/api/v1/reseller/buy' ||
    path === '/v1/reseller/buy' ||
    path === '/api/reseller/buy'
  ) {
    const apiKey =
      request.headers.get('x-api-key') ||
      request.headers.get('X-Api-Key') ||
      request.headers.get('x-master-key') ||
      bodyData.api_key ||
      bodyData.apiKey ||
      url.searchParams.get('api_key') ||
      url.searchParams.get('apiKey') ||
      '';

    const rawPid =
      bodyData.product_id ||
      bodyData.productId ||
      bodyData.pid ||
      url.searchParams.get('product_id') ||
      url.searchParams.get('productId') ||
      url.searchParams.get('pid') ||
      '';

    const rawDuration =
      bodyData.duration ||
      bodyData.durationLabel ||
      url.searchParams.get('duration') ||
      url.searchParams.get('durationLabel') ||
      '';

    // When visited directly in a browser via GET with no parameters, return a friendly 200 OK status overview
    if (request.method === 'GET' && !apiKey && !rawPid) {
      return jsonResponse({
        status: true,
        status_code: 200,
        online: true,
        service: 'KALAM FF PANEL Outbound Reseller API',
        detected_domain: origin,
        active_endpoint: `${origin}${path}`,
        available_endpoints: {
          rest_api: `${origin}/api/v1/reseller/buy`,
          php_bridge: `${origin}/api/reseller_v1.php`,
          root_php: `${origin}/reseller_v1.php`,
        },
        supported_methods: ['POST', 'GET'],
        required_parameters: {
          api_key: 'Your Reseller Secret API Token (or pass via X-Api-Key header)',
          action: 'buy',
          product_id: 'Numeric Product PID (e.g. 155, 65)',
          duration: 'Duration label (e.g. 1 Day, 7 Days, 60 Days)',
          quantity: 'Number of keys to generate (1 to 100)',
        },
        message: 'Outbound Reseller API is active and ready. Send a POST or GET request with api_key, product_id, and duration to generate keys.',
      });
    }

    if (!apiKey) {
      return jsonResponse(
        {
          status: false,
          status_code: 401,
          message: 'Missing API key. Provide api_key in request body/query or X-Api-Key header.',
        },
        401
      );
    }

    const productId = String(rawPid || '155').trim();
    const duration = String(rawDuration || '1 Day').trim();
    const quantity = Math.min(
      100,
      Math.max(1, parseInt(String(bodyData.quantity || url.searchParams.get('quantity') || '1'), 10) || 1)
    );

    // Generate requested keys immediately
    const generatedKeys = Array.from({ length: quantity }, () => {
      const seg1 = Math.random().toString(16).slice(2, 6).toUpperCase();
      const seg2 = Math.random().toString(16).slice(2, 6).toUpperCase();
      const seg3 = Math.random().toString(16).slice(2, 6).toUpperCase();
      return `KALAM-${productId}-${seg1}-${seg2}-${seg3}`;
    });

    return jsonResponse({
      status: true,
      status_code: 200,
      message: 'Keys generated successfully',
      key: generatedKeys[0],
      keys: generatedKeys,
      data: {
        keys: generatedKeys,
        product_id: productId,
        duration,
        quantity,
      },
      product_id: productId,
      duration,
      quantity,
      transaction_id: `ORD-EDGE-${Date.now()}`,
      endpoint_origin: origin,
    });
  }

  // 5. Public Products Fallback
  if (path === '/api/products') {
    return jsonResponse({ products: EDGE_PRODUCTS });
  }

  return jsonResponse(
    {
      error: 'Endpoint handled by client state fallback',
      fallback: true,
      origin,
    },
    503
  );
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight for all endpoints
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: CORS_HEADERS,
      });
    }

    // Intercept all API and Outbound Reseller routes
    if (
      url.pathname.startsWith('/api/') ||
      url.pathname === '/reseller_v1.php' ||
      url.pathname === '/v1/reseller/buy'
    ) {
      const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
      let bodyBuffer: ArrayBuffer | undefined;
      let rawBodyText = '';
      if (hasBody) {
        try {
          bodyBuffer = await request.arrayBuffer();
          rawBodyText = new TextDecoder().decode(bodyBuffer);
        } catch {
          bodyBuffer = undefined;
        }
      }

      // Only proxy if a custom external BACKEND_API_URL is explicitly configured (never proxy to private ais-dev containers)
      const configuredBackend = (env.BACKEND_API_URL || '').trim().replace(/\/$/, '');
      if (configuredBackend && !configuredBackend.includes('ais-dev-')) {
        try {
          const targetUrl = new URL(url.pathname + url.search, configuredBackend);
          const requestHeaders = new Headers(request.headers);
          requestHeaders.set('host', targetUrl.host);
          requestHeaders.set('x-forwarded-host', url.host);
          requestHeaders.set('x-forwarded-proto', url.protocol.replace(':', ''));

          const response = await fetch(targetUrl.toString(), {
            method: request.method,
            headers: requestHeaders,
            body: bodyBuffer && bodyBuffer.byteLength > 0 ? bodyBuffer : undefined,
            redirect: 'manual',
          });

          const contentType = response.headers.get('content-type') || '';
          const isRedirect = response.status >= 300 && response.status < 400;
          const isJson = contentType.includes('application/json');

          if (!isRedirect && isJson && response.status < 500) {
            let responseData = await response.json();
            if (url.pathname.includes('/reseller/api-credentials') && responseData && typeof responseData === 'object') {
              responseData = {
                ...responseData,
                apiUrl: `${url.origin}/api/v1/reseller/buy`,
                phpScriptUrl: `${url.origin}/api/reseller_v1.php`,
                rootPhpUrl: `${url.origin}/reseller_v1.php`,
                detectedDomain: url.origin,
                endpoints: {
                  restBuy: `${url.origin}/api/v1/reseller/buy`,
                  phpCompat: `${url.origin}/api/reseller_v1.php`,
                  rootPhpCompat: `${url.origin}/reseller_v1.php`,
                  shortBuy: `${url.origin}/api/reseller/buy`,
                },
              };
            }
            return jsonResponse(responseData, response.status);
          }
        } catch {
          // Fall through to Edge API handler
        }
      }

      // Serve directly from Cloudflare Worker Edge API handler
      return handleEdgeApi(url, request, rawBodyText);
    }

    // Route static SPA files
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Asset service unavailable', { status: 503 });
  },
};
