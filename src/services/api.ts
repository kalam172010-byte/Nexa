const DEV_SERVER_URL = 'https://ais-dev-ffr2koj4ukcsljuhbacguf-777758772084.asia-east1.run.app';

export function getEffectiveApiUrl(): string {
  if (typeof window === 'undefined') return '/api';

  // 1. Check custom override from localStorage (configurable by admin in settings)
  const localStoredUrl = localStorage.getItem('nexa_api_base_url');
  if (localStoredUrl && localStoredUrl.trim()) {
    const trimmed = localStoredUrl.trim();
    return trimmed.endsWith('/') ? trimmed.slice(0, -1) : trimmed;
  }

  // 2. Check Vite env var
  const customApiUrl = import.meta.env.VITE_API_BASE_URL;
  if (customApiUrl) return customApiUrl.endsWith('/') ? customApiUrl.slice(0, -1) : customApiUrl;

  // 3. If hosted on Cloudflare Workers / Pages or external static hosting
  const hostname = window.location.hostname;
  if (
    hostname.endsWith('.workers.dev') ||
    hostname.endsWith('.pages.dev') ||
    hostname.endsWith('.cloudflare.com')
  ) {
    return `${DEV_SERVER_URL}/api`;
  }

  // 4. Default to current host relative /api for full-stack Node.js deployment
  return '/api';
}

export function setCustomApiUrl(url: string | null): void {
  if (typeof window === 'undefined') return;
  if (url && url.trim()) {
    localStorage.setItem('nexa_api_base_url', url.trim());
  } else {
    localStorage.removeItem('nexa_api_base_url');
  }
}

function getBaseUrl(): string {
  return getEffectiveApiUrl();
}

export class ApiError extends Error {
  public status: number;
  public data: any;

  constructor(message: string, status: number, data?: any) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = localStorage.getItem('nexa_auth_token');
  const headers = new Headers(options.headers || {});

  if (!headers.has('Content-Type') && !(options.body instanceof FormData)) {
    headers.set('Content-Type', 'application/json');
  }

