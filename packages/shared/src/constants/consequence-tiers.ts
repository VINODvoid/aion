// Consequence tier definitions — the core of what makes AION different.
// These constants are used across the API, queue workers, and mobile app
// to display, validate, and execute the correct consequence for a pact.

export const ConsequenceTier = {
  SHAME: 1,
  LOCK: 2,
  FINANCIAL: 3,
  NUCLEAR: 4,
} as const;

export type ConsequenceTier =
  (typeof ConsequenceTier)[keyof typeof ConsequenceTier];

// Human-readable labels for each tier — used in the mobile UI
export const CONSEQUENCE_TIER_LABELS: Record<ConsequenceTier, string> = {
  1: "Shame Post (X/Twitter)",
  2: "Phone Lock",
  3: "Financial Penalty",
  4: "Nuclear (All Three)",
};

// Minimum and maximum financial penalty amount in INR (Tier 3 and 4 only)
// These are product constraints — not Razorpay limits
export const FINANCIAL_CONSEQUENCE_MIN_INR = 50;
export const FINANCIAL_CONSEQUENCE_MAX_INR = 5000;

// Phone lock duration options in minutes (Tier 2 and 4 only)
export const LOCK_DURATION_OPTIONS = [30, 60] as const;
export type LockDuration = (typeof LOCK_DURATION_OPTIONS)[number];
