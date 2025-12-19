export interface CancellationGuide {
  name: string;
  url?: string;
  steps: string[];
  requiredInfo?: string[];
  template?: string;
}

export const CANCELLATION_GUIDES: Record<string, CancellationGuide> = {
  "netflix": {
    name: "Netflix",
    url: "https://www.netflix.com/cancelplan",
    steps: [
      "Log into your Netflix account.",
      "Click on your profile icon in the top right corner.",
      "Select 'Account'.",
      "Under 'Membership & Billing', click 'Cancel Membership'.",
      "Confirm your cancellation."
    ],
  },
  "spotify": {
    name: "Spotify",
    url: "https://www.spotify.com/account/change-plan/",
    steps: [
      "Log into your Spotify account page.",
      "Scroll to 'Your plan'.",
      "Click 'Change plan'.",
      "Scroll to 'Cancel Spotify' and click 'Cancel Premium'.",
    ],
  },
  "amazon prime": {
    name: "Amazon Prime",
    url: "https://www.amazon.com/mc/pipeline/cancellation",
    steps: [
      "Go to 'Your Prime Membership' settings.",
      "Click on 'Manage Membership'.",
      "Click on 'End Membership'.",
      "Follow the on-screen instructions (they might offer you deals to stay)."
    ],
  },
  "adobe": {
    name: "Adobe Creative Cloud",
    url: "https://account.adobe.com/plans",
    steps: [
      "Sign in to your Adobe account.",
      "Select 'Manage plan' for the plan you want to cancel.",
      "Select 'Cancel your plan'.",
      "Be careful: Adobe often charges a cancellation fee if you cancel an annual plan early."
    ],
  },
  "gym": {
    name: "Generic Gym Membership",
    steps: [
      "Check your contract for the specific cancellation notice period.",
      "Write a formal cancellation letter/email.",
      "Send it via registered mail or hand it in personally and get a receipt.",
    ],
    template: `Dear [Gym Name] Team,

I hereby cancel my membership (Member ID: [ID]) effective [Date].

Please confirm receipt of this termination in writing and confirm the date of termination.

Sincerely,
[Your Name]`,
  },
  "default": {
    name: "Generic Service",
    steps: [
      "Check the provider's website for a 'Billing' or 'Subscription' section in your account settings.",
      "Look for 'Cancel Subscription' or 'Downgrade'.",
      "If no online option exists, check their FAQ for cancellation email addresses.",
      "Send a cancellation email if necessary."
    ],
    template: `To whom it may concern,

I would like to cancel my subscription for [Service Name] associated with email [Your Email].

Please confirm the cancellation and the effective end date.

Thank you,
[Your Name]`,
  }
};

export function getCancellationGuide(providerName: string): CancellationGuide {
  const normalized = providerName.toLowerCase().trim();
  // Simple partial match
  const match = Object.keys(CANCELLATION_GUIDES).find(key => normalized.includes(key));
  return match ? CANCELLATION_GUIDES[match] : CANCELLATION_GUIDES["default"];
}
