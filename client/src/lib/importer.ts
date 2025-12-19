import { PROVIDERS } from "@/data/providers";
import { Subscription } from "@/lib/types";

// Helper to analyze CSV data and find potential subscriptions
export function analyzeImportedTransactions(transactions: any[]): Partial<Subscription>[] {
  const potentials: Partial<Subscription>[] = [];
  const groups: Record<string, any[]> = {};

  // Group by description/merchant
  transactions.forEach(tx => {
    // Normalize description
    const rawDesc = tx.description || tx.merchant || tx.Verwendungszweck || tx.payee || "";
    const cleanDesc = rawDesc.toLowerCase().replace(/[0-9]/g, '').trim();
    
    if (!groups[cleanDesc]) groups[cleanDesc] = [];
    groups[cleanDesc].push(tx);
  });

  // Analyze groups
  Object.entries(groups).forEach(([key, txs]) => {
    if (txs.length < 2) return; // Need at least 2 to establish a pattern
    
    // Sort by date
    txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    // Check for regular intervals (rough check)
    // Check for similar amounts
    const amounts = txs.map(t => parseFloat(t.amount || t.Betrag || "0"));
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    
    // If amounts are consistent (variance < 10%)
    const isConsistentPrice = amounts.every(a => Math.abs(a - avgAmount) / avgAmount < 0.1);
    
    if (isConsistentPrice && Math.abs(avgAmount) > 0) {
      // Try to match with known providers
      const providerMatch = Object.values(PROVIDERS).find(p => key.includes(p.name.toLowerCase()));
      
      potentials.push({
        name: providerMatch ? providerMatch.name : key.charAt(0).toUpperCase() + key.slice(1),
        price: Math.abs(avgAmount),
        currency: "EUR", // Default assume EUR for now
        interval: "monthly", // Default assumption, would calculate diff in dates
        providerId: providerMatch?.id,
        category: providerMatch?.category || "Other",
        startDate: txs[0].date,
        nextPaymentDate: new Date().toISOString().split("T")[0], // Should calculate based on last tx
        paymentMethod: "Bank Transfer", // Default from CSV
      });
    }
  });

  return potentials;
}
