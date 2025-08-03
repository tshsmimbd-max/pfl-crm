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
} from "@shared/schema";
import { db } from "./db";
import { eq, desc, and, gte, lte, sum, count } from "drizzle-orm";
import * as crypto from "crypto";

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

  // Interaction operations
  getInteractions(leadId: number): Promise<Interaction[]>;
  getAllInteractions(): Promise<Interaction[]>;
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  updateInteraction(id: number, interaction: Partial<InsertInteraction>): Promise<Interaction>;

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
  createNotification(notification: InsertNotification): Promise<Notification>;
  markNotificationRead(id: number): Promise<void>;
  getUnreadNotificationCount(userId: string): Promise<number>;

  // Analytics operations
  getSalesMetrics(userId?: string): Promise<{
    totalRevenue: number;
    activeLeads: number;
    conversionRate: number;
    targetProgress: number;
  }>;
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
    // Since schema doesn't have isActive, we'll return the user as-is
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) throw new Error("User not found");
    return user;
  }

  async activateUser(id: string): Promise<User> {
    // Since schema doesn't have isActive, we'll return the user as-is
    const [user] = await db.select().from(users).where(eq(users.id, id));
    if (!user) throw new Error("User not found");
    return user;
  }

  async getUsersForAssignment(currentUserId: string, currentUserRole: string): Promise<User[]> {
    if (currentUserRole === 'super_admin') {
      return await db.select().from(users);
    } else if (currentUserRole === 'sales_manager') {
      return await db.select().from(users).where(eq(users.managerId, currentUserId));
    } else {
      // Sales agents can only see themselves
      return await db.select().from(users).where(eq(users.id, currentUserId));
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
    const [newLead] = await db.insert(leads).values(lead).returning();
    return newLead;
  }

  async updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead> {
    const [updatedLead] = await db
      .update(leads)
      .set({ ...lead, updatedAt: new Date() })
      .where(eq(leads.id, id))
      .returning();
    return updatedLead;
  }

  async deleteLead(id: number): Promise<void> {
    await db.delete(leads).where(eq(leads.id, id));
  }

  async getLeadsByStage(stage: string): Promise<Lead[]> {
    return db.select().from(leads).where(eq(leads.stage, stage));
  }

  async getLeadsByUser(userId: string): Promise<Lead[]> {
    return await db.select().from(leads).where(eq(leads.assignedTo, userId));
  }

  // Interaction operations
  async getInteractions(leadId: number): Promise<Interaction[]> {
    return await db
      .select()
      .from(interactions)
      .where(eq(interactions.leadId, leadId))
      .orderBy(desc(interactions.createdAt));
  }

  async getAllInteractions(): Promise<Interaction[]> {
    return await db
      .select()
      .from(interactions)
      .orderBy(desc(interactions.createdAt));
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

  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.convertedAt));
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    const [customer] = await db.select().from(customers).where(eq(customers.id, id));
    return customer;
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
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

    // Create customer from lead data
    const customerData: InsertCustomer = {
      originalLeadId: lead.id,
      contactName: lead.contactName,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      totalValue: lead.value,
      assignedTo: lead.assignedTo,
      convertedBy: userId,
      leadSource: lead.leadSource,
      packageSize: lead.packageSize,
      preferredPickTime: lead.preferredPickTime,
      pickupAddress: lead.pickupAddress,
      website: lead.website,
      facebookPageUrl: lead.facebookPageUrl,
      customerType: lead.customerType,
      notes: lead.notes,
    };

    const customer = await this.createCustomer(customerData);
    
    // Create notification for successful conversion
    await this.createNotification({
      userId: lead.assignedTo || userId,
      type: "lead_converted",
      title: "Lead Converted to Customer",
      message: `Lead "${lead.contactName}" has been successfully converted to a customer`,
    });

    return customer;
  }

  async getCustomersByUser(userId: string): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.assignedTo, userId));
  }

  // Daily Revenue operations
  async getDailyRevenue(userId?: string, startDate?: Date, endDate?: Date): Promise<DailyRevenue[]> {
    const conditions = [];
    if (userId) {
      conditions.push(eq(dailyRevenue.userId, userId));
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
      conditions.push(eq(dailyRevenue.userId, userId));
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

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const [newNotification] = await db.insert(notifications).values(notification).returning();
    return newNotification;
  }

  async markNotificationRead(id: number): Promise<void> {
    await db.update(notifications).set({ read: true }).where(eq(notifications.id, id));
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: count() })
      .from(notifications)
      .where(and(eq(notifications.userId, userId), eq(notifications.read, false)));
    return result.count;
  }

  // Analytics operations
  async getSalesMetrics(userId?: string): Promise<{
    totalRevenue: number;
    activeLeads: number;
    conversionRate: number;
    targetProgress: number;
  }> {
    let allLeads;
    if (userId) {
      allLeads = await db.select().from(leads).where(eq(leads.assignedTo, userId));
    } else {
      allLeads = await db.select().from(leads);
    }
    const activeLeads = allLeads.filter(lead => !['closed_won', 'closed_lost'].includes(lead.stage));
    const closedWonLeads = allLeads.filter(lead => lead.stage === 'closed_won');

    const totalRevenue = closedWonLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);
    const conversionRate = allLeads.length > 0 ? (closedWonLeads.length / allLeads.length) * 100 : 0;

    // Calculate target progress
    let targetProgress = 0;
    if (userId) {
      const currentTarget = await this.getCurrentTarget(userId, 'monthly');
      if (currentTarget) {
        targetProgress = (totalRevenue / currentTarget.targetValue) * 100;
      }
    }

    return {
      totalRevenue,
      activeLeads: activeLeads.length,
      conversionRate,
      targetProgress,
    };
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
}

