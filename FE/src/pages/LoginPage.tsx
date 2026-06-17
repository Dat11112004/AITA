import { useState, useEffect } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  GraduationCap, Mail, Lock, Eye, EyeOff,
  ArrowRight, Sparkles, ShieldCheck, CheckCircle2, Sun, Moon,
  Brain, BookOpen, Users,
} from 'lucide-react'
import { LiveClock } from '@/components/ui/LiveClock'
import { useAuth } from '@/store/AuthContext'
import { ApiError } from '@/lib/api'
import type { UserRole } from '@/types'
import { useLanguage } from '@/store/LanguageContext'
import { useTheme } from '@/store/ThemeContext'

const roleRedirect: Record<string, string> = {
  admin: '/admin', lecturer: '/lecturer', student: '/student',
}

/* ────────────────────────────────────────────────── */
export function LoginPage() {
  const { t, language, setLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const { login } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [])

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)

  const go = (role: UserRole) => {
    const r = params.get('redirect')
    const lowerRole = role.toLowerCase()
    navigate(r?.startsWith(`/${lowerRole}`) ? r : roleRedirect[lowerRole])
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setLoading(true)
    try { go(await login(email, password)) }
    catch (e) { setErr(e instanceof ApiError ? e.message : t('auth.failed.login')) }
    finally { setLoading(false) }
  }

  return (
    <div className="flex h-screen overflow-hidden bg-white dark:bg-[#0f1117]">

      {/* ══ LEFT PANEL ══════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col relative overflow-hidden">
        {/* Background ảnh campus */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/fpt-campus.jpg)' }}
        />
        {/* Overlay cam đậm để text dễ đọc */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#e65c00]/80 via-[#F37021]/70 to-[#fb8c00]/60" />
        {/* Overlay tối phía dưới để text nổi */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

        <div className="relative z-10 flex flex-col h-full px-10 py-12">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 w-fit">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/30 border border-white/50 backdrop-blur-sm">
              <GraduationCap size={24} className="text-white" />
            </div>
            <div>
              <p className="text-xl font-black text-white tracking-tight leading-none drop-shadow">AITA</p>
              <p className="text-[11px] text-white/70 leading-none mt-0.5">AI Teaching Assistant</p>
            </div>
          </Link>

          {/* Main content */}
          <div className="mt-auto mb-auto pt-16">
            {/* Hero text */}
            <div className="space-y-3">
              <h2 className="text-4xl font-black text-white leading-tight drop-shadow-lg">
                Nền tảng học tập<br />
                <span className="text-yellow-200">thông minh</span>
              </h2>
              <p className="text-sm text-white/80 leading-relaxed max-w-xs drop-shadow">
                Tự động hóa chấm bài, sinh đề cá nhân hóa và theo dõi tiến độ sinh viên theo thời gian thực tại ĐH FPT.
              </p>
            </div>

            {/* Features */}
            <div className="mt-8 space-y-4">
              {[
                { icon: <Brain size={18} />, title: 'AI chấm điểm thông minh', desc: 'Phản hồi chi tiết tức thì trong vài giây' },
                { icon: <BookOpen size={18} />, title: 'Quản lý lớp học', desc: 'Theo dõi tiến độ học tập real-time' },
                { icon: <Users size={18} />, title: 'Phân tích cá nhân hóa', desc: 'Insight học tập riêng cho từng sinh viên' },
              ].map((f) => (
                <div key={f.title} className="flex items-start gap-4">
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/20 border border-white/30 backdrop-blur-sm">
                    <span className="text-white">{f.icon}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white drop-shadow">{f.title}</p>
                    <p className="text-xs text-white/70 mt-0.5">{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <p className="mt-8 text-[11px] text-white/40">© {new Date().getFullYear()} AITA — FPT University</p>
        </div>
      </div>

      {/* ══ RIGHT PANEL ═════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-6 sm:px-8 relative overflow-y-auto">
        {/* Background ảnh */}
        <div
          className="absolute inset-0 bg-cover bg-center bg-no-repeat"
          style={{ backgroundImage: 'url(/FPTQN.jpg)' }}
        />
        {/* Overlay tối nhẹ để form dễ đọc */}
        <div className="absolute inset-0 bg-black/40 dark:bg-black/60" />

        {/* Top controls */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
          <LiveClock />
          <div className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 text-xs font-semibold">
            <span className="text-sm">{({ vi: '🇻🇳', en: '🇬🇧', ja: '🇯🇵' } as Record<string, string>)[language]}</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as any)}
              className="bg-transparent outline-none cursor-pointer text-slate-700 dark:text-slate-300 text-xs font-semibold"
            >
              <option value="vi">VI</option>
              <option value="en">EN</option>
              <option value="ja">JA</option>
            </select>
          </div>
          <button type="button" onClick={toggleTheme}
            className="h-10 w-10 flex items-center justify-center rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-amber-500 dark:text-amber-400 hover:bg-slate-50 hover:border-slate-300 dark:hover:bg-slate-700 dark:hover:border-slate-500 transition-all shadow-sm hover:shadow-md"
            aria-label="Toggle theme"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} className="text-amber-400" />}
          </button>
        </div>

        {/* Mobile logo */}
        <Link to="/" className="lg:hidden flex items-center gap-2 mb-8 relative z-10">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#F37021]">
            <GraduationCap size={20} className="text-white" />
          </div>
          <span className="text-lg font-black text-white drop-shadow">AITA</span>
        </Link>

        <div className="w-full max-w-[420px] flex flex-col justify-center py-6 relative z-10">

          {/* Title */}
          <div className="mb-7">
            <h1 className="text-2xl font-black text-white drop-shadow">
              {t('auth.welcome_back')}
            </h1>
            <p className="mt-1.5 text-sm text-white/80 drop-shadow">
              {t('auth.login_desc')}
            </p>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-[#161b27] dark:shadow-black/30 overflow-hidden">
            <div className="p-7">
              {/* Error */}
              {err && (
                <div className="mb-5 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-800/40 dark:bg-red-900/20 dark:text-red-400 animate-slide-in">
                  <svg className="mt-0.5 h-4 w-4 shrink-0 fill-current" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                  </svg>
                  {err}
                </div>
              )}

              <form onSubmit={handleLogin} className="space-y-4">
                <AuthField id="l-email" icon={<Mail size={16} />} label={t('auth.email')} type="email" value={email} onChange={setEmail} placeholder="you@email.com" required />
                <AuthField id="l-pw" icon={<Lock size={16} />} label={t('auth.password')} type={showPw ? 'text' : 'password'} value={password} onChange={setPassword} placeholder={t('auth.password_placeholder')} required
                  suffix={<EyeToggle show={showPw} toggle={() => setShowPw(p => !p)} />}
                />
                <SubmitButton loading={loading} text={t('auth.tab.login')} />
              </form>
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-5 flex items-center justify-center gap-5">
            {[
              { icon: <ShieldCheck size={13} />, label: 'Bảo mật SSL' },
              { icon: <CheckCircle2 size={13} />, label: 'FPT Verified' },
              { icon: <Sparkles size={13} />, label: 'AI Powered' },
            ].map(b => (
              <div
                key={b.label}
                className="flex items-center gap-1.5 text-[11px] font-medium text-orange-500 dark:text-orange-400"
              >
                <span>{b.icon}</span>
                {b.label}
              </div>
            ))}
          </div>

          <Link to="/" className="mt-5 flex items-center justify-center gap-2 rounded-xl bg-[#F37021] hover:bg-orange-600 px-4 py-3 text-sm font-bold text-white transition-all shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0">
            ← {t('auth.back_home').replace('← ', '')}
          </Link>
        </div>
      </div>
    </div>
  )
}

/* ── Sub-components ──────────────────────────────── */

function AuthField({ id, icon, label, type, value, onChange, placeholder, required, hint, suffix }: {
  id: string; icon: React.ReactNode; label: string; type: string
  value: string; onChange: (v: string) => void; placeholder?: string
  required?: boolean; hint?: string; suffix?: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)
  return (
    <div className="min-h-[74px] flex flex-col justify-between">
      <label htmlFor={id} className="block text-sm font-semibold text-slate-700 dark:text-slate-300 h-5 overflow-hidden">
        {label}
      </label>
      <div className={`
        flex items-center gap-2.5 rounded-xl border h-11 px-3.5 bg-white dark:bg-slate-900
        transition-all duration-150
        ${focused
          ? 'border-brand-500 ring-3 ring-brand-500/15 dark:border-brand-500 dark:ring-brand-400/20'
          : 'border-slate-200 dark:border-slate-700'
        }
      `}>
        <span className={`shrink-0 transition-colors duration-150 ${focused ? 'text-brand-500 dark:text-brand-400' : 'text-slate-400 dark:text-slate-600'}`}>
          {icon}
        </span>
        <input
          id={id} type={type} value={value}
          onChange={e => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder} required={required}
          className="flex-1 bg-transparent text-sm text-slate-900 dark:text-slate-100 placeholder:text-slate-400 dark:placeholder:text-slate-600 outline-none"
        />
        {suffix}
      </div>
      {hint && <p className="text-[11px] text-slate-400 dark:text-slate-500 h-4 overflow-hidden">{hint}</p>}
    </div>
  )
}

function EyeToggle({ show, toggle }: { show: boolean; toggle: () => void }) {
  return (
    <button type="button" tabIndex={-1} onClick={toggle}
      className="p-1 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
    >
      {show ? <EyeOff size={15} /> : <Eye size={15} />}
    </button>
  )
}

function SubmitButton({ loading, text }: { loading: boolean; text: string }) {
  return (
    <button
      type="submit"
      disabled={loading}
      className="mt-1 w-full flex items-center justify-center gap-2 min-h-[44px] rounded-xl py-2.5 text-sm font-bold text-white bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 shadow-lg shadow-brand-500/30 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:-translate-y-0.5 active:translate-y-0 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-brand-500/40"
    >
      {loading
        ? <><Spinner /><span className="ml-1 opacity-90">Processing...</span></>
        : <>{text} <ArrowRight size={16} /></>
      }
    </button>
  )
}

function Spinner() {
  return (
    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
    </svg>
  )
}
