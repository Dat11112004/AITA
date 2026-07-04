---
name: aita-mobile-project-structure
description: Use when navigating or adding files to the AITA mobile app — the Expo (SDK 56) + expo-router + TypeScript layout under mobile/, the @/ alias, env vars, and where new code goes. Reuses the web BE contract; never modifies be/.
---

# AITA Mobile — Project Structure

`mobile/` is a **React Native + Expo (SDK 56) + TypeScript** app, sibling to `FE/`, `be/`, `ai/`. It is a NEW frontend on the **existing** Express/Prisma backend — it only **calls APIs**, never modifies `be/`. v1 targets the **Student** role.

```
mobile/
  app.json                 # expo config: scheme "mobile", expo-router plugin, typedRoutes
  .env / .env.example      # EXPO_PUBLIC_API_URL (BE base, e.g. http://10.0.2.2:3001/api on Android emu)
  expo-env.d.ts            # /// <reference types="expo/types" /> (typed EXPO_PUBLIC_* env)
  src/
    app/                   # expo-router FILE-BASED ROUTES (the only routed dir)
      _layout.tsx          # root: SafeAreaProvider + AuthProvider + auth-gating redirect
      index.tsx            # entry spinner → redirects by auth state
      login.tsx            # public Login screen
      (student)/           # role group (parens = NOT in the URL)
        _layout.tsx        # student Stack (brand header)
        dashboard.tsx
    lib/
      api.ts               # api client (mirrors FE/src/lib/api.ts) + types
      secureStore.ts       # token store (expo-secure-store; web→localStorage)
      i18n.ts              # i18next (vi)
    store/AuthContext.tsx  # login / logout / me
    constants/theme.ts     # Colors (light/dark) + Brand palette (brand-50..950)
    components/            # themed-text, themed-view (reusable)
    hooks/                 # use-color-scheme, use-theme
    global.css
```

- **Path alias:** `@/*` → `src/*` (tsconfig). Import across folders with `@/lib/api`, `@/store/AuthContext`, etc.
- **Routes live ONLY in `src/app/`** (file-based). Everything else is plain modules.
- **Env:** only `EXPO_PUBLIC_*` vars are exposed to the app (`process.env.EXPO_PUBLIC_API_URL`). Put the BE base URL there.
- **Reuse the web first:** match `FE/src/lib/api.ts` method/path/shape exactly; mirror its `XxxRow` types (see `aita-mobile-data-and-api`). Do not re-derive backend contracts.
- **Verify before claiming done:** `cd mobile && npx tsc --noEmit` and `npx expo-doctor` must pass; the app renders via `npx expo start` (device/emulator).

See `aita-mobile-navigation`, `aita-mobile-data-and-api`, `aita-mobile-auth`, `aita-mobile-styling`.
