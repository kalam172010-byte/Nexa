export interface Env {
  ASSETS: { fetch: (req: Request) => Promise<Response> };
  BACKEND_API_URL?: string;
}

const DEFAULT_BACKEND_ORIGIN = 'https://ais-dev-ehx6fkepg2ntmhvxj3joml-128464619421.asia-east1.run.app';

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight for all endpoints
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, POST, PUT, PATCH, DELETE, OPTIONS',
          'Access-Control-Allow-Headers': 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-master-key, x-api-key',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    // Proxy all /api/* requests directly to live backend server
    if (url.pathname.startsWith('/api/') || url.pathname === '/reseller_v1.php') {
      const backendOrigin = (env.BACKEND_API_URL || DEFAULT_BACKEND_ORIGIN).replace(/\/$/, '');
      const targetUrl = new URL(url.pathname + url.search, backendOrigin);

      const requestHeaders = new Headers(request.headers);
      requestHeaders.set('host', targetUrl.host);
      requestHeaders.set('x-forwarded-host', url.host);
      requestHeaders.set('x-forwarded-proto', url.protocol.replace(':', ''));

      try {
        const hasBody = request.method !== 'GET' && request.method !== 'HEAD';
        const response = await fetch(targetUrl.toString(), {
          method: request.method,
          headers: requestHeaders,
          body: hasBody ? request.body : undefined,
          redirect: 'follow',
        });

        const responseHeaders = new Headers(response.headers);
        responseHeaders.set('Access-Control-Allow-Origin', '*');
        responseHeaders.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
        responseHeaders.set('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, x-master-key, x-api-key');

        return new Response(response.body, {
          status: response.status,
          statusText: response.statusText,
          headers: responseHeaders,
        });
      } catch (err: any) {
        return new Response(
          JSON.stringify({
            error: `Live backend proxy unavailable: ${err?.message || 'Connection error'}`,
            endpoint: url.pathname,
            targetHost: targetUrl.host,
          }),
          {
            status: 502,
            headers: {
              'Content-Type': 'application/json',
              'Access-Control-Allow-Origin': '*',
            },
          }
        );
      }
    }

    // Route static SPA files
    if (env.ASSETS && typeof env.ASSETS.fetch === 'function') {
      return env.ASSETS.fetch(request);
    }

    return new Response('Asset service unavailable', { status: 503 });
  },
};
