import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { Menu, X, Sun, Moon } from 'lucide-react'
import { PUBLIC_NAV, PORTAL_LINKS } from '@/constants/navigation'
import { Button } from '@/components/ui/Button'
import { LanguageDropdown } from '@/components/ui/LanguageDropdown'
import { useTheme } from '@/context/ThemeContext'
import { useLanguage } from '@/context/LanguageContext'

export function PublicHeader() {
  const [open, setOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  const { theme, toggleTheme } = useTheme()
  const { t } = useLanguage()
  const location = useLocation()

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 10)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  useEffect(() => { setOpen(false) }, [location])

  return (
    <header className={`sticky top-0 z-50 transition-all duration-300
      ${scrolled
        ? 'border-b border-amber-100 bg-bg-light-orange/95 backdrop-blur-xl shadow-sm dark:border-slate-800/80 dark:bg-[#0f1117]/95'
        : 'border-b border-transparent bg-bg-light-orange/80 backdrop-blur-sm dark:bg-[#0f1117]/80'
      }
    `}>
      <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-3.5 sm:px-6 lg:px-8">

        {/* Logo */}
        <Link to="/" className="group flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 transition-shadow group-hover:shadow-md">
            <img src="/images.png" alt="FPT" className="h-7 w-auto object-contain" />
          </div>
          <div>
            <p className="text-[15px] font-black leading-none text-slate-900 dark:text-white">AITA</p>
            <p className="text-[10px] font-medium leading-none text-slate-400 dark:text-slate-500 mt-0.5">AI Teaching Assistant</p>
          </div>
        </Link>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-7 md:flex">
          {PUBLIC_NAV.map((item) => {
            const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
            const transKey = (item.href === '/' ? 'nav.home' : `nav.${item.href.substring(1)}`) as any
            return (
              <Link key={item.href} to={item.href}
                className={`text-sm tracking-wide transition-colors duration-150 relative ${
                  isActive 
                    ? 'font-bold text-orange-600 dark:text-[#F37021]' 
                    : 'font-medium text-slate-600 hover:text-orange-500 dark:text-slate-400 dark:hover:text-orange-400'
                }`}
              >
                {t(transKey)}
                {isActive && (
                  <span className="absolute -bottom-1.5 left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-orange-600 dark:bg-[#F37021] shadow-[0_0_8px_#F37021]" />
                )}
              </Link>
            )
          })}
        </nav>

        {/* Desktop actions */}
        <div className="hidden items-center gap-2 md:flex">
          {/* Language dropdown */}
          <LanguageDropdown />

          {/* Theme toggle */}
          <button type="button" onClick={toggleTheme}
            className="h-9 w-9 flex items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100 hover:text-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-slate-200 transition-all"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={17} /> : <Sun size={17} className="text-amber-400" />}
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800 mx-1" />

          {PORTAL_LINKS.map((p) => (
            <Link key={p.path} to={p.path}>
              <Button variant="ghost" size="sm" className="min-w-[110px]">{t(`nav.${p.role}` as any)}</Button>
            </Link>
          ))}
          <Link to="/login">
            <Button variant="primary" size="sm" className="min-w-[110px]">{t('nav.login')}</Button>
          </Link>
        </div>

        {/* Hamburger */}
        <button type="button"
          className="flex h-9 w-9 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 md:hidden dark:text-slate-400 dark:hover:bg-slate-800 transition-colors"
          onClick={() => setOpen(!open)}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile menu */}
      {open && (
        <div className="border-t border-amber-100 bg-bg-light-orange px-4 pb-4 pt-3 md:hidden dark:border-slate-800 dark:bg-[#0f1117] animate-slide-in">
          <nav className="flex flex-col gap-1">
            {PUBLIC_NAV.map((item) => {
              const isActive = location.pathname === item.href || (item.href !== '/' && location.pathname.startsWith(item.href))
              const transKey = (item.href === '/' ? 'nav.home' : `nav.${item.href.substring(1)}`) as any
              return (
                <Link key={item.href} to={item.href}
                  className={`rounded-xl px-3 py-2.5 text-sm transition-colors flex items-center gap-2 ${
                    isActive
                      ? 'font-bold bg-orange-50 text-orange-600 dark:bg-orange-500/10 dark:text-[#F37021]'
                      : 'font-medium text-slate-700 hover:bg-slate-50 hover:text-orange-500 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-orange-400'
                  }`}
                >
                  {t(transKey)}
                  {isActive && <span className="h-1.5 w-1.5 rounded-full bg-orange-500 ml-auto" />}
                </Link>
              )
            })}
            <div className="my-2 h-px bg-slate-200 dark:bg-slate-800" />

            {/* Language picker mobile */}
            <div className="px-1 py-1">
              <p className="mb-2 text-[10px] font-bold uppercase tracking-widest text-slate-400 dark:text-slate-600 px-2">
                Ngôn ngữ
              </p>
              <LanguageDropdown variant="full" />
            </div>

            <button type="button" onClick={toggleTheme}
              className="flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
            >
              {theme === 'light' ? <Moon size={16} /> : <Sun size={16} className="text-amber-400" />}
              {theme === 'light' ? t('nav.theme.dark' as any) : t('nav.theme.light' as any)}
            </button>
            <div className="my-2 h-px bg-slate-200 dark:bg-slate-800" />
            <div className="space-y-2">
              {PORTAL_LINKS.map((p) => (
                <Link key={p.path} to={p.path}>
                  <Button variant="outline" size="sm" fullWidth>{t(`nav.${p.role}` as any)}</Button>
                </Link>
              ))}
              <Link to="/login"><Button variant="primary" size="sm" fullWidth>{t('nav.login')}</Button></Link>
            </div>
          </nav>
        </div>
      )}
    </header>
  )
}
