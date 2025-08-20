import {
  users,
  leads,
  interactions,
  targets,
  customers,
  dailyRevenue,
  notifications,
  type User,
  type UpsertUser,
  type Lead,
  type InsertLead,
  type Interaction,
  type InsertInteraction,
  type Target,
  type InsertTarget,
  type Customer,
  type InsertCustomer,
  type DailyRevenue,
  type InsertDailyRevenue,
  type Notification,
  type InsertNotification,
  calendarEvents,
  CalendarEvent,
  InsertCalendarEvent,
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sum, count, inArray, sql } from "drizzle-orm";
import * as crypto from "crypto";
import bcrypt from 'bcrypt';

export interface IStorage {
  // User operations
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: { id?: string; email: string; password: string; employeeName: string; employeeCode?: string; role?: string; managerId?: string | null; teamName?: string | null; emailVerified?: boolean; verificationCode?: string | null; codeExpiresAt?: Date | null }): Promise<User>;
  setVerificationCode(email: string, code: string): Promise<void>;
  verifyCode(email: string, code: string): Promise<User | null>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string, managerId?: string): Promise<User>;
  getTeamMembers(managerId: string): Promise<User[]>;
  isTeamMember(managerId: string, userId: string): Promise<boolean>;
  deactivateUser(id: string): Promise<User>;
  activateUser(id: string): Promise<User>;
  getUsersForAssignment(currentUserId: string, currentUserRole: string): Promise<User[]>;
  assignUserToManager(userId: string, managerId: string): Promise<User>;
  updateUserTeam(userId: string, teamName: string): Promise<User>;

  // Lead operations
  getLeads(): Promise<Lead[]>;
  getLead(id: number): Promise<Lead | undefined>;
  createLead(lead: InsertLead): Promise<Lead>;
  updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead>;
  deleteLead(id: number): Promise<void>;
  getLeadsByStage(stage: string): Promise<Lead[]>;
  getLeadsByUser(userId: string): Promise<Lead[]>;
  getLeadsByCreator(userId: string): Promise<Lead[]>;

  // Interaction operations
  getInteractions(leadId?: number): Promise<Interaction[]>;
  getAllInteractions(): Promise<Interaction[]>;
  getUserInteractions(userId: string): Promise<Interaction[]>;
  getInteractionsByUser(userId: string): Promise<Interaction[]>;
  getInteractionsByUsers(userIds: string[]): Promise<Interaction[]>;
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  updateInteraction(id: number, interaction: Partial<InsertInteraction>): Promise<Interaction>;

  // Calendar Event operations
  getCalendarEvents(userId?: string): Promise<CalendarEvent[]>;
  getAllCalendarEvents(): Promise<CalendarEvent[]>;
  getCalendarEvent(id: number): Promise<CalendarEvent | undefined>;
  createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent>;
  updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent>;
  deleteCalendarEvent(id: number): Promise<void>;

  // Target operations
  getTargets(userId?: string): Promise<Target[]>;
  createTarget(target: InsertTarget): Promise<Target>;
  updateTarget(id: number, target: Partial<InsertTarget>): Promise<Target>;
  deleteTarget(id: number): Promise<void>;
  getCurrentTarget(userId: string, period: string): Promise<Target | undefined>;

  // Customer operations
  getCustomers(): Promise<Customer[]>;
  getCustomer(id: number): Promise<Customer | undefined>;
  createCustomer(customer: InsertCustomer): Promise<Customer>;
  updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer>;
  deleteCustomer(id: number): Promise<void>;
  convertLeadToCustomer(leadId: number, userId: string): Promise<Customer>;
  getCustomersByUser(userId: string): Promise<Customer[]>;

  // Daily Revenue operations
  getDailyRevenue(userId?: string, startDate?: Date, endDate?: Date): Promise<DailyRevenue[]>;
  createDailyRevenue(revenue: InsertDailyRevenue): Promise<DailyRevenue>;
  updateDailyRevenue(id: number, revenue: Partial<InsertDailyRevenue>): Promise<DailyRevenue>;
  deleteDailyRevenue(id: number): Promise<void>;
  getTotalRevenueForPeriod(userId?: string, startDate?: Date, endDate?: Date): Promise<number>;

  // Notification operations
  getNotifications(userId: string): Promise<Notification[]>;
  createNotification(data: InsertNotification): Promise<Notification>;
  markNotificationRead(notificationId: number): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;

  // Analytics operations
  getSalesMetrics(userId?: string): Promise<any>;
  getTeamPerformance(): Promise<Array<{
    user: User;
    dealsCount: number;
    revenue: number;
    targetProgress: number;
  }>>;
}

