import { useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import { GraduationCap, Mail, Lock, User, Eye, EyeOff, ArrowRight, BookOpen, Brain, Users, IdCard } from 'lucide-react'
import { useAuth } from '@/context/AuthContext'
import { ApiError } from '@/lib/api'
import type { UserRole } from '@/types'

const roleRedirect: Record<UserRole, string> = {
  admin: '/admin',
  lecturer: '/lecturer',
  student: '/student',
}

type AuthMode = 'login' | 'register'

export function LoginPage() {
  const { login, register } = useAuth()
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [mode, setMode] = useState<AuthMode>('login')

  /* Login state */
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  /* Register state */
  const [regFullName, setRegFullName] = useState('')
  const [regEmail, setRegEmail] = useState('')
  const [regPassword, setRegPassword] = useState('')
  const [regConfirm, setRegConfirm] = useState('')
  const [regExternalId, setRegExternalId] = useState('')

  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPw, setShowPw] = useState(false)
  const [showPwConfirm, setShowPwConfirm] = useState(false)

  const navigateByRole = (role: UserRole) => {
    const redirect = params.get('redirect')
    if (redirect && redirect.startsWith(`/${role}`)) {
      navigate(redirect)
    } else {
      navigate(roleRedirect[role])
    }
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const role = await login(email, password)
      navigateByRole(role)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đăng nhập thất bại')
    } finally {
      setLoading(false)
    }
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')

    if (!regEmail.toLowerCase().endsWith('@gmail.com')) {
      setError('Vui lòng sử dụng email Gmail (@gmail.com)')
      return
    }
    if (regPassword.length < 6) {
      setError('Mật khẩu phải có ít nhất 6 ký tự')
      return
    }
    if (regPassword !== regConfirm) {
      setError('Mật khẩu xác nhận không khớp')
      return
    }

    setLoading(true)
    try {
      const role = await register({
        email: regEmail,
        password: regPassword,
        fullName: regFullName,
        externalId: regExternalId || undefined,
      })
      navigateByRole(role)
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Đăng ký thất bại')
    } finally {
      setLoading(false)
    }
  }

  const switchMode = (m: AuthMode) => {
    setMode(m)
    setError('')
  }

  return (
    <div className="flex min-h-screen" id="auth-page">
      {/* ====== LEFT: Hero / Branding Panel ====== */}
      <div className="hidden lg:flex lg:w-[480px] xl:w-[520px] flex-col justify-between relative overflow-hidden"
        style={{
          background: 'linear-gradient(160deg, #0f172a 0%, #1e3a5f 35%, #1e40af 70%, #3b82f6 100%)',
        }}
      >
        {/* Animated background shapes */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute -top-20 -left-20 w-72 h-72 rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, #60a5fa 0%, transparent 70%)',
              animation: 'float 8s ease-in-out infinite',
            }}
          />
          <div className="absolute top-1/3 -right-16 w-56 h-56 rounded-full opacity-8"
            style={{
              background: 'radial-gradient(circle, #818cf8 0%, transparent 70%)',
              animation: 'float 10s ease-in-out infinite reverse',
            }}
          />
          <div className="absolute bottom-20 left-10 w-40 h-40 rounded-full opacity-10"
            style={{
              background: 'radial-gradient(circle, #38bdf8 0%, transparent 70%)',
              animation: 'float 6s ease-in-out infinite 2s',
            }}
          />
        </div>

        {/* Logo + title */}
        <div className="relative z-10 p-10 pt-12">
          <div className="flex items-center gap-3 mb-2">
            <div className="flex items-center justify-center w-11 h-11 rounded-xl"
              style={{ background: 'rgba(255,255,255,0.15)', backdropFilter: 'blur(8px)' }}
            >
              <GraduationCap size={24} className="text-white" />
            </div>
            <span className="text-2xl font-bold text-white tracking-tight">AITA</span>
          </div>
          <p className="text-blue-200/80 text-sm mt-1 ml-0.5">AI Teaching Assistant</p>
        </div>

        {/* Feature highlights */}
        <div className="relative z-10 px-10 pb-6 space-y-5">
          <FeatureItem icon={<Brain size={20} />} title="AI Chấm điểm thông minh" desc="Tự động đánh giá bài tập với phản hồi chi tiết" />
          <FeatureItem icon={<BookOpen size={20} />} title="Quản lý lớp học" desc="Theo dõi tiến độ sinh viên theo thời gian thực" />
          <FeatureItem icon={<Users size={20} />} title="Phân tích học tập" desc="Insight cá nhân hóa cho từng sinh viên" />
        </div>

        {/* Footer */}
        <div className="relative z-10 px-10 pb-8">
          <div className="h-px w-full mb-5" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)' }} />
          <p className="text-blue-300/60 text-xs">© 2026 AITA — FPT University</p>
        </div>
      </div>

      {/* ====== RIGHT: Auth Form ====== */}
      <div className="flex-1 flex items-center justify-center px-4 py-10 sm:px-8"
        style={{ background: 'linear-gradient(180deg, #f8fafc 0%, #eef2ff 50%, #f1f5f9 100%)' }}
      >
        <div className="w-full max-w-[440px]">
          {/* Mobile logo */}
          <div className="lg:hidden flex items-center gap-2 mb-8 justify-center">
            <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-brand-700">
              <GraduationCap size={22} className="text-white" />
            </div>
            <span className="text-xl font-bold text-slate-900">AITA</span>
          </div>

          {/* Glass card */}
          <div
            className="rounded-3xl border p-7 sm:p-8"
            style={{
              background: 'rgba(255, 255, 255, 0.75)',
              backdropFilter: 'blur(20px)',
              WebkitBackdropFilter: 'blur(20px)',
              borderColor: 'rgba(255, 255, 255, 0.5)',
              boxShadow: '0 8px 32px rgba(0, 0, 0, 0.06), 0 2px 8px rgba(0, 0, 0, 0.04)',
            }}
          >
            {/* Tab switcher */}
            <div className="flex rounded-2xl p-1 mb-7" style={{ background: '#f1f5f9' }}>
              <button
                id="tab-login"
                onClick={() => switchMode('login')}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300"
                style={{
                  background: mode === 'login' ? '#ffffff' : 'transparent',
                  color: mode === 'login' ? '#1e40af' : '#64748b',
                  boxShadow: mode === 'login' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                Đăng nhập
              </button>
              <button
                id="tab-register"
                onClick={() => switchMode('register')}
                className="flex-1 py-2.5 text-sm font-semibold rounded-xl transition-all duration-300"
                style={{
                  background: mode === 'register' ? '#ffffff' : 'transparent',
                  color: mode === 'register' ? '#1e40af' : '#64748b',
                  boxShadow: mode === 'register' ? '0 2px 8px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                Đăng ký sinh viên
              </button>
            </div>

            {/* Heading */}
            <div className="mb-6">
              <h1 className="text-2xl font-bold text-slate-900">
                {mode === 'login' ? 'Chào mừng trở lại' : 'Tạo tài khoản'}
              </h1>
              <p className="mt-1.5 text-sm text-slate-500">
                {mode === 'login'
                  ? 'Đăng nhập để truy cập hệ thống AITA'
                  : 'Đăng ký tài khoản sinh viên bằng email Gmail'}
              </p>
            </div>

            {/* Error message */}
            {error && (
              <div className="mb-5 flex items-center gap-2 rounded-xl px-4 py-3 text-sm"
                style={{ background: '#fef2f2', color: '#b91c1c', border: '1px solid #fecaca' }}
              >
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none" className="shrink-0">
                  <circle cx="8" cy="8" r="8" fill="#ef4444" fillOpacity="0.15"/>
                  <path d="M8 4.5v4M8 10.5v.5" stroke="#ef4444" strokeWidth="1.5" strokeLinecap="round"/>
                </svg>
                {error}
              </div>
            )}

            {/* ====== LOGIN FORM ====== */}
            {mode === 'login' && (
              <form onSubmit={handleLogin} className="space-y-4" id="login-form">
                <AuthInput
                  id="login-email"
                  icon={<Mail size={18} />}
                  label="Email"
                  type="email"
                  value={email}
                  onChange={setEmail}
                  placeholder="you@email.com"
                  required
                />
                <AuthInput
                  id="login-password"
                  icon={<Lock size={18} />}
                  label="Mật khẩu"
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={setPassword}
                  placeholder="••••••••"
                  required
                  suffix={
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
                <button
                  id="login-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: loading
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #1e40af 0%, #2563eb 50%, #3b82f6 100%)',
                    boxShadow: loading ? 'none' : '0 4px 14px rgba(37, 99, 235, 0.35)',
                  }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Spinner /> Đang đăng nhập...
                    </span>
                  ) : (
                    <>
                      Đăng nhập <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* ====== REGISTER FORM ====== */}
            {mode === 'register' && (
              <form onSubmit={handleRegister} className="space-y-4" id="register-form">
                <AuthInput
                  id="register-fullname"
                  icon={<User size={18} />}
                  label="Họ và tên"
                  type="text"
                  value={regFullName}
                  onChange={setRegFullName}
                  placeholder="Nguyễn Văn A"
                  required
                />
                <AuthInput
                  id="register-email"
                  icon={<Mail size={18} />}
                  label="Email Gmail"
                  type="email"
                  value={regEmail}
                  onChange={setRegEmail}
                  placeholder="yourname@gmail.com"
                  required
                  hint="Chỉ chấp nhận email @gmail.com"
                />
                <AuthInput
                  id="register-studentid"
                  icon={<IdCard size={18} />}
                  label="Mã sinh viên"
                  type="text"
                  value={regExternalId}
                  onChange={setRegExternalId}
                  placeholder="VD: HE170001 (không bắt buộc)"
                />
                <AuthInput
                  id="register-password"
                  icon={<Lock size={18} />}
                  label="Mật khẩu"
                  type={showPw ? 'text' : 'password'}
                  value={regPassword}
                  onChange={setRegPassword}
                  placeholder="Ít nhất 6 ký tự"
                  required
                  suffix={
                    <button type="button" onClick={() => setShowPw(!showPw)}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
                <AuthInput
                  id="register-confirm"
                  icon={<Lock size={18} />}
                  label="Xác nhận mật khẩu"
                  type={showPwConfirm ? 'text' : 'password'}
                  value={regConfirm}
                  onChange={setRegConfirm}
                  placeholder="Nhập lại mật khẩu"
                  required
                  suffix={
                    <button type="button" onClick={() => setShowPwConfirm(!showPwConfirm)}
                      className="text-slate-400 hover:text-slate-600 transition-colors p-1"
                      tabIndex={-1}
                    >
                      {showPwConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  }
                />
                <button
                  id="register-submit"
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-semibold text-white transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                  style={{
                    background: loading
                      ? '#94a3b8'
                      : 'linear-gradient(135deg, #059669 0%, #10b981 50%, #34d399 100%)',
                    boxShadow: loading ? 'none' : '0 4px 14px rgba(16, 185, 129, 0.35)',
                  }}
                >
                  {loading ? (
                    <span className="flex items-center gap-2">
                      <Spinner /> Đang đăng ký...
                    </span>
                  ) : (
                    <>
                      Đăng ký tài khoản <ArrowRight size={16} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Bottom note */}
            <div className="mt-6 pt-5" style={{ borderTop: '1px solid #e2e8f0' }}>
              {mode === 'login' ? (
                <p className="text-center text-sm text-slate-500">
                  Sinh viên chưa có tài khoản?{' '}
                  <button onClick={() => switchMode('register')}
                    className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    Đăng ký ngay
                  </button>
                </p>
              ) : (
                <p className="text-center text-sm text-slate-500">
                  Đã có tài khoản?{' '}
                  <button onClick={() => switchMode('login')}
                    className="font-semibold text-brand-600 hover:text-brand-700 transition-colors"
                  >
                    Đăng nhập
                  </button>
                </p>
              )}
            </div>
          </div>

          {/* Back to home */}
          <Link to="/" className="mt-5 flex items-center justify-center gap-1 text-sm text-slate-400 hover:text-slate-600 transition-colors">
            ← Về trang chủ
          </Link>
        </div>
      </div>

      {/* Animation keyframes */}
      <style>{`
        @keyframes float {
          0%, 100% { transform: translateY(0) scale(1); }
          50% { transform: translateY(-20px) scale(1.05); }
        }
      `}</style>
    </div>
  )
}

/* ============================================================
   Sub-components
   ============================================================ */

function AuthInput({
  id,
  icon,
  label,
  type,
  value,
  onChange,
  placeholder,
  required,
  hint,
  suffix,
}: {
  id: string
  icon: React.ReactNode
  label: string
  type: string
  value: string
  onChange: (v: string) => void
  placeholder?: string
  required?: boolean
  hint?: string
  suffix?: React.ReactNode
}) {
  const [focused, setFocused] = useState(false)

  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-slate-700">{label}</label>
      <div
        className="flex items-center gap-2.5 rounded-xl border px-3.5 py-2.5 transition-all duration-200"
        style={{
          borderColor: focused ? '#3b82f6' : '#e2e8f0',
          boxShadow: focused ? '0 0 0 3px rgba(59, 130, 246, 0.12)' : 'none',
          background: '#ffffff',
        }}
      >
        <span className="shrink-0" style={{ color: focused ? '#3b82f6' : '#94a3b8' }}>{icon}</span>
        <input
          id={id}
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          placeholder={placeholder}
          required={required}
          className="flex-1 text-sm text-slate-900 placeholder:text-slate-400 outline-none bg-transparent"
        />
        {suffix}
      </div>
      {hint && <p className="text-xs text-slate-400 ml-0.5">{hint}</p>}
    </div>
  )
}

function FeatureItem({ icon, title, desc }: { icon: React.ReactNode; title: string; desc: string }) {
  return (
    <div className="flex items-start gap-3.5">
      <div className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
        style={{ background: 'rgba(255,255,255,0.1)', backdropFilter: 'blur(4px)' }}
      >
        <span className="text-blue-300">{icon}</span>
      </div>
      <div>
        <p className="text-white/90 text-sm font-semibold">{title}</p>
        <p className="text-blue-200/60 text-xs mt-0.5">{desc}</p>
      </div>
    </div>
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
