import { Request, Response, NextFunction } from 'express';
import { storage } from './storage';

export interface AuthenticatedRequest extends Request {
  user?: any;
}

// Comprehensive authentication middleware supporting all auth methods
export const requireAuth = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    // 1. Try Google OAuth session first
    if (req.isAuthenticated && req.isAuthenticated() && req.user) {
      return next();
    }
    
    // 2. Try simple token authentication via x-user-token header
    const simpleToken = req.headers['x-user-token'] as string;
    if (simpleToken) {
      const user = await storage.getUser(simpleToken);
      if (user) {
        req.user = user;
        return next();
      }
    }
    
    return res.status(401).json({ message: "No token provided" });
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(500).json({ message: "Authentication error" });
  }
};

// Admin-only access middleware
export const requireAdmin = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  await requireAuth(req, res, () => {
    if (req.user && (req.user.role === 'admin' || req.user.role === 'moderator')) {
      return next();
    }
    return res.status(403).json({ message: "Admin access required" });
  });
};

// User role check middleware
export const requireRole = (roles: string[]) => {
  return async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    await requireAuth(req, res, () => {
      if (req.user && roles.includes(req.user.role)) {
        return next();
      }
      return res.status(403).json({ message: `Access denied. Required roles: ${roles.join(', ')}` });
    });
  };
};