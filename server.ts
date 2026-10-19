import express from 'express';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import apiRouter from './backend/routes/api';
import { seedDatabaseIfEmpty } from './backend/db/seed';
import { FirestoreSyncService } from './backend/services/firestoreSync';
import { emailService } from './backend/services/emailService';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  // Enable trust proxy so Express correctly detects https, x-forwarded-host, and custom domains behind reverse proxies
  app.set('trust proxy', true);
  const PORT = 3000;
  const isProduction = process.env.NODE_ENV === 'production';

  // Seed demo data on launch and start real-time Firestore + Edge two-way sync
  seedDatabaseIfEmpty();
  FirestoreSyncService.startAutoSync();

  // Start 24/7 continuous IMAP auto-deposit listener
  try {
    emailService.start24x7ImapWatcher();
    console.log('⚡ 24/7 Background IMAP Auto-Deposit Watcher launched successfully');
  } catch (err: any) {
    console.warn('Notice: IMAP 24/7 background listener deferred:', err.message);
  }

  // Basic CORS headers
  app.use((req, res, next) => {
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization, X-User-Email, X-User-Id, X-Api-Key, X-Master-Key, x-api-key, x-master-key');
    res.header('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
    if (req.method === 'OPTIONS') {
      res.sendStatus(200);
      return;
    }
    next();
  });

  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ limit: '50mb', extended: true }));

  // Mount backend REST APIs
  app.use('/api', apiRouter);

  // Support external reseller panel calls directly on root /reseller_v1.php or /api/reseller/buy
  app.all('/reseller_v1.php', (req, res, next) => {
    req.url = '/reseller_v1.php';
    apiRouter(req, res, next);
  });
  app.all('/api/reseller_v1.php', (req, res, next) => {
    req.url = '/reseller_v1.php';
    apiRouter(req, res, next);
  });
  app.all('/api/reseller/buy', (req, res, next) => {
    req.url = '/v1/reseller/buy';
    apiRouter(req, res, next);
  });
  app.all('/v1/reseller/buy', (req, res, next) => {
    req.url = '/v1/reseller/buy';
    apiRouter(req, res, next);
  });
  app.all('/api/v1/reseller/buy', (req, res, next) => {
    req.url = '/v1/reseller/buy';
    apiRouter(req, res, next);
  });

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', service: 'KALAM FF PANEL API', timestamp: new Date().toISOString() });
  });

  if (!isProduction) {
    // Development mode: dynamically mount Vite middleware
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        hmr: process.env.DISABLE_HMR !== 'true',
        allowedHosts: true,
      },
      appType: 'spa',
    });

    app.use(vite.middlewares);
  } else {
    // Production mode: serve static files from dist
    const distPath = path.resolve(__dirname, 'dist');
    if (fs.existsSync(distPath)) {
      app.use(express.static(distPath));
      app.get('*', (req, res) => {
        res.sendFile(path.resolve(distPath, 'index.html'));
      });
    }
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Nexa Panel Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
