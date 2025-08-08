import type { Express } from "express";
import { createServer, type Server } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { storage } from "./storage";
import { setupSimpleAuth, requireAuth, requireVerifiedEmail } from "./simpleAuth";
import { insertLeadSchema, insertInteractionSchema, insertTargetSchema, insertCustomerSchema, insertDailyRevenueSchema, insertNotificationSchema, insertCalendarEventSchema, loginSchema, registerSchema, verifyCodeSchema } from "@shared/schema";
import { requirePermission, requireRole, hasPermission, canAccessResource, canAccessUser, PERMISSIONS, ROLES, Role } from "./rbac";
import { z } from "zod";
import { sendVerificationCode } from "./emailService";
import bcrypt from "bcrypt";
import multer from "multer";
import fs from "fs";
import csv from "csv-parser";

// Configure multer for file uploads
const upload = multer({ 
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
      cb(null, `${Date.now()}-${file.originalname}`);
    }
  })
});

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
      if (!user) {
        return res.status(401).json({ message: "Invalid email or password" });
      }

      // Compare password using bcrypt
      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
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
  app.get('/api/users', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const users = await storage.getAllUsers();
      res.json(users);
    } catch (error) {
      console.error("Error fetching users:", error);
      res.status(500).json({ message: "Failed to fetch users" });
    }
  });

  app.patch('/api/users/:id/role', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'super_admin') {
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

  // Get users for assignment dropdown (role-based filtering)
  app.get('/api/users/assignment', requireAuth, async (req: any, res) => {
    try {
      const currentUser = req.user;
      let users = await storage.getUsersForAssignment(currentUser.id, currentUser.role);
      
      // Add current user as "Myself" option for all roles  
      users = [
        { 
          id: currentUser.id, 
          employeeName: "Myself", 
          role: currentUser.role, 
          email: currentUser.email,
          password: "",
          employeeCode: currentUser.employeeCode || "",
          managerId: currentUser.managerId,
          teamName: currentUser.teamName,
          emailVerified: currentUser.emailVerified,
          verificationCode: currentUser.verificationCode,
          codeExpiresAt: currentUser.codeExpiresAt,
          createdAt: currentUser.createdAt,
          updatedAt: currentUser.updatedAt
        },
        ...users.filter(u => u.id !== currentUser.id)
      ];
      
      res.json(users);
    } catch (error) {
      console.error("Error fetching assignment users:", error);
      res.status(500).json({ message: "Failed to fetch users for assignment" });
    }
  });

  app.post('/api/users', requireAuth, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      
      // Only super_admin and sales_manager can create users
      if (currentUser?.role !== 'super_admin' && currentUser?.role !== 'sales_manager') {
        return res.status(403).json({ message: "Access denied" });
      }

      const { email, employeeName, employeeCode, password, role, managerId, teamName } = req.body;

      // Validate required fields
      if (!email || !employeeName || !employeeCode || !password || !role) {
        return res.status(400).json({ message: "Missing required fields: email, employeeName, employeeCode, password, role" });
      }

      // Sales managers can only create sales_agent users
      if (currentUser.role === 'sales_manager' && role !== 'sales_agent') {
        return res.status(403).json({ message: "Sales managers can only create sales agent users" });
      }

      // Check if email already exists
      const existingUser = await storage.getUserByEmail(email);
      if (existingUser) {
        return res.status(400).json({ message: "Email already exists" });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Create user
      const newUser = await storage.createUser({
        email,
        employeeName,
        employeeCode,
        password: hashedPassword,
        role,
        managerId: managerId || undefined,
        teamName: teamName || undefined
      });

      // Remove sensitive information before sending response
      const { password: _, verificationCode: __, codeExpiresAt: ___, ...userResponse } = newUser;
      res.json(userResponse);
    } catch (error) {
      console.error("Error creating user:", error);
      res.status(500).json({ message: "Failed to create user" });
    }
  });

  // Lead management routes with RBAC
  app.get('/api/leads', requireAuth, requirePermission(PERMISSIONS.LEAD_VIEW), async (req: any, res) => {
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

  app.get('/api/leads/:id', requireAuth, async (req: any, res) => {
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

  app.post('/api/leads', requireAuth, requirePermission(PERMISSIONS.LEAD_CREATE), async (req: any, res) => {
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
      
      // Handle "myself" assignment
      const finalAssignedTo = validation.assignedTo === "myself" || !validation.assignedTo 
        ? req.user.id 
        : validation.assignedTo;

      const lead = await storage.createLead({
        value: validation.value,
        contactName: validation.contactName,
        email: validation.email,
        company: validation.company,
        stage: validation.stage,
        phone: validation.phone,
        assignedTo: finalAssignedTo,
        leadSource: validation.leadSource || "Others",
        packageSize: validation.packageSize,
        website: validation.website,
        facebookPageUrl: validation.facebookPageUrl,
        orderVolume: validation.orderVolume,
        notes: validation.notes
      });
      res.status(201).json(lead);
    } catch (error) {
      console.error("Error creating lead:", error);
      res.status(500).json({ message: "Failed to create lead" });
    }
  });

  app.patch('/api/leads/:id', requireAuth, async (req: any, res) => {
    try {
      const leadData = req.body;
      const lead = await storage.updateLead(parseInt(req.params.id), leadData);
      res.json(lead);
    } catch (error) {
      console.error("Error updating lead:", error);
      res.status(500).json({ message: "Failed to update lead" });
    }
  });

  app.put('/api/leads/:id', requireAuth, async (req: any, res) => {
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
  app.post('/api/leads/bulk-upload', requireAuth, async (req: any, res) => {
    const upload = multer({ dest: 'uploads/' });
    
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
                  createdBy: req.user.id,
                  assignedTo: req.user.id,
                  // Enhanced fields from CSV
                  leadSource: row.leadSource || row.lead_source || 'Others',
                  packageSize: row.packageSize || row.package_size || '',
                  website: row.website || '',
                  facebookPageUrl: row.facebookPageUrl || row.facebook_page_url || '',
                  orderVolume: parseInt(row.orderVolume || row.order_volume || '0') || 0,
                  notes: row.notes || '',
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

  app.delete('/api/leads/:id', requireAuth, async (req: any, res) => {
    try {
      await storage.deleteLead(parseInt(req.params.id));
      res.json({ message: "Lead deleted successfully" });
    } catch (error: any) {
      console.error("Error deleting lead:", error);
      if (error.message && error.message.includes("converted to a customer")) {
        res.status(400).json({ message: error.message });
      } else {
        res.status(500).json({ message: "Failed to delete lead" });
      }
    }
  });

  // Interaction routes (Activities)
  app.get('/api/leads/:id/interactions', requireAuth, async (req: any, res) => {
    try {
      const leadId = parseInt(req.params.id);
      const currentUser = await storage.getUser(req.user.id);
      
      // Check if user can access this lead
      const lead = await storage.getLead(leadId);
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      let canAccess = false;
      if (currentUser?.role === ROLES.SUPER_ADMIN) {
        canAccess = true;
      } else if (currentUser?.role === ROLES.SALES_MANAGER) {
        const teamMembers = await storage.getTeamMembers(currentUser.id);
        const teamMemberIds = [currentUser.id, ...teamMembers.map(m => m.id)];
        canAccess = !!(lead.assignedTo && teamMemberIds.includes(lead.assignedTo)) || 
                   !!(lead.createdBy && teamMemberIds.includes(lead.createdBy));
      } else if (currentUser?.role === ROLES.SALES_AGENT) {
        canAccess = lead.assignedTo === currentUser.id || lead.createdBy === currentUser.id;
      }
      
      if (!canAccess) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const interactions = await storage.getInteractions(leadId);
      res.json(interactions);
    } catch (error) {
      console.error("Error fetching lead interactions:", error);
      res.status(500).json({ message: "Failed to fetch lead interactions" });
    }
  });

  app.post('/api/interactions', requireAuth, async (req: any, res) => {
    try {
      const interactionData = insertInteractionSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      
      // Verify user can access the lead
      if (interactionData.leadId) {
        const currentUser = await storage.getUser(req.user.id);
        const lead = await storage.getLead(interactionData.leadId);
        
        if (!lead) {
          return res.status(404).json({ message: "Lead not found" });
        }
        
        let canAccess = false;
        if (currentUser?.role === ROLES.SUPER_ADMIN) {
          canAccess = true;
        } else if (currentUser?.role === ROLES.SALES_MANAGER) {
          const teamMembers = await storage.getTeamMembers(currentUser.id);
          const teamMemberIds = [currentUser.id, ...teamMembers.map(m => m.id)];
          canAccess = !!(lead.assignedTo && teamMemberIds.includes(lead.assignedTo)) || 
                     !!(lead.createdBy && teamMemberIds.includes(lead.createdBy));
        } else if (currentUser?.role === ROLES.SALES_AGENT) {
          canAccess = lead.assignedTo === currentUser.id || lead.createdBy === currentUser.id;
        }
        
        if (!canAccess) {
          return res.status(403).json({ message: "Access denied to this lead" });
        }
      }
      
      const interaction = await storage.createInteraction(interactionData);
      res.json(interaction);
    } catch (error) {
      console.error("Error creating interaction:", error);
      res.status(500).json({ message: "Failed to create interaction" });
    }
  });

  // Calendar Event routes (upcoming/scheduled plans)
  app.get('/api/calendar-events', requireAuth, async (req: any, res) => {
    try {
      const events = await storage.getCalendarEvents(req.user.id);
      res.json(events);
    } catch (error) {
      console.error("Error fetching calendar events:", error);
      res.status(500).json({ message: "Failed to fetch calendar events" });
    }
  });

  app.post('/api/calendar-events', requireAuth, async (req: any, res) => {
    try {
      const eventData = insertCalendarEventSchema.parse({
        ...req.body,
        userId: req.user.id,
      });
      const event = await storage.createCalendarEvent(eventData);
      res.json(event);
    } catch (error) {
      console.error("Error creating calendar event:", error);
      res.status(500).json({ message: "Failed to create calendar event" });
    }
  });

  app.put('/api/calendar-events/:id', requireAuth, async (req: any, res) => {
    try {
      const eventData = insertCalendarEventSchema.partial().parse(req.body);
      const event = await storage.updateCalendarEvent(parseInt(req.params.id), eventData);
      res.json(event);
    } catch (error) {
      console.error("Error updating calendar event:", error);
      res.status(500).json({ message: "Failed to update calendar event" });
    }
  });

  app.delete('/api/calendar-events/:id', requireAuth, async (req: any, res) => {
    try {
      await storage.deleteCalendarEvent(parseInt(req.params.id));
      res.json({ message: "Calendar event deleted successfully" });
    } catch (error) {
      console.error("Error deleting calendar event:", error);
      res.status(500).json({ message: "Failed to delete calendar event" });
    }
  });

  // Target Management with RBAC
  app.get('/api/targets', requireAuth, requirePermission(PERMISSIONS.TARGET_VIEW), async (req: any, res) => {
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

  app.post('/api/targets', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const targetData = insertTargetSchema.parse({
        ...req.body,
        createdBy: req.user.id,
      });
      const target = await storage.createTarget(targetData);

      // Create notification for the assigned user if target is assigned to someone else
      if (target.userId && target.userId !== req.user.id) {
        await storage.createNotification({
          userId: target.userId,
          type: 'target_assigned',
          title: 'New Target Assigned',
          message: `You have been assigned a new ${target.period} target of ৳${target.targetValue}`,
        });
      }

      res.json(target);
    } catch (error) {
      console.error("Error creating target:", error);
      res.status(500).json({ message: "Failed to create target" });
    }
  });

  app.patch('/api/targets/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      const target = await storage.updateTarget(parseInt(req.params.id), req.body);
      res.json(target);
    } catch (error) {
      console.error("Error updating target:", error);
      res.status(500).json({ message: "Failed to update target" });
    }
  });

  app.delete('/api/targets/:id', requireAuth, async (req: any, res) => {
    try {
      const user = await storage.getUser(req.user.id);
      if (user?.role !== 'super_admin') {
        return res.status(403).json({ message: "Access denied" });
      }
      await storage.deleteTarget(parseInt(req.params.id));
      res.json({ message: "Target deleted successfully" });
    } catch (error) {
      console.error("Error deleting target:", error);
      res.status(500).json({ message: "Failed to delete target" });
    }
  });

  // Target progress endpoint
  app.get('/api/targets/progress/:userId', requireAuth, async (req: any, res) => {
    try {
      const userId = req.params.userId;
      const currentUser = await storage.getUser(req.user.id);
      
      // Check permissions
      if (currentUser?.role === ROLES.SALES_AGENT && userId !== currentUser.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (currentUser?.role === ROLES.SALES_MANAGER) {
        const canView = await canAccessUser(currentUser, userId);
        if (!canView && userId !== currentUser.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const targets = await storage.getTargets(userId);
      const leads = await storage.getLeadsByUser(userId);
      
      const progress = targets.map(target => {
        const closedWonLeads = leads.filter(lead => {
          if (lead.stage !== 'closed_won') return false;
          
          const leadDate = lead.updatedAt || lead.createdAt;
          const startDate = target.startDate;
          const endDate = target.endDate;
          
          if (!leadDate || !startDate || !endDate) return false;
          
          return new Date(leadDate).getTime() >= new Date(startDate).getTime() &&
                 new Date(leadDate).getTime() <= new Date(endDate).getTime();
        });
        
        const achieved = closedWonLeads.reduce((sum, lead) => sum + lead.value, 0);
        const percentage = (achieved / target.targetValue) * 100;
        
        return {
          ...target,
          achieved,
          percentage: Math.min(percentage, 100),
          remaining: Math.max(target.targetValue - achieved, 0)
        };
      });

      res.json(progress);
    } catch (error) {
      console.error("Error fetching target progress:", error);
      res.status(500).json({ message: "Failed to fetch target progress" });
    }
  });

  // Interaction/Activity routes
  // Put /all route BEFORE the :leadId route to avoid conflicts
  app.get('/api/interactions/all', requireAuth, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      
      // Get all interactions based on user role and lead access
      let interactions = await storage.getAllInteractions();
      
      if (currentUser?.role === ROLES.SALES_AGENT) {
        // Agent can see interactions for leads assigned to them
        const userLeads = await storage.getLeadsByUser(currentUser.id);
        const userLeadIds = userLeads.map(lead => lead.id);
        interactions = interactions.filter(i => 
          (i.userId && i.userId === currentUser.id) || (i.leadId && userLeadIds.includes(i.leadId))
        );
      } else if (currentUser?.role === ROLES.SALES_MANAGER) {
        // Manager can see team interactions
        const teamMembers = await storage.getTeamMembers(currentUser.id);
        const teamMemberIds = teamMembers.map(m => m.id);
        const teamLeads = await Promise.all(
          teamMemberIds.map(id => storage.getLeadsByUser(id))
        );
        const teamLeadIds = teamLeads.flat().map(lead => lead.id);
        const userLeads = await storage.getLeadsByUser(currentUser.id);
        const userLeadIds = userLeads.map(lead => lead.id);
        
        interactions = interactions.filter(i => 
          (i.userId && teamMemberIds.includes(i.userId)) || 
          (i.userId && i.userId === currentUser.id) ||
          (i.leadId && teamLeadIds.includes(i.leadId)) ||
          (i.leadId && userLeadIds.includes(i.leadId))
        );
      }
      // Super admin can see all interactions (no filtering)
      
      res.json(interactions);
    } catch (error) {
      console.error("Error fetching all interactions:", error);
      res.status(500).json({ message: "Failed to fetch interactions" });
    }
  });



  // Activity Reports for Managers and Admins
  app.get('/api/interactions/team-report', requireAuth, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      
      if (currentUser?.role === ROLES.SALES_AGENT) {
        return res.status(403).json({ message: "Access denied. Managers and admins only." });
      }

      let interactions = await storage.getAllInteractions();
      let users = await storage.getAllUsers();
      let leads = await storage.getLeads();

      // Filter based on user role
      if (currentUser?.role === ROLES.SALES_MANAGER) {
        const teamMembers = await storage.getTeamMembers(currentUser.id);
        const teamMemberIds = [currentUser.id, ...teamMembers.map(m => m.id)];
        
        interactions = interactions.filter(i => i.userId && teamMemberIds.includes(i.userId));
        users = users.filter(u => teamMemberIds.includes(u.id));
        
        const teamLeads = leads.filter(lead => 
          (lead.assignedTo && teamMemberIds.includes(lead.assignedTo)) || 
          (lead.createdBy && teamMemberIds.includes(lead.createdBy))
        );
        leads = teamLeads;
      }

      // Create activity report
      const report = users.map(user => {
        const userInteractions = interactions.filter(i => i.userId === user.id);
        const userLeads = leads.filter(lead => lead.assignedTo === user.id);
        
        return {
          user: {
            id: user.id,
            name: user.employeeName,
            email: user.email,
            role: user.role
          },
          stats: {
            totalActivities: userInteractions.length,
            activitiesByType: {
              call: userInteractions.filter(i => i.type === 'call').length,
              email: userInteractions.filter(i => i.type === 'email').length,
              meeting: userInteractions.filter(i => i.type === 'meeting').length,
              note: userInteractions.filter(i => i.type === 'note').length,
            },
            recentActivities: userInteractions
              .filter(i => i.createdAt)
              .sort((a, b) => new Date(b.createdAt!).getTime() - new Date(a.createdAt!).getTime())
              .slice(0, 5)
              .map(activity => ({
                ...activity,
                leadName: leads.find(l => l.id === activity.leadId)?.contactName || 'Unknown Lead'
              })),
            assignedLeads: userLeads.length,
            activeLeads: userLeads.filter(l => !['closed_won', 'closed_lost'].includes(l.stage)).length
          }
        };
      });

      res.json(report);
    } catch (error) {
      console.error("Error fetching team activity report:", error);
      res.status(500).json({ message: "Failed to fetch team activity report" });
    }
  });

  // Get user-specific interactions with proper role-based access
  app.get('/api/interactions/user/:userId', requireAuth, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      const userId = req.params.userId;
      
      // Check permissions
      if (currentUser?.role === ROLES.SALES_AGENT && userId !== currentUser.id) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      if (currentUser?.role === ROLES.SALES_MANAGER) {
        const canView = await canAccessUser(currentUser, userId);
        if (!canView) {
          return res.status(403).json({ message: "Access denied" });
        }
      }

      const interactions = await storage.getAllInteractions();
      const userInteractions = interactions.filter(i => i.userId === userId);
      res.json(userInteractions);
    } catch (error) {
      console.error("Error fetching user interactions:", error);
      res.status(500).json({ message: "Failed to fetch user interactions" });
    }
  });

  // Update interaction
  app.patch('/api/interactions/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const interaction = await storage.updateInteraction(id, req.body);
      res.json(interaction);
    } catch (error) {
      console.error("Error updating interaction:", error);
      res.status(500).json({ message: "Failed to update interaction" });
    }
  });

  // Customer routes
  app.get('/api/customers', requireAuth, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      let customers = await storage.getCustomers();
      
      // Apply role-based filtering
      if (currentUser?.role === ROLES.SALES_AGENT) {
        customers = customers.filter(customer => customer.assignedTo === currentUser.id);
      } else if (currentUser?.role === ROLES.SALES_MANAGER) {
        const teamMembers = await storage.getTeamMembers(currentUser.id);
        const teamMemberIds = teamMembers.map(m => m.id);
        customers = customers.filter(customer => 
          teamMemberIds.includes(customer.assignedTo || '') || customer.assignedTo === currentUser.id
        );
      }
      
      res.json(customers);
    } catch (error) {
      console.error("Error fetching customers:", error);
      res.status(500).json({ message: "Failed to fetch customers" });
    }
  });

  app.post('/api/customers', requireAuth, async (req: any, res) => {
    try {
      const customerData = insertCustomerSchema.parse({
        ...req.body,
        convertedBy: req.user.id,
        assignedTo: req.user.id,
      });
      
      const customer = await storage.createCustomer(customerData);
      res.status(201).json(customer);
    } catch (error) {
      console.error("Error creating customer:", error);
      res.status(500).json({ message: "Failed to create customer" });
    }
  });

  // Bulk customer upload route
  app.post('/api/customers/bulk-upload', requireAuth, upload.single('customers'), async (req: any, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ message: "No file uploaded" });
      }

      const customers: any[] = [];
      
      // Parse CSV file using promise
      await new Promise((resolve, reject) => {
        fs.createReadStream(req.file.path)
          .pipe(csv())
          .on('data', (data) => customers.push(data))
          .on('end', resolve)
          .on('error', reject);
      });
      
      let processed = 0;
      let failed = 0;
      const errors: string[] = [];

      for (let i = 0; i < customers.length; i++) {
        try {
          const row = customers[i];
          
          // Enhanced customer data parsing with all fields
          const customerData = insertCustomerSchema.parse({
            contactName: row.contactName?.trim(),
            email: row.email?.trim(),
            phone: row.phone?.trim() || null,
            company: row.company?.trim(),
            totalValue: row.totalValue ? parseInt(row.totalValue.toString()) : 0,
            assignedTo: req.user.id,
            convertedBy: req.user.id,
            // Enhanced fields
            leadSource: row.leadSource?.trim() || "Others",
            packageSize: row.packageSize?.trim() || null,
            website: row.website?.trim() || null,
            facebookPageUrl: row.facebookPageUrl?.trim() || null,
            orderVolume: parseInt(row.orderVolume || '0') || 0,
            notes: row.notes?.trim() || null,
          });

          await storage.createCustomer(customerData);
          processed++;
        } catch (error: any) {
          failed++;
          errors.push(`Row ${i + 2}: ${error.message}`);
        }
      }

      res.json({ processed, failed, errors });
    } catch (error) {
      console.error("Error in bulk customer upload:", error);
      res.status(500).json({ message: "Failed to process bulk upload" });
    }
  });

  app.post('/api/customers/convert/:leadId', requireAuth, async (req: any, res) => {
    try {
      const leadId = parseInt(req.params.leadId);
      const lead = await storage.getLead(leadId);
      
      if (!lead) {
        return res.status(404).json({ message: "Lead not found" });
      }
      
      // Check if user can convert this lead
      const currentUser = await storage.getUser(req.user.id);
      let canConvert = false;
      
      if (currentUser?.role === ROLES.SUPER_ADMIN) {
        canConvert = true;
      } else if (currentUser?.role === ROLES.SALES_MANAGER) {
        const teamMembers = await storage.getTeamMembers(currentUser.id);
        const teamMemberIds = teamMembers.map(m => m.id);
        canConvert = teamMemberIds.includes(lead.assignedTo || '') || lead.assignedTo === currentUser.id;
      } else if (currentUser?.role === ROLES.SALES_AGENT) {
        canConvert = lead.assignedTo === currentUser.id;
      }
      
      if (!canConvert) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const customer = await storage.convertLeadToCustomer(leadId, req.user.id);
      res.json(customer);
    } catch (error) {
      console.error("Error converting lead to customer:", error);
      res.status(500).json({ message: (error as Error).message || "Failed to convert lead" });
    }
  });

  // Daily Revenue routes
  app.get('/api/daily-revenue', requireAuth, async (req: any, res) => {
    try {
      const { startDate, endDate, userId } = req.query;
      const currentUser = await storage.getUser(req.user.id);
      
      let targetUserId = userId as string;
      
      // Apply role-based filtering
      if (currentUser?.role === ROLES.SALES_AGENT) {
        targetUserId = currentUser.id; // Agents can only see their own revenue
      } else if (currentUser?.role === ROLES.SALES_MANAGER && userId) {
        // Managers can see team member revenue
        const canView = await canAccessUser(currentUser, userId as string);
        if (!canView && userId !== currentUser.id) {
          return res.status(403).json({ message: "Access denied" });
        }
      }
      
      const revenue = await storage.getDailyRevenue(
        targetUserId,
        startDate ? new Date(startDate as string) : undefined,
        endDate ? new Date(endDate as string) : undefined
      );
      
      res.json(revenue);
    } catch (error) {
      console.error("Error fetching daily revenue:", error);
      res.status(500).json({ message: "Failed to fetch daily revenue" });
    }
  });

  app.post('/api/daily-revenue', requireAuth, async (req: any, res) => {
    try {
      const revenueData = {
        date: new Date(req.body.date),
        revenue: Number(req.body.revenue),
        description: req.body.description,
        userId: req.user.id,
        createdBy: req.user.id,
        orders: Number(req.body.orders) || 1,
        customerId: req.body.customerId ? Number(req.body.customerId) : null,
      };
      
      const revenue = await storage.createDailyRevenue(revenueData);
      res.json(revenue);
    } catch (error: any) {
      console.error("Error creating daily revenue:", error);
      res.status(500).json({ message: "Failed to create daily revenue entry" });
    }
  });

  app.put('/api/daily-revenue/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = await storage.getUser(req.user.id);
      
      // Check if user can edit this revenue entry
      const existingRevenue = await storage.getDailyRevenue();
      const targetRevenue = existingRevenue.find(r => r.id === id);
      
      if (!targetRevenue) {
        return res.status(404).json({ message: "Revenue entry not found" });
      }
      
      let canEdit = false;
      if (currentUser?.role === ROLES.SUPER_ADMIN) {
        canEdit = true;
      } else if (currentUser?.role === ROLES.SALES_MANAGER) {
        const canAccess = targetRevenue.userId ? await canAccessUser(currentUser, targetRevenue.userId) : false;
        canEdit = canAccess || targetRevenue.userId === currentUser.id;
      } else if (currentUser?.role === ROLES.SALES_AGENT) {
        canEdit = targetRevenue.userId === currentUser.id;
      }
      
      if (!canEdit) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      const revenue = await storage.updateDailyRevenue(id, req.body);
      res.json(revenue);
    } catch (error) {
      console.error("Error updating daily revenue:", error);
      res.status(500).json({ message: "Failed to update daily revenue entry" });
    }
  });

  app.delete('/api/daily-revenue/:id', requireAuth, async (req: any, res) => {
    try {
      const id = parseInt(req.params.id);
      const currentUser = await storage.getUser(req.user.id);
      
      // Check if user can delete this revenue entry
      const existingRevenue = await storage.getDailyRevenue();
      const targetRevenue = existingRevenue.find(r => r.id === id);
      
      if (!targetRevenue) {
        return res.status(404).json({ message: "Revenue entry not found" });
      }
      
      let canDelete = false;
      if (currentUser?.role === ROLES.SUPER_ADMIN) {
        canDelete = true;
      } else if (currentUser?.role === ROLES.SALES_MANAGER) {
        const canAccess = targetRevenue.userId ? await canAccessUser(currentUser, targetRevenue.userId) : false;
        canDelete = canAccess || targetRevenue.userId === currentUser.id;
      } else if (currentUser?.role === ROLES.SALES_AGENT) {
        canDelete = targetRevenue.userId === currentUser.id;
      }
      
      if (!canDelete) {
        return res.status(403).json({ message: "Access denied" });
      }
      
      await storage.deleteDailyRevenue(id);
      res.json({ message: "Daily revenue entry deleted successfully" });
    } catch (error) {
      console.error("Error deleting daily revenue:", error);
      res.status(500).json({ message: "Failed to delete daily revenue entry" });
    }
  });

  // Notification routes - fixed for agent-specific filtering
  app.get('/api/notifications', requireAuth, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      if (!currentUser) {
        return res.status(401).json({ message: "User not found" });
      }
      
      const notifications = await storage.getNotifications(currentUser.id);
      res.json(notifications);
    } catch (error) {
      console.error("Error fetching notifications:", error);
      res.status(500).json({ message: "Failed to fetch notifications" });
    }
  });

  app.patch('/api/notifications/:id/read', requireAuth, async (req: any, res) => {
    try {
      await storage.markNotificationRead(parseInt(req.params.id));
      res.json({ message: "Notification marked as read" });
    } catch (error) {
      console.error("Error marking notification as read:", error);
      res.status(500).json({ message: "Failed to mark notification as read" });
    }
  });

  app.get('/api/notifications/unread-count', requireAuth, async (req: any, res) => {
    try {
      const count = await storage.getUnreadNotificationCount(req.user.id);
      res.json({ count });
    } catch (error) {
      console.error("Error fetching unread notification count:", error);
      res.status(500).json({ message: "Failed to fetch unread notification count" });
    }
  });

  // Analytics with RBAC - simplified and working
  app.get('/api/analytics/metrics', requireAuth, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      const userId = req.query.userId as string;
      let targetUserId = userId;

      // Role-based access control
      if (currentUser?.role === ROLES.SALES_AGENT) {
        targetUserId = currentUser.id;
      } else if (currentUser?.role === ROLES.SALES_MANAGER) {
        if (userId) {
          const canView = await canAccessUser(currentUser, userId);
          if (!canView) {
            return res.status(403).json({ message: "Access denied" });
          }
          targetUserId = userId;
        } else {
          targetUserId = currentUser.id;
        }
      }

      const metrics = await storage.getSalesMetrics(targetUserId);
      res.json(metrics);
    } catch (error) {
      console.error("Error fetching metrics:", error);
      res.status(500).json({ message: "Failed to fetch metrics" });
    }
  });

  app.get('/api/analytics/team-performance', requireAuth, async (req: any, res) => {
    try {
      const currentUser = await storage.getUser(req.user.id);
      let performance = await storage.getTeamPerformance();
      
      // Apply role-based filtering
      if (currentUser?.role === ROLES.SALES_AGENT) {
        performance = performance.filter(p => p.user.id === currentUser.id);
      } else if (currentUser?.role === ROLES.SALES_MANAGER) {
        const teamMembers = await storage.getTeamMembers(currentUser.id);
        const teamMemberIds = teamMembers.map(m => m.id);
        const accessibleUserIds = [...teamMemberIds, currentUser.id];
        performance = performance.filter(p => accessibleUserIds.includes(p.user.id));
      }
      
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
