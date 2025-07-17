import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupSimpleAuth, requireAuth, requireVerifiedEmail } from "./simpleAuth";
import { insertLeadSchema, insertInteractionSchema, insertTargetSchema, insertNotificationSchema, updateUserRoleSchema, loginSchema, registerSchema, verifyCodeSchema } from "@shared/schema";
import { requirePermission, requireRole, hasPermission, canAccessResource, canAccessUser, PERMISSIONS, ROLES, Role } from "./rbac";
import { z } from "zod";
import { sendVerificationCode } from "./emailService";

export async function registerRoutes(app: Express): Promise<Server> {
  setupSimpleAuth(app);

  // Registration disabled - login only system
  app.post('/api/register', async (req: any, res) => {
    res.status(404).json({ message: "Registration not available" });
  });

  // Verify code endpoint
  app.post('/api/verify-code', async (req: any, res) => {
    try {
      const validationResult = verifyCodeSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Invalid code format", 
          errors: validationResult.error.issues 
        });
      }

      const { email, code } = validationResult.data;

      const user = await storage.verifyCode(email, code);
      if (!user) {
        return res.status(400).json({ message: "Invalid or expired verification code" });
      }

      // Log the user in after successful verification
      req.login(user, (err: any) => {
        if (err) {
          console.error("Session login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        const { password: _, verificationCode: __, codeExpiresAt: ___, ...userWithoutPassword } = user;
        res.json({
          message: "Email verified successfully",
          user: userWithoutPassword
        });
      });
    } catch (error) {
      console.error("Verification error:", error);
      res.status(500).json({ message: "Verification failed" });
    }
  });

  // Login endpoint
  app.post('/api/login', async (req: any, res) => {
    try {
      const validationResult = loginSchema.safeParse(req.body);
      if (!validationResult.success) {
        return res.status(400).json({ 
          message: "Validation failed", 
          errors: validationResult.error.issues 
        });
      }

      const { email, password } = validationResult.data;

      const user = await storage.getUserByEmail(email);
      if (!user || user.password !== password) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Allow login for verified users - no need to re-verify every time
      req.login(user, (err: any) => {
        if (err) {
          console.error("Session login error:", err);
          return res.status(500).json({ message: "Login failed" });
        }
        const { password: _, verificationCode: __, codeExpiresAt: ___, ...userWithoutPassword } = user;
        res.json({
          message: "Login successful",
          user: userWithoutPassword
        });
      });
    } catch (error) {
      console.error("Login error:", error);
      res.status(500).json({ message: "Login failed" });
    }
  });

  // Get current user
  app.get('/api/user', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }
      const { password: _, verificationCode: __, codeExpiresAt: ___, ...userWithoutPassword } = user;
      res.json(userWithoutPassword);
    } catch (error) {
      console.error("Get user error:", error);
      res.status(500).json({ message: "Failed to get user" });
    }
  });

  // Logout
  app.post('/api/logout', requireAuth, (req: any, res) => {
    req.logout((err: any) => {
      if (err) {
        console.error("Logout error:", err);
        return res.status(500).json({ message: "Logout failed" });
      }
      res.json({ message: "Logged out successfully" });
    });
  });





  // User management routes (Admin only)
  app.get('/api/users', requireVerifiedEmail, async (req: any, res) => {
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

  app.patch('/api/users/:id/role', requireVerifiedEmail, async (req: any, res) => {
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

  // Lead management routes with RBAC
  app.get('/api/leads', requireAuth, requireVerifiedEmail, requirePermission(PERMISSIONS.LEAD_VIEW), async (req: any, res) => {
    try {
      const currentUser = req.user;
      let leads;

      if (currentUser.role === ROLES.SUPER_ADMIN) {
        leads = await storage.getLeads();
      } else if (currentUser.role === ROLES.SALES_MANAGER) {
        const teamMembers = await storage.getTeamMembers(currentUser.id);
        const teamMemberIds = [currentUser.id, ...teamMembers.map(m => m.id)];
        leads = await storage.getLeads();
        leads = leads.filter(lead => 
          teamMemberIds.includes(lead.assignedTo) || 
          teamMemberIds.includes(lead.createdBy)
        );
      } else {
        leads = await storage.getLeadsByUser(currentUser.id);
      }

      res.json(leads);
    } catch (error) {
      console.error("Error fetching leads:", error);
      res.status(500).json({ message: "Failed to fetch leads" });
    }
  });

  app.get('/api/leads/:id', requireVerifiedEmail, async (req: any, res) => {
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

  app.post('/api/leads', requireAuth, requireVerifiedEmail, requirePermission(PERMISSIONS.LEAD_CREATE), async (req: any, res) => {
    try {
      const validation = insertLeadSchema.parse(req.body);
      
      // Validate assignment permissions
      if (validation.assignedTo && validation.assignedTo !== req.user.id) {
        const canAssign = hasPermission(req.user, PERMISSIONS.LEAD_ASSIGN);
        if (!canAssign) {
          return res.status(403).json({ message: "Cannot assign leads to other users" });
        }
        
        // Validate assignment scope based on role
        const availableUsers = await storage.getUsersForAssignment(req.user.id, req.user.role);
        const canAssignToUser = availableUsers.some(u => u.id === validation.assignedTo);
        
        if (!canAssignToUser) {
          return res.status(403).json({ message: "Cannot assign lead to this user" });
        }
      }
      
      const lead = await storage.createLead({
        ...validation,
        createdBy: req.user.id,
        assignedTo: req.user.id // Sales agents can only assign leads to themselves
      });
      res.status(201).json(lead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.patch('/api/leads/:id', requireVerifiedEmail, async (req: any, res) => {
    try {
      const leadData = req.body;
      const lead = await storage.updateLead(parseInt(req.params.id), leadData);
      res.json(lead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.put('/api/leads/:id', requireVerifiedEmail, async (req: any, res) => {
    try {
      const leadData = req.body;
      const lead = await storage.updateLead(parseInt(req.params.id), leadData);
      res.json(lead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  // Bulk lead upload
  app.post('/api/leads/bulk-upload', requireVerifiedEmail, async (req: any, res) => {
    const multer = require('multer');
    const upload = multer({ dest: 'uploads/' });
    const fs = require('fs');
    const csv = require('csv-parser');
    
    upload.single('file')(req, res, async (err: any) => {
      if (err) {
        return res.status(400).json({ message: 'File upload failed' });
      }

      if (!req.file) {
        return res.status(400).json({ message: 'No file uploaded' });
      }

      const results: any[] = [];
      const errors: string[] = [];
      let processed = 0;
      let failed = 0;

      try {
        const stream = fs.createReadStream(req.file.path)
          .pipe(csv())
          .on('data', (data: any) => results.push(data))
          .on('end', async () => {
            for (const row of results) {
              try {
                const leadData = {
                  contactName: row.contactName || row.name,
                  email: row.email,
                  phone: row.phone || '',
                  company: row.company || '',
                  value: parseFloat(row.value) || 0,
                  stage: row.stage || 'prospecting',
                  notes: row.notes || '',
                  createdBy: req.user.id,
                  assignedTo: req.user.id,
                };

                if (!leadData.contactName || !leadData.email) {
                  errors.push(`Row missing required fields: ${JSON.stringify(row)}`);
                  failed++;
                  continue;
                }

                await storage.createLead(leadData);
                processed++;
              } catch (error: any) {
                errors.push(`Failed to process row: ${JSON.stringify(row)} - ${error.message}`);
                failed++;
              }
            }

            // Clean up uploaded file
            try {
              fs.unlinkSync(req.file.path);
            } catch (cleanupError) {
              console.error('Failed to cleanup uploaded file:', cleanupError);
            }

            res.json({
              success: true,
              processed,
              failed,
              errors: errors.slice(0, 10) // Limit errors to prevent large responses
            });
          })
          .on('error', (error: any) => {
            console.error('CSV parsing error:', error);
            res.status(500).json({ message: 'Failed to parse CSV file' });
          });
      } catch (error) {
        console.error('Bulk upload error:', error);
        res.status(500).json({ message: 'Bulk upload failed' });
      }
    });
  });

  app.delete('/api/leads/:id', requireVerifiedEmail, async (req: any, res) => {
    try {
      await storage.deleteLead(parseInt(req.params.id));
      res.json({ message: "Lead deleted successfully" });
    } catch (error) {
      console.error("Error deleting lead:", error);
      res.status(500).json({ message: "Failed to delete lead" });
    }
  });

  // Interaction routes
  app.get('/api/leads/:id/interactions', requireVerifiedEmail, async (req: any, res) => {
    try {
      const interactions = await storage.getInteractions(parseInt(req.params.id));
      res.json(interactions);
    } catch (error) {
      console.error("Error fetching interactions:", error);
      res.status(500).json({ message: "Failed to fetch interactions" });
    }
  });

  app.post('/api/interactions', requireVerifiedEmail, async (req: any, res) => {
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

  // Target Management with RBAC
  app.get('/api/targets', requireAuth, requireVerifiedEmail, requirePermission(PERMISSIONS.TARGET_VIEW), async (req: any, res) => {
    try {
      const currentUser = req.user;
      const userId = req.query.userId as string;
      let targets;

      if (currentUser.role === ROLES.SUPER_ADMIN) {
        targets = await storage.getTargets(userId);
      } else if (currentUser.role === ROLES.SALES_MANAGER) {
        if (userId) {
          const canView = await canAccessUser(currentUser, userId);
          if (!canView) {
            return res.status(403).json({ message: "Access denied" });
          }
        }
        targets = await storage.getTargets(userId || currentUser.id);
      } else {
        targets = await storage.getTargets(currentUser.id);
      }

      res.json(targets);
    } catch (error) {
      console.error("Error fetching targets:", error);
      res.status(500).json({ message: "Failed to fetch targets" });
    }
  });

  app.post('/api/targets', requireVerifiedEmail, async (req: any, res) => {
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

  app.patch('/api/targets/:id', requireVerifiedEmail, async (req: any, res) => {
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

  app.delete('/api/targets/:id', requireVerifiedEmail, async (req: any, res) => {
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
  app.get('/api/notifications', requireVerifiedEmail, async (req: any, res) => {
    try {
      const notifications = await storage.getNotifications(req.user.id);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', requireVerifiedEmail, async (req: any, res) => {
    try {
      await storage.markNotificationRead(parseInt(req.params.id));
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.get('/api/notifications/unread-count', requireVerifiedEmail, async (req: any, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      res.status(500).json({ message: "Failed to fetch unread notification count" });
    }
  });

  // Analytics with RBAC
  app.get('/api/analytics/metrics', requireAuth, requireVerifiedEmail, requirePermission(PERMISSIONS.ANALYTICS_PERSONAL), async (req: any, res) => {
    try {
      const currentUser = req.user;
      const userId = req.query.userId as string;
      let targetUserId = userId;

      if (currentUser.role === ROLES.SUPER_ADMIN && hasPermission(currentUser, PERMISSIONS.ANALYTICS_GLOBAL)) {
        targetUserId = userId;
      } else if (currentUser.role === ROLES.SALES_MANAGER && hasPermission(currentUser, PERMISSIONS.ANALYTICS_TEAM)) {
        if (userId) {
          const canView = await canAccessUser(currentUser, userId);
          if (!canView) {
            return res.status(403).json({ message: "Access denied" });
          }
          targetUserId = userId;
        } else {
          targetUserId = currentUser.id;
        }
      } else {
        targetUserId = currentUser.id;
      }

      const metrics = await storage.getSalesMetrics(targetUserId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.get('/api/analytics/team-performance', requireVerifiedEmail, async (req: any, res) => {
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
