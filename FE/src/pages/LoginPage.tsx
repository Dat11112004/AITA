import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import {
  GraduationCap, Mail, Lock, User, Eye, EyeOff,
  ArrowRight, BookOpen, Brain, Users, IdCard,
  CheckCircle2, Sparkles, ShieldCheck, Sun, Moon,
} from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import type { UserRole } from '@/types'
import { useLanguage } from '@/context/LanguageContext'
import { useTheme } from '@/context/ThemeContext'

const roleRedirect: Record<UserRole, string> = {
  admin: '/admin', lecturer: '/lecturer', student: '/student',
}
type Mode = 'login' | 'register'

/* ────────────────────────────────────────────────── */
export function LoginPage() {
  const { t, language, setLanguage } = useLanguage()
  const { theme, toggleTheme } = useTheme()
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<Mode>(() => params.get('tab') === 'register' ? 'register' : 'login')

  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [regName, setRegName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPw, setRegPw] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regId, setRegId] = useState('')

  const [err, setErr] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)

  const go = (role: UserRole) => {
    const r = params.get('redirect')
    navigate(r?.startsWith(`/${role}`) ? r : roleRedirect[role])
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault(); setErr(''); setLoading(true)
    try { go(await login(email, password)) }
    catch (e) { setErr(e instanceof ApiError ? e.message : t('auth.failed.login')) }
    finally { setLoading(false) }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault(); setErr('')
    if (!regEmail.toLowerCase().endsWith('@gmail.com')) { setErr(t('auth.email_hint')); return }
    if (regPw.length < 6) { setErr(t('auth.password_min')); return }
    if (regPw !== regConfirm) { setErr('Mật khẩu xác nhận không khớp'); return }
    setLoading(true)
    try { go(await register({ email: regEmail, password: regPw, fullName: regName, externalId: regId || undefined })) }
    catch (e) { setErr(e instanceof ApiError ? e.message : t('auth.failed.register')) }
    finally { setLoading(false) }
  }

  return (
    <div className="flex min-h-screen bg-white dark:bg-[#0f1117]">

      {/* ══ LEFT PANEL ══════════════════════════════════════════ */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col relative overflow-hidden">
        {/* BG */}
        <div className="absolute inset-0 bg-gradient-to-br from-[#fb8c00] via-[#ffa726] to-[#ffcc80]" />
        {/* Pattern */}
        <div className="absolute inset-0 opacity-[0.07]"
          style={{ backgroundImage: 'radial-gradient(#fff 1.5px, transparent 1.5px)', backgroundSize: '28px 28px' }} />
        {/* Glow blobs */}
        <div className="absolute -top-32 -left-32 h-80 w-80 rounded-full bg-white/10 blur-3xl animate-float" />
        <div className="absolute bottom-0 -right-20 h-96 w-96 rounded-full bg-orange-300/15 blur-3xl animate-float" style={{ animationDelay: '3s' }} />

        <div className="relative z-10 flex flex-col h-full px-10 py-12">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-3 w-fit">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white/40 border border-white/50 backdrop-blur-sm">
              <GraduationCap size={24} className="text-orange-900" />
            </div>
            <div>
              <p className="text-xl font-black text-orange-950 tracking-tight leading-none">AITA</p>
              <p className="text-[11px] text-orange-900/60 leading-none mt-0.5">AI Teaching Assistant</p>
            </div>
          </Link>

          {/* Hero text */}
          <div className="mt-14 space-y-4">
            <h2 className="text-4xl font-black text-white leading-tight drop-shadow-sm">
              Nền tảng học tập<br />
              <span className="text-orange-900/80">thông minh</span>
            </h2>
            <p className="text-sm text-orange-950/60 leading-relaxed max-w-xs">
              Tự động hóa chấm bài, sinh đề cá nhân hóa và theo dõi tiến độ sinh viên theo thời gian thực tại ĐH FPT.
            </p>
          </div>

          {/* Features */}
          <div className="mt-10 space-y-5">
            {[
              { icon: <Brain size={18} />, title: 'AI chấm điểm thông minh', desc: 'Phản hồi chi tiết tức thì trong vài giây' },
              { icon: <BookOpen size={18} />, title: 'Quản lý lớp học', desc: 'Theo dõi tiến độ học tập real-time' },
              { icon: <Users size={18} />, title: 'Phân tích cá nhân hóa', desc: 'Insight học tập riêng cho từng sinh viên' },
            ].map((f) => (
              <div key={f.title} className="flex items-start gap-4">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-white/30 border border-white/40">
                  <span className="text-orange-900">{f.icon}</span>
                </div>
                <div>
                  <p className="text-sm font-bold text-white drop-shadow-sm">{f.title}</p>
                  <p className="text-xs text-orange-950/55 mt-0.5">{f.desc}</p>
                </div>
              </div>
            ))}
          </div>

          {/* Testimonial */}
          <div className="mt-auto">
            <div className="rounded-2xl border border-white/30 bg-white/25 backdrop-blur-sm p-5">
              <div className="flex gap-0.5 mb-3">
                {[...Array(5)].map((_, i) => (
                  <svg key={i} className="h-4 w-4 fill-orange-800/80" viewBox="0 0 20 20">
                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                  </svg>
                ))}
              </div>
              <p className="text-sm text-orange-950/70 italic leading-relaxed">
                "AITA giúp tôi tiết kiệm 60% thời gian chấm bài, tập trung nhiều hơn vào việc hỗ trợ sinh viên."
              </p>
              <div className="mt-3 flex items-center gap-2.5">
                <div className="h-8 w-8 rounded-full bg-orange-800/20 border border-orange-900/20 flex items-center justify-center text-xs font-bold text-orange-900">NG</div>
                <div>
                  <p className="text-xs font-bold text-orange-950">Nguyễn Thanh Giang</p>
                  <p className="text-[10px] text-orange-900/50">Giảng viên Khoa CNTT — FPT HN</p>
                </div>
              </div>
            </div>
          </div>

          <p className="mt-6 text-[11px] text-orange-900/40">© {new Date().getFullYear()} AITA — FPT University</p>
        </div>
      </div>

      {/* ══ RIGHT PANEL ═════════════════════════════════════════ */}
      <div className="flex flex-1 flex-col items-center justify-center px-4 py-10 sm:px-8 bg-slate-50 dark:bg-[#0f1117] relative">

        {/* Top controls - Language & Theme */}
        <div className="absolute top-4 right-4 flex items-center gap-2 z-50">
          {/* Language dropdown - COMPACT */}
          <div className="relative group">
            {/* Compact inline language selector */}
            <div className="inline-flex items-center gap-1 px-2 py-1.5 rounded-xl border border-slate-300 bg-white dark:border-slate-600 dark:bg-slate-800 text-xs font-semibold">
              <span className="text-sm">{(() => {
                const langs = { 'vi': '🇻🇳', 'en': '🇬🇧', 'ja': '🇯🇵' };
                return langs[language as keyof typeof langs];
              })()}</span>
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
          </div>

          {/* Theme toggle button - PROMINENT */}
          <button type="button" onClick={toggleTheme}
            className="h-10 w-10 flex items-center justify-center rounded-xl border-2 border-slate-200 dark:border-slate-600 bg-white dark:bg-slate-800 text-amber-500 dark:text-amber-400 hover:bg-slate-50 hover:border-slate-300 dark:hover:bg-slate-700 dark:hover:border-slate-500 transition-all shadow-sm hover:shadow-md"
            aria-label="Toggle theme"
            title="Toggle light/dark mode"
          >
            {theme === 'light' ? <Moon size={18} /> : <Sun size={18} className="text-amber-400" />}
          </button>
        </div>

        {/* Mobile logo */}
        <Link to="/" className="lg:hidden flex items-center gap-2 mb-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-600">
            <GraduationCap size={20} className="text-white" />
          </div>
          <span className="text-lg font-black text-slate-900 dark:text-white">AITA</span>
        </Link>

        <div className="w-full max-w-[420px] min-h-screen flex flex-col justify-center">

          {/* Title */}
          <div className="mb-7">
            <h1 className="text-2xl font-black text-slate-900 dark:text-white">
              {mode === 'login' ? t('auth.welcome_back') : t('auth.create_account')}
            </h1>
            <p className="mt-1.5 text-sm text-slate-500 dark:text-slate-400">
              {mode === 'login'
                ? t('auth.login_desc')
                : t('auth.register_desc')}
            </p>
          </div>

          {/* Card */}
          <div className="rounded-3xl border border-slate-200 bg-white shadow-lg shadow-slate-200/50 dark:border-slate-800 dark:bg-[#161b27] dark:shadow-black/30 overflow-hidden">

            {/* Tab switcher */}
            <div className="flex bg-slate-100/80 dark:bg-slate-800/60 p-1.5">
              {(['login', 'register'] as const).map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => { setMode(m); setErr('') }}
                  className={`
                    flex-1 rounded-2xl py-2.5 text-sm font-semibold transition-all duration-200 whitespace-nowrap
                    ${mode === m
                      ? 'bg-white text-brand-700 shadow-md dark:bg-[#1e2535] dark:text-brand-500 dark:shadow-black/30'
                      : 'text-slate-500 hover:text-slate-700 dark:text-slate-500 dark:hover:text-slate-400'
                    }
                  `}
                >
                  {m === 'login' ? t('auth.tab.login') : t('auth.tab.register')}
                </button>
              ))}
            </div>

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

              {/* ── LOGIN ── */}
              {mode === 'login' && (
                <form onSubmit={handleLogin} className="space-y-4">
                  <AuthField id="l-email" icon={<Mail size={16} />} label={t('auth.email')} type="email" value={email} onChange={setEmail} placeholder="you@email.com" required />
                  <AuthField id="l-pw" icon={<Lock size={16} />} label={t('auth.password')} type={showPw ? 'text' : 'password'} value={password} onChange={setPassword} placeholder={t('auth.password_placeholder')} required
                    suffix={<EyeToggle show={showPw} toggle={() => setShowPw(p => !p)} />}
                  />

                  <SubmitButton loading={loading} color="orange" text={t('auth.tab.login')} />
                </form>
              )}

              {/* ── REGISTER ── */}
              {mode === 'register' && (
                <form onSubmit={handleRegister} className="space-y-3.5">
                  <AuthField id="r-name" icon={<User size={16} />} label={t('auth.name')} type="text" value={regName} onChange={setRegName} placeholder={t('auth.name_placeholder')} required />
                  <AuthField id="r-email" icon={<Mail size={16} />} label={t('auth.email')} type="email" value={regEmail} onChange={setRegEmail} placeholder="yourname@gmail.com" required hint={t('auth.email_hint')} />
                  <AuthField id="r-id" icon={<IdCard size={16} />} label={t('auth.studentid')} type="text" value={regId} onChange={setRegId} placeholder={t('auth.studentid_placeholder')} />
                  <AuthField id="r-pw" icon={<Lock size={16} />} label={t('auth.password')} type={showPw ? 'text' : 'password'} value={regPw} onChange={setRegPw} placeholder={t('auth.password_min')} required
                    suffix={<EyeToggle show={showPw} toggle={() => setShowPw(p => !p)} />}
                  />
                  <AuthField id="r-confirm" icon={<Lock size={16} />} label={t('auth.confirm_password')} type={showConfirm ? 'text' : 'password'} value={regConfirm} onChange={setRegConfirm} placeholder={t('auth.confirm_placeholder')} required
                    suffix={<EyeToggle show={showConfirm} toggle={() => setShowConfirm(p => !p)} />}
                  />

                  <SubmitButton loading={loading} color="green" text={t('auth.create_account')} isRegister />

                  {/* Perks */}
                  <div className="flex flex-wrap justify-center gap-3 pt-1">
                    {[t('auth.free'), t('auth.instant_ai'), t('auth.secure')].map(b => (
                      <span key={b} className="flex items-center gap-1 text-[11px] text-slate-400 dark:text-slate-500">
                        <CheckCircle2 size={11} className="text-emerald-500 shrink-0" />{b}
                      </span>
                    ))}
                  </div>
                </form>
              )}

              {/* Switch */}
              <p className="mt-5 pt-5 border-t border-slate-100 dark:border-slate-800 text-center text-sm text-slate-500 dark:text-slate-400">
                {mode === 'login' ? (
                  <>{t('auth.no_account')} {' '}
                    <button type="button" onClick={() => { setMode('register'); setErr('') }} className="font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors">{t('auth.register_now')}</button>
                  </>
                ) : (
                  <>{t('auth.has_account')} {' '}
                    <button type="button" onClick={() => { setMode('login'); setErr('') }} className="font-bold text-brand-600 hover:text-brand-700 dark:text-brand-400 dark:hover:text-brand-300 transition-colors">{t('auth.tab.login')}</button>
                  </>
                )}
              </p>
            </div>
          </div>

          {/* Trust badges */}
          <div className="mt-5 flex items-center justify-center gap-5">
            {[
              { icon: <ShieldCheck size={13} />, label: 'Bảo mật SSL' },
              { icon: <CheckCircle2 size={13} />, label: 'FPT Verified' },
              { icon: <Sparkles size={13} />, label: 'AI Powered' },
            ].map(b => (
              <div key={b.label} className="flex items-center gap-1.5 text-[11px] text-slate-400 dark:text-slate-600">
                <span className="text-slate-400 dark:text-slate-600">{b.icon}</span>
                {b.label}
              </div>
            ))}
          </div>

          <Link to="/" className="mt-7 flex items-center justify-center gap-2 rounded-xl border border-slate-200 dark:border-slate-800 bg-white/50 dark:bg-slate-900/50 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white transition-all shadow-sm">
            {t('auth.back_home')}
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

