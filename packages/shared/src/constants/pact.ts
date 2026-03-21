// Pact-level constraints that are enforced across the entire stack.
// API validates against these, mobile UI uses them for form limits,
// and queue workers reference them for grace day calculations.

// Maximum number of active pacts a user can have at once.
// Keeps the commitment meaningful — you can't dilute stakes across 20 pacts.
export const MAX_ACTIVE_PACTS = 5;

// Grace days reset every month — these are the allowed limits per pact.
// Users choose between 1 or 2 when creating a pact. No more, no less.
export const GRACE_DAY_OPTIONS = [1, 2] as const;
export type GraceDayOption = (typeof GRACE_DAY_OPTIONS)[number];

// Standard pact duration presets in days — shown as quick-select in the mobile UI.
// User can also set a custom end date or leave it null for infinite.
export const PACT_DURATION_PRESETS = [30, 60, 90] as const;
export type PactDurationPreset = (typeof PACT_DURATION_PRESETS)[number];

// Minimum pact duration in days — a pact shorter than this is not meaningful
export const MIN_PACT_DURATION_DAYS = 7;

// How many times a pact can be paused during its lifetime.
// Prevents pausing as a way to dodge consequences indefinitely.
export const MAX_PACT_PAUSES = 2;
