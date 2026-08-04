# CLAUDE.md — AITA project guide for AI assistants

AITA is an **AI‑powered Teaching Assistant for FPT University**. It has three services:

| Dir | Service | Stack | Runs on |
|---|---|---|---|
| `be/` | API / backend | Node.js · Express 5 · TypeScript · Prisma + **SQL Server** · JWT | `:3001` |
| `FE/` | Web client (admin/lecturer/student portals) | React 19 · Vite · React Router 7 · Tailwind 4 | `:5173` |
| `ai/` | Guide only (the standalone Python service was **removed**) | AI now runs as the `be/src/modules/ai` module calling an external Gemini service | — |

**Domain in one line:** lecturers create classes & assignments → an AI engine drafts exercises, grades submissions, and gives feedback behind a human‑review gate → students submit and consume feedback → admins manage users/content.

## Start here

1. **[`docs/CODEBASE_REVIEW.md`](docs/CODEBASE_REVIEW.md)** — original architectural assessment + remediation roadmap. **Historical** — it predates the SQL Server migration and the Clean Architecture refactor, so treat it as background, not current truth. For current state read the **Outline Product Bible** (Specifications root) + per-module specs, and the `be/`/`FE/` guides below.
2. **[`be/CONTRIBUTING.md`](be/CONTRIBUTING.md)** — backend developer guide (structure, rules, roles, onboarding, how to add a module).
3. **[`FE/CONTRIBUTING.md`](FE/CONTRIBUTING.md)** — frontend developer guide.
4. **[`ai/CONTRIBUTING.md`](ai/CONTRIBUTING.md)** — AI microservice guide.

## Critical context (don't be misled)

- **One architecture now.** The backend is fully modular Clean Architecture (`be/src/modules/*` + `be/src/shared/*`); the old flat `controllers/services/repositories` layer was **deleted**. Routes are wired in **`be/src/shared/presentation/route-manager.ts`** (~17 module routers resolved from the DI container) — that's the source of truth for what runs. `/api/assignments` is served by `ExamsRouter` (there is no `assignments` module).
- **Auth is V2.** Access + refresh tokens (rotation, server-side logout/revocation, change-password); token signing + password hashing go through injected ports (`ITokenService`/`IHashService`). JWT + bcrypt only — no passport/OAuth/session.
- **The `ai/` folder is docs-only.** The standalone Python/Gemini service was removed; AI runs as `be/src/modules/ai` calling an external service (`infrastructure/external-ai.service.ts`, `AI_STUB_MODE` toggle).
- **Roles are UPPERCASE** in the DB/JWT (`ADMIN`/`LECTURER`/`STUDENT`); the FE lowercases at its boundary.
- **Always run the type‑checked build** (`cd be && npm run build`; `cd FE && npm run build`) before claiming a change works — `dev` (tsx/vite) skips checks the build enforces.

## Run it locally

```bash
# 1) backend — needs a SQL Server instance; create be/.env with DATABASE_URL + JWT_SECRET (no .env.example committed)
cd be && npm install && npm run setup && npm run dev   # setup = prisma generate + db push + seed; :3001
# 2) frontend (new shell)
cd FE && npm install && npm run dev                    # :5173, proxies /api → :3001
# (No separate AI service to run — the former Python service was removed; AI is the be `ai` module.)
```
Seeded logins: `admin@fpt.edu.vn` / `admin123`, `lecturer@fpt.edu.vn` / `lecturer123`, `student@fpt.edu.vn` / `student123`.

---

## ⚙️ Documentation maintenance policy (IMPORTANT — keep docs in sync)

These docs are **living documentation**. Whenever you make a change that alters a structural surface, **update the corresponding doc in the same change** (same PR/commit), and bump that doc's **"Last verified"** date. Do not defer it.

| When you change… | Update… |
|---|---|
| `be/src/shared/presentation/route-manager.ts` (any route added/removed/changed) | `be/CONTRIBUTING.md` §2 endpoint table |
| a `be/src/modules/*` boundary, a new domain module, or the DI container | `be/CONTRIBUTING.md` §3–§4 |
| `be/src/config/env.ts` (env vars) | `be/CONTRIBUTING.md` §8 |
| `be/prisma/schema.prisma` (models/enums/relations) | `docs/CODEBASE_REVIEW.md` §2 (and `docs/DATABASE.md` once it exists) |
| `FE/src/lib/api.ts` (any `api.*` method) | `FE/CONTRIBUTING.md` §2–§3 |
| `FE/src/routes/index.tsx` or `FE/src/constants/navigation.ts` (pages/nav) | `FE/CONTRIBUTING.md` §4–§5 |
| `ai/api/routes/*` or `ai/schemas/app_schemas.py` (endpoints/schemas) | `ai/CONTRIBUTING.md` §2 + the contract table in §4 |
| `ai/core/config.py` (key handling, model, CORS) | `ai/CONTRIBUTING.md` §6 |
| Fixing any bug listed in a doc's "Known bugs" section | remove it from that list |

**Rules of thumb:**
- A doc claim must be **verifiable against the code**. If you write "X works", `route-manager.ts` (or the relevant file) must back it up. Prefer citing `file:line`.
- When you **fix** one of the documented issues (e.g. add auth to a route, wire an orphaned controller, fix the assignment‑status bug), **remove or update** the corresponding warning so the docs don't cry wolf.
- If a change makes `docs/CODEBASE_REVIEW.md`'s maturity table or top‑risks list stale, update those rows too.
- Keep docs **honest about what's broken** — the whole point of this set is that a new member isn't misled by an app that looks finished but isn't.

## Conventions (summary — full rules live in each `CONTRIBUTING.md`)

- **Backend:** Clean Architecture layers (`domain` ← `application` ← `infrastructure`/`presentation`); throw the **shared** `AppError`; validate with **Zod at the controller**; every non‑public route gets `authenticate` + `requireRoles`; derive ownership from `req.user`, never the body; ESM imports use `.js` specifiers.
- **Frontend:** all network access via `api.*` in `lib/api.ts` (match the BE method/path/shape exactly); surface errors via `components/common/ErrorState`/`ErrorBoundary` (no silent `.catch(console.error)`); reuse `components/ui/*`.
- **AI:** no secrets in code; validate model output; signal failures (don't return a canned grade silently); treat all request text as untrusted in prompts.