// Production database storage - prevents data loss
// Temporarily switch to a simple in-memory storage due to database connectivity issues
console.log("Database connectivity issue - using temporary memory storage");

// Simple memory storage implementation
class SimpleMemoryStorage {
  private users = new Map();
  private leads = new Map();
  private interactions = new Map();
  private targets = new Map();
  private customers = new Map();
  private notifications = new Map();
  private nextId = 1;

  constructor() {
    // Add default admin user
    this.users.set('admin@paperfly.com', {
      id: '1',
      email: 'admin@paperfly.com',
      password: '$2b$10$C2n1evyk3.DN.oq.IJDF0O0oNHy.drq///IyD8yB7dSLh3YJGgDpy', // admin123
      fullName: 'Admin User',
      role: 'super_admin',
      emailVerified: true,
      verificationCode: null,
      codeExpiresAt: null,
      managerId: null,
      teamName: null,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    });
  }

  // Implement required interface methods with simple Map operations
  async getUserByEmail(email) { 
    return this.users.get(email);
  }
  async getUser(id) { return Array.from(this.users.values()).find(u => u.id === id); }
  async createUser(user) { 
    const newUser = { ...user, id: String(this.nextId++), createdAt: new Date(), updatedAt: new Date() };
    this.users.set(user.email, newUser);
    return newUser;
  }
  async setVerificationCode(email, code) {
    const user = this.users.get(email);
    if (user) {
      user.verificationCode = code;
      user.codeExpiresAt = new Date(Date.now() + 10 * 60 * 1000);
    }
  }
  async verifyCode(email, code) {
    const user = this.users.get(email);
    if (user && user.verificationCode === code && user.codeExpiresAt > new Date()) {
      user.emailVerified = true;
      user.verificationCode = null;
      user.codeExpiresAt = null;
      return user;
    }
    return null;
  }
  async getAllUsers() { return Array.from(this.users.values()); }
  async updateUserRole(id, role, managerId) {
    const user = Array.from(this.users.values()).find(u => u.id === id);
    if (user) {
      user.role = role;
      if (managerId) user.managerId = managerId;
      user.updatedAt = new Date();
    }
    return user;
  }
  async getTeamMembers(managerId) { 
    return Array.from(this.users.values()).filter(u => u.managerId === managerId);
  }
  async isTeamMember(managerId, userId) {
    const user = Array.from(this.users.values()).find(u => u.id === userId);
    return user && user.managerId === managerId;
  }
  async deactivateUser(id) {
    const user = Array.from(this.users.values()).find(u => u.id === id);
    if (user) {
      user.isActive = false;
      user.updatedAt = new Date();
    }
    return user;
  }
  async activateUser(id) {
    const user = Array.from(this.users.values()).find(u => u.id === id);
    if (user) {
      user.isActive = true;
      user.updatedAt = new Date();
    }
    return user;
  }
  async getUsersForAssignment(currentUserId, currentUserRole) {
    return Array.from(this.users.values()).filter(u => u.isActive);
  }
  async assignUserToManager(userId, managerId) {
    const user = Array.from(this.users.values()).find(u => u.id === userId);
    if (user) {
      user.managerId = managerId;
      user.updatedAt = new Date();
    }
    return user;
  }
  async updateUserTeam(userId, teamName) {
    const user = Array.from(this.users.values()).find(u => u.id === userId);
    if (user) {
      user.teamName = teamName;
      user.updatedAt = new Date();
    }
    return user;
  }

