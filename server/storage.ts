import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/index";
import { users, subscriptions, type User, type InsertUser, type Subscription, type InsertSubscription } from "@shared/schema";

export interface IStorage {
  // User methods
  getUser(id: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  
  // Subscription methods
  getSubscriptions(userId: string): Promise<Subscription[]>;
  getSubscription(id: string, userId: string): Promise<Subscription | undefined>;
  createSubscription(userId: string, subscription: InsertSubscription): Promise<Subscription>;
  updateSubscription(id: string, userId: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined>;
  deleteSubscription(id: string, userId: string): Promise<boolean>;
}

export class DatabaseStorage implements IStorage {
  // USER METHODS
  async getUser(id: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user;
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  // SUBSCRIPTION METHODS
  async getSubscriptions(userId: string): Promise<Subscription[]> {
    return db.select().from(subscriptions).where(eq(subscriptions.userId, userId)).orderBy(desc(subscriptions.createdAt));
  }

  async getSubscription(id: string, userId: string): Promise<Subscription | undefined> {
    const [subscription] = await db.select().from(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
      .limit(1);
    return subscription;
  }

  async createSubscription(userId: string, subscription: InsertSubscription): Promise<Subscription> {
    const [created] = await db.insert(subscriptions).values({
      ...subscription,
      userId,
    } as any).returning();
    return created;
  }

  async updateSubscription(id: string, userId: string, updates: Partial<InsertSubscription>): Promise<Subscription | undefined> {
    const [updated] = await db.update(subscriptions)
      .set({ ...updates, updatedAt: sql`NOW()` } as any)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)))
      .returning();
    return updated;
  }

  async deleteSubscription(id: string, userId: string): Promise<boolean> {
    const result = await db.delete(subscriptions)
      .where(and(eq(subscriptions.id, id), eq(subscriptions.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DatabaseStorage();
