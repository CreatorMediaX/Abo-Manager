import { sql } from "drizzle-orm";
import { pgTable, text, varchar, integer, boolean, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// USERS TABLE
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  password: text("password").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
});

export const insertUserSchema = createInsertSchema(users).omit({ 
  id: true, 
  createdAt: true 
});

export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

// SUBSCRIPTIONS TABLE
export const subscriptions = pgTable("subscriptions", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  
  name: text("name").notNull(),
  providerId: text("provider_id"),
  price: integer("price").notNull(), // Store as cents to avoid floating point issues
  currency: text("currency").notNull().default("EUR"),
  interval: text("interval").notNull().default("monthly"),
  
  startDate: text("start_date").notNull(),
  nextPaymentDate: text("next_payment_date").notNull(),
  noticePeriodDays: integer("notice_period_days").notNull().default(30),
  
  paymentMethod: text("payment_method").notNull().default("Other"),
  category: text("category").notNull().default("Other"),
  notes: text("notes"),
  
  active: boolean("active").notNull().default(true),
  status: text("status").notNull().default("active"),
  cancellationDate: text("cancellation_date"),
  
  documents: jsonb("documents").$type<Array<{
    id: string;
    name: string;
    type: string;
    date: string;
    notes?: string;
    status: string;
  }>>().default([]),
  
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});

export const insertSubscriptionSchema = createInsertSchema(subscriptions).omit({ 
  id: true, 
  userId: true, 
  createdAt: true, 
  updatedAt: true 
});

export type InsertSubscription = z.infer<typeof insertSubscriptionSchema>;
export type Subscription = typeof subscriptions.$inferSelect;
