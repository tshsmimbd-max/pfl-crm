import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./auth";
import { insertLeadSchema, insertInteractionSchema, insertTargetSchema, insertNotificationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  setupAuth(app);

  // Traditional login/register routes
  app.post('/api/login', async (req: any, res) => {
    try {
      const { email, password } = req.body;
      
      if (!email || !password) {
        return res.status(400).json({ message: "Email and password are required" });
      }

      const user = await storage.getUserByEmail(email);
      if (!user || !user.password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Simple password check (in production, use bcrypt)
      if (user.password !== password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Check if email is verified (only for traditional registration users)
      if (user.password && user.emailVerified === false) {
        return res.status(401).json({ 
          message: "Please verify your email before logging in. Check the server console for the verification link.",
          needsVerification: true
        });
      }

      req.login(user, (err: any) => {
        if (err) {
          console.error("Session login error:", err);
          return res.status(500).json({ message: "Session creation failed" });
        }
        const { password: _, verificationToken: __, ...userWithoutPassword } = user;
        res.json(userWithoutPassword);
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  app.post('/api/register', async (req: any, res) => {
    try {
      const { email, password, firstName, lastName } = req.body;
      
      if (!email || !password || !firstName || !lastName) {
        return res.status(400).json({ message: "All fields are required" });
      }

      // Check if user already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "User already exists with this email" });
      }

      // Generate verification token
      const verificationToken = Math.random().toString(36).substring(2) + Date.now().toString(36);

      // Create new user
      const user = await storage.createUser({
        email,
        password, // In production, hash this password
        firstName,
        lastName,
        role: 'sales',
        emailVerified: false,
        verificationToken,
      });

      // Send verification email
      const { sendVerificationEmail } = await import('./emailService');
      const emailSent = await sendVerificationEmail(email, verificationToken);
      
      // Don't auto-login unverified users
      const { password: _, verificationToken: __, ...userWithoutPassword } = user;
      res.json({
        ...userWithoutPassword,
        emailVerificationSent: emailSent,
        requiresVerification: true
      });
    } catch (error) {
      console.error("Registration error:", error);
      res.status(500).json({ message: "Registration failed" });
    }
  });

  // Email verification route
  app.get('/api/verify-email', async (req: any, res) => {
    try {
      const { token } = req.query;
      
      if (!token) {
        return res.status(400).send(`
          <html><body>
            <h2>Verification Failed</h2>
            <p>Verification token is required</p>
            <a href="/auth">Go to Login</a>
          </body></html>
        `);
      }

      // Find user by verification token
      const user = await storage.getUserByVerificationToken(token);
      if (!user) {
        return res.status(400).send(`
          <html><body>
            <h2>Verification Failed</h2>
            <p>Invalid or expired verification token</p>
            <a href="/auth">Go to Login</a>
          </body></html>
        `);
      }

      // Update user to verified
      await storage.verifyUserEmail(user.id);
      
      // Redirect to success page
      res.send(`
        <html><body style="font-family: Arial, sans-serif; text-align: center; padding: 50px;">
          <h2 style="color: green;">Email Verified Successfully!</h2>
          <p>Your email has been verified. You can now log in to your account.</p>
          <a href="/auth" style="background-color: #007bff; color: white; padding: 10px 20px; text-decoration: none; border-radius: 5px;">Go to Login</a>
        </body></html>
      `);
    } catch (error) {
      console.error("Email verification error:", error);
      res.status(500).send(`
        <html><body>
          <h2>Verification Error</h2>
          <p>Email verification failed</p>
          <a href="/auth">Go to Login</a>
        </body></html>
      `);
    }
  });

  // Firebase Auth route
  app.post('/api/auth/firebase', async (req: any, res) => {
    try {
      const { idToken, email, displayName, photoURL } = req.body;
      
      if (!idToken || !email) {
        return res.status(400).json({ message: "Missing required fields" });
      }

      // Check if user exists, create if not
      let user = await storage.getUserByEmail(email);
      
      if (!user) {
        // Create new user from OAuth data
        const [firstName, ...lastNameParts] = (displayName || email.split('@')[0]).split(' ');
        const lastName = lastNameParts.join(' ') || '';
        
        user = await storage.createUser({
          email,
          password: '', // OAuth users don't need password
          firstName,
          lastName,
          role: 'sales', // Default role
          emailVerified: true, // OAuth users are automatically verified
        });
      }

      // Store user in session
      req.login(user, (err: any) => {
        if (err) {
          console.error("Session login error:", err);
          return res.status(500).json({ message: "Session creation failed" });
        }
        res.json(user);
      });
    } catch (error) {
      console.error("Firebase auth error:", error);
      res.status(500).json({ message: "Authentication failed" });
    }
  });

  // Get current user
  app.get('/api/user', (req: any, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    res.json(req.user);
  });

  // Logout
  app.post('/api/logout', (req: any, res) => {
    req.logout((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });





  // User management routes (Admin only)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:id/role', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const { role } = req.body;
      const updatedUser = await storage.updateUserRole(req.params.id, role);
      res.json(updatedUser);
    } catch (error) {
      console.error("Error updating user role:", error);
      res.status(500).json({ message: "Failed to update user role" });
    }
  });

  // Lead management routes
  app.get('/api/leads', isAuthenticated, async (req: any, res) => {
    try {
      const leads = await storage.getLeads();
      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get('/api/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const lead = await storage.getLead(parseInt(req.params.id));
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      res.json(lead);
    } catch (error) {
      console.error("Error fetching lead:", error);
      res.status(500).json({ message: "Failed to fetch lead" });
    }
  });

  app.post('/api/leads', isAuthenticated, async (req: any, res) => {
    try {
      const leadData = insertLeadSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });
      const lead = await storage.createLead(leadData);
      res.json(lead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.patch('/api/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      const leadData = req.body;
      const lead = await storage.updateLead(parseInt(req.params.id), leadData);
      res.json(lead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.delete('/api/leads/:id', isAuthenticated, async (req: any, res) => {
    try {
      await storage.deleteLead(parseInt(req.params.id));
      res.json({ message: "Lead deleted successfully" });
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // Interaction routes
  app.get('/api/leads/:id/interactions', isAuthenticated, async (req: any, res) => {
    try {
      const interactions = await storage.getInteractions(parseInt(req.params.id));
      res.json(interactions);
    } catch (error) {
      console.error("Error fetching interactions:", error);
      res.status(500).json({ message: "Failed to fetch interactions" });
    }
  });

  app.post('/api/interactions', isAuthenticated, async (req: any, res) => {
    try {
      const interactionData = insertInteractionSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const interaction = await storage.createInteraction(interactionData);
      res.json(interaction);
    } catch (error) {
      console.error("Error creating interaction:", error);
      res.status(500).json({ message: "Failed to create interaction" });
    }
  });

  // Target management routes
  app.get('/api/targets', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      const userId = user?.role === 'admin' ? undefined : req.user.id;
      const targets = await storage.getTargets(userId);
      res.json(targets);
    } catch (error) {
      console.error("Error fetching targets:", error);
      res.status(500).json({ message: "Failed to fetch targets" });
    }
  });

  app.post('/api/targets', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const targetData = insertTargetSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });
      const target = await storage.createTarget(targetData);

      // Create notification for the assigned user
      await storage.createNotification({
        userId: target.userId!,
        type: 'target_assigned',
        title: 'New Target Assigned',
        message: `You have been assigned a new ${target.period} target of ৳${target.targetValue}`,
      });

      res.json(target);
    } catch (error) {
      console.error("Error creating target:", error);
      res.status(500).json({ message: "Failed to create target" });
    }
  });

  app.patch('/api/targets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const target = await storage.updateTarget(parseInt(req.params.id), req.body);
      res.json(target);
    } catch (error) {
      console.error("Error updating target:", error);
      res.status(500).json({ message: "Failed to update target" });
    }
  });

  app.delete('/api/targets/:id', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.deleteTarget(parseInt(req.params.id));
      res.json({ message: "Target deleted successfully" });
    } catch (error) {
      console.error("Error deleting target:", error);
      res.status(500).json({ message: "Failed to delete target" });
    }
  });

  // Notification routes
  app.get('/api/notifications', isAuthenticated, async (req: any, res) => {
    try {
      const notifications = await storage.getNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', isAuthenticated, async (req: any, res) => {
    try {
      await storage.markNotificationRead(parseInt(req.params.id));
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.get('/api/notifications/unread-count', isAuthenticated, async (req: any, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      res.status(500).json({ message: "Failed to fetch unread notification count" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      const userId = user?.role === 'admin' ? undefined : req.user.id;
      const metrics = await storage.getSalesMetrics(userId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.get('/api/analytics/team-performance', isAuthenticated, async (req: any, res) => {
    try {
      const performance = await storage.getTeamPerformance();
      res.json(performance);
    } catch (error) {
      console.error("Error fetching team performance:", error);
      res.status(500).json({ message: "Failed to fetch team performance" });
    }
  });

  const httpServer = createServer(app);

  // WebSocket server for real-time notifications
  const wss = new WebSocketServer({ server: httpServer, path: '/ws' });

  wss.on('connection', (ws: WebSocket) => {
    console.log('WebSocket client connected');

    ws.on('message', (message) => {
      try {
        const data = JSON.parse(message.toString());
        console.log('Received WebSocket message:', data);
      } catch (error) {
        console.error('Error parsing WebSocket message:', error);
      }
    });

    ws.on('close', () => {
      console.log('WebSocket client disconnected');
    });
  });

  return httpServer;
}
