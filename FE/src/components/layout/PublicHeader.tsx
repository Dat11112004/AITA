import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Menu, X } from 'lucide-react'
import { PUBLIC_NAV, PORTAL_LINKS } from '@/constants/navigation'
import { Button } from '@/components/ui/Button'

export function PublicHeader() {
  const [open, setOpen] = useState(false)

  return (
    <header className="sticky top-0 z-50 border-b border-orange-100 bg-white/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
      <Link
  to="/"
  className="flex items-center gap-3"
>
  <div className="rounded-2xl bg-white p-2 shadow-sm">
    <img
      src="/images.png"
      alt="FPT Logo"
      className="h-9 w-auto object-contain"
    />
  </div>

  <div>
    <h1 className="text-lg font-black tracking-tight text-slate-900">
      AITA Platform
    </h1>

    <p className="text-xs font-medium text-slate-500">
      AI Teaching Assistant
    </p>
  </div>
</Link>

        <nav className="hidden items-center gap-8 md:flex">
          {PUBLIC_NAV.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="text-sm font-semibold text-slate-600 transition hover:text-[#F37021]"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          {PORTAL_LINKS.map((p) => (
            <Link key={p.path} to={p.path}>
              <Button variant="ghost" size="sm">
                {p.label}
              </Button>
            </Link>
          ))}
        </div>

        <button
          type="button"
          className="rounded-lg p-2 text-slate-600 md:hidden"
          onClick={() => setOpen(!open)}
          aria-label="Menu"
        >
          {open ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {open && (
        <div className="border-t border-slate-200 bg-white px-4 py-4 md:hidden">
          <nav className="flex flex-col gap-3">
            {PUBLIC_NAV.map((item) => (
              <a
                key={item.href}
                href={item.href}
                className="text-sm font-medium text-slate-700"
                onClick={() => setOpen(false)}
              >
                {item.label}
              </a>
            ))}
            <hr className="my-2 border-slate-200" />
            {PORTAL_LINKS.map((p) => (
              <Link key={p.path} to={p.path} onClick={() => setOpen(false)}>
                <Button variant="outline" size="sm" fullWidth>
                  {p.label}
                </Button>
              </Link>
            ))}
          </nav>
        </div>
      )}
    </header>
  )
}
