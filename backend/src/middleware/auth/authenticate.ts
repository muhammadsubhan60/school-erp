import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { env } from '../../config/env';
import { TokenBlacklist } from '../../models/TokenBlacklist';
import type { IUser, UserRole } from '../../models/User';

interface JwtPayload {
  userId: string;
  role: UserRole;
  orgId?: string;
  branchId?: string;
  iat: number;
  exp: number;
}

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        role: UserRole;
        orgId?: string;
        branchId?: string;
        doc?: IUser;
      };
      orgId?: string;
      orgSlug?: string;
    }
  }
}

// In-memory blacklist cache: token → expiry ms timestamp
const blacklistCache = new Map<string, number>();

export function addToBlacklistCache(token: string, expiresAt: Date): void {
  blacklistCache.set(token, expiresAt.getTime());
  if (blacklistCache.size % 100 === 0) {
    const now = Date.now();
    for (const [t, exp] of blacklistCache) {
      if (exp < now) blacklistCache.delete(t);
    }
  }
}

export async function authenticate(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  // Read token from HttpOnly cookie first, fall back to Authorization header
  const token =
    (req.cookies as Record<string, string> | undefined)?.accessToken ??
    req.headers.authorization?.slice(7);

  if (!token) {
    res.status(401).json({ success: false, message: 'No token provided' });
    return;
  }

  try {
    const payload = jwt.verify(token, env.jwtSecret) as JwtPayload;

    // Check in-memory cache first (fast path)
    const cachedExp = blacklistCache.get(token);
    if (cachedExp && cachedExp > Date.now()) {
      res.status(401).json({ success: false, message: 'Token has been invalidated' });
      return;
    }

    // Fall through to MongoDB only if not cached
    const blacklisted = await TokenBlacklist.exists({ token });
    if (blacklisted) {
      addToBlacklistCache(token, new Date(payload.exp * 1000));
      res.status(401).json({ success: false, message: 'Token has been invalidated' });
      return;
    }

    req.user = {
      id: payload.userId,
      role: payload.role,
      orgId: payload.orgId,
      branchId: payload.branchId,
    };

    if (!req.orgId && payload.orgId) {
      req.orgId = payload.orgId;
    }

    next();
  } catch (err) {
    if (err instanceof jwt.TokenExpiredError) {
      res.status(401).json({ success: false, message: 'Token expired' });
      return;
    }
    res.status(401).json({ success: false, message: 'Invalid token' });
  }
}
