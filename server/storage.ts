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
  createUser(user: { id?: string; email: string; password: string; fullName: string; role?: string; managerId?: string | null; teamName?: string | null; emailVerified?: boolean; verificationCode?: string | null; codeExpiresAt?: Date | null }): Promise<User>;
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

export class DatabaseStorage {
  // User operations
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    return user;
  }

  async createUser(userData: { id?: string; email: string; password: string; fullName: string; role?: string; managerId?: string | null; teamName?: string | null; emailVerified?: boolean; verificationCode?: string | null; codeExpiresAt?: Date | null }): Promise<User> {
    const userId = userData.id || crypto.randomUUID();
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        email: userData.email,
        password: userData.password,
        fullName: userData.fullName,
        role: userData.role || 'sales_agent',
        managerId: userData.managerId || null,
        teamName: userData.teamName || null,
        emailVerified: userData.emailVerified ?? false,
        verificationCode: userData.verificationCode || null,
        codeExpiresAt: userData.codeExpiresAt || null,
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

  async upsertUser(userData: UpsertUser): Promise<User> {
    const [user] = await db
      .insert(users)
      .values(userData)
      .onConflictDoUpdate({
        target: users.id,
        set: {
          ...userData,
          updatedAt: new Date(),
        },
      })
      .returning();
    return user;
  }

  async getAllUsers(): Promise<User[]> {
    return await db.select().from(users);
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
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
    let query = db.select().from(dailyRevenue);
    
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
      query = query.where(and(...conditions));
    }
    
    return await query.orderBy(desc(dailyRevenue.date));
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
    let query = db.select({ total: sum(dailyRevenue.revenue) }).from(dailyRevenue);
    
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
      query = query.where(and(...conditions));
    }
    
    const result = await query;
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

  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    return await db.select().from(customers).orderBy(desc(customers.createdAt));
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
      throw new Error('Lead not found');
    }

    // Create customer from lead data
    const customerData: InsertCustomer = {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      assignedTo: lead.assignedTo,
      convertedFromLeadId: leadId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const customer = await this.createCustomer(customerData);

    // Update lead stage to converted
    await this.updateLead(leadId, { stage: 'closed_won' });

    return customer;
  }

  async getCustomersByUser(userId: string): Promise<Customer[]> {
    return await db.select().from(customers).where(eq(customers.assignedTo, userId));
  }

  // Analytics operations
  async getSalesMetrics(userId?: string): Promise<{
    totalRevenue: number;
    activeLeads: number;
    conversionRate: number;
    targetProgress: number;
  }> {
    let leadsQuery = db.select().from(leads);
    if (userId) {
      leadsQuery = leadsQuery.where(eq(leads.assignedTo, userId));
    }

    const allLeads = await leadsQuery;
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
      const userLeads = await this.getLeadsByUser(user.id);
      const closedWonLeads = userLeads.filter(lead => lead.stage === 'closed_won');
      const revenue = closedWonLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);

      const currentTarget = await this.getCurrentTarget(user.id, 'monthly');
      const targetProgress = currentTarget ? (revenue / currentTarget.targetValue) * 100 : 0;

      performance.push({
        user,
        dealsCount: closedWonLeads.length,
        revenue,
        targetProgress,
      });
    }

    return performance;
  }
}

// Temporary in-memory storage for when database is unavailable
class MemoryStorage implements IStorage {
  private users: Map<string, User> = new Map();
  private leads: Map<number, Lead> = new Map();
  private interactions: Map<number, Interaction> = new Map();
  private targets: Map<number, Target> = new Map();
  private customers: Map<number, Customer> = new Map();
  private dailyRevenue: Map<number, DailyRevenue> = new Map();
  private notifications: Map<number, Notification> = new Map();
  private verificationCodes: Map<string, string> = new Map();
  private nextId = 1;

  constructor() {
    // Initialize with single admin user for production
    this.initializeSingleAdminUser();
  }