  if (token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${token}`);
  }

  const baseUrl = getBaseUrl();
  let response: Response;
  try {
    response = await fetch(`${baseUrl}${endpoint}`, {
      ...options,
      headers,
    });
  } catch (err: any) {
    throw new ApiError(
      err?.message || 'Unable to connect to Kalam FF Panel API. Please check your network connection.',
      0,
      { isStaticFallback: true }
    );
  }

  const contentType = response.headers.get('content-type');
  const isJson = contentType && contentType.includes('application/json');
  const data = isJson ? await response.json() : await response.text();

  // If static asset host returned HTML (index.html SPA fallback) for an API endpoint
  if (typeof data === 'string' && (data.trim().startsWith('<!DOCTYPE') || data.trim().startsWith('<html'))) {
    throw new ApiError('Backend API endpoint not found on static host.', 404, { isStaticFallback: true });
  }

  if (!response.ok) {
    const errorMsg = data?.error || data?.message || 'A network error occurred. Please try again.';
    throw new ApiError(errorMsg, response.status, data);
  }

  return data as T;
}

export const api = {
  // Auth
  register: (body: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  sendOtp: (email: string) => request<any>('/auth/otp/send', { method: 'POST', body: JSON.stringify({ email }) }),
  verifyOtp: (email: string, code: string) => request<any>('/auth/otp/verify', { method: 'POST', body: JSON.stringify({ email, code }) }),
  getEmailStatus: () => request<any>('/auth/email-status'),
  firebaseSync: (body: { uid: string; email: string; displayName?: string }) =>
    request<any>('/auth/firebase-sync', { method: 'POST', body: JSON.stringify(body) }),
  resetPassword: (body: { usernameOrEmail: string; newPassword: string }) =>
    request<any>('/auth/reset-password', { method: 'POST', body: JSON.stringify(body) }),
  forgotPassword: (body: { usernameOrEmail: string }) =>
    request<any>('/auth/forgot-password', { method: 'POST', body: JSON.stringify(body) }),
  getMe: () => request<{ user: any }>('/auth/me'),
  changePassword: (body: any) => request<any>('/auth/change-password', { method: 'POST', body: JSON.stringify(body) }),
  toggleTwoFactor: () => request<any>('/auth/toggle-2fa', { method: 'POST' }),

  // Products
  getProducts: () => request<{ products: any[] }>('/products'),
  getProduct: (id: string) => request<{ product: any }>(`/products/${id}`),

  // Orders & Purchasing
  createOrder: (variantId: string, androidId?: string, quantity?: number) =>
    request<any>('/orders', { method: 'POST', body: JSON.stringify({ variantId, androidId, quantity }) }),
  getOrders: () => request<{ orders: any[] }>('/orders'),

  // User Keys
  getKeys: (status?: string, search?: string) => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    if (search) params.append('search', search);
    return request<{ keys: any[] }>(`/keys?${params.toString()}`);
  },
  markKeyUsed: (id: string) => request<any>(`/keys/${id}/used`, { method: 'PATCH' }),

  // Wallet & Deposits
  getWalletSummary: () => request<any>('/wallet/summary'),
  createDeposit: (amount: number, method: string = 'UPI_QR') =>
    request<any>('/deposits', { method: 'POST', body: JSON.stringify({ amount, method }) }),
  checkDepositStatus: (id: string) => request<any>(`/deposits/${id}/status`),
  simulateDepositSuccess: (id: string, utr?: string) =>
    request<any>(`/deposits/${id}/simulate-success`, {
      method: 'POST',
      body: JSON.stringify({ utr }),
    }),
  getTransactions: (type?: string, search?: string, status?: string) => {
    const params = new URLSearchParams();
    if (type) params.append('type', type);
    if (search) params.append('search', search);
    if (status) params.append('status', status);
    return request<{ transactions: any[] }>(`/transactions?${params.toString()}`);
  },
  upgradeToReseller: () => request<any>('/wallet/upgrade-reseller', { method: 'POST' }),

  // Support Tickets
  getTickets: () => request<{ tickets: any[] }>('/tickets'),
  getTicket: (id: string) => request<{ ticket: any }>(`/tickets/${id}`),
  createTicket: (body: any) => request<any>('/tickets', { method: 'POST', body: JSON.stringify(body) }),
  replyTicket: (id: string, message: string) =>
    request<any>(`/tickets/${id}/reply`, { method: 'POST', body: JSON.stringify({ message }) }),
  closeTicket: (id: string) => request<any>(`/tickets/${id}/close`, { method: 'PATCH' }),

  // Referrals
  getReferrals: () => request<any>('/referrals'),
  getResellerApiCredentials: () => request<any>('/reseller/api-credentials'),
  regenerateResellerApiKey: () => request<any>('/reseller/api-credentials/regenerate', { method: 'POST' }),

  // Admin Panel APIs
  getAdminStats: () => request<any>('/admin/stats'),
  getAdminUsers: (search?: string) => {
    const params = new URLSearchParams();
    if (search) params.append('search', search);
    return request<{ users: any[] }>(`/admin/users?${params.toString()}`);
  },
  updateUserRole: (id: string, role: string) =>
    request<any>(`/admin/users/${id}/role`, { method: 'PATCH', body: JSON.stringify({ role }) }),
  adjustUserBalance: (id: string, amount: number, reason: string) =>
    request<any>(`/admin/users/${id}/adjust-balance`, { method: 'POST', body: JSON.stringify({ amount, reason }) }),
  toggleUserBan: (id: string) => request<any>(`/admin/users/${id}/ban`, { method: 'PATCH' }),
  adminResetPassword: (id: string, newPassword: string) =>
    request<any>(`/admin/users/${id}/password`, { method: 'PATCH', body: JSON.stringify({ newPassword }) }),

  createProduct: (body: any) => request<any>('/admin/products', { method: 'POST', body: JSON.stringify(body) }),
  updateProduct: (id: string, body: any) => request<any>(`/admin/products/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  updateProductPid: (id: string, externalPid: string) => request<any>(`/admin/products/${id}/pid`, { method: 'PATCH', body: JSON.stringify({ externalPid }) }),
  autoAssignPids: () => request<any>('/admin/products/auto-assign-pids', { method: 'POST' }),
  toggleProductMaintenance: (id: string, isUnderMaintenance?: boolean, maintenanceNotice?: string) =>
    request<any>(`/admin/products/${id}/maintenance`, {
      method: 'PATCH',
      body: JSON.stringify({ isUnderMaintenance, maintenanceNotice }),
    }),
  deleteProduct: (id: string) => request<any>(`/admin/products/${id}`, { method: 'DELETE' }),

  createVariant: (body: any) => request<any>('/admin/variants', { method: 'POST', body: JSON.stringify(body) }),
  updateVariant: (id: string, body: any) => request<any>(`/admin/variants/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),
  deleteVariant: (id: string) => request<any>(`/admin/variants/${id}`, { method: 'DELETE' }),

  getAdminKeys: (variantId?: string, productId?: string, status?: string) => {
    const params = new URLSearchParams();
    if (variantId) params.append('variantId', variantId);
    if (productId) params.append('productId', productId);
    if (status) params.append('status', status);
    return request<{ keys: any[] }>(`/admin/keys?${params.toString()}`);
  },
  generateAdminKeys: (body: any) => request<any>('/admin/keys/generate', { method: 'POST', body: JSON.stringify(body) }),
  bulkImportAdminKeys: (body: any) => request<any>('/admin/keys/bulk-import', { method: 'POST', body: JSON.stringify(body) }),
  deleteAdminKey: (id: string) => request<any>(`/admin/keys/${id}`, { method: 'DELETE' }),

  getAdminDeposits: () => request<{ deposits: any[] }>('/admin/deposits'),
  approveDeposit: (id: string, utr?: string) => request<any>(`/admin/deposits/${id}/approve`, { method: 'POST', body: JSON.stringify({ utr }) }),
  getAdminOrders: () => request<{ orders: any[] }>('/admin/orders'),

  getGatewaySettings: () => request<{ config: any }>('/admin/settings/gateway'),
  updateGatewaySettings: (body: any) => request<any>('/admin/settings/gateway', { method: 'PATCH', body: JSON.stringify(body) }),
  testGatewayConnection: (body?: { configOverride?: any }) =>
    request<any>('/admin/settings/gateway/test', { method: 'POST', body: JSON.stringify(body || {}) }),
  testFamGatewayOrder: (body: any) => request<any>('/admin/settings/gateway/test-order', { method: 'POST', body: JSON.stringify(body) }),

  getResellerSettings: () => request<{ config: any }>('/admin/settings/reseller'),
  updateResellerSettings: (body: any) => request<any>('/admin/settings/reseller', { method: 'PATCH', body: JSON.stringify(body) }),
  testResellerConnection: () => request<any>('/admin/settings/reseller/test', { method: 'POST' }),
  testBuyKeyGeneration: (body: any) => request<any>('/admin/settings/reseller/generate-test', { method: 'POST', body: JSON.stringify(body) }),

  getTopActiveUsers: () => request<{ success: boolean; leaderboard: Array<{ rank: number; userId: string; username: string; role: string; keysCount: number; totalSpent: number }> }>('/top-active-users'),

  // Site Branding & Customization Settings
  getPublicSiteSettings: () => request<{ config: any }>('/site-settings'),
  getSiteSettings: () => request<{ config: any }>('/admin/settings/site'),
  updateSiteSettings: (body: any) => request<any>('/admin/settings/site', { method: 'PATCH', body: JSON.stringify(body) }),

  // Email & IMAP/SMTP Setup Settings
  getEmailSettings: () => request<{ config: any }>('/admin/settings/email'),
  updateEmailSettings: (body: any) => request<any>('/admin/settings/email', { method: 'PATCH', body: JSON.stringify(body) }),
  testEmailConnection: (body?: { testEmail?: string; configOverride?: any; testType?: 'smtp' | 'imap' | 'both' }) =>
    request<any>('/admin/settings/email/test', { method: 'POST', body: JSON.stringify(body || {}) }),

  getAdminLogs: () => request<{ logs: any[] }>('/admin/logs'),

  // Database Backup & Migration
  exportDatabase: () => request<any>('/admin/database/export'),
  importDatabase: (backupData: any) =>
    request<{ message: string; stats: any }>('/admin/database/import', {
      method: 'POST',
      body: JSON.stringify(backupData),
    }),
};
