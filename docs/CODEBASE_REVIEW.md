# AITA — Codebase Review & Remediation Strategy

> **Project:** AITA — AI‑powered Teaching Assistant for FPT University
> **Stack:** React 19 + Vite (`FE/`) · Node.js + Express 5 + Prisma + SQLite (`be/`) · Python FastAPI + Google Gemini (`ai/`)
> **Reviewed:** Backend · Frontend · AI microservice · Data model/DB · End‑to‑end integration
> **Review date:** 2026‑06‑25
> **Method:** Multi‑agent static review of the actual source. Every critical/high finding was adversarially re‑verified against the code (35/35 confirmed). Citations are `file:line`.

This is the **baseline architectural assessment**. The companion living docs are:

| Doc | Purpose |
|---|---|
| [`be/CONTRIBUTING.md`](../be/CONTRIBUTING.md) | Backend developer guide — structure, rules, roles, onboarding |
| [`FE/CONTRIBUTING.md`](../FE/CONTRIBUTING.md) | Frontend developer guide — structure, rules, roles, onboarding |
| [`ai/CONTRIBUTING.md`](../ai/CONTRIBUTING.md) | AI microservice guide |
| [`CLAUDE.md`](../CLAUDE.md) | Project map + the rule that keeps these docs current |

---

## 1. Executive summary

AITA is a **three‑service AI teaching assistant** for FPT University. The intended product:

- **Lecturers** create classes and assignments (quiz / coding / group); an **AI engine** drafts exercises, grades submissions, and produces personalized learning feedback **behind a human review/approval gate**.
- **Students** enroll in classes, submit work, and consume AI feedback, learning paths, discussions and history.
- **Admins** manage users, subjects, content and notifications, and view analytics dashboards.

The designed flow is `FE → Node backend (owns an AIJob state machine + AIReview human gate) → Python/Gemini service → DB write‑back`.

**Current reality: a demo‑quality prototype that does not hang together end to end.** A half‑finished "clean architecture" migration left the Node router serving **15 routes** — a `/health` probe plus **14 endpoints across 4 domains** (auth, classes, assignments, users) — while the frontend defines **~57 `api.*` calls** of which the backend serves only ~13, so **~44 calls hit the 404 catch‑all** and are silently swallowed by `.catch(console.error)`, leaving every dashboard a polished‑but‑empty shell. The entire AI / submission / stats product (~1,500 LOC) and the Python AI service are **orphaned and unreachable**. The small reachable surface has **broken authorization** (no role gates; `/classes` and `/assignments` are fully unauthenticated; any student can mint an admin), and a **live Gemini API key is committed to git**.

**Net verdict:** login and three CRUD domains work locally after seeding; the headline AI value and the bulk of the UI are non‑functional against the real server.

### Maturity verdict per subsystem

| Subsystem | Maturity | One‑line verdict |
|---|---|---|
| **Backend** (`be/`) | Early/prototype, mid‑migration | 15 reachable endpoints; broken authz + 2 broken write paths; ~1,500 LOC of the real product orphaned; `tsc` build may fail under `noUnusedLocals` over dead code. |
| **Frontend** (`FE/`) | UI ~85% / data ~25% | Visually complete 3‑role dashboard; ~80% of API calls target unimplemented endpoints; React Query + RHF/Zod pillars built but entirely orphaned. |
| **AI microservice** (`ai/`) | Early prototype, orphaned | Clean 3‑endpoint FastAPI+Gemini service; committed live key, no auth, open CORS, prompt‑injection on grading, contract‑mismatched, never called by the product. |
| **Data model / DB** | Demo/prototype | Flat denormalized SQLite/Prisma; no FK indexes, no migrations; structured‑quiz/group/semester tables missing; AI tables mis‑fed; notification/group/user‑delete modeling broken. |
| **Integration / deploy** | Demo only | Contracts broken FE↔BE and BE↔AI; no role gates; committed secret; no working deploy story beyond localhost; ~2× duplicated backend code. |

