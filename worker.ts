export interface Env {
  ASSETS: {
    fetch: (request: Request) => Promise<Response>;
  };
  BACKEND_API_URL?: string;
}

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
  'Access-Control-Allow-Headers':
    'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-Email, X-User-Id, X-Api-Key, X-Master-Key, x-api-key, x-master-key',
};

const DEFAULT_EDGE_PRODUCTS = [
  {
    id: 'PROD-FF-155',
    name: 'KALAM VIP PANEL (ANDROID / PC)',
    game: 'Free Fire Max',
    description: 'High-stability VIP panel with instant auto-key delivery.',
    externalPid: '155',
    isActive: true,
    isUnderMaintenance: false,
    variants: [
      { id: 'VAR-155-1D', productId: 'PROD-FF-155', durationLabel: '1 Day', durationHours: 24, price: 120, resellerPrice: 80, stockCount: 999, externalPid: '155', externalDuration: '1 Day', isActive: true },
      { id: 'VAR-155-7D', productId: 'PROD-FF-155', durationLabel: '7 Days', durationHours: 168, price: 450, resellerPrice: 320, stockCount: 999, externalPid: '155', externalDuration: '7 Days', isActive: true },
      { id: 'VAR-155-30D', productId: 'PROD-FF-155', durationLabel: '30 Days', durationHours: 720, price: 1100, resellerPrice: 800, stockCount: 999, externalPid: '155', externalDuration: '30 Days', isActive: true },
      { id: 'VAR-155-60D', productId: 'PROD-FF-155', durationLabel: '60 Days', durationHours: 1440, price: 1800, resellerPrice: 1350, stockCount: 999, externalPid: '155', externalDuration: '60 Days', isActive: true },
    ],
  },
  {
    id: 'PROD-BGMI-65',
    name: 'BGMI LOADER PRO V2',
    game: 'BGMI',
    description: 'Safe ESP & aim assistance loader for Android non-root devices.',
    externalPid: '65',
    isActive: true,
    isUnderMaintenance: false,
    variants: [
      { id: 'VAR-65-1D', productId: 'PROD-BGMI-65', durationLabel: '1 Day', durationHours: 24, price: 150, resellerPrice: 100, stockCount: 999, externalPid: '65', externalDuration: '1 Day', isActive: true },
      { id: 'VAR-65-7D', productId: 'PROD-BGMI-65', durationLabel: '7 Days', durationHours: 168, price: 550, resellerPrice: 400, stockCount: 999, externalPid: '65', externalDuration: '7 Days', isActive: true },
      { id: 'VAR-65-30D', productId: 'PROD-BGMI-65', durationLabel: '30 Days', durationHours: 720, price: 1300, resellerPrice: 950, stockCount: 999, externalPid: '65', externalDuration: '30 Days', isActive: true },
    ],
  },
];

interface EdgeUser {
  id: string;
  username: string;
  email: string;
  role: 'USER' | 'RESELLER' | 'ADMIN' | 'SUPER ADMIN';
  balance: number;
  apiKey: string;
  referralCode: string;
  twoFactorEnabled: boolean;
  isBanned: boolean;
  createdAt: string;
  updatedAt: string;
}

interface EdgeKey {
  id: string;
  productId: string;
  variantId: string;
  keyCode: string;
  isUsed: boolean;
  assignedUserId?: string;
  assignedOrderId?: string;
  assignedAt?: string;
  expiresAt?: string;
  status: 'ACTIVE' | 'USED' | 'EXPIRED';
  purchaseSource?: 'API' | 'WEB';
  purchaseSourceLabel?: string;
  createdAt: string;
}

interface EdgeOrder {
  id: string;
  userId: string;
  productId: string;
  variantId: string;
  productName: string;
  durationLabel: string;
  pricePaid: number;
  deliveredKeyId: string;
  deliveredKeyCode: string;
  status: 'COMPLETED' | 'FAILED';
  purchaseSource?: 'API' | 'WEB';
  purchaseSourceLabel?: string;
  createdAt: string;
}

interface EdgeTransaction {
  id: string;
  userId: string;
  type: 'CREDIT' | 'DEBIT';
  amount: number;
  description: string;
  referenceId?: string;
  purchaseSource?: 'API' | 'WEB';
  purchaseSourceLabel?: string;
  createdAt: string;
}

interface EdgeDbState {
  users: EdgeUser[];
  products: any[];
  digitalKeys: EdgeKey[];
  orders: EdgeOrder[];
  transactions: EdgeTransaction[];
  resellerConfig: {
    apiUrl: string;
    apiKey: string;
    masterKey: string;
    timeoutMs: number;
    retryAttempts: number;
    autoSyncStock: boolean;
    isLiveApiEnabled: boolean;
    defaultAndroidId: string;
  };
}

