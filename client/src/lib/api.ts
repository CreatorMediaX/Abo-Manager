import { Subscription } from "./types";

interface ApiResponse<T> {
  data?: T;
  error?: string;
}

// CONVERSION HELPERS: Backend stores prices as cents (integer)
const toCents = (price: number): number => Math.round(price * 100);
const fromCents = (cents: number): number => cents / 100;

function toBackendFormat(sub: any): any {
  return {
    ...sub,
    price: toCents(sub.price),
  };
}

function fromBackendFormat(sub: any): Subscription {
  return {
    ...sub,
    price: fromCents(sub.price),
  };
}

// API CLIENT
export const api = {
  // AUTH
  async register(email: string, name: string, password: string) {
    const res = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, name, password }),
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Registration failed");
    }
    return res.json();
  },

  async login(email: string, password: string) {
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Login failed");
    }
    return res.json();
  },

  async logout() {
    const res = await fetch("/api/auth/logout", {
      method: "POST",
      credentials: "include",
    });
    return res.json();
  },

  async me() {
    const res = await fetch("/api/auth/me", {
      credentials: "include",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.user;
  },

  // SUBSCRIPTIONS
  async getSubscriptions(): Promise<Subscription[]> {
    const res = await fetch("/api/subscriptions", {
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to fetch subscriptions");
    const data = await res.json();
    return data.map(fromBackendFormat);
  },

  async createSubscription(subscription: any): Promise<Subscription> {
    const res = await fetch("/api/subscriptions", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(toBackendFormat(subscription)),
      credentials: "include",
    });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Failed to create subscription");
    }
    const data = await res.json();
    return fromBackendFormat(data);
  },

  async updateSubscription(id: string, updates: Partial<Subscription>): Promise<Subscription> {
    const backendUpdates = updates.price !== undefined 
      ? { ...updates, price: toCents(updates.price) }
      : updates;
      
    const res = await fetch(`/api/subscriptions/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(backendUpdates),
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to update subscription");
    const data = await res.json();
    return fromBackendFormat(data);
  },

  async deleteSubscription(id: string): Promise<void> {
    const res = await fetch(`/api/subscriptions/${id}`, {
      method: "DELETE",
      credentials: "include",
    });
    if (!res.ok) throw new Error("Failed to delete subscription");
  },

  async migrateSubscriptions(subscriptions: Subscription[]): Promise<number> {
    const backendSubs = subscriptions.map(toBackendFormat);
    const res = await fetch("/api/subscriptions/migrate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscriptions: backendSubs }),
      credentials: "include",
    });
    if (!res.ok) throw new Error("Migration failed");
    const data = await res.json();
    return data.imported;
  },
};
