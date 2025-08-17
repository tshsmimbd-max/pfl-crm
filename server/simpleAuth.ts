import { Express, Request, Response, NextFunction } from "express";
import session from "express-session";
import ConnectPgSimple from "connect-pg-simple";
import { pool } from "./db";
import { storage } from "./storage";
import * as crypto from "crypto";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      fullName: string;
      role: string;
    }
  }
}

export function setupSimpleAuth(app: Express) {
  // PostgreSQL session store
  const PgSession = ConnectPgSimple(session);
  
  // Session configuration with PostgreSQL storage - robust connection handling
  app.use(session({
    store: new PgSession({
      pool: pool,
      tableName: 'session',
      schemaName: 'public',
      createTableIfMissing: false, // We created the table manually
      ttl: 24 * 60 * 60, // 1 day in seconds
      errorLog: (error) => {
        console.error('Session store error:', error);
        // Don't crash on connection errors
      },
      disableTouch: false, // Keep sessions active
    }),
    secret: process.env.SESSION_SECRET || 'paperfly-crm-secret-2025-production',
    resave: false,
    saveUninitialized: false,
    rolling: true, // Extend session on activity
    cookie: {
      secure: false, // Set to true in production with HTTPS
      httpOnly: true,
      maxAge: 24 * 60 * 60 * 1000 // 24 hours
    }
  }));

  // Add session login/logout methods
  app.use((req: any, res, next) => {
    req.login = (user: any, callback: (err?: any) => void) => {
      req.session.user = user;
      callback();
    };

    req.logout = (callback: (err?: any) => void) => {
      req.session.destroy((err: any) => {
        callback(err);
      });
    };

    req.requireVerifiedEmail = () => {
      return !!req.session.user;
    };

    req.user = req.session.user;

    next();
  });
}

export const requireAuth = async (req: any, res: Response, next: NextFunction) => {
  if (!req.requireVerifiedEmail()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  
  try {
    // Check if user is active
    const user = await storage.getUser(req.user.id);
    if (!user?.isActive) {
      req.logout(() => {
        // Force logout inactive user
      });
      return res.status(401).json({ message: "Account has been deactivated. Please contact your administrator." });
    }
    next();
  } catch (error) {
    console.error("Auth check error:", error);
    return res.status(500).json({ message: "Authentication error" });
  }
};

export const requireVerifiedEmail = async (req: any, res: Response, next: NextFunction) => {
  if (!req.requireVerifiedEmail()) {
    return res.status(401).json({ message: "Authentication required" });
  }

  try {
    const user = await storage.getUser(req.user.id);
    if (!user?.emailVerified) {
      return res.status(403).json({ 
        message: "Email verification required",
        needsVerification: true 
      });
    }
    next();
  } catch (error) {
    return res.status(500).json({ message: "Server error" });
  }
};