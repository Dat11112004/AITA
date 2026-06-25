# CLAUDE.md — AITA project guide for AI assistants

AITA is an **AI‑powered Teaching Assistant for FPT University**. It has three services:

| Dir | Service | Stack | Runs on |
|---|---|---|---|
| `be/` | API / backend | Node.js · Express 5 · TypeScript · Prisma + SQLite · JWT | `:3001` |
| `FE/` | Web client (admin/lecturer/student portals) | React 19 · Vite · React Router 7 · Tailwind 4 | `:5173` |
| `ai/` | AI engine | Python · FastAPI · Google Gemini | `:8000` |

**Domain in one line:** lecturers create classes & assignments → an AI engine drafts exercises, grades submissions, and gives feedback behind a human‑review gate → students submit and consume feedback → admins manage users/content.

## Start here

1. **[`docs/CODEBASE_REVIEW.md`](docs/CODEBASE_REVIEW.md)** — the architectural assessment, business‑logic overview, confirmed issues, and the phased remediation roadmap. **Read this first.**
2. **[`be/CONTRIBUTING.md`](be/CONTRIBUTING.md)** — backend developer guide (structure, rules, roles, onboarding, how to add a module).
3. **[`FE/CONTRIBUTING.md`](FE/CONTRIBUTING.md)** — frontend developer guide.
4. **[`ai/CONTRIBUTING.md`](ai/CONTRIBUTING.md)** — AI microservice guide.

## Critical context (don't be misled)

- **What actually works is small.** The backend serves **only 15 endpoints** (auth, classes, assignments, users) via `be/src/routes/index.ts`. The frontend calls **~50** endpoints; the rest 404 silently. **`be/src/routes/index.ts` is the source of truth for what runs.**
- **Two backend architectures coexist.** The **target is Clean Architecture** (`be/src/modules/*`). The legacy flat layer (`be/src/controllers`, `services`, `repositories`) holds unmigrated features but is **orphaned — do not extend it**; migrate from it instead.
- **The AI service is not wired in** (the BE doesn't call it) and ships a **committed live Gemini key** (`ai/core/config.py:4`) — rotate before doing anything with `ai/`.
- **Roles are UPPERCASE** in the DB/JWT (`ADMIN`/`LECTURER`/`STUDENT`); the FE lowercases at its boundary.
- **Always run the type‑checked build** (`cd be && npm run build`; `cd FE && npm run build`) before claiming a change works — `dev` (tsx/vite) skips checks the build enforces.

## Run it locally

```bash
# 1) backend
cd be && cp .env.example .env && npm install && npm run setup && npm run dev   # :3001
# 2) frontend (new shell)
cd FE && npm install && npm run dev                                            # :5173, proxies /api → :3001
# 3) ai (optional; orphaned today)  — rotate the key first
cd ai && pip install -r requirements.txt && python main.py                     # :8000
```
Seeded logins: `admin@fpt.edu.vn` / `admin123`, `lecturer@fpt.edu.vn` / `lecturer123`, `student@fpt.edu.vn` / `student123`.

---

## ⚙️ Documentation maintenance policy (IMPORTANT — keep docs in sync)

These docs are **living documentation**. Whenever you make a change that alters a structural surface, **update the corresponding doc in the same change** (same PR/commit), and bump that doc's **"Last verified"** date. Do not defer it.

| When you change… | Update… |
|---|---|
| `be/src/routes/index.ts` (any route added/removed/changed) | `be/CONTRIBUTING.md` §2 endpoint table + wired/orphaned list |
| a `be/src/modules/*` boundary, a new domain module, or the DI container | `be/CONTRIBUTING.md` §3–§4 |
| `be/src/config/env.ts` (env vars) | `be/CONTRIBUTING.md` §8 |
| `be/prisma/schema.prisma` (models/enums/relations) | `docs/CODEBASE_REVIEW.md` §2 (and `docs/DATABASE.md` once it exists) |
| `FE/src/lib/api.ts` (any `api.*` method) | `FE/CONTRIBUTING.md` §2–§3 |
| `FE/src/routes/index.tsx` or `FE/src/constants/navigation.ts` (pages/nav) | `FE/CONTRIBUTING.md` §4–§5 |
| `ai/api/routes/*` or `ai/schemas/app_schemas.py` (endpoints/schemas) | `ai/CONTRIBUTING.md` §2 + the contract table in §4 |
| `ai/core/config.py` (key handling, model, CORS) | `ai/CONTRIBUTING.md` §6 |
| Fixing any bug listed in a doc's "Known bugs" section | remove it from that list |

**Rules of thumb:**
- A doc claim must be **verifiable against the code**. If you write "X works", `routes/index.ts` (or the relevant file) must back it up. Prefer citing `file:line`.
- When you **fix** one of the documented issues (e.g. add auth to a route, wire an orphaned controller, fix the assignment‑status bug), **remove or update** the corresponding warning so the docs don't cry wolf.
- If a change makes `docs/CODEBASE_REVIEW.md`'s maturity table or top‑risks list stale, update those rows too.
- Keep docs **honest about what's broken** — the whole point of this set is that a new member isn't misled by an app that looks finished but isn't.

## Conventions (summary — full rules live in each `CONTRIBUTING.md`)

- **Backend:** Clean Architecture layers (`domain` ← `application` ← `infrastructure`/`presentation`); throw the **shared** `AppError`; validate with **Zod at the controller**; every non‑public route gets `authenticate` + `requireRoles`; derive ownership from `req.user`, never the body; ESM imports use `.js` specifiers.
- **Frontend:** all network access via `api.*` in `lib/api.ts` (match the BE method/path/shape exactly); surface errors via `components/common/ErrorState`/`ErrorBoundary` (no silent `.catch(console.error)`); reuse `components/ui/*`.
- **AI:** no secrets in code; validate model output; signal failures (don't return a canned grade silently); treat all request text as untrusted in prompts.