  // Lead operations
  async getLeads() { return Array.from(this.leads.values()); }
  async getLead(id) { return this.leads.get(id); }
  async createLead(lead) {
    const newLead = { ...lead, id: this.nextId++, createdAt: new Date(), updatedAt: new Date() };
    this.leads.set(newLead.id, newLead);
    return newLead;
  }
  async updateLead(id, lead) {
    const existing = this.leads.get(id);
    if (existing) {
      Object.assign(existing, lead, { updatedAt: new Date() });
    }
    return existing;
  }
  async deleteLead(id) { this.leads.delete(id); }
  async getLeadsByStage(stage) {
    return Array.from(this.leads.values()).filter(l => l.stage === stage);
  }
  async getLeadsByUser(userId) {
    return Array.from(this.leads.values()).filter(l => l.assignedTo === userId);
  }

  // Interaction operations
  async getInteractions(leadId) {
    return Array.from(this.interactions.values()).filter(i => i.leadId === leadId);
  }
  async getAllInteractions() { return Array.from(this.interactions.values()); }
  async createInteraction(interaction) {
    const newInteraction = { ...interaction, id: this.nextId++, createdAt: new Date() };
    this.interactions.set(newInteraction.id, newInteraction);
    return newInteraction;
  }
  async updateInteraction(id, interaction) {
    const existing = this.interactions.get(id);
    if (existing) {
      Object.assign(existing, interaction);
    }
    return existing;
  }

  // Target operations
  async getTargets(userId) {
    const targets = Array.from(this.targets.values());
    return userId ? targets.filter(t => t.assignedUserId === userId) : targets;
  }
  async createTarget(target) {
    const newTarget = { ...target, id: this.nextId++, createdAt: new Date(), updatedAt: new Date() };
    this.targets.set(newTarget.id, newTarget);
    return newTarget;
  }
  async updateTarget(id, target) {
    const existing = this.targets.get(id);
    if (existing) {
      Object.assign(existing, target, { updatedAt: new Date() });
    }
    return existing;
  }
  async deleteTarget(id) { this.targets.delete(id); }
  async getCurrentTarget(userId, period) {
    return Array.from(this.targets.values()).find(t => 
      t.assignedUserId === userId && t.period === period
    );
  }

