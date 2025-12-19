import { eq, and, desc, sql } from "drizzle-orm";
import { db } from "../db/index";
import { 
  users, subscriptions, importJobs, transactions,
  type User, type InsertUser, 
  type Subscription, type InsertSubscription,
  type ImportJob, type InsertImportJob,
  type Transaction, type InsertTransaction
} from "@shared/schema";

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
  
  // Import job methods
  createImportJob(userId: string, job: InsertImportJob): Promise<ImportJob>;
  getImportJobs(userId: string): Promise<ImportJob[]>;
  updateImportJob(id: string, userId: string, updates: Partial<InsertImportJob>): Promise<ImportJob | undefined>;
  
  // Transaction methods
  createTransactions(userId: string, transactions: InsertTransaction[]): Promise<Transaction[]>;
  getTransactions(userId: string, importJobId?: string): Promise<Transaction[]>;
  linkTransactionToSubscription(transactionId: string, subscriptionId: string, userId: string): Promise<boolean>;
  ignoreTransaction(transactionId: string, userId: string): Promise<boolean>;
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

  // IMPORT JOB METHODS
  async createImportJob(userId: string, job: InsertImportJob): Promise<ImportJob> {
    const [created] = await db.insert(importJobs).values({
      ...job,
      userId,
    } as any).returning();
    return created;
  }

  async getImportJobs(userId: string): Promise<ImportJob[]> {
    return db.select().from(importJobs)
      .where(eq(importJobs.userId, userId))
      .orderBy(desc(importJobs.createdAt));
  }

  async updateImportJob(id: string, userId: string, updates: Partial<InsertImportJob>): Promise<ImportJob | undefined> {
    const [updated] = await db.update(importJobs)
      .set(updates as any)
      .where(and(eq(importJobs.id, id), eq(importJobs.userId, userId)))
      .returning();
    return updated;
  }

  // TRANSACTION METHODS
  async createTransactions(userId: string, txs: InsertTransaction[]): Promise<Transaction[]> {
    if (txs.length === 0) return [];
    
    const values = txs.map(tx => ({
      ...tx,
      userId,
    }));
    
    const created = await db.insert(transactions).values(values as any).returning();
    return created;
  }

  async getTransactions(userId: string, importJobId?: string): Promise<Transaction[]> {
    if (importJobId) {
      return db.select().from(transactions)
        .where(and(
          eq(transactions.userId, userId),
          eq(transactions.importJobId, importJobId)
        ))
        .orderBy(desc(transactions.date));
    }
    
    return db.select().from(transactions)
      .where(eq(transactions.userId, userId))
      .orderBy(desc(transactions.date));
  }

  async linkTransactionToSubscription(transactionId: string, subscriptionId: string, userId: string): Promise<boolean> {
    const result = await db.update(transactions)
      .set({ subscriptionId })
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }

  async ignoreTransaction(transactionId: string, userId: string): Promise<boolean> {
    const result = await db.update(transactions)
      .set({ ignored: true })
      .where(and(eq(transactions.id, transactionId), eq(transactions.userId, userId)));
    return result.rowCount ? result.rowCount > 0 : false;
  }
}

export const storage = new DatabaseStorage();
