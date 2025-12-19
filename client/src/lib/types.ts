import { z } from "zod";

export const CURRENCIES = ["EUR", "USD", "GBP", "CHF"] as const;
export const INTERVALS = ["monthly", "yearly", "weekly", "quarterly"] as const;
export const PAYMENT_METHODS = ["Credit Card", "PayPal", "Bank Transfer", "Klarna", "Apple Pay", "Google Pay", "Crypto", "Other"] as const;
export const CATEGORIES = ["Entertainment", "Utilities", "Software", "Health", "Insurance", "Education", "Telecommunication", "Gym", "Other"] as const;

export const subscriptionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  providerId: z.string().optional(), // Link to known provider
  price: z.number().min(0, "Price must be positive"),
  currency: z.enum(CURRENCIES).default("EUR"),
  interval: z.enum(INTERVALS).default("monthly"),
  startDate: z.string(), // ISO date string
  nextPaymentDate: z.string(), // ISO date string
  noticePeriodDays: z.number().min(0).default(30),
  paymentMethod: z.enum(PAYMENT_METHODS).default("Other"),
  category: z.enum(CATEGORIES).default("Other"),
  notes: z.string().optional(),
  active: z.boolean().default(true),
  cancellationDate: z.string().optional(),
  status: z.enum(["active", "cancelled", "pending_cancellation", "expired"]).default("active"),
  
  // Safebox feature
  documents: z.array(z.object({
    id: z.string(),
    name: z.string(),
    type: z.enum(["contract", "confirmation", "invoice", "other"]),
    date: z.string(),
    notes: z.string().optional(),
    status: z.enum(["uploaded", "verified", "rejected"]).default("uploaded")
  })).default([]),
});

export type Subscription = z.infer<typeof subscriptionSchema>;

export interface ProviderData {
  id: string;
  name: string;
  category: typeof CATEGORIES[number];
  url: string;
  cancelUrl?: string;
  email?: string;
  postalAddress?: string;
  noticePeriodInfo?: string;
  requiredFields?: string[]; // e.g., ["Account Number", "Email"]
  logo?: string; // Placeholder for logo url or icon name
}

export const defaultSubscription: Omit<Subscription, "id"> = {
  name: "",
  price: 0,
  currency: "EUR",
  interval: "monthly",
  startDate: new Date().toISOString().split("T")[0],
  nextPaymentDate: new Date().toISOString().split("T")[0],
  noticePeriodDays: 30,
  paymentMethod: "Credit Card",
  category: "Other",
  active: true,
  status: "active",
  documents: [],
};
