---
name: AION Git Workflow
description: Branch strategy, commit conventions, PR process, and release workflow
type: project
---

# Git Workflow

AION follows a **GitHub Flow** variant adapted for a mobile + backend monorepo. Simple by default,
with release branches added when the app is in the stores and we need hotfix support.

---

## Development Philosophy

**Write small, commit often.** Every commit should represent one meaningful, self-contained unit
of work — a file scaffolded, a function implemented, a config wired up. This makes the git history
readable as a narrative of how the project was built, not just a dump of changes.

**Every commit should answer: "What changed and why does it matter?"**

Code is written with meaningful inline comments that explain *why* a block exists, not just *what*
it does. A future developer (or your future self) reading the file should understand the intent
without needing external documentation.

---

## Branch Strategy

```
main
 │
 ├── develop            ← integration branch (all features merge here first)
 │    │
 │    ├── feature/AION-005-db-migration      ← next up
 │    ├── feature/AION-006-clerk-webhook
 │    ├── feature/AION-007-api-routes
 │    ├── fix/AION-xxx-streak-timezone-bug
 │    └── chore/update-expo-sdk
 │
 │   [Merged: AION-001 monorepo, AION-002 db-schema, AION-003 api-scaffold, AION-004 queue-scaffold]
 │
 ├── release/1.0.0      ← created from develop when MVP is ready for store submission
 │    └── (only hotfixes and release prep commits allowed here)
 │
 └── hotfix/critical-payment-bug   ← branches off main, merges to both main AND develop
```

### Branch Rules

| Branch | Purpose | Branches off | Merges into | Protected |
|---|---|---|---|---|
| `main` | Production / store releases only | — | — | Yes — no direct push |
| `develop` | Integration, always deployable | `main` | `main` (via release) | Yes — no direct push |
| `feature/*` | New features | `develop` | `develop` | No |
| `fix/*` | Non-critical bug fixes | `develop` | `develop` | No |
| `hotfix/*` | Critical production fixes | `main` | `main` + `develop` | No |
| `release/*` | Release preparation | `develop` | `main` + `develop` | No |
| `chore/*` | Dependencies, tooling, config | `develop` | `develop` | No |

### Branch Naming

```
feature/AION-<ticket>-<short-description>
fix/AION-<ticket>-<short-description>
hotfix/<short-description>
release/<semver>
chore/<short-description>

# Examples
feature/AION-001-pact-crud
feature/AION-015-twitter-oauth2
fix/AION-042-streak-timezone
hotfix/double-charge-razorpay
release/1.0.0
chore/upgrade-expo-54
```

---

## Atomic Commit Strategy

Each commit maps to one of these units of work. Never batch unrelated things into one commit.

| Unit | Example commit |
|---|---|
| New file scaffolded (empty structure) | `chore(api): scaffold Hono server entry point` |
| Config wired up | `chore(db): add Prisma schema with User model` |
| One route implemented | `feat(api): add POST /pacts endpoint` |
| One worker implemented | `feat(queue): implement shame post consequence worker` |
| Bug fixed | `fix(queue): prevent double-fire on consequence retry` |
| Tests added for a unit | `test(queue): add grace day exhaustion edge case tests` |
| Native module added | `feat(ios): add FamilyControls lock module` |
| Dependency added | `chore(mobile): add TanStack Query and configure client` |

**When in doubt:** if you can describe the commit in one short sentence that clearly names what
changed — it's the right size. If you need "and" in the description, split it.

---

## Commit Message Convention

