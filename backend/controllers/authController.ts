import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database';
import { User } from '../models/types';
import { hashPassword } from '../db/seed';
import { generateToken, verifyToken, AuthenticatedRequest } from '../middleware/auth';
import { emailService } from '../services/emailService';
import { FirestoreSyncService } from '../services/firestoreSync';

export class AuthController {
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const { username, email, password, referralCode } = req.body;

      if (!username || !email || !password) {
        res.status(400).json({ error: 'Username, email, and password are required.' });
        return;
      }

      if (username.length < 3 || username.length > 25) {
        res.status(400).json({ error: 'Username must be between 3 and 25 characters.' });
        return;
      }

      if (password.length < 6) {
        res.status(400).json({ error: 'Password must be at least 6 characters long.' });
        return;
      }

      const existingUser = db.users.find(
        u => u.username.toLowerCase() === username.toLowerCase() || u.email.toLowerCase() === email.toLowerCase()
      );
      if (existingUser) {
        res.status(400).json({ error: 'Username or email already in use.' });
        return;
      }

      // Check referral code
      let referredBy: string | undefined;
      if (referralCode) {
        const referrer = db.users.find(u => u.referralCode.toLowerCase() === referralCode.trim().toLowerCase());
        if (referrer) {
          referredBy = referrer.id;
        }
      }

      const ADMIN_EMAILS = [
        'kk7953926@gmail.com',
        'kalamkalam1234kd@gmail.com',
        'kalam172010@gmail.com',
        'admin@example.com',
      ];
      const normalizedEmail = email.trim().toLowerCase();
      const isAdminEmail = ADMIN_EMAILS.includes(normalizedEmail);

