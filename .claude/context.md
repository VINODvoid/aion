---
name: AION Product Context
description: Core product vision, target user, key decisions, and phase context for AION
type: project
---

# Product Context

## One-Liner
The habit tracker that punishes you for quitting.

## Core Insight
Loss aversion (the psychological pain of losing something) is 2x stronger than the pleasure of
gaining something of equal value. Every existing habit tracker rewards consistency — AION penalizes
failure. These are not symmetric motivators. AION bets on the stronger one.

## The Emotional Loop
- **On pact creation**: Dread. You've committed. The consequence is armed.
- **Daily**: Low-grade accountability pressure. You know what happens if you miss.
- **On completion**: Relief, pride. "CONSEQUENCE DISARMED" is the most satisfying screen in the app.
- **On failure**: Real, immediate pain. Not a sad emoji. A consequence fires.

## Target User
Builders, learners, and grinders who *already want* to be consistent but lose momentum. They don't
need motivation lectures. They need a system with teeth. Think: developer doing a 100-day coding
challenge, someone trying to build a morning workout habit, a founder forcing themselves to write daily.

## What AION Is Not
- Not a to-do app. Pacts are recurring commitments, not one-off tasks.
- Not a gamification app. XP and levels are retention tools, not the product.
- Not gentle. The UX should never soften the stakes. The threat must feel real.

---

## Current Phase: MVP (V1) — Solo Mode

**Target**: Working app with all 4 consequence tiers functional, solo use only.

**In scope:**
- Pact creation and management
- Daily check-ins with optional proof
- Streak tracking and heat map
- XP and leveling system
- Consequence tiers 1–4 (Shame, Lock, Financial, Nuclear)
- Razorpay e-mandate integration
- Twitter/X OAuth2 shame posts
- Push notifications (reminders + consequence alerts)
- Daily dashboard

**Out of scope for MVP:**
- Social features (accountability partners, group pacts, leaderboards)
- Proof verification (photo/GPS validation)
- Home screen widget
- Custom anti-charity list
- Monetization (free/pro tiers)

---

## Key Product Decisions (and Why)

**Consequence tier is immutable after pact creation.**
Reason: Allowing downgrades mid-streak lets users remove consequences when they're most tempted to
quit — exactly when the consequence is most useful. The rule must be communicated clearly at creation.

**No check-in batching for past days.**
Reason: Retroactive check-ins defeat the point. The check-in must happen on the day.

**Anti-charity model for financial consequences.**
Reason: Donating to an org you *dislike* is psychologically more painful than losing the money itself.
The money leaving your account AND going to something you oppose is a double loss. Stronger deterrent.

**Grace days do not roll over.**
Reason: Rollover would let users bank grace days as a safety net, reducing daily accountability pressure.
Grace days are an emergency valve, not a strategic resource.

**Financial mandate created at pact creation, not at failure.**
Reason: The threat must be credible and pre-authorized. If the user has to approve a charge after
failing, they can abandon the flow. Pre-authorization makes the consequence feel inevitable.
