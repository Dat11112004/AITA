import { useState, useRef, useEffect } from 'react'
import { useSearchParams } from 'react-router-dom'
import { PageHeader } from '@/components/ui/PageHeader'
import { Card, CardHeader } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Save, UserCircle, KeyRound, Mail, Camera, Loader2, Shield, GraduationCap } from 'lucide-react'
import { useAuth } from '@/store/AuthContext'
import { api, type ClassRow } from '@/lib/api'

export function Profile() {
  const { user } = useAuth()
  const [params] = useSearchParams()
  // Tài khoản import vào bằng mật khẩu tạm → LoginPage đẩy về đây kèm ?forcePasswordChange=1
  const mustChangePassword = params.get('forcePasswordChange') === '1' || !!user?.requirePasswordChange

  // Giảng viên và Sinh viên: danh sách lớp/môn đang dạy hoặc đang học
  const [userClasses, setUserClasses] = useState<ClassRow[]>([])
  const [classesLoading, setClassesLoading] = useState(false)
  useEffect(() => {
    if (user?.role !== 'lecturer' && user?.role !== 'student') return
    let alive = true
    setClassesLoading(true)
    api.getClasses(1, 100)
      .then(res => { if (alive) setUserClasses(res || []) })
      .catch(() => { if (alive) setUserClasses([]) })
      .finally(() => { if (alive) setClassesLoading(false) })
    return () => { alive = false }
  }, [user?.role])

  const [profile, setProfile] = useState({
    fullName: '',
    phone: '',
  })

  const [passwordForm, setPasswordForm] = useState({
    oldPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [avatarFile, setAvatarFile] = useState<File | null>(null)

  const [savingProfile, setSavingProfile] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (user) {
      setProfile({
        fullName: user.fullName || user.name || '',
        phone: (user as any).phone || '', // Assuming phone might be in AuthUser or we just leave empty
      })
      if (user.avatar) {
        setAvatarPreview(user.avatar) // The avatar URL is already absolute from Cloudinary or backend
      }
    }
  }, [user])

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setAvatarFile(file)
      const reader = new FileReader()
      reader.onloadend = () => {
        setAvatarPreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  const handleSaveProfile = async () => {
    setSavingProfile(true)
    try {
      const formData = new FormData()
      formData.append('fullName', profile.fullName)
      formData.append('phone', profile.phone)
      if (avatarFile) {
        formData.append('avatar', avatarFile)
      }

      await api.updateProfile(formData)
      alert('Cập nhật thông tin cá nhân thành công!')
      window.location.reload() // Reload to update context user
    } catch (e: any) {
      alert(e.message || 'Lỗi khi lưu thông tin')
    } finally {
      setSavingProfile(false)
    }
  }

  const handleChangePassword = async () => {
    if (!passwordForm.oldPassword) {
      alert('Vui lòng nhập mật khẩu hiện tại')
      return
    }
    if (passwordForm.newPassword.length < 6) {
      alert('Mật khẩu mới phải có ít nhất 6 ký tự')
      return
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      alert('Mật khẩu mới không khớp!')
      return
    }
    setSavingPassword(true)
    try {
      await api.changePassword({
        oldPassword: passwordForm.oldPassword,
        newPassword: passwordForm.newPassword
      })
      alert('Đổi mật khẩu thành công!')
      setPasswordForm({ oldPassword: '', newPassword: '', confirmPassword: '' })
      
      try {
        const stored = JSON.parse(localStorage.getItem('aita_user') || '{}')
        stored.requirePasswordChange = false
        localStorage.setItem('aita_user', JSON.stringify(stored))
      } catch (e) {}

      if (mustChangePassword && user) {
        window.location.href = `/${user.role}`
      }
    } catch (e: any) {
      alert(e.message || 'Lỗi đổi mật khẩu')
    } finally {
      setSavingPassword(false)
    }
  }

  if (!user) return null

  const getRoleLabel = (role: string) => {
    switch (role) {
      case 'admin': return 'Quản trị viên'
      case 'lecturer': return 'Giảng viên'
      case 'student': return 'Sinh viên'
      default: return role
    }
  }

  return (
    <>
      {mustChangePassword && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-slate-900/80 backdrop-blur-sm p-4 animate-in fade-in duration-300">
          <div className="bg-white dark:bg-slate-900 rounded-2xl shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-300 border border-slate-200 dark:border-slate-800">
            <div className="p-6 border-b border-slate-100 dark:border-slate-800 text-center bg-gradient-to-b from-amber-50 to-white dark:from-slate-800 dark:to-slate-900">
              <div className="w-16 h-16 bg-amber-100 text-amber-600 dark:bg-amber-900/40 dark:text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-inner">
                <KeyRound size={32} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 dark:text-white tracking-tight">CHÚ Ý: Đổi Mật Khẩu</h2>
              <p className="text-sm text-amber-700 dark:text-amber-400 mt-2 font-medium bg-amber-100/50 dark:bg-amber-900/20 p-3 rounded-lg border border-amber-200 dark:border-amber-800/50">
                Tài khoản của bạn đang sử dụng mật khẩu tạm thời. Vì lý do bảo mật, bạn <strong>BẮT BUỘC</strong> phải thay đổi sang mật khẩu mới trước khi tiếp tục truy cập các tính năng của hệ thống.
              </p>
            </div>
            <div className="p-6 space-y-4">
              <Input
                type="password"
                label="Mật khẩu tạm hiện tại"
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
              />
              <Input
                type="password"
                label="Mật khẩu mới (Tối thiểu 6 ký tự)"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
              <Input
                type="password"
                label="Xác nhận mật khẩu mới"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              />
              <Button 
                onClick={handleChangePassword} 
                disabled={savingPassword || !passwordForm.newPassword} 
                className="w-full bg-brand-600 hover:bg-brand-700 text-white mt-4 h-11 text-base font-bold shadow-lg shadow-brand-500/20 transition-all active:scale-[0.98]"
              >
                {savingPassword ? <><Loader2 size={18} className="animate-spin mr-2" /> Đang cập nhật...</> : 'Xác nhận đổi mật khẩu'}
              </Button>
              {user?.role !== 'student' && (
                <button 
                  onClick={async () => {
                    try {
                      await api.dismissPasswordChange();
                      window.location.href = `/${user.role}`;
                    } catch(e: any) { alert(e.message) }
                  }}
                  className="w-full text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 mt-3 underline underline-offset-4 transition-colors font-medium"
                >
                  Bỏ qua lần này (Chỉ dành cho Giảng viên)
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      <div className={`space-y-8 p-6 max-w-5xl mx-auto animate-in fade-in duration-500 ${mustChangePassword ? 'pointer-events-none blur-sm opacity-50 select-none' : ''}`}>
        <PageHeader
          title="Hồ sơ Cá nhân"
          description="Quản lý thông tin cá nhân và bảo mật tài khoản của bạn."
          breadcrumbs={[{ label: 'Hồ sơ' }]}
        />

        <div className="grid md:grid-cols-3 gap-8">

        {/* Left Column: Avatar & Basic Info */}
        <div className="md:col-span-1 space-y-6">
          <Card className="p-6 flex flex-col items-center text-center bg-gradient-to-b from-brand-50 to-white dark:from-slate-800 dark:to-slate-900 border-brand-100 dark:border-slate-800">
            <div
              className={`relative mb-4 ${user?.role === 'student' ? '' : 'group cursor-pointer'}`}
              onClick={() => user?.role !== 'student' && fileInputRef.current?.click()}
            >
              <div className="w-32 h-40 rounded-xl overflow-hidden border-4 border-white dark:border-slate-800 shadow-lg bg-brand-100 dark:bg-brand-900/30 flex items-center justify-center text-brand-600 dark:text-brand-400">
                {avatarPreview ? (
                  <img src={avatarPreview} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-4xl font-black">{user.fullName?.charAt(0) || user.name?.charAt(0) || user.email?.charAt(0)}</span>
                )}
              </div>
              {user?.role !== 'student' && (
                <>
                  <div className="absolute inset-0 bg-black/40 rounded-xl flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="text-white mb-1" size={24} />
                    <span className="text-xs text-white font-medium">Đổi ảnh</span>
                  </div>
                  <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/jpeg, image/png, image/webp, image/gif"
                    onChange={handleAvatarChange}
                  />
                </>
              )}
            </div>
            <h3 className="text-xl font-bold text-slate-900 dark:text-white">{user.fullName || user.name}</h3>
            
            <div className="flex flex-col items-center gap-1 mt-2">
              <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                <Mail size={14} /> {user.email}
              </p>
              {user.phone && (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  📞 {user.phone}
                </p>
              )}
              {user.studentCode && user.role === 'student' && (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  Mã SV: <span className="font-bold text-slate-700 dark:text-slate-200">{user.studentCode}</span>
                </p>
              )}
              {user.lecturerCode && user.role === 'lecturer' && (
                <p className="text-sm font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  Mã GV: <span className="font-bold text-slate-700 dark:text-slate-200">{user.lecturerCode}</span>
                </p>
              )}
            </div>

            <div className="mt-4 inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
              {getRoleLabel(user.role)}
            </div>
          </Card>

          {(user.role === 'lecturer' || user.role === 'student') && (
            <Card className="p-0 border-slate-200 dark:border-slate-800 overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50">
                <GraduationCap size={16} className="text-brand-600" /> {user.role === 'lecturer' ? 'Phân công giảng dạy' : 'Lớp học đang tham gia'}
              </div>
              <div className="p-4 space-y-2 text-sm">
                {classesLoading && <p className="text-slate-500">Đang tải...</p>}
                {!classesLoading && userClasses.length === 0 && (
                  <p className="text-slate-500">{user.role === 'lecturer' ? 'Chưa được phân công lớp nào.' : 'Chưa tham gia lớp nào.'}</p>
                )}
                {!classesLoading && userClasses.map((cls) => {
                  const semesterLabel = typeof cls.semester === 'string'
                    ? cls.semester
                    : (cls.semester as any)?.name || (cls.semester as any)?.code || 'Chưa rõ kỳ'
                  const subjectLabel = typeof cls.subject === 'object' && cls.subject
                    ? (cls.subject.code || cls.subject.name)
                    : cls.subject || 'Chưa rõ môn'
                  return (
                    <div key={cls.id} className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 last:border-0 pb-2 last:pb-0">
                      <div className="min-w-0">
                        <p className="font-medium text-slate-800 dark:text-slate-200 truncate">{subjectLabel || cls.name || cls.code}</p>
                        <p className="text-xs text-slate-500">Lớp {cls.code}</p>
                      </div>
                      <span className="shrink-0 px-2 py-0.5 rounded-full text-xs font-bold bg-brand-100 text-brand-700 dark:bg-brand-900/30 dark:text-brand-400">
                        {semesterLabel}
                      </span>
                    </div>
                  )
                })}
              </div>
            </Card>
          )}

          <Card className="p-0 border-slate-200 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 font-bold text-slate-800 dark:text-slate-200 flex items-center gap-2 bg-slate-50 dark:bg-slate-900/50">
              <Shield size={16} className="text-brand-600" /> Trạng thái tài khoản
            </div>
            <div className="p-4 space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Trạng thái:</span>
                <span className="font-bold text-emerald-600">Đang hoạt động</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-slate-500">Vai trò hệ thống:</span>
                <span className="font-medium text-slate-800 dark:text-slate-200">{user.role.toUpperCase()}</span>
              </div>
            </div>
          </Card>
        </div>

        {/* Right Column: Forms */}
        <div className="md:col-span-2 space-y-6">

          {/* Profile Form */}
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <UserCircle className="text-brand-500 w-5 h-5 ml-1" />
                <CardHeader title="Thông tin Chung" />
              </div>
              <Button onClick={handleSaveProfile} disabled={savingProfile} size="sm" className="bg-brand-600 hover:bg-brand-700 text-white">
                {savingProfile ? <><Loader2 size={16} className="animate-spin mr-2" /> Đang lưu...</> : <><Save size={16} className="mr-2" /> Lưu thay đổi</>}
              </Button>
            </div>
            <div className="p-6 grid sm:grid-cols-2 gap-5">
              <Input
                label="Họ và Tên"
                value={profile.fullName}
                onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
              />
              <Input
                label="Email hệ thống (Không thể đổi)"
                value={user.email}
                disabled
              />
              <Input
                label="Số điện thoại"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
          </Card>

          {/* Password Form */}
          <Card className="overflow-hidden border border-slate-200 dark:border-slate-800">
            <div className="p-4 border-b border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <KeyRound className="text-amber-500 w-5 h-5 ml-1" />
                <CardHeader title="Đổi Mật Khẩu" />
              </div>
              <Button onClick={handleChangePassword} disabled={savingPassword || !passwordForm.newPassword} size="sm" variant="outline" className="text-amber-700 border-amber-200 hover:bg-amber-50 dark:text-amber-400 dark:border-amber-900 dark:hover:bg-amber-900/30">
                {savingPassword ? <><Loader2 size={16} className="animate-spin mr-2" /> Đang cập nhật...</> : 'Cập nhật mật khẩu'}
              </Button>
            </div>
            <div className="p-6 space-y-4 max-w-md">
              <Input
                type="password"
                label="Mật khẩu hiện tại"
                value={passwordForm.oldPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, oldPassword: e.target.value })}
              />
              <Input
                type="password"
                label="Mật khẩu mới"
                value={passwordForm.newPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, newPassword: e.target.value })}
              />
              <Input
                type="password"
                label="Nhập lại mật khẩu mới"
                value={passwordForm.confirmPassword}
                onChange={(e) => setPasswordForm({ ...passwordForm, confirmPassword: e.target.value })}
              />
            </div>
          </Card>

        </div>
      </div>
    </div>
    </>
  )
}
