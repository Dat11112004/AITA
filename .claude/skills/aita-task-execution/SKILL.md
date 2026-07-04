---
name: aita-task-execution
description: Use when picking up ANY AITA task from Plane (a "🤖 Build Prompt" or a plain work item) — how to read the prompt without being misled by stale snapshots, where current truth lives, and the PR conventions that drive automatic Plane tracking.
---

# AITA — Executing a Plane Task Correctly

Plane task descriptions carry a **Build Prompt** written at intake time. Parts of it age at different speeds. Read it like this:

| Prompt section | Trust level |
|---|---|
| REQUIREMENTS / YÊU CẦU + ACCEPTANCE CRITERIA | **Contract** — this is what you must deliver; it stays valid |
| Stack & conventions summary | Mostly valid, but the skills below override it on conflict |
| CURRENT STATE / HIỆN TRẠNG / GAP / `file:line` references | **Snapshot — assume stale.** Never plan from it |

## The golden rules

1. **The repo is the source of truth.** Before writing any code, re-survey the areas the task touches. What the prompt says is "missing" may already exist (features land daily); paths it names may have moved.
2. **Current truth lives in, precedence order:** the code itself → `.claude/skills/aita-*` skills (architecture, validation, prisma, FE, mobile) → root `CLAUDE.md` → `be|FE/CONTRIBUTING.md`. Routes: `be/src/shared/presentation/route-manager.ts` is the live route table.
3. **If reality diverges from the prompt** (feature partially built, different file layout, renamed module): build on what exists — do not duplicate or "restore" the prompt's plan. Note the divergence in the PR description.
4. **Verify before claiming done:** `cd be && npm run build` and `cd FE && npm run build` must pass (mobile: `npx tsc --noEmit` + `npx expo-doctor`). Then self-test each Acceptance Criterion.
5. **Never widen scope silently.** The Acceptance Criteria bound the task; incidental bugs you find go into a note/intake, not into the same PR.

## Tracking — how Plane learns about your work (automatic)

- PR title MUST start with the task code in brackets: `[WEB-A-01] Import students from Excel`.
  - Codes as they appear in the Plane item name: `WEB-x-yy` / `MOB-x-yy` / `FABLE-xx`, or `ALEXP-N`. (Not `ALEXPM-N`.)
- **One PR = one task code.** The sync only reads the first `[...]` token. Multiple tasks → separate PRs.
- Opening a PR moves the task to **In Progress**; merging it moves it to **Done** (`.github/workflows/plane-sync.yml`). Commit messages are **not** read — the code must be in the PR title.
- Everything reaches `main` through a PR. No direct pushes/manual merges — they skip review AND tracking.

## When you finish

The doc-sync policy in `CLAUDE.md` applies: if you changed a structural surface (routes, env, schema, `api.*` methods, pages/nav), update the matching CONTRIBUTING section in the same PR.