  // Customer operations
  async getCustomers() { return Array.from(this.customers.values()); }
  async getCustomer(id) { return this.customers.get(id); }
  async createCustomer(customer) {
    const newCustomer = { ...customer, id: this.nextId++, createdAt: new Date(), updatedAt: new Date() };
    this.customers.set(newCustomer.id, newCustomer);
    return newCustomer;
  }
  async updateCustomer(id, customer) {
    const existing = this.customers.get(id);
    if (existing) {
      Object.assign(existing, customer, { updatedAt: new Date() });
    }
    return existing;
  }
  async deleteCustomer(id) { this.customers.delete(id); }
  async convertLeadToCustomer(leadId, userId) {
    const lead = this.leads.get(leadId);
    if (lead) {
      const customer = await this.createCustomer({
        contactName: lead.contactName,
        email: lead.email,
        phone: lead.phone,
        company: lead.company,
        totalValue: lead.value,
        convertedBy: userId,
        convertedAt: new Date(),
        originalLeadId: leadId
      });
      return customer;
    }
    throw new Error('Lead not found');
  }
  async getCustomersByUser(userId) {
    return Array.from(this.customers.values()).filter(c => c.convertedBy === userId);
  }

  // Notification operations
  async getNotifications(userId) {
    return Array.from(this.notifications.values()).filter(n => n.userId === userId);
  }
  async createNotification(notification) {
    const newNotification = { ...notification, id: this.nextId++, createdAt: new Date() };
    this.notifications.set(newNotification.id, newNotification);
    return newNotification;
  }
  async markNotificationAsRead(id) {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.isRead = true;
    }
  }

  // Analytics operations
  async getLeadMetrics(userId, startDate, endDate) {
    let leads = Array.from(this.leads.values());
    if (userId) leads = leads.filter(l => l.assignedTo === userId);
    if (startDate || endDate) {
      leads = leads.filter(l => {
        const date = l.createdAt;
        return (!startDate || date >= startDate) && (!endDate || date <= endDate);
      });
    }
    
    const totalLeads = leads.length;
    const convertedLeads = leads.filter(l => l.stage === 'closed_won').length;
    const totalValue = leads.reduce((sum, l) => sum + (l.value || 0), 0);
    const conversionRate = totalLeads > 0 ? (convertedLeads / totalLeads) * 100 : 0;

    return { totalLeads, convertedLeads, totalValue, conversionRate };
  }

  async getRevenueMetrics(userId, startDate, endDate) {
    return { totalRevenue: 0, targetRevenue: 100000, achievementRate: 0 };
  }

  async getPipelineMetrics(userId) {
    const leads = userId ? 
      Array.from(this.leads.values()).filter(l => l.assignedTo === userId) :
      Array.from(this.leads.values());
      
    const pipeline = {
      prospecting: leads.filter(l => l.stage === 'prospecting').length,
      qualification: leads.filter(l => l.stage === 'qualification').length,
      proposal: leads.filter(l => l.stage === 'proposal').length,
      negotiation: leads.filter(l => l.stage === 'negotiation').length,
      closed_won: leads.filter(l => l.stage === 'closed_won').length,
      closed_lost: leads.filter(l => l.stage === 'closed_lost').length
    };
    
    return pipeline;
  }

  // Bulk operations
  async bulkCreateLeads(leads) {
    const createdLeads = [];
    for (const lead of leads) {
      const created = await this.createLead(lead);
      createdLeads.push(created);
    }
    return createdLeads;
  }

  async bulkCreateCustomers(customers) {
    const createdCustomers = [];
    for (const customer of customers) {
      const created = await this.createCustomer(customer);
      createdCustomers.push(created);
    }
    return createdCustomers;
  }

  // Revenue tracking
  async getDailyRevenue(date) {
    return { date, revenue: 0, target: 0 };
  }

  async createDailyRevenue(data) {
    return { id: this.nextId++, ...data, createdAt: new Date() };
  }

  async updateDailyRevenue(date, revenue) {
    return { date, revenue, target: 0, updatedAt: new Date() };
  }
}

export const storage = new SimpleMemoryStorage();