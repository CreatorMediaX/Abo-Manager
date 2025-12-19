import { useState, useEffect, useCallback } from "react";
import { Subscription } from "./types";
import { toast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { useAuth } from "@/lib/auth";
import { LocalApi, RemoteApi } from "@/lib/api-adapter";

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
        // REMOTE MODE
        const response = await RemoteApi.list(user.id);
        if (response.status === "success" && response.data) {
          setSubscriptions(response.data);
        } else {
          setError(response.error || "Failed to fetch from server");
        }
      } else {
        // LOCAL MODE
        const localData = LocalApi.list();
        setSubscriptions(localData);
      }
    } catch (e) {
      console.error("Fetch error:", e);
      setError("Network error occurred");
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
    const newSub: Subscription = { ...sub, id: crypto.randomUUID() };
    
    // Optimistic UI Update
    const prevSubs = [...subscriptions];
    setSubscriptions(prev => [...prev, newSub]);

    try {
      if (user) {
        const res = await RemoteApi.create(user.id, newSub);
        if (res.status === "error") throw new Error(res.error);
        toast({ title: "Saved to Cloud", description: "Subscription secure." });
      } else {
        LocalApi.create(newSub);
        toast({ title: "Saved Locally", description: "Login to sync." });
      }
    } catch (e) {
      // Revert optimistic update
      setSubscriptions(prevSubs);
      toast({ title: "Save Failed", description: "Could not save subscription.", variant: "destructive" });
    }
  };

  const updateSubscription = async (id: string, updates: Partial<Subscription>) => {
    const prevSubs = [...subscriptions];
    const target = subscriptions.find(s => s.id === id);
    if (!target) return;

    const updatedSub = { ...target, ...updates };

    // Optimistic Update
    setSubscriptions(prev => prev.map(s => s.id === id ? updatedSub : s));

    try {
      if (user) {
        const res = await RemoteApi.update(user.id, updatedSub);
        if (res.status === "error") throw new Error(res.error);
      } else {
        LocalApi.update(updatedSub);
      }
      toast({ title: "Updated", duration: 1500 });
    } catch (e) {
      setSubscriptions(prevSubs);
      toast({ title: "Update Failed", variant: "destructive" });
    }
  };

  const removeSubscription = async (id: string) => {
    const prevSubs = [...subscriptions];
    
    // Optimistic Update
    setSubscriptions(prev => prev.filter(s => s.id !== id));

    try {
      if (user) {
        const res = await RemoteApi.delete(user.id, id);
        if (res.status === "error") throw new Error(res.error);
      } else {
        LocalApi.delete(id);
      }
      toast({ title: "Removed" });
    } catch (e) {
      setSubscriptions(prevSubs);
      toast({ title: "Remove Failed", variant: "destructive" });
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
      
      const res = await RemoteApi.importBatch(user.id, localSubs);
      if (res.status === "success") {
        toast({ title: "Migration Successful", description: `Moved ${res.data} subscriptions to your account.` });
        LocalApi.clear(); // Clean up local
        fetchSubscriptions(); // Refresh view
      } else {
        throw new Error(res.error);
      }
    } catch (e) {
      toast({ title: "Migration Failed", description: "Please try again.", variant: "destructive" });
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
    link.download = `subcontrol_backup_${user ? 'user' : 'local'}_${new Date().toISOString().slice(0,10)}.json`;
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