function getEdgeDb(): EdgeDbState {
  const g = globalThis as any;
  if (!g.__KALAM_EDGE_DB__) {
    g.__KALAM_EDGE_DB__ = {
      users: [
        {
          id: 'USR-KALAM-172010',
          username: 'kalam',
          email: 'kalam172010@gmail.com',
          role: 'ADMIN',
          balance: 5000.0,
          apiKey: 'nexa_live_89f4e2a1c7d3b6f890e1a2b3c4d5e6f7',
          referralCode: 'NXKALAM1',
          twoFactorEnabled: false,
          isBanned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
        {
          id: 'USR-101',
          username: 'pro_gamer99',
          email: 'user@example.com',
          role: 'USER',
          balance: 0.0,
          apiKey: 'nexa_live_user101_0000000000000000',
          referralCode: 'NEXA99PRO',
          twoFactorEnabled: false,
          isBanned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        },
      ],
      products: JSON.parse(JSON.stringify(DEFAULT_EDGE_PRODUCTS)),
      digitalKeys: [],
      orders: [],
      transactions: [],
      resellerConfig: {
        apiUrl: 'https://bantibhaiya.to/api/reseller_v1.php',
        apiKey: '5841ac0e6b458bdde0ffbe2baa095306',
        masterKey: 'a7f3e8b2c9d1f4a6b8c2d5e9f1a3b6c8',
        timeoutMs: 15000,
        retryAttempts: 2,
        autoSyncStock: true,
        isLiveApiEnabled: true,
        defaultAndroidId: '0b9b969bc2e7997b',
      },
    } as EdgeDbState;
  }
  return g.__KALAM_EDGE_DB__ as EdgeDbState;
}

function generateRandomHex(len = 16): string {
  const chars = '0123456789abcdef';
  let out = '';
  for (let i = 0; i < len; i++) {
    out += chars[Math.floor(Math.random() * chars.length)];
  }
  return out;
}

function isPrimaryAdminEmail(email?: string, username?: string): boolean {
  const e = (email || '').toLowerCase().trim();
  const u = (username || '').toLowerCase().trim();
  return (
    e === 'kk7953926@gmail.com' ||
    e === 'kalam172010@gmail.com' ||
    e === 'kalamkalam1234kd@gmail.com' ||
    e === 'admin@example.com' ||
    u === 'kalam' ||
    u === 'admin'
  );
}

function resolveUserFromRequest(request: Request, bodyData?: Record<string, any>): EdgeUser {
  const edgeDb = getEdgeDb();
  const headerId = (request.headers.get('x-user-id') || request.headers.get('X-User-Id') || bodyData?.userId || bodyData?.uid || '').trim();
  const headerEmail = (request.headers.get('x-user-email') || request.headers.get('X-User-Email') || bodyData?.email || '').trim().toLowerCase();

  let user: EdgeUser | undefined;
  if (headerId) {
    user = edgeDb.users.find(u => u.id === headerId);
  }
  if (!user && headerEmail) {
    user = edgeDb.users.find(u => u.email.toLowerCase() === headerEmail);
  }

  if (!user && (headerId || headerEmail)) {
    const isAdmin = isPrimaryAdminEmail(headerEmail, bodyData?.username);
    const newUser: EdgeUser = {
      id: headerId || `USR-${Date.now()}`,
      username: bodyData?.username || bodyData?.displayName || (headerEmail ? headerEmail.split('@')[0] : 'user'),
      email: headerEmail || `${headerId}@user.local`,
      role: isAdmin ? 'ADMIN' : 'USER',
      balance: isAdmin ? 5000.0 : 0.0,
      apiKey: isAdmin ? 'nexa_live_89f4e2a1c7d3b6f890e1a2b3c4d5e6f7' : `nexa_live_${generateRandomHex(24)}`,
      referralCode: `NX${generateRandomHex(4).toUpperCase()}`,
      twoFactorEnabled: false,
      isBanned: false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    edgeDb.users.push(newUser);
    return newUser;
  }

  return user || edgeDb.users[0];
}

function findProductAndVariant(rawPid: string, rawDuration: string) {
  const edgeDb = getEdgeDb();
  const pidClean = String(rawPid || '').trim();
  const durClean = String(rawDuration || '').trim().toLowerCase();
  const durDigits = durClean.replace(/[^0-9]/g, '');

  for (const p of edgeDb.products) {
    const variants: any[] = p.variants || [];
    for (const v of variants) {
      const pMatch =
        v.id === pidClean ||
        p.id === pidClean ||
        v.externalPid === pidClean ||
        p.externalPid === pidClean ||
        p.name?.toLowerCase() === pidClean.toLowerCase();
      if (pMatch) {
        if (!durClean) return { product: p, variant: v };
        const vDur = String(v.durationLabel || '').toLowerCase();
        const vExtDur = String(v.externalDuration || '').toLowerCase();
        if (
          vDur === durClean ||
          vExtDur === durClean ||
          vDur.includes(durClean) ||
          (durDigits && vDur.replace(/[^0-9]/g, '') === durDigits)
        ) {
          return { product: p, variant: v };
        }
      }
    }
  }

  // Fallback by product match alone
  for (const p of edgeDb.products) {
    if (p.id === pidClean || p.externalPid === pidClean || p.name?.toLowerCase().includes(pidClean.toLowerCase())) {
      const variants: any[] = p.variants || [];
      if (variants.length > 0) {
        return { product: p, variant: variants[0] };
      }
    }
  }

  const fallbackProd = edgeDb.products[0] || DEFAULT_EDGE_PRODUCTS[0];
  return { product: fallbackProd, variant: fallbackProd.variants[0] };
}

async function fetchFromUpstreamResellerApi(
  externalPid: string,
  durationLabel: string,
  androidId: string,
  origin: string
): Promise<string | null> {
  const edgeDb = getEdgeDb();
  const cfg = edgeDb.resellerConfig;
  if (!cfg || !cfg.isLiveApiEnabled || !cfg.apiUrl || !cfg.apiKey) return null;

  // Prevent infinite self-loop if upstream URL points to this same worker origin
  try {
    const upstreamHost = new URL(cfg.apiUrl).host.toLowerCase();
    const selfHost = new URL(origin).host.toLowerCase();
    if (upstreamHost === selfHost) return null;
  } catch {
    return null;
  }

  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), Math.min(cfg.timeoutMs || 10000, 12000));
    const formParams = new URLSearchParams();
    formParams.append('api_key', cfg.apiKey);
    formParams.append('action', 'buy');
    formParams.append('product_id', externalPid);
    formParams.append('duration', durationLabel);
    formParams.append('android_id', androidId || cfg.defaultAndroidId || '0b9b969bc2e7997b');

    const res = await fetch(cfg.apiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        Accept: 'application/json, text/plain, */*',
        'X-Api-Key': cfg.apiKey,
      },
      body: formParams.toString(),
      signal: controller.signal,
    });
    clearTimeout(timer);

    if (!res.ok) return null;
    const text = await res.text();
    const data = JSON.parse(text);
    const extracted =
      data?.key ||
      data?.keyCode ||
      data?.license ||
      data?.token ||
      data?.data?.key ||
      data?.data?.license ||
      (Array.isArray(data?.keys) ? data.keys[0] : null) ||
      (Array.isArray(data?.data?.keys) ? data.data.keys[0] : null);
    if (extracted && typeof extracted === 'string' && extracted.trim().length >= 4) {
      return extracted.trim();
    }
  } catch {
    // Fallback to local inventory / key generator
  }
  return null;
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data, null, 2), {
    status,
    headers: {
      'Content-Type': 'application/json; charset=utf-8',
      ...CORS_HEADERS,
    },
  });
}

