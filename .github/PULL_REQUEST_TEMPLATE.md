## What

<!-- One-line summary of what this PR does. Mirror the PR title. -->

## Why

<!-- Context: what problem does this solve, what ticket does it address? -->
<!-- Link: Closes #<issue-number> -->

## How

<!-- Brief explanation of the approach. Why this approach over alternatives? -->
<!-- For non-obvious decisions, explain the trade-off. -->

## Changes

<!-- Bullet-point list of meaningful changes. Skip boilerplate. -->
-

## Testing

<!-- What did you test? How? -->
<!-- For consequence engine changes: walk through the execution flow. -->
<!-- For payment changes: confirm tested against Razorpay TEST environment (not prod). -->

- [ ] Tests added or updated
- [ ] Tested locally end-to-end
- [ ] `bun run typecheck` passes
- [ ] `bun run lint` passes
- [ ] `bun run test` passes

## Checklist

- [ ] No secrets, API keys, or `.env` files in this diff
- [ ] Branch is rebased on latest `develop`
- [ ] PR title follows conventional commit format (`feat(scope): description`)
- [ ] Consequence logic is idempotent (if applicable)
- [ ] Timezone handling is correct (if touching streak/EOD logic)
- [ ] Razorpay operations are server-side only (if touching payments)
