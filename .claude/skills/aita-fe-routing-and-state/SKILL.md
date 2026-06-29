---
name: aita-fe-routing-and-state
description: Use when adding AITA frontend routes, role guards, navigation, React Context state, i18n, or forms (native, no react-hook-form).
---

# AITA FE — Routing, State & Forms

## Routing (`src/routes/index.tsx`)
Single `<Routes>` tree, eager imports. Three portal trees `/admin`, `/lecturer`, `/student`, each wrapped in guard + layout:
```tsx
<Route path="/admin" element={
  <ProtectedRoute allowedRole="admin">
    <ErrorBoundary>
      <DashboardLayout navItems={ADMIN_NAV} role="admin" roleLabel="Quản trị hệ thống" portalTitle="AITA Admin" />
    </ErrorBoundary>
  </ProtectedRoute>
}>
  <Route index element={<AdminOverview />} />
  <Route path="users" element={<AdminUsers />} />
  <Route path="assignments/:id" element={<AdminAssignmentDetail />} />
</Route>
<Route path="*" element={<Navigate to="/" replace />} />
```
- Public pages wrapped in `<PublicLayout/>`; `/login` standalone.
- **Guard** `features/auth/components/ProtectedRoute.tsx` (`allowedRole`): uses `useAuth()`, shows "Đang tải..." while loading, redirects to `/login?redirect=…` if unauthenticated, and to the user's own portal if role mismatches (role lowercased).
- **Nav config** `constants/navigation.ts`: `ADMIN_NAV/LECTURER_NAV/STUDENT_NAV: NavItem[]` (`{ id, label, path, icon: string, badge? }`) where `icon` is a **string key** resolved by `IconMap`. Keep the route table and nav array **in sync manually**. Navigate via `useNavigate()`/`<Link to>`; query via `useSearchParams()`.

## State (React Context, no Redux/Zustand)
Three contexts in `store/`: `useAuth()`, `useTheme()`, `useLanguage()`. Each follows the throw-if-outside pattern:
```ts
const ctx = useContext(AuthContext)
if (!ctx) throw new Error('useAuth must be used within AuthProvider')
return ctx
```
`AuthContext` memoizes value (`useMemo`), wraps actions in `useCallback`, persists `aita_token`/`aita_user` to localStorage. Provider nesting in `main.tsx` (preserve order): `ReactQueryProvider → BrowserRouter → ThemeProvider → LanguageProvider → AuthProvider`. Local page state = `useState`/`useEffect`.

## i18n
`utils/i18n.ts` = i18next with inline vi/en/ja resources, flat dotted keys (`'auth.email'`), `fallbackLng: 'vi'`. **Consume via `useLanguage()`**, not `useTranslation` directly: `const { t } = useLanguage(); t('auth.email')`. Only ~40 keys exist (public site + login); dashboards are hardcoded Vietnamese.

## Forms (native — no react-hook-form / zod resolver)
```tsx
const [form, setForm] = useState({ fullName: '', email: '', role: 'student' })
const [error, setError] = useState('')
const handleSave = async (e: React.FormEvent) => {
  e.preventDefault(); setError('')
  if (!form.fullName || form.fullName.trim().length < 2) { setError('Họ tên phải có ít nhất 2 ký tự'); return }
  if (!form.email.includes('@')) { setError('Email không hợp lệ'); return }
  setSaving(true)
  try { editing ? await api.updateUser(id, form) : await api.createUser(form); resetForm(); load() }
  catch (e) { setError(e instanceof Error ? e.message : 'Thao tác lưu thất bại') }
  finally { setSaving(false) }
}
```
Use `ui/Input`/`Textarea`/`Select` (accept `label`, `hint`, `error`, `leftIcon`). Submit buttons disable + spin while saving. Confirmation = inline red `<Card>` with confirm/cancel (no `window.confirm`/modal).
