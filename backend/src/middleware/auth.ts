// Express middleware for session authentication. Reads the session token
// from the reachinbox_token cookie (or a Bearer header as a fallback),
// verifies it via AuthService, and attaches the resolved user to the
// request. requireAuth rejects unauthenticated requests; optionalAuth lets
// them through with req.user left unset.

import { Request, Response, NextFunction } from 'express';
import { AuthService, SessionUser } from '../services/auth.service';

// Extend Express Request to include user
declare global {
  namespace Express {
    interface Request {
      user?: SessionUser;
    }
  }
}

export const requireAuth = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Check cookie first, then Authorization header
    let token = req.cookies?.reachinbox_token;
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      res.status(401).json({ error: 'Unauthorized: Authentication required' });
      return;
    }

    const sessionUser = AuthService.verifySessionToken(token);
    if (!sessionUser) {
      res.status(401).json({ error: 'Unauthorized: Invalid or expired session' });
      return;
    }

    req.user = sessionUser;
    next();
  } catch (error) {
    res.status(401).json({ error: 'Unauthorized: Authentication failed' });
  }
};

export const optionalAuth = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  try {
    let token = req.cookies?.reachinbox_token;
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (token) {
      const sessionUser = AuthService.verifySessionToken(token);
      if (sessionUser) {
        req.user = sessionUser;
      }
    }
  } catch {
    // Ignore errors for optional auth
  }
  next();
};