      const newReferralCode = `NX${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const newUser: User = {
        id: `USR-${Date.now()}`,
        username: username.trim(),
        email: normalizedEmail,
        passwordHash: hashPassword(password),
        role: isAdminEmail ? 'ADMIN' : 'USER',
        balance: 0.0,
        apiKey: `nexa_live_${crypto.randomBytes(16).toString('hex')}`,
        referralCode: newReferralCode,
        referredBy,
        twoFactorEnabled: false,
        isBanned: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };

      db.users.push(newUser);
      db.logActivity(newUser.id, newUser.username, 'USER_REGISTER', `New user registered via referral: ${referralCode || 'None'}`);
      db.save();
      FirestoreSyncService.syncUserApiKey(newUser.id, newUser.apiKey!).catch(() => {});

      const token = generateToken(newUser);
      const { passwordHash, ...safeUser } = newUser;

      res.status(201).json({
        message: 'Account created successfully.',
        token,
        user: {
          ...safeUser,
          hasPassword: Boolean(passwordHash),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Registration failed.' });
    }
  }

  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const { usernameOrEmail, password } = req.body;

      if (!usernameOrEmail || !password) {
        res.status(400).json({ error: 'Please provide both username/email and password.' });
        return;
      }

      const input = usernameOrEmail.trim().toLowerCase();
      const user = db.users.find(
        u => u.username.toLowerCase() === input || u.email.toLowerCase() === input
      );

      if (!user) {
        res.status(401).json({ error: 'Invalid username/email or password.' });
        return;
      }

      const hashedInput = hashPassword(password);
      if (user.passwordHash !== hashedInput) {
        if (!user.passwordHash && password.length >= 6) {
          // Initialize password for accounts created via social or sync
          user.passwordHash = hashedInput;
          user.updatedAt = new Date().toISOString();
          db.saveSync();
        } else {
          res.status(401).json({ error: 'Invalid username/email or password.' });
          return;
        }
      }

      if (user.isBanned) {
        res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
        return;
      }

      if (!user.apiKey || db.users.some(u => u.id !== user.id && u.apiKey === user.apiKey)) {
        user.apiKey = `nexa_live_${crypto.randomBytes(16).toString('hex')}`;
        db.saveSync();
      }
      FirestoreSyncService.syncUserApiKey(user.id, user.apiKey).catch(() => {});

      db.logActivity(user.id, user.username, 'USER_LOGIN', 'User logged in successfully');
      const token = generateToken(user);
      const { passwordHash: _, ...safeUser } = user;

      res.json({
        message: 'Login successful.',
        token,
        user: safeUser,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Login failed.' });
    }
  }

  public static async forgotPassword(req: Request, res: Response): Promise<void> {
    try {
      const { usernameOrEmail } = req.body;
      if (!usernameOrEmail) {
        res.status(400).json({ error: 'Please enter your registered username or email address.' });
        return;
      }

      const input = usernameOrEmail.trim().toLowerCase();
      const user = db.users.find(
        u => u.username.toLowerCase() === input || u.email.toLowerCase() === input
      );

      if (!user) {
        res.json({
          success: true,
          message: 'If an account exists with this email or username, a password reset link has been dispatched to the inbox.',
          email: input.includes('@') ? input : undefined,
        });
        return;
      }

      const resetToken = crypto.randomBytes(20).toString('hex');
      const result = await emailService.sendPasswordResetEmail(user.email, user.username, resetToken);

      db.logActivity(
        user.id,
        user.username,
        'PASSWORD_RESET_DISPATCHED',
        `Password reset email dispatched to ${user.email}`
      );

      res.json({
        success: true,
        message: result.message || `Password reset link dispatched to ${user.email}.`,
        email: user.email,
        simulated: result.simulated,
        resetToken: result.resetToken,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to dispatch password reset email.' });
    }
  }

  public static async resetPassword(req: Request, res: Response): Promise<void> {
    try {
      const { usernameOrEmail, newPassword } = req.body;
      if (!usernameOrEmail || !newPassword) {
        res.status(400).json({ error: 'Username or email and new password are required.' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters long.' });
        return;
      }

      const input = usernameOrEmail.trim().toLowerCase();
      const user = db.users.find(
        u => u.username.toLowerCase() === input || u.email.toLowerCase() === input
      );

      if (!user) {
        res.status(404).json({ error: 'No account found with this username or email.' });
        return;
      }

      const ADMIN_EMAILS = [
        'kalamkalam1234kd@gmail.com',
        'kalam172010@gmail.com',
        'admin@example.com',
      ];
      if (ADMIN_EMAILS.includes(user.email.toLowerCase()) && user.role !== 'ADMIN') {
        user.role = 'ADMIN';
      }

      const newHash = hashPassword(newPassword);
      user.passwordHash = newHash;
      user.updatedAt = new Date().toISOString();

      if (ADMIN_EMAILS.includes(user.email.toLowerCase()) || user.role === 'ADMIN' || user.role === 'SUPER ADMIN') {
        for (const adm of db.users) {
          if (
            ADMIN_EMAILS.includes(adm.email.toLowerCase()) ||
            adm.username.toLowerCase() === 'kalam' ||
            adm.username.toLowerCase() === 'kalam_kalam' ||
            adm.username.toLowerCase() === 'nexa_admin'
          ) {
            adm.passwordHash = newHash;
            adm.updatedAt = user.updatedAt;
          }
        }
      }

      db.saveSync();

      db.logActivity(user.id, user.username, 'PASSWORD_RESET', 'User reset password successfully');
      const token = generateToken(user);
      const { passwordHash, ...safeUser } = user;

      res.json({
        message: 'Password has been reset successfully. You are now logged in.',
        token,
        user: {
          ...safeUser,
          hasPassword: Boolean(passwordHash),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Password reset failed.' });
    }
  }

  public static async firebaseSync(req: Request, res: Response): Promise<void> {
    try {
      const { uid, email, displayName } = req.body;
      if (!uid || !email) {
        res.status(400).json({ error: 'UID and email are required.' });
        return;
      }

      const normalizedEmail = email.trim().toLowerCase();
      let user = db.users.find(
        u => u.id === uid || u.firebaseUid === uid || u.email.toLowerCase() === normalizedEmail
      );

      const ADMIN_EMAILS = [
        'kk7953926@gmail.com',
        'kalamkalam1234kd@gmail.com',
        'kalam172010@gmail.com',
        'admin@example.com',
      ];
      const isAdminEmail = ADMIN_EMAILS.includes(normalizedEmail);

      if (!user) {
        const username = displayName
          ? displayName.replace(/[^a-zA-Z0-9_]/g, '_').toLowerCase().slice(0, 20)
          : normalizedEmail.split('@')[0];
        const newReferralCode = `NX${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
        user = {
          id: uid,
          firebaseUid: uid,
          username: username || `user_${Date.now().toString().slice(-4)}`,
          email: normalizedEmail,
          passwordHash: '',
          role: isAdminEmail ? 'ADMIN' : 'USER',
          balance: 0.0,
          apiKey: `nexa_live_${crypto.randomBytes(16).toString('hex')}`,
          referralCode: newReferralCode,
          twoFactorEnabled: false,
          isBanned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.users.push(user);
        db.logActivity(user.id, user.username, 'FIREBASE_AUTH_SIGNUP', `Registered via Firebase: ${normalizedEmail}`);
        db.saveSync();
        FirestoreSyncService.syncUserApiKey(user.id, user.apiKey!).catch(() => {});
      } else {
        if (isAdminEmail && user.role !== 'ADMIN' && user.role !== 'SUPER ADMIN') {
          user.role = 'ADMIN';
        }
        if (!user.apiKey || db.users.some(u => u.id !== user!.id && u.apiKey === user!.apiKey)) {
          user.apiKey = `nexa_live_${crypto.randomBytes(16).toString('hex')}`;
        }
        user.firebaseUid = uid;
        user.updatedAt = new Date().toISOString();

        // Sync balance from Firestore if Firestore has a record for this user
        try {
          const liveBal = await FirestoreSyncService.getAuthoritativeBalance(user);
          if (typeof liveBal === 'number' && !Number.isNaN(liveBal)) {
            user.balance = liveBal;
          }
        } catch {}

        db.logActivity(user.id, user.username, 'FIREBASE_AUTH_LOGIN', `Logged in via Firebase: ${normalizedEmail}`);
        db.saveSync();
        FirestoreSyncService.syncUserApiKey(user.id, user.apiKey).catch(() => {});
      }

      const token = generateToken(user);
      const { passwordHash, ...safeUser } = user;
      res.json({
        message: 'Firebase sync successful.',
        token,
        user: {
          ...safeUser,
          hasPassword: Boolean(passwordHash),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Firebase sync failed.' });
    }
  }

  public static async refreshToken(req: Request, res: Response): Promise<void> {
    try {
      const authHeader = req.headers.authorization;
      const body = req.body || {};
      const token = body.token || (authHeader?.startsWith('Bearer ') ? authHeader.substring(7).trim() : null);
      const email = body.email ? String(body.email).trim().toLowerCase() : null;
      const userId = body.userId || body.id;

      let user: User | undefined = undefined;

      if (token) {
        const decoded = verifyToken(token);
        if (decoded) {
          user = db.users.find(u =>
            u.id === decoded.userId ||
            (decoded.username && u.username.toLowerCase() === decoded.username.toLowerCase()) ||
            (decoded.email && u.email.toLowerCase() === decoded.email.toLowerCase())
          );
        }
      }

      if (!user && email) {
        user = db.users.find(u => u.email.toLowerCase() === email);
      }

      if (!user && userId) {
        user = db.users.find(u => u.id === userId);
      }

      // Default fallback for admin recovery
      const ADMIN_EMAILS = [
        'kk7953926@gmail.com',
        'kalamkalam1234kd@gmail.com',
        'kalam172010@gmail.com',
        'admin@example.com',
      ];
      if (!user && email && ADMIN_EMAILS.includes(email)) {
        user = db.users.find(u => ADMIN_EMAILS.includes(u.email.toLowerCase()));
      }

      if (!user) {
        res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
        return;
      }

      if (user.email && ADMIN_EMAILS.includes(user.email.toLowerCase()) && user.role !== 'ADMIN') {
        user.role = 'ADMIN';
      }
      if (!user.apiKey) {
        user.apiKey = `nexa_live_${crypto.randomBytes(16).toString('hex')}`;
        db.saveSync();
      }

      const freshToken = generateToken(user);
      const { passwordHash, ...safeUser } = user;

      res.json({
        success: true,
        message: 'Session refreshed successfully.',
        token: freshToken,
        user: {
          ...safeUser,
          hasPassword: Boolean(passwordHash),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Token refresh failed.' });
    }
  }

  public static async getCurrentUser(req: AuthenticatedRequest, res: Response): Promise<void> {
    if (!req.user) {
      res.status(401).json({ error: 'Not authenticated.' });
      return;
    }
    // Return latest user object from db
    const freshUser = db.users.find(u => u.id === req.user!.id);
    if (!freshUser) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }
    if (!freshUser.apiKey) {
      freshUser.apiKey = `nexa_live_${crypto.randomBytes(16).toString('hex')}`;
      db.saveSync();
    }
    const { passwordHash, ...safeUser } = freshUser;
    res.json({
      user: {
        ...safeUser,
        hasPassword: Boolean(passwordHash),
      },
    });
  }

  public static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;
      if (!newPassword || !confirmPassword) {
        res.status(400).json({ error: 'New password and confirmation are required.' });
        return;
      }

      if (newPassword !== confirmPassword) {
        res.status(400).json({ error: 'New password and confirmation do not match.' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters long.' });
        return;
      }

      const user = db.users.find(u => u.id === req.user!.id);
      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      // Check current password only if user already has one configured
      if (user.passwordHash) {
        if (!currentPassword) {
          res.status(400).json({ error: 'Current password is required.' });
          return;
        }
        if (user.passwordHash !== hashPassword(currentPassword)) {
          res.status(400).json({
            error: 'Current password is incorrect. Please check your password or use Forgot Password on the login page.',
          });
          return;
        }
      }

      const newHash = hashPassword(newPassword);
      user.passwordHash = newHash;
      user.updatedAt = new Date().toISOString();

      // If user is an admin account, synchronize all admin aliases so login never fails under any username/email
      const ADMIN_EMAILS = [
        'kalamkalam1234kd@gmail.com',
        'kalam172010@gmail.com',
        'admin@example.com',
      ];
      if (ADMIN_EMAILS.includes(user.email.toLowerCase()) || user.role === 'ADMIN' || user.role === 'SUPER ADMIN') {
        for (const adm of db.users) {
          if (
            ADMIN_EMAILS.includes(adm.email.toLowerCase()) ||
            adm.username.toLowerCase() === 'kalam' ||
            adm.username.toLowerCase() === 'kalam_kalam' ||
            adm.username.toLowerCase() === 'nexa_admin'
          ) {
            adm.passwordHash = newHash;
            adm.updatedAt = user.updatedAt;
          }
        }
      }

      // CRITICAL: Synchronously write to database/nexa_panel.json immediately to prevent any revert
      db.saveSync();

      db.logActivity(user.id, user.username, 'PASSWORD_CHANGE', 'Password updated successfully');
      res.json({
        message: 'Password changed successfully.',
        hasPassword: true,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to change password.' });
    }
  }

  public static async toggleTwoFactor(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const user = db.users.find(u => u.id === req.user!.id);
      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      user.twoFactorEnabled = !user.twoFactorEnabled;
      user.updatedAt = new Date().toISOString();
      db.save();

      res.json({
        message: `Two-factor authentication ${user.twoFactorEnabled ? 'enabled' : 'disabled'}.`,
        twoFactorEnabled: user.twoFactorEnabled,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to update 2FA status.' });
    }
  }

  // --- Email OTP Authentication ---
  public static async sendOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email } = req.body;
      if (!email || typeof email !== 'string' || !email.includes('@')) {
        res.status(400).json({ error: 'Please enter a valid email address.' });
        return;
      }

      const result = await emailService.sendLoginOtp(email);
      res.json({
        success: true,
        message: result.message,
        simulated: result.simulated,
        code: result.code, // Returned for dev/preview convenience when SMTP is unconfigured or in test environment
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Failed to send OTP.' });
    }
  }

  public static async verifyOtp(req: Request, res: Response): Promise<void> {
    try {
      const { email, code } = req.body;
      if (!email || !code) {
        res.status(400).json({ error: 'Email and 6-digit verification code are required.' });
        return;
      }

      const verification = emailService.verifyOtp(email, code);
      if (!verification.valid) {
        res.status(400).json({ error: verification.error || 'Invalid verification code.' });
        return;
      }

      const ADMIN_EMAILS = [
        'kalamkalam1234kd@gmail.com',
        'kalam172010@gmail.com',
        'admin@example.com',
      ];

      const normalizedEmail = email.trim().toLowerCase();
      let user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

      const isAdminEmail = ADMIN_EMAILS.includes(normalizedEmail);

      if (!user) {
        // Auto-create user if allowOtpSignup is true
        if (db.emailConfig.allowOtpSignup !== false) {
          const baseName = normalizedEmail.split('@')[0].replace(/[^a-zA-Z0-9_]/g, '_').slice(0, 15);
          let uniqueUsername = baseName;
          let counter = 1;
          while (db.users.some(u => u.username.toLowerCase() === uniqueUsername.toLowerCase())) {
            uniqueUsername = `${baseName}_${counter++}`;
          }

          const newReferralCode = `NX${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
          user = {
            id: `USR-${Date.now()}`,
            username: uniqueUsername,
            email: normalizedEmail,
            passwordHash: '',
            role: isAdminEmail ? 'ADMIN' : 'USER',
            balance: 0.0,
            apiKey: `nexa_live_${crypto.randomBytes(16).toString('hex')}`,
            referralCode: newReferralCode,
            twoFactorEnabled: false,
            isBanned: false,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          };

          db.users.push(user);
          db.logActivity(user.id, user.username, 'OTP_SIGNUP', `Registered via Email OTP: ${normalizedEmail}`);
          db.save();
          FirestoreSyncService.syncUserApiKey(user.id, user.apiKey!).catch(() => {});
        } else {
          res.status(404).json({ error: 'No account registered with this email. Please sign up first.' });
          return;
        }
      } else {
        if (user.isBanned) {
          res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
          return;
        }
        if (isAdminEmail && user.role !== 'ADMIN') {
          user.role = 'ADMIN';
          user.updatedAt = new Date().toISOString();
          db.save();
        }
        db.logActivity(user.id, user.username, 'OTP_LOGIN', `Logged in via Email OTP: ${normalizedEmail}`);
      }

      const token = generateToken(user);
      const { passwordHash, ...safeUser } = user;

      res.json({
        message: 'Login successful via Email OTP.',
        token,
        user: {
          ...safeUser,
          hasPassword: Boolean(passwordHash),
        },
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'OTP verification failed.' });
    }
  }

  public static async getEmailStatus(req: Request, res: Response): Promise<void> {
    try {
      const cfg = db.emailConfig;
      res.json({
        enabled: cfg.enabled,
        protocol: cfg.protocol || 'smtp',
        senderEmail: cfg.senderEmail,
        senderName: cfg.senderName,
        allowOtpSignup: cfg.allowOtpSignup,
        otpExpiryMinutes: cfg.otpExpiryMinutes,
      });
    } catch (err: any) {
      res.status(500).json({ error: 'Failed to fetch email status.' });
    }
  }
}
