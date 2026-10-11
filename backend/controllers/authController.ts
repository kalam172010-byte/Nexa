import { Request, Response } from 'express';
import crypto from 'crypto';
import { db } from '../db/database';
import { User } from '../models/types';
import { hashPassword } from '../db/seed';
import { generateToken, AuthenticatedRequest } from '../middleware/auth';

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

      const newReferralCode = `NX${crypto.randomBytes(3).toString('hex').toUpperCase()}`;
      const newUser: User = {
        id: `USR-${Date.now()}`,
        username: username.trim(),
        email: email.trim().toLowerCase(),
        passwordHash: hashPassword(password),
        role: 'USER',
        balance: 0.0,
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

      const token = generateToken(newUser);
      const { passwordHash: _, ...safeUser } = newUser;

      res.status(201).json({
        message: 'Account created successfully.',
        token,
        user: safeUser,
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
        res.status(401).json({ error: 'Invalid username/email or password.' });
        return;
      }

      if (user.isBanned) {
        res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
        return;
      }

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

  public static async quickDemoLogin(req: Request, res: Response): Promise<void> {
    try {
      const { role } = req.body; // 'USER' | 'RESELLER' | 'ADMIN'
      const targetUser = db.users.find(u => u.role === (role || 'USER'));

      if (!targetUser) {
        res.status(404).json({ error: `Demo user for role ${role} not found.` });
        return;
      }

      const token = generateToken(targetUser);
      const { passwordHash: _, ...safeUser } = targetUser;

      res.json({
        message: `Logged in as demo ${targetUser.role}.`,
        token,
        user: safeUser,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Quick login failed.' });
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
      let user = db.users.find(u => u.id === uid || u.email.toLowerCase() === normalizedEmail);

      const ADMIN_EMAILS = [
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
          username: username || `user_${Date.now().toString().slice(-4)}`,
          email: normalizedEmail,
          passwordHash: '',
          role: isAdminEmail ? 'ADMIN' : 'USER',
          balance: 0.0,
          referralCode: newReferralCode,
          twoFactorEnabled: false,
          isBanned: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        db.users.push(user);
        db.logActivity(user.id, user.username, 'FIREBASE_AUTH_SIGNUP', `Registered via Firebase: ${normalizedEmail}`);
        db.save();
      } else {
        if (isAdminEmail && user.role !== 'ADMIN') {
          user.role = 'ADMIN';
        }
        user.updatedAt = new Date().toISOString();
        db.logActivity(user.id, user.username, 'FIREBASE_AUTH_LOGIN', `Logged in via Firebase: ${normalizedEmail}`);
        db.save();
      }

      const token = generateToken(user);
      const { passwordHash: _, ...safeUser } = user;
      res.json({
        message: 'Firebase sync successful.',
        token,
        user: safeUser,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message || 'Firebase sync failed.' });
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
    const { passwordHash: _, ...safeUser } = freshUser;
    res.json({ user: safeUser });
  }

  public static async changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
    try {
      if (!req.user) {
        res.status(401).json({ error: 'Not authenticated.' });
        return;
      }

      const { currentPassword, newPassword, confirmPassword } = req.body;
      if (!currentPassword || !newPassword) {
        res.status(400).json({ error: 'Current password and new password are required.' });
        return;
      }

      if (newPassword !== confirmPassword) {
        res.status(400).json({ error: 'New password and confirmation do not match.' });
        return;
      }

      if (newPassword.length < 6) {
        res.status(400).json({ error: 'New password must be at least 6 characters.' });
        return;
      }

      const user = db.users.find(u => u.id === req.user!.id);
      if (!user) {
        res.status(404).json({ error: 'User not found.' });
        return;
      }

      if (user.passwordHash !== hashPassword(currentPassword)) {
        res.status(400).json({ error: 'Current password is incorrect.' });
        return;
      }

      user.passwordHash = hashPassword(newPassword);
      user.updatedAt = new Date().toISOString();
      db.save();

      db.logActivity(user.id, user.username, 'PASSWORD_CHANGE', 'Password updated successfully');
      res.json({ message: 'Password changed successfully.' });
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
}
