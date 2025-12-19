import { Subscription, subscriptionSchema } from "./types";
import { toast } from "@/hooks/use-toast";

// MOCK SERVER DELAY
const DELAY = 600;

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: "success" | "error";
}

// SIMULATED REMOTE DATABASE (Persisted in localStorage under a different namespace to mimic server)
const SERVER_DB_KEY = "subcontrol_server_db_v1";

const getServerDB = (): Record<string, Subscription[]> => {
  try {
    return JSON.parse(localStorage.getItem(SERVER_DB_KEY) || "{}");
  } catch {
    return {};
  }
};

const saveServerDB = (db: Record<string, Subscription[]>) => {
  localStorage.setItem(SERVER_DB_KEY, JSON.stringify(db));
};

// REMOTE API ADAPTER
export const RemoteApi = {
  async list(userId: string): Promise<ApiResponse<Subscription[]>> {
    await new Promise(r => setTimeout(r, DELAY));
    const db = getServerDB();
    return { status: "success", data: db[userId] || [] };
  },

  async create(userId: string, sub: Subscription): Promise<ApiResponse<Subscription>> {
    await new Promise(r => setTimeout(r, DELAY));
    const db = getServerDB();
    const userSubs = db[userId] || [];
    
    // Server-side validation simulation
    const validation = subscriptionSchema.safeParse(sub);
    if (!validation.success) return { status: "error", error: "Invalid data format" };

    const newSubs = [...userSubs, sub];
    db[userId] = newSubs;
    saveServerDB(db);
    return { status: "success", data: sub };
  },

  async update(userId: string, sub: Subscription): Promise<ApiResponse<Subscription>> {
    await new Promise(r => setTimeout(r, DELAY));
    const db = getServerDB();
    const userSubs = db[userId] || [];
    const index = userSubs.findIndex(s => s.id === sub.id);
    
    if (index === -1) return { status: "error", error: "Subscription not found" };
    
    userSubs[index] = sub;
    db[userId] = userSubs;
    saveServerDB(db);
    return { status: "success", data: sub };
  },

  async delete(userId: string, subId: string): Promise<ApiResponse<void>> {
    await new Promise(r => setTimeout(r, DELAY));
    const db = getServerDB();
    const userSubs = db[userId] || [];
    db[userId] = userSubs.filter(s => s.id !== subId);
    saveServerDB(db);
    return { status: "success" };
  },
  
  // Batch import for migration
  async importBatch(userId: string, subs: Subscription[]): Promise<ApiResponse<number>> {
    await new Promise(r => setTimeout(r, DELAY * 1.5));
    const db = getServerDB();
    const current = db[userId] || [];
    // Merge logic: avoid duplicates by ID
    const currentIds = new Set(current.map(s => s.id));
    const newUnique = subs.filter(s => !currentIds.has(s.id));
    
    db[userId] = [...current, ...newUnique];
    saveServerDB(db);
    return { status: "success", data: newUnique.length };
  }
};

// LOCAL API ADAPTER (Offline/Guest)
const LOCAL_STORAGE_KEY = "subcontrol_subscriptions_v1"; // Legacy key for guest/offline

export const LocalApi = {
  list(): Subscription[] {
    try {
      const stored = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      return parsed.filter((i: any) => subscriptionSchema.safeParse(i).success);
    } catch {
      return [];
    }
  },

  save(subs: Subscription[]) {
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(subs));
  },

  create(sub: Subscription) {
    const current = this.list();
    this.save([...current, sub]);
    return sub;
  },

  update(sub: Subscription) {
    const current = this.list();
    const updated = current.map(s => s.id === sub.id ? sub : s);
    this.save(updated);
    return sub;
  },

  delete(subId: string) {
    const current = this.list();
    this.save(current.filter(s => s.id !== subId));
  },
  
  clear() {
    localStorage.removeItem(LOCAL_STORAGE_KEY);
  }
};
