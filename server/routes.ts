import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupAuth, isAuthenticated } from "./replitAuth";
import { insertLeadSchema, insertInteractionSchema, insertTargetSchema, insertNotificationSchema } from "@shared/schema";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  await setupAuth(app);

  // Auth routes
  app.get('/api/auth/user', isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user.claims.sub;
      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Sample data initialization
  app.post('/api/init-sample-data', isAuthenticated, async (req: any, res) => {
    try {
      const currentUserId = req.user.claims.sub;
      
      // Create sample admin user
      const adminUser = await storage.upsertUser({
        id: 'admin-001',
        email: 'admin@paperfly.com',
        firstName: 'Admin',
        lastName: 'User',
        profileImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=admin',
        role: 'admin'
      });

      // Create sample sales users
      const salesUser1 = await storage.upsertUser({
        id: 'sales-001',
        email: 'sales1@paperfly.com',
        firstName: 'Rashid',
        lastName: 'Ahmed',
        profileImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=rashid',
        role: 'sales'
      });

      const salesUser2 = await storage.upsertUser({
        id: 'sales-002',
        email: 'sales2@paperfly.com',
        firstName: 'Fatima',
        lastName: 'Khan',
        profileImageUrl: 'https://api.dicebear.com/7.x/avataaars/svg?seed=fatima',
        role: 'sales'
      });

      // Create sample leads
      const leads = [
        { contactName: 'John Doe', email: 'john@techsolutions.com', company: 'Tech Solutions Ltd', phone: '+880-1234-567890', value: 50000, stage: 'Prospecting', assignedTo: 'sales-001' },
        { contactName: 'Sarah Smith', email: 'sarah@digitalma.com', company: 'Digital Marketing Agency', phone: '+880-1234-567891', value: 75000, stage: 'Qualified', assignedTo: 'sales-001' },
        { contactName: 'Mike Johnson', email: 'mike@ecomstart.com', company: 'E-commerce Startup', phone: '+880-1234-567892', value: 100000, stage: 'Proposal', assignedTo: 'sales-002' },
        { contactName: 'Ahmed Hassan', email: 'ahmed@restaurant.com', company: 'Local Restaurant Chain', phone: '+880-1234-567893', value: 25000, stage: 'Negotiation', assignedTo: 'sales-002' },
        { contactName: 'Dr. Rahman', email: 'rahman@clinic.com', company: 'Healthcare Clinic', phone: '+880-1234-567894', value: 60000, stage: 'Closed Won', assignedTo: 'sales-001' }
      ];

      for (const lead of leads) {
        await storage.createLead(lead);
      }

      // Create sample targets
      await storage.createTarget({
        userId: 'sales-001',
        targetType: 'revenue',
        targetValue: 200000,
        period: 'monthly',
        description: 'Monthly revenue target for Rashid'
      });

      await storage.createTarget({
        userId: 'sales-002',
        targetType: 'revenue',
        targetValue: 180000,
        period: 'monthly',
        description: 'Monthly revenue target for Fatima'
      });

      res.json({ message: 'Sample data initialized successfully' });
    } catch (error) {
      console.error("Error initializing sample data:", error);
      res.status(500).json({ message: "Failed to initialize sample data" });
    }
  });

  // User management routes (Admin only)
  app.get('/api/users', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
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
      const user = await storage.getUser(req.user.claims.sub);
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
        createdBy: req.user.claims.sub,
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
        userId: req.user.claims.sub,
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
      const user = await storage.getUser(req.user.claims.sub);
      const userId = user?.role === 'admin' ? undefined : req.user.claims.sub;
      const targets = await storage.getTargets(userId);
      res.json(targets);
    } catch (error) {
      console.error("Error fetching targets:", error);
      res.status(500).json({ message: "Failed to fetch targets" });
    }
  });

  app.post('/api/targets', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      if (user?.role !== 'admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const targetData = insertTargetSchema.parse({
        ...req.body,
        createdBy: req.user.claims.sub,
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
      const user = await storage.getUser(req.user.claims.sub);
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
      const user = await storage.getUser(req.user.claims.sub);
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
      const notifications = await storage.getNotifications(req.user.claims.sub);
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
      const count = await storage.getUnreadNotificationCount(req.user.claims.sub);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      res.status(500).json({ message: "Failed to fetch unread notification count" });
    }
  });

  // Analytics routes
  app.get('/api/analytics/metrics', isAuthenticated, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.claims.sub);
      const userId = user?.role === 'admin' ? undefined : req.user.claims.sub;
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
