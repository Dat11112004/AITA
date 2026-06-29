---
name: aita-fe-data-and-api
description: Use when fetching or mutating server data in the AITA frontend — the api client (src/lib/api.ts) and the canonical useState/useEffect loading+error pattern. NOT react-query.
---

# AITA FE — Data Fetching & API Client

There is **no react-query in app code**. Server data lives in component `useState`, fetched via the flat `api` object.

## The api client (`src/lib/api.ts`)
- Internal `request<T>(path, options)`: attaches `Authorization: Bearer <token>` (token from `localStorage[AUTH_STORAGE_KEYS.token]`), unwraps the server envelope (`json.Data ?? json.data`), throws `ApiError(message, status, code)` on `!res.ok || json.success===false || json.statusCode>=400`.
- Add an endpoint as a terse arrow method, and its types at the **bottom of `api.ts`** (`XxxRow`, `CreateXxxBody`):
```ts
// in the `api` object:
getAssignments: (params: AssignmentFilter) =>
  request<AssignmentRow[]>(`/assignments?${new URLSearchParams(params as any)}`),
createAssignment: (body: CreateAssignmentBody) =>
  request<AssignmentRow>('/assignments', { method: 'POST', body: JSON.stringify(body) }),
// at bottom of file:
export interface AssignmentRow { id: string; title: string; status: string /* … */ }
export interface CreateAssignmentBody { title: string; type?: string /* … */ }
```

## Canonical page fetch pattern (Variant B — with `alive` guard)
```ts
const [rows, setRows] = useState<AssignmentRow[]>([])
const [loading, setLoading] = useState(true)
const [error, setError] = useState<Error | null>(null)

const load = useCallback(() => {
  let alive = true
  setLoading(true); setError(null)
  api.getAssignments(params)
    .then(res => { if (alive) setRows(res || []) })
    .catch(err => { if (alive) setError(err) })
    .finally(() => { if (alive) setLoading(false) })
  return () => { alive = false }
}, [params])
useEffect(() => { const cleanup = load(); return cleanup }, [load])

if (loading) return <div className="flex justify-center p-12"><Loader2 className="animate-spin text-brand-600" /></div>
if (error) return <APIError error={error} onRetry={load} />
```

## Rules
- **Mutations:** `await api.x(...)` then call `load()` to refetch. No optimistic updates, no cache.
- **Always** surface errors via `<APIError error onRetry={load} />` (from `components/common`) — **never** `.catch(console.error)` (swallows errors → blank UI).
- Error message idiom: `err instanceof Error ? err.message : 'fallback tiếng Việt'`.
- Multiple fetches: `Promise.all([...]).catch(setError).finally(...)`.
- The mounted-but-unused `ReactQueryProvider` stays; don't query through it.

See `aita-fe-ui-and-styling` (loading/error UI), `aita-conventions` (role lowercasing).
