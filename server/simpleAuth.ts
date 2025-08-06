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
  
  // Session configuration with PostgreSQL storage
  app.use(session({
    store: new PgSession({
      pool: pool,
      tableName: 'session',
      createTableIfMissing: true,
    }),
    secret: process.env.SESSION_SECRET || 'your-secret-key-here',
    resave: false,
    saveUninitialized: false,
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

export const requireAuth = (req: any, res: Response, next: NextFunction) => {
  if (!req.requireVerifiedEmail()) {
    return res.status(401).json({ message: "Authentication required" });
  }
  next();
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