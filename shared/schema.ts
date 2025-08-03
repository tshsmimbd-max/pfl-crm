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
  emailVerified: boolean("email_verified").default(false),
  verificationCode: varchar("verification_code"),
  codeExpiresAt: timestamp("code_expires_at"),
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
  preferredPickTime: text("preferred_pick_time"),
  pickupAddress: text("pickup_address"),
  website: varchar("website"),
  facebookPageUrl: varchar("facebook_page_url"),
  customerType: varchar("customer_type").notNull().default("new"), // new, returning
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customer interactions table
export const interactions = pgTable("interactions", {
  id: serial("id").primaryKey(),
  leadId: integer("lead_id").references(() => leads.id),
  userId: varchar("user_id").references(() => users.id),
  type: varchar("type").notNull(), // call, email, meeting, note
  subject: varchar("subject").notNull(),
  description: text("description"),
  scheduledAt: timestamp("scheduled_at"),
  completedAt: timestamp("completed_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// Targets table
export const targets = pgTable("targets", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  targetType: varchar("target_type").notNull(), // revenue, leads, deals
  targetValue: integer("target_value").notNull(),
  period: varchar("period").notNull(), // monthly, quarterly, annual
  description: text("description"),
  startDate: timestamp("start_date").defaultNow(),
  endDate: timestamp("end_date"),
  createdBy: varchar("created_by").references(() => users.id),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Customers table (converted from won leads)
export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  originalLeadId: integer("original_lead_id").references(() => leads.id),
  contactName: varchar("contact_name").notNull(),
  email: varchar("email").notNull(),
  phone: varchar("phone"),
  company: varchar("company").notNull(),
  totalValue: integer("total_value").notNull(), // Value from the original lead
  assignedTo: varchar("assigned_to").references(() => users.id),
  convertedBy: varchar("converted_by").references(() => users.id),
  convertedAt: timestamp("converted_at").defaultNow(),
  // Enhanced customer fields based on lead fields
  leadSource: varchar("lead_source"),
  packageSize: varchar("package_size"),
  preferredPickTime: text("preferred_pick_time"),
  pickupAddress: text("pickup_address"),
  website: text("website"),
  facebookPageUrl: text("facebook_page_url"),
  customerType: varchar("customer_type").default("new"), // new, returning
  notes: text("notes"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// Daily revenue entries
export const dailyRevenue = pgTable("daily_revenue", {
  id: serial("id").primaryKey(),
  userId: varchar("user_id").references(() => users.id),
  customerId: integer("customer_id").references(() => customers.id),
  date: timestamp("date").notNull(),
  revenue: integer("revenue").notNull(), // Daily revenue amount
  orders: integer("orders").notNull().default(1), // Number of orders
  description: text("description"),
  createdBy: varchar("created_by").references(() => users.id),
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

export const customersRelations = relations(customers, ({ one, many }) => ({
  originalLead: one(leads, {
    fields: [customers.originalLeadId],
    references: [leads.id],
  }),
  assignedUser: one(users, {
    fields: [customers.assignedTo],
    references: [users.id],
  }),
  convertedByUser: one(users, {
    fields: [customers.convertedBy],
    references: [users.id],
  }),
  dailyRevenue: many(dailyRevenue),
}));

export const dailyRevenueRelations = relations(dailyRevenue, ({ one }) => ({
  user: one(users, {
    fields: [dailyRevenue.userId],
    references: [users.id],
  }),
  customer: one(customers, {
    fields: [dailyRevenue.customerId],
    references: [customers.id],
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
  preferredPickTime: z.union([
    z.date(),
    z.string().transform(val => val ? new Date(val) : null)
  ]).optional().nullable(),
  pickupAddress: z.string().optional(),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  facebookPageUrl: z.string().url("Please enter a valid Facebook URL").optional().or(z.literal("")),
  customerType: z.enum(["new", "returning"]).default("new"),
  notes: z.string().optional(),
});

export const insertInteractionSchema = createInsertSchema(interactions).omit({
  id: true,
  createdAt: true,
}).extend({
  scheduledAt: z.union([
    z.string().transform(val => val ? new Date(val) : undefined),
    z.date(),
    z.undefined()
  ]).optional(),
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
});

export const insertNotificationSchema = createInsertSchema(notifications).omit({
  id: true,
  createdAt: true,
});

export const insertCustomerSchema = createInsertSchema(customers).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
  convertedAt: true,
}).extend({
  contactName: z.string().min(2, "Contact name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email address"),
  phone: z.string().optional(),
  company: z.string().min(2, "Company name must be at least 2 characters"),
  totalValue: z.union([
    z.string().min(1, "Value is required").transform(val => {
      const num = parseInt(val);
      if (isNaN(num) || num < 0) throw new Error("Value must be a positive number");
      return num;
    }),
    z.number().min(0, "Value must be a positive number")
  ]),
  // Enhanced customer fields
  leadSource: z.enum(["Social Media", "Referral", "Ads", "Others"]).default("Others"),
  packageSize: z.string().optional().nullable(),
  preferredPickTime: z.string().optional().nullable(),
  pickupAddress: z.string().optional().nullable(),
  website: z.string().optional().nullable(),
  facebookPageUrl: z.string().optional().nullable(),
  customerType: z.enum(["new", "returning"]).default("new"),
  notes: z.string().optional().nullable(),
});

export const insertDailyRevenueSchema = createInsertSchema(dailyRevenue).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  date: z.union([z.string(), z.date()]),
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
