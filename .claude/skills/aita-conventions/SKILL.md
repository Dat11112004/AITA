---
name: aita-conventions
description: Use whenever writing or reviewing ANY AITA code (FE or BE) — cross-cutting rules: trust code over stale docs, Vietnamese UI strings, role casing, and the installed-but-unused libraries you must NOT use.
---

# AITA — Cross-cutting Conventions

## Trust the code, not the stale docs
- `FE/ARCHITECTURE.md` = aspirational, wrong. Do not seed patterns from it.
- `be/CONTRIBUTING.md` is stale on: success envelope (`{success,data}` ❌ → real is `{statusCode, Message, Data, timestamp}`), DB (SQLite ❌ → SQL Server), ids (`cuid()` ❌ → `uuid()`), router file, and the now-deleted flat `controllers/services/repositories` layer. Trust `schema.prisma`, `shared/presentation/{api-response,base-controller}.ts`, `shared/constants/messages.ts`, `route-manager.ts`.
- `FE/CONTRIBUTING.md` IS reliable (code-verified). Mirror its data-fetching / golden-path / coding rules.

## Installed but UNUSED — do NOT write code with these
| Side | Installed but unused | Use instead |
|---|---|---|
| FE | `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, page-level `zod`, `class-variance-authority`, `clsx` | `useState/useEffect` + `api` client; native forms + manual validation; `Record<Variant,string>` maps |
| BE | `passport`, `passport-google-oauth20`, `passport-github2`, `express-session` | pure JWT + bcrypt (`aita-be-validation-and-auth`) |

If you genuinely want to introduce one of these, treat it as a **new convention** and confirm with the user first — don't silently diverge.

## Universal rules
- **User-facing strings are Vietnamese** (errors, messages, button labels). Match existing tone: "Đang tải...", "Thử lại", "Tạo … thành công".
- **Role casing:** BE keeps **UPPERCASE** (`ADMIN`/`LECTURER`/`STUDENT`) end-to-end in DB + JWT + guards. FE **lowercases at the api boundary** (in `lib/api.ts` / `AuthContext`). On FE, always `.toLowerCase()` a role before keying a record or building a path.
- **FE:** import via `@/` alias across folders; **named exports only** (no `default` except `App.tsx`, `utils/i18n.ts`); `import type {…}` for types (verbatimModuleSyntax); no semicolons, single quotes, 2-space.
- **BE:** ESM NodeNext → **explicit `.js` import specifiers** even from `.ts` (`import { MESSAGES } from '../../../shared/constants/messages.js'`); controllers respond via `BaseController` helpers (`this.ok/created`), not a standalone `ok()`; never `console.log` (use an injected `ILogger`/`Logger`); unused params prefixed `_`; `npm run build` (tsc) must be green.
