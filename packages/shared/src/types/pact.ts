// Pact is the atomic unit of AION.Every other system (streaks, consequences, XP)
// revolves around a pact.These types are shared between the API, queue workers,
// and the mobile app - so they live in @aion/shared, not a single package.

import { z } from "zod";

// Pact frequency determines how often a check-in is required
// Using 'as const' objects instead of Typescript enums for better tree-shaking
// and compatibility across packages without need of transpilation.
export const PactFrequency = {
  DAILY: "DAILY",
  WEEKLY: "WEEKLY",
} as const;

// Derive the type from the object - single source of truth
export type PactFrequency = (typeof PactFrequency)[keyof typeof PactFrequency];

// A pact moves through these states exactly once, in order.
// ACTIVE → COMPLETED (finished all days) or FAILED (consequence fired).
// PAUSED is a temporary state — limited pauses allowed, tracked separately.
export const PactStatus = {
  ACTIVE: "ACTIVE",
  COMPLETED: "COMPLETED",
  FAILED: "FAILED",
  PAUSED: "PAUSED",
} as const;

export type PactStatus = (typeof PactStatus)[keyof typeof PactStatus];

// The four consequences tiers. Order matters -NUCLEAR is all three combined.
// This type is used by both the queue worker (to decide what to execute)
// and the mobile app ( to display the selected tier to the users).
export const ConsequenceType = {
  SHAME: "SHAME", // Tier 1 — auto-post to X/Twitter
  LOCK: "LOCK", // Tier 2 — trigger phone Focus Mode
  FINANCIAL: "FINANCIAL", // Tier 3 — Razorpay charge → anti-charity
  NUCLEAR: "NUCLEAR", // Tier 4 — all three simultaneously
} as const;

export type ConsequenceType =
  (typeof ConsequenceType)[keyof typeof ConsequenceType];

// Tracks the lifecycle of an armed consequence.
// ARMED → FIRED (executed) or DISARMED (pact completed successfully).
// SKIPPED_GRACE means a grace day was used instead of firing.
// DEBT means the financial charge failed — user blocked from new pacts until settled.
export const ConsequenceStatus = {
  ARMED: "ARMED",
  FIRED: "FIRED",
  SKIPPED_GRACE: "SKIPPED_GRACE",
  DEBT: "DEBT",
  DISARMED: "DISARMED",
} as const;

export type ConsequenceStatus =
  (typeof ConsequenceStatus)[keyof typeof ConsequenceStatus];

// Tracks where XP was earned. Used in XPLog to show the user
// a breakdown of their XP history in the profile screen.
export const XPSource = {
  CHECKIN: "CHECKIN", // daily check-in
  PACT_COMPLETE: "PACT_COMPLETE", // finished all days of a pact
  MILESTONE: "MILESTONE", // streak milestones (7, 30, 60 days)
  BONUS: "BONUS", // manual bonus (future use)
} as const;

export type XPSource = (typeof XPSource)[keyof typeof XPSource];