function SubmitButton({ loading, color, text, isRegister = false }: {
  loading: boolean; color: 'orange' | 'green'; text: string; isRegister?: boolean
}) {
  const cls = color === 'orange'
    ? 'bg-gradient-to-r from-brand-600 to-brand-500 hover:from-brand-700 hover:to-brand-600 shadow-brand-500/30'
    : 'bg-gradient-to-r from-emerald-600 to-emerald-500 hover:from-emerald-700 hover:to-emerald-600 shadow-emerald-600/30'
  return (
    <button
      type="submit"
      disabled={loading}
      className={`
        mt-1 w-full flex items-center justify-center gap-2 min-h-[44px]
        rounded-xl py-2.5 text-sm font-bold text-white
        shadow-lg transition-all duration-200
        disabled:opacity-50 disabled:cursor-not-allowed
        hover:-translate-y-0.5 active:translate-y-0
        focus:outline-none focus:ring-2 focus:ring-offset-2
        ${color === 'orange' ? 'focus:ring-brand-500/40' : 'focus:ring-emerald-500/40'}
        ${cls}
      `}
    >
      {loading
        ? <><Spinner /> <span className="ml-1 opacity-90">Processing...</span></>
        : <>{isRegister ? <Sparkles size={15} /> : null} {text} {!isRegister ? <ArrowRight size={16} /> : null}</>
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
