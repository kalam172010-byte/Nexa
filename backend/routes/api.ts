import { Router } from 'express';
import fs from 'fs';
import path from 'path';
import { authenticate, requireRole, AuthenticatedRequest } from '../middleware/auth';
import { AuthController } from '../controllers/authController';
import { ProductController } from '../controllers/productController';
import { OrderController } from '../controllers/orderController';
import { KeyController } from '../controllers/keyController';
import { WalletController } from '../controllers/walletController';
import { TicketController } from '../controllers/ticketController';
import { ReferralController } from '../controllers/referralController';
import { AdminController } from '../controllers/adminController';
import { OutboundResellerController } from '../controllers/outboundResellerController';

const router = Router();

// --- Auth Routes ---
router.post('/auth/register', AuthController.register);
router.post('/auth/login', AuthController.login);
router.post('/auth/otp/send', AuthController.sendOtp);
router.post('/auth/otp/verify', AuthController.verifyOtp);
router.get('/auth/email-status', AuthController.getEmailStatus);
router.post('/auth/firebase-sync', AuthController.firebaseSync);
router.post('/auth/token-refresh', AuthController.refreshToken);
router.post('/auth/reset-password', AuthController.resetPassword);
router.post('/auth/forgot-password', AuthController.forgotPassword);
router.get('/auth/me', authenticate as any, AuthController.getCurrentUser as any);
router.post('/auth/change-password', authenticate as any, AuthController.changePassword as any);
router.post('/auth/toggle-2fa', authenticate as any, AuthController.toggleTwoFactor as any);

// --- Product Routes (Public / Authenticated) ---
router.get('/products', (req, res, next) => {
  // Optional auth to detect reseller pricing
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    (authenticate as any)(req, res, () => {
      ProductController.getProducts(req, res);
    });
  } else {
    ProductController.getProducts(req, res);
  }
});
router.get('/products/:id', ProductController.getProductById);

// --- Orders & Purchasing ---
router.post('/orders', authenticate as any, OrderController.createOrder as any);
router.get('/orders', authenticate as any, OrderController.getUserOrders as any);
router.get('/top-active-users', OrderController.getTopActiveUsers as any);

// --- User Digital Keys ---
router.get('/keys', authenticate as any, KeyController.getUserKeys as any);
router.patch('/keys/:id/used', authenticate as any, KeyController.markKeyUsed as any);
router.post('/keys/:id/send-receipt', authenticate as any, KeyController.sendKeyReceipt as any);

// --- Wallet & Deposits ---
router.get('/wallet/summary', authenticate as any, WalletController.getWalletSummary as any);
router.post('/deposits', authenticate as any, WalletController.createDeposit as any);
router.get('/deposits/:id/status', authenticate as any, WalletController.checkDepositStatus as any);
router.get('/deposits/:id/qr-image', WalletController.getDepositQrImage as any);
router.post('/deposits/:id/simulate-success', authenticate as any, WalletController.simulateDepositSuccess as any);
router.get('/transactions', authenticate as any, WalletController.getTransactions as any);

// --- Payment Webhook (FamGateway & External Providers) ---
router.post('/payments/webhook', WalletController.handleWebhook as any);
router.get('/payments/webhook', WalletController.handleWebhook as any);

// --- Reseller Account Upgrade ---
router.post('/wallet/upgrade-reseller', authenticate as any, AdminController.upgradeToReseller as any);

// --- Outbound Reseller API (External Websites Connecting to Us) ---
router.all('/v1/reseller/buy', OutboundResellerController.handleResellerBuy as any);
router.all('/reseller_v1.php', OutboundResellerController.handleResellerBuy as any);
router.all('/reseller/buy', OutboundResellerController.handleResellerBuy as any);
router.get('/reseller/api-credentials', authenticate as any, OutboundResellerController.getApiCredentials as any);
router.post('/reseller/api-credentials/regenerate', authenticate as any, OutboundResellerController.regenerateApiKey as any);

// --- Support Tickets ---
router.get('/tickets', authenticate as any, TicketController.getUserTickets as any);
router.post('/tickets', authenticate as any, TicketController.createTicket as any);
router.get('/tickets/:id', authenticate as any, TicketController.getTicketById as any);
router.post('/tickets/:id/reply', authenticate as any, TicketController.replyTicket as any);
router.patch('/tickets/:id/close', authenticate as any, TicketController.closeTicket as any);

// --- Referrals ---
router.get('/referrals', authenticate as any, ReferralController.getReferralInfo as any);

// --- Public Site Settings & Branding ---
router.get('/site-settings', AdminController.getSiteSettings as any);

// --- Admin Panel Routes (Protected by ADMIN / SUPER ADMIN) ---
const adminGuard = [authenticate as any, requireRole(['ADMIN', 'SUPER ADMIN']) as any];

