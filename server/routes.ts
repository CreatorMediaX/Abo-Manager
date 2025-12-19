import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import connectPg from "connect-pg-simple";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { insertSubscriptionSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";
import pkg from "pg";
const { Pool } = pkg;

const scryptAsync = promisify(scrypt);

// PASSWORD HASHING
async function hashPassword(password: string): Promise<string> {
  const salt = randomBytes(16).toString("hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

async function verifyPassword(password: string, hash: string): Promise<boolean> {
  const [salt, key] = hash.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derivedKey = (await scryptAsync(password, salt, 64)) as Buffer;
  return timingSafeEqual(keyBuffer, derivedKey);
}

// AUTHENTICATION MIDDLEWARE
function requireAuth(req: any, res: any, next: any) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ error: "Unauthorized" });
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // SESSION STORE WITH POSTGRESQL
  const PgSession = connectPg(session);
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
  });

  // Create session table if it doesn't exist
  await pool.query(`
    CREATE TABLE IF NOT EXISTS "session" (
      "sid" varchar NOT NULL COLLATE "default",
      "sess" json NOT NULL,
      "expire" timestamp(6) NOT NULL
    )
    WITH (OIDS=FALSE);
    
    ALTER TABLE "session" ADD CONSTRAINT "session_pkey" PRIMARY KEY ("sid") NOT DEFERRABLE INITIALLY IMMEDIATE;
    
    CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON "session" ("expire");
  `).catch(() => {
    // Table might already exist, ignore error
  });

  // SESSION & PASSPORT SETUP
  app.use(
    session({
      store: new PgSession({
        pool,
        tableName: 'session',
      }),
      secret: process.env.SESSION_SECRET || "subcontrol-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        httpOnly: true,
        secure: false, // Set to false for development
        sameSite: 'lax',
      },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  // PASSPORT STRATEGY
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Invalid credentials" });
          }
          const isValid = await verifyPassword(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Invalid credentials" });
          }
          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // AUTH ROUTES - ALL MUST RETURN JSON
  app.post("/api/auth/register", async (req, res) => {
    try {
      console.log("[DEV] POST /api/auth/register - Request body:", req.body);
      
      const { email, password, name } = req.body;
      
      // Validate input
      if (!email || !password || !name) {
        console.log("[DEV] Register failed: Missing fields");
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if user exists
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        console.log("[DEV] Register failed: Email already exists");
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({ email, name, password: passwordHash });
      
      console.log("[DEV] User created successfully:", user.id);
      
      // Auto-login after registration
      req.login(user, (err) => {
        if (err) {
          console.error("[DEV] Login after register failed:", err);
          return res.status(500).json({ error: "Registration successful but login failed. Please login manually." });
        }
        const { password: _, ...userWithoutPassword } = user;
        console.log("[DEV] Register successful, user logged in");
        return res.status(201).json({ user: userWithoutPassword });
      });
    } catch (error: any) {
      console.error("[DEV] Register error:", error);
      return res.status(500).json({ error: error.message || "Registration failed" });
    }
  });

  app.post("/api/auth/login", (req, res) => {
    console.log("[DEV] POST /api/auth/login - Email:", req.body.email);
    
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) {
        console.error("[DEV] Login error:", err);
        return res.status(500).json({ error: "Internal server error" });
      }
      if (!user) {
        console.log("[DEV] Login failed:", info?.message);
        return res.status(401).json({ error: info?.message || "Invalid credentials" });
      }
      req.login(user, (err) => {
        if (err) {
          console.error("[DEV] Session creation failed:", err);
          return res.status(500).json({ error: "Login failed" });
        }
        const { password: _, ...userWithoutPassword } = user;
        console.log("[DEV] Login successful:", user.id);
        return res.json({ user: userWithoutPassword });
      });
    })(req, res);
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout((err) => {
      if (err) {
        console.error("[DEV] Logout error:", err);
        return res.status(500).json({ error: "Logout failed" });
      }
      console.log("[DEV] Logout successful");
      return res.json({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, (req: any, res) => {
    const { password: _, ...userWithoutPassword } = req.user;
    res.json({ user: userWithoutPassword });
  });

  // SUBSCRIPTION ROUTES
  app.get("/api/subscriptions", requireAuth, async (req: any, res) => {
    try {
      const subs = await storage.getSubscriptions(req.user.id);
      res.json(subs);
    } catch (error: any) {
      console.error("[DEV] Get subscriptions error:", error);
      res.status(500).json({ error: error.message || "Failed to fetch subscriptions" });
    }
  });

  app.post("/api/subscriptions", requireAuth, async (req: any, res) => {
    try {
      const validation = insertSubscriptionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      
      const subscription = await storage.createSubscription(req.user.id, validation.data);
      res.status(201).json(subscription);
    } catch (error: any) {
      console.error("[DEV] Create subscription error:", error);
      res.status(500).json({ error: error.message || "Failed to create subscription" });
    }
  });

  app.patch("/api/subscriptions/:id", requireAuth, async (req: any, res) => {
    try {
      const updated = await storage.updateSubscription(req.params.id, req.user.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      res.json(updated);
    } catch (error: any) {
      console.error("[DEV] Update subscription error:", error);
      res.status(500).json({ error: error.message || "Failed to update subscription" });
    }
  });

  app.delete("/api/subscriptions/:id", requireAuth, async (req: any, res) => {
    try {
      const deleted = await storage.deleteSubscription(req.params.id, req.user.id);
      if (!deleted) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      res.json({ success: true });
    } catch (error: any) {
      console.error("[DEV] Delete subscription error:", error);
      res.status(500).json({ error: error.message || "Failed to delete subscription" });
    }
  });

  // MIGRATION ENDPOINT - Import local data to server
  app.post("/api/subscriptions/migrate", requireAuth, async (req: any, res) => {
    try {
      const { subscriptions: localSubs } = req.body;
      if (!Array.isArray(localSubs)) {
        return res.status(400).json({ error: "Invalid data format" });
      }

      let imported = 0;
      for (const sub of localSubs) {
        try {
          const validation = insertSubscriptionSchema.safeParse(sub);
          if (validation.success) {
            await storage.createSubscription(req.user.id, validation.data);
            imported++;
          }
        } catch (e) {
          console.error("[DEV] Failed to import subscription:", e);
        }
      }

      res.json({ imported });
    } catch (error: any) {
      console.error("[DEV] Migration error:", error);
      res.status(500).json({ error: error.message || "Migration failed" });
    }
  });

  return httpServer;
}