AION uses [Conventional Commits](https://www.conventionalcommits.org/). This enables automatic
changelog generation and clear history.

### Format
```
<type>(<scope>): <description>

[optional body]

[optional footer: BREAKING CHANGE, closes #issue]
```

### Types

| Type | When to use |
|---|---|
| `feat` | New feature or behavior visible to users |
| `fix` | Bug fix |
| `refactor` | Code restructure with no behavior change |
| `test` | Adding or updating tests |
| `chore` | Dependencies, tooling, config, no prod code change |
| `docs` | Documentation only |
| `perf` | Performance improvement |
| `ci` | CI/CD pipeline changes |
| `build` | Build system changes |
| `revert` | Reverting a previous commit |

### Scopes (AION-specific)

| Scope | Covers |
|---|---|
| `mobile` | React Native app |
| `api` | Hono backend |
| `queue` | BullMQ workers |
| `db` | Prisma schema, migrations |
| `shared` | Shared types and utilities |
| `ios` | iOS native module |
| `android` | Android native module |
| `auth` | Clerk integration |
| `payments` | Razorpay integration |
| `notifications` | Push notification system |

### Examples

```
feat(api): add pact creation endpoint with Zod validation

fix(queue): prevent double-fire on consequence retry

Consequence jobs now check status === 'ARMED' before executing.
Previously a BullMQ retry after a partial failure could re-fire
an already-executed financial consequence.

Closes #42

feat(mobile): implement check-in screen with proof attachment

refactor(db): extract timezone utility to shared package

chore: upgrade expo to SDK 54

test(queue): add unit tests for grace day exhaustion edge cases

BREAKING CHANGE: consequence job schema changed — existing queued
jobs from before this commit will fail to deserialize. Drain the
queue before deploying.
```

---

## Pull Request Process

### Before Opening a PR

- [ ] Branch is up to date with `develop` (rebase, not merge)
- [ ] All tests pass locally (`bun run test`)
- [ ] TypeScript compiles clean (`bun run typecheck`)
- [ ] Lint passes (`bun run lint`)
- [ ] No `.env` files, secrets, or keys in the diff
- [ ] If touching the consequence engine: consequences are idempotent in the new code
- [ ] If touching Razorpay: tested against Razorpay test environment, not production

### PR Title Format
Same as commit message format:
```
feat(api): add Razorpay mandate creation on pact setup
fix(queue): resolve timezone edge case in EOD cron
```

### PR Size Guidelines
- Aim for PRs under 400 lines of diff
- If a feature is large, split into logical sub-PRs (data model → API → worker → mobile)
- Never bundle unrelated changes in one PR

### Review Requirements
- Minimum 1 approval before merging to `develop`
- Consequence engine changes require extra scrutiny — walk through the execution flow in the PR description
- Payment-related PRs must include a note on what was tested in the Razorpay test environment

---

## Merge Strategy

- **Feature → Develop**: Squash merge (clean history on develop)
- **Develop → Main (via release)**: Merge commit (preserve release history)
- **Hotfix → Main**: Merge commit
- **Hotfix → Develop**: Cherry-pick or merge commit

Never use rebase to integrate into shared branches (`main`, `develop`). Rebase is fine for
keeping your own feature branch up to date before opening a PR.

---

## Release Process

1. When MVP features are complete on `develop`, create `release/1.0.0` from `develop`
2. On the release branch: bump version numbers, update changelog, fix last-minute issues
3. Submit to App Store / Play Store from the release branch
4. Once approved: merge `release/1.0.0` → `main` with a merge commit
5. Tag the merge commit: `git tag -a v1.0.0 -m "AION MVP release"`
6. Merge `release/1.0.0` → `develop` to bring release fixes back

---

## Versioning

AION follows [Semantic Versioning](https://semver.org/): `MAJOR.MINOR.PATCH`

| Increment | When |
|---|---|
| MAJOR | Breaking API changes, major product pivots |
| MINOR | New features (new pact types, new consequence tier) |
| PATCH | Bug fixes, performance improvements |

App store build numbers are separate from semver and increment monotonically.

---

## Git Hygiene Rules

- **Never force-push to `main` or `develop`** under any circumstances
- **Never commit directly to `main` or `develop`** — always via PR
- **No `--no-verify`** — if a pre-commit hook fails, fix the underlying issue
- **Squash WIP commits** before opening a PR — history on feature branches is for you, not the team
- **Write commit messages as if the reader has no context** — they will, six months from now
- **Reference issues in commits** when applicable: `Closes #42`, `Relates to #17`
