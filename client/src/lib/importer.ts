import { PROVIDERS } from "@/data/providers";
import { Subscription } from "@/lib/types";

// Transaction from CSV
export interface ParsedTransaction {
  date: string;
  description: string;
  amount: number;
  currency: string;
  raw: any;
}

// Subscription candidate with confidence score
export interface SubscriptionCandidate {
  subscription: Partial<Subscription>;
  confidence: number; // 0-100
  transactions: ParsedTransaction[];
  interval: "monthly" | "yearly" | "weekly" | "quarterly";
  intervalDays: number;
  reason: string;
}

// Normalize merchant name
function normalizeMerchant(description: string): string {
  if (!description) return "";
  
  // Remove common payment indicators
  let normalized = description
    .toLowerCase()
    .replace(/\d{4,}/g, '') // Remove long numbers (IDs, order numbers)
    .replace(/[*]/g, '') // Remove asterisks
    .replace(/\b(paypal|payment|lastschrift|sepa|kartenzahlung)\b/gi, '')
    .trim();
  
  // Match known providers
  for (const provider of Object.values(PROVIDERS)) {
    const providerName = provider.name.toLowerCase();
    if (normalized.includes(providerName)) {
      return provider.name;
    }
  }
  
  // Extract first meaningful words (usually merchant name)
  const words = normalized.split(/\s+/).filter(w => w.length > 2);
  return words.slice(0, 3).join(' ');
}

// Calculate days between two dates
function daysBetween(date1: string, date2: string): number {
  const d1 = new Date(date1);
  const d2 = new Date(date2);
  return Math.abs((d2.getTime() - d1.getTime()) / (1000 * 60 * 60 * 24));
}

// Detect interval from transaction dates
function detectInterval(dates: string[]): { interval: string; intervalDays: number; confidence: number } {
  if (dates.length < 2) return { interval: "monthly", intervalDays: 30, confidence: 0 };
  
  const sortedDates = [...dates].sort();
  const gaps: number[] = [];
  
  for (let i = 1; i < sortedDates.length; i++) {
    gaps.push(daysBetween(sortedDates[i-1], sortedDates[i]));
  }
  
  const avgGap = gaps.reduce((a, b) => a + b, 0) / gaps.length;
  const variance = gaps.reduce((sum, gap) => sum + Math.pow(gap - avgGap, 2), 0) / gaps.length;
  const stdDev = Math.sqrt(variance);
  
  // Determine interval type
  let interval = "monthly";
  let targetDays = 30;
  
  if (avgGap >= 350 && avgGap <= 380) {
    interval = "yearly";
    targetDays = 365;
  } else if (avgGap >= 25 && avgGap <= 35) {
    interval = "monthly";
    targetDays = 30;
  } else if (avgGap >= 5 && avgGap <= 9) {
    interval = "weekly";
    targetDays = 7;
  } else if (avgGap >= 85 && avgGap <= 95) {
    interval = "quarterly";
    targetDays = 90;
  }
  
  // Confidence based on consistency (lower std dev = higher confidence)
  const consistency = Math.max(0, 100 - (stdDev / avgGap * 100));
  
  return { interval, intervalDays: Math.round(avgGap), confidence: Math.round(consistency) };
}

// Check if amounts are consistent
function areAmountsConsistent(amounts: number[], tolerance = 0.05): boolean {
  if (amounts.length < 2) return false;
  
  const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
  return amounts.every(a => Math.abs(a - avgAmount) / Math.abs(avgAmount) < tolerance);
}

