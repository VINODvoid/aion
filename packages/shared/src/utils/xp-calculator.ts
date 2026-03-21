// XP calculation logic shared between the API (awarding XP on check-in)
// and the mobile app (previewing XP before submitting a check-in).
// Keeping this in shared means both sides always show the same number.

import {
  BASE_CHECKIN_XP,
  STREAK_MULTIPLIERS,
  PACT_COMPLETE_BONUS_XP,
  XP_PER_LEVEL_BASE,
  CONSEQUENCE_TIER_XP_BONUS,
} from "../constants/xp";

// Calculates XP earned for a single check-in based on current streak length.
// Streak length determines which multiplier tier applies.
export function calculateCheckinXP(streakDays: number): number {
  let multiplier: number = STREAK_MULTIPLIERS.DEFAULT;

  if (streakDays >= 30) {
    multiplier = STREAK_MULTIPLIERS.MONTH;
  } else if (streakDays >= 7) {
    multiplier = STREAK_MULTIPLIERS.WEEK;
  }

  return Math.floor(BASE_CHECKIN_XP * multiplier);
}

// Calculates XP awarded on full pact completion.
// Higher consequence tiers reward more — bigger risk deserves bigger reward.
export function calculatePactCompleteXP(consequenceTier: number): number {
  const tierBonus = CONSEQUENCE_TIER_XP_BONUS[consequenceTier] ?? 1;
  return Math.floor(PACT_COMPLETE_BONUS_XP * tierBonus);
}

// Returns the total XP needed to reach the next level from the current one.
// Formula is additive — each level costs more than the last.
// Level 1→2: 1000, Level 2→3: 2000, Level 3→4: 3000 ...
export function xpForNextLevel(currentLevel: number): number {
  return currentLevel * XP_PER_LEVEL_BASE;
}

// Calculates the user's level and progress given their total XP.
// Returns level, XP into the current level, and percentage to next level.
export function calculateLevel(totalXP: number): {
  level: number;
  currentLevelXP: number;
  nextLevelXP: number;
  progressPercent: number;
} {
  let level = 1;
  let remaining = totalXP;

  // Walk up levels until we can't afford the next one
  while (remaining >= xpForNextLevel(level)) {
    remaining -= xpForNextLevel(level);
    level++;
  }

  const nextLevelXP = xpForNextLevel(level);
  const progressPercent = Math.floor((remaining / nextLevelXP) * 100);

  return {
    level,
    currentLevelXP: remaining,
    nextLevelXP,
    progressPercent,
  };
}
