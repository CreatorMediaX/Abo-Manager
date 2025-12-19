import { useState, useEffect } from "react";
import { Subscription, subscriptionSchema } from "./types";
import { toast } from "@/hooks/use-toast";
import Papa from "papaparse";
import { useAuth } from "@/lib/auth";

export function useSubscriptions() {
  const { user } = useAuth();
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([]);
  const [loading, setLoading] = useState(true);

  // Storage key now depends on user ID
  const storageKey = user ? `subcontrol_subscriptions_${user.id}` : null;

  // Load from local storage on mount or when user changes
  useEffect(() => {
    if (!storageKey) {
      setSubscriptions([]);
      setLoading(false);
      return;
    }

    try {
      console.debug(`[SubControl] Loading subscriptions for key: ${storageKey}`);
      const stored = localStorage.getItem(storageKey);
      if (stored) {
        const parsed = JSON.parse(stored);
        console.debug(`[SubControl] Found ${parsed.length} subscriptions in storage`);
        // Validate schema roughly, filter out invalid ones or migrate
        const validSubs = parsed.filter((item: any) => {
          const result = subscriptionSchema.safeParse(item);
          return result.success;
        });
        setSubscriptions(validSubs);
      } else {
        setSubscriptions([]);
      }
    } catch (e) {
      console.error("Failed to load subscriptions", e);
      toast({
        title: "Error loading data",
        description: "Could not load your subscriptions from local storage.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  }, [storageKey]);

  // Save to local storage whenever subscriptions change
  // Removed the useEffect for saving to avoid race conditions during unmount/navigation
  // useEffect(() => {
  //   if (!loading && storageKey) {
  //     localStorage.setItem(storageKey, JSON.stringify(subscriptions));
  //   }
  // }, [subscriptions, loading, storageKey]);

  const addSubscription = (sub: Omit<Subscription, "id">) => {
    if (!user || !storageKey) return;
    const newSub: Subscription = {
      ...sub,
      id: crypto.randomUUID(),
    };
    
    // Direct save to ensure persistence before navigation
    try {
      const current = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const updated = [...current, newSub];
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setSubscriptions(updated);
      
      console.debug(`[SubControl] Added subscription for user ${user.id}:`, newSub);
      
      toast({
        title: "Subscription added",
        description: `${newSub.name} has been tracked.`,
      });
    } catch (e) {
      console.error("Failed to save subscription", e);
      toast({ title: "Save failed", description: "Could not save your subscription. Please try again.", variant: "destructive" });
    }
  };

  const updateSubscription = (id: string, updates: Partial<Subscription>) => {
    if (!user || !storageKey) return;
    
    try {
      const current: Subscription[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const updated = current.map((sub) => (sub.id === id ? { ...sub, ...updates } : sub));
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setSubscriptions(updated);
      
      console.debug(`[SubControl] Updated subscription ${id} for user ${user.id}`);
      
      toast({
        title: "Subscription updated",
      });
    } catch (e) {
      console.error("Failed to update subscription", e);
      toast({ title: "Update failed", variant: "destructive" });
    }
  };

  const removeSubscription = (id: string) => {
    if (!user || !storageKey) return;
    
    try {
      const current: Subscription[] = JSON.parse(localStorage.getItem(storageKey) || "[]");
      const updated = current.filter((sub) => sub.id !== id);
      localStorage.setItem(storageKey, JSON.stringify(updated));
      setSubscriptions(updated);
      
      console.debug(`[SubControl] Removed subscription ${id} for user ${user.id}`);

      toast({
        title: "Subscription removed",
      });
    } catch (e) {
      console.error("Failed to remove subscription", e);
      toast({ title: "Remove failed", variant: "destructive" });
    }
  };

  const cancelSubscription = (id: string) => {
    if (!user) return;
    const today = new Date().toISOString().split("T")[0];
    updateSubscription(id, { active: false, cancellationDate: today });
    toast({
      title: "Marked as cancelled",
      description: "Great job saving money!",
    });
  };

  const exportData = () => {
    const csv = Papa.unparse(subscriptions);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `subscriptions_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const importData = (file: File) => {
    if (!user) return;
    Papa.parse(file, {
      header: true,
      complete: (results) => {
        try {
          const imported = results.data
            .map((item: any) => {
              // Basic type conversion for CSV strings
              return {
                ...item,
                price: parseFloat(item.price),
                noticePeriodDays: parseInt(item.noticePeriodDays),
                active: item.active === "true" || item.active === true,
              };
            })
            .filter((item: any) => item.name && !isNaN(item.price)); // Basic validation

          setSubscriptions((prev) => [...prev, ...imported]);
          toast({
            title: "Import successful",
            description: `Imported ${imported.length} subscriptions.`,
          });
        } catch (e) {
          toast({
            title: "Import failed",
            description: "Check your CSV format.",
            variant: "destructive",
          });
        }
      },
    });
  };

  return {
    subscriptions,
    loading,
    addSubscription,
    updateSubscription,
    removeSubscription,
    cancelSubscription,
    exportData,
    importData,
  };
}