// Main analysis function
export function analyzeImportedTransactions(
  transactions: ParsedTransaction[],
  existingSubscriptions: Subscription[] = []
): SubscriptionCandidate[] {
  const candidates: SubscriptionCandidate[] = [];
  const groups: Record<string, ParsedTransaction[]> = {};
  
  // Group by normalized merchant
  transactions.forEach(tx => {
    const merchant = normalizeMerchant(tx.description);
    if (!merchant) return;
    
    if (!groups[merchant]) groups[merchant] = [];
    groups[merchant].push(tx);
  });
  
  // Analyze each group
  Object.entries(groups).forEach(([merchant, txs]) => {
    // Need at least 2 transactions to establish a pattern
    if (txs.length < 2) return;
    
    // Sort by date
    txs.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    
    const amounts = txs.map(t => Math.abs(t.amount));
    const dates = txs.map(t => t.date);
    
    // Check amount consistency
    if (!areAmountsConsistent(amounts, 0.1)) return;
    
    const avgAmount = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const { interval, intervalDays, confidence: intervalConfidence } = detectInterval(dates);
    
    // Overall confidence
    const amountVariance = Math.max(...amounts) - Math.min(...amounts);
    const amountConsistency = 100 - (amountVariance / avgAmount * 100);
    const transactionFrequency = Math.min(100, txs.length * 20); // More transactions = higher confidence
    
    const confidence = Math.round(
      (intervalConfidence * 0.4 + amountConsistency * 0.3 + transactionFrequency * 0.3)
    );
    
    // Skip low confidence matches
    if (confidence < 40) return;
    
    // Match with known providers
    const providerMatch = Object.values(PROVIDERS).find(p => 
      merchant.toLowerCase().includes(p.name.toLowerCase())
    );
    
    // Check for duplicates in existing subscriptions
    const duplicate = existingSubscriptions.find(sub => 
      normalizeMerchant(sub.name).toLowerCase() === merchant.toLowerCase() ||
      (sub.providerId && sub.providerId === providerMatch?.id)
    );
    
    let reason = `${txs.length} transactions detected`;
    if (duplicate) {
      reason = `Existing subscription - price change detected`;
    }
    
    // Calculate next payment date
    const lastDate = new Date(dates[dates.length - 1]);
    lastDate.setDate(lastDate.getDate() + intervalDays);
    const nextPayment = lastDate.toISOString().split('T')[0];
    
    candidates.push({
      subscription: {
        name: providerMatch ? providerMatch.name : merchant.charAt(0).toUpperCase() + merchant.slice(1),
        price: avgAmount,
        currency: (txs[0].currency || "EUR") as any,
        interval: interval as any,
        providerId: providerMatch?.id,
        category: providerMatch?.category || "Other",
        startDate: dates[0],
        nextPaymentDate: nextPayment,
        paymentMethod: "Bank Transfer",
        active: true,
        status: "active" as any,
        noticePeriodDays: providerMatch?.noticePeriodInfo ? 30 : 14,
      },
      confidence,
      transactions: txs,
      interval: interval as any,
      intervalDays,
      reason,
    });
  });
  
  // Sort by confidence (highest first)
  return candidates.sort((a, b) => b.confidence - a.confidence);
}

// Parse CSV row to transaction
export function parseCSVRow(row: any, columnMapping: {
  date?: string;
  description?: string;
  amount?: string;
  currency?: string;
}): ParsedTransaction | null {
  const dateCol = columnMapping.date || 'date' || 'Datum' || 'Date';
  const descCol = columnMapping.description || 'description' || 'Verwendungszweck' || 'Description' || 'Merchant';
  const amountCol = columnMapping.amount || 'amount' || 'Betrag' || 'Amount';
  const currencyCol = columnMapping.currency || 'currency' || 'Währung' || 'Currency';
  
  const date = row[dateCol];
  const description = row[descCol];
  let amount = row[amountCol];
  const currency = row[currencyCol] || 'EUR';
  
  if (!date || !description || amount === undefined) return null;
  
  // Parse amount (handle different formats)
  if (typeof amount === 'string') {
    amount = parseFloat(amount.replace(/[^0-9.,-]/g, '').replace(',', '.'));
  }
  
  if (isNaN(amount)) return null;
  
  return {
    date,
    description,
    amount,
    currency,
    raw: row,
  };
}

// Auto-detect columns from CSV headers
export function detectColumns(headers: string[]): {
  date?: string;
  description?: string;
  amount?: string;
  currency?: string;
} {
  const mapping: any = {};
  
  // Date column patterns
  const datePatterns = /^(date|datum|buchungstag|valutadatum|transaction date)$/i;
  const dateCol = headers.find(h => datePatterns.test(h));
  if (dateCol) mapping.date = dateCol;
  
  // Description patterns
  const descPatterns = /^(description|verwendungszweck|merchant|payee|recipient|empfänger|buchungstext)$/i;
  const descCol = headers.find(h => descPatterns.test(h));
  if (descCol) mapping.description = descCol;
  
  // Amount patterns
  const amountPatterns = /^(amount|betrag|value|wert|sum|summe)$/i;
  const amountCol = headers.find(h => amountPatterns.test(h));
  if (amountCol) mapping.amount = amountCol;
  
  // Currency patterns
  const currencyPatterns = /^(currency|währung|ccy)$/i;
  const currencyCol = headers.find(h => currencyPatterns.test(h));
  if (currencyCol) mapping.currency = currencyCol;
  
  return mapping;
}