function parseBodyText(rawText: string, contentType: string): Record<string, any> {
  if (!rawText || !rawText.trim()) return {};
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
  const method = request.method.toUpperCase();
  const contentType = request.headers.get('content-type') || '';
  const bodyData = parseBodyText(rawBodyText, contentType);
  const edgeDb = getEdgeDb();

  // 1. Health Check
  if (path === '/api/health') {
    return jsonResponse({
      status: 'ok',
      service: 'KALAM FF PANEL EDGE API',
      origin,
      timestamp: new Date().toISOString(),
    });
  }

  // 1B. Two-Way State Sync Endpoint (/api/sync/state)
  if (path === '/api/sync/state') {
    if (Array.isArray(bodyData.users)) {
      for (const incomingUser of bodyData.users) {
        if (!incomingUser || !incomingUser.id) continue;
        const existing = edgeDb.users.find(
          u => u.id === incomingUser.id || (incomingUser.email && u.email.toLowerCase() === String(incomingUser.email).toLowerCase())
        );
        if (!existing) {
          edgeDb.users.push({
            id: incomingUser.id,
            username: incomingUser.username || 'user',
            email: incomingUser.email || `${incomingUser.id}@user.local`,
            role: incomingUser.role || 'USER',
            balance: typeof incomingUser.balance === 'number' ? incomingUser.balance : 0,
            apiKey: incomingUser.apiKey || `nexa_live_${generateRandomHex(24)}`,
            referralCode: incomingUser.referralCode || `NX${generateRandomHex(4).toUpperCase()}`,
            twoFactorEnabled: Boolean(incomingUser.twoFactorEnabled),
            isBanned: Boolean(incomingUser.isBanned),
            createdAt: incomingUser.createdAt || new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          });
        } else {
          if (incomingUser.apiKey && !existing.apiKey) existing.apiKey = incomingUser.apiKey;
          if (incomingUser.role) existing.role = incomingUser.role;
          if (typeof incomingUser.balance === 'number' && bodyData.forceBalanceSync) {
            existing.balance = incomingUser.balance;
          }
        }
      }
    }
    if (Array.isArray(bodyData.products) && bodyData.products.length > 0) {
      edgeDb.products = bodyData.products;
    }
    if (bodyData.resellerConfig && typeof bodyData.resellerConfig === 'object') {
      edgeDb.resellerConfig = { ...edgeDb.resellerConfig, ...bodyData.resellerConfig };
    }

    return jsonResponse({
      status: true,
      users: edgeDb.users,
      orders: edgeDb.orders,
      keys: edgeDb.digitalKeys,
      transactions: edgeDb.transactions,
      resellerConfig: edgeDb.resellerConfig,
    });
  }

  // 1C. Auth Sync & Current User (/api/auth/firebase-sync, /api/auth/me, /api/auth/token-refresh)
  if (path === '/api/auth/firebase-sync' || path === '/api/auth/token-refresh') {
    const user = resolveUserFromRequest(request, bodyData);
    return jsonResponse({
      success: true,
      token: `edge_jwt_${user.id}_${Date.now()}`,
      user,
    });
  }

  if (path === '/api/auth/me') {
    const user = resolveUserFromRequest(request, bodyData);
    return jsonResponse({ user });
  }

  // 2. Regenerate Outbound Reseller API Key
  if (path.includes('/reseller/api-credentials/regenerate')) {
    const user = resolveUserFromRequest(request, bodyData);
    const newKey = `nexa_live_${generateRandomHex(28)}`;
    user.apiKey = newKey;
    user.updatedAt = new Date().toISOString();

    return jsonResponse({
      status: true,
      message: 'Reseller API Key successfully regenerated.',
      apiKey: newKey,
      walletBalance: Number(user.balance || 0),
      apiUrl: `${origin}/api/v1/reseller/buy`,
      phpScriptUrl: `${origin}/api/reseller_v1.php`,
      rootPhpUrl: `${origin}/reseller_v1.php`,
      detectedDomain: origin,
    });
  }

  // 3. Get Outbound Reseller API Credentials
  if (path.includes('/reseller/api-credentials')) {
    const user = resolveUserFromRequest(request, bodyData);
    if (!user.apiKey) {
      user.apiKey = isPrimaryAdminEmail(user.email, user.username)
        ? 'nexa_live_89f4e2a1c7d3b6f890e1a2b3c4d5e6f7'
        : `nexa_live_${generateRandomHex(24)}`;
    }
    return jsonResponse({
      status: true,
      apiKey: user.apiKey,
      walletBalance: Number(user.balance || 0),
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
      productReferenceTable: edgeDb.products,
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
    const apiKey = String(
      request.headers.get('x-api-key') ||
        request.headers.get('X-Api-Key') ||
        request.headers.get('x-master-key') ||
        bodyData.api_key ||
        bodyData.apiKey ||
        url.searchParams.get('api_key') ||
        url.searchParams.get('apiKey') ||
        ''
    ).trim();

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

    const androidId = String(
      bodyData.android_id ||
        bodyData.androidId ||
        url.searchParams.get('android_id') ||
        url.searchParams.get('androidId') ||
        edgeDb.resellerConfig.defaultAndroidId ||
        '0b9b969bc2e7997b'
    ).trim();

    // Friendly 200 OK overview when visited in browser via GET with no parameters
    if (method === 'GET' && !apiKey && !rawPid) {
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
          api_key: 'Your Reseller Secret API Token (must belong to an account with sufficient wallet balance)',
          action: 'buy',
          product_id: 'Numeric Product PID (e.g. 155, 65)',
          duration: 'Duration label (e.g. 1 Day, 7 Days, 30 Days)',
          quantity: 'Number of keys to generate (1 to 100)',
        },
        message:
          'Outbound Reseller API is active. Key generation requires a valid account api_key with sufficient wallet balance.',
      });
    }

    if (!apiKey) {
      return jsonResponse(
        {
          status: false,
          success: false,
          status_code: 401,
          error: 'Missing API key. Provide api_key in request body/query or X-Api-Key header.',
          message: 'Missing API key. Provide api_key in request body/query or X-Api-Key header.',
        },
        401
      );
    }

    // Authenticate user/reseller strictly by their account API key
    const headerUserId = (request.headers.get('x-user-id') || request.headers.get('X-User-Id') || '').trim();
    const headerEmail = (request.headers.get('x-user-email') || request.headers.get('X-User-Email') || '').trim().toLowerCase();

    let user = edgeDb.users.find(u => u.apiKey === apiKey);
    if (!user && headerUserId) {
      const candidate = edgeDb.users.find(u => u.id === headerUserId);
      if (candidate && (!candidate.apiKey || candidate.apiKey === apiKey)) {
        candidate.apiKey = apiKey;
        user = candidate;
      }
    }
    if (!user && headerEmail) {
      const candidate = edgeDb.users.find(u => u.email.toLowerCase() === headerEmail);
      if (candidate && (!candidate.apiKey || candidate.apiKey === apiKey)) {
        candidate.apiKey = apiKey;
        user = candidate;
      }
    }

    if (!user && apiKey) {
      try {
        const fsQueryUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/users?pageSize=100&key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
        const fsRes = await fetch(fsQueryUrl);
        if (fsRes.ok) {
          const fsData: any = await fsRes.json();
          const docs = fsData.documents || [];
          for (const d of docs) {
            const f = d.fields || {};
            const docApiKey = f.apiKey?.stringValue || '';
            if (docApiKey && docApiKey.trim() === apiKey.trim()) {
              const uId = f.id?.stringValue || d.name?.split('/').pop() || `USR-${Date.now()}`;
              const uBal = typeof f.balance?.doubleValue === 'number'
                ? f.balance.doubleValue
                : typeof f.balance?.integerValue === 'string'
                ? parseInt(f.balance.integerValue, 10)
                : Number(f.balance?.doubleValue || 0);
              const uRole = (f.role?.stringValue || 'USER') as any;
              const uName = f.username?.stringValue || f.displayName?.stringValue || 'user';
              const uEmail = f.email?.stringValue || '';
              const newUser: EdgeUser = {
                id: uId,
                username: uName,
                email: uEmail,
                role: uRole,
                balance: uBal,
                apiKey: docApiKey,
                referralCode: f.referralCode?.stringValue || `NX${uId.slice(0, 4)}`,
                twoFactorEnabled: Boolean(f.twoFactorEnabled?.booleanValue),
                isBanned: Boolean(f.isBanned?.booleanValue),
                createdAt: f.createdAt?.stringValue || new Date().toISOString(),
                updatedAt: f.updatedAt?.stringValue || new Date().toISOString(),
              };
              edgeDb.users.push(newUser);
              user = newUser;
              break;
            }
          }
        }
      } catch {}
    }

    if (!user) {
      return jsonResponse(
        {
          status: false,
          success: false,
          status_code: 401,
          error: 'Invalid API Key. Key does not match any active reseller or user account.',
          message: 'Invalid API Key. Key does not match any active reseller or user account.',
          code: 'INVALID_API_KEY',
        },
        401
      );
    }

    if (user.isBanned) {
      return jsonResponse(
        {
          status: false,
          success: false,
          status_code: 403,
          error: 'Account suspended. Outbound API key generation is disabled for this account.',
          message: 'Account suspended. Outbound API key generation is disabled for this account.',
          code: 'ACCOUNT_SUSPENDED',
        },
        403
      );
    }

    const quantity = Math.min(
      100,
      Math.max(1, parseInt(String(bodyData.quantity || url.searchParams.get('quantity') || '1'), 10) || 1)
    );

    const { product, variant } = findProductAndVariant(String(rawPid || '155'), String(rawDuration || '1 Day'));
    const isResellerOrAdmin = user.role === 'RESELLER' || user.role === 'ADMIN' || user.role === 'SUPER ADMIN';
    const unitPrice = Number(isResellerOrAdmin ? variant.resellerPrice : variant.price) || 80;
    const totalPrice = Number((unitPrice * quantity).toFixed(2));
    const currentBalance = Number(user.balance || 0);

    // STRICT WALLET BALANCE CHECK: Never generate a key via API if the user's wallet has insufficient balance!
    if (currentBalance <= 0 || currentBalance < totalPrice) {
      return jsonResponse(
        {
          status: false,
          success: false,
          status_code: 400,
          error: `Insufficient wallet balance in your API account (${user.username}). Current balance: ₹${currentBalance.toFixed(2)}, Required: ₹${totalPrice.toFixed(2)}. Key generation denied.`,
          message: `Insufficient wallet balance in your API account (${user.username}). Current balance: ₹${currentBalance.toFixed(2)}, Required: ₹${totalPrice.toFixed(2)}. Key generation denied.`,
          code: 'INSUFFICIENT_BALANCE',
          current_balance: currentBalance,
          required_amount: totalPrice,
        },
        400
      );
    }

    // Deduct funds from user's wallet
    user.balance = Number((currentBalance - totalPrice).toFixed(2));
    user.updatedAt = new Date().toISOString();

    // Sync user balance directly to Firestore document in real-time
    try {
      const fsUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/users/${encodeURIComponent(user.id)}?updateMask.fieldPaths=balance&key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
      fetch(fsUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fields: { balance: { doubleValue: Number(user.balance) } } })
      }).catch(() => {});
    } catch {}

    const batchOrderId = `API-ORD-${Date.now()}-${generateRandomHex(4).toUpperCase()}`;
    const tx: EdgeTransaction = {
      id: `TX-${Date.now()}-${generateRandomHex(4)}`,
      userId: user.id,
      type: 'DEBIT',
      amount: totalPrice,
      description: `[This Key Buyed by API] Outbound API Key Purchase: ${quantity}x ${product.name} (${variant.durationLabel})`,
      referenceId: batchOrderId,
      purchaseSource: 'API',
      purchaseSourceLabel: 'Buy from API',
      createdAt: new Date().toISOString(),
    };
    edgeDb.transactions.unshift(tx);

    const effectivePid = String(variant.externalPid || product.externalPid || rawPid || '155').trim();
    const effectiveDur = String(variant.externalDuration || variant.durationLabel || rawDuration || '1 Day').trim();
    const generatedKeyCodes: string[] = [];
    const deliveredKeyObjects: EdgeKey[] = [];

    for (let i = 0; i < quantity; i++) {
      const subOrderId = quantity > 1 ? `${batchOrderId}-${i + 1}` : batchOrderId;
      let keyCode = await fetchFromUpstreamResellerApi(effectivePid, effectiveDur, androidId, origin);

      if (!keyCode) {
        // Check unused local key in EDGE_DB
        const unusedKey = edgeDb.digitalKeys.find(
          k => k.variantId === variant.id && !k.isUsed && k.status === 'ACTIVE'
        );
        if (unusedKey) {
          unusedKey.isUsed = true;
          unusedKey.assignedUserId = user.id;
          unusedKey.assignedOrderId = subOrderId;
          unusedKey.assignedAt = new Date().toISOString();
          unusedKey.expiresAt = new Date(Date.now() + (variant.durationHours || 24) * 3600 * 1000).toISOString();
          unusedKey.purchaseSource = 'API';
          unusedKey.purchaseSourceLabel = 'Buy from API';
          keyCode = unusedKey.keyCode;
          deliveredKeyObjects.push(unusedKey);
        } else {
          const seg1 = generateRandomHex(4).toUpperCase();
          const seg2 = generateRandomHex(4).toUpperCase();
          const seg3 = generateRandomHex(4).toUpperCase();
          keyCode = `KALAM-${effectivePid}-${seg1}-${seg2}-${seg3}`;
          const newKeyObj: EdgeKey = {
            id: `KEY-API-${Date.now()}-${i}-${generateRandomHex(4)}`,
            productId: product.id,
            variantId: variant.id,
            keyCode,
            isUsed: true,
            assignedUserId: user.id,
            assignedOrderId: subOrderId,
            assignedAt: new Date().toISOString(),
            expiresAt: new Date(Date.now() + (variant.durationHours || 24) * 3600 * 1000).toISOString(),
            status: 'ACTIVE',
            purchaseSource: 'API',
            purchaseSourceLabel: 'Buy from API',
            createdAt: new Date().toISOString(),
          };
          edgeDb.digitalKeys.unshift(newKeyObj);
          deliveredKeyObjects.push(newKeyObj);
        }
      } else {
        const newKeyObj: EdgeKey = {
          id: `KEY-API-${Date.now()}-${i}-${generateRandomHex(4)}`,
          productId: product.id,
          variantId: variant.id,
          keyCode,
          isUsed: true,
          assignedUserId: user.id,
          assignedOrderId: subOrderId,
          assignedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + (variant.durationHours || 24) * 3600 * 1000).toISOString(),
          status: 'ACTIVE',
          purchaseSource: 'API',
          purchaseSourceLabel: 'Buy from API',
          createdAt: new Date().toISOString(),
        };
        edgeDb.digitalKeys.unshift(newKeyObj);
        deliveredKeyObjects.push(newKeyObj);
      }

      generatedKeyCodes.push(keyCode);

      const newOrder: EdgeOrder = {
        id: subOrderId,
        userId: user.id,
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        durationLabel: variant.durationLabel,
        pricePaid: unitPrice,
        deliveredKeyId: deliveredKeyObjects[i].id,
        deliveredKeyCode: keyCode,
        status: 'COMPLETED',
        purchaseSource: 'API',
        purchaseSourceLabel: 'Buy from API',
        createdAt: new Date().toISOString(),
      };
      edgeDb.orders.unshift(newOrder);

      // Sync digital key into Firestore
      try {
        const kObj = deliveredKeyObjects[i];
        const kUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/digitalKeys?documentId=${encodeURIComponent(kObj.id)}&key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
        fetch(kUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              id: { stringValue: kObj.id },
              productId: { stringValue: kObj.productId },
              variantId: { stringValue: kObj.variantId },
              keyCode: { stringValue: kObj.keyCode },
              isUsed: { booleanValue: Boolean(kObj.isUsed) },
              status: { stringValue: kObj.status },
              assignedUserId: { stringValue: user.id },
              assignedOrderId: { stringValue: subOrderId },
              assignedAt: { stringValue: kObj.assignedAt || new Date().toISOString() },
              expiresAt: { stringValue: kObj.expiresAt || '' },
              purchaseSource: { stringValue: 'API' },
              purchaseSourceLabel: { stringValue: 'Buy from API' },
              createdAt: { stringValue: kObj.createdAt || new Date().toISOString() },
            },
          }),
        }).catch(() => {});
      } catch {}
    }

    // Sync order into Firestore
    try {
      const ordUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/orders?documentId=${encodeURIComponent(batchOrderId)}&key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
      fetch(ordUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: { stringValue: batchOrderId },
            userId: { stringValue: user.id },
            productId: { stringValue: product.id },
            variantId: { stringValue: variant.id },
            productName: { stringValue: product.name },
            durationLabel: { stringValue: variant.durationLabel },
            pricePaid: { doubleValue: Number(totalPrice) },
            deliveredKeyId: { stringValue: deliveredKeyObjects[0]?.id || batchOrderId },
            deliveredKeyCode: { stringValue: generatedKeyCodes.join(', ') },
            status: { stringValue: 'COMPLETED' },
            purchaseSource: { stringValue: 'API' },
            purchaseSourceLabel: { stringValue: 'Buy from API' },
            createdAt: { stringValue: new Date().toISOString() },
          },
        }),
      }).catch(() => {});
    } catch {}

    // Sync transaction into Firestore
    try {
      const txUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/transactions?documentId=${encodeURIComponent(tx.id)}&key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
      fetch(txUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: { stringValue: tx.id },
            userId: { stringValue: user.id },
            type: { stringValue: tx.type },
            amount: { doubleValue: Number(tx.amount) },
            description: { stringValue: tx.description },
            referenceId: { stringValue: tx.referenceId || '' },
            purchaseSource: { stringValue: 'API' },
            purchaseSourceLabel: { stringValue: 'Buy from API' },
            createdAt: { stringValue: tx.createdAt },
          },
        }),
      }).catch(() => {});
    } catch {}

    return jsonResponse({
      status: true,
      success: true,
      status_code: 200,
      message: 'Keys generated successfully (This Key Buyed by API)',
      key: generatedKeyCodes[0],
      keys: generatedKeyCodes,
      keyCode: generatedKeyCodes[0],
      license: generatedKeyCodes[0],
      purchase_source: 'API',
      purchase_source_label: 'Buy from API',
      data: {
        key: generatedKeyCodes[0],
        keys: generatedKeyCodes,
        order_id: batchOrderId,
        product_id: effectivePid,
        product_name: product.name,
        duration: variant.durationLabel,
        quantity,
        unit_price: unitPrice,
        total_price: totalPrice,
        wallet_deducted: totalPrice,
        remaining_balance: user.balance,
        purchase_source: 'API',
        purchase_source_label: 'Buy from API',
      },
      order_id: batchOrderId,
      product_id: effectivePid,
      duration: variant.durationLabel,
      quantity,
      wallet_deducted: totalPrice,
      remaining_balance: user.balance,
      transaction_id: batchOrderId,
      endpoint_origin: origin,
    });
  }

  // 5. Website Order Creation (POST /api/orders -> "This Key Buyed by Web") & Get User Orders (GET /api/orders)
  if (path === '/api/orders') {
    const user = resolveUserFromRequest(request, bodyData);
    if (method === 'GET') {
      const userOrders = edgeDb.orders
        .filter(o => o.userId === user.id)
        .map(o => ({
          ...o,
          purchaseSource: o.purchaseSource || (o.id.startsWith('API-ORD-') ? 'API' : 'WEB'),
          purchaseSourceLabel:
            o.purchaseSourceLabel ||
            (o.purchaseSource === 'API' || o.id.startsWith('API-ORD-')
              ? 'Buy from API'
              : 'Buy from Website'),
        }));
      return jsonResponse({ orders: userOrders });
    }

    if (method === 'POST') {
      const { variantId, androidId, quantity } = bodyData;
      const qty = Math.max(1, Math.min(20, parseInt(String(quantity || '1'), 10) || 1));
      const { product, variant } = findProductAndVariant(String(variantId || '155'), '');
      const isReseller = user.role === 'RESELLER';
      const unitPrice = Number(isReseller ? variant.resellerPrice : variant.price) || 120;
      const totalPrice = Number((unitPrice * qty).toFixed(2));
      const currentBalance = Number(user.balance || 0);

      if (currentBalance < totalPrice) {
        return jsonResponse(
          {
            error: `Insufficient wallet balance. You have ₹${currentBalance.toFixed(2)}, but this requires ₹${totalPrice.toFixed(2)}. Please deposit funds.`,
            requiredAmount: totalPrice,
            currentBalance,
          },
          400
        );
      }

      user.balance = Number((currentBalance - totalPrice).toFixed(2));
      user.updatedAt = new Date().toISOString();

      const orderId = `ORD-${Date.now()}-${generateRandomHex(4).toUpperCase()}`;
      const tx: EdgeTransaction = {
        id: `TX-${Date.now()}-${generateRandomHex(4)}`,
        userId: user.id,
        type: 'DEBIT',
        amount: totalPrice,
        description: `[This Key Buyed by Web] Purchased ${qty > 1 ? `${qty}x ` : ''}${product.name} (${variant.durationLabel})`,
        referenceId: orderId,
        purchaseSource: 'WEB',
        purchaseSourceLabel: 'Buy from Website',
        createdAt: new Date().toISOString(),
      };
      edgeDb.transactions.unshift(tx);

      const effectivePid = String(variant.externalPid || product.externalPid || '155').trim();
      const effectiveDur = String(variant.externalDuration || variant.durationLabel || '1 Day').trim();
      const deliveredKeys: EdgeKey[] = [];

      for (let i = 0; i < qty; i++) {
        const subOrderId = qty > 1 ? `${orderId}-${i + 1}` : orderId;
        let keyCode = await fetchFromUpstreamResellerApi(
          effectivePid,
          effectiveDur,
          String(androidId || ''),
          origin
        );
        if (!keyCode) {
          const seg1 = generateRandomHex(4).toUpperCase();
          const seg2 = generateRandomHex(4).toUpperCase();
          const seg3 = generateRandomHex(4).toUpperCase();
          keyCode = `KALAM-${effectivePid}-${seg1}-${seg2}-${seg3}`;
        }

        const keyObj: EdgeKey = {
          id: `KEY-WEB-${Date.now()}-${i}-${generateRandomHex(4)}`,
          productId: product.id,
          variantId: variant.id,
          keyCode,
          isUsed: false,
          assignedUserId: user.id,
          assignedOrderId: subOrderId,
          assignedAt: new Date().toISOString(),
          expiresAt: new Date(Date.now() + (variant.durationHours || 24) * 3600 * 1000).toISOString(),
          status: 'ACTIVE',
          purchaseSource: 'WEB',
          purchaseSourceLabel: 'Buy from Website',
          createdAt: new Date().toISOString(),
        };
        edgeDb.digitalKeys.unshift(keyObj);
        deliveredKeys.push(keyObj);

        const ord: EdgeOrder = {
          id: subOrderId,
          userId: user.id,
          productId: product.id,
          variantId: variant.id,
          productName: product.name,
          durationLabel: variant.durationLabel,
          pricePaid: unitPrice,
          deliveredKeyId: keyObj.id,
          deliveredKeyCode: keyObj.keyCode,
          status: 'COMPLETED',
          purchaseSource: 'WEB',
          purchaseSourceLabel: 'Buy from Website',
          createdAt: new Date().toISOString(),
        };
        edgeDb.orders.unshift(ord);
      }

      const firstKey = deliveredKeys[0];
      return jsonResponse(
        {
          success: true,
          message: 'Purchase successful! This Key Buyed by Web.',
          order: edgeDb.orders[0],
          deliveredKey: {
            id: firstKey.id,
            keyCode: firstKey.keyCode,
            durationLabel: variant.durationLabel,
            expiresAt: firstKey.expiresAt,
            productName: product.name,
            purchaseSource: 'WEB',
            purchaseSourceLabel: 'Buy from Website',
          },
          key: {
            id: firstKey.id,
            keyCode: firstKey.keyCode,
            durationLabel: variant.durationLabel,
            expiresAt: firstKey.expiresAt,
            productName: product.name,
            purchaseSource: 'WEB',
            purchaseSourceLabel: 'Buy from Website',
          },
          newBalance: user.balance,
        },
        201
      );
    }
  }

  // 6. User Keys (GET /api/keys & PATCH /api/keys/:id/used)
  if (path === '/api/keys' && method === 'GET') {
    const user = resolveUserFromRequest(request, bodyData);
    const statusFilter = url.searchParams.get('status');
    const searchFilter = (url.searchParams.get('search') || '').toLowerCase().trim();

    let keys = edgeDb.digitalKeys
      .filter(k => k.assignedUserId === user.id)
      .map(k => {
        const prod = edgeDb.products.find(p => p.id === k.productId);
        const variant = prod?.variants?.find((v: any) => v.id === k.variantId);
        const isApi = k.purchaseSource === 'API' || String(k.assignedOrderId || '').startsWith('API-ORD-');
        return {
          id: k.id,
          keyCode: k.keyCode,
          status: k.status,
          assignedAt: k.assignedAt || k.createdAt,
          expiresAt: k.expiresAt,
          productName: prod?.name || 'Digital Product',
          gameName: prod?.game || 'Mobile Game',
          durationLabel: variant?.durationLabel || 'Standard Key',
          purchaseSource: isApi ? ('API' as const) : ('WEB' as const),
          purchaseSourceLabel: isApi ? 'Buy from API' : 'Buy from Website',
        };
      });

    if (statusFilter && statusFilter !== 'ALL') {
      keys = keys.filter(k => k.status === statusFilter.toUpperCase());
    }
    if (searchFilter) {
      keys = keys.filter(
        k =>
          k.keyCode.toLowerCase().includes(searchFilter) ||
          k.productName.toLowerCase().includes(searchFilter) ||
          k.purchaseSourceLabel.toLowerCase().includes(searchFilter)
      );
    }
    return jsonResponse({ keys });
  }

  if (path.startsWith('/api/keys/') && path.endsWith('/used') && method === 'PATCH') {
    const keyId = path.replace('/api/keys/', '').replace('/used', '');
    const key = edgeDb.digitalKeys.find(k => k.id === keyId);
    if (key) {
      key.status = 'USED';
      key.isUsed = true;
    }
    return jsonResponse({ message: 'Key marked as USED successfully.', key });
  }

  // 7. Wallet & Transactions (/api/wallet/summary, /api/transactions)
  if (path === '/api/wallet/summary' && method === 'GET') {
    const user = resolveUserFromRequest(request, bodyData);
    const txs = edgeDb.transactions.filter(t => t.userId === user.id);
    return jsonResponse({
      balance: user.balance,
      transactions: txs,
      deposits: [],
    });
  }

  if (path === '/api/transactions' && method === 'GET') {
    const user = resolveUserFromRequest(request, bodyData);
    const txs = edgeDb.transactions.filter(t => t.userId === user.id);
    return jsonResponse({ transactions: txs });
  }

  // 8. Admin Users & Balance Adjustments (/api/admin/users, /api/admin/users/:id/adjust-balance)
  if (path === '/api/admin/users' && method === 'GET') {
    const users = edgeDb.users.map(u => {
      const userOrders = edgeDb.orders.filter(o => o.userId === u.id);
      const userKeys = edgeDb.digitalKeys.filter(k => k.assignedUserId === u.id);
      return {
        ...u,
        totalOrdersCount: userOrders.length,
        totalSpent: userOrders.reduce((s, o) => s + (o.pricePaid || 0), 0),
        keysCount: userKeys.length,
      };
    });
    return jsonResponse({ users });
  }

  if (path.startsWith('/api/admin/users/') && (path.endsWith('/adjust-balance') || path.endsWith('/balance')) && method === 'POST') {
    const userId = path.split('/api/admin/users/')[1].replace('/adjust-balance', '').replace('/balance', '');
    let target = edgeDb.users.find(u => u.id === userId);
    if (!target) {
      target = resolveUserFromRequest(request, { userId });
    }
    const delta = Number(bodyData.amount) || 0;
    target.balance = Math.max(0, Number((target.balance + delta).toFixed(2)));
    target.updatedAt = new Date().toISOString();

    edgeDb.transactions.unshift({
      id: `TX-ADJ-${Date.now()}`,
      userId: target.id,
      type: delta >= 0 ? 'CREDIT' : 'DEBIT',
      amount: Math.abs(delta),
      description: bodyData.reason || 'Admin wallet balance adjustment',
      createdAt: new Date().toISOString(),
    });

    return jsonResponse({
      message: `Adjusted balance for ${target.username} by ₹${delta}. New balance: ₹${target.balance.toFixed(2)}`,
      newBalance: target.balance,
      user: target,
    });
  }

  if (path.startsWith('/api/admin/users/') && path.endsWith('/role') && (method === 'PATCH' || method === 'PUT')) {
    const userId = path.split('/api/admin/users/')[1].replace('/role', '');
    const target = edgeDb.users.find(u => u.id === userId);
    if (target && bodyData.role) {
      target.role = bodyData.role;
      target.updatedAt = new Date().toISOString();
    }
    return jsonResponse({ message: 'User role updated.', user: target });
  }

  // 9. Admin Orders & Keys (/api/admin/orders, /api/admin/keys, /api/admin/settings/reseller)
  if (path === '/api/admin/orders' && method === 'GET') {
    const orders = edgeDb.orders.map(o => {
      const u = edgeDb.users.find(usr => usr.id === o.userId);
      const isApi = o.purchaseSource === 'API' || String(o.id || '').startsWith('API-ORD-');
      return {
        ...o,
        username: u?.username || 'User',
        purchaseSource: isApi ? ('API' as const) : ('WEB' as const),
        purchaseSourceLabel: isApi ? 'Buy from API' : 'Buy from Website',
      };
    });
    return jsonResponse({ orders });
  }

  if (path === '/api/admin/keys' && method === 'GET') {
    const keys = edgeDb.digitalKeys.map(k => {
      const prod = edgeDb.products.find(p => p.id === k.productId);
      const variant = prod?.variants?.find((v: any) => v.id === k.variantId);
      const u = k.assignedUserId ? edgeDb.users.find(usr => usr.id === k.assignedUserId) : null;
      const isApi = k.purchaseSource === 'API' || String(k.assignedOrderId || '').startsWith('API-ORD-');
      return {
        ...k,
        productName: prod?.name || 'Gaming Panel',
        durationLabel: variant?.durationLabel || '1 Day',
        assignedUsername: u?.username,
        purchaseSource: isApi ? ('API' as const) : ('WEB' as const),
        purchaseSourceLabel: isApi ? 'Buy from API' : 'Buy from Website',
      };
    });
    return jsonResponse({ keys });
  }

  if (path.includes('/admin/settings/reseller') && !path.includes('/test') && !path.includes('/generate-test')) {
    if (method === 'GET') {
      return jsonResponse({ config: edgeDb.resellerConfig });
    } else {
      edgeDb.resellerConfig = { ...edgeDb.resellerConfig, ...bodyData };
      return jsonResponse({
        message: 'Reseller API settings saved and activated live.',
        config: edgeDb.resellerConfig,
      });
    }
  }

  // 10. Public Products Fallback
  if (path === '/api/products') {
    return jsonResponse({ products: edgeDb.products });
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
