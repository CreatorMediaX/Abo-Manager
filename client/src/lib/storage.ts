import { useState, useEffect, useCallback } from "react";
import { Subscription } from "./types";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/lib/auth";
import { api } from "@/lib/api";
import { LocalApi } from "@/lib/api-adapter";

export function useSubscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);

  // FETCH DATA
  const fetchSubscriptions = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      if (user) {
        // REMOTE MODE - Real API
        const data = await api.getSubscriptions();
        setSubscriptions(data);
      } else {
        // LOCAL MODE - Guest/Offline
        const localData = LocalApi.list();
        setSubscriptions(localData);
      }
    } catch (e: any) {
      console.error("Fetch error:", e);
      setError(e.message || "Network error occurred");
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Initial load
  useEffect(() => {
    fetchSubscriptions();
  }, [fetchSubscriptions]);

  // ACTIONS
  const addSubscription = async (sub: Omit<Subscription, "id">) => {
    // Optimistic UI Update
    const tempId = crypto.randomUUID();
    const newSub: Subscription = { ...sub, id: tempId } as Subscription;
    const prevSubs = [...subscriptions];
    setSubscriptions(prev => [...prev, newSub]);

    try {
      if (user) {
        const created = await api.createSubscription(sub);
        setSubscriptions(prev => prev.map(s => s.id === tempId ? created : s));
        toast({ title: "Saved to Cloud", description: "Subscription secured." });
      } else {
        LocalApi.create(newSub);
        toast({ title: "Saved Locally", description: "Login to sync across devices." });
      }
    } catch (e: any) {
      setSubscriptions(prevSubs);
      toast({ title: "Save Failed", description: e.message, variant: "destructive" });
    }
  };

  const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
    const prevSubs = [...subscriptions];
    const target = subscriptions.find(s => s.id === id);
    if (!target) return;

    const updatedSub = { ...target, ...updates };
    setSubscriptions(prev => prev.map(s => s.id === id ? updatedSub : s));

    try {
      if (user) {
        await api.updateSubscription(id, updates);
      } else {
        LocalApi.update(updatedSub);
      }
      toast({ title: "Updated", duration: 1500 });
    } catch (e: any) {
      setSubscriptions(prevSubs);
      toast({ title: "Update Failed", description: e.message, variant: "destructive" });
    }
  };

  const removeSubscription = async (id: string) => {
    const prevSubs = [...subscriptions];
    setSubscriptions(prev => prev.filter(s => s.id !== id));

    try {
      if (user) {
        await api.deleteSubscription(id);
      } else {
        LocalApi.delete(id);
      }
      toast({ title: "Removed" });
    } catch (e: any) {
      setSubscriptions(prevSubs);
      toast({ title: "Remove Failed", description: e.message, variant: "destructive" });
    }
  };

  const cancelSubscription = (id: string) => {
    const today = new Date().toISOString().split("T")[0];
    updateSubscription(id, { active: false, cancellationDate: today });
  };

  // MIGRATION TOOL
  const migrateLocalToServer = async () => {
    if (!user) return;
    setIsSyncing(true);
    try {
      const localSubs = LocalApi.list();
      if (localSubs.length === 0) {
        toast({ title: "Nothing to migrate", description: "No local data found." });
        return;
      }
      
      const count = await api.migrateSubscriptions(localSubs);
      toast({ title: "Migration Successful", description: `Moved ${count} subscriptions to your account.` });
      LocalApi.clear();
      fetchSubscriptions();
    } catch (e: any) {
      toast({ title: "Migration Failed", description: e.message, variant: "destructive" });
    } finally {
      setIsSyncing(false);
    }
  };

  // EXPORT / IMPORT TOOLS
  const exportData = () => {
    const json = JSON.stringify(subscriptions, null, 2);
    const blob = new Blob([json], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `subcontrol_backup_${user ? 'cloud' : 'local'}_${new Date().toISOString().slice(0,10)}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    toast({ title: "Backup Created", description: "Keep this file safe." });
  };

  return {
    subscriptions,
    loading,
    error,
    isSyncing,
    addSubscription,
    updateSubscription,
    removeSubscription,
    cancelSubscription,
    exportData,
    migrateLocalToServer
  };
}