  private initializeSingleAdminUser() {
    const adminUser = {
      id: "admin",
      email: "admin@paperfly.com",
      password: "$2b$10$M/qluBLTkmxuzQnnC.5zJOEJdy64PjZSiK7zUEu2GnZY5pbqYl..6", // admin123
      fullName: "System Administrator",
      role: "super_admin",
      isActive: true,
      emailVerified: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    this.users.set(adminUser.id, adminUser as User);
  }



  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(u => u.email === email);
  }

  async createUser(user: { email: string; password: string; fullName: string; role?: string }): Promise<User> {
    const newUser: User = {
      id: String(this.nextId++),
      email: user.email,
      password: user.password,
      fullName: user.fullName,
      role: user.role || 'sales_agent',
      isActive: true,
      emailVerified: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.users.set(newUser.id, newUser);
    return newUser;
  }

  async setVerificationCode(email: string, code: string): Promise<void> {
    this.verificationCodes.set(email, code);
  }

  async verifyCode(email: string, code: string): Promise<User | null> {
    const storedCode = this.verificationCodes.get(email);
    if (storedCode === code) {
      const user = await this.getUserByEmail(email);
      if (user) {
        user.emailVerified = true;
        this.verificationCodes.delete(email);
        return user;
      }
    }
    return null;
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async updateUserRole(id: string, role: string, managerId?: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    user.role = role;
    if (managerId) user.managerId = managerId;
    user.updatedAt = new Date();
    return user;
  }

  async getTeamMembers(managerId: string): Promise<User[]> {
    return Array.from(this.users.values()).filter(u => u.managerId === managerId);
  }

  async isTeamMember(managerId: string, userId: string): Promise<boolean> {
    const user = this.users.get(userId);
    return user?.managerId === managerId;
  }

  async deactivateUser(id: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    user.isActive = false;
    user.updatedAt = new Date();
    return user;
  }

  async activateUser(id: string): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    user.isActive = true;
    user.updatedAt = new Date();
    return user;
  }

  async getUsersForAssignment(currentUserId: string, currentUserRole: string): Promise<User[]> {
    const users = Array.from(this.users.values());
    if (currentUserRole === 'super_admin') {
      return users.filter(u => u.id !== currentUserId);
    } else if (currentUserRole === 'sales_manager') {
      return users.filter(u => u.managerId === currentUserId);
    }
    return [];
  }

  async assignUserToManager(userId: string, managerId: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    user.managerId = managerId;
    user.updatedAt = new Date();
    return user;
  }

  async updateUserTeam(userId: string, teamName: string): Promise<User> {
    const user = this.users.get(userId);
    if (!user) throw new Error("User not found");
    user.team = teamName;
    user.updatedAt = new Date();
    return user;
  }

  // Lead operations
  async getLeads(): Promise<Lead[]> {
    return Array.from(this.leads.values()).sort((a, b) => 
      new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  }

  async getLead(id: number): Promise<Lead | undefined> {
    return this.leads.get(id);
  }

  async createLead(lead: InsertLead): Promise<Lead> {
    const newLead: Lead = {
      id: this.nextId++,
      ...lead,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.leads.set(newLead.id, newLead);
    return newLead;
  }

  async updateLead(id: number, lead: Partial<InsertLead>): Promise<Lead> {
    const existingLead = this.leads.get(id);
    if (!existingLead) throw new Error("Lead not found");
    
    const updatedLead = { ...existingLead, ...lead, updatedAt: new Date() };
    this.leads.set(id, updatedLead);
    return updatedLead;
  }

  async deleteLead(id: number): Promise<void> {
    this.leads.delete(id);
  }

  async getLeadsByStage(stage: string): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter(lead => lead.stage === stage);
  }

  async getLeadsByUser(userId: string): Promise<Lead[]> {
    return Array.from(this.leads.values()).filter(lead => lead.assignedTo === userId);
  }

  // Interaction operations
  async getInteractions(leadId: number): Promise<Interaction[]> {
    return Array.from(this.interactions.values())
      .filter(i => i.leadId === leadId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getAllInteractions(): Promise<Interaction[]> {
    return Array.from(this.interactions.values());
  }

  async createInteraction(interaction: InsertInteraction): Promise<Interaction> {
    const newInteraction: Interaction = {
      id: this.nextId++,
      ...interaction,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.interactions.set(newInteraction.id, newInteraction);
    return newInteraction;
  }

  async updateInteraction(id: number, interaction: Partial<InsertInteraction>): Promise<Interaction> {
    const existing = this.interactions.get(id);
    if (!existing) throw new Error("Interaction not found");
    
    const updated = { ...existing, ...interaction, updatedAt: new Date() };
    this.interactions.set(id, updated);
    return updated;
  }

  // Target operations
  async getTargets(userId?: string): Promise<Target[]> {
    const targets = Array.from(this.targets.values());
    return userId ? targets.filter(t => t.userId === userId) : targets;
  }

  async createTarget(target: InsertTarget): Promise<Target> {
    const newTarget: Target = {
      id: this.nextId++,
      ...target,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.targets.set(newTarget.id, newTarget);
    return newTarget;
  }

  async updateTarget(id: number, target: Partial<InsertTarget>): Promise<Target> {
    const existing = this.targets.get(id);
    if (!existing) throw new Error("Target not found");
    
    const updated = { ...existing, ...target, updatedAt: new Date() };
    this.targets.set(id, updated);
    return updated;
  }

  async deleteTarget(id: number): Promise<void> {
    this.targets.delete(id);
  }

  async getCurrentTarget(userId: string, period: string): Promise<Target | undefined> {
    return Array.from(this.targets.values())
      .find(t => t.userId === userId && t.period === period);
  }

  // Notification operations
  async getNotifications(userId: string): Promise<Notification[]> {
    return Array.from(this.notifications.values()).filter(n => n.userId === userId);
  }

  async createNotification(notification: InsertNotification): Promise<Notification> {
    const newNotification: Notification = {
      id: this.nextId++,
      ...notification,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.notifications.set(newNotification.id, newNotification);
    return newNotification;
  }

  async markNotificationRead(id: number): Promise<void> {
    const notification = this.notifications.get(id);
    if (notification) {
      notification.isRead = true;
      notification.updatedAt = new Date();
    }
  }

  async getUnreadNotificationCount(userId: string): Promise<number> {
    return Array.from(this.notifications.values())
      .filter(n => n.userId === userId && !n.isRead).length;
  }

  // Customer operations
  async getCustomers(): Promise<Customer[]> {
    return Array.from(this.customers.values());
  }

  async getCustomer(id: number): Promise<Customer | undefined> {
    return this.customers.get(id);
  }

  async createCustomer(customer: InsertCustomer): Promise<Customer> {
    const newCustomer: Customer = {
      id: this.nextId++,
      ...customer,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.customers.set(newCustomer.id, newCustomer);
    return newCustomer;
  }

  async updateCustomer(id: number, customer: Partial<InsertCustomer>): Promise<Customer> {
    const existing = this.customers.get(id);
    if (!existing) throw new Error("Customer not found");
    
    const updated = { ...existing, ...customer, updatedAt: new Date() };
    this.customers.set(id, updated);
    return updated;
  }

  async deleteCustomer(id: number): Promise<void> {
    this.customers.delete(id);
  }

  async convertLeadToCustomer(leadId: number, userId: string): Promise<Customer> {
    const lead = await this.getLead(leadId);
    if (!lead) {
      throw new Error('Lead not found');
    }

    // Create customer from lead data
    const customerData: InsertCustomer = {
      name: lead.name,
      email: lead.email,
      phone: lead.phone,
      company: lead.company,
      assignedTo: lead.assignedTo,
      convertedFromLeadId: leadId,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const customer = await this.createCustomer(customerData);

    // Update lead stage to converted
    await this.updateLead(leadId, { stage: 'closed_won' });

    return customer;
  }

  async getCustomersByUser(userId: string): Promise<Customer[]> {
    return Array.from(this.customers.values()).filter(c => c.assignedTo === userId);
  }

  // Daily Revenue operations
  async getDailyRevenue(userId?: string, startDate?: Date, endDate?: Date): Promise<DailyRevenue[]> {
    let revenues = Array.from(this.dailyRevenue.values());
    
    if (userId) {
      revenues = revenues.filter(r => r.userId === userId);
    }
    
    if (startDate) {
      revenues = revenues.filter(r => new Date(r.date) >= startDate);
    }
    
    if (endDate) {
      revenues = revenues.filter(r => new Date(r.date) <= endDate);
    }
    
    return revenues.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }

  async createDailyRevenue(revenue: InsertDailyRevenue): Promise<DailyRevenue> {
    const newRevenue: DailyRevenue = {
      id: this.nextId++,
      ...revenue,
      createdAt: new Date(),
      updatedAt: new Date(),
    };
    this.dailyRevenue.set(newRevenue.id, newRevenue);
    return newRevenue;
  }

  async updateDailyRevenue(id: number, revenue: Partial<InsertDailyRevenue>): Promise<DailyRevenue> {
    const existing = this.dailyRevenue.get(id);
    if (!existing) throw new Error("Daily revenue record not found");
    
    const updated = { ...existing, ...revenue, updatedAt: new Date() };
    this.dailyRevenue.set(id, updated);
    return updated;
  }

  async deleteDailyRevenue(id: number): Promise<void> {
    this.dailyRevenue.delete(id);
  }

  async getTotalRevenueForPeriod(userId?: string, startDate?: Date, endDate?: Date): Promise<number> {
    const revenues = await this.getDailyRevenue(userId, startDate, endDate);
    return revenues.reduce((sum, r) => sum + r.revenue, 0);
  }

  // Analytics operations - fixed for proper data calculation
  async getSalesMetrics(userId?: string): Promise<{
    totalRevenue: number;
    activeLeads: number;
    conversionRate: number;
    targetProgress: number;
  }> {
    const leads = userId ? 
      Array.from(this.leads.values()).filter(l => l.assignedTo === userId) :
      Array.from(this.leads.values());
    
    const closedWonLeads = leads.filter(l => l.stage === 'closed_won');
    const totalRevenue = closedWonLeads.reduce((sum, l) => sum + (l.value || 0), 0);
    const activeLeads = leads.filter(l => l.stage !== 'closed_won' && l.stage !== 'closed_lost').length;
    const conversionRate = leads.length > 0 ? (closedWonLeads.length / leads.length) * 100 : 0;
    
    const targets = userId ? Array.from(this.targets.values()).filter(t => t.userId === userId) : [];
    const currentTarget = targets.find(t => t.period === 'monthly');
    const targetProgress = currentTarget ? (totalRevenue / currentTarget.targetValue) * 100 : 0;

    return {
      totalRevenue,
      activeLeads,
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
    const users = Array.from(this.users.values());
    const performance = [];

    for (const user of users) {
      const userLeads = await this.getLeadsByUser(user.id);
      const closedWonLeads = userLeads.filter(lead => lead.stage === 'closed_won');
      const revenue = closedWonLeads.reduce((sum, lead) => sum + (lead.value || 0), 0);

      const currentTarget = await this.getCurrentTarget(user.id, 'monthly');
      const targetProgress = currentTarget ? (revenue / currentTarget.targetValue) * 100 : 0;

      performance.push({
        user,
        dealsCount: closedWonLeads.length,
        revenue,
        targetProgress,
      });
    }

    return performance;
  }
}

// Use memory storage with clean single admin user for production
console.log("Using memory storage with single admin user for production");
export const storage = new MemoryStorage();
