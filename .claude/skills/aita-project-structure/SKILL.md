---
name: aita-project-structure
description: Use when navigating the AITA monorepo or deciding where a new file goes — covers the FE/ (React+Vite), be/ (Express modular clean architecture), and ai/ layout, plus the dead/legacy areas to never imitate.
---

# AITA — Project Structure

Monorepo with three top-level apps: **`FE/`** (React+Vite+TS frontend), **`be/`** (Node+Express+Prisma backend), **`ai/`** (AI microservice). Deploy via Vercel (`vercel.json`).

> **Source of truth = the code + `FE/CONTRIBUTING.md` and `be/CONTRIBUTING.md`.** `FE/ARCHITECTURE.md` is aspirational/out-of-date; parts of `be/CONTRIBUTING.md` are stale (see `aita-conventions`). Verify against real files.

## Frontend (`FE/src/`)
```
routes/index.tsx        # single route table → AppRoutes()
lib/api.ts              # THE api client + every api.* method + all XxxRow/CreateXxxBody types
lib/schemas/            # zod schemas — ORPHANED (not wired), ignore unless adopting
store/                  # React Context "state layer": AuthContext, ThemeContext, LanguageContext, ReactQueryProvider(unused)
pages/{home,admin,lecturer,student}/   # role-prefixed pages (AdminUsers, LecturerAssignments…)
layouts/                # PublicLayout/*, DashboardLayout/Sidebar/Topbar/Footer
components/ui/          # design system (Button, Card, DataTable, Badge, Input, PageHeader, EmptyState…)
components/common/      # ErrorBoundary, ErrorState(APIError), LoadingSpinner (barrel index.ts)
components/icons/IconMap.tsx   # string→LucideIcon registry
constants/              # navigation.ts (nav arrays), content.ts (marketing copy)
utils/i18n.ts           # i18next init + inline vi/en/ja resources
styles/index.css        # Tailwind v4 entry + @theme tokens
types/index.ts          # generic UI types ONLY (domain types live in lib/api.ts)
```
**Path alias `@/` → `src/`.** Dead — do NOT imitate: `features/*` (empty barrels), `components/motion/` (empty), `scaffold.js/.ps1`, `fix_imports.js`, `ARCHITECTURE.md`.

## Backend (`be/src/`)
Pure modular Clean Architecture: `modules/<feature>/{domain,application,infrastructure,presentation}` + a shared layer. The old flat `controllers/`, `services/`, `repositories/` dirs were **deleted** in the refactor — they no longer exist.
```
modules/<feature>/
  domain/         entities/*.entity.ts (create()/restore() factories), repositories/<x>-repository.interface.ts (I-prefixed, takes/returns domain entities)
  application/    dtos/<x>.dto.ts (Zod + DTO classes), use-cases/<verb>-<noun>.use-case.ts (1 class/op, port-injected)
  infrastructure/ mappers/<x>.mapper.ts (row↔entity), repositories/prisma-<x>-repository.ts (implements interface, uses mapper)
  presentation/   <x>.controller.ts (extends BaseController), <x>.router.ts (export class XRouter)
shared/
  application/    app.error.ts, base-use-case.ts, ports/{i-token-service,i-hash-service,i-event-dispatcher,unit-of-work.interface,logger.interface,ai-service.interface}.ts
  constants/      messages.ts (MESSAGES — centralized Vietnamese strings)
  domain/         base-entity.ts, domain-event.ts
  infrastructure/ di-container.ts, tokens.ts (TOKENS symbols), jwt-token-service.ts, bcrypt-hash-service.ts, event-dispatcher.ts, prisma-unit-of-work.ts, logger.ts
  presentation/   api-response.ts, base-controller.ts, async-handler.ts, route-manager.ts
config/env.ts   database/prisma.ts   middleware/{auth,errorHandler,request-id,request-logger,rate-limiter}
utils/{async-handler,response,params,mappers,user}   app.ts (createApp)   server.ts
```
`route-manager.ts` mounts ~17 module routers (incl. `/health`); each resolves its controller from the DI `container` by `TOKENS` symbol. Notable: there is **no `assignments` module** — `/assignments` is mounted to `ExamsRouter` (legacy FE still calls that path). `utils/async-handler.ts` duplicates `shared/presentation/async-handler.ts` (2 routers still import the `utils` copy); `utils/response.ts` is dead (use `BaseController`). See `aita-be-architecture`, `aita-be-services-and-ports`.

See: `aita-be-architecture` (golden path), `aita-fe-data-and-api`, `aita-conventions`.
