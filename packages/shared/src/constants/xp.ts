// All XP math lives here. Changing game feel — how fast users level up,
// how much streaks are rewarded — only requires editing this file.
// Never hardcode these values anywhere else in the codebase.

// Base XP earned for a single check-in, before any multiplier is applied
export const BASE_CHECKIN_XP = 10;

// Multiplier thresholds — streak length unlocks a higher XP multiplier
export const STREAK_MULTIPLIERS = {
  DEFAULT: 1.0, // 0–6 days
  WEEK: 1.5, // 7+ days
  MONTH: 2.0, // 30+ days
} as const;

// Flat XP bonus on completing a full pact (all days done, no failure)
export const PACT_COMPLETE_BONUS_XP = 500;

// XP required to reach the next level scales with current level.
// Formula: currentLevel * XP_PER_LEVEL_BASE
// Level 1→2: 1000, Level 2→3: 2000, Level 3→4: 3000 ...
// Early levels are quick wins — higher levels are real achievements.
export const XP_PER_LEVEL_BASE = 1000;

// Tier bonus multiplier applied to PACT_COMPLETE_BONUS_XP
// Higher consequence tiers reward more XP on completion — bigger risk, bigger reward
export const CONSEQUENCE_TIER_XP_BONUS: Record<number, number> = {
  1: 1.5, // Shame tier
  2: 1.75, // Lock tier
  3: 2.5, // Financial tier
  4: 3.0, // Nuclear tier
};
