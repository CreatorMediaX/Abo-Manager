import { z } from "zod";

export const CURRENCIES = ["EUR", "USD", "GBP", "CHF"] as const;
export const INTERVALS = ["monthly", "yearly", "weekly", "quarterly"] as const;
export const PAYMENT_METHODS = ["Credit Card", "PayPal", "Bank Transfer", "Klarna", "Apple Pay", "Google Pay", "Crypto", "Other"] as const;
export const CATEGORIES = ["Entertainment", "Utilities", "Software", "Health", "Insurance", "Education", "Other"] as const;

export const subscriptionSchema = z.object({
  id: z.string(),
  name: z.string().min(1, "Name is required"),
  provider: z.string().optional(),
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
  cancellationDate: z.string().optional(), // If cancelled
});

export type Subscription = z.infer<typeof subscriptionSchema>;

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
};
