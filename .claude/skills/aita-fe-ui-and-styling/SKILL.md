---
name: aita-fe-ui-and-styling
description: Use when building AITA frontend UI — Tailwind v4 design tokens, the hand-rolled variant-map component pattern (NOT shadcn/cva), mandatory dark mode, and reusing components/ui.
---

# AITA FE — UI & Styling

## Tailwind v4 (CSS-first, no config file)
- Tokens live in `src/styles/index.css` under `@theme {…}`. Primary palette is **`brand-*`** (FPT soft orange, `bg-brand-600`, `text-brand-700`). Neutrals `slate-*`; semantics `emerald/red/amber/sky`. There is **no `tailwind.config.js`**.
- **Dark mode is class-based** (`@custom-variant dark`, `.dark` on `<html>` via `ThemeContext`). **Every element ships paired `dark:` classes** — mandatory. Dark surfaces use hex literals: `dark:bg-[#0f1117]`, `dark:bg-[#161b27]`.
- Custom utilities/animations exist as classes: `gradient-brand`, `glass`, `skeleton`, `animate-fade-in-up`, `animate-slide-in`, stagger `delay-75/150/…` (or inline `style={{ animationDelay: \`${i*60}ms\` }}`).

## Component variants = lookup maps (NOT cva/clsx/shadcn)
`components/ui/*` are bespoke. Replicate this exact pattern:
```tsx
type Variant = 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'lg'
const variants: Record<Variant, string> = {
  primary: 'bg-brand-600 text-white hover:bg-brand-700 dark:bg-brand-500',
  outline: 'border border-slate-300 dark:border-slate-700 …', /* … */
}
const sizes: Record<Size, string> = { sm: 'h-8 px-3 text-xs rounded-lg', md: 'h-10 px-4 text-sm rounded-lg', lg: '…' }

export function Button({ variant = 'primary', size = 'md', className = '', loading, disabled, ...props }: ButtonProps) {
  return (
    <button disabled={disabled || loading}
      className={`inline-flex items-center justify-center font-semibold transition-all ${variants[variant]} ${sizes[size]} ${className}`}
      {...props}>
      {loading ? <span className="…animate-spin…" /> : props.children}
    </button>
  )
}
```
Rules: every component takes `className = ''` and **appends it last** (caller override); loading buttons embed an inline spinner; empty/loading scalar fallback is the em-dash `'—'`.

## Reuse the design system — don't reinvent
Use `Button, Card, DataTable<T>, Badge, Input/Textarea/Select, PageHeader, EmptyState, StatCard` from `components/ui/`. Tables: `DataTable<T>` with inline `columns: Column<T>[]` (`{ key, header, render? }`), `keyExtractor`; status via `<Badge variant dot size="sm">`.

## Standard page skeleton
```tsx
<div className="space-y-6 animate-fade-in-up">
  <PageHeader title="…" description="…" breadcrumbs={[…]} actions={<Button>…</Button>} />
  <Card>{/* content, or <APIError/> / spinner */}</Card>
</div>
```
Icons: `lucide-react` directly (`<Plus size={16} />`), or via `components/icons/IconMap.tsx` `<Icon name="Users" />` for nav (register new icon names in `IconMap`).
