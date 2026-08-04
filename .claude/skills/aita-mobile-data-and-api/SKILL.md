---
name: aita-mobile-data-and-api
description: Use when fetching or mutating server data in the AITA mobile app — the api client (mirrors FE/src/lib/api.ts) with secure-store Bearer + refresh-token rotation, and the useState/useEffect screen fetch pattern (NOT react-query).
---

# AITA Mobile — Data Fetching & API

The client (`src/lib/api.ts`) is a **port of `FE/src/lib/api.ts`** — same envelope unwrap, same `ApiError`, same Vietnamese fallback. Differences: `BASE = process.env.EXPO_PUBLIC_API_URL`, Bearer token from **secure-store**, and a one-shot **refresh-token rotation** on 401 against BE `POST /auth/refresh-token`.

```ts
async function request<T>(path: string, options: RequestInit = {}, allowRefresh = true): Promise<T> {
  const token = await secureStore.getToken()
  const res = await fetch(`${BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(options.headers ?? {}) },
  })
  if (res.status === 401 && allowRefresh && (await tryRefresh())) return request<T>(path, options, false)
  const json: any = await res.json().catch(() => ({}))
  if (!res.ok || json.success === false || json.statusCode >= 400)
    throw new ApiError(json.Message || json.error?.message || res.statusText || 'Lỗi API', json.statusCode || res.status, json.error?.code)
  return (json.Data !== undefined ? json.Data : json.data) as T   // BE envelope: { statusCode, Message, Data, timestamp }
}
```
- **Add an endpoint:** a terse arrow on `api`, mirroring the web path/method/shape exactly; add/reuse the `XxxRow` type at the bottom of `api.ts` (mirror `FE/src/lib/api.ts`). Role is lowercased at this boundary.
- **Types mirror the web** (`AuthUser`, `ClassRow`, `AssignmentRow`, `SubmissionRow`, `NotificationRow`). Don't invent new shapes — match the BE contract the web already uses.

## Screen fetch pattern (useState/useEffect — NO react-query)
Same shape as the web's canonical pattern:
```tsx
const [rows, setRows] = useState<ClassRow[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<string | null>(null)

const load = useCallback(() => {
  let alive = true
  setLoading(true); setError(null)
  api.getClasses()
    .then((d) => { if (alive) setRows(d ?? []) })
    .catch((e) => { if (alive) setError(e instanceof ApiError ? e.message : 'Không thể tải dữ liệu') })
    .finally(() => { if (alive) setLoading(false) })
  return () => { alive = false }
}, [])
useEffect(() => load(), [load])

if (loading) return <ActivityIndicator color={BrandTint} />
if (error) return <ErrorView message={error} onRetry={load} />   // show error + retry; never swallow
```
- **Mutations:** `await api.x(...)` then call `load()` to refetch (no optimistic cache).
- **Always surface errors** (message + retry); never silent `.catch(() => {})`.
- The BE may be unreachable on a device — set `EXPO_PUBLIC_API_URL` to a reachable host (Android emu `10.0.2.2`, device = LAN IP).

See `aita-mobile-auth`, `aita-mobile-styling`.