router.get('/admin/stats', ...adminGuard, AdminController.getDashboardStats as any);
router.get('/admin/users', ...adminGuard, AdminController.getUsers as any);
router.patch('/admin/users/:id/role', ...adminGuard, AdminController.updateUserRole as any);
router.post('/admin/users/:id/adjust-balance', ...adminGuard, AdminController.adjustUserBalance as any);
router.patch('/admin/users/:id/ban', ...adminGuard, AdminController.toggleUserBan as any);
router.patch('/admin/users/:id/password', ...adminGuard, AdminController.resetUserPassword as any);
router.delete('/admin/users/:id', ...adminGuard, AdminController.deleteUser as any);
router.delete('/admin/top-active-users/:id', ...adminGuard, AdminController.removeTopActiveUser as any);
router.delete('/top-active-users/:id', ...adminGuard, AdminController.removeTopActiveUser as any);

// --- Admin Referral System Routes ---
router.get('/admin/referrals', ...adminGuard, ReferralController.getAdminReferrals as any);
router.patch('/admin/referrals/settings', ...adminGuard, ReferralController.updateReferralSettings as any);
router.post('/admin/referrals/assign', ...adminGuard, ReferralController.manualAssignReferral as any);
router.post('/admin/referrals/credit', ...adminGuard, ReferralController.creditReferralCommission as any);

router.post('/admin/products', ...adminGuard, AdminController.createProduct as any);
router.post('/admin/products/auto-assign-pids', ...adminGuard, AdminController.autoAssignPids as any);
router.patch('/admin/products/:id/pid', ...adminGuard, AdminController.updateProductPid as any);
router.patch('/admin/products/:id/maintenance', ...adminGuard, AdminController.toggleProductMaintenance as any);
router.patch('/admin/products/:id', ...adminGuard, AdminController.updateProduct as any);
router.delete('/admin/products/:id', ...adminGuard, AdminController.deleteProduct as any);

router.post('/admin/variants', ...adminGuard, AdminController.createVariant as any);
router.patch('/admin/variants/:id', ...adminGuard, AdminController.updateVariant as any);
router.delete('/admin/variants/:id', ...adminGuard, AdminController.deleteVariant as any);

router.get('/admin/keys', ...adminGuard, AdminController.getAllKeys as any);
router.post('/admin/keys/generate', ...adminGuard, AdminController.generateKeys as any);
router.post('/admin/keys/bulk-import', ...adminGuard, AdminController.bulkImportKeys as any);
router.delete('/admin/keys/:id', ...adminGuard, AdminController.deleteKey as any);

router.get('/admin/deposits', ...adminGuard, AdminController.getDeposits as any);
router.post('/admin/deposits/:id/approve', ...adminGuard, AdminController.approveDeposit as any);
router.get('/admin/orders', ...adminGuard, AdminController.getOrders as any);

router.get('/admin/settings/gateway', ...adminGuard, AdminController.getGatewaySettings as any);
router.patch('/admin/settings/gateway', ...adminGuard, AdminController.updateGatewaySettings as any);
router.post('/admin/settings/gateway/test', ...adminGuard, AdminController.testGatewayConnection as any);
router.post('/admin/settings/gateway/test-order', ...adminGuard, AdminController.testFamGatewayOrder as any);

router.get('/admin/settings/reseller', ...adminGuard, AdminController.getResellerSettings as any);
router.patch('/admin/settings/reseller', ...adminGuard, AdminController.updateResellerSettings as any);
router.post('/admin/settings/reseller/test', ...adminGuard, AdminController.testResellerConnection as any);
router.post('/admin/settings/reseller/generate-test', ...adminGuard, AdminController.testBuyKeyGeneration as any);

// --- Admin Site Branding & Customization Settings ---
router.get('/admin/settings/site', ...adminGuard, AdminController.getSiteSettings as any);
router.patch('/admin/settings/site', ...adminGuard, AdminController.updateSiteSettings as any);

// --- Admin Email & IMAP/SMTP Setup Settings ---
router.get('/admin/settings/email', ...adminGuard, AdminController.getEmailSettings as any);
router.patch('/admin/settings/email', ...adminGuard, AdminController.updateEmailSettings as any);
router.post('/admin/settings/email/test', ...adminGuard, AdminController.testEmailConnection as any);
router.get('/admin/settings/email/imap-24-7-status', ...adminGuard, AdminController.getImap24x7Status as any);
router.post('/admin/settings/email/imap-trigger-scan', ...adminGuard, AdminController.triggerImapScan as any);
router.post('/admin/settings/email/imap-toggle-24-7', ...adminGuard, AdminController.toggle24x7Imap as any);
router.post('/admin/settings/email/imap-simulate-deposit', ...adminGuard, AdminController.simulateUpiDeposit as any);

router.get('/admin/logs', ...adminGuard, AdminController.getActivityLogs as any);

// --- Direct PDF Documentation Download Route ---
router.get('/download-pdf', (req, res) => {
  const pdfPath = path.resolve(process.cwd(), 'public/Kalam_FF_Panel_Documentation.pdf');
  if (fs.existsSync(pdfPath)) {
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename="Kalam_FF_Panel_Documentation.pdf"');
    res.sendFile(pdfPath);
  } else {
    res.status(404).json({ error: 'Documentation PDF not found' });
  }
});

export default router;
