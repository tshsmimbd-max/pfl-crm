import {
  pgTable,
  text,
  varchar,
  timestamp,
  jsonb,
  index,
  serial,
  integer,
  decimal,
  boolean,
  uuid,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";
import { relations } from "drizzle-orm";

// Note: Session table is managed by connect-pg-simple

// User storage table
export const users = pgTable("users", {
  id: varchar("id").primaryKey().notNull(),
  email: varchar("email").unique().notNull(),
  password: varchar("password").notNull(),
  employeeName: varchar("employee_name").notNull(), // Changed from fullName
  employeeCode: varchar("employee_code").unique().notNull(), // New field
  role: varchar("role").notNull().default("sales_agent"), // super_admin, sales_manager, sales_agent
  managerId: varchar("manager_id"),
  teamName: varchar("team_name"), // Sales Titans or Revenue Rangers
  isActive: boolean("is_active").default(true).notNull(), // User active status
  emailVerified: boolean("email_verified").default(false),
  verificationCode: varchar("verification_code"),
  codeExpiresAt: timestamp("code_expires_at"),
  passwordResetCode: varchar("password_reset_code"),
  passwordResetExpiresAt: timestamp("password_reset_expires_at"),

  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Leads table
export const leads = pgTable("leads", {
  id: serial("id").primaryKey(),
  contactName: varchar("contact_name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  company: varchar("company").notNull(),
  value: integer("value").notNull(),
  stage: varchar("stage").notNull().default("Prospecting"), // Prospecting, Qualified, Proposal, Negotiation, Closed Won, Closed Lost
  assignedTo: varchar("assigned_to").references(() => users.id),
  createdBy: varchar("created_by").references(() => users.id),
  // New enhanced fields
  leadSource: varchar("lead_source").notNull().default("Others"), // Social Media, Referral, Ads, Others
  packageSize: varchar("package_size"),
  website: varchar("website"),
  facebookPageUrl: varchar("facebook_page_url"),
  orderVolume: integer("order_volume"), // New field to replace removed ones
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Lead activities table (for completed/past activities)
export const interactions = pgTable("interactions", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type").notNull(), // call, email, meeting, note
  description: text("description"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Calendar events table (for upcoming/scheduled plans)
export const calendarEvents = pgTable("calendar_events", {
  id: serial("id").primaryKey(),
  title: varchar("title").notNull(),
  description: text("description"),
  startDate: timestamp("start_date").notNull(),
  endDate: timestamp("end_date").notNull(),
  type: varchar("type").notNull().default("meeting"), // meeting, call, task, reminder
  leadId: integer("lead_id").references(() => leads.id), // Optional - can be general events
  userId: varchar("user_id").references(() => users.id).notNull(),
  location: varchar("location"),
  isAllDay: boolean("is_all_day").default(false),
  reminderMinutes: integer("reminder_minutes").default(15), // Reminder before event
  status: varchar("status").notNull().default("scheduled"), // scheduled, completed, cancelled
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Targets table
export const targets = pgTable("targets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  targetType: varchar("target_type").notNull(), // revenue, leads, deals, orders, arpo, merchants
  targetValue: integer("target_value").notNull(),
  period: varchar("period").notNull(), // monthly, quarterly, annual
  description: text("description"),
  // New enhanced target fields
  orderTarget: integer("order_target"), // Number of orders target
  arpoTarget: integer("arpo_target"), // Average Revenue Per Order target (in Taka)
  merchantsAcquisition: integer("merchants_acquisition"), // Number of merchants to acquire
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers table - New structure based on merchant requirements
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  merchantCode: varchar("merchant_code").notNull().unique(),
  merchantName: varchar("merchant_name").notNull(),
  rateChart: varchar("rate_chart").notNull(), // ISD, Pheripheri, OSD
  contactPerson: varchar("contact_person").notNull(),
  phoneNumber: varchar("phone_number").notNull(),
  assignedAgent: varchar("assigned_agent").references(() => users.id).notNull(), // Employee ID
  leadId: integer("lead_id").references(() => leads.id), // Optional reference to original lead
  productType: varchar("product_type"),
  tags: text("tags"), // Comma-separated tags
  notes: text("notes"),
  createdBy: varchar("created_by").references(() => users.id).notNull(),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily revenue entries - Updated schema for super admin only
export const dailyRevenue = pgTable("daily_revenue", {
  id: serial("id").primaryKey(),
  assignedUser: varchar("assigned_user").references(() => users.id).notNull(), // Employee who earned the revenue
  merchantCode: varchar("merchant_code").notNull(), // Merchant code from customers table
  date: timestamp("date").notNull().defaultNow(),
  revenue: integer("revenue").notNull(), // Revenue amount in Taka
  orders: integer("orders").notNull().default(1), // Number of orders for the day
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id).notNull(), // Super admin who uploaded
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Notifications table
export const notifications = pgTable("notifications", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type").notNull(), // target_assigned, target_reminder, lead_update
  title: varchar("title").notNull(),
  message: text("message").notNull(),
  read: boolean("read").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

// Define relations
export const usersRelations = relations(users, ({ many }) => ({
  leads: many(leads),
  interactions: many(interactions),
  targets: many(targets),
  notifications: many(notifications),
  customers: many(customers),
  dailyRevenue: many(dailyRevenue),
}));

export const leadsRelations = relations(leads, ({ one, many }) => ({
  assignedUser: one(users, {
    fields: [leads.assignedTo],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [leads.createdBy],
    references: [users.id],
  }),
  interactions: many(interactions),
}));

export const interactionsRelations = relations(interactions, ({ one }) => ({
  lead: one(leads, {
    fields: [interactions.leadId],
    references: [leads.id],
  }),
  user: one(users, {
    fields: [interactions.userId],
    references: [users.id],
  }),
}));

export const targetsRelations = relations(targets, ({ one }) => ({
  user: one(users, {
    fields: [targets.userId],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [targets.createdBy],
    references: [users.id],
  }),
}));

export const customersRelations = relations(customers, ({ one }) => ({
  lead: one(leads, {
    fields: [customers.leadId],
    references: [leads.id],
  }),
  assignedAgent: one(users, {
    fields: [customers.assignedAgent],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [customers.createdBy],
    references: [users.id],
  }),
}));

export const dailyRevenueRelations = relations(dailyRevenue, ({ one }) => ({
  assignedUser: one(users, {
    fields: [dailyRevenue.assignedUser],
    references: [users.id],
  }),
  createdByUser: one(users, {
    fields: [dailyRevenue.createdBy],
    references: [users.id],
  }),
}));

export const notificationsRelations = relations(notifications, ({ one }) => ({
  user: one(users, {
    fields: [notifications.userId],
    references: [users.id],
  }),
}));

export const calendarEventsRelations = relations(calendarEvents, ({ one }) => ({
  user: one(users, {
    fields: [calendarEvents.userId],
    references: [users.id],
  }),
  lead: one(leads, {
    fields: [calendarEvents.leadId],
    references: [leads.id],
  }),
}));

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  createdAt: true,
  updatedAt: true,
}).extend({
  teamName: z.enum(["Sales Titans", "Revenue Rangers"]).optional(),
});



export const insertLeadSchema = createInsertSchema(leads).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  createdBy: true,
}).extend({
  contactName: z.string().min(2, "Contact name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().min(10, "Phone number must be at least 10 digits").optional(),
  company: z.string().min(2, "Company name must be at least 2 characters"),
  value: z.union([
    z.string().min(1, "Value is required").transform(val => {
      const num = parseInt(val);
      if (isNaN(num) || num < 0) throw new Error("Value must be a positive number");
      return num;
    }),
    z.number().min(0, "Value must be a positive number")
  ]),
  stage: z.enum(["prospecting", "qualification", "proposal", "negotiation", "closed_won", "closed_lost"]),
  assignedTo: z.string().optional(),
  // New enhanced fields
  leadSource: z.enum(["Social Media", "Referral", "Ads", "Others"]).default("Others"),
  packageSize: z.string().optional(),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  facebookPageUrl: z.string().url("Please enter a valid Facebook URL").optional().or(z.literal("")),
  orderVolume: z.union([
    z.string().min(1, "Order volume is required").transform(val => {
      const num = parseInt(val);
      if (isNaN(num) || num < 0) throw new Error("Order volume must be a positive number");
      return num;
    }),
    z.number().min(0, "Order volume must be a positive number")
  ]).optional(),
  notes: z.string().optional(),
});

export const insertInteractionSchema = createInsertSchema(interactions).omit({
  id: true,
  createdAt: true,
}).extend({
  completedAt: z.union([
    z.string().transform(val => val ? new Date(val) : undefined),
    z.date(),
    z.undefined()
  ]).optional(),
});

export const insertTargetSchema = createInsertSchema(targets).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.union([z.date(), z.string().transform(val => new Date(val))]).optional(),
  endDate: z.union([z.date(), z.string().transform(val => new Date(val))]).optional(),
  orderTarget: z.union([
    z.string().min(1).transform(val => {
      const num = parseInt(val);
      if (isNaN(num) || num < 0) throw new Error("Order target must be a positive number");
      return num;
    }),
    z.number().min(0, "Order target must be a positive number")
  ]).optional(),
  arpoTarget: z.union([
    z.string().min(1).transform(val => {
      const num = parseInt(val);
      if (isNaN(num) || num < 0) throw new Error("ARPO target must be a positive number");
      return num;
    }),
    z.number().min(0, "ARPO target must be a positive number")
  ]).optional(),
  merchantsAcquisition: z.union([
    z.string().min(1).transform(val => {
      const num = parseInt(val);
      if (isNaN(num) || num < 0) throw new Error("Merchants acquisition must be a positive number");
      return num;
    }),
    z.number().min(0, "Merchants acquisition must be a positive number")
  ]).optional(),
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  merchantCode: z.string().min(2, "Merchant code must be at least 2 characters"),
  merchantName: z.string().min(2, "Merchant name must be at least 2 characters"),
  rateChart: z.string().min(1, "Rate chart is required"),
  contactPerson: z.string().min(2, "Contact person must be at least 2 characters"),
  phoneNumber: z.string().min(10, "Phone number must be at least 10 digits"),
  assignedAgent: z.string().min(1, "Assigned agent is required"),
  leadId: z.union([
    z.string().min(1).transform(val => {
      const num = parseInt(val);
      if (isNaN(num)) throw new Error("Lead ID must be a number");
      return num;
    }),
    z.number()
  ]).optional(),
  productType: z.string().optional(),
  tags: z.string().optional(),
  notes: z.string().optional(),
});

export const insertDailyRevenueSchema = createInsertSchema(dailyRevenue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  assignedUser: z.string().min(1, "Assigned user is required"),
  merchantCode: z.string().min(1, "Merchant code is required"),
  createdBy: z.string().min(1, "Created by is required"),
  revenue: z.union([
    z.string().min(1, "Revenue is required").transform(val => {
      const num = parseInt(val);
      if (isNaN(num) || num < 0) throw new Error("Revenue must be a positive number");
      return num;
    }),
    z.number().min(0, "Revenue must be a positive number")
  ]),
  orders: z.union([
    z.string().min(1, "Orders count is required").transform(val => {
      const num = parseInt(val);
      if (isNaN(num) || num < 1) throw new Error("Orders must be at least 1");
      return num;
    }),
    z.number().min(1, "Orders must be at least 1")
  ]).default(1),
  description: z.string().optional(),
});

// Types
// Authentication schemas
export const loginSchema = z.object({
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(6, "Password must be at least 6 characters"),
  confirmPassword: z.string().min(6, "Please confirm your password"),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

export const verifyCodeSchema = z.object({
  email: z.string().email(),
  code: z.string().length(6, "Code must be 6 digits"),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;
export type InsertLead = z.infer<typeof insertLeadSchema>;
export type Lead = typeof leads.$inferSelect;
export type InsertInteraction = z.infer<typeof insertInteractionSchema>;
export type Interaction = typeof interactions.$inferSelect;
export type InsertTarget = z.infer<typeof insertTargetSchema>;
export type Target = typeof targets.$inferSelect;
export type InsertNotification = z.infer<typeof insertNotificationSchema>;
export type Notification = typeof notifications.$inferSelect;
export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = typeof customers.$inferInsert;
export type DailyRevenue = typeof dailyRevenue.$inferSelect;
export type InsertDailyRevenue = typeof dailyRevenue.$inferInsert;

// Calendar Events
export const insertCalendarEventSchema = createInsertSchema(calendarEvents).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  startDate: z.union([z.string(), z.date()]),
  endDate: z.union([z.string(), z.date()]),
});

export type CalendarEvent = typeof calendarEvents.$inferSelect;
export type InsertCalendarEvent = z.infer<typeof insertCalendarEventSchema>;

// Enhanced calendar event type with user and lead information
export type EnhancedCalendarEvent = CalendarEvent & {
  userName?: string | null;
  userEmail?: string | null; 
  leadContactName?: string | null;
};