---

## 2. What AITA is — business logic & domain model

The Prisma schema (`be/prisma/schema.prisma`, 15 models + 7 enums) models the **full** domain even though only `User` / `Class` / `Assignment` are reachable by running code. The core flows, in plain language, tied to the data model:

### 2.1 Auth & roles
One `User` table holds all three roles (`UserRole` = `ADMIN`/`LECTURER`/`STUDENT`) with `passwordHash`, `externalId` (FPT staff/student code) and `status` (`ACTIVE`/`INACTIVE`). Login bcrypt‑compares and signs a JWT carrying `{sub,email,role,fullName}` (`be/src/middleware/auth.ts:35`); the FE stores token+user in `localStorage` and attaches `Authorization: Bearer`.
**Intended:** role‑gated access. **Reality:** `requireRoles` exists (`auth.ts:27`) but is used **nowhere**; `/auth/register` is public and mints a STUDENT + valid JWT; admin `/users*` routes have only `authenticate` — so any logged‑in student can mint an ADMIN (privilege escalation).

### 2.2 Class & enrollment
A `Class` is a concrete teaching section owned by a lecturer (`lecturerId`), with denormalized free‑text `subject`/`semester` (the design doc's `Course`/`Semester` entities were never built). Students join via `ClassEnrollment` with `@@unique([classId, studentId])` (the roster).
**Reality:** create takes `lecturerId` straight from `req.body` with no auth; enrollment, roster (`GET /classes/:id/students`) and student counts are unreachable or unsent by the wired DTOs.

### 2.3 Assignment lifecycle
`Assignment` (type `QUIZ`/`CODING`/`GROUP`) moves **DRAFT → PENDING_AI_REVIEW → PUBLISHED → CLOSED**. AI‑generated assignments enter `PENDING_AI_REVIEW` and only publish after a lecturer approves the `AIReview`. Quiz content is an opaque JSON blob in `Assignment.content` (no `AssignmentQuestion`/`Option`/`StudentAnswer` tables → no server‑side quiz auto‑grading).
**Reality:** the wired repository hardcodes `'DRAFT'` on every read and omits `status` from updates (`assignment.repository.ts:18,77-87`), so publish/close is silently lost — even seeded PUBLISHED assignments read back as DRAFT.

### 2.4 Submission lifecycle
`Submission` (`@@unique([assignmentId, studentId])`) moves **DRAFT → SUBMITTED → AI_GRADED → PUBLISHED**, carrying both a human `score` and inline `aiScore`/`aiFeedback`. GROUP work is modeled only by a free‑text `groupCode` (no `Group`/`GroupMember`), so group work is effectively individual with a label.
**Reality:** the entire submission + grade‑publish flow lives in orphaned `submissions.controller.ts` — unreachable.

### 2.5 AI grading / generation (human‑in‑the‑loop)
`AIJob` (type `EXERCISE_GENERATION`/`ASSESSMENT`/`LEARNING_FEEDBACK`) is the async queue; `AIReview` (1:1 to job) is the human gate; `LearningInsight` stores per‑student skill levels. The Node `runJob` (`ai.service.ts`) calls the Python service, stores results, and routes drafts through review before publish.
**Reality:** the AI controller/service are orphaned; even if wired, `/assess` and `/learning-feedback` omit the required `assignmentType` (FastAPI 422), and response keys mismatch (`aiSuggestedScore` vs `aiScore` → score stored as 0; feedback keys vs `skills` → `LearningInsight` never written). `AIJobStatus` also conflates run‑state and review‑state.

### 2.6 Discussions, notifications, admin
`DiscussionThread`/`DiscussionReply` are per‑class Q&A; `Notification` uses a free‑text `target` and a single global `read` flag (so the first reader marks a broadcast read for everyone — no per‑user state). `Subject`, `Content` (CMS), `ActivityLog` (audit) and `SystemSetting` cover catalog, content, audit and config.
**Reality:** all of these (stats, discussions, notifications, subjects, content, reports, settings) are orphaned controllers — the dashboards are non‑functional beyond login + bare lists.

---

## 3. System architecture (as deployed today)

```
                          ┌─────────────────────────────┐
   Browser  ──HTTPS──▶    │  FE  (React 19 + Vite)       │   static SPA (Vercel)
                          │  localStorage JWT            │
                          └──────────────┬──────────────┘
                                         │  fetch /api/*  (dev: Vite proxy → :3001)
                                         ▼
                          ┌─────────────────────────────┐
                          │  be  (Express 5 + Prisma)    │   :3001  (long-lived Node)
                          │  routes/index.ts = 15 routes │
                          │  ✅ auth, classes,           │
                          │     assignments, users       │
                          │  ⛔ ai, submissions, stats,  │   ← controllers exist but
                          │     reports, subjects, …     │     NOT mounted (orphaned)
                          └──────────────┬──────────────┘
                                         │  ⛔ NOT WIRED (ai.service.ts never called)
                                         ▼
                          ┌─────────────────────────────┐
                          │  ai  (FastAPI + Gemini)      │   :8000  (orphaned; stub mode on)
                          └─────────────────────────────┘
                                         │
                                         ▼
                              SQLite file (be/prisma/dev.db, db push, no migrations)
```

Legend: ✅ reachable · ⛔ exists in source but unreachable at runtime.

---

## 4. Top risks (confirmed critical/high, prioritized)

Ordered by product impact. "Fix" is the minimal corrective action; full sequencing is in §5.

| # | Sev | Area | Finding & impact | Fix |
|---|---|---|---|---|
| 1 | **CRIT** | FE↔BE | **~44 of ~57 FE calls 404** — every dashboard broken. Router serves 15 routes / 14 endpoints (`be/src/routes/index.ts`); FE defines ~57 `api.*` calls, only ~13 served (`FE/src/lib/api.ts`); unserved calls swallowed by `.catch(console.error)`. Implementations exist but are un‑routed. | Re‑register the legacy controllers (ai, submissions, reports, stats, subjects, contents, discussions, notifications, options, settings) **with `authenticate` + `requireRoles`**, or finish migrating them into `modules/*`. |
| 2 | **CRIT** | Backend | **No authorization enforced.** `requireRoles` defined but never used; `/users*` reachable by any logged‑in student (self‑register → mint ADMIN → delete/lock anyone); `/classes` & `/assignments` have **no `authenticate`** and take `lecturerId`/`classId` from `req.body` (`routes/index.ts:27-42`). | Add `authenticate` to all non‑public routes; `requireRoles('ADMIN')` on `/users*`; role gates on class/assignment writes; derive owner ids from `req.user`. |
| 3 | **CRIT** | AI | **Live Gemini API key hardcoded & committed** (`ai/core/config.py:4`), no inbound auth, open CORS with credentials (`ai/main.py:17-23`), bound to `0.0.0.0`. Anyone reaching the port or repo can spend billing / DoS. | **Revoke & rotate the key now**; load from env; scrub git history (filter‑repo/BFG); shared bearer secret BE↔AI; restrict CORS; rate‑limit. |
| 4 | **CRIT** | AI | **AI microservice orphaned + contract‑broken.** `ai.controller.ts`/`ai.service.ts` un‑routed; FE `/ai/*` 404. Even if wired: `/assess` & `/learning-feedback` omit required `assignmentType` (422); response keys mismatch → `aiScore`=0, `LearningInsight` never written. | Add an AI module/router under `/api/ai/*`; send `assignmentType`; add a field‑mapping layer; integration‑test with `AI_STUB_MODE=false`. |
| 5 | **HIGH** | Backend | **Assignment status never persisted/read.** Repo hardcodes `'DRAFT'` on restore and omits `status` from `update` (`assignment.repository.ts:18,77-87`), so publish/close via `PUT /assignments/:id` is silently lost. | Read `status` from the row in `restore()`; include `status` in `update()`; map domain status ↔ Prisma enum. |
| 6 | **HIGH** | Backend | **Lock‑user writes invalid enum `'BANNED'`** (`users.service.ts:75`) but `UserStatus` is `ACTIVE`/`INACTIVE` only → `PATCH /users/:id/lock` throws a Prisma error → 500. | Add `BANNED` to `UserStatus` and regenerate, or map lock → `INACTIVE`; align entity/service/schema and the FE `'locked'` check. |
| 7 | **HIGH** | Backend | **Auth‑middleware errors render as 500, not 401/403.** `authenticate`/`forbidden` throw the legacy `AppError`; `errorHandler` only `instanceof`‑checks the shared `AppError` → missing/invalid token falls to 500 (and leaks `String(err)` in non‑prod). | Unify on one `AppError` (or recognize both); return correct 401/403. |
| 8 | **HIGH** | Backend | **Wired *module* endpoints do no Zod validation** — the auth/classes/assignments controllers build DTOs straight from `req.body` (`assignment.controller.ts:18-26`, `class.controller.ts:18-26`, `auth.controller.ts:18`); the Zod schemas for those domains feed only orphaned controllers. (The legacy `UsersController`, though wired, *does* validate via `createUserSchema`/`updateUserSchema`.) Missing password reaches `bcrypt.compare`; bad `lecturerId` → Prisma FK 500; `validateDeadline` never called. | Apply Zod in the module controllers before DTO construction; validate FK existence or translate Prisma P2003/P2002 → 400/409. |
| 9 | **HIGH** | FE↔BE | **Shape drift + method mismatch.** DTOs omit `studentCount`/`lecturer` (class) and send `classId`/`dueAt` not `class`/`due`/`submitted` (assignment) → blank columns; FE `updateAssignment` uses **PATCH** but BE serves **PUT** → 404; `GET /classes/:id/students` has no route. | Align FE row types to actual DTOs (or enrich presenters); change FE to PUT; add the roster route. |
| 10 | **HIGH** | FE↔BE | **Editing a user silently drops email/role/password.** FE sends `{fullName,email,role,password?}` but `updateUserSchema` only allows `{fullName,status,externalId}`; Zod strips the rest → no‑op with a success message. | Expand `updateUserSchema` (hash password server‑side) and apply, or disable those fields in the form. |
| 11 | **HIGH** | Data/AI | **AI contract mismatch corrupts the data model.** In real mode `Submission.aiScore` is always 0 (publishable as official grade) and `LearningInsight` is only ever seed data. | Same mapping fix as #4; block publishing when no human score and `aiScore` is 0/absent. |
| 12 | **HIGH** | DB | **No indexes on FKs or hot paths** — only `LearningInsight.studentId` is indexed. `Class.lecturerId`, `Assignment.classId`, `Submission.studentId`, `AIJob.*`, `ActivityLog.createdAt` become full scans at scale. | Add `@@index` on every FK and on `createdAt` ordering columns. |
| 13 | **HIGH** | DB | **Hard‑delete of User violates Restrict FKs.** `Class.lecturer`, `AIJob.createdBy`, `Content.author`, discussion authors have no `onDelete` (default Restrict) but `usersService.delete` hard‑deletes → deleting any lecturer/author throws. | Soft‑delete users (`status=INACTIVE`), or define explicit `onDelete` and block hard delete when references exist. |
| 14 | **HIGH** | Deploy | **Deployment doesn't hang together beyond localhost.** Root `vercel.json` builds `npm run build` with no root `package.json`; FE prod has no `VITE_API_URL`; BE/AI have no serverless adapter; SQLite is ephemeral/write‑serialized on serverless. | Deploy BE/AI as long‑lived services; set `VITE_API_URL` + `CORS_ORIGIN` at build; move off SQLite to Postgres; remove the redundant root `vercel.json`. |

**Cross‑cutting medium risks** (track, don't block Phase 1): AI silent fallback masking failures as a fixed 7.5/10 grade; `/security/logs` has *no* handler anywhere; weak default `JWT_SECRET` in `.env.example`; `AIJobStatus` conflates run/review state; notification per‑user read state unmodeled; group/quiz subsystems unmodeled; class‑delete cascades destroy grades with no archive; role‑casing UI bugs in `DashboardTopbar`; orphaned React Query + RHF/Zod layers carrying bundle cost with no benefit.

---

## 5. Remediation strategy (phased roadmap)

The dominant project risk is the **abandoned dual‑architecture migration**: `be/src` carries ~2× the domain code, only 3 of ~13 domains migrated, and the router wires the weaker stack.

> **Decision taken (2026‑06‑25):** **Clean Architecture (`modules/`) is the target.** New domain work follows the `modules/{domain,application,infrastructure,presentation}` pattern; the legacy flat layer is **migration source material, not to be extended**. See [`be/CONTRIBUTING.md`](../be/CONTRIBUTING.md). Where speed matters, a domain may be *temporarily* re‑routed from its legacy controller behind proper auth as a stopgap, but the backlog item is to migrate it into a module.

### Phase 0 — Stabilize & stop the bleeding (days)
*Eliminate active security exposure and make the build trustworthy before changing behavior.*
- **W0.1** Rotate the Gemini key; move to env (`pydantic-settings`); scrub git history. (Risk #3)
- **W0.2** Lock down the reachable surface: `authenticate` on `/classes` & `/assignments`; `requireRoles('ADMIN')` on `/users*`; derive `lecturerId` from `req.user`. (Risk #2)
- **W0.3** Unify error handling so auth failures return 401/403. (Risk #7)
- **W0.4** Confirm `tsc` is green under `noUnusedLocals`/`noUnusedParameters`; remove stray artifacts (`be/null`, duplicate `asyncHandler` files, `FE/scaffold.*`).
- **W0.5** Replace the guessable default `JWT_SECRET`; document required env.

### Phase 1 — Unify backend architecture & wire the FE↔BE contract (1–2 sprints)
*This single workstream fixes the headline outage — every dashboard depends on it.*
- **W1.1** Ratify the chosen stack; delete or clearly fence the unused half; remove duplicate repos/services.
- **W1.2** Make every domain reachable behind `authenticate` + `requireRoles` (migrate to `modules/*`, or stopgap‑route the legacy controller). (Risk #1)
- **W1.3** Fix the wired correctness bugs: assignment status (#5), lock enum (#6), Zod validation (#8), user‑edit field drop (#10).
- **W1.4** Reconcile contracts: enrich class/assignment DTOs (or align FE types); add `GET /classes/:id/students`; FE `updateAssignment` → PUT; implement/remove `/security/logs`; normalize role casing at the boundary. (Risk #9)
- **W1.5** Add an integration smoke test asserting every FE `api.*` path resolves to a registered route (fails CI on drift).

### Phase 2 — Complete the AI integration end to end (1–2 sprints)
*The product's headline value, currently running nowhere.*
- **W2.1** Route the AI module under `/api/ai/*` behind auth. (Risk #4)
- **W2.2** Fix the BE↔AI contract: send `assignmentType`; explicit field mapping; validate against `AI_STUB_MODE=false`. (Risks #4, #11)
- **W2.3** Make AI failures observable: return a structured degraded flag so the BE marks the job FAILED instead of persisting a fabricated 7.5/10; block publishing a 0/absent `aiScore` without a human score.
- **W2.4** Secure the AI service: shared bearer secret, restricted CORS, rate limit, timeouts/retries, prompt‑injection mitigation (delimit/escape untrusted student content).
- **W2.5** Disambiguate `AIJobStatus` (run‑state vs review‑state); link `Submission` → originating `AIJob`.

### Phase 3 — Harden, model‑complete & scale (ongoing)
- **W3.1** DB hardening: FK/`createdAt` indexes (#12); soft‑delete users (#13); `NotificationRecipient` for per‑user read state; model `Group`/`GroupMember` and `AssignmentQuestion`/`Option`/`StudentAnswer` (or formally scope quiz/group out); `deletedAt`/archive on Class/Assignment/Submission.
- **W3.2** Migrate off SQLite + `db push` to Prisma `migrate` + Postgres; real job queue instead of `setImmediate` + busy‑poll.
- **W3.3** Deployment topology: containerize/PaaS BE & AI; build‑time `VITE_API_URL`; correct `CORS_ORIGIN`; remove the redundant root `vercel.json`. (Risk #14)
- **W3.4** Adopt or delete the FE pillars: migrate pages onto the existing React Query hooks + RHF/Zod and use `ErrorState`/`ErrorBoundary` instead of `.catch(console.error)`, or remove the dependencies. Wire `t()` into dashboards or drop en/ja from the in‑app switcher.
- **W3.5** Testing & CI: introduce unit + integration tests (none today); enforce the §W1.5 contract test and a BE↔AI schema test.

---

## 6. Documentation plan

The project suffers **doc drift**: `FE/ARCHITECTURE.md` documents a `services/ + providers/ + context/` tree and React Query/RHF as the core pattern, none of which match reality; `aita_database_design.md.resolved` describes structured‑quiz/group/semester tables that were never built; no README mentions the AI service or warns that dashboards are non‑functional.

Living docs (created in this review + to maintain):
1. **This review** (`docs/CODEBASE_REVIEW.md`) — re‑run subsystem reviews at each phase boundary; update the maturity table.
2. **`be/CONTRIBUTING.md`** — backend single source of truth: endpoint inventory, auth/role model, error envelope, the Clean‑Architecture rules, the BE↔AI contract.
3. **`FE/CONTRIBUTING.md`** — actual `features/*/services` + `store/*` layout, the real data‑fetching pattern, role‑casing boundary, env requirement.
4. **`ai/CONTRIBUTING.md`** — the previously undocumented AI service: endpoints, prompts, config, security TODOs.
5. **`CLAUDE.md`** — project map + the rule (see §7) that keeps all of the above current.

**Future, CI‑enforced** (Phase 1/2): `docs/CONTRACTS.md` (FE↔BE↔AI, fails CI on drift) and `docs/DATABASE.md` (reconcile `aita_database_design.md.resolved` with the schema, tie each change to a Prisma migration).

---

## 7. How these docs stay current

A root [`CLAUDE.md`](../CLAUDE.md) instructs the AI coding assistant (Claude Code) to update the relevant doc **in the same change** whenever it touches a structural surface — specifically:

| If you change… | Update… |
|---|---|
| `be/src/routes/index.ts`, a `modules/*` boundary, the DI container | `be/CONTRIBUTING.md` (endpoint inventory, module list) |
| `FE/src/lib/api.ts`, `FE/src/routes/index.tsx`, `features/*`, `constants/navigation.ts` | `FE/CONTRIBUTING.md` |
| `ai/api/routes/*`, `ai/schemas/app_schemas.py`, `ai/core/config.py` | `ai/CONTRIBUTING.md` |
| `be/prisma/schema.prisma` | this review's §2 + (future) `docs/DATABASE.md` |

Each doc carries a **"Last verified"** date in its header; bump it whenever you reconcile it with the code.

---

## Appendix — review provenance

This assessment was produced by a multi‑agent analysis: five parallel deep readers (Backend, Frontend, AI, DB, Integration), an adversarial verification pass that re‑checked every critical/high finding against the source (35/35 confirmed/partial), and a synthesis stage. The detailed per‑subsystem reports are archived in the session scratchpad and summarized here. Re‑running the same review at each phase gate is the intended way to keep this document honest.
