import { ProviderData } from "@/lib/types";

export const PROVIDERS: Record<string, ProviderData> = {
  "netflix": {
    id: "netflix",
    name: "Netflix",
    category: "Entertainment",
    url: "https://www.netflix.com",
    cancelUrl: "https://www.netflix.com/cancelplan",
    noticePeriodInfo: "Cancel anytime. Access continues until the end of the billing period.",
    requiredFields: ["Email"],
    email: "support@netflix.com" // Often handled via chat, but useful for templates
  },
  "spotify": {
    id: "spotify",
    name: "Spotify",
    category: "Entertainment",
    url: "https://www.spotify.com",
    cancelUrl: "https://www.spotify.com/account/change-plan/",
    noticePeriodInfo: "Cancel anytime. Reverts to Free at end of billing cycle.",
    requiredFields: ["Username", "Email"]
  },
  "amazon_prime": {
    id: "amazon_prime",
    name: "Amazon Prime",
    category: "Entertainment",
    url: "https://amazon.com",
    cancelUrl: "https://www.amazon.com/mc/pipeline/cancellation",
    noticePeriodInfo: "Can end immediately or at end of cycle. Partial refund possible if unused.",
    requiredFields: ["Email"]
  },
  "disney_plus": {
    id: "disney_plus",
    name: "Disney+",
    category: "Entertainment",
    url: "https://www.disneyplus.com",
    cancelUrl: "https://www.disneyplus.com/account/subscription",
    noticePeriodInfo: "Cancel anytime effective at end of billing period.",
    requiredFields: ["Email"]
  },
  "dazn": {
    id: "dazn",
    name: "DAZN",
    category: "Entertainment",
    url: "https://www.dazn.com",
    cancelUrl: "https://www.dazn.com/myaccount/subscription",
    noticePeriodInfo: "30 days notice usually required for monthly flex plans.",
    requiredFields: ["Email", "Member ID"]
  },
  "adobe": {
    id: "adobe",
    name: "Adobe Creative Cloud",
    category: "Software",
    url: "https://account.adobe.com",
    cancelUrl: "https://account.adobe.com/plans",
    noticePeriodInfo: "Early cancellation fee may apply for annual plans paid monthly (50% of remaining balance).",
    requiredFields: ["Adobe ID (Email)"]
  },
  "apple_icloud": {
    id: "apple_icloud",
    name: "Apple iCloud+",
    category: "Software",
    url: "https://www.apple.com/icloud",
    cancelUrl: "https://support.apple.com/en-us/HT207594", // Guide link mainly
    noticePeriodInfo: "Manage via Apple ID settings on device.",
    requiredFields: ["Apple ID"]
  },
  "google_one": {
    id: "google_one",
    name: "Google One",
    category: "Software",
    url: "https://one.google.com",
    cancelUrl: "https://one.google.com/settings",
    noticePeriodInfo: "Cancel anytime.",
    requiredFields: ["Google Account Email"]
  },
  "telekom": {
    id: "telekom",
    name: "Telekom / T-Mobile",
    category: "Telecommunication",
    url: "https://www.telekom.de",
    cancelUrl: "https://www.telekom.de/hilfe/vertrag-meine-daten/kuendigung",
    postalAddress: "Telekom Deutschland GmbH, Landgrabenweg 151, 53227 Bonn",
    noticePeriodInfo: "Usually 1 month notice after initial contract period (24 months).",
    requiredFields: ["Customer Number", "Contract Number"]
  },
  "vodafone": {
    id: "vodafone",
    name: "Vodafone",
    category: "Telecommunication",
    url: "https://www.vodafone.de",
    cancelUrl: "https://www.vodafone.de/hilfe/kuendigung.html",
    postalAddress: "Vodafone GmbH, Ferdinand-Braun-Platz 1, 40549 Düsseldorf",
    noticePeriodInfo: "Usually 1 month notice after initial contract period.",
    requiredFields: ["Customer Number", "Contract Number"]
  },
  "one_and_one": {
    id: "one_and_one",
    name: "1&1",
    category: "Telecommunication",
    url: "https://www.1und1.de",
    cancelUrl: "https://control-center.1und1.de/kuendigung",
    postalAddress: "1&1 Telecom GmbH, Elgendorfer Str. 57, 56410 Montabaur",
    noticePeriodInfo: "Often requires phone confirmation after online cancellation.",
    requiredFields: ["Customer Number", "Contract Number"]
  },
  "mcfit": {
    id: "mcfit",
    name: "McFIT",
    category: "Gym",
    url: "https://www.mcfit.com",
    cancelUrl: "https://my.mcfit.com",
    postalAddress: "RSG Group GmbH, Tannenberg 4, 96132 Schlüsselfeld",
    noticePeriodInfo: "Usually 1 month to the end of contract period.",
    requiredFields: ["Member ID"]
  }
};

export function searchProviders(query: string): ProviderData[] {
  const lower = query.toLowerCase();
  return Object.values(PROVIDERS).filter(p => 
    p.name.toLowerCase().includes(lower) || 
    p.category.toLowerCase().includes(lower)
  );
}
