import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";
import { insertSubscriptionSchema } from "@shared/schema";
import { z } from "zod";
import { fromZodError } from "zod-validation-error";

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
  // SESSION & PASSPORT SETUP
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "subcontrol-secret-key-change-in-production",
      resave: false,
      saveUninitialized: false,
      cookie: {
        maxAge: 1000 * 60 * 60 * 24 * 7, // 1 week
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
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

  // AUTH ROUTES
  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const { email, password, name } = req.body;
      
      // Validate input
      if (!email || !password || !name) {
        return res.status(400).json({ error: "Missing required fields" });
      }

      // Check if user exists
      const existing = await storage.getUserByEmail(email);
      if (existing) {
        return res.status(400).json({ error: "Email already registered" });
      }

      // Hash password and create user
      const passwordHash = await hashPassword(password);
      const user = await storage.createUser({ email, name, password: passwordHash });
      
      // Auto-login after registration
      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/login", (req, res, next) => {
    passport.authenticate("local", (err: any, user: any, info: any) => {
      if (err) return next(err);
      if (!user) {
        return res.status(401).json({ error: info?.message || "Login failed" });
      }
      req.login(user, (err) => {
        if (err) return next(err);
        const { password: _, ...userWithoutPassword } = user;
        res.json({ user: userWithoutPassword });
      });
    })(req, res, next);
  });

  app.post("/api/auth/logout", (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.json({ success: true });
    });
  });

  app.get("/api/auth/me", requireAuth, (req: any, res) => {
    const { password: _, ...userWithoutPassword } = req.user;
    res.json({ user: userWithoutPassword });
  });

  // SUBSCRIPTION ROUTES
  app.get("/api/subscriptions", requireAuth, async (req: any, res, next) => {
    try {
      const subs = await storage.getSubscriptions(req.user.id);
      res.json(subs);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/subscriptions", requireAuth, async (req: any, res, next) => {
    try {
      const validation = insertSubscriptionSchema.safeParse(req.body);
      if (!validation.success) {
        return res.status(400).json({ error: fromZodError(validation.error).message });
      }
      
      const subscription = await storage.createSubscription(req.user.id, validation.data);
      res.status(201).json(subscription);
    } catch (error) {
      next(error);
    }
  });

  app.patch("/api/subscriptions/:id", requireAuth, async (req: any, res, next) => {
    try {
      const updated = await storage.updateSubscription(req.params.id, req.user.id, req.body);
      if (!updated) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      res.json(updated);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/subscriptions/:id", requireAuth, async (req: any, res, next) => {
    try {
      const deleted = await storage.deleteSubscription(req.params.id, req.user.id);
      if (!deleted) {
        return res.status(404).json({ error: "Subscription not found" });
      }
      res.json({ success: true });
    } catch (error) {
      next(error);
    }
  });

  // MIGRATION ENDPOINT - Import local data to server
  app.post("/api/subscriptions/migrate", requireAuth, async (req: any, res, next) => {
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
          // Skip invalid items
          console.error("Failed to import subscription:", e);
        }
      }

      res.json({ imported });
    } catch (error) {
      next(error);
    }
  });

  return httpServer;
}
