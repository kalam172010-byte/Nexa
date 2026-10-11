import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { db } from '../db/database';
import { User, UserRole } from '../models/types';

const JWT_SECRET = process.env.JWT_SECRET || 'nexa_ultra_secure_gaming_jwt_secret_99818';

export interface AuthenticatedRequest extends Request {
  user?: User;
}

export function generateToken(user: User): string {
  const payload = {
    userId: user.id,
    role: user.role,
    username: user.username,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000,
  };
  const str = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const signature = crypto.createHmac('sha256', JWT_SECRET).update(str).digest('base64url');
  return `${str}.${signature}`;
}

export function verifyToken(token: string): { userId: string; role: UserRole; username: string } | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 2) return null;
    const [payloadStr, signature] = parts;
    const expectedSig = crypto.createHmac('sha256', JWT_SECRET).update(payloadStr).digest('base64url');
    if (signature !== expectedSig) return null;

    const payload = JSON.parse(Buffer.from(payloadStr, 'base64url').toString('utf-8'));
    if (payload.exp && Date.now() > payload.exp) return null;
    return payload;
  } catch (err) {
    return null;
  }
}

export function authenticate(req: AuthenticatedRequest, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Authentication required. Please log in.' });
    return;
  }

  const token = authHeader.substring(7).trim();
  const decoded = verifyToken(token);
  if (!decoded) {
    res.status(401).json({ error: 'Session expired or invalid token. Please log in again.' });
    return;
  }

  const user = db.users.find(u => u.id === decoded.userId);
  if (!user) {
    res.status(401).json({ error: 'User account not found.' });
    return;
  }

  if (user.isBanned) {
    res.status(403).json({ error: 'Your account has been suspended. Please contact support.' });
    return;
  }

  req.user = user;
  next();
}

export function requireRole(allowedRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction): void => {
    if (!req.user) {
      res.status(401).json({ error: 'Authentication required.' });
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({ error: `Access denied. Requires one of [${allowedRoles.join(', ')}] permissions.` });
      return;
    }

    next();
  };
}
