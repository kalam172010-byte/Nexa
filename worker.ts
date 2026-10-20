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

const DEFAULT_EDGE_PRODUCTS: any[] = [];

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
  if (path === '/api/auth/firebase-sync' || path === '/api/auth/token-refresh' || path === '/api/auth/me') {
    const user = resolveUserFromRequest(request, bodyData);
    try {
      const linkedIds =
        user.email.toLowerCase() === 'kalam172010@gmail.com'
          ? ['USR-KALAM-172010', 'tnqy7LYfgwgzYpoQGqljC4H6bKc2']
          : [user.id];
      const bals: number[] = [];
      for (const lid of linkedIds) {
        const uDocUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/users/${encodeURIComponent(lid)}?key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
        const uRes = await fetch(uDocUrl);
        if (uRes.ok) {
          const uData: any = await uRes.json();
          if (uData?.fields?.balance) {
            const fsBal =
              typeof uData.fields.balance.doubleValue === 'number'
                ? uData.fields.balance.doubleValue
                : typeof uData.fields.balance.integerValue === 'string'
                ? parseInt(uData.fields.balance.integerValue, 10)
                : Number(uData.fields.balance.doubleValue || 0);
            if (!Number.isNaN(fsBal)) bals.push(fsBal);
          }
          if (uData?.fields?.role?.stringValue) {
            const fsRole = uData.fields.role.stringValue;
            const roleRank: Record<string, number> = { 'SUPER ADMIN': 4, ADMIN: 3, RESELLER: 2, USER: 1 };
            if ((roleRank[fsRole] || 1) > (roleRank[user.role] || 1)) {
              user.role = fsRole as any;
            }
          }
        }
      }
      if (bals.length > 0) {
        user.balance = Math.min(...bals);
      }
    } catch {}
    if (path === '/api/auth/me') {
      return jsonResponse({ user });
    }
    return jsonResponse({
      success: true,
      token: `edge_jwt_${user.id}_${Date.now()}`,
      user,
    });
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

    const action = String(
      bodyData.action || url.searchParams.get('action') || 'buy'
    ).toLowerCase().trim();

    if (action === 'get_balance' || action === 'balance' || action === 'check_balance' || action === 'status') {
      return jsonResponse({
        status: true,
        success: true,
        status_code: 200,
        balance: user.balance,
        wallet_balance: user.balance,
        user: user.username,
        role: user.role,
        currency: 'INR',
        message: 'Account verified successfully.',
      });
    }

    if (action === 'get_products' || action === 'products' || action === 'services') {
      const isResellerOrAdmin = user.role === 'RESELLER' || user.role === 'ADMIN' || user.role === 'SUPER ADMIN';
      return jsonResponse({
        status: true,
        success: true,
        status_code: 200,
        products: edgeDb.products.map(p => ({
          id: p.id,
          name: p.name,
          game: p.game,
          externalPid: p.externalPid,
          variants: p.variants.map(v => ({
            variantId: v.id,
            durationLabel: v.durationLabel,
            externalPid: v.externalPid,
            price: isResellerOrAdmin ? v.resellerPrice : v.price,
          })),
        })),
        currency: 'INR',
      });
    }

    const quantity = Math.min(
      100,
      Math.max(1, parseInt(String(bodyData.quantity || url.searchParams.get('quantity') || '1'), 10) || 1)
    );

    const { product, variant } = findProductAndVariant(String(rawPid || '155'), String(rawDuration || '1 Day'));
    const unitPrice = Math.max(1, Number(variant.price || variant.resellerPrice || 50));
    const totalPrice = Number((unitPrice * quantity).toFixed(2));
    // Fetch latest balance from Firestore across all linked user IDs for 100% up-to-date real-time accuracy
    const linkedUserIds =
      user.email.toLowerCase() === 'kalam172010@gmail.com'
        ? Array.from(new Set([user.id, 'USR-KALAM-172010', 'tnqy7LYfgwgzYpoQGqljC4H6bKc2']))
        : [user.id];

    try {
      const fsBalances: number[] = [];
      for (const lid of linkedUserIds) {
        const uDocUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/users/${encodeURIComponent(lid)}?key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
        const uRes = await fetch(uDocUrl);
        if (uRes.ok) {
          const uData: any = await uRes.json();
          if (uData && uData.fields && uData.fields.balance) {
            const fsBal = typeof uData.fields.balance.doubleValue === 'number'
              ? uData.fields.balance.doubleValue
              : typeof uData.fields.balance.integerValue === 'string'
              ? parseInt(uData.fields.balance.integerValue, 10)
              : Number(uData.fields.balance.doubleValue || 0);
            if (typeof fsBal === 'number' && !Number.isNaN(fsBal)) {
              fsBalances.push(fsBal);
            }
          }
        }
      }
      if (fsBalances.length > 0) {
        user.balance = Math.min(...fsBalances);
      }
    } catch {}

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

    // Sync user balance directly to all linked Firestore user documents in real-time
    try {
      await Promise.all(
        linkedUserIds.map(lid => {
          const fsUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/users/${encodeURIComponent(lid)}?updateMask.fieldPaths=balance&updateMask.fieldPaths=updatedAt&key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
          return fetch(fsUrl, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              fields: {
                balance: { doubleValue: Number(user.balance) },
                updatedAt: { stringValue: user.updatedAt },
              },
            }),
          }).catch(() => {});
        })
      );
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
          k => k.variantId === variant.id && !k.isUsed && k.status === 'ACTIVE' && !k.assignedUserId
        );
        if (unusedKey) {
          unusedKey.isUsed = false;
          unusedKey.status = 'ACTIVE';
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
            isUsed: false,
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
          isUsed: false,
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
        const kUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/digitalKeys/${encodeURIComponent(kObj.id)}?key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
        await fetch(kUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              id: { stringValue: kObj.id },
              productId: { stringValue: kObj.productId },
              variantId: { stringValue: kObj.variantId },
              productName: { stringValue: product.name },
              gameName: { stringValue: product.game || 'Free Fire' },
              durationLabel: { stringValue: variant.durationLabel },
              keyCode: { stringValue: kObj.keyCode },
              isUsed: { booleanValue: false },
              status: { stringValue: 'ACTIVE' },
              assignedUserId: { stringValue: user.id },
              assignedUserEmail: { stringValue: (user.email || '').toLowerCase() },
              assignedApiKey: { stringValue: apiKey.trim() },
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
      const ordUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/orders/${encodeURIComponent(batchOrderId)}?key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
      await fetch(ordUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: { stringValue: batchOrderId },
            userId: { stringValue: user.id },
            userEmail: { stringValue: (user.email || '').toLowerCase() },
            apiKey: { stringValue: apiKey.trim() },
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
      const txUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/transactions/${encodeURIComponent(tx.id)}?key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
      await fetch(txUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: { stringValue: tx.id },
            userId: { stringValue: user.id },
            userEmail: { stringValue: (user.email || '').toLowerCase() },
            apiKey: { stringValue: apiKey.trim() },
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
      const allKeyCodes = deliveredKeys.map(k => k.keyCode).join('\n');
      const formattedDeliveredKeys = deliveredKeys.map(k => ({
        id: k.id,
        keyCode: k.keyCode,
        productId: product.id,
        variantId: variant.id,
        productName: product.name,
        gameName: product.game || 'FREEFIRE',
        durationLabel: variant.durationLabel,
        assignedUserId: user.id,
        assignedUserEmail: user.email?.toLowerCase(),
        assignedOrderId: k.assignedOrderId,
        assignedAt: k.assignedAt,
        expiresAt: k.expiresAt,
        status: 'ACTIVE',
        isUsed: false,
        purchaseSource: 'WEB',
        purchaseSourceLabel: 'Buy from Website',
        createdAt: k.createdAt,
      }));
      return jsonResponse(
        {
          success: true,
          message: 'Purchase successful! This Key Buyed by Web.',
          order: edgeDb.orders[0],
          deliveredKeys: formattedDeliveredKeys,
          deliveredKey: {
            ...formattedDeliveredKeys[0],
            keyCode: allKeyCodes,
          },
          key: {
            ...formattedDeliveredKeys[0],
            keyCode: allKeyCodes,
            keys: deliveredKeys.map(k => k.keyCode),
            quantity: qty,
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

    try {
      const fsKeysUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents:runQuery?key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
      const fsRes = await fetch(fsKeysUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          structuredQuery: {
            from: [{ collectionId: 'digitalKeys' }],
            limit: 200,
          },
        }),
      });
      if (fsRes.ok) {
        const fsData: any = await fsRes.json();
        const docs = Array.isArray(fsData) ? fsData.map((item: any) => item?.document).filter(Boolean) : [];
        for (const d of docs) {
          const f = d.fields || {};
          const kid = f.id?.stringValue || (d.name || '').split('/').pop() || '';
          const kCode = f.keyCode?.stringValue || '';
          if (kid && kCode && !edgeDb.digitalKeys.some(ek => ek.id === kid || ek.keyCode === kCode)) {
            edgeDb.digitalKeys.unshift({
              id: kid,
              productId: f.productId?.stringValue || 'PROD-499177',
              variantId: f.variantId?.stringValue || 'VAR-499189',
              keyCode: kCode,
              isUsed: Boolean(f.isUsed?.booleanValue),
              assignedUserId: f.assignedUserId?.stringValue || user.id,
              assignedOrderId: f.assignedOrderId?.stringValue || '',
              assignedAt: f.assignedAt?.stringValue || f.createdAt?.stringValue || new Date().toISOString(),
              expiresAt: f.expiresAt?.stringValue || '',
              status: (f.status?.stringValue as any) || 'ACTIVE',
              purchaseSource: f.purchaseSource?.stringValue === 'API' ? 'API' : 'WEB',
              purchaseSourceLabel: f.purchaseSource?.stringValue === 'API' ? 'Buy from API' : 'Buy from Website',
              createdAt: f.createdAt?.stringValue || new Date().toISOString(),
            });
          }
        }
      }
    } catch {}

    const linkedIds = new Set<string>([user.id]);
    if (user.email.toLowerCase() === 'kalam172010@gmail.com') {
      linkedIds.add('USR-KALAM-172010');
      linkedIds.add('tnqy7LYfgwgzYpoQGqljC4H6bKc2');
    }

    let keys = edgeDb.digitalKeys
      .filter(k => linkedIds.has(k.assignedUserId || ''))
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

  // 7B. Top Active Users Leaderboard (/api/top-active-users)
  if ((path === '/api/top-active-users' || path === '/top-active-users') && method === 'GET') {
    const userStatsMap: Record<string, { rank: number; userId: string; username: string; role: string; keysCount: number; totalSpent: number }> = {};
    for (const u of edgeDb.users) {
      userStatsMap[u.id] = {
        rank: 0,
        userId: u.id,
        username: u.username || 'user',
        role: u.role || 'USER',
        keysCount: 0,
        totalSpent: 0,
      };
    }
    for (const k of edgeDb.digitalKeys) {
      if (k.assignedUserId && userStatsMap[k.assignedUserId]) {
        userStatsMap[k.assignedUserId].keysCount += 1;
      }
    }
    for (const o of edgeDb.orders) {
      if (o.userId && userStatsMap[o.userId]) {
        userStatsMap[o.userId].totalSpent += Number(o.pricePaid || 0);
        if (!userStatsMap[o.userId].keysCount) {
          userStatsMap[o.userId].keysCount += 1;
        }
      }
    }
    const sorted = Object.values(userStatsMap)
      .sort((a, b) => b.keysCount - a.keysCount || b.totalSpent - a.totalSpent)
      .slice(0, 5)
      .map((u, i) => ({ ...u, rank: i + 1 }));

    return jsonResponse({
      success: true,
      leaderboard: sorted,
    });
  }

  // 8. Admin Users & Balance Adjustments (/api/admin/users, /api/admin/users/:id/adjust-balance)
  if (path === '/api/admin/users' && method === 'GET') {
    // Sync any newly discovered users from Firestore in deploy/edge
    try {
      const fsQueryUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/users?pageSize=100&key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
      const fsRes = await fetch(fsQueryUrl);
      if (fsRes.ok) {
        const fsData: any = await fsRes.json();
        const docs = fsData.documents || [];
        for (const d of docs) {
          const f = d.fields || {};
          const uId = f.id?.stringValue || d.name?.split('/').pop() || '';
          const uEmail = (f.email?.stringValue || '').toLowerCase().trim();
          if (!uId && !uEmail) continue;
          const existing = edgeDb.users.find(u => u.id === uId || (uEmail && u.email.toLowerCase() === uEmail));
          const uBal = typeof f.balance?.doubleValue === 'number'
            ? f.balance.doubleValue
            : typeof f.balance?.integerValue === 'string'
            ? parseInt(f.balance.integerValue, 10)
            : Number(f.balance?.doubleValue || 0);
          if (!existing) {
            edgeDb.users.push({
              id: uId,
              username: f.username?.stringValue || f.displayName?.stringValue || (uEmail ? uEmail.split('@')[0] : 'user'),
              email: uEmail || `${uId}@user.local`,
              role: (f.role?.stringValue as any) || 'USER',
              balance: uBal,
              apiKey: f.apiKey?.stringValue || '',
              referralCode: f.referralCode?.stringValue || `NX${uId.slice(0, 4).toUpperCase()}`,
              twoFactorEnabled: Boolean(f.twoFactorEnabled?.booleanValue),
              isBanned: Boolean(f.isBanned?.booleanValue),
              createdAt: f.createdAt?.stringValue || new Date().toISOString(),
              updatedAt: f.updatedAt?.stringValue || new Date().toISOString(),
            });
          } else {
            existing.balance = uBal;
            if (f.role?.stringValue) existing.role = f.role.stringValue as any;
          }
        }
      }
    } catch {}

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
    let target = edgeDb.users.find(u => u.id === userId || (u.email && bodyData.email && u.email.toLowerCase() === String(bodyData.email).toLowerCase()));
    if (!target && bodyData.role) {
      const newUser: EdgeUser = {
        id: userId,
        username: bodyData.username || (bodyData.email ? String(bodyData.email).split('@')[0] : 'user'),
        email: bodyData.email || `${userId}@user.local`,
        role: bodyData.role as any,
        balance: 0,
        apiKey: `nexa_live_${generateRandomHex(24)}`,
        referralCode: `NX${userId.slice(0, 4).toUpperCase()}`,
        twoFactorEnabled: false,
        isBanned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      edgeDb.users.push(newUser);
      target = newUser;
    } else if (target && bodyData.role) {
      target.role = bodyData.role as any;
      target.updatedAt = new Date().toISOString();
    }

    try {
      const email = (target?.email || bodyData.email || '').toLowerCase();
      const linkedIds =
        email === 'kalam172010@gmail.com'
          ? Array.from(new Set([userId, target?.id || userId, 'USR-KALAM-172010', 'tnqy7LYfgwgzYpoQGqljC4H6bKc2']))
          : Array.from(new Set([userId, target?.id || userId]));

      for (const lid of linkedIds) {
        const uDocUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/users/${encodeURIComponent(lid)}?updateMask.fieldPaths=role&updateMask.fieldPaths=updatedAt&key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
        fetch(uDocUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              role: { stringValue: bodyData.role },
              updatedAt: { stringValue: new Date().toISOString() },
            },
          }),
        }).catch(() => {});
      }
    } catch {}

    return jsonResponse({ message: 'User role updated.', user: target || { id: userId, role: bodyData.role } });
  }

  // 8B. Reseller Tier Upgrade (/api/wallet/upgrade-reseller)
  if (path === '/api/wallet/upgrade-reseller' && method === 'POST') {
    const user = resolveUserFromRequest(request, bodyData);
    const upgradePrice = 299;
    if (user.role === 'RESELLER' || user.role === 'ADMIN' || user.role === 'SUPER ADMIN') {
      return jsonResponse({ message: 'User is already a privileged account.', user, newBalance: user.balance });
    }
    if ((user.balance || 0) < upgradePrice) {
      return jsonResponse(
        { error: `Insufficient balance. Required: ₹${upgradePrice}, Available: ₹${user.balance}. Please add funds.` },
        400
      );
    }
    user.balance = Number(((user.balance || 0) - upgradePrice).toFixed(2));
    user.role = 'RESELLER';
    user.updatedAt = new Date().toISOString();

    try {
      const uDocUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/users/${encodeURIComponent(user.id)}?updateMask.fieldPaths=role&updateMask.fieldPaths=balance&updateMask.fieldPaths=updatedAt&key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
      fetch(uDocUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            role: { stringValue: 'RESELLER' },
            balance: { doubleValue: user.balance },
            updatedAt: { stringValue: new Date().toISOString() },
          },
        }),
      }).catch(() => {});
    } catch {}

    return jsonResponse({
      success: true,
      message: 'Successfully upgraded to Wholesale Reseller tier!',
      newBalance: user.balance,
      user,
    });
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

  // 10. Public Products & Admin Product Management
  if (path === '/api/admin/products' && method === 'POST') {
    const newProdId = bodyData.id || `PROD-${Date.now().toString().slice(-6)}-${Math.floor(10 + Math.random() * 89)}`;
    const cleanPid = bodyData.externalPid?.trim() || undefined;
    const defaultDurations = Array.isArray(bodyData.initialDurations)
      ? bodyData.initialDurations
      : [
          { label: '1 Day', hours: 24, price: 50, resellerPrice: 38, extDur: '1 DAYS' },
          { label: '3 Days', hours: 72, price: 120, resellerPrice: 90, extDur: '3 DAYS' },
          { label: '7 Days', hours: 168, price: 250, resellerPrice: 190, extDur: '7 DAYS' },
          { label: '30 Days', hours: 720, price: 600, resellerPrice: 450, extDur: '30 DAYS' },
        ];

    const initialVariants = defaultDurations.map((d: any, idx: number) => ({
      id: `VAR-${Date.now().toString().slice(-5)}-${idx}-${Math.floor(10 + Math.random() * 89)}`,
      productId: newProdId,
      durationLabel: String(d.label || d.durationLabel || '1 Day').trim(),
      durationHours: Number(d.hours || d.durationHours) || 24,
      price: Number(d.price) || 50,
      resellerPrice: Number(d.resellerPrice) || Math.round((Number(d.price) || 50) * 0.75),
      stockCount: cleanPid ? 999 : 15,
      externalPid: d.externalPid?.trim() || cleanPid,
      externalDuration: String(d.extDur || d.externalDuration || d.label || '1 DAYS').trim(),
      isActive: true,
      isAvailable: true,
    }));

    const newProduct = {
      id: newProdId,
      name: String(bodyData.name || 'New Gaming Panel').trim(),
      game: String(bodyData.game || bodyData.category || 'FREEFIRE').trim(),
      category: String(bodyData.category || 'FREEFIRE').trim(),
      deviceType: String(bodyData.deviceType || 'NONROOT').trim(),
      description: String(bodyData.description || '').trim(),
      badge: bodyData.badge?.trim() || 'STAR',
      imageUrl: bodyData.imageUrl || 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80',
      features: Array.isArray(bodyData.features) ? bodyData.features : ['Auto Headshot', 'Location Pinpoint', 'Anti-Ban'],
      updateFileUrl: bodyData.updateFileUrl?.trim() || undefined,
      videoUrl: bodyData.videoUrl?.trim() || undefined,
      externalPid: cleanPid,
      isActive: true,
      isUnderMaintenance: Boolean(bodyData.isUnderMaintenance),
      maintenanceNotice: bodyData.maintenanceNotice?.trim() || undefined,
      createdAt: new Date().toISOString(),
      variants: initialVariants,
    };

    edgeDb.products = [newProduct, ...edgeDb.products.filter((p: any) => p.id !== newProdId)];

    try {
      const safeImageUrl =
        newProduct.imageUrl && newProduct.imageUrl.length > 750000
          ? 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=800&q=80'
          : (newProduct.imageUrl || '');
      const fsUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/products/${encodeURIComponent(newProdId)}?key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
      await fetch(fsUrl, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fields: {
            id: { stringValue: newProduct.id },
            name: { stringValue: newProduct.name },
            game: { stringValue: newProduct.game },
            description: { stringValue: newProduct.description },
            category: { stringValue: newProduct.category },
            badge: { stringValue: newProduct.badge || '' },
            imageUrl: { stringValue: safeImageUrl },
            deviceType: { stringValue: newProduct.deviceType || 'NONROOT' },
            externalPid: { stringValue: newProduct.externalPid || '' },
            isActive: { booleanValue: true },
            isUnderMaintenance: { booleanValue: newProduct.isUnderMaintenance },
            createdAt: { stringValue: newProduct.createdAt },
          },
        }),
      }).catch(() => {});

      for (const v of initialVariants) {
        const vUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/productVariants/${encodeURIComponent(v.id)}?key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
        await fetch(vUrl, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            fields: {
              id: { stringValue: v.id },
              productId: { stringValue: v.productId },
              durationLabel: { stringValue: v.durationLabel },
              durationHours: { doubleValue: v.durationHours },
              price: { doubleValue: v.price },
              resellerPrice: { doubleValue: v.resellerPrice },
              stockCount: { integerValue: String(v.stockCount) },
              externalPid: { stringValue: v.externalPid || '' },
              externalDuration: { stringValue: v.externalDuration || '' },
              isActive: { booleanValue: true },
            },
          }),
        }).catch(() => {});
      }
    } catch {}

    return jsonResponse(
      {
        message: 'Product created successfully with standard durations.',
        product: newProduct,
      },
      201
    );
  }

  if (path.startsWith('/api/admin/products/') && method === 'DELETE') {
    const delId = path.replace('/api/admin/products/', '').split('/')[0];
    edgeDb.products = edgeDb.products.filter((p: any) => p.id !== delId);
    try {
      const fsUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents/products/${encodeURIComponent(delId)}?key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
      await fetch(fsUrl, { method: 'DELETE' }).catch(() => {});
    } catch {}
    return jsonResponse({ message: 'Product deleted permanently.' });
  }

  // 10B. Public Products Endpoint with Firestore Integration
  if (path === '/api/products') {
    try {
      const fsProdsUrl = `https://firestore.googleapis.com/v1/projects/kalam-panel/databases/ai-studio-nexagamingpanel-02432dbb-5483-456e-9269-5d439824a6d9/documents:runQuery?key=AIzaSyCr1MPZ1LARgyKRTQKIQ0cKH6Z3R6U0-As`;
      const [pRes, vRes] = await Promise.all([
        fetch(fsProdsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'products' }], limit: 100 } }),
        }),
        fetch(fsProdsUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ structuredQuery: { from: [{ collectionId: 'productVariants' }], limit: 200 } }),
        }),
      ]);

      if (pRes.ok) {
        const pArr: any = await pRes.json();
        const pDocs = Array.isArray(pArr) ? pArr.map((item: any) => item?.document).filter(Boolean) : [];
        const vDocsRaw: any = vRes.ok ? await vRes.json() : [];
        const vDocs = Array.isArray(vDocsRaw) ? vDocsRaw.map((item: any) => item?.document).filter(Boolean) : [];

        const parsedVarsMap = new Map<string, any[]>();
        for (const vd of vDocs) {
          const vf = vd.fields || {};
          const vid = vf.id?.stringValue || (vd.name || '').split('/').pop() || '';
          const pid = vf.productId?.stringValue || '';
          if (vid && pid) {
            const vObj = {
              id: vid,
              productId: pid,
              durationLabel: vf.durationLabel?.stringValue || '1 Day',
              durationHours: typeof vf.durationHours?.doubleValue === 'number' ? vf.durationHours.doubleValue : parseInt(vf.durationHours?.integerValue || '24', 10),
              price: typeof vf.price?.doubleValue === 'number' ? vf.price.doubleValue : parseInt(vf.price?.integerValue || '50', 10),
              resellerPrice: typeof vf.resellerPrice?.doubleValue === 'number' ? vf.resellerPrice.doubleValue : parseInt(vf.resellerPrice?.integerValue || '38', 10),
              stockCount: typeof vf.stockCount?.integerValue === 'string' ? parseInt(vf.stockCount.integerValue, 10) : Number(vf.stockCount?.doubleValue || 15),
              externalPid: vf.externalPid?.stringValue,
              externalDuration: vf.externalDuration?.stringValue,
              isActive: vf.isActive?.booleanValue !== false,
            };
            if (!parsedVarsMap.has(pid)) parsedVarsMap.set(pid, []);
            parsedVarsMap.get(pid)!.push(vObj);
          }
        }

        for (const pd of pDocs) {
          const pf = pd.fields || {};
          const pid = pf.id?.stringValue || (pd.name || '').split('/').pop() || '';
          if (!pid) continue;
          const pObj = {
            id: pid,
            name: pf.name?.stringValue || 'Gaming Panel',
            game: pf.game?.stringValue || pf.category?.stringValue || 'FREEFIRE',
            description: pf.description?.stringValue || '',
            category: pf.category?.stringValue || 'FREEFIRE',
            badge: pf.badge?.stringValue,
            imageUrl: pf.imageUrl?.stringValue,
            deviceType: pf.deviceType?.stringValue,
            updateFileUrl: pf.updateFileUrl?.stringValue,
            videoUrl: pf.videoUrl?.stringValue,
            externalPid: pf.externalPid?.stringValue,
            isActive: pf.isActive?.booleanValue !== false,
            isUnderMaintenance: Boolean(pf.isUnderMaintenance?.booleanValue),
            maintenanceNotice: pf.maintenanceNotice?.stringValue,
            createdAt: pf.createdAt?.stringValue || new Date().toISOString(),
            variants: parsedVarsMap.get(pid) || [],
          };
          const existingIdx = edgeDb.products.findIndex((p: any) => p.id === pid);
          if (existingIdx === -1) {
            edgeDb.products.unshift(pObj);
          } else {
            edgeDb.products[existingIdx] = {
              ...edgeDb.products[existingIdx],
              ...pObj,
              variants: (pObj.variants && pObj.variants.length > 0) ? pObj.variants : edgeDb.products[existingIdx].variants,
            };
          }
        }
      }
    } catch {}

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
