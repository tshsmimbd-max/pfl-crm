import {
  users,
  leads,
  interactions,
  targets,
  notifications,
  type User,
  type UpsertUser,
  type Lead,
  type InsertLead,
  type Interaction,
  type InsertInteraction,
  type Target,
  type InsertTarget,
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
  createUser(user: { email: string; password: string; firstName: string; lastName: string; role?: string }): Promise<User>;
  upsertUser(user: UpsertUser): Promise<User>;
  getAllUsers(): Promise<User[]>;
  updateUserRole(id: string, role: string): Promise<User>;

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
  createInteraction(interaction: InsertInteraction): Promise<Interaction>;
  updateInteraction(id: number, interaction: Partial<InsertInteraction>): Promise<Interaction>;

  // Target operations
  getTargets(userId?: string): Promise<Target[]>;
  createTarget(target: InsertTarget): Promise<Target>;
  updateTarget(id: number, target: Partial<InsertTarget>): Promise<Target>;
  deleteTarget(id: number): Promise<void>;
  getCurrentTarget(userId: string, period: string): Promise<Target | undefined>;

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

  async createUser(userData: { email: string; password: string; firstName: string; lastName: string; role?: string }): Promise<User> {
    const userId = crypto.randomUUID();
    const [user] = await db
      .insert(users)
      .values({
        id: userId,
        email: userData.email,
        password: userData.password,
        firstName: userData.firstName,
        lastName: userData.lastName,
        role: userData.role || 'sales',
      })
      .returning();
    return user;
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
    return await db.select().from(users).orderBy(users.firstName);
  }

  async updateUserRole(id: string, role: string): Promise<User> {
    const [user] = await db
      .update(users)
      .set({ role, updatedAt: new Date() })
      .where(eq(users.id, id))
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
          eq(targets.period, period),
          lte(targets.startDate, now),
          gte(targets.endDate, now)
        )
      );
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

export const storage = new DatabaseStorage();