export class DatabaseStorage implements IStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: { id?: string; email: string; password: string; employeeName: string; employeeCode?: string; role?: string; managerId?: string | null; teamName?: string | null; emailVerified?: boolean; verificationCode?: string | null; codeExpiresAt?: Date | null }): Promise<User> {
    const userId = userData.id || crypto.randomUUID();
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        email: userData.email,
        password: userData.password,
        employeeName: userData.employeeName,
        employeeCode: userData.employeeCode || `EMP${Date.now()}`,
        role: userData.role || 'sales_agent',
        managerId: userData.managerId ?? null,
        teamName: userData.teamName ?? null,
        emailVerified: userData.emailVerified ?? false,
        verificationCode: userData.verificationCode ?? null,
        codeExpiresAt: userData.codeExpiresAt ?? null,
      })
      .returning();
    return user;
  }

  async setVerificationCode(email: string, code: string): Promise<void> {
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes
    await db
      .update(users)
      .set({
        verificationCode: code,
        codeExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));
  }

  async verifyCode(email: string, code: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(
        and(
          eq(users.email, email),
          eq(users.verificationCode, code),
          gte(users.codeExpiresAt, new Date())
        )
      );

    if (user) {
      // Mark as verified and clear code
      const [verifiedUser] = await db
        .update(users)
        .set({
          emailVerified: true,
          verificationCode: null,
          codeExpiresAt: null,
          updatedAt: new Date(),
        })
        .where(eq(users.id, user.id))
        .returning();

      return verifiedUser;
    }

    return null;
  }

  // Password reset methods
  async generatePasswordResetCode(email: string): Promise<string | null> {
    const user = await this.getUserByEmail(email);
    if (!user) {
      return null;
    }

    // Generate 6-digit reset code
    const resetCode = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes from now

    await db
      .update(users)
      .set({
        passwordResetCode: resetCode,
        passwordResetExpiresAt: expiresAt,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email));

    return resetCode;
  }

  async verifyPasswordResetCode(email: string, code: string): Promise<boolean> {
    const user = await this.getUserByEmail(email);
    if (!user || !user.passwordResetCode || !user.passwordResetExpiresAt) {
      return false;
    }

    return user.passwordResetCode === code && new Date() < user.passwordResetExpiresAt;
  }

  async resetPassword(email: string, code: string, newPassword: string): Promise<boolean> {
    // Verify the reset code first
    const isValidCode = await this.verifyPasswordResetCode(email, code);
    if (!isValidCode) {
      return false;
    }

    // Hash the new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset data
    const result = await db
      .update(users)
      .set({
        password: hashedPassword,
        passwordResetCode: null,
        passwordResetExpiresAt: null,
        updatedAt: new Date(),
      })
      .where(eq(users.email, email))
      .returning();

    return result.length > 0;
  }

  // Admin password reset (no verification required)
  async adminResetPassword(userId: string, newPassword: string): Promise<boolean> {
    try {
      const hashedPassword = await bcrypt.hash(newPassword, 10);

      const result = await db
        .update(users)
        .set({
          password: hashedPassword,
          updatedAt: new Date(),
        })
        .where(eq(users.id, userId))
        .returning();

      return result.length > 0;
    } catch (error) {
      console.error("Admin password reset error:", error);
      return false;
    }
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserRole(id: string, role: string, managerId?: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        role, 
        managerId: managerId ?? null,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserStatus(id: string, isActive: boolean): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        isActive,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async updateUserDetails(id: string, details: {
    employeeName?: string;
    employeeCode?: string;
    email?: string;
    role?: string;
    managerId?: string | null;
    teamName?: string;
  }): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ 
        ...details,
        updatedAt: new Date() 
      })
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async getTeamMembers(managerId: string): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.managerId, managerId));
  }

  async isTeamMember(managerId: string, userId: string): Promise<boolean> {
    const [user] = await db
      .select()
      .from(users)
      .where(and(eq(users.id, userId), eq(users.managerId, managerId)));
    return !!user;
  }

  async deactivateUser(id: string): Promise<User> {
    return await this.updateUserStatus(id, false);
  }

  async activateUser(id: string): Promise<User> {
    return await this.updateUserStatus(id, true);
  }

  async getUsersForAssignment(currentUserId: string, currentUserRole: string): Promise<User[]> {
    if (currentUserRole === 'super_admin') {
      return await db.select().from(users).where(eq(users.isActive, true));
    } else if (currentUserRole === 'sales_manager') {
      return await db.select().from(users).where(
        and(eq(users.managerId, currentUserId), eq(users.isActive, true))
      );
    } else {
      // Sales agents can only see themselves (if active)
      return await db.select().from(users).where(
        and(eq(users.id, currentUserId), eq(users.isActive, true))
      );
    }
  }

  async assignUserToManager(userId: string, managerId: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ managerId, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  async updateUserTeam(userId: string, teamName: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ teamName, updatedAt: new Date() })
      .where(eq(users.id, userId))
      .returning();
    return user;
  }

  // Lead operations
  async getLeads(): Promise<Lead[]> {
    return await db.select().from(leads).orderBy(desc(leads.createdAt));
  }

  async getLead(id: number): Promise<Lead | undefined> {
    const [lead] = await db.select().from(leads).where(eq(leads.id, id));
    return lead;
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    // Check for phone number uniqueness if phone is provided
    if (lead.phone) {
      const existingLead = await db.select().from(leads).where(eq(leads.phone, lead.phone)).limit(1);
      if (existingLead.length > 0) {
        throw new Error(`A lead with phone number ${lead.phone} already exists`);
      }
    }

    const leadData: any = { ...lead };
    const [newLead] = await db.insert(leads).values(leadData).returning();
    return newLead;
  }

  async updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead> {
    // Handle preferredPickTime conversion for update
    const updateData: any = { ...lead, updatedAt: new Date() };
    if (updateData.preferredPickTime instanceof Date) {
      updateData.preferredPickTime = updateData.preferredPickTime.toISOString();
    }

    const [updatedLead] = await db
      .update(leads)
      .set(updateData)
      .where(eq(leads.id, id))
      .returning();
    return updatedLead;
  }

  async deleteLead(id: number): Promise<void> {
    // Delete related records first to avoid foreign key constraints
    await db.delete(interactions).where(eq(interactions.leadId, id));
    await db.delete(calendarEvents).where(eq(calendarEvents.leadId, id));

    // Check if this lead was converted to a customer
    const relatedCustomer = await db.select().from(customers).where(eq(customers.leadId, id)).limit(1);

    if (relatedCustomer.length > 0) {
      // Update customer to remove lead reference instead of preventing deletion
      await db.update(customers).set({ leadId: null }).where(eq(customers.leadId, id));
    }

    // Now delete the lead
    await db.delete(leads).where(eq(leads.id, id));
  }

  async getLeadsByStage(stage: string): Promise<Lead[]> {
    return db.select().from(leads).where(eq(leads.stage, stage));
  }

  async getLeadsByUser(userId: string): Promise<Lead[]> {
    const result = await db.select().from(leads).where(eq(leads.assignedTo, userId));
    return result;
  }

  async getLeadsByCreator(userId: string): Promise<Lead[]> {
    const result = await db.select().from(leads).where(eq(leads.createdBy, userId));
    return result;
  }

  // Interaction operations
  async getInteractions(leadId?: number): Promise<Interaction[]> {
    if (leadId) {
      return await db
        .select()
        .from(interactions)
        .where(eq(interactions.leadId, leadId))
        .orderBy(desc(interactions.createdAt));
    }
    return await db.select().from(interactions).orderBy(desc(interactions.createdAt));
  }

  async getInteractionsByUser(userId: string): Promise<Interaction[]> {
    return await db.select().from(interactions)
      .where(eq(interactions.userId, userId))
      .orderBy(desc(interactions.createdAt));
  }

  async getInteractionsByUsers(userIds: string[]): Promise<Interaction[]> {
    if (userIds.length === 0) return [];
    return await db.select().from(interactions)
      .where(inArray(interactions.userId, userIds))
      .orderBy(desc(interactions.createdAt));
  }

  async getAllInteractions(): Promise<Interaction[]> {
    return await db
      .select()
      .from(interactions)
      .orderBy(desc(interactions.createdAt));
  }

  // Calendar Event operations (upcoming/scheduled plans)
  async createCalendarEvent(event: InsertCalendarEvent): Promise<CalendarEvent> {
    const eventData: any = { 
      ...event,
      startDate: event.startDate instanceof Date ? event.startDate : new Date(event.startDate),
      endDate: event.endDate instanceof Date ? event.endDate : new Date(event.endDate),
      updatedAt: new Date() 
    };

    const [newEvent] = await db.insert(calendarEvents).values(eventData).returning();
    return newEvent;
  }

  async getCalendarEvents(userId?: string): Promise<any[]> {
    const query = db
      .select({
        id: calendarEvents.id,
        title: calendarEvents.title,
        description: calendarEvents.description,
        startDate: calendarEvents.startDate,
        endDate: calendarEvents.endDate,
        type: calendarEvents.type,
        leadId: calendarEvents.leadId,
        userId: calendarEvents.userId,
        location: calendarEvents.location,
        isAllDay: calendarEvents.isAllDay,
        reminderMinutes: calendarEvents.reminderMinutes,
        status: calendarEvents.status,
        createdAt: calendarEvents.createdAt,
        updatedAt: calendarEvents.updatedAt,
        userName: users.employeeName,
        userEmail: users.email,
        leadContactName: leads.contactName,
      })
      .from(calendarEvents)
      .leftJoin(users, eq(calendarEvents.userId, users.id))
      .leftJoin(leads, eq(calendarEvents.leadId, leads.id))
      .orderBy(calendarEvents.startDate);

    if (userId) {
      return await query.where(eq(calendarEvents.userId, userId));
    }
    return await query;
  }

  async getAllCalendarEvents(): Promise<any[]> {
    return await db
      .select({
        id: calendarEvents.id,
        title: calendarEvents.title,
        description: calendarEvents.description,
        startDate: calendarEvents.startDate,
        endDate: calendarEvents.endDate,
        type: calendarEvents.type,
        leadId: calendarEvents.leadId,
        userId: calendarEvents.userId,
        location: calendarEvents.location,
        isAllDay: calendarEvents.isAllDay,
        reminderMinutes: calendarEvents.reminderMinutes,
        status: calendarEvents.status,
        createdAt: calendarEvents.createdAt,
        updatedAt: calendarEvents.updatedAt,
        userName: users.employeeName,
        userEmail: users.email,
        leadContactName: leads.contactName,
      })
      .from(calendarEvents)
      .leftJoin(users, eq(calendarEvents.userId, users.id))
      .leftJoin(leads, eq(calendarEvents.leadId, leads.id))
      .orderBy(calendarEvents.startDate);
  }

  async getCalendarEvent(id: number): Promise<CalendarEvent | undefined> {
    const [event] = await db.select().from(calendarEvents).where(eq(calendarEvents.id, id));
    return event;
  }

  async updateCalendarEvent(id: number, event: Partial<InsertCalendarEvent>): Promise<CalendarEvent> {
    const updateData: any = { ...event, updatedAt: new Date() };
    if (updateData.startDate instanceof Date) {
      updateData.startDate = updateData.startDate;
    }
    if (updateData.endDate instanceof Date) {
      updateData.endDate = updateData.endDate;
    }

    const [updatedEvent] = await db
      .update(calendarEvents)
      .set(updateData)
      .where(eq(calendarEvents.id, id))
      .returning();
    return updatedEvent;
  }

  async deleteCalendarEvent(id: number): Promise<void> {
    await db.delete(calendarEvents).where(eq(calendarEvents.id, id));
  }

  async createInteraction(interaction: InsertInteraction): Promise<Interaction> {
    const [newInteraction] = await db.insert(interactions).values(interaction).returning();
    return newInteraction;
  }

  async updateInteraction(id: number, interaction: Partial<InsertInteraction>): Promise<Interaction> {
    const [updatedInteraction] = await db
      .update(interactions)
      .set(interaction)
      .where(eq(interactions.id, id))
      .returning();
    return updatedInteraction;
  }

  async getUserInteractions(userId: string): Promise<Interaction[]> {
    return await db
      .select()
      .from(interactions)
      .where(eq(interactions.userId, userId))
      .orderBy(desc(interactions.createdAt));
  }

  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    // Check for merchant code uniqueness
    const existingCustomer = await db.select().from(customers).where(eq(customers.merchantCode, customer.merchantCode)).limit(1);
    if (existingCustomer.length > 0) {
      throw new Error(`A customer with merchant code ${customer.merchantCode} already exists`);
    }

    const [newCustomer] = await db.insert(customers).values(customer).returning();
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer> {
    const [updatedCustomer] = await db
      .update(customers)
      .set({ ...customer, updatedAt: new Date() })
      .where(eq(customers.id, id))
      .returning();
    return updatedCustomer;
  }

  async deleteCustomer(id: number): Promise<void> {
    await db.delete(customers).where(eq(customers.id, id));
  }

  async convertLeadToCustomer(leadId: number, userId: string): Promise<Customer> {
    const lead = await this.getLead(leadId);
    if (!lead) {
      throw new Error("Lead not found");
    }

    if (lead.stage !== "closed_won") {
      throw new Error("Only won leads can be converted to customers");
    }

    // Create customer from lead data using new customer structure
    const customerData: InsertCustomer = {
      leadId: lead.id,
      merchantCode: `MC${lead.id.toString().padStart(4, '0')}`, // Auto-generate merchant code
      merchantName: lead.company,
      rateChart: "ISD", // Default rate chart
      contactPerson: lead.contactName,
      phoneNumber: lead.phone || "",
      assignedAgent: lead.assignedTo || userId,
      productType: lead.packageSize || "Service",
      notes: lead.notes,
      createdBy: userId,
    };

    const customer = await this.createCustomer(customerData);

    // Create congratulations notification for successful conversion
    await this.createNotification({
      userId: lead.assignedTo || userId,
      type: "lead_converted",
      title: "🎉 Congratulations! Lead Converted",
      message: `Congratulations! Your lead "${lead.contactName}" has been successfully converted to customer ${customer.merchantName}. Great work on closing this deal!`,
    });

    return customer;
  }

  async getCustomersByUser(userId: string): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.assignedAgent, userId));
  }

  // Daily Revenue operations
  async getDailyRevenue(userId?: string, startDate?: Date, endDate?: Date): Promise<DailyRevenue[]> {
    const conditions = [];
    if (userId) {
      conditions.push(eq(dailyRevenue.assignedUser, userId));
    }
    if (startDate) {
      conditions.push(gte(dailyRevenue.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(dailyRevenue.date, endDate));
    }

    if (conditions.length > 0) {
      return await db.select().from(dailyRevenue).where(and(...conditions)).orderBy(desc(dailyRevenue.date));
    }

    return await db.select().from(dailyRevenue).orderBy(desc(dailyRevenue.date));
  }

  async createDailyRevenue(revenue: InsertDailyRevenue): Promise<DailyRevenue> {
    const [newRevenue] = await db.insert(dailyRevenue).values(revenue).returning();
    return newRevenue;
  }

  async updateDailyRevenue(id: number, revenue: Partial<InsertDailyRevenue>): Promise<DailyRevenue> {
    const [updatedRevenue] = await db
      .update(dailyRevenue)
      .set({ ...revenue, updatedAt: new Date() })
      .where(eq(dailyRevenue.id, id))
      .returning();
    return updatedRevenue;
  }

  async deleteDailyRevenue(id: number): Promise<void> {
    await db.delete(dailyRevenue).where(eq(dailyRevenue.id, id));
  }

  async getTotalRevenueForPeriod(userId?: string, startDate?: Date, endDate?: Date): Promise<number> {
    const conditions = [];
    if (userId) {
      conditions.push(eq(dailyRevenue.assignedUser, userId));
    }
    if (startDate) {
      conditions.push(gte(dailyRevenue.date, startDate));
    }
    if (endDate) {
      conditions.push(lte(dailyRevenue.date, endDate));
    }

    let result;
    if (conditions.length > 0) {
      result = await db.select({ total: sum(dailyRevenue.revenue) }).from(dailyRevenue).where(and(...conditions));
    } else {
      result = await db.select({ total: sum(dailyRevenue.revenue) }).from(dailyRevenue);
    }

    return Number(result[0]?.total || 0);
  }

  // Target operations
  async getTargets(userId?: string): Promise<Target[]> {
    const query = db.select().from(targets).orderBy(desc(targets.createdAt));
    if (userId) {
      return await query.where(eq(targets.userId, userId));
    }
    return await query;
  }

  async createTarget(target: InsertTarget): Promise<Target> {
    const [newTarget] = await db.insert(targets).values(target).returning();
    return newTarget;
  }

  async updateTarget(id: number, target: Partial<InsertTarget>): Promise<Target> {
    const [updatedTarget] = await db
      .update(targets)
      .set({ ...target, updatedAt: new Date() })
      .where(eq(targets.id, id))
      .returning();
    return updatedTarget;
  }

  async deleteTarget(id: number): Promise<void> {
    await db.delete(targets).where(eq(targets.id, id));
  }

  async getCurrentTarget(userId: string, period: string): Promise<Target | undefined> {
    const now = new Date();
    const [target] = await db
      .select()
      .from(targets)
      .where(
        and(
          eq(targets.userId, userId),
          eq(targets.period, period)
        )
      )
      .orderBy(desc(targets.createdAt));
    return target;
  }

  // Notification operations
  async getNotifications(userId: string): Promise<Notification[]> {
    return await db
      .select()
      .from(notifications)
      .where(eq(notifications.userId, userId))
      .orderBy(desc(notifications.createdAt));
  }

  async createNotification(data: InsertNotification): Promise<Notification> {
    const [notification] = await db.insert(notifications).values({
      ...data,
      createdAt: new Date()
    }).returning();
    return notification;
  }

  async markNotificationRead(notificationId: number): Promise<void> {
    await db.update(notifications)
      .set({ read: true })
      .where(eq(notifications.id, notificationId));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const result = await db.select({ count: sql<number>`count(*)` })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));

    return result[0]?.count || 0;
  }

  // Analytics operations
  async getSalesMetrics(userId?: string): Promise<any> {
    try {
      let userLeads: Lead[] = [];
      let userRevenue: any[] = [];

      if (userId) {
        // Get leads assigned to user OR created by user
        const assignedLeads = await db.select().from(leads).where(eq(leads.assignedTo, userId));
        const createdLeads = await db.select().from(leads).where(eq(leads.createdBy, userId));

        // Merge and deduplicate
        const allLeads = [...assignedLeads, ...createdLeads];
        userLeads = allLeads.reduce((acc, lead) => {
          if (!acc.find(l => l.id === lead.id)) {
            acc.push(lead);
          }
          return acc;
        }, [] as Lead[]);

        userRevenue = await db.select().from(dailyRevenue).where(eq(dailyRevenue.assignedUser, userId));
      } else {
        userLeads = await db.select().from(leads);
        userRevenue = await db.select().from(dailyRevenue);
      }

      const totalRevenue = userRevenue.reduce((sum, r) => sum + (r.revenue || 0), 0);
      const activeLeads = userLeads.filter(lead => !['closed_won', 'closed_lost'].includes(lead.stage)).length;
      const closedWonLeads = userLeads.filter(lead => lead.stage === 'closed_won').length;
      const conversionRate = userLeads.length > 0 ? (closedWonLeads / userLeads.length) * 100 : 0;

      return {
        totalRevenue,
        activeLeads,
        closedWonLeads,
        conversionRate: Math.round(conversionRate * 100) / 100
      };
    } catch (error) {
      console.error("Error fetching sales metrics:", error);
      return {
        totalRevenue: 0,
        activeLeads: 0,
        closedWonLeads: 0,
        conversionRate: 0
      };
    }
  }

  async getTeamPerformance(): Promise<Array<{
    user: User;
    dealsCount: number;
    revenue: number;
    targetProgress: number;
  }>> {
    const allUsers = await this.getAllUsers();
    const performance = [];

    for (const user of allUsers) {
      if (user.role !== 'super_admin') {
        const userLeads = await this.getLeadsByUser(user.id);
        const closedWonLeads = userLeads.filter(lead => lead.stage === 'closed_won');
        const revenue = closedWonLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);

        let targetProgress = 0;
        const currentTarget = await this.getCurrentTarget(user.id, 'monthly');
        if (currentTarget) {
          targetProgress = (revenue / currentTarget.targetValue) * 100;
        }

        performance.push({
          user,
          dealsCount: closedWonLeads.length,
          revenue,
          targetProgress,
        });
      }
    }

    return performance;
  }

  async sendRevenueNotificationAndEmail(revenue: DailyRevenue, createdBy: User): Promise<void> {
    try {
      // Get assigned user details
      const assignedUser = await this.getUser(revenue.assignedUser);
      if (!assignedUser) return;

      // Get user's targets for progress calculation
      const userTargets = await this.getTargets().then(targets => 
        targets.filter(t => t.userId === revenue.assignedUser)
      );
      const currentMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
      const currentMonthEnd = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
      
      // Calculate monthly progress
      const monthlyRevenue = await this.getDailyRevenue(revenue.assignedUser, currentMonthStart, currentMonthEnd);
      const totalMonthlyRevenue = monthlyRevenue.reduce((sum, r) => sum + r.revenue, 0);
      const totalMonthlyOrders = monthlyRevenue.reduce((sum, r) => sum + r.orders, 0);

      // Find relevant targets
      const revenueTarget = userTargets.find((t: any) => t.targetType === 'revenue');
      const orderTarget = userTargets.find((t: any) => t.targetType === 'orders');

      let targetProgress = "";
      if (revenueTarget) {
        const progressPercentage = Math.round((totalMonthlyRevenue / revenueTarget.targetValue) * 100);
        targetProgress += `Revenue: ৳${totalMonthlyRevenue.toLocaleString()} / ৳${revenueTarget.targetValue.toLocaleString()} (${progressPercentage}%)`;
      }
      if (orderTarget) {
        const progressPercentage = Math.round((totalMonthlyOrders / orderTarget.targetValue) * 100);
        targetProgress += targetProgress ? `\nOrders: ${totalMonthlyOrders} / ${orderTarget.targetValue} (${progressPercentage}%)` : 
          `Orders: ${totalMonthlyOrders} / ${orderTarget.targetValue} (${progressPercentage}%)`;
      }

      // Create notification
      await this.createNotification({
        userId: revenue.assignedUser,
        type: "revenue_added",
        title: "💰 Daily Revenue Added",
        message: `Your daily revenue of ৳${revenue.revenue.toLocaleString()} for ${revenue.orders} orders from merchant ${revenue.merchantCode} has been recorded by ${createdBy.employeeName}.`,
        read: false
      });

      // Send email summary
      const emailSubject = `Daily Revenue Summary - ৳${revenue.revenue.toLocaleString()}`;
      const emailContent = `
        <h2>Daily Revenue Summary</h2>
        <p>Dear ${assignedUser.employeeName},</p>
        
        <p>Your daily revenue has been updated by ${createdBy.employeeName}:</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3>Today's Revenue Entry</h3>
          <p><strong>Merchant:</strong> ${revenue.merchantCode}</p>
          <p><strong>Revenue:</strong> ৳${revenue.revenue.toLocaleString()}</p>
          <p><strong>Orders:</strong> ${revenue.orders}</p>
          <p><strong>Date:</strong> ${new Date(revenue.date).toLocaleDateString()}</p>
          ${revenue.description ? `<p><strong>Notes:</strong> ${revenue.description}</p>` : ''}
        </div>

        ${targetProgress ? `
        <div style="background-color: #e3f2fd; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3>Monthly Target Progress</h3>
          <pre style="font-family: Arial, sans-serif; white-space: pre-line;">${targetProgress}</pre>
        </div>
        ` : ''}

        <div style="background-color: #f1f8e9; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3>Monthly Summary</h3>
          <p><strong>Total Revenue:</strong> ৳${totalMonthlyRevenue.toLocaleString()}</p>
          <p><strong>Total Orders:</strong> ${totalMonthlyOrders}</p>
          <p><strong>Average Revenue per Order:</strong> ৳${totalMonthlyOrders > 0 ? Math.round(totalMonthlyRevenue / totalMonthlyOrders).toLocaleString() : '0'}</p>
        </div>

        <p>Keep up the excellent work!</p>
        
        <p>Best regards,<br>Paperfly CRM Team</p>
      `;

      // Email functionality will be implemented separately
      console.log(`Would send email to ${assignedUser.email}: ${emailSubject}`);
    } catch (error) {
      console.error("Error sending revenue notification/email:", error);
      // Don't throw error as this is supplementary functionality
    }
  }

  async processBulkRevenueUpload(file: any, createdById: string): Promise<any> {
    const fs = (await import('fs')).default;
    const csv = (await import('csv-parser')).default;

    return new Promise((resolve, reject) => {
      const results: any[] = [];
      const errors: string[] = [];
      let successCount = 0;
      let failedCount = 0;

      fs.createReadStream(file.path)
        .pipe(csv())
        .on('data', (data) => results.push(data))
        .on('end', async () => {
          try {
            const createdByUser = await this.getUser(createdById);
            if (!createdByUser) {
              return reject(new Error("Creator user not found"));
            }

            let totalRevenue = 0;
            let totalOrders = 0;
            const affectedUsers = new Set<string>();

            for (const row of results) {
              try {
                // Validate CSV row - handle missing fields gracefully
                const revenueData = {
                  assignedUser: row.assigned_user,
                  merchantCode: row.merchant_code,
                  revenue: parseInt(row.revenue) || 0,
                  orders: parseInt(row.orders) || 1,
                  description: row.description || "",
                  createdBy: createdById,
                  date: new Date(),
                };

                // Validate required fields
                if (!revenueData.assignedUser || !revenueData.merchantCode || revenueData.revenue <= 0) {
                  errors.push(`Row ${results.indexOf(row) + 1}: Missing required fields (assigned_user, merchant_code, revenue)`);
                  failedCount++;
                  continue;
                }

                // Check if assigned user exists
                const assignedUser = await this.getUser(revenueData.assignedUser);
                if (!assignedUser) {
                  errors.push(`Row ${results.indexOf(row) + 1}: User ${revenueData.assignedUser} not found`);
                  failedCount++;
                  continue;
                }

                // Create revenue entry
                const createdRevenue = await this.createDailyRevenue(revenueData);

                // Send notification and email
                await this.sendRevenueNotificationAndEmail(createdRevenue, createdByUser);

                successCount++;
                totalRevenue += revenueData.revenue;
                totalOrders += revenueData.orders;
                affectedUsers.add(revenueData.assignedUser);

              } catch (error: any) {
                errors.push(`Row ${results.indexOf(row) + 1}: ${error.message}`);
                failedCount++;
              }
            }

            // Clean up uploaded file
            fs.unlink(file.path, (err: any) => {
              if (err) console.error("Error deleting uploaded file:", err);
            });

            // Send summary email to super admin
            if (successCount > 0) {
              await this.sendBulkUploadSummaryEmail(createdByUser, {
                totalEntries: results.length,
                successCount,
                failedCount,
                totalRevenue,
                totalOrders,
                affectedUsers: affectedUsers.size,
                errors
              });
            }

            resolve({
              success: successCount,
              failed: failedCount,
              errors,
              summary: {
                totalRevenue,
                totalOrders,
                affectedUsers: affectedUsers.size
              }
            });

          } catch (error: any) {
            reject(error);
          }
        })
        .on('error', (error: any) => {
          reject(error);
        });
    });
  }

  async sendBulkUploadSummaryEmail(admin: User, summary: any): Promise<void> {
    try {
      const emailSubject = `Bulk Revenue Upload Summary - ${summary.successCount} entries processed`;
      const emailContent = `
        <h2>Bulk Revenue Upload Summary</h2>
        <p>Dear ${admin.employeeName},</p>
        
        <p>Your bulk revenue upload has been processed:</p>
        
        <div style="background-color: #f8f9fa; padding: 15px; border-radius: 5px; margin: 15px 0;">
          <h3>Upload Results</h3>
          <p><strong>Total Entries:</strong> ${summary.totalEntries}</p>
          <p><strong>Successful:</strong> ${summary.successCount}</p>
          <p><strong>Failed:</strong> ${summary.failedCount}</p>
          <p><strong>Total Revenue Added:</strong> ৳${summary.totalRevenue.toLocaleString()}</p>
          <p><strong>Total Orders:</strong> ${summary.totalOrders}</p>
          <p><strong>Users Affected:</strong> ${summary.affectedUsers}</p>
        </div>

        ${summary.errors.length > 0 ? `
        <div style="background-color: #fef2f2; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #ef4444;">
          <h3>Errors</h3>
          <ul>
            ${summary.errors.map((error: string) => `<li>${error}</li>`).join('')}
          </ul>
        </div>
        ` : ''}

        <p>Summary emails have been sent to all affected users.</p>
        
        <p>Best regards,<br>Paperfly CRM Team</p>
      `;

      // Email functionality will be implemented separately
      console.log(`Would send bulk upload summary email to ${admin.email}: ${emailSubject}`);
    } catch (error) {
      console.error("Error sending bulk upload summary email:", error);
    }
  }
}

// Production database storage - prevents data loss
console.log("Using database storage for production - data will persist");
export const storage = new DatabaseStorage();

// Initialize admin user for production
storage.createUser({
  id: "admin",
  email: "shamim.ahammed@paperfly.com.bd", 
  password: "$2b$10$M/qluBLTkmxuzQnnC.5zJOEJdy64PjZSiK7zUEu2GnZY5pbqYl..6", // admin123
  employeeName: "Shamim Ahammed",
  employeeCode: "ADM001",
  role: "super_admin",
  emailVerified: true
}).catch(() => {
  // User already exists, ignore error
});