---
name: aita-be-prisma
description: Use when touching the AITA database — Prisma on SQL Server, PascalCase models/fields, uuid ids, String-column "enums" + Zod, the repository↔mapper↔domain pattern, Unit of Work (resolve by token), and the db push + seed workflow.
---

# AITA BE — Prisma & Persistence

Datasource is **SQL Server** (`provider = "sqlserver"`). (Docs that say SQLite/`cuid()` are stale.)

## Schema conventions (`prisma/schema.prisma`)
- **PascalCase everywhere** — models (`User`, `Class`, `RefreshToken`, `UserRole`) AND every field (`Id`, `Email`, `PasswordHash`, `FullName`, `SubjectId`, `Note`). App code reads Prisma rows in PascalCase; camelCase appears only after a mapper/DTO.
- **IDs:** `Id String @id @default(uuid()) @db.UniqueIdentifier`. App-created rows also use `uuid()`.
- **Types:** money/scores `Decimal? @db.Decimal`; timestamps `DateTime? @db.DateTime2`; big counters `BigInt?`. **Most scalars are nullable** → defensive `?.` / `?? default`.
- **No Prisma `enum` blocks.** "Enums" are nullable `String?` columns (`Status`, `ExamType`); allowed values enforced by **Zod `z.enum([...])`** at the boundary, TS union types in the domain.
- **Join tables** use composite keys: `@@id([UserId, RoleId])`. Relations: `onDelete: NoAction, onUpdate: NoAction`. Auth V2 added `RefreshToken { Id, UserId, Token, ExpiresAt, IsRevoked }`.

## Repository ↔ Mapper ↔ Domain
Repositories return **domain entities**, not raw Prisma rows. Row↔entity conversion lives in a static **mapper** under `infrastructure/mappers/<x>.mapper.ts`, called only from the repository:
```ts
// infrastructure/mappers/class.mapper.ts
export class ClassMapper {
  static toDomain(raw: any): Class { return Class.restore(raw.Id, raw.ClassCode, raw.SubjectId, raw.SemesterId, raw.Status) /* +attach raw.Subject etc. */ }
  static toPersistence(c: Class) { return { Id: c.id, ClassCode: c.classCode, SubjectId: c.subjectId, SemesterId: c.semesterId, Status: c.status } }
}
// infrastructure/repositories/prisma-class-repository.ts
import { ClassMapper } from '../mappers/class.mapper.js'
export class PrismaClassRepository implements IClassRepository {
  constructor(private readonly client: any) {}              // client is still typed `any` in most repos
  private get include() { return { InstructorClass: { include: { User: true } }, Subject: true, Semester: true, _count: { select: { StudentClass: true } } } }
  async findById(id: string): Promise<Class | null> {
    const raw = await this.client.class.findUnique({ where: { Id: id }, include: this.include })
    return raw ? ClassMapper.toDomain(raw) : null
  }
  async create(c: Class): Promise<void> { await this.client.class.create({ data: ClassMapper.toPersistence(c) }) }
  async update(c: Class): Promise<void> { await this.client.class.update({ where: { Id: c.id }, data: ClassMapper.toPersistence(c) }) }
}
```
Mapper method names are not uniform across modules (`UserMapper` exposes `toDomain`/`toCreateData`/`toUpdateData`; `ClassMapper` exposes `toDomain`/`toPersistence`). None expose `toResponse` — response shaping stays in `*ResponseDto.from`. `client` is still `any` in most repos; `UserMapper` is the strongly-typed exception (`Prisma.UserGetPayload`-style input).

## Transactions — Unit of Work (resolve by token)
Multi-write ops run inside `IUnitOfWork.runInTransaction`; tx-scoped repos are pulled with `resolve<T>(TOKENS.X)` (NOT a `tx.xRepository` property):
```ts
return this.uow.runInTransaction(async (txUow) => {
  const userRepo = txUow.resolve<IUserRepository>(TOKENS.UserRepository)
  const activityRepo = txUow.resolve<IActivityRepository>(TOKENS.ActivityRepository)
  await userRepo.create(user)
  const role = await userRepo.findRoleByName('STUDENT')
  if (role) await userRepo.assignRole(user.id, role.id)
  await activityRepo.create({ userId: user.id, action: 'STUDENT_REGISTER', entity: 'User', entityId: user.id })
})
```
The UoW copies its registered factories into the child tx UoW so repos share the transactional client. Read-only use-cases inject a single repo interface instead of the UoW.

## Workflow (npm scripts) — `db push`, not `migrate dev`
```
npm run db:generate   # prisma generate
npm run db:push       # prisma db push   ← schema sync in normal dev
npm run db:seed       # tsx prisma/seed.ts
npm run setup         # generate && db push && seed
```
Seed (`prisma/seed.ts`) seeds system roles (`ADMIN`, `LECTURER`, `STUDENT`) then users (hashed via bcrypt) + `userRole` join rows, then subjects/classes/exams. Seeded logins: `admin@fpt.edu.vn/admin123`, `lecturer@fpt.edu.vn/lecturer123`, `student@fpt.edu.vn/student123`.

See `aita-be-architecture`, `aita-be-services-and-ports`, `aita-be-validation-and-auth`.
