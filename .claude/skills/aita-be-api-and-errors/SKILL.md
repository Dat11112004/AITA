---
name: aita-be-api-and-errors
description: Use when returning responses or handling errors in the AITA backend — BaseController response helpers + MESSAGES constants, the ApiResponse envelope, the AppError hierarchy, asyncHandler, and the central errorHandler.
---

# AITA BE — Responses & Errors

## Success responses — via `BaseController`
Controllers `extend BaseController` (`shared/presentation/base-controller.ts`) and respond with its protected helpers + a `MESSAGES.*` constant (`shared/constants/messages.ts`) — never hand-roll `res.json` or inline strings:
```ts
this.ok(res, result, MESSAGES.CLASS_LIST_SUCCESS)        // 200
this.created(res, result, MESSAGES.SUBJECT_CREATE_SUCCESS) // 201
this.noContent(res)                                       // 204
this.paginated(res, items, total, page, limit, MESSAGES.X) // 200 + meta
```
> `utils/response.ts` `ok()` is **dead** (zero importers) — superseded by `BaseController`. Don't reintroduce it.

These serialize via `ApiResponse` (`shared/presentation/api-response.ts`) — note **PascalCase `Message`/`Data`** + `statusCode` (the `success` boolean is a getter, not serialized):
```jsonc
{ "statusCode": 201, "Message": "Tạo môn học thành công", "Data": { … }, "timestamp": "2026-…" }
```
`ApiResponse` statics: `.success(message, data, status?)`, `.pagination(message, items, total, page, limit)`, `.error/.badRequest/.unauthorized/.forbidden/.notFound/.conflict/.created`. All messages are **Vietnamese**, sourced from `MESSAGES`.

## Errors — throw, never `res.json`
Use-cases, middleware, controllers **throw** a shared `AppError` subclass from `shared/application/app.error.ts`:

| Throw | code | status |
|---|---|---|
| `ValidationError` | VALIDATION_ERROR | 400 |
| `UnauthorizedError` | UNAUTHORIZED | 401 |
| `ForbiddenError` | FORBIDDEN | 403 |
| `NotFoundError` | NOT_FOUND | 404 |
| `ConflictError` | CONFLICT | 409 |
| `TooManyRequestsError` | TOO_MANY_REQUESTS | 429 |
| `ServiceUnavailableError` | SERVICE_UNAVAILABLE | 503 |
| `InternalServerError` | INTERNAL_SERVER_ERROR | 500 |

```ts
throw new UnauthorizedError(MESSAGES.AUTH_INVALID_CREDENTIALS)
throw new NotFoundError(MESSAGES.CLASS_NOT_FOUND)
```
`AppError` carries `code`, `statusCode`, optional `details`, and a `toJSON()` that includes `stack` only when `NODE_ENV === 'development'`.

## Plumbing (don't bypass)
- **`asyncHandler`** (`shared/presentation/async-handler.ts`) wraps every route handler so rejected promises reach the error middleware: `Promise.resolve(fn(req,res,next)).catch(next)`. (A byte-identical duplicate at `utils/async-handler.ts` is still imported by `ai`/`classes` routers — prefer the shared one.)
- **`errorHandler`** (`middleware/errorHandler.ts`, registered LAST in `app.ts`) maps `JsonWebTokenError`/`TokenExpiredError`→401, Prisma `P2002`→409, `P2025`→404, `AppError`→its `statusCode` (+stack in dev), `ZodError`→400 with `err.flatten()` as `Data`, else 500. Error responses use the SAME `{ statusCode, Message, Data, timestamp }` envelope.
- **Let `ZodError` bubble** from `Dto.from()` — do not try/catch it in the controller.

See `aita-be-architecture`, `aita-be-validation-and-auth`.
